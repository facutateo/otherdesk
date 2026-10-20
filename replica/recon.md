# Recon map: AnyDesk (desktop: Windows / macOS / Linux)

Scope: núcleo de sesión remota (ID/alias, solicitar y aceptar conexión, ver y controlar pantalla, chat, transferencia de archivos, libreta de direcciones) + acceso desatendido (contraseña, perfiles de permisos, reinicio remoto, Wake-on-LAN, grabación de sesión) + el mínimo de portal web para cuentas, dispositivos y sesiones.
For: producto para vender (SaaS de soporte remoto para MSPs, helpdesks y equipos IT pequeños).
Date: 2026-10-20

Fuentes: solo páginas públicas (sitio, precios, centro de ayuda). No se usó ninguna cuenta, no se leyó código ni tráfico de red. Capturas en `replica/screens/`: aún ninguna; añadirlas a mano desde el centro de ayuda o desde una instalación propia si hacen falta para replica-design.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | marketing site | https://anydesk.com/es | v9: solicitudes de sesión, enlaces de invitación, colas de sesión; cloud u on-prem |
| 2 | pricing | https://anydesk.com/en/pricing | Standard $42.90/mes (1 conexión, 20 usuarios, 500 dispositivos desatendidos); Advanced $90.90 (2 conexiones, 100 usuarios, CLI, MSI, GPO); Ultimate a medida (SSO, namespace, on-prem) |
| 3 | help center index | https://support.anydesk.com/llms.txt | índice completo de artículos; la fuente más completa de funciones |
| 4 | help: connect | https://support.anydesk.com/docs/connect-to-a-remote-client.md | ID 9-10 dígitos o alias; contraseña desatendida o aceptación manual; pestañas de sesión; cerrar sesión desde portal |
| 5 | help: accept window | https://support.anydesk.com/docs/accepting-the-connection.md | ventana de aceptar: info del que conecta, permisos, aceptar / aceptar elevado / rechazar / desconectar / revertir switch sides, historial de archivos |
| 6 | help: unattended | https://support.anydesk.com/docs/unattended-access.md | desactivado por defecto; Settings > Access > Set password; mínimo 8 caracteres |
| 7 | help: permission profiles | https://support.anydesk.com/docs/setting-up-permission-profiles.md | perfiles Default, Screen Sharing, Full Access, Unattended; lista de 14 permisos |
| 8 | help: session toolbar | https://support.anydesk.com/docs/session-settings.md | barra de sesión, menú Actions (Ctrl+Alt+Del, lock, switch sides, screenshot, restart, insertar portapapeles) |
| 9 | help: address book | https://support.anydesk.com/docs/address-book.md | varias libretas, entradas con tags, acciones por clic derecho, compartida por licencia |
| 10 | help: ID and alias | https://support.anydesk.com/docs/anydesk-id-and-alias.md | alias `nombre@namespace`, a-z0-9-._, máx 25, sin mayúsculas; namespace propio de pago |
| 11 | help: file manager | https://support.anydesk.com/docs/file-manager-and-file-transfer.md | gestor de dos paneles (este equipo / remoto), sesión solo-archivos, copiar/pegar archivos por portapapeles |
| 12 | help: invitation | https://support.anydesk.com/docs/session-invitation.md | invitación directa a un ID con perfil de permisos; caduca en 2 minutos |
| 13 | help: session requests / queue | https://support.anydesk.com/docs/session-requests.md | (no leído en detalle) cola de peticiones de soporte entrantes |
| 14 | help: session recording, Wake-on-LAN, remote restart | https://support.anydesk.com/docs/session-recording.md , https://support.anydesk.com/docs/wake-on-lan.md , https://support.anydesk.com/docs/remote-restart.md | (no leídos en detalle) |
| 15 | help: my.anydesk | https://support.anydesk.com/docs/myanydesk-portal.md | portal: clientes, sesiones, libretas, usuarios, roles |
| 16 | help: abuse management | https://support.anydesk.com/docs/abuse-management.md | (no leído) relevante: el software de acceso remoto se usa en estafas; el clon necesita su propia política antiabuso |
| 17 | REST API docs | https://support.anydesk.com/docs/rest-api.md | (no leído) fuente barata para el modelo de datos de clientes y sesiones |

