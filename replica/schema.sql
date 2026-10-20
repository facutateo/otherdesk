-- Primera migración. Postgres 15+ en Supabase.
-- Acceso: RLS para el portal (rol authenticated); el servidor de señalización usa service_role
-- y hace su propia comprobación por consulta (ver architecture.md).
-- Contraseñas de acceso desatendido, perfiles de permisos, chat, archivos y grabaciones
-- viven SOLO en el equipo: el servidor nunca los ve.

create extension if not exists citext;

-- updated_at automático
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------- organizations
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 100),
  namespace citext unique check (namespace ~ '^[a-z0-9][a-z0-9-]{1,30}$'),
  plan text not null default 'trial' check (plan in ('trial','standard','advanced','ultimate','cancelled')),
  concurrent_connections int not null default 1 check (concurrent_connections >= 0),
  max_users int not null default 1 check (max_users >= 1),
  max_managed_devices int not null default 50 check (max_managed_devices >= 0),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger organizations_updated before update on organizations for each row execute function set_updated_at();

-- ---------------------------------------------------------------- users
-- 1:1 con auth.users de Supabase
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on profiles for each row execute function set_updated_at();

create table org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'agent' check (role in ('owner','admin','agent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index on org_members (user_id);
create trigger org_members_updated before update on org_members for each row execute function set_updated_at();

-- ---------------------------------------------------------------- devices
-- Un equipo con el cliente. Existe aunque no tenga cuenta (portable / gratis): org_id null.
create table devices (
  id uuid primary key default gen_random_uuid(),
  numeric_id bigint not null unique check (numeric_id between 100000000 and 9999999999),
  public_key bytea not null unique,              -- ed25519, generada en el equipo; firma el login al señalizador
  org_id uuid references organizations(id) on delete set null,
  alias citext check (alias ~ '^[a-z0-9._-]{1,25}$'),
  hostname text not null default '' check (length(hostname) <= 255),
  os text not null check (os in ('windows','macos','linux')),
  app_version text not null,
  installed boolean not null default false,
  unattended_enabled boolean not null default false,  -- solo el flag; la contraseña nunca sale del equipo
  online boolean not null default false,
  last_seen_at timestamptz,
  blocked_at timestamptz,                         -- antiabuso
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- alias único dentro de la org (namespace propio) o en el namespace público si no hay org
create unique index devices_alias_org on devices (org_id, alias) where alias is not null and org_id is not null;
create unique index devices_alias_public on devices (alias) where alias is not null and org_id is null;
create index on devices (org_id, online);
create trigger devices_updated before update on devices for each row execute function set_updated_at();

-- ---------------------------------------------------------------- sessions
create table sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,     -- org del que conecta; cuenta para el límite
  source_device_id uuid not null references devices(id) on delete cascade,
  target_device_id uuid not null references devices(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,         -- técnico con sesión iniciada
  mode text not null check (mode in ('interactive','unattended','file_only')),
  status text not null default 'requested' check (status in ('requested','open','closed','rejected','failed')),
  end_reason text check (end_reason in ('local','remote','admin','timeout','error','limit')),
  connection_type text check (connection_type in ('direct','relay')),
  elevated boolean not null default false,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint not_self check (source_device_id <> target_device_id),
  constraint ended_after_start check (ended_at is null or started_at is null or ended_at >= started_at)
);
create index on sessions (org_id, status);
create index on sessions (org_id, created_at desc);
create index on sessions (source_device_id);
create index on sessions (target_device_id);
create index on sessions (user_id);
create trigger sessions_updated before update on sessions for each row execute function set_updated_at();

-- Abre una sesión respetando el límite de conexiones simultáneas.
-- Bloquea la fila de la org para que dos técnicos no pasen el límite a la vez.
create or replace function open_session(p_session_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_limit int;
  v_open int;
begin
  select org_id into v_org from sessions where id = p_session_id and status = 'requested' for update;
  if not found then return false; end if;
  if v_org is not null then
    select concurrent_connections into v_limit from organizations where id = v_org for update;
    select count(*) into v_open from sessions where org_id = v_org and status = 'open';
    if v_open >= v_limit then
      update sessions set status = 'failed', end_reason = 'limit', ended_at = now() where id = p_session_id;
      return false;
    end if;
  end if;
  update sessions set status = 'open', started_at = now() where id = p_session_id;
  return true;
end $$;
revoke execute on function open_session(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- invitations (F11) y peticiones de soporte
create table session_requests (
  id uuid primary key default gen_random_uuid(),
  from_device_id uuid not null references devices(id) on delete cascade,
  to_device_id uuid not null references devices(id) on delete cascade,
  kind text not null check (kind in ('invitation','support_request')),
  profile_name text not null default 'default',
  status text not null default 'pending' check (status in ('pending','accepted','rejected','expired','cancelled')),
  session_id uuid references sessions(id) on delete set null,
  expires_at timestamptz not null default now() + interval '2 minutes',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on session_requests (to_device_id, status);
create index on session_requests (from_device_id);
create index on session_requests (status, expires_at);
create trigger session_requests_updated before update on session_requests for each row execute function set_updated_at();

-- ---------------------------------------------------------------- address books
create table address_books (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null check (length(name) between 1 and 100),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, name)
);
create trigger address_books_updated before update on address_books for each row execute function set_updated_at();

create table address_book_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,   -- duplicado a propósito para RLS barato
  address_book_id uuid not null references address_books(id) on delete cascade,
  address text not null check (length(address) between 1 and 60),       -- ID numérico o alias
  display_name text not null default '' check (length(display_name) <= 100),
  tags text[] not null default '{}',
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (address_book_id, address)
);
create index on address_book_entries (org_id);
create index on address_book_entries using gin (tags);
create trigger address_book_entries_updated before update on address_book_entries for each row execute function set_updated_at();

-- ---------------------------------------------------------------- audit log (append-only)
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  actor_user_id uuid references profiles(id) on delete set null,
  actor_device_id uuid references devices(id) on delete set null,
  action text not null,           -- 'session.open', 'session.close_by_admin', 'device.unattended_on', 'member.invite', ...
  target_id uuid,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on audit_logs (org_id, created_at desc);

-- ---------------------------------------------------------------- webhooks idempotency
create table stripe_events (
  id text primary key,            -- event.id de Stripe
  type text not null,
  processed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- abuse reports
create table abuse_reports (
  id uuid primary key default gen_random_uuid(),
  reported_device_id uuid not null references devices(id) on delete cascade,
  reporter_device_id uuid references devices(id) on delete set null,
  session_id uuid references sessions(id) on delete set null,
  reason text not null check (length(reason) <= 2000),
  status text not null default 'open' check (status in ('open','actioned','dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on abuse_reports (reported_device_id);
create index on abuse_reports (status, created_at);
create trigger abuse_reports_updated before update on abuse_reports for each row execute function set_updated_at();

-- ================================================================ RLS (portal)
create or replace function is_member(p_org uuid, p_roles text[] default array['owner','admin','agent'])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from org_members where org_id = p_org and user_id = auth.uid() and role = any(p_roles))
$$;

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table org_members enable row level security;
alter table devices enable row level security;
alter table sessions enable row level security;
alter table session_requests enable row level security; -- sin políticas: solo el señalizador (service_role)
alter table address_books enable row level security;
alter table address_book_entries enable row level security;
alter table audit_logs enable row level security;
alter table stripe_events enable row level security;   -- sin políticas: solo service_role
alter table abuse_reports enable row level security;   -- sin políticas: solo service_role

create policy org_read on organizations for select using (is_member(id));
create policy org_update on organizations for update using (is_member(id, array['owner'])) with check (is_member(id, array['owner']));
-- plan, límites y stripe_* los escribe solo el webhook (service_role): el portal solo cambia el nombre
revoke update on organizations from authenticated;
grant update (name) on organizations to authenticated;

create policy profile_self on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy profile_coworkers on profiles for select using (
  exists (select 1 from org_members a join org_members b on a.org_id = b.org_id
          where a.user_id = auth.uid() and b.user_id = profiles.id));

create policy members_read on org_members for select using (is_member(org_id));
create policy members_admin on org_members for all using (is_member(org_id, array['owner','admin']) and role <> 'owner')
  with check (is_member(org_id, array['owner','admin']) and role <> 'owner');

create policy devices_read on devices for select using (org_id is not null and is_member(org_id));
create policy devices_admin on devices for update using (is_member(org_id, array['owner','admin']))
  with check (org_id is null or is_member(org_id, array['owner','admin']));
-- el portal solo puede tocar alias y org_id (desvincular); el resto lo escribe el señalizador
revoke update on devices from authenticated;
grant update (alias, org_id) on devices to authenticated;

create policy sessions_read on sessions for select using (org_id is not null and is_member(org_id));
-- cerrar sesiones desde el portal va por la API (llama al señalizador), no por update directo

create policy books_read on address_books for select using (is_member(org_id));
create policy books_write on address_books for all using (is_member(org_id, array['owner','admin']))
  with check (is_member(org_id, array['owner','admin']));

create policy entries_read on address_book_entries for select using (is_member(org_id));
create policy entries_write on address_book_entries for all using (is_member(org_id))
  with check (is_member(org_id) and exists (select 1 from address_books b where b.id = address_book_id and b.org_id = address_book_entries.org_id));

create policy audit_read on audit_logs for select using (is_member(org_id, array['owner','admin']));
