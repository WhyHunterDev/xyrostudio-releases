// xyrostudio.net: sirve la web estática (public/) y, solo en /api/*, la IA del soporte (/api/ia) y de Xyro Bots (/api/bot).
// La clave de Anthropic vive como secreto ANTHROPIC_API_KEY en Cloudflare; nunca llega al navegador.
import Anthropic from "@anthropic-ai/sdk";

const ORIGENES = ["https://xyrostudio.net", "https://www.xyrostudio.net", "http://localhost:8765"];
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const corta = (t, n) => String(t ?? "").slice(0, n);

const SOPORTE_SYS = `Eres el Asistente Xyro, el soporte de Xyro Apps: un sistema para gimnasios y negocios en Perú (socios, membresías, cobros, asistencia con QR, caja, reportes, cafetín, rutinas, equipo y web del negocio). Quien te escribe trabaja en un negocio cliente (dueño, recepción, supervisor, cafetín, entrenador o nutricionista) y no es técnico.

Cómo respondes:
- En español sencillo de Perú, tuteando, en 1 a 4 frases cortas. Con pasos concretos: dónde tocar y qué elegir. Sin tecnicismos.
- Usa solo lo que dicen los TEMAS de abajo. Si no está ahí, no inventes pantallas ni botones: di que lo vea el equipo de soporte.
- En «accion» pon el número del tema cuya pantalla resuelve la duda (la app la abrirá con «Hazlo por mí»), o -1 si ninguno encaja.
- En «ticket» pide soporte humano cuando haga falta: "urgente" si hay robo, daño, información perdida o no pueden trabajar; "ventas" si cobros, caja o ventas fallan; "cambio" si piden algo que el sistema no hace o una modificación; "pago" si es sobre su plan o pagos a XyroStudio; "duda" si no sabes la respuesta. Si lo resolviste, "no".
- Nunca pidas contraseñas ni datos de tarjetas. No hables de precios de XyroStudio: eso lo ve soporte. Si piden algo ajeno al sistema, di amablemente que solo ayudas con Xyro Apps.`;

const TICKET_SYS = `Ayudas al equipo de XyroStudio a atender tickets de soporte de Xyro Apps (sistema para gimnasios y negocios en Perú). Recibes el ticket con sus mensajes, el contexto técnico del equipo del cliente (versión, pantalla, navegador, rol) y los errores registrados.
- «resumen»: 1 a 3 frases con qué pasa y qué pide el cliente.
- «causa_probable»: la causa técnica más probable según los errores y el contexto; si no hay pistas, dilo.
- «borrador_respuesta»: respuesta lista para enviar al cliente, en español sencillo de Perú, tuteando, amable y corta, con pasos concretos. No prometas fechas ni cambios que no consten. Firma «Equipo XyroStudio».
- «prioridad_sugerida»: "urgente" solo si no pueden trabajar, perdieron información o hay riesgo de seguridad; si no, "normal".`;

const SOPORTE_SCHEMA = {
  type: "object", additionalProperties: false, required: ["respuesta", "accion", "ticket"],
  properties: {
    respuesta: { type: "string" },
    accion: { type: "integer" },
    ticket: { type: "string", enum: ["no", "urgente", "ventas", "cambio", "pago", "duda"] },
  },
};
const TICKET_SCHEMA = {
  type: "object", additionalProperties: false, required: ["resumen", "causa_probable", "borrador_respuesta", "prioridad_sugerida"],
  properties: {
    resumen: { type: "string" },
    causa_probable: { type: "string" },
    borrador_respuesta: { type: "string" },
    prioridad_sugerida: { type: "string", enum: ["normal", "urgente"] },
  },
};

// Cupo diario y permisos: lo decide Supabase con el token del usuario (SQL 33, xa_ia_cupo).
async function cupo(env, token, modo) {
  const r = await fetch(env.SB_URL + "/rest/v1/rpc/xa_ia_cupo", {
    method: "POST",
    headers: { apikey: env.SB_KEY, authorization: "Bearer " + token, "content-type": "application/json" },
    body: JSON.stringify({ p_modo: modo }),
  });
  if (r.status === 401 || r.status === 403) return { err: 401 };
  if (r.status === 404) return { err: 503, msg: "La IA aún no está activada." };
  if (!r.ok) return { err: 502 };
  return r.json();
}

