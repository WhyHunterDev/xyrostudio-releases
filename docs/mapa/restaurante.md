# Restaurantes y cafeterías (rubro `restaurante`, SQL 56, web `/restaurante/`)

Creado 2026-11-15. Lee solo la parte que necesitas (`grep -n palabra docs/mapa/restaurante.md`). Agrega aquí lo nuevo de este módulo.

**Qué se usa y qué no (análisis):** SÍ = carta (`tienda` = «Carta», productos con foto/stock/combos), pedidos por QR de mesa (`/pedir/`, SQL 50/53), caja/turnos/cierres, reportes, equipo, Mi Xyro (perfil, promos, carta), Mi web. NO = socios, membresías, asistencia/kiosco, carnets, planes, seguimiento, rutinas/nutrición, días de prueba, metas, solicitudes, WhatsApp/ventas del bot (Bots no se vende aún). `RES_OFF` los oculta y `go()` los redirige.

**Xyro Apps (`app/dev/`):** `RUBROS.restaurante` (`resto:1`, `tienda:'Carta'`, `planes:[]`, carta peruana de demo, `roles` = supervisor «Encargado(a)», recepcion «Caja», cafetin «Mozo / Cocina»; `ROLES` es un Proxy sobre `ROLES0` que usa `R.roles`). `CTL()` es true en restaurantes (carta/caja/stock incluidos, no hace falta Control). Menú `navResto()` (Inicio, Pedidos, Cocina, Carta, Caja, App de clientes, Reportes + config) y `navMozo()` (rol cafetin: Pedidos, Cocina, Carta, Caja). Vistas: `inicioResto` (KPIs, mapa de mesas `mesasEstado`/`.rMes` → mesa libre abre `mpTomar(m)`, por cobrar abre `mpCobrar`; lo más pedido 7 días; horas fuertes), `cocinaV` (`#/cocina`, tickets `.ckT` del más antiguo, Empezar → preparando, ✅ Listo → servido, naranja ≥10 min, rojo ≥20, pantalla completa), `mpTomar(m)` (mozo: mesa o 0 = 🥡 para llevar, carta por categorías, nota, nombre → RPC `xa_mesa_mozo`; `NEED56`). `mesaN(m)` = «Mesa N» o «🥡 Para llevar»; en «Por cobrar» cada para llevar se cobra aparte (`mpCobrar(m,id)`). `PERMR` permisos por rol, `XYROS_R` integraciones (usa `xyrosDent`), `webResto` (Mi web = iframe de /restaurante/), `DIS_R`. Demo `/app/?demo=restaurante` (`demoResto` 30 días de ventas, `mpDemoResto` pedidos en curso) y `&rol=cafetin` (mozo). Versión 20261115-0953 (`--rubro restaurante`).

**SQL 56 (`XyroStudio/docs/56-xyro-restaurantes.sql`):** `xa_mesa_neg` con `rubro` y control=true si restaurante (tienda por defecto «Carta»); `xa_mesa_menu` devuelve `rubro`; `xa_carta(p_slug)` pública solo-ver (web y Mi Xyro); `xa_mesa_mozo(p_slug,p_mesa,p_items,p_nota,p_nombre)` (equipo, precios de la base, mesa 0 = para llevar, token `mozo-<uid>`); marca hecho el pendiente viejo de comidas y agrega «Probar ecosistema Restaurantes».

**/pedir/:** `RESTO()`/`lug()` (se paga en «caja», no «cafetín»); sin `m` = carta solo-ver con `xa_carta` (`M.solo`, sin botones, aviso «escanea el QR de tu mesa»); demo `?demo=1&r=resto&m=4` y `&carta=1`; fotos que fallan muestran el emoji.

**Mi Xyro:** `icoR(rubro)` 🍽️; página del negocio con «📖 Ver la carta» → `/pedir/?s=slug`; promos «muestra en caja»; demo «Nativa Café» es restaurante.

**Web base `/restaurante/?s=slug`** (tipo app, oscura y cálida, pestañas con indicador + dock en celular, rutas `#/ #/carta #/reservar #/local`): carta EN VIVO de `xa_carta`, estado abierto/cerrado por `app.mesas` horario, reserva de mesa en 3 pasos (día/hora → personas → nombre) a WhatsApp, cómo llegar con mapa, pagos y redes. Lee `app` (+`perfil` de SQL 52, `mesas`), `sedes`, `bot.whatsapp` y `resto` {hero, sub, pagos, fotos{hero,reserva,local}}; vista de venta `?n=&c=&l=`. Gestor: plantilla «Restaurante / Cafetería» (`PLANTILLAS`, `ECOS`, `sembrarWeb` → /restaurante/).

**Falta / ideas:** delivery con zonas, reservas guardadas en el panel (hoy van a WhatsApp), comandas impresas por área (cocina/bar), división de cuenta por persona, propinas, Bots que toma pedidos (cuando se venda), RA de platos (sigue oculta hasta tener escaneos reales).

## Cafeterías (2026-11-15)
- Variante del rubro restaurante: en la base se guarda `app.rubro='restaurante'` + `app.tipo='cafe'` (SQL 56 sirve igual). En Xyro Apps `rubDe(CFG)` elige `RUBROS.cafeteria` (resto:1, cafe:1, roles «Barra / Cocina», carta típica).
- Demo: `/app/?demo=cafeteria`, `/pedir/?demo=1&r=cafe&m=4&n=Nombre`, web `/restaurante/?r=cafe&n=Nombre` (color café #c8873a, «tu café de cada día»).
- Carta vacía → botón «📖 Cargar carta base» (inserta R.productos con en_mesa y activa stockNeg: la cafetería prepara al momento).
- Gestor: plantilla «☕ Cafetería» (rub restaurante, tipo cafe, stockNeg).
