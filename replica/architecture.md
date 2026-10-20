# Architecture: (nombre pendiente, ver /replica-brand) — reconstrucción de las funciones núcleo de AnyDesk

Basado en `replica/recon.md` (S01-S22, F01-F12) y `replica/features.csv`.

Principio: el original es un producto de red + agente nativo, no una web. Por eso hay **tres cosas que desplegar** y no una: el cliente de escritorio, un servidor de señalización (WebSockets largos, que Vercel no sostiene) y un relay TURN. Todo lo demás (portal, cuentas, pagos) es la web aburrida por defecto. Una sola base de datos.

```
 [Cliente técnico] ──WSS──┐                 ┌──WSS── [Cliente remoto]
        │                 ▼                 ▼               │
        │           Señalizador (Rust, Fly) ── Postgres (Supabase) ── Portal Next.js (Vercel)
        │                                                     ▲
        └──────── WebRTC P2P (DTLS, cifrado E2E) ─────────────┘   Stripe ─webhook─┘
                  └─ si el NAT lo impide: TURN (coturn, Fly) ─┘
```

## Stack

| layer | choice | why |
| --- | --- | --- |
| cliente escritorio (UI) | Tauri 2 + React + TypeScript + Tailwind | un solo código para Windows/macOS/Linux, binario de ~10 MB frente a ~100 MB de Electron, y la UI comparte componentes y tokens con el portal |
| cliente escritorio (núcleo) | Rust (el backend de Tauri) | captura, codificación e inyección de entrada necesitan código nativo sin GC; Rust tiene crates para todo esto y va en el mismo binario |
| transporte | WebRTC (crate `webrtc-rs`) | resuelve NAT traversal (ICE/STUN/TURN), cifrado (DTLS-SRTP), control de congestión y canales de datos; no inventamos protocolo |
| captura de pantalla | Windows: Desktop Duplication (DXGI); macOS: ScreenCaptureKit; Linux: portal PipeWire (Wayland) / XShm (X11) | las APIs oficiales de cada SO; crates `scap` / `xcap` como punto de partida |
| códec | H.264 por hardware (Media Foundation / VideoToolbox / VA-API), OpenH264 de respaldo | baja latencia y bajo consumo; cualquier equipo lo decodifica |
| entrada | Windows `SendInput` + servicio para el escritorio seguro; macOS `CGEvent`; Linux `uinput` / libei | inyección oficial; `enigo` cubre lo básico |
| servicio en segundo plano | servicio de Windows, LaunchDaemon (macOS), unidad systemd (Linux) | necesario para el acceso desatendido, el reinicio y la pantalla de login (S22) |
| señalización | Rust (axum + tokio-tungstenite) en Fly.io | presencia, resolución ID -> equipo e intercambio SDP/ICE; proceso pequeño, sin estado salvo los sockets abiertos |
| relay | coturn en Fly.io (o TURN gestionado de Cloudflare) | TURN estándar; credenciales efímeras firmadas por el señalizador |
| portal web | Next.js (App Router) + TypeScript + Tailwind | S16-S20; lo estándar |
| database | Postgres en Supabase | una base para el portal y el señalizador; RLS para el portal |
| ORM | Drizzle (portal), sqlx (señalizador) | SQL tipado en cada lenguaje; la migración es SQL plano |
| auth | Supabase Auth (email + contraseña, magic link, TOTP MFA) | cuentas de técnicos (S16); los **equipos** se autentican aparte con su clave ed25519 |
| payments | Stripe Checkout + Billing + Customer Portal | suscripción anual por plan + add-on por conexión simultánea, como el original |
| email | Resend | invitaciones de miembros, recibos, alertas de seguridad |
| jobs | Supabase pg_cron | tareas SQL pequeñas (caducar invitaciones, cerrar sesiones fantasma); sin otro servicio |
| files | ninguno en el servidor | grabaciones y transferencias se quedan en los equipos (privacidad, coste cero); R2 solo si llega la grabación en la nube |
| auto-update | plugin updater de Tauri + releases firmadas | actualizaciones firmadas sin infraestructura propia |
| firma de código | Windows: certificado EV o Azure Trusted Signing; macOS: Developer ID + notarización | sin esto SmartScreen, Gatekeeper y los antivirus bloquean un programa de control remoto |
| hosting | Vercel (portal), Fly.io (señalizador + coturn), Supabase (DB) | todo gestionado; Fly porque admite WebSockets largos y UDP para TURN |