async function ia(req, env) {
  // Chequeo simple (abrir en el navegador): dice si la clave está puesta, sin mostrarla.
  if (req.method === "GET") return json({ ia: env.ANTHROPIC_API_KEY ? "✅ Clave puesta: la IA está lista" : "❌ Falta el secreto ANTHROPIC_API_KEY en Cloudflare", modelo: env.IA_MODELO });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const o = req.headers.get("origin");
  if (o && !ORIGENES.includes(o)) return json({ error: "Origen no permitido" }, 403);
  if (!env.ANTHROPIC_API_KEY) return json({ error: "La IA aún no está activada.", off: 1 }, 503);
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || token.length > 4000) return json({ error: "Inicia sesión" }, 401);
  const raw = await req.text();
  if (raw.length > 40000) return json({ error: "Mensaje muy largo" }, 413);
  let b;
  try { b = JSON.parse(raw); } catch { return json({ error: "Solicitud inválida" }, 400); }
  const modo = b.modo === "ticket" ? "ticket" : "soporte";

  const c = await cupo(env, token, modo);
  if (c.err === 401) return json({ error: "Inicia sesión" }, 401);
  if (c.err) return json({ error: c.msg || "No se pudo revisar tu cupo", off: c.err === 503 ? 1 : 0 }, c.err);
  if (!c.ok) return json({ error: c.motivo || "Llegaste al límite de preguntas de hoy", usados: c.usados, limite: c.limite }, c.motivo ? 403 : 429);

  let system, user, schema, effort, max;
  if (modo === "soporte") {
    const temas = (Array.isArray(b.temas) ? b.temas : []).slice(0, 80).map((t, i) => `${i}. ${corta(t?.t, 80)}: ${corta(t?.r, 400)}`).join("\n");
    const hist = (Array.isArray(b.historial) ? b.historial : []).slice(-6).map(h => "- " + corta(h, 300)).join("\n");
    system = [{ type: "text", text: SOPORTE_SYS + "\n\nTEMAS:\n" + temas, cache_control: { type: "ephemeral" } }];
    user = `Rol de quien pregunta: ${corta(c.rol, 20)}.${hist ? "\nLo que preguntó antes:\n" + hist : ""}\nPregunta: ${corta(b.pregunta, 500)}`;
    schema = SOPORTE_SCHEMA; effort = "low"; max = 2000;
  } else {
    system = TICKET_SYS;
    user = "Ticket:\n" + corta(JSON.stringify(b.ticket || {}), 30000);
    schema = TICKET_SCHEMA; effort = "medium"; max = 6000;
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2 });
  const modelo = env.IA_MODELO || "claude-opus-5-5";
  const params = {
    model: modelo, max_tokens: max, system,
    messages: [{ role: "user", content: user }],
    output_config: { effort, format: { type: "json_schema", schema } },
  };
  try {
    const r = /opus|sonnet|fable/.test(modelo)
      ? await client.beta.messages.create({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" })
      : await client.messages.create(params);
    if (r.stop_reason === "refusal") return json({ error: "No puedo ayudar con eso. Escríbele al equipo de soporte." }, 422);
    if (r.stop_reason === "max_tokens") return json({ error: "La respuesta salió incompleta. Intenta de nuevo." }, 502);
    const txt = r.content.filter(x => x.type === "text").map(x => x.text).join("");
    return json({ ...JSON.parse(txt), usados: c.usados, limite: c.limite });
  } catch (e) {
    console.log("ia error", e?.status, e?.message);
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return json({ error: "La IA no está disponible ahora.", off: 1 }, 503);
    if (e instanceof Anthropic.RateLimitError) return json({ error: "Hay muchas preguntas a la vez. Intenta en un minuto." }, 429);
    if (e instanceof Anthropic.APIConnectionError) return json({ error: "No hubo conexión con la IA. Intenta de nuevo." }, 502);
    if (e instanceof Anthropic.APIError && /credit|balance|billing/i.test(e.message || "")) return json({ error: "La IA no está disponible ahora.", off: 1 }, 503);
    return json({ error: "La IA no pudo responder. Intenta de nuevo." }, 502);
  }
}

// ===== Xyro Bots: asistente del negocio para sus clientes (chat de su web; luego WhatsApp) =====
// Público: los socios no inician sesión. Cupo y permiso en Supabase (SQL 34, xa_bot_cupo).
// Con sesión de Xyro Apps (botón «Probar» o demo en Integraciones) usa el cupo del soporte (xa_ia_cupo).
const BOT_SYS = `Atiendes el chat de un negocio en Perú (normalmente un gimnasio), como la persona más amable y canchera de recepción. Te escriben socios y gente interesada.
Cómo hablas:
- Como una persona real por WhatsApp: natural, cálida, tuteando, en español de Perú («claro que sí», «de una», «te cuento»). Frases cortas: 1 a 3, sin listas largas ni tono de folleto.
- Adapta tu tono al cliente: si escribe relajado, tú también; si está molesto, primero empatiza («uy, qué pena, déjame ayudarte»).
- Nada de frases de robot como «soy un asistente virtual», «como modelo de IA» o «¿en qué más puedo ayudarte?» al final de cada mensaje. Saluda solo al inicio de la conversación.
- Si encaja, termina con una pregunta que acerque al cliente a venir o inscribirse («¿para cuándo te animas a empezar?», «¿te paso la ubicación?»). Menciona las promos vigentes cuando vengan al caso.
- Emojis con moderación: a lo mucho 1 por mensaje.
- Recepción: cuando el cliente quiera hablar con una persona, inscribirse o pagar, pon «derivar» en true. Si el negocio tiene varias sedes, pon en «sede» el nombre exacto de la sede del cliente; si aún no sabes cuál, pregúntale con amabilidad de qué sede es (y deja «sede» vacío). Con una sola sede, pon su nombre. Dile que lo pasas con recepción de esa sede por WhatsApp.
- Interesados (si la FICHA dice «Captar interesados: sí»): cuando alguien muestre interés en inscribirse o venir, pídele con naturalidad su nombre y celular para que recepción le escriba (no los pidas de entrada ni más de una vez si no quiere). Cuando ya tengas nombre Y celular, llena «cliente» con ellos y con «interes» (qué busca, en pocas palabras: plan, horario, objetivo). Mientras no los tengas, deja «cliente» con textos vacíos. Nunca inventes datos.
- Clase de prueba (solo si la FICHA lo permite): ofrécela a quien duda o es nuevo. Acuerda día y hora dentro del horario indicado; pon «prueba_dia» en formato AAAA-MM-DD (usa la fecha de HOY para calcular «mañana», «el lunes»…) y «prueba_hora» como 7:00 pm. Confírmale el día, la hora y la sede, y dile que recepción le escribirá para confirmar.
- Si te preguntan directamente si eres un bot o una persona, sé honesto: eres el asistente automático del negocio y puedes pasarlos con recepción.
Qué dices:
- Usa SOLO los datos de la FICHA. Lo que está entre paréntesis, como «(distrito)», es un dato que el negocio aún no llenó: no lo digas ni lo inventes.
- Si no sabes algo, o piden algo que debe hacer una persona (inscribirse, pagar, congelar, reclamos, reservar), dilo con naturalidad y pon «derivar» en true para pasarlos con recepción.
- Precios en soles (S/). No prometas descuentos que no están en la ficha. Nunca pidas contraseñas, tarjetas ni datos sensibles.
- Si preguntan algo ajeno al negocio, responde con buena onda que en eso no puedes ayudar y vuelve al tema del negocio.`;
const BOT_SCHEMA = {
  type: "object", additionalProperties: false, required: ["respuesta", "derivar", "sede", "cliente"],
  properties: {
    respuesta: { type: "string" }, derivar: { type: "boolean" }, sede: { type: "string" },
    cliente: {   // datos del interesado: vacíos hasta que los dé
      type: "object", additionalProperties: false, required: ["nombre", "celular", "interes", "prueba_dia", "prueba_hora"],
      properties: { nombre: { type: "string" }, celular: { type: "string" }, interes: { type: "string" }, prueba_dia: { type: "string" }, prueba_hora: { type: "string" } },
    },
  },
};
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type, authorization", "access-control-max-age": "86400" };
const jc = (o, s = 200) => { const r = json(o, s); Object.entries(CORS).forEach(([k, v]) => r.headers.set(k, v)); return r; };
const FICHAS = new Map();   // caché por slug, 5 min (ahorra consultas)
const DIAS = { lun: "lunes", mar: "martes", mie: "miércoles", jue: "jueves", vie: "viernes", sab: "sábado", dom: "domingo" };

async function ficha(env, slug) {
  const f = FICHAS.get(slug);
  if (f && Date.now() - f.t < 300000) return f.v;
  const h = { apikey: env.SB_KEY, authorization: "Bearer " + env.SB_KEY };
  const s = await (await fetch(`${env.SB_URL}/rest/v1/sitios?slug=eq.${encodeURIComponent(slug)}&select=id,negocio`, { headers: h })).json().catch(() => []);
  if (!Array.isArray(s) || !s[0]) return null;
  const claves = "config,sedes,planes,pase,notaPlanes,clases,entrenadores,cafetin,app,bot";
  const rows = await (await fetch(`${env.SB_URL}/rest/v1/contenido?sitio_id=eq.${s[0].id}&clave=in.(${claves})&select=clave,valor`, { headers: h })).json().catch(() => []);
  const C = {}; (Array.isArray(rows) ? rows : []).forEach(r => { C[r.clave] = r.valor; });
  const app = C.app || {}, bot = C.bot || {}, nombre = app.nombre || s[0].negocio || slug;
  const L = [`Negocio: ${nombre}`];
  const sedes = Array.isArray(C.sedes) ? C.sedes : [];
  sedes.slice(0, 6).forEach(x => L.push(`Sede ${corta(x.nombre, 60)}${x.distrito ? " (" + corta(x.distrito, 60) + ")" : ""}${x.direccion ? ", " + corta(x.direccion, 120) : ""}. Horario: ${(x.horario || []).map(hh => (hh || []).join(" ")).join("; ") || "no indicado"}.${x.whatsapp ? " WhatsApp: " + corta(x.whatsapp, 20) : ""}`));
  const planes = Array.isArray(C.planes) ? C.planes : [];
  if (planes.length) L.push("Planes: " + planes.slice(0, 20).map(p => `${corta(p.nombre, 50)} S/${p.precio}${p.precioEvento ? ` (promo S/${p.precioEvento}${p.eventoTexto ? " " + corta(p.eventoTexto, 60) : ""}${p.eventoHasta ? " hasta " + p.eventoHasta : ""})` : ""}`).join("; "));
  if (C.pase && (C.pase.socio || C.pase.noSocio)) L.push(`Pase diario: S/${C.pase.noSocio ?? "-"} (socio S/${C.pase.socio ?? "-"})`);
  if (C.notaPlanes) L.push("Nota de planes: " + corta(C.notaPlanes, 300));
  const cfg = C.config || {};
  if (Array.isArray(cfg.incluye) && cfg.incluye.length) L.push("Incluye: " + cfg.incluye.slice(0, 12).map(i => corta(i.t, 40) + (i.d ? " (" + corta(i.d, 60) + ")" : "")).join("; "));
  const clases = (Array.isArray(C.clases) ? C.clases : []).filter(k => k.activo !== false).slice(0, 25);
  if (clases.length) L.push("Clases: " + clases.map(k => `${corta(k.nombre, 40)} ${(k.dias || []).map(d => DIAS[d] || d).join("/")} ${k.hora || ""}${k.nota ? " (" + corta(k.nota, 50) + ")" : ""}`).join("; "));
  const ent = Array.isArray(C.entrenadores) ? C.entrenadores : [];
  if (ent.length) L.push("Entrenadores: " + ent.slice(0, 10).map(e => `${corta(e.nombre, 40)} (${corta(e.especialidad, 50)})`).join("; "));
  if (C.cafetin && Array.isArray(C.cafetin.items) && C.cafetin.items.length) L.push("Cafetín: " + C.cafetin.items.slice(0, 20).map(i => `${corta(i.nombre, 40)} S/${i.precio}`).join("; "));
  if (cfg.redes) L.push("Redes: " + Object.entries(cfg.redes).filter(([, v]) => v).map(([k, v]) => k + " " + corta(v, 80)).join(", "));
  L.push("Captar interesados: " + (bot.captar === false ? "no" : "sí"));
  L.push(bot.prueba ? "Clase de prueba gratis: sí" + (bot.pruebaTxt ? " (" + corta(bot.pruebaTxt, 200) + ")" : " (dentro del horario de atención)") : "Clase de prueba gratis: no ofrecer");
  if (bot.extra) L.push("Promos, reglas e información extra del negocio (síguela y úsala):\n" + corta(bot.extra, 3000));
  const wa = String(bot.whatsapp || (sedes[0] && sedes[0].whatsapp) || "").replace(/\D/g, "");
  const sd = sedes.slice(0, 6).map(x => ({ n: corta(x.nombre, 60), wa: String(x.whatsapp || "").replace(/\D/g, "") || wa })).filter(x => x.n);
  const v = { nombre, texto: L.join("\n"), wa, sedes: sd, saludo: corta(bot.saludo, 300), xyros: cfg.xyros || [] };
  FICHAS.set(slug, { t: Date.now(), v });
  if (FICHAS.size > 300) FICHAS.delete(FICHAS.keys().next().value);
  return v;
}

async function ipHash(req) {
  const ip = req.headers.get("cf-connecting-ip") || "";
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("xyro-bot|" + ip));
  return [...new Uint8Array(d)].slice(0, 12).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function botApi(req, env) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return jc({ error: "Método no permitido" }, 405);
  if (!env.ANTHROPIC_API_KEY) return jc({ error: "El asistente no está disponible ahora.", off: 1 }, 503);
  const raw = await req.text();
  if (raw.length > 12000) return jc({ error: "Mensaje muy largo" }, 413);
  let b;
  try { b = JSON.parse(raw); } catch { return jc({ error: "Solicitud inválida" }, 400); }
  const slug = String(b.s || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
  const msg = corta(b.mensaje, 500).trim();
  if (!slug || !msg) return jc({ error: "Falta el mensaje" }, 400);
  const f = await ficha(env, slug);
  if (!f) return jc({ error: "Negocio no encontrado" }, 404);

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (token) {   // prueba desde Xyro Apps (dueño/equipo con sesión)
    if (token.length > 4000) return jc({ error: "Inicia sesión" }, 401);
    const c = await cupo(env, token, "soporte");
    if (c.err) return jc({ error: c.err === 401 ? "Inicia sesión" : "No se pudo revisar tu cupo" }, c.err === 401 ? 401 : 502);
    if (!c.ok) return jc({ error: c.motivo || "Llegaste al límite de pruebas de hoy" }, 429);
  } else {
    const r = await fetch(env.SB_URL + "/rest/v1/rpc/xa_bot_cupo", {
      method: "POST", headers: { apikey: env.SB_KEY, authorization: "Bearer " + env.SB_KEY, "content-type": "application/json" },
      body: JSON.stringify({ p_slug: slug, p_ip: await ipHash(req) }),
    });
    if (!r.ok) return jc({ error: "El asistente no está disponible ahora.", off: 1, wa: f.wa }, 503);
    const c = await r.json();
    if (!c.ok) return jc({ error: c.lim ? "Por hoy ya no puedo responder más. Escríbenos por WhatsApp 🙌" : (c.motivo || "El asistente no está activo"), off: c.lim ? 0 : 1, wa: f.wa }, c.lim ? 429 : 403);
  }

  try {
    const { o, sede } = await pensar(env, f, b.historial, msg, "web");
    const cl = o.cliente || {}, cel = String(cl.celular || "").replace(/\D/g, "");
    let guardado = false;
    if (String(cl.nombre || "").trim().length > 1 && cel.length >= 9) {
      if (token) guardado = true;   // prueba desde Xyro Apps: no se guarda
      else guardado = await guardarLead(env, slug, await ipHash(req), cl, cel, sede);
    }
    return jc({ respuesta: corta(o.respuesta, 1200), derivar: !!o.derivar, wa: f.wa, sede: sede ? sede.n : "", sedes: f.sedes, guardado });
  } catch (e) {
    console.log("bot error", e?.status, e?.message);
    if (e instanceof Anthropic.RateLimitError) return jc({ error: "Hay muchas consultas a la vez. Intenta en un minuto.", wa: f.wa }, 429);
    return jc({ error: "No pude responder ahora. Escríbenos por WhatsApp 🙌", wa: f.wa }, 502);
  }
}

// Cerebro común (web y WhatsApp): historial [{de:'u'|'b', t}] + mensaje → respuesta estructurada
async function pensar(env, f, historial, msg, canal) {
  const hist = (Array.isArray(historial) ? historial : []).slice(-8)
    .map(h => ({ role: h && h.de === "b" ? "assistant" : "user", content: corta(h && h.t, 500) || "…" }));
  while (hist.length && hist[0].role !== "user") hist.shift();
  const messages = [];
  hist.forEach(m => { const u = messages[messages.length - 1]; if (u && u.role === m.role) u.content += "\n" + m.content; else messages.push({ ...m }); });
  if (messages.length && messages[messages.length - 1].role === "user") messages[messages.length - 1].content += "\n" + msg;
  else messages.push({ role: "user", content: msg });
  const hoyL = new Date(Date.now() - 5 * 3600e3), DS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const extra = canal === "wa" ? " · Canal: WhatsApp del negocio (ya tienes su celular; no se lo pidas, solo su nombre si hace falta). Si derivas, dile que en un momento le escribe una persona de recepción por este mismo chat." : "";
  messages[messages.length - 1].content = `[HOY: ${DS[hoyL.getUTCDay()]} ${hoyL.toISOString().slice(0, 10)}${extra}]\n` + messages[messages.length - 1].content;
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2 });
  const r = await client.messages.create({
    model: env.BOT_MODELO || "claude-haiku-5-5", max_tokens: 1500,
    system: [{ type: "text", text: BOT_SYS }, { type: "text", text: "FICHA:\n" + f.texto, cache_control: { type: "ephemeral" } }],
    messages,
    output_config: { effort: "low", format: { type: "json_schema", schema: BOT_SCHEMA } },
  });
  let o;
  if (r.stop_reason === "refusal" || r.stop_reason === "max_tokens") o = { respuesta: "Mejor te ayuda una persona de recepción 🙌", derivar: true, sede: "", cliente: {} };
  else o = JSON.parse(r.content.filter(x => x.type === "text").map(x => x.text).join(""));
  const sede = f.sedes.find(x => x.n.toLowerCase() === String(o.sede || "").trim().toLowerCase()) || (f.sedes.length === 1 ? f.sedes[0] : null);
  return { o, sede };
}

