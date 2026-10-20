# Componentes

Base: React + Tailwind con el preset `tailwind.preset.cjs`. Solo clases de tokens (`bg-surface text-text-muted`), nunca hex.
Primitivas accesibles: **Radix UI** (Dialog, DropdownMenu, ContextMenu, Tabs, Tooltip, Toast, Checkbox, Switch, Select) vía shadcn/ui, re-tematizadas con los tokens.
Iconos: **Lucide** (ISC). Nada de iconos, logos ni ilustraciones del original. Fuentes: **Inter** + **JetBrains Mono** (OFL), empaquetadas en el binario de Tauri, sin CDN.
Textos: todos nuevos. Los de abajo son de ejemplo y los pule /replica-brand (voz).

Reglas comunes:
- Foco: anillo de 2px `focus`, offset 2px, solo con `:focus-visible`.
- Objetivo de clic mínimo: 32px; 40px en controles primarios.
- Toda acción de icono tiene `aria-label` y tooltip con su atajo si lo tiene.
- Movimiento: `motion-fast` en hover, `motion-base` en paneles; `prefers-reduced-motion` lo anula (tokens.css).
- Todo componente de datos tiene loading (skeleton), empty (texto + acción) y error (mensaje + reintentar).

```
Button
  variants  primary, secondary, ghost, danger, icon
  sizes     sm 28px, md 32px, lg 40px (icon: cuadrado del mismo alto)
  states    default, hover (accent-hover / surface-hover), active, focus-visible, disabled (50% opacidad, sin hover),
            loading (spinner + etiqueta conservada)
  tokens    primary: bg accent, text on-accent; secondary: bg bg, border border, text text; ghost: transparente, hover surface-hover;
            danger: bg danger, text on-danger; radius md; font base/600
  a11y      <button> real; loading -> aria-busy="true" con la etiqueta aún en el DOM; icon -> aria-label obligatorio
  used on   todas

AddressInput  (campo de dirección remota)
  variants  con autocompletado (recientes + libreta), con botón de archivos (sesión solo-archivos)
  sizes     h-addressbar (40px)
  states    empty (placeholder "ID o alias del equipo"), typing (sugerencias), invalid (borde danger + ayuda),
            connecting (spinner en el botón, campo de solo lectura), disabled (sin conexión a la red)
  tokens    bg bg, border border-input, ring focus, cifras en font mono, radius md
  behaviour agrupa el ID de 3 en 3 al escribir; acepta pegar con espacios; Enter conecta; Esc cierra sugerencias;
            flechas recorren sugerencias (patrón combobox)
  a11y      role="combobox" + listbox, aria-invalid, error enlazado con aria-describedby
  used on   S01

IdentityCard  ("Este equipo")
  variants  solo ID (portable), ID + alias (instalado)
  states    online, sin conexión a la red (aviso warning + reintentar), copiado (toast)
  tokens    bg surface-raised, shadow card, radius lg; ID en type id + .tabular + font mono; alias en sm text-muted
  behaviour clic en el ID copia; menú contextual: copiar, invitar a alguien, invitar por email
  a11y      aria-label con el ID en grupos ("1 2 3, 4 5 6, 7 8 9") para que no se lea como un número de millones
  used on   S01

DeviceTile
  variants  reciente, favorito, descubierto (LAN), libreta
  sizes     w-tile-w x h-tile-h (176x132)
  states    online (punto online), offline (punto offline + miniatura en gris), con miniatura, sin miniatura (icono Monitor),
            hover (borde accent), seleccionado (borde 2px accent), cargando miniatura (skeleton)
  tokens    bg surface-raised, border border, radius lg, shadow card en hover
  behaviour doble clic conecta; Enter conecta; clic derecho o Shift+F10 abre el menú contextual
  a11y      rejilla role="grid" con flechas; online/offline también en texto, no solo color
  used on   S02, S03

ContextMenu
  items     Conectar, Explorar archivos, Invitar, Despertar, Favorito, Editar, Mover a libreta, Eliminar (danger, al final, separado)
  states    item deshabilitado con motivo en tooltip ("Sin permiso", "Equipo apagado")
  tokens    bg surface-raised, shadow pop, radius md, hover surface-hover
  a11y      Radix ContextMenu (teclado completo, typeahead)
  used on   S01, S02, S03

Tabs  (pestañas de la app)
  variants  inicio (fija), sesión (cerrable, nombre/ID + punto de estado), sección (Recientes / Favoritos / Descubrir)
  sizes     h-tabstrip (32px)
  states    activa (bg bg + borde inferior accent 2px), inactiva (text-muted), hover, reconectando (spinner), cerrar (x en hover)
  behaviour Ctrl+Tab / Ctrl+Shift+Tab cambian; Ctrl+W cierra, con confirmación si hay sesión abierta
  a11y      Radix Tabs; cerrar es un <button> aparte con aria-label "Cerrar sesión con 123 456 789"
  used on   S01, S06

SessionToolbar
  variants  anclada arriba; flotante y colapsada (asa centrada) en pantalla completa
  sizes     h-session-toolbar (40px), botones icon md
  groups    [conexión: candado + directo/relay + huella] [monitores] [pantalla] [chat] [archivos] [acciones] [teclado]
            [permisos] [grabar] [pizarra] ... [desconectar, danger]
  states    botón activo (bg chrome-surface), deshabilitado por permiso (tooltip con el motivo),
            grabando (punto danger + texto "Grabando"), colapsada / expandida
  tokens    bg chrome-bg, text chrome-text, iconos chrome-text-muted -> chrome-text en hover, shadow toolbar, borde chrome-border
  a11y      role="toolbar" con roving tabindex; atajo global configurable para enfocarla, porque el resto del teclado va al remoto
  used on   S06

MonitorSwitcher
  variants  botones numerados 1..n; "Todos" si n > 1
  states    actual (subrayado accent), foco remoto (punto), hover
  a11y      radiogroup, aria-checked en el actual
  used on   S06

RemoteCanvas
  variants  ajustar a la ventana, tamaño original (con scroll), estirar
  states    esperando imagen (spinner + "Esperando la primera imagen"), controlando,
            solo vista (cursor not-allowed + banda "Solo puedes ver este equipo"),
            reconectando (overlay + contador), sesión terminada (overlay + motivo + Reconectar)
  tokens    bg canvas; overlays bg chrome-overlay, text chrome-text
  behaviour captura teclado y ratón solo con foco; al entrar anuncia cómo volver a la barra
  a11y      role="application", aria-label "Escritorio remoto de <nombre>"; overlays de estado aria-live="polite"
  used on   S06

PermissionChecklist
  items     los 14 permisos del recon con textos propios ("Oír el sonido", "Usar teclado y ratón", "Usar el portapapeles", ...)
  states    marcado, desmarcado, bloqueado por política (candado + "Lo fija tu organización"), peligroso (acceso total: fondo warning-subtle)
  a11y      fieldset + legend; cada checkbox con descripción
  used on   S05, S12

ProfileSelector
  variants  desplegable de perfiles con "Nuevo perfil" y "Eliminar" (solo los propios)
  states    integrado (no borrable, etiqueta "Integrado"), propio, desactivado (oculto en S05)
  a11y      Radix Select
  used on   S05, S12, S14

AcceptPanel  (ventana de aceptar, lado remoto)
  layout    ventana pequeña siempre encima (360px), esquina inferior derecha
  parts     avatar + nombre + ID/alias del que conecta, insignia de cuenta verificada y organización,
            AVISO fijo antiestafa, ProfileSelector, PermissionChecklist (plegable),
            Aceptar (primary), Rechazar (secondary), Denunciar (ghost danger)
  states    pendiente (temporizador de 60 s), en sesión (Aceptar pasa a Desconectar, danger), switch sides activo,
            historial de archivos (pestaña)
  a11y      foco inicial en Rechazar, no en Aceptar: un Enter accidental no deja entrar a nadie; aviso aria-live al llegar la petición
  used on   S05

Dialog
  variants  confirmación (Reiniciar, Eliminar), formulario (contraseña, nueva libreta, entrada), informativo
  states    abierto, enviando (botón loading), error (mensaje dentro del diálogo)
  tokens    bg surface-raised, shadow pop, radius lg, fondo overlay
  a11y      Radix Dialog: foco atrapado, Esc cierra, el foco vuelve al disparador; en destructivas Cancelar recibe el foco
  used on   S03, S04, S07

PasswordField
  variants  con mostrar/ocultar, con medidor de fuerza (S11), con "Recordar en este equipo" (S04)
  states    empty, débil (warning: "Mínimo 8 caracteres; mejor 12 o más"), error ("Contraseña incorrecta. Quedan 3 intentos"),
            bloqueado ("Demasiados intentos. Prueba en 15 min"), disabled
  a11y      autocomplete current-password / new-password; mostrar es un toggle con aria-pressed
  used on   S04, S11

Toast
  variants  info, success, warning, error, invitación (con Aceptar / Rechazar)
  states    entrando, visible (5 s; la invitación hasta caducar, con contador), saliendo, pausa con hover o foco
  tokens    bg surface-raised, shadow pop, borde izquierdo 3px del color del rol
  a11y      Radix Toast; error con role="alert", el resto aria-live="polite"; F8 salta a la región de avisos
  used on   S01, S06, S15

ChatPanel
  layout    panel lateral w-side-panel (320px) a la derecha de S06
  states    empty ("Escribe al otro lado"), con mensajes, no leídos (badge en la barra), el otro lado escribiendo
  tokens    propios bg accent-subtle, ajenos bg surface; hora en xs text-muted
  a11y      role="log" aria-live="polite"; Enter envía, Shift+Enter salto de línea
  used on   S06, S09

FileBrowser  (dos paneles)
  layout    izquierda "Este equipo", derecha "Equipo remoto"; ruta (breadcrumb), Subir, Bajar, carpeta superior, nueva carpeta
  states    cargando (skeleton), carpeta vacía, sin permiso ("No tienes permiso para usar archivos"), error de acceso,
            arrastrar entre paneles (zona accent-subtle)
  tokens    filas 28px, cabecera sticky bg surface
  a11y      cada panel es un grid con selección por teclado (Espacio, Shift+flechas); Subir/Bajar dicen cuántos elementos
  used on   S10

TransferQueue
  states    en cola, en curso (barra + velocidad + tiempo restante), hecho (success), fallido (danger + Reintentar), cancelado
  a11y      <progress> con aria-valuetext "45 %, 12 MB de 27 MB"
  used on   S10, S05

SettingsNav
  layout    lista lateral w-settings-nav (220px): General, Seguridad y acceso, Privacidad, Pantalla, Audio, Conexión, Grabación, Archivos, Acerca de
  states    activa (bg accent-subtle, text accent), hover
  a11y      <nav> con aria-current="page"
  used on   S11, S12, S13

DataTable  (portal)
  variants  equipos, sesiones, usuarios, actividad
  states    loading (skeleton), empty ("Aún no hay equipos. Instala el cliente y vincúlalo"), con datos, error, paginación, filtros, orden
  tokens    cabecera bg surface, text-muted xs; filas 40px; hover surface-hover; bordes border
  a11y      <table> real con <th scope>, aria-sort en columnas ordenables
  used on   S17, S18, S19, S20

StatusBadge
  variants  online / offline, abierta / cerrada / rechazada, directo / relay, plan
  tokens    punto de 8px del color del rol + texto (nunca solo color); radius pill; xs
  used on   S02, S06, S17, S18

TagChip
  states    normal, seleccionado (filtro activo), arrastrando, quitar (x)
  tokens    bg surface, border border, radius pill, xs
  a11y      el botón quitar va etiquetado; el arrastre tiene alternativa en menú ("Añadir etiqueta")
  used on   S03

RecordingPlayer
  parts     vídeo, reproducir/pausa, línea de tiempo con marcas (inicio, archivos, fin), velocidad 0.5-4x
  a11y      teclado (Espacio, flechas ±5 s), aria-valuetext con el tiempo
  used on   S21

OnboardingPermissions  (macOS, S22)
  parts     lista de permisos (Accesibilidad, Grabación de pantalla, opcional Acceso total al disco) con estado
            y un botón "Abrir Ajustes del Sistema" por permiso; vuelve a comprobar al recuperar el foco
  states    pendiente, concedido (success), denegado (warning + instrucciones)
  used on   S22
```
