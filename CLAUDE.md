# XyroStudio · guía rápida para Claude

Responde en español, corto. Ahorra tokens: no explores el repo entero; usa este mapa y lee solo la parte del archivo que vas a tocar (`grep -n` + `sed -n`). No uses subagentes salvo que el usuario lo pida.

## Mapa
- `web/public/index.html` · portada xyrostudio.net (SPA tipo app, rutas `#/webs #/apps #/control #/bots #/edits #/arma #/resultados`). Todo el CSS/JS va inline. ~57 KB: no la leas completa.
- `web/public/videos/` · landing de la app de videos. Legales, `gracias.html`, `discord/`, `img/` quedan en raíz (la app y los pagos los enlazan).
- `web/public/gestor/` · **Panel XyroStudio** (privado, PWA). Supabase: misma base que Santos Strength. Accesos por rol en el objeto `ACCESO` de `gestor/index.html` (hoy solo `gestor` = dueño).
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