async function guardarLead(env, slug, ip, cl, cel, sede) {
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(cl.prueba_dia || "") ? cl.prueba_dia : null;
  const rl = await fetch(env.SB_URL + "/rest/v1/rpc/xa_bot_lead", {
    method: "POST", headers: { apikey: env.SB_KEY, authorization: "Bearer " + env.SB_KEY, "content-type": "application/json" },
    body: JSON.stringify({ p_slug: slug, p_ip: ip, p_nombre: corta(cl.nombre, 80), p_celular: cel, p_sede: sede ? sede.n : "", p_interes: corta(cl.interes, 300), p_dia: dia, p_hora: corta(cl.prueba_hora, 20) }),
  }).catch(() => null);
  return !!(rl && rl.ok && (await rl.json().catch(() => ({}))).ok);
}

// ===== Xyro Bots en WhatsApp (Meta Cloud API). SQL 36. Secretos Cloudflare: WA_TOKEN, WA_APP_SECRET, WA_VERIFY, WA_CLAVE =====
const rpcAnon = (env, fn, body) => fetch(`${env.SB_URL}/rest/v1/rpc/${fn}`, {
  method: "POST", headers: { apikey: env.SB_KEY, authorization: "Bearer " + env.SB_KEY, "content-type": "application/json" }, body: JSON.stringify(body),
}).then(r => r.ok ? r.json() : null).catch(() => null);