Términos: no se usó ninguna cuenta de AnyDesk, así que no aplica ninguna cláusula de no competencia. Si más adelante se usa una cuenta propia para comparar, revisar antes https://anydesk.com/en/terms.

## Core loop

Un técnico escribe el ID de un equipo, el usuario de ese equipo acepta (o se entra con la contraseña desatendida) y el técnico ve y controla la pantalla con baja latencia hasta resolver el problema.

## Screens

Todas en la app de escritorio salvo S16-S20 (portal web).

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | Inicio (home) | abrir la app | ver mi ID/alias, conectar a otro | tarjeta "Esta estación" con ID + alias, campo Dirección remota, botón conectar, icono de invitar, pestañas de app | filled (ID asignado), sin conexión a la red, portable vs instalado |
| S02 | Recientes / Favoritos / Descubrimiento | pestañas en S01 | volver a equipos conocidos | rejilla de tiles con miniatura, menú contextual (conectar, archivos, invitar, favorito) | empty, filled |
| S03 | Libreta de direcciones | icono de la barra superior | gestionar contactos y equipos | selector de libreta, lista de entradas, tags, búsqueda, añadir/editar entrada, drag & drop de tags | empty, filled, límite alcanzado (error documentado), sin licencia |
| S04 | Conectando / introducir contraseña | Enter en Dirección remota | autenticarse | diálogo de espera, campo de contraseña, "recordar inicio de sesión", cancelar | esperando aceptación, pide contraseña, contraseña errónea, rechazado, equipo offline, límite de sesiones |
| S05 | Ventana de aceptar (lado remoto) | llega una solicitud | decidir si dejar entrar | avatar + nombre + ID/alias del que conecta, selector de perfil, checkboxes de permisos, Aceptar, Aceptar elevado, Rechazar, Desconectar, pestaña de historial de archivos | pendiente, aceptada (en sesión), switch sides activo |
| S06 | Sesión remota (visor) | tras aceptar | ver y controlar | pestañas de sesión, lienzo de escritorio remoto, barra de sesión (info conexión, sysinfo, privacidad, monitores, display, chat, acciones, teclado, permisos, grabar, pizarra) | esperando imagen, controlando, solo vista (cursor prohibido), reconectando, sesión terminada inesperadamente |
| S07 | Menú Acciones | barra de sesión | comandos al remoto | lista: elevar, switch sides, Ctrl+Alt+Del, bloquear, cambiar usuario, cerrar sesión, captura, reiniciar, insertar portapapeles | items deshabilitados por permiso |
| S08 | Ajustes de visualización en sesión | barra de sesión > Display | calidad vs velocidad, escala | modo calidad (mejor calidad / equilibrado / mejor tiempo de respuesta), escala, seguir foco de ventana | — |
| S09 | Chat de sesión | barra de sesión > chat | hablar con el usuario remoto | panel lateral de mensajes, input | empty, filled |
| S10 | Gestor de archivos | barra de sesión, o icono archivos junto a Dirección remota | mover archivos | dos paneles (este equipo / remoto), subir, bajar, carpeta padre, cola de transferencias | vacío, transfiriendo, error, permiso denegado |
| S11 | Ajustes > Acceso (seguridad) | menú > Ajustes | configurar quién entra | contraseña desatendida, perfiles de permisos, lista blanca de IDs, 2FA | desatendido apagado (defecto), encendido, contraseña débil (error) |
| S12 | Editor de perfil de permisos | S11 | definir permisos | dropdown de perfiles, crear/borrar perfil, toggle perfil activo, toggle desatendido + contraseña, 14 checkboxes | perfiles por defecto no borrables |
| S13 | Ajustes generales | menú > Ajustes | resto de opciones | secciones: interfaz, privacidad (nombre/avatar mostrado), display, audio, conexión (proxy, puerto directo), grabación, archivos | — |
| S14 | Invitar a un equipo | icono junto a mi ID | pedir que alguien conecte conmigo | campo ID/alias, selector de perfil, estado pendiente, cancelar | pendiente, caducada (2 min), aceptada, rechazada |
| S15 | Notificación de invitación (receptor) | llega una invitación | aceptar/rechazar invitación | toast abajo a la derecha con ID/alias, Aceptar, Rechazar | — |
| S16 | Portal: login / registro | web | cuenta del cliente | email, contraseña, MFA | error, MFA requerido |
| S17 | Portal: dispositivos (clientes) | web > Clients | ver equipos de la licencia | tabla con ID, alias, SO, versión, online, última vez visto | empty, filled, offline |
| S18 | Portal: sesiones | web > Sessions | auditoría y cierre remoto | tabla sesiones (origen, destino, inicio, fin, duración, estado), detalle, botón Cerrar sesión | abierta, cerrada |
| S19 | Portal: libretas de direcciones | web > Address Books | gestión central | lista, permisos por usuario | — |
| S20 | Portal: usuarios y licencia | web > Users / License | equipo y facturación | tabla usuarios, invitar, roles, plan, conexiones simultáneas | límite de usuarios alcanzado |
| S21 | Grabaciones | Ajustes > Grabación / lista local | reproducir sesiones grabadas | lista de archivos, reproductor con timeline | empty, filled |
| S22 | Instalar / primer arranque | ejecutable | portable vs instalar | elegir instalar, ruta, iniciar con el sistema, permisos de macOS (accesibilidad, grabación de pantalla) | portable, instalado, permisos macOS faltantes |