Alternativa a valorar antes de empezar: partir del núcleo de RustDesk (Rust, mismo problema resuelto). Ahorra meses en captura, códec y entrada, pero es **AGPL-3.0**: habría que publicar el código del cliente y del servidor modificados. Para código cerrado, construir sobre `webrtc-rs` y crates MIT/Apache como arriba.

## Identidad y seguridad del equipo

- Primer arranque: el cliente genera un par ed25519 y lo guarda en el almacén del SO (DPAPI / Keychain / Secret Service). `POST /v1/devices/register` con la clave pública; el servidor asigna un `numeric_id` aleatorio de 9 dígitos, único (reintenta si choca).
- Cada conexión WSS empieza con un reto: el servidor manda un nonce y el equipo lo firma. No hay contraseñas de equipo en el servidor.
- **La contraseña de acceso desatendido nunca sale del equipo.** Se guarda en local con argon2id y se verifica dentro del canal WebRTC ya cifrado con un PAKE (SPAKE2, crate `spake2`), así que ni el señalizador ni el relay pueden verla ni probarla. El bloqueo tras intentos fallidos (5 intentos, luego 15 minutos, creciente) lo aplica el equipo remoto. El señalizador además limita los intentos por ID de origen.
- Huella: las huellas DTLS se muestran en S05 y S06 y se comparan con la clave pública registrada. Un señalizador comprometido no puede hacer de intermediario sin que se note.
- Perfiles de permisos (14 flags, S12): JSON local en el equipo remoto, aplicados **por el remoto**. El técnico nunca decide sus propios permisos.
- Antiabuso: S05 muestra siempre si el que conecta tiene cuenta verificada y de qué organización es, con un aviso fijo contra llamadas de "soporte" no pedidas. Botón Denunciar en S05/S06 -> `abuse_reports`. Si `devices.blocked_at` está puesto, el señalizador rechaza el equipo.

## Schema

Tablas: 11. Ver [`schema.sql`](schema.sql). Validado en PGlite: se aplica entero, el límite de conexiones bloquea la segunda sesión y los alias son únicos sin distinguir mayúsculas.

`organizations, profiles, org_members, devices, sessions, session_requests, address_books, address_book_entries, audit_logs, stripe_events, abuse_reports`

Access rules: **RLS** para el portal (rol `authenticated`, función `is_member(org, roles)`). El **señalizador** usa `service_role` y hace una comprobación de autorización explícita por consulta, toda en un módulo (`authz.rs`) con un test por regla. Las columnas sensibles (plan, límites, Stripe, estado online) están revocadas a `authenticated`: solo las escriben el webhook o el señalizador.

Fuera de la base, a propósito: contraseñas de acceso desatendido, perfiles de permisos, chat, archivos y grabaciones. Viven en el equipo.

Restricciones duras del recon:
- Límite de conexiones simultáneas: `open_session()` con `select ... for update` sobre la organización.
- Alias `a-z0-9._-`, máx. 25, sin distinguir mayúsculas, único por namespace: `citext` + check + dos índices únicos parciales.
- ID numérico de 9-10 dígitos, único: check de rango + unique.
- Invitación caduca a los 2 min: `expires_at`, comprobado al aceptar y barrido por un job.
- No conectarse a uno mismo: `check (source <> target)`.

## API

### Cliente <-> señalizador (`wss://signal.<dominio>/v1/ws`, JSON)