async function firmaOk(env, raw, sig) {
  if (!env.WA_APP_SECRET || !sig || !sig.startsWith("sha256=")) return false;
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.WA_APP_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = [...new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(raw)))].map(b => b.toString(16).padStart(2, "0")).join("");
  const a = sig.slice(7);
  if (a.length !== mac.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ mac.charCodeAt(i);
  return d === 0;
}

async function waEnviar(env, phoneId, to, texto) {
  const r = await fetch(`https://graph.facebook.com/${env.WA_GRAPH || "v24.0"}/${phoneId}/messages`, {
    method: "POST", headers: { authorization: "Bearer " + env.WA_TOKEN, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body: corta(texto, 4000) } }),
  }).catch(() => null);
  const j = r ? await r.json().catch(() => ({})) : {};
  if (!r || !r.ok) console.log("wa enviar error", r && r.status, JSON.stringify(j.error || {}).slice(0, 300));
  return { ok: !!(r && r.ok), id: j.messages && j.messages[0] && j.messages[0].id, error: j.error };
}

async function waProcesar(env, phoneId, m, nombre) {
  const texto = m.type === "text" ? corta(m.text && m.text.body, 2000)
    : m.type === "button" ? corta(m.button && m.button.text, 500)
    : m.type === "interactive" ? corta((m.interactive.button_reply || m.interactive.list_reply || {}).title, 500)
    : `[${m.type}]`;
  const e = await rpcAnon(env, "xa_wa_entrante", { p_clave: env.WA_CLAVE, p_phone_id: phoneId, p_tel: m.from, p_nombre: corta(nombre, 80), p_texto: texto, p_wa_id: m.id });
  if (!e || !e.ok || e.humano) return "entrante:" + (e ? (e.motivo || (e.humano ? "humano" : "?")) : "null (WA_CLAVE o SQL 36)");   // número no vinculado, repetido o lo atiende recepción
  const responde = async (t, derivar) => { const s = await waEnviar(env, phoneId, m.from, t); if (!s.ok) return "enviar:" + JSON.stringify(s.error || {}).slice(0, 200); await rpcAnon(env, "xa_wa_saliente", { p_clave: env.WA_CLAVE, p_chat: e.chat, p_de: "bot", p_texto: t, p_wa_id: s.id || null, p_derivar: !!derivar }); return "ok"; };
  if (m.type !== "text" && m.type !== "button" && m.type !== "interactive") return responde("¡Gracias! Por ahora solo puedo leer mensajes de texto 🙌 Escríbeme tu consulta y te ayudo.", false);
  const f = await ficha(env, e.slug);
  if (!f || !env.ANTHROPIC_API_KEY) return "ficha:" + (f ? "sin ANTHROPIC_API_KEY" : "no encontrada " + e.slug);
  const c = await rpcAnon(env, "xa_bot_cupo", { p_slug: e.slug, p_ip: "wa" + m.from });
  if (!c || !c.ok) return "cupo:" + JSON.stringify(c) + " " + await responde("En un momento te responde una persona de recepción 🙌", true);
  try {
    const hist = (e.historial || []).map(x => ({ de: x.de === "cliente" ? "u" : "b", t: x.t }));
    const { o, sede } = await pensar(env, f, hist, texto, "wa");
    const cl = o.cliente || {};
    const nom = String(cl.nombre || nombre || "").trim();
    if (nom.length > 1 && (String(cl.interes || "").trim() || cl.prueba_dia)) await guardarLead(env, e.slug, "wa" + m.from, { ...cl, nombre: nom }, m.from, sede);
    return await responde(corta(o.respuesta, 1500), !!o.derivar);
  } catch (err) {
    console.log("wa bot error", err?.status, err?.message);
    return "ia:" + (err?.message || "") + " " + await responde("En un momento te responde una persona de recepción 🙌", true);
  }
}

