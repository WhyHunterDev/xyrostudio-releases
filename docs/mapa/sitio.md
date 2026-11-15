# Base Xyro Webs · Gimnasio (`web/public/sitio/`)

Detalle movido desde CLAUDE.md (2026-11-15). Lee solo la parte que necesitas (`grep -n palabra docs/mapa/sitio.md`). Agrega aquí lo nuevo de este módulo.

`web/public/sitio/` ·

**Base Xyro Webs · Gimnasio** (web pública fija para todo gym, copia genérica de la web de Santos sin datos reales). `xyrostudio.net/sitio/?s=slug` lee `contenido` del negocio (mismas claves que edita «🌐 Mi web» en `app/web/`); nombre/logo/color salen de `contenido.app`; lo que falte sale de `sitio/js/base.js` (`XYRO_BASE_GYM(nombre)`, textos con «(nombre del gym)», «(distrito)»…; también trae `.incluye` y `.extras` = qué es base y qué se cobra aparte). Sin `?s=`: vista de plantilla; `?n=Nombre&c=2563eb` la muestra con nombre/color para vender. Solo lectura (nunca escribe). Gestor: `sembrarWeb(slug)` copia la base al negocio sin pisar lo editado y pone `app.web`; se llama en `crearNegocio` si marca «Xyro Webs» y en `guardarXyros` al activar Webs. `webDe` cuenta `/sitio/` como web real. Claves localStorage por negocio (`xg-<slug>-*`).

**Diseños** `config.estilo` = fuerza|impacto|comunidad: cambian la estructura (portada propia en `INI.impacto`/`INI.comunidad` de `site.js`, menú: impacto = pantalla completa `#imNav`, comunidad = barra flotante), no el color (el color es `app.color`). CSS `html[data-estilo]` al final de `sitio/css/site.css`; vista previa `?e=`.

**Secciones** `config.secciones` = {cafetin:false…} oculta menús/enlaces/rutas (`ON()`, `secciones()`; vista previa `?sin=a,b`). Vista previa de tema `?tema=navidad` (también en la web de Santos). Logo en demo `&l=https…`. Se editan en Mi web → «✨ Diseño y secciones» (`V.diseno`, solo si `SS_BASE`).