## Flows

```
F01 Técnico da soporte a un usuario presente (interactivo)
    usuario: S22 (portable) -> S01 lee su ID al técnico
    técnico: S01 escribe ID -> S04 esperando -> (usuario: S05 Aceptar) -> S06
    happy path clicks (técnico): 2 (escribir ID + Enter) ; usuario: 1 (Aceptar)
    edge: equipo offline, usuario rechaza, solicitud sin respuesta, límite de sesiones de la licencia, macOS sin permisos de grabación, UAC aparece y el técnico no lo ve (necesita elevar)

F02 Técnico entra a un equipo sin nadie delante (desatendido)
    remoto (una vez): S11 -> S12 activar desatendido + contraseña
    técnico: S01/S03 doble clic en entrada -> S04 contraseña -> S06
    happy path clicks: 2-3 (doble clic + contraseña + Enter; 1 si "recordar inicio de sesión")
    edge: contraseña errónea (bloqueo tras N intentos), equipo bloqueado o sin usuario logueado, equipo apagado (-> F07), contraseña débil rechazada

F03 Usuario configura acceso desatendido
    S01 -> S13 Ajustes -> S11 Acceso -> Set password -> Apply
    happy path clicks: 4
    edge: no instalado (desatendido no sobrevive al reinicio), contraseña < 8 caracteres, cambiar contraseña invalida sesiones guardadas

F04 Transferir archivos durante la sesión
    S06 -> icono archivos -> S10 -> seleccionar -> Subir/Bajar
    alternativa: copiar/pegar archivos por portapapeles
    happy path clicks: 3
    edge: sin permiso de File Manager, archivo grande, carpeta sin permisos en remoto, se corta la conexión a mitad

F05 Chat y acciones en sesión
    S06 -> S09 chat ; S06 -> S07 Ctrl+Alt+Del / reiniciar / bloquear
    happy path clicks: 2
    edge: acción deshabilitada por permisos, Ctrl+Alt+Del requiere servicio instalado, tras reiniciar reconectar automáticamente

F06 Reiniciar el remoto y reconectar
    S06 -> S07 Reiniciar -> confirmar -> sesión se corta -> reconexión automática -> S04 contraseña (si desatendido) -> S06
    happy path clicks: 3
    edge: no instalado (no vuelve), arranque en modo seguro

F07 Despertar un equipo apagado (Wake-on-LAN)
    S03/S02 menú contextual -> Despertar -> otro equipo de la misma red envía el paquete -> equipo aparece online -> F02
    happy path clicks: 2
    edge: no hay otro cliente online en la misma LAN, WoL desactivado en BIOS

F08 Gestionar libreta de direcciones
    S03 -> añadir entrada (ID, nombre, tags) -> guardar ; doble clic conecta
    happy path clicks: 4
    edge: límite de entradas por plan, ID duplicado, mover entre libretas, compartida entre usuarios del equipo

F09 Grabar una sesión y reproducirla
    S06 -> grabar -> ... -> fin -> S21 -> reproducir
    happy path clicks: 3
    edge: grabación automática por ajuste, disco lleno, grabación de sesión entrante vs saliente

F10 Admin revisa y cierra sesiones desde el portal
    S16 -> S18 -> seleccionar sesión abierta -> Cerrar sesión
    happy path clicks: 4
    edge: sesión ya cerrada, usuario sin rol de admin

F11 Invitación directa (usuario pide ayuda a un técnico)
    usuario: S01 -> S14 escribe ID del técnico + perfil -> enviar
    técnico: S15 Aceptar -> S06
    happy path clicks: 3 + 1
    edge: caduca a los 2 min, técnico offline, cancelar mientras está pendiente

F12 Alta y licencia
    web: S16 registro -> pago -> S20 -> app: iniciar sesión / registrar licencia en el cliente -> S01 muestra plan
    happy path clicks: ~8
    edge: licencia expirada, límite de conexiones simultáneas, más usuarios que el plan
```

