# XyroStudio · guía rápida para Claude

Responde en español, corto. Ahorra tokens: no explores el repo entero; usa este mapa y lee solo la parte del archivo que vas a tocar (`grep -n` + `sed -n`). No uses subagentes salvo que el usuario lo pida.

## Mapa
- `web/public/index.html` · portada xyrostudio.net (SPA tipo app, rutas `#/webs #/apps #/control #/bots #/edits #/arma #/resultados`). Todo el CSS/JS va inline. ~57 KB: no la leas completa.
- `web/public/videos/` · landing de la app de videos. Legales, `gracias.html`, `discord/`, `img/` quedan en raíz (la app y los pagos los enlazan).
- `web/public/gestor/` · **Panel XyroStudio** (privado, PWA). Supabase: misma base que Santos Strength. Accesos por rol en el objeto `ACCESO` de `gestor/index.html` (hoy solo `gestor` = dueño).
- `web/public/app/` · **Xyro Apps** (SaaS multi-rubro: gym, consultorio, academia en el objeto `RUBROS`). Demo sin login: `/app/?demo=gym`. Real: login Supabase, tablas `xa_*` (SQL 15 privado). Se activa por cliente con `config.xyros` incluyendo `apps`. `carnet.html?c=CODIGO` = carnet QR público (RPC `xa_carnet`). Toma nombre/logo/colores/planes de la web del cliente (`deWeb`, `temaDeWeb`, `syncWeb`), importa Excel/CSV de AppFit (`importador`), código de socio `num` y comprobantes (`ticketHTML`, serie+correlativo vía RPC `xa_siguiente`, SQL 16). Sin OSE imprime "nota de venta"; con `CFG.sunat` cambia a boleta/factura electrónica. SQL 17: precios propios con descuento/motivo al cobrar (`cobrar`), sesiones e interdiario, `dom` (domingos/feriados, `noLab`), foto (`subirFoto`, bucket medios/<sitio>/xa), un ingreso por día (`checkin`), tienda/cafetín con stock (`tienda`, RPC `xa_stock`, `xa_movs`), cierre de caja (`cierreCaja`, `xa_cierres`) y `reportes` por fechas. Utilidad/márgenes solo si `config.xyros` incluye `control`. SQL 18: congelar membresía (`congelar`/`reactivar`, columna `pausas` jsonb; los días se suman a `fin` y corren las membresías siguientes).
- `plantilla/` · base para cada proyecto nuevo de cliente (web + panel + conexion.js). Ver `plantilla/README.md`. No se publica.
- `marca/` y `web/public/img/marca/` · logos (misma X; el centro cambia por división).

## Publicar
Push a `main` = se publica solo (Cloudflare Workers Builds, raíz `web/`). Verifica con WebFetch a https://xyrostudio.net/... (curl desde la nube está bloqueado). Antes de editar: `git fetch origin main` y parte de `origin/main` (otros hilos editan a la vez).

## Reglas
- Nunca la service_role key en el frontend. No publicar `.sql`. RLS en toda tabla nueva.
- Datos personales del dueño: privados.
- Rendimiento: sin librerías pesadas, imágenes webp/jpg chicas, nada de frameworks.
- Diseño: nada de landing estática; demos interactivas. Sin precios altos visibles (precios por WhatsApp 51936449066).

## Otro repo
`WhyHunterDev/WhyHunterDev.github.io`: web y panel de Santos Strength (`/santos-strength/`) y el gestor viejo (`/gestor/`). La web de Santos se trabaja en otro proyecto.