| mensaje | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| `POST /v1/devices/register` (HTTPS) | alta del equipo, asigna ID | cliente nuevo; rate limit por IP | public_key, os, app_version, hostname | numeric_id | S01, S22 |
| `hello` | autentica el socket | equipo registrado | numeric_id, firma(nonce), access_token? | ok, org, plan | todas |
| `heartbeat` (20 s) | online / last_seen | equipo autenticado | — | — | S02, S17 |
| `connect` | pide sesión a un ID/alias | equipo autenticado, no bloqueado; rate limit | target, mode | session_id + ice_servers (TURN efímero), o error offline / blocked / limit | F01, F02, F04 |
| `incoming` (servidor -> remoto) | avisa al remoto | — | session_id, requester {numeric_id, alias, display_name, org, verified} | — | S05 |
| `accept` / `reject` | respuesta del remoto (manual o tras el PAKE) | destino de esa sesión | session_id | llama a `open_session()`; ok o `limit` | F01, F02 |
| `sdp` / `ice` | reenvía oferta, respuesta y candidatos | los dos extremos | session_id, payload | reenviado | F01, F02 |
| `session_end` | cierra y registra | cualquier extremo | session_id, reason, connection_type | — | F01, F06 |
| `close_session` (servidor -> extremos) | cierre forzado desde el portal | — | session_id | ambos cortan | F10 |
| `invite` / `invite_cancel` / `invite_response` | invitación directa | equipo autenticado | to, profile_name / request_id, accepted | request_id; al aceptar -> `connect` | F11, S14, S15 |
| `wake` | pide a un equipo online de la misma LAN que envíe el paquete mágico | técnico con el equipo en su organización | target_id | ok / no_peer | F07 |
| `report_abuse` | denuncia | extremo de la sesión | session_id, reason | ok | S05, S06 |

Dentro de WebRTC (P2P, nunca pasa por el servidor): vídeo de pantalla, audio y canales de datos `input`, `clipboard`, `chat`, `files`, `control` (Ctrl+Alt+Del, bloquear, reiniciar, monitor, calidad) y `auth` (PAKE). El remoto filtra cada mensaje de `control`, `input` y `files` contra el perfil activo.

### Portal (Next.js; lecturas vía Supabase con RLS)

| method path | does | who | input | output | flow |
| --- | --- | --- | --- | --- | --- |
| Supabase Auth | registro, login, MFA, reset | público | email, password, totp | sesión | F12, S16 |
| `POST /api/orgs` | crea organización y owner | usuario sin org | name | org | F12 |
| `GET` (RLS) devices | equipos de la organización | miembro | online, os, búsqueda | filas | S17 |
| `PATCH` (RLS) devices | alias / desvincular | admin, owner | alias \| org_id=null | fila | S17 |
| `POST /api/devices/claim` | vincular un equipo con el código de 6 dígitos que muestra el cliente | admin, owner | numeric_id, code | device | F12 |
| `GET` (RLS) sessions | registro de sesiones | miembro | fechas, estado | filas | S18 |
| `POST /api/sessions/:id/close` | cierre forzado | admin, owner | — | ok (HTTP interno al señalizador con secreto) | F10 |
| CRUD (RLS) address_books / entries | libretas y entradas | leer: miembro; libretas: admin; entradas: miembro | name / address, display_name, tags | filas | S03, S19, F08 |
| `POST /api/members/invite` | invitar técnico | admin, owner; respeta `max_users` | email, role | email vía Resend | S20 |
| `PATCH` (RLS) org_members | cambiar rol / quitar | admin, owner (no al owner) | role | fila | S20 |
| `POST /api/billing/checkout` | Stripe Checkout | owner | plan, extra_connections | url | F12 |
| `POST /api/billing/portal` | Stripe Customer Portal | owner | — | url | S20 |
| `GET` (RLS) audit_logs | actividad | admin, owner | fechas | filas | S20 |
| `DELETE /api/account` | borrado RGPD | el propio usuario | confirmación | ok | — |

Login desde el cliente: abre Supabase Auth en el navegador del sistema (PKCE + deep link `<app>://auth`) y guarda el token en el almacén del SO. La libreta del cliente (S03) habla directo con Supabase usando RLS.

Webhooks in: Stripe `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed` -> `POST /api/webhooks/stripe`. Verifica la firma, inserta `event.id` en `stripe_events` (si ya existe, devuelve 200 sin hacer nada) y actualiza plan y límites.
Webhooks out: ninguno en v1.

Jobs (pg_cron, cada minuto salvo el último):
- `expire_requests`: invitaciones `pending` con `expires_at < now()` pasan a `expired`.
- `reap_sessions`: sesiones `open` con un extremo sin heartbeat 90 s pasan a `closed` con `end_reason = 'timeout'`, para que no consuman cupo.
- `mark_offline`: `online = false` si `last_seen_at < now() - 60 s` (respaldo del cierre de socket).
- `purge_audit` (diario): borra `audit_logs` de más de 12 meses.