Número a batir: F01 son 2 acciones del técnico + 1 del usuario. F02 es 2-3.

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Button | primary, secondary, danger (Rechazar), icon-only | default, hover, focus, disabled, loading | todas |
| Address input | con autocompletado de recientes/libreta | empty, typing, invalid, connecting | S01 |
| Identity card (mi ID) | ID, alias, menú contextual (copiar, invitar por email) | online, offline de la red | S01 |
| Device tile | recientes, favoritos, descubrimiento, libreta | online, offline, con miniatura, sin miniatura, seleccionado | S02, S03 |
| Context menu | tile, ID, entrada de libreta | items deshabilitados | S01-S03 |
| Tabs | pestañas de app (inicio, sesiones abiertas) | activa, con sesión activa, cerrable | S01, S06 |
| Session toolbar | iconos con tooltip, dropdowns | colapsada, expandida, icono activo/inactivo | S06 |
| Monitor switcher | 1..n monitores | actual (línea), foco remoto (punto) | S06 |
| Remote canvas | ajustar, original, escalar | esperando imagen, controlando, solo vista (cursor prohibido), lag | S06 |
| Permission checklist | 14 permisos | marcado, desmarcado, bloqueado por política | S05, S12 |
| Profile selector | dropdown con crear/borrar | por defecto (no borrable), custom | S05, S12, S14 |
| Modal / dialog | conectar, contraseña, confirmación, crear libreta | open, error | S04, S07, S03 |
| Password field | con mostrar/ocultar, "recordar" | empty, weak, error | S04, S11 |
| Toast / notification | invitación, sesión terminada, error | info, warning, error | S01, S06, S15 |
| Chat panel | mensajes propios / ajenos | empty, filled, unread | S06, S09 |
| Dual-pane file browser | local / remoto | cargando, vacío, transfiriendo (progreso), error | S10 |
| Transfer queue | lista de transferencias | en cola, en curso, hecho, fallido | S10, S05 |
| Settings nav | lista lateral de secciones | activa | S11-S13 |
| Data table (portal) | dispositivos, sesiones, usuarios | empty, loading, filled, paginación, filtro | S17-S20 |
| Status badge | online/offline, abierta/cerrada, plan | — | S02, S17, S18 |
| Tag chip | en entrada de libreta | normal, drag | S03 |
| Recording player | play/pause/timeline/velocidad | — | S21 |

## Inferred data model

