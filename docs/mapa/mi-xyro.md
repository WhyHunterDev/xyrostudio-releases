# Mi Xyro (app de las personas, `web/public/mi/`)

Detalle movido desde CLAUDE.md (2026-11-15). Lee solo la parte que necesitas (`grep -n palabra docs/mapa/mi-xyro.md`). Agrega aquí lo nuevo de este módulo.

`web/public/mi/` ·

**Mi Xyro** (app PWA de las personas, fase 1 de «ecosistema negocios + usuarios»; fases 2 mapa, 3 puntos/sorteos, 4 tiendas). Login Google (`signInWithOAuth`, requiere activar Google en Supabase Auth) o correo+clave (`signUp`, recuperar con `resetPasswordForEmail` → `nuevaClave`), storageKey `xyro-mi-auth`. SQL 45+46: `xa_personas` (perfil: nombre, apodo, `usuario` @ único, `idn` = ID de cuenta de 8 dígitos FIJO, trigger `xa_yo_idn_fijo`; `xa_yo_asegura` crea el perfil al entrar), `xa_yo_socios` (persona ↔ `xa_clientes`), `xa_yo_guardados` (negocios guardados), `xa_yo_solicitudes` (el negocio pide conectar, la persona acepta). RPC persona: `xa_yo` (perfil, negocios, guardados, `avisos`), `xa_yo_editar`, `xa_yo_negocio` (público: promos `CFG.promosApp`, publicaciones vigentes, planes, sedes, clases, redes), `xa_yo_guardar`, `xa_yo_responder`, `xa_yo_vincular` (código de carnet + DNI/celular). RPC negocio (`xa_puede`): `xa_yo_buscar`, `xa_yo_pedir`, `xa_yo_estado`, `xa_yo_desconectar`, `xa_yo_seguidores`. QR del negocio = `/mi/?n=slug` (escáner en la app con `BarcodeDetector`/jsQR; `?c=CODIGO` = carnet). Pestañas: Inicio (avisos + membresía/QR o citas), Negocios (página del negocio `vNegocio`, «Ya estoy registrado» → ID), 📷, Perfil (ID, editar). Demo `?demo=1`/`?demo=consultorio`.

**Color fijo morado Xyro + fondo de partículas** (el color del negocio no cambia la app). Pestañas Inicio/Negocios/📷/Avisos/Perfil; Avisos = solicitudes, promos y

**chat de ayuda con XyroStudio (SQL 54)**: `SOP` = chat abierto, `SUB='ayuda'` (`vAyuda`, `sopChat`, `sopCuenta` contador, `sopRef` cada 5 s; RPC `xa_yo_ayuda(p_visto)`/`xa_yo_ayuda_msg`); `xa_yo_reportes.msgs` [{de yo|xyro|sis}]; solo soporte cierra (`xa_yo_g_chat_cerrar`) o se cierra sola a los 10 min sin respuesta tras el último mensaje de soporte (`xa_yo_ayuda_vencer`, `vence`); cerrado desaparece de la app (`SOPH`), el registro queda. Gestor «App Mi Xyro» → «💬 Chat de ayuda» (`MXC`, `mxChats`, `mxChatsPon`, `mxChatEnviar`, `data-mxcs/mxcc`, refresco 6 s). Errores automáticos siguen con `xa_yo_reportar` (`repErr`), uso `xa_yo_ping`. Chats de solicitudes se refrescan cada 6 s con el chat abierto (app cliente/negocio y panel `#pdch[data-id]`).

**Inicio** = novedades (`vInicioGen`, `feed`, `promosFeed`: respuestas, citas, vencimientos, lo de hoy, promos y publicaciones de sus negocios); la membresía va en Negocios → `SUB='mi'` (`vMi`).

