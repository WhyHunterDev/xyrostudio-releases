# Discord de Xyro (SQL 105, 2026-11-19)
- Worker `web/src/worker.js`: `/api/discord` (botones/formularios, firma Ed25519 con `verify_key` de `/applications/@me`), `/api/discord/estado` y `/api/discord/armar` (solo gestor: valida con `xy_g_discord`).
- Secreto Cloudflare: `DISCORD_BOT_TOKEN`. Habla con Supabase con `WA_CLAVE` (`xa_wa_ok`). Guild = el servidor donde está el bot. `armar` pone solo el Interactions Endpoint URL.
- Estructura: roles Equipo Xyro / Negocio Xyro / Xyro+ / Cuenta Xyro; categorías BIENVENIDA (bienvenida, reglas, anuncios, actualizaciones · solo lectura), PROMOS Y EVENTOS, COMUNIDAD (general, ideas, dudas, muestra-tu-negocio), SOPORTE (abrir-ticket con botones), TICKETS ABIERTOS (privada), EQUIPO XYRO (equipo, registro-tickets). Lo viejo se esconde en «📦 ARCHIVO» (lista en `system_settings.discord.archivo` para restaurar). Nada se borra.
- Tickets: botón → formulario → canal privado `🎫┃0007-usuario` (persona + Equipo) con ficha de la cuenta vinculada (`xy_discord_ficha_de`). «🔒 Cerrar» → conversación en .txt a registro-tickets y borra el canal. 1 abierto por persona, 5/día.
- Vincular: Mi Xyro Perfil → «💬 Comunidad Xyro en Discord» (`dcAbrir`) → código de 6 letras (10 min) → en Discord «🔗 Vincular mi cuenta Xyro» o `/vincular`. Da roles según cuenta (negocios, Xyro+, gestor).
- Gestor: vista «🎮 Discord» (pasos, botón Armar/Actualizar, tickets).
