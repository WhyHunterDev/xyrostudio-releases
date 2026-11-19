# XyroStudio · guía rápida para Claude

Responde en español, corto. Ahorra tokens: no explores el repo entero; usa este mapa y lee solo la parte del archivo que vas a tocar (`grep -n` + `sed -n`). No uses subagentes salvo que el usuario lo pida.

**El detalle de cada módulo está en `docs/mapa/`** (no se publica). No lo leas completo: `grep -n palabra docs/mapa/<archivo>.md`. Lo nuevo de un módulo se anota ahí, no en este archivo (mantener CLAUDE.md < 6 KB).

## Mapa
- `web/public/index.html` · portada xyrostudio.net = **Xyro** (puente personas↔negocios). Vistas `#/ #/personas #/negocios #/mapa #/planes` (mapa real con `xa_mapa`, demo si no hay datos). Login ÚNICO = `/mi/` (`#/entrar` redirige); registrar negocio = `/mi/?registro=1`. Sin los 5 Xyros, sin entrenadores, sin Edits ni app de videos, sin precios. CSS/JS inline.
- La app de escritorio de videos se RETIRÓ de la web (2026-11-18, decisión del usuario: se integrará luego al ecosistema). No volver a enlazarla. `img/` queda en raíz.
- `web/public/gestor/` · **Panel XyroStudio** (privado, PWA). Supabase: misma base que Santos Strength. Accesos por rol en el objeto `ACCESO` de `gestor/index.html` (hoy solo `gestor` = dueño). Vistas del gestor (Pendientes, Nuevo negocio, Cobros, Tickets, Actualizaciones) → `docs/mapa/app.md`.
- `web/public/app/` · **Xyro Apps** (panel de negocios, multi-rubro `RUBROS`: gym, consultorio, barberia, restaurante). Código SOLO en `app/dev/`. Demo `/app/?demo=gym` (`&rol=recepcion|supervisor|cafetin|entrenador`). Integraciones por `config.xyros`: control, webs, bots, edits. Roles admin/supervisor/recepcion/cafetin/entrenador/nutricionista/profesional; solo XyroStudio (gestor) configura lo delicado (`soloXyro`). Worker `web/src/worker.js` = `/api/ia`, `/api/bot`, `/api/wa`, `/api/xyro/pago`. Detalle (SQL 15–43: caja, sedes, cuotas, roles, tickets, IA, bots, WhatsApp, cobros, menú, seguridad, cuentas) → `docs/mapa/app.md`.
- **VERSIONES de Xyro Apps (SQL 28) — IMPORTANTE:** el código se edita SOLO en `web/public/app/dev/` (= «panel de pruebas», muestra cinta 🧪). Al terminar un cambio corre `python3 herramientas/version.py "Título corto" "cambio 1" "cambio 2" [--sql "SQL N"] [--rubro gym|consultorio]` (OBLIGATORIO `--rubro` si el cambio es solo de un ecosistema; sin él = para todos. El gestor separa Actualizaciones por ecosistema con `ECOS`/`vPara`/`ultDe`: a un gym nunca se le ofrece una versión solo dental; el usuario lee ese historial en el gestor: escribe en simple): congela una copia en `app/v/<id>/` y la anota en `app/v/versiones.json`. Los negocios NO cambian hasta que el gestor la sube en Panel XyroStudio → «🚀 Actualizaciones» (`V.versiones`, `subirVersion`): a un negocio, a todos, o programado a las 3 am (`auto3am`); «Volver a…» deja un negocio fijo en una versión. `/app/` y `/app/web/` son cargadores: piden `xa_version(p_slug)` y redirigen a `/app/v/<id>/`; la app revisa su versión solo al abrir (`verVersion`), nunca en pleno uso. Rutas absolutas (`/img/…`, `/app/carnet.html`) para que funcionen en cualquier versión. No edites `app/v/*` (son copias congeladas), salvo un arreglo urgente que el usuario pida.
- `web/public/sitio/` · **Base Xyro Webs · Gimnasio** (`/sitio/?s=slug`, solo lectura, diseños `config.estilo`, secciones `config.secciones`). → `docs/mapa/sitio.md`.
- **Consultorio dental** (rubro `consultorio`, SQL 44, agenda/odontograma/presupuestos, web `/consultorio/`). → `docs/mapa/consultorio.md`.
- **Barberías** (rubro `barberia`, SQL 74, agenda por barbero, cola sin cita, comisiones, web `/barberia/`). → `docs/mapa/barberia.md`.
- **Restaurantes y cafeterías** (rubro `restaurante`, SQL 56, mesas/mozo/cocina, carta pública `xa_carta`, web `/restaurante/`). → `docs/mapa/restaurante.md`.
- **Pedidos por QR de mesa** (SQL 50, `/pedir/?s=&m=`, `#/pedidos`, solo gym + Control). → `docs/mapa/pedidos-mesa.md`.
- `web/public/mi/` · **Mi Xyro** (app PWA de las personas y modo negocio, SQL 45–48, storageKey `xyro-mi-auth`). → `docs/mapa/mi-xyro.md`.
- Mensaje de acceso del equipo (`accMsg`): enlace único `https://xyrostudio.net/app/`; la cuenta (usuario@negocio) ya dice a qué negocio entra. Asistencia: solo el botón de arriba (`#qk`), no en el menú lateral ni en Inicio.
- `plantilla/` · base para cada proyecto nuevo de cliente (web + panel + conexion.js). Ver `plantilla/README.md`. No se publica.
- `marca/` y `web/public/img/marca/` · logos (misma X; el centro cambia por división).

## Publicar
Push a `main` = se publica solo (Cloudflare Workers Builds, raíz `web/`). Verifica con WebFetch a https://xyrostudio.net/... (curl desde la nube está bloqueado). Antes de editar: `git fetch origin main` y parte de `origin/main` (otros hilos editan a la vez).

## Reglas
- Nunca la service_role key en el frontend. No publicar `.sql`. RLS en toda tabla nueva.
- Datos personales del dueño: privados.
- Rendimiento: sin librerías pesadas, imágenes webp/jpg chicas, nada de frameworks.
- Diseño: nada de landing estática; demos interactivas. Sin precios altos visibles. NUNCA el WhatsApp del dueño (retirado 2026-11-18): consultas y comunidad = Discord https://discord.gg/R39CwRC2bP; pagos por ticket.

## Otro repo
`WhyHunterDev/WhyHunterDev.github.io`: web y panel de Santos Strength (`/santos-strength/`) y el gestor viejo (`/gestor/`). La web de Santos se trabaja en otro proyecto.