```
Device (cliente instalado)  id, numeric_id (9-10 dígitos, único, aleatorio), alias (único por namespace, a-z0-9-._ máx 25, case-insensitive),
            org_id?, os, app_version, installed (bool), hostname, last_seen_at, online (bool), public_key_fingerprint,
            unattended_enabled (bool)
            evidence: S01, help "ID and Alias", S17 portal clients, help "Fingerprint"
            confidence: high (campos), medium (fingerprint)

PermissionProfile  id, device_id, name, builtin (default | screen_sharing | full_access | unattended | custom), enabled,
            unattended_password_hash?, permissions (set de 14 flags: audio, control, clipboard, clipboard_files, block_input,
            restart, file_manager, lock_on_end, sysinfo, print, whiteboard, tcp_tunnel, privacy_mode, show_colored_pointer)
            evidence: S12, help "Permission Profiles"
            confidence: high
            note: vive en el equipo (local), sincronizable vía políticas en planes altos

Session    id, source_device_id, target_device_id, user_id? (técnico logueado), mode (interactive | unattended | file_only),
            profile_id, started_at, ended_at, end_reason (local | remote | admin | error | timeout), status (requested | open | closed | rejected),
            elevated (bool), recorded (bool), connection_type (direct | relay)
            evidence: S04-S06, S18 portal sessions, help "connect", help "accept window"
            confidence: high (estado/fechas), medium (connection_type, end_reason)

SessionRequest / Invitation  id, from_device_id, to_address, profile_id, created_at, expires_at (+2 min), status (pending | accepted | rejected | expired | cancelled)
            evidence: S14, S15, help "session invitation", "session requests"
            confidence: high

ChatMessage  id, session_id, from_side (local | remote), body, sent_at
            evidence: S09
            confidence: medium (guess: no consta que se persista fuera de la sesión)

FileTransfer  id, session_id, direction (up | down), path, size, status, started_at, finished_at
            evidence: S10, pestaña de historial en S05
            confidence: medium

Recording  id, session_id, file_path (local), duration, created_at
            evidence: S21, help "session recording"
            confidence: medium (guess: archivos locales, no en la nube)

AddressBook  id, org_id, name, owner_user_id
AddressBookEntry  id, address_book_id, device_address (ID o alias), display_name, tags[], favorite (bool)
            evidence: S03, S19, help "Address Book"
            confidence: high

Organization  id, name, namespace? (custom), plan (standard | advanced | ultimate), concurrent_connections, max_users, max_managed_devices, license_key
User       id, org_id, email, password_hash, mfa_enabled, role (admin | agent | ...), display_name, avatar
            evidence: S16, S20, pricing, help "Users", "Roles"
            confidence: high

AuditLog   id, org_id, actor_user_id, action, target, created_at
            evidence: help "Activity Logs"
            confidence: medium
```

Relationships: Organization 1-n User, Organization 1-n Device, Organization 1-n AddressBook, AddressBook 1-n AddressBookEntry, Device 1-n PermissionProfile, Device 1-n Session (como origen y como destino), Session 1-n ChatMessage / FileTransfer / Recording, Device 1-n SessionRequest.

Nota de arquitectura (para replica-architect, no inventado del original): el clon necesita tres piezas que no son pantallas: un servidor de rendezvous/señalización (resolver ID -> equipo online), un relay para cuando el NAT impide la conexión directa, y un agente/servicio en el equipo remoto para desatendido, UAC y arranque con el sistema.

## Feature matrix

See `features.csv`. Must: 22, should: 16, could: 12, skip: 5.

## Out of scope (cannot or should not be cloned)

- Codec y protocolo propietarios de AnyDesk (DeskRT): se construye uno propio sobre estándares (WebRTC o H.264/VP9 + QUIC/TCP). No se copia nada del original.
- La red global de servidores de AnyDesk y sus IDs: el clon tiene sus propios IDs, servidores y relays; no es interoperable con clientes de AnyDesk.
- Integraciones de partners (Salesforce, Freshworks, ServiceNow y demás CRM/ITSM): requieren acuerdos y APIs propias de cada uno; fuera del primer alcance.
- Certificados de firma de código y reputación del ejecutable: hay que conseguir los propios (Windows EV, Apple Developer ID + notarización); no se puede "clonar".
- Clientes móviles (Android/iOS) y on-premises: fuera del alcance elegido.
- El nombre, logo, iconos y textos de AnyDesk: marca registrada; ver /replica-brand.

## Size

Screens 22, flows 12, entities 12.

Hard parts:
1. Captura y streaming de pantalla con baja latencia en tres SO (captura nativa por SO, codificación por hardware, control adaptativo de calidad).
2. Conectividad: NAT traversal + servidor de rendezvous + relay que escale, con cifrado de extremo a extremo y verificación de huella.
3. Inyección de entrada y privilegios por SO: servicio de Windows para UAC, Ctrl+Alt+Del y pantalla de login; permisos de Accesibilidad y Grabación de pantalla en macOS; X11 vs Wayland en Linux.
Además: reconexión tras reinicio, transferencia de archivos fiable, firma y notarización del ejecutable, y antiabuso (las estafas de "soporte técnico" usan este tipo de software; un producto que se vende necesita verificación de cuentas, avisos en la ventana de aceptar y vía de denuncia).

Size: **L** (un trimestre) para un MVP vendible en Windows + macOS, apoyándose en piezas existentes (WebRTC o el núcleo open source de RustDesk, licencia AGPL, revisar si encaja con venderlo). Construido desde cero en los tres SO, con relay propio y desatendido completo, se acerca a XL: recortar Linux o el portal al principio.
