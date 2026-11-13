# Plantilla de proyecto XyroStudio

> **¿Gimnasio?** No uses esta carpeta: ya hay base fija en `web/public/sitio/` (xyrostudio.net/sitio/?s=slug). En el Panel XyroStudio → ＋ Nuevo negocio marca «Xyro Webs» y la web queda creada sola; el dueño la edita en Xyro Apps → «🌐 Mi web». Esta carpeta queda para rubros sin base todavía o proyectos a medida.

Base para cada software/web nuevo de un cliente. Ya viene conectada al **Panel XyroStudio** (xyrostudio.net/gestor/):
métricas (visitas y clics a WhatsApp), registro de errores, temas de temporada con promo, modo mantenimiento,
copias de seguridad, cuentas del cliente y uso del panel. No se publica sola: está fuera de `web/`.

| Archivo | Qué es |
|---|---|
| `index.html` | Web pública. Lee el contenido de Supabase (`negocio`, `items`, `config`). |
| `panel.html` | Panel del cliente (admin edita textos y productos; sesión de 1 h; el gestor entra sin rastro). |
| `backend/conexion.js` | Conexión a Supabase. Solo cambia `sitio: 'MI-SLUG'`. |

## Abrir un proyecto nuevo (5 pasos)
1. Elige el **slug** (minúsculas y guiones, ej. `panaderia-rosa`).
2. Copia esta carpeta donde se publicará y cambia `MI-SLUG` en `backend/conexion.js`.
   - Ruta: `https://…/panaderia-rosa/` → slug = último tramo.
   - Dominio o subdominio propio: `panaderia-rosa.xyrostudio.net` → slug = primer tramo del dominio.
3. En el Panel XyroStudio → Clientes → ＋ Nuevo: pon la **URL de la web** y guarda. El panel crea el sitio solo.
4. En la ficha del cliente → Cuentas: crea la cuenta **admin** del cliente.
5. Abre `panel.html`, llena los datos y listo. Todo lo demás se administra desde tu panel.

## Reglas
- Nunca la service_role key en el frontend. No subir `.sql` al repo. RLS en toda tabla nueva.
- Para módulos propios del proyecto (inventario, citas…), guarda en `contenido` con una clave nueva
  o crea tablas con `sitio_id` y RLS (`puede_gestionar_sitio`).