**Solicitudes de planes (SQL 48, `xa_yo_pedidos`/`xa_yo_pedido_msgs`):** socio pide plan de entrenamiento o cita con nutrición (`atajosPlanes`/`pedEst`, `pedirPlan` → `xa_yo_plan_pedir`, chat `vPedido` `xa_yo_plan_msg`); en modo negocio pestaña «Solicitudes» (`nPedidos`, `nPed`, `nAgendar` → `xa_neg_pedido_agendar` solo recepción/admin, `nPlan` con plantillas `PLTE` → `xa_neg_pedido_plan` guarda en `xa_rutinas` con `enviado`); en el panel de PC lo mismo en `#/rutinas` (`pdaCard`, `pdaVer`, `pdaAgendar`, `editarPlan(c,tipo,base,ped)`, `PDA`, `NEED48`): web (PC) y app (celular) deben tener la misma función para el equipo; entrenador ve solo entreno, nutricionista solo citas agendadas suyas; demo `?demo=negocio&rol=recepcion|entrenador|nutricionista`.

**Modo negocio** (SQL 47): «Entrar a mi negocio» en Perfil o en la entrada; usa la sesión del panel (storageKey `xyro-apps-auth`, cliente `sb2`/`NSB`) o la propia; `pintaNeg` con Resumen (`xa_neg`: ingresos solo admin/supervisor/gestor, asistencias, activos, por vencer, citas), Socios (`xa_neg_buscar`, `nFicha`), 📷 marca ingreso (`xa_neg_checkin`, `nResultado`), Hoy/Agenda, Más (abrir panel completo, cambiar negocio `xa_cambiar_negocio`, gestor elige con `NSLUG`). Demo `?demo=negocio` / `?demo=negocio-dental`. Gestor «📲 App Mi Xyro» (`V.mixyro`, RPC `xa_yo_g_*`: resumen, personas, persona, reportes, responder, desconectar). Panel: vista `#/miapp` «📱 App de clientes» (`miApp`: QR + `cartelApp`, promos `editPromo`,

**perfil sin web (SQL 52)** `perfilCard`/`editPerfil`/`editUbic`/`editNovedad` guardan `CFG.perfil` {portada, descripcion, whatsapp, redes, sedes[{horario}], novedades, planes} y `xa_yo_negocio` lo usa primero y completa con la web (planes de `xa_planes` si no hay web), seguidores `pintaSeg`/`segConectar`, `nuevoCli(null,pre)` conecta al crear) y botón «📱 Conectar a su app» en la ficha (`conectarApp`, `yoRpc`).

**2026-11-17 SIN DESCARGAS (decisión usuario):** Mi Xyro solo web hasta pagar Play/App Store. APK quitado de `web/public/descargas/` (copia en project-files XyroStudio/apk); `/descargar/` redirige a `/mi/`; `instalar()` ya no ofrece APK (solo «Agregar a inicio» PWA). Webs/panel dicen «Regístrate/Abrir Mi Xyro», nunca «descarga la app». Para volver: restaurar desde git.

**Instalar / descargar (2026-11-15, histórico):** APK TWA `net.xyrostudio.mi` en `web/public/descargas/MiXyro.apk` (llave privada en project-files XyroStudio/docs/apk; `/.well-known/assetlinks.json` con mi + gestor). Página `/descargar/` (Android APK, iPhone pasos Safari, PC QR). En Mi Xyro: `bannerApp` (aviso arriba si no es app; ✕ lo oculta 3 días `mi-nob`), `instalar()` en Android ofrece el APK; `esApp` detecta TWA por `android-app:` referrer (`mi-twa`). Panel: «📲 Invitar a la app» (ex «Enviar carnets»: `enviarCarnet` ahora manda `invitaMsg` con `appLinkC` = /mi/?c=CODIGO por WhatsApp, sin imagen).