async function waApi(req, env, ctx) {
  const u = new URL(req.url);
  if (req.method === "GET") {   // verificación del webhook (Meta)
    if (u.searchParams.get("hub.mode") === "subscribe" && env.WA_VERIFY && u.searchParams.get("hub.verify_token") === env.WA_VERIFY) return new Response(u.searchParams.get("hub.challenge") || "", { status: 200 });
    if (env.WA_VERIFY && u.searchParams.get("diag") === env.WA_VERIFY && u.searchParams.get("pid")) {   // diagnóstico: mensaje simulado de un número falso
      const r = await waProcesar(env, u.searchParams.get("pid"), { from: "51900000000", id: "diag-" + Date.now(), type: "text", text: { body: u.searchParams.get("t") || "hola, cuánto cuesta el mes?" } }, "Prueba XyroStudio");
      return json({ paso: r });
    }
    return json({ wa: env.WA_TOKEN && env.WA_APP_SECRET && env.WA_VERIFY && env.WA_CLAVE ? "✅ WhatsApp listo" : "⏳ Faltan secretos de WhatsApp en Cloudflare" });
  }
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const raw = await req.text();
  if (raw.length > 200000 || !(await firmaOk(env, raw, req.headers.get("x-hub-signature-256")))) return json({ error: "Firma inválida" }, 401);
  let b; try { b = JSON.parse(raw); } catch { return json({ ok: true }); }
  const tareas = [];
  for (const en of b.entry || []) for (const ch of en.changes || []) {
    const v = ch.value || {}, pid = v.metadata && v.metadata.phone_number_id;
    const nombres = {}; (v.contacts || []).forEach(c => { nombres[c.wa_id] = c.profile && c.profile.name; });
    for (const m of v.messages || []) if (pid) tareas.push(waProcesar(env, pid, m, nombres[m.from] || ""));
  }
  if (req.headers.get("x-xyro-diag") === "1") return json({ ok: true, pasos: await Promise.all(tareas).catch(e => ["error " + e?.message]) });   // diagnóstico (requiere firma válida)
  ctx.waitUntil(Promise.all(tareas).then(x => console.log("wa", JSON.stringify(x))).catch(e => console.log("wa", e?.message)));
  return json({ ok: true });   // Meta pide 200 rápido
}

