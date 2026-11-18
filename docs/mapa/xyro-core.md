# Xyro Core (SQL 76) y frontend /x/ (Sprint 2)

Documento maestro: una cuenta multi-rol (Usuario / Xyro Control / XyroStudio Panel), Supabase + PostGIS, 5 modos de entrega, motor de puntos, P2P, Edits. Independiente de `xa_*` (Xyro Apps) y de `sitios`.

## SQL 76 (`76-xyro-core.sql`, en docs del proyecto, NO se publica)
- Tablas: users, entities, entity_staff, locations, catalog_items, qr_checkpoints, qr_sessions, user_entity_memberships, orders, order_items, points_ledger (solo inserción), reviews, marketplace_listings, video_jobs, support_tickets, audit_logs, system_settings. Vista `points_balances`.
- RPC clave: `search_nearby_products`, `verify_qr_and_distance` (GPS solo en la consulta; se guarda `location_verified`), `xy_qr_create` (token en claro una sola vez, URL `/x/?q=`), `xy_create_order`, `confirm_order_and_distribute_points`, `xy_confirm_handoff`, `xy_boost`, `xy_entity_review`, P2P (`xy_create_p2p_order`, `xy_p2p_mark_paid`, `xy_p2p_release`), `xy_queue_video`.
- Check-in de membresías (16.12): `xy_checkin(token, lat, lng)` valida QR activo + plan vigente (PASS con fecha o CLASS_PACK con sesiones) + GPS ≤ 50 m (`geo_rules.checkin_max_m`, si no `in_store_max_m`); registra `entity_visits` (sin escritura directa) y `audit_logs` CHECKIN/CHECKIN_FAR/CHECKIN_NO_PLAN; una entrada cada 3 h; descuenta 1 sesión en paquetes.
- Auto-compra bloqueada (staff del negocio no puede ser comprador). Ledger inmutable salvo liberar pendientes con `xy.engine`.

## Frontend `web/public/x/` (sin frameworks, ES modules)
- `index.html` (shell), `app.css` (diseño: <1024 px pestañas abajo; ≥1024 barra lateral), `manifest.webmanifest`, `sw.js` (scope /x/).
- `js/core.js`: estado `S`, ayudantes (`money` con símbolo local, `hora` am/pm), íconos `I`, `rpc()`/`tabla()` → si falta el SQL 76 caen a demo y muestran aviso. `cargarCuenta()` usa la sesión `xyro-mi-auth` (misma cuenta que Mi Xyro).
- `js/demo.js`: datos de ejemplo (`?demo=1`).
- `js/app.js`: rutas hash, selector de modo (`MODOS`/`puedeModo`), acceso (correo o Google), `?q=token` → `#/escanear`.
- Vistas `js/v/`: `usuario.js` (explorar, market, billetera con «Mis membresías activas» estilo Wallet: días restantes, Check-in → `#/escanear?c=<id>`, Renovar plan → WhatsApp del negocio o su perfil en Mi Xyro; perfil), `escanear.js` (BarcodeDetector o jsQR → GPS → verify), `control.js` (c-inicio, c-pedidos con Realtime, c-qr, c-boost, c-catalogo), `panel.js` (p-inicio, p-negocios, p-soporte).
- «Muy pronto» (no inventar funciones): publicar en Marketplace, pedido desde la carta tras escanear, catálogo, Boost con dinero, tickets Xyro.
- No enlazado para clientes; `robots.txt` → `Disallow: /x/`; meta noindex.
- Pendiente Sprint 3: carta y pedido tras QR, ruleta, Boost pagado. Sprint 4: P2P completo, bóveda digital, cola de Edits, webhooks de Bots.