## Fundadores (2026-11-15, SQL 57)
- Primeras 50 cuentas de Mi Xyro: `xa_personas.fundador` (número fijo, se da en `xa_yo_perfil` con candado). Insignia «★ Fundador #007» (inicio, perfil, carnet), carnet dorado (`body.fund`), bienvenida una vez (`fundBienvenida`). @ de 3-4 letras solo fundadores (`usuario_corto`). Cupos en `xa_fund_max()`.
- QR propio (`qrSVG`, nivel H, módulos redondeados, ojos rx 1.2, X al centro; probado con jsQR 36/36). Fundador = ojos/X dorados oscuros. Ojo: puntos redondos o dorado claro NO se leen bien.
- Foto de perfil: `subirFoto` (400 px webp) a medios/mi/<uid>/ (política en SQL 57); se guarda con p_foto de xa_yo_editar.
- Fundador en toda la app (`body.fund`): botones, botón escanear, pestaña activa, aro del avatar, nombre, ID y partículas dorados.
- Inicio premium (2026-11-15): Xyro Card por nivel (`nivel(per)`: f=fundador oro, p=`per.plus` Xyro+ titanio, n=normal morado), resumen del plan, beneficios por nivel y teaser «Xyro+ · Muy pronto». 3 tipos de cuenta: fundador, normal, Xyro+ (pago, aún sin cobrar).
- Gestor: «⭐ Dar fundador» (siguiente número aunque estén llenos) / «🚫 Quitar fundador» (sanción, fund_bloq: no lo vuelve a recibir) → xa_yo_g_fund (SQL 58).

## 2026-11-16 · Arreglo QR de mesa desde el escáner
- Al escanear un QR /pedir/ con el escáner de Mi Xyro, cerrar la cámara hacía `history.go(-1)` (botón atrás) y cancelaba la ida al pedido. Ahora `HN.ir` guarda el destino y el observer navega con `location.assign` en vez de volver atrás.
- Horas en am/pm: `h12()` y `tpAmPm()` (cambia todo input type=time por hora/minutos/am-pm; el input queda oculto con HH:MM). Igual en Xyro Apps; /pedir/, /restaurante/ y /consultorio/ muestran h12.
- 2026-11-16: «Ver su web» en Mi Xyro abre FUERA de la app vía https://whyhunterdev.github.io/ir/?u= (otro dominio → navegador); dentro del APK un enlace a xyrostudio.net se quedaba en la app. /pedir/ muestra «‹ Mi Xyro» si viene de la app (de=mi).

## Pedir cita dental (SQL 64)
- `citPedBox`, `pedirCita`, `libresMi`, `limaD`, `demoCitaInfo`; pedidos tipo 'cita' (feed, chat, vPedido). Modo negocio: `nCitaPed` confirma/rechaza. `sellosPinta(slug, sel)` con toast «¡Ganaste un sello!».
- 2026-11-16: «Cancelar solicitud» en rojo con motivo opcional (se envía al chat antes de cancelar); en cita ya agendada solo «✓ Listo, cerrar». `profNom`/`profsDe`: nombre del profesional desde contenido 'app' público (la cita guarda el código). Modo negocio dental: al escanear el QR del paciente, la ficha muestra «Cita de hoy». Webs con `&m=slug` (vista previa del panel) para que el QR abra el negocio.

## Eliminar cuenta y privacidad (2026-11-16, SQL 68)
- Perfil → pie «Eliminar mi cuenta» (`borrarCuenta`, escribe ELIMINAR) → RPC `xa_yo_borrar_cuenta` borra auth.users (cascada). Rechaza cuentas con `perfiles` (staff/dueños). Borra fotos `medios/mi/<id>/` antes.
- `/mi/?borrar=1` abre el diálogo tras entrar. Política de la app: `/mi/privacidad.html` (#eliminar = URL de borrado para Google Play).

- 2026-11-17: portada xyrostudio.net tiene ruta `#/entrar` (botón «Entrar» arriba + chip en Inicio): «Soy cliente» inicia/crea cuenta Mi Xyro (storageKey `xyro-mi-auth`, Google/correo, redirige a /mi/); «Soy negocio» entra a Xyro Apps (usuario@negocio, `xyro-apps-auth`, xa_login_espera/fallo) y va a /app/. Pase 3D con QR decorativo. Código al final de `web/public/index.html`.