// Recepción responde desde Xyro Apps (con su sesión)
async function waResponder(req, env) {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const o = req.headers.get("origin");
  if (o && !ORIGENES.includes(o)) return json({ error: "Origen no permitido" }, 403);
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || token.length > 4000) return json({ error: "Inicia sesión" }, 401);
  if (!env.WA_TOKEN) return json({ error: "WhatsApp aún no está conectado" }, 503);
  let b; try { b = JSON.parse(await req.text()); } catch { return json({ error: "Solicitud inválida" }, 400); }
  const texto = corta(b.texto, 4000).trim();
  if (!texto || !b.chat) return json({ error: "Escribe un mensaje" }, 400);
  const r = await fetch(env.SB_URL + "/rest/v1/rpc/xa_wa_responder", {
    method: "POST", headers: { apikey: env.SB_KEY, authorization: "Bearer " + token, "content-type": "application/json" },
    body: JSON.stringify({ p_chat: b.chat, p_texto: texto }),
  });
  if (r.status === 401) return json({ error: "Inicia sesión" }, 401);
  const d = r.ok ? await r.json() : null;
  if (!d || !d.ok) return json({ error: (d && d.motivo) || "No se pudo enviar" }, 403);
  const s = await waEnviar(env, d.phone_id, d.telefono, texto);
  if (!s.ok) return json({ error: "WhatsApp no aceptó el mensaje. Intenta de nuevo." }, 502);
  return json({ ok: true });
}

export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url);
    if (u.pathname === "/api/ia") return ia(req, env);
    if (u.pathname === "/api/bot") return botApi(req, env);
    if (u.pathname === "/api/wa") return waApi(req, env, ctx);
    if (u.pathname === "/api/wa/responder") return waResponder(req, env);
    if (u.pathname.startsWith("/api/")) return json({ error: "No existe" }, 404);
    return env.ASSETS.fetch(req);
  },
};