## The parts that bite

- **Latencia:** es el producto. Presupuesto de menos de 100 ms de la captura a la pantalla en LAN. Códec por hardware, solo regiones cambiadas (DXGI las da), bitrate adaptativo con las estadísticas de WebRTC y los modos de S08. Medirlo desde el día 1.
- **NAT y relay:** un 10-20 % de las conexiones irá por TURN y eso cuesta ancho de banda. Limitarlo por plan y mostrar `connection_type` en S06/S18. Credenciales TURN HMAC de 10 minutos.
- **Privilegios por SO:** Windows: UAC y la pantalla de login solo se ven desde un servicio en sesión 0 que lanza un proceso en el escritorio seguro. macOS: sin Accesibilidad y Grabación de pantalla no funciona nada, así que S22 es obligatoria. Wayland: portal PipeWire con tokens de restauración; X11 va aparte.
- **Firma y antivirus:** un ejecutable sin firmar que mueve el ratón es malware para Defender. Firmar antes de la primera beta pública.
- **Abuso:** las estafas de soporte técnico llegarán en cuanto haya usuarios. Email verificado para conectar con cuenta, avisos en S05, denuncias, bloqueo de equipos y rate limit de `connect`.
- **Idempotencia:** los webhooks de Stripe llegan dos veces (`stripe_events`). `session_end` puede llegar de los dos lados (update solo si `status = 'open'`).
- **Races:** dos técnicos con el cupo lleno (`open_session()` con lock); aceptar una invitación caducada (comprobar en el update); colisión de ID aleatorio (unique + reintento).
- **Rate limits:** `register` por IP, `connect` por equipo, intentos desatendidos por par origen-destino.
- **Reconexión:** reinicio remoto (F06) y cortes de red. Backoff en el cliente; el señalizador guarda el `session_id` 60 s para reanudar sin pasar por S05 si el modo era desatendido.
- **Archivos:** bloques de 64 KB con contrapresión (`bufferedAmountLowThreshold`), reanudación por offset, nunca el archivo entero en memoria.
- **Realtime:** presencia en S02/S17. Portal: Supabase Realtime sobre `devices` filtrado por organización; cliente: el mismo WSS.
- **Time zones:** todo `timestamptz` UTC; el portal formatea en la zona del navegador.
- **Multi-tenancy:** `org_id` en todo; RLS + `authz.rs`; un test por tabla que intenta leer otra organización.
- **GDPR:** solo metadatos de sesión, nunca contenido. Borrado de cuenta en cascada; `user_id` pasa a null en sessions y audit_logs. Servidores en Frankfurt si se vende en la UE.
- **Email:** SPF, DKIM y DMARC en Resend antes del primer envío.

## Build order

1. **Vertical slice (sin cuenta, feo, Windows -> Windows):** S01 (mi ID + dirección), S05 (aceptar/rechazar), S06 (ver + ratón y teclado). Tablas `devices`, `sessions`. Mensajes `register`, `hello`, `heartbeat`, `connect`, `incoming`, `accept/reject`, `sdp/ice`, `session_end`. Listo cuando dos PC en redes distintas se conectan por ID y uno controla al otro, por TURN si hace falta.
2. **Must-haves (22):** portable e instalado como servicio, S22 con permisos de macOS, firma; TURN efímero y huella; multimonitor, S08, portapapeles, pestañas; S11/S12, PAKE, bloqueo, perfiles aplicados en el remoto; recientes (S02); macOS y luego Linux (X11 antes que Wayland).
3. **Should-haves (16):** chat (S09), archivos (S10) y copiar/pegar archivos, acciones (S07), grabación local (S21), libreta y favoritos (S03), audio; después cuentas + portal (S16-S18, S20) + Stripe (F12) + límite de conexiones. **Aquí empieza a poder venderse.**
4. **Could-haves (12):** alias y namespace, invitaciones (S14/S15) y cola de soporte, Wake-on-LAN (F07), cambiar de lado, pizarra, modo privacidad, lista blanca, 2FA desatendido, libretas compartidas con roles (S19), registro de actividad.
5. **Fixes de /replica-entrepreneur:** pendiente.
