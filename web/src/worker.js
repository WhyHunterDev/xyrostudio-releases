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
- Recepción: cuando el cliente quiera hablar con una persona, inscribirse o pagar, pon «derivar» en true (en Modo vendedor NO: la inscripción y el pago los llevas tú hasta recibir el comprobante y sus datos; deriva solo si pide una persona o algo que no puedes resolver). Si el negocio tiene varias sedes, pon en «sede» el nombre exacto de la sede del cliente; si aún no sabes cuál, pregúntale con amabilidad de qué sede es (y deja «sede» vacío). Con una sola sede, pon su nombre. Dile que lo pasas con recepción de esa sede (por WhatsApp solo si el canal es la web; si ya están en WhatsApp, que le escriben por este mismo chat).
- Dudas al inscribirse (que empiece otro día, congelar, horarios, contrato): respóndelas tú con la FICHA y los DOCUMENTOS y sigue con la venta; no derives por eso. Si quiere empezar otro día, dile que sí, que su membresía empieza ese día y que lo anotas al registrarlo. Si algo no está en la FICHA ni en los documentos, di que recepción se lo confirma al activar su acceso, sin cortar la venta.
- Interesados (si la FICHA dice «Captar interesados: sí»): cuando alguien muestre interés en inscribirse o venir, pídele con naturalidad su nombre y celular para que recepción le escriba (no los pidas de entrada ni más de una vez si no quiere). Cuando ya tengas nombre Y celular, llena «cliente» con ellos y con «interes» (qué busca, en pocas palabras: plan, horario, objetivo). Mientras no los tengas, deja «cliente» con textos vacíos. Nunca inventes datos.
- Día de prueba (solo si la FICHA lo permite): ofrécelo a quien duda o es nuevo. Si la FICHA trae «DÍAS DE PRUEBA DISPONIBLES», agenda SOLO en uno de esos días, en esa sede y con una hora dentro de su rango; si pide otro día u hora, dile con amabilidad qué días hay. Antes de agendar consigue su nombre, su objetivo (bajar de peso, ganar masa, salud…), si es su primera vez entrenando y la sede. Pon «prueba_dia» en AAAA-MM-DD (usa la fecha de HOY para calcular «mañana», «el lunes»…), «prueba_hora» como 7:00 pm, «objetivo» y «experiencia» («primera vez» o lo que ya entrenó). Confírmale día, hora y sede, y que traiga ropa cómoda y su DNI.
- MODO VENDEDOR (solo si la FICHA dice «Modo vendedor: sí»): vendes como la mejor recepcionista: un amigo buena onda que conversa, una pregunta a la vez, mensajes cortos, y siempre busca cerrar HOY.
  REGLAS DURAS DEL MODO VENDEDOR (mandan sobre todo lo demás):
  • NUNCA listes varios planes con sus precios. NUNCA menciones el pase diario salvo que lo pidan por nombre.
  • Si el primer mensaje es «precio», «info», «promos» o parecido, NO des ningún precio todavía: saluda y conecta («¡claro que sí tenemos promos! 😊 Comentame, ¿te queda cerca el gym?»).
  • Precios: solo después de saber su nombre y su objetivo, y de UN solo plan por mensaje (el que recomiendas o el que te pidió).
  • Máximo 2 o 3 frases por mensaje y UNA sola pregunta al final.
  • No repitas el plan objetivo: recomiéndalo con fuerza UNA vez y, como mucho, vuelve a proponerlo una segunda vez al cerrar. Revisa el historial: si ya lo nombraste, no lo menciones de nuevo salvo que el cliente pregunte por él. Al responder otras dudas (horarios, sedes, clases, máquinas…) contesta la duda sin meter el plan («Puedes venir de lunes a sábado…», no «Con el plan de 1 año puedes…»). Si el cliente eligió otro plan, respeta su elección y no insistas más. Repetirlo incomoda y suena a robot.
  EJEMPLO DE CONVERSACIÓN (este es el estilo exacto; adapta nombres, planes y precios a la FICHA):
  Cliente: precio
  Tú: ¡Buenas noches! Te saludamos de (negocio) 💪 ¡Claro que sí tenemos promos! Comentame, ¿te queda cerca el gym?
  Cliente: sí, estoy cerca
  Tú: ¡Perfecto! Tengo una promo especial para ti solo por estar cerquita jaja. ¿Te gustaría hacer un cambio en tu día a día para sentirte mejor física y mentalmente?
  Cliente: sí me gustaría
  Tú: ¡Genial! ¿Con quién tengo el gusto?
  Cliente: Francisco
  Tú: Genial Francisco 🙌 Contamos con membresías de 3 meses, 6 meses y 1 año. Si de verdad quieres un cambio, te sugiero el año: ahí ves cambios reales. ¿Le damos por el año?
  Cliente: mmm el de 3 meses cuánto está? es mi primera vez
  Tú: Te entiendo perfecto, aquí tenemos entrenadores que te acompañan en todo el proceso. El plan de 3 meses está en S/400. ¿Te apuntas para empezar el cambio?
  Cliente: no puede ser algo menos?
  Tú: Mira, por lo general nuestros precios son fijos, pero sinceramente me caes bien y sé que vas a entrenar con todo. ¿Qué te gustaría lograr, ganar masa muscular para el verano?
  Cliente: sí eso
  Tú: ¡Perfecto! Como empiezas con todo, solo por hoy te dejo el de 3 meses en S/350 para que ya seas parte de la familia. ¿Qué te parece?
  Cliente: y si fuera por 1 año?
  Tú: ¡Esa es la actitud! El año está en S/1000, pero por tomar la decisión hoy te lo dejo en S/700: ahorras un montón y te aseguras el gym todo el año. ¿Vamos con el año?
  Cliente: listo voy por el año
  Tú: ¡Excelente decisión, Francisco! Puedes pagar por Yape o Plin al (número). Envíame por aquí la captura del pago y tus nombres completos, DNI y fecha de nacimiento para crear tu acceso.
  Flujo (adáptalo a lo que diga el cliente, no lo recites):
  1) Saludo según la HORA (buenos días antes de 12, buenas tardes antes de 7 pm, buenas noches después) + «te saludamos de (negocio)». Si pregunta por promos: «¡claro que sí tenemos promos!» y pregunta algo para conectar, por ejemplo si le queda cerca el gym; si dice que sí: «perfecto, tengo una promo especial para ti solo por estar cerquita jaja».
  2) Despierta el deseo: «¿te gustaría hacer un cambio en tu día a día para sentirte mejor física y mentalmente?». Pide su nombre («¿con quién tengo el gusto?») y úsalo desde ahí. Descubre de a poco: si es su primera vez, su objetivo (masa muscular, bajar de peso…), cuándo quiere empezar, si tiene alguna lesión.
  3) Presenta las membresías largas (3, 6 meses y 1 año) y recomienda el «Plan objetivo» unido a su objetivo: «si de verdad quieres un cambio, te sugiero el año, ahí ves cambios reales. ¿Le damos por el año?».
  4) Si pide un plan más corto o es su primera vez: empatiza («te entiendo perfecto»), dale seguridad (entrenadores que lo acompañan en todo el proceso) y dale el precio NORMAL de ese plan con una pregunta de cierre («¿te animas a empezar el cambio?»).
  5) Si pide rebaja: «por lo general nuestros precios son fijos, pero sinceramente me caes bien y sé que vas a entrenar con todo». Conecta con su objetivo y su motivo (ej. «se viene el verano y uno quiere verse bien, ¿verdad?»). Luego ofrece «una súper promo solo por hoy» en ese plan: una rebaja PARCIAL (más o menos la mitad entre el precio normal y el mínimo, en número redondo), «para que ya seas parte de la familia (negocio)».
  6) Si se anima o pregunta por un plan más largo, celébralo («¡esa es la actitud!») y dale el plan largo con el mejor precio permitido (puede ser el mínimo) solo por decidir hoy, mostrando cuánto ahorra.
  7) Cierre: «excelente decisión, (nombre)», envía los medios de pago de la FICHA y pídele el comprobante del pago por aquí junto con sus nombres completos, DNI, fecha de nacimiento y celular. Dile que apenas recepción verifique el pago le llega su código QR de acceso.
  Reglas de precio: NUNCA bajes del «mínimo» de la FICHA ni digas que existe un mínimo. NUNCA digas que una promo «terminó», «ya no está» o «había antes». No regales la rebaja de entrada: primero valor, luego rebaja parcial, y el mínimo solo para cerrar el plan largo. Las «Promos especiales» de la FICHA úsalas SOLO cuando se cumple su «Solo si» y siempre «solo por hoy»; son la única excepción al mínimo (pueden estar por debajo). Si no se cumple su condición, no las menciones. Si pide menos del mínimo, no lo aceptes: insiste con cariño en tu mejor precio y su objetivo; si insiste mucho, pon «derivar» en true. Ejemplo de tono: «Bien, mira, por lo general nuestros precios son fijos, pero me caes bien y como empiezas la próxima semana con todo, hoy te dejo el de 3 meses en S/350 para que ya seas parte de la familia. ¿Qué te parece?».
  Deja «luego» siempre vacío. Sin Modo vendedor, da los precios directo.
- Documentos (contrato, reglamento): si la FICHA trae «DOCUMENTOS», guíate de lo que dicen para responder dudas sobre condiciones, normas, congelamientos, devoluciones, horarios, etc., citándolos con tus palabras. Si el cliente pide ver el contrato o el reglamento (por ejemplo antes de pagar), pon en «documento» el código exacto del documento (el del plan que conversan si hay varios contratos) y dile que se lo envías por aquí; si no, deja «documento» vacío. Nunca inventes cláusulas: si el documento no lo dice, o hay un reclamo, una excusa o un problema que no entiendes, dilo con amabilidad y pon «derivar» en true para que intervenga recepción.
- Fotos y videos: si la FICHA trae «FOTOS Y VIDEOS» y el cliente pide ver el gym, fotos, videos, las máquinas o una sede, pon en «media» los códigos (hasta 3, separados por coma) de la sede que le interesa o los generales, y dile que se los envías por aquí. Si no hay de lo que pide, dilo con naturalidad e invítalo a venir a conocerlo. Si no los pide, deja «media» vacío.
- Si te preguntan directamente si eres un bot o una persona, sé honesto: eres el asistente automático del negocio y puedes pasarlos con recepción.
Qué dices:
- Usa SOLO los datos de la FICHA. Lo que está entre paréntesis, como «(distrito)», es un dato que el negocio aún no llenó: no lo digas ni lo inventes.
- Si no sabes algo, o piden algo que debe hacer una persona (inscribirse o pagar si no estás en Modo vendedor, congelar, reclamos, reservar), dilo con naturalidad y pon «derivar» en true para pasarlos con recepción.
- Precios en soles (S/). No prometas descuentos que no están en la ficha. Nunca pidas contraseñas, tarjetas ni datos sensibles.
- Si preguntan algo ajeno al negocio, responde con buena onda que en eso no puedes ayudar y vuelve al tema del negocio.`;
const BOT_SCHEMA = {
  type: "object", additionalProperties: false, required: ["respuesta", "luego", "documento", "media", "derivar", "sede", "cliente"],
  properties: {
    respuesta: { type: "string" }, luego: { type: "string" }, documento: { type: "string" }, media: { type: "string" }, derivar: { type: "boolean" }, sede: { type: "string" },
    cliente: {   // datos del interesado: vacíos hasta que los dé
      type: "object", additionalProperties: false, required: ["nombre", "celular", "interes", "objetivo", "experiencia", "prueba_dia", "prueba_hora"],
      properties: { nombre: { type: "string" }, celular: { type: "string" }, interes: { type: "string" }, objetivo: { type: "string" }, experiencia: { type: "string" }, prueba_dia: { type: "string" }, prueba_hora: { type: "string" } },
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
  L.push(bot.prueba ? "Día de prueba gratis: sí" + (bot.pruebaTxt ? " (" + corta(bot.pruebaTxt, 200) + ")" : "") : "Día de prueba gratis: no ofrecer");
  const reglas = bot.prueba && Array.isArray(bot.pruebas) ? bot.pruebas.filter(r => r && Array.isArray(r.dias) && r.dias.length).slice(0, 12) : [];
  if (reglas.length) {
    const oc = env.WA_CLAVE ? await rpcAnon(env, "xa_pruebas_ocupadas", { p_clave: env.WA_CLAVE, p_slug: slug }) : null;
    const disp = pruebaDias(reglas, Array.isArray(oc) ? oc : [], 10);
    L.push("DÍAS DE PRUEBA DISPONIBLES (agenda solo aquí):" + (disp.length ? "" : " ninguno por ahora: no agendes, toma sus datos y dile que recepción le escribe."));
    disp.slice(0, 30).forEach(d => L.push(`- ${d.txt} (${d.dia})${d.sede ? " · Sede " + corta(d.sede, 50) : ""} · de ${d.desde} a ${d.hasta}${d.quedan != null ? " · quedan " + d.quedan : ""}`));
  }
  if (bot.extra) L.push("Promos, reglas e información extra del negocio (síguela y úsala):\n" + corta(bot.extra, 3000));
  let vdocs = [], vmed = [];
  const vt = env.WA_CLAVE ? await rpcAnon(env, "xa_bot_ventas_de", { p_clave: env.WA_CLAVE, p_slug: slug }) : null;   // SQL 38: privado (mínimos, promos especiales)
  if (vt && typeof vt === "object") {
    if (vt.modo === "vendedor") {
      L.push("Modo vendedor: sí");
      if (vt.meta) L.push("Plan objetivo: " + corta(vt.meta, 60));
      const mins = Object.entries(vt.minimos || {}).filter(([, v]) => +v > 0).slice(0, 20);
      if (mins.length) L.push("Mínimo autorizado por plan (SECRETO, nunca lo digas): " + mins.map(([k, v]) => `${corta(k, 50)} S/${+v}`).join("; "));
      if (vt.especiales) L.push("Promos especiales (solo en esos casos y si paga hoy):\n" + corta(vt.especiales, 1500));
    }
    const docs = (Array.isArray(vt.docs) ? vt.docs : []).filter(d => d && d.id && d.url).slice(0, 8);
    if (docs.length) {
      L.push("DOCUMENTOS (para enviar usa su código en «documento»):");
      docs.forEach(d => L.push(`[${d.id}] ${corta(d.n, 80)}${d.plan ? " (plan " + corta(d.plan, 50) + ")" : ""}${d.texto ? ":\n" + corta(d.texto, 6000) : ""}`));
      vdocs = docs.map(d => ({ id: String(d.id), n: corta(d.n, 80), url: String(d.url) }));
    }
    const med = (Array.isArray(vt.medios) ? vt.medios : []).filter(d => d && d.id && d.url).slice(0, 30);
    if (med.length) {
      L.push("FOTOS Y VIDEOS (para enviar usa su código en «media»):");
      med.forEach(d => L.push(`[${d.id}] ${d.tipo === "video" ? "video" : "foto"}: ${corta(d.n, 80)}${d.sede ? " (sede " + corta(d.sede, 50) + ")" : ""}`));
      vmed = med.map(d => ({ id: String(d.id), tipo: d.tipo === "video" ? "video" : "image", n: corta(d.n, 80), url: String(d.url) }));
    }
    const pg = [vt.yape && "Yape " + corta(vt.yape, 20), vt.plin && "Plin " + corta(vt.plin, 20), vt.titular && "a nombre de " + corta(vt.titular, 80), vt.cuenta && "Transferencia: " + corta(vt.cuenta, 300)].filter(Boolean);
    if (pg.length) L.push("Medios de pago: " + pg.join(" · "));
  }
  const wa = String(bot.whatsapp || (sedes[0] && sedes[0].whatsapp) || "").replace(/\D/g, "");
  const sd = sedes.slice(0, 6).map(x => ({ n: corta(x.nombre, 60), wa: String(x.whatsapp || "").replace(/\D/g, "") || wa })).filter(x => x.n);
  const v = { nombre, texto: L.join("\n"), wa, sedes: sd, pruebas: reglas, saludo: corta(bot.saludo, 300), xyros: cfg.xyros || [], docs: vdocs, medios: vmed };
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
      else guardado = await guardarLead(env, slug, await ipHash(req), cl, cel, sede, f, "bot-web");
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
  const hist = (Array.isArray(historial) ? historial : []).slice(-16)
    .map(h => ({ role: h && h.de === "b" ? "assistant" : "user", content: corta(h && h.t, 500) || "…" }));
  while (hist.length && hist[0].role !== "user") hist.shift();
  const messages = [];
  hist.forEach(m => { const u = messages[messages.length - 1]; if (u && u.role === m.role) u.content += "\n" + m.content; else messages.push({ ...m }); });
  if (messages.length && messages[messages.length - 1].role === "user") messages[messages.length - 1].content += "\n" + msg;
  else messages.push({ role: "user", content: msg });
  const hoyL = new Date(Date.now() - 5 * 3600e3), DS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const extra = canal === "wa" ? " · Canal: WhatsApp del negocio (ya tienes su celular; no se lo pidas, solo su nombre si hace falta). Si derivas, dile que en un momento le escribe una persona de recepción por este mismo chat." : canal === "wa-id" ? " · Canal: WhatsApp del negocio. El cliente usa nombre de usuario y no vemos su número: si quiere inscribirse o agendar, pídele su nombre y celular con naturalidad. Si derivas, dile que en un momento le escribe una persona de recepción por este mismo chat." : "";
  messages[messages.length - 1].content = `[HOY: ${DS[hoyL.getUTCDay()]} ${hoyL.toISOString().slice(0, 10)}, HORA ${hoyL.toISOString().slice(11, 16)}${extra}]\n` + messages[messages.length - 1].content;
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2 });
  const r = await client.messages.create({
    model: env.BOT_MODELO || "claude-haiku-5-5", max_tokens: 1500,
    system: [{ type: "text", text: BOT_SYS }, { type: "text", text: "FICHA:\n" + f.texto, cache_control: { type: "ephemeral" } }],
    messages,
    output_config: { effort: /Modo vendedor: sí/.test(f.texto) ? "medium" : "low", format: { type: "json_schema", schema: BOT_SCHEMA } },
  });
  let o;
  if (r.stop_reason === "refusal" || r.stop_reason === "max_tokens") o = { respuesta: "Mejor te ayuda una persona de recepción 🙌", derivar: true, sede: "", cliente: {} };
  else o = JSON.parse(r.content.filter(x => x.type === "text").map(x => x.text).join(""));
  if (o.luego && canal === "web") { o.respuesta += "\n\n" + o.luego; o.luego = ""; }
  const doc = o.documento && (f.docs || []).find(d => d.id === String(o.documento).trim());
  o.doc = doc || null;
  o.med = String(o.media || "").split(",").map(x => x.trim()).filter(Boolean).slice(0, 3).map(id => (f.medios || []).find(d => d.id === id)).filter(Boolean);
  if (o.med.length && canal === "web") o.respuesta += "\n\n" + o.med.map(d => (d.tipo === "video" ? "🎬 " : "📸 ") + d.n + ": " + d.url).join("\n");
  if (doc && canal === "web") o.respuesta += `\n\n📄 ${doc.n}: ${doc.url}`;
  const sede = f.sedes.find(x => x.n.toLowerCase() === String(o.sede || "").trim().toLowerCase()) || (f.sedes.length === 1 ? f.sedes[0] : null);
  return { o, sede };
}

// Días de prueba: reglas del admin {sede, dias:[0-6 (0=domingo)], desde:"07:00", hasta:"21:00", cupo}
const DSEM = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const minDe = h => { const m = String(h || "").toLowerCase().match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m|p\.?\s*m)?/); if (!m) return null; let x = +m[1] % 24; if (m[3] && m[3][0] === "p" && x < 12) x += 12; if (m[3] && m[3][0] === "a" && x === 12) x = 0; return x * 60 + (+m[2] || 0); };
const h12 = h => { const n = minDe(h); if (n == null) return h; const x = Math.floor(n / 60), mm = String(n % 60).padStart(2, "0"); return `${x % 12 || 12}:${mm} ${x < 12 ? "am" : "pm"}`; };
function pruebaDias(reglas, oc, n) {
  const hoy = new Date(Date.now() - 18e6), out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(hoy.getTime() + i * 864e5), iso = d.toISOString().slice(0, 10), wd = d.getUTCDay();
    for (const r of reglas) {
      if (!r.dias.map(Number).includes(wd)) continue;
      if (i === 0 && minDe(r.hasta) != null && minDe(r.hasta) <= d.getUTCHours() * 60 + d.getUTCMinutes() + 60) continue;   // hoy ya casi cerró
      const usado = oc.filter(o => o.dia === iso && String(o.sede || "") === String(r.sede || "")).reduce((a, o) => a + (+o.n || 0), 0);
      const cupo = +r.cupo || 0;
      if (cupo && usado >= cupo) continue;
      out.push({ dia: iso, txt: `${DSEM[wd]} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`, sede: r.sede || "", desde: h12(r.desde || "06:00"), hasta: h12(r.hasta || "21:00"), quedan: cupo ? cupo - usado : null, r });
    }
  }
  return out;
}
function pruebaRegla(reglas, dia, hora, sede) {   // regla que permite ese día/hora/sede, o null
  if (!reglas || !reglas.length) return { cupo: 0 };
  const wd = new Date(dia + "T12:00:00Z").getUTCDay(), m = minDe(hora);
  return reglas.find(r => r.dias.map(Number).includes(wd) && (!r.sede || !sede || String(r.sede).toLowerCase() === String(sede).toLowerCase())
    && (m == null || ((minDe(r.desde) ?? 0) <= m && m <= (minDe(r.hasta) ?? 1439)))) || null;
}
async function guardarLead(env, slug, ip, cl, cel, sede, f, origen) {
  let dia = /^\d{4}-\d{2}-\d{2}$/.test(cl.prueba_dia || "") ? cl.prueba_dia : null, cupo = 0;
  if (dia) { const r = pruebaRegla(f && f.pruebas, dia, cl.prueba_hora, sede ? sede.n : ""); if (!r) dia = null; else cupo = +r.cupo || 0; }
  const rl = await fetch(env.SB_URL + "/rest/v1/rpc/xa_bot_lead", {
    method: "POST", headers: { apikey: env.SB_KEY, authorization: "Bearer " + env.SB_KEY, "content-type": "application/json" },
    body: JSON.stringify({ p_slug: slug, p_ip: ip, p_nombre: corta(cl.nombre, 80), p_celular: cel, p_sede: sede ? sede.n : "", p_interes: corta(cl.interes, 300), p_dia: dia, p_hora: dia ? corta(cl.prueba_hora, 20) : "",
      p_objetivo: corta(cl.objetivo, 200), p_experiencia: corta(cl.experiencia, 100), p_origen: origen || "bot-web", p_cupo: cupo }),
  }).catch(() => null);
  if (rl && rl.status === 404) return guardarLead0(env, slug, ip, cl, cel, sede, dia);   // sin SQL 41
  return !!(rl && rl.ok && (await rl.json().catch(() => ({}))).ok);
}
async function guardarLead0(env, slug, ip, cl, cel, sede, dia) {
  const rl = await fetch(env.SB_URL + "/rest/v1/rpc/xa_bot_lead", {
    method: "POST", headers: { apikey: env.SB_KEY, authorization: "Bearer " + env.SB_KEY, "content-type": "application/json" },
    body: JSON.stringify({ p_slug: slug, p_ip: ip, p_nombre: corta(cl.nombre, 80), p_celular: cel, p_sede: sede ? sede.n : "", p_interes: corta([cl.interes, cl.objetivo].filter(Boolean).join(" · "), 300), p_dia: dia, p_hora: corta(cl.prueba_hora, 20) }),
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

async function waEnviar(env, phoneId, to, texto, img, doc) {
  const r1 = await waEnviar1(env, phoneId, to, texto, img, doc);
  // Número de prueba de Meta: solo acepta números de la lista permitida (no IDs de usuario). WA_PRUEBA_TEL = tu celular para probar.
  if (!r1.ok && r1.error && r1.error.code === 131030 && env.WA_PRUEBA_TEL && !/^\d+$/.test(to)) return waEnviar1(env, phoneId, String(env.WA_PRUEBA_TEL).replace(/\D/g, ""), texto, img, doc);
  return r1;
}
async function waEnviar1(env, phoneId, to, texto, img, doc) {
  const r = await fetch(`https://graph.facebook.com/${env.WA_GRAPH || "v24.0"}/${phoneId}/messages`, {
    method: "POST", headers: { authorization: "Bearer " + env.WA_TOKEN, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...(/^\d+$/.test(to) ? { to } : { recipient: to }), ...(doc ? { type: doc.type || "document", [doc.type || "document"]: { link: doc.link, ...(doc.filename ? { filename: doc.filename } : {}), caption: corta(texto, 500) } } : img ? { type: "image", image: { link: img, caption: corta(texto, 1000) } } : { type: "text", text: { preview_url: false, body: corta(texto, 4000) } }) }),
  }).catch(() => null);
  const j = r ? await r.json().catch(() => ({})) : {};
  if (!r || !r.ok) console.log("wa enviar error", r && r.status, JSON.stringify(j.error || {}).slice(0, 300));
  return { ok: !!(r && r.ok), id: j.messages && j.messages[0] && j.messages[0].id, error: j.error };
}

async function waProcesar(env, phoneId, m, nombre, alt) {
  const texto = m.type === "text" ? corta(m.text && m.text.body, 2000)
    : m.type === "button" ? corta(m.button && m.button.text, 500)
    : m.type === "interactive" ? corta((m.interactive.button_reply || m.interactive.list_reply || {}).title, 500)
    : m.type === "image" && m.image ? `[📷 imagen][img:${m.image.id}]` + (m.image.caption ? " " + corta(m.image.caption, 500) : "")
    : m.type === "document" && m.document ? `[📄 ${corta(m.document.filename || "documento", 60)}][img:${m.document.id}]`
    : `[${m.type}]`;
  m.from = m.from || m.from_user_id;   // usuarios con nombre de usuario de WhatsApp: llega su ID (p. ej. PE.123…) en vez del número
  if (!m.from) return "sin remitente";
  const clave = await rpcAnon(env, "xa_wa_clave_chat", { p_clave: env.WA_CLAVE, p_phone_id: phoneId, p_tel: m.from, p_alt: alt || null, p_nombre: corta(nombre, 80) });   // misma persona con número o con ID de usuario = un solo chat (SQL 43)
  const e = await rpcAnon(env, "xa_wa_entrante", { p_clave: env.WA_CLAVE, p_phone_id: phoneId, p_tel: typeof clave === "string" && clave ? clave : m.from, p_nombre: corta(nombre, 80), p_texto: texto, p_wa_id: m.id });
  if (e && e.ok && e.humano && (m.type === "image" || m.type === "document")) return waComprobante(env, e, m, nombre, async () => "humano");   // aunque atienda recepción, el pago va a «Ventas del bot» (sin responder: responde recepción)
  if (!e || !e.ok || e.humano) return "entrante:" + (e ? (e.motivo || (e.humano ? "humano" : "?")) : "null (WA_CLAVE o SQL 36)");   // número no vinculado, repetido o lo atiende recepción
  const responde = async (t, derivar) => { const s = await waEnviar(env, phoneId, m.from, t); if (!s.ok) return "enviar:" + JSON.stringify(s.error || {}).slice(0, 200); await rpcAnon(env, "xa_wa_saliente", { p_clave: env.WA_CLAVE, p_chat: e.chat, p_de: "bot", p_texto: t, p_wa_id: s.id || null, p_derivar: !!derivar }); return "ok"; };
  if (m.type === "image" || m.type === "document") return waComprobante(env, e, m, nombre, responde);
  if (m.type !== "text" && m.type !== "button" && m.type !== "interactive") return responde("¡Gracias! Por ahora solo puedo leer mensajes de texto 🙌 Escríbeme tu consulta y te ayudo.", false);
  const f = await ficha(env, e.slug);
  if (!f || !env.ANTHROPIC_API_KEY) return "ficha:" + (f ? "sin ANTHROPIC_API_KEY" : "no encontrada " + e.slug);
  const c = await rpcAnon(env, "xa_bot_cupo", { p_slug: e.slug, p_ip: "wa" + m.from });
  if (!c || !c.ok) return "cupo:" + JSON.stringify(c) + " " + await responde("En un momento te responde una persona de recepción 🙌", true);
  try {
    const hist = (e.historial || []).map(x => ({ de: x.de === "cliente" ? "u" : "b", t: x.t }));
    const { o, sede } = await pensar(env, f, hist, texto, /^\d+$/.test(m.from) ? "wa" : "wa-id");
    const cl = o.cliente || {};
    const nom = String(cl.nombre || nombre || "").trim();
    if (nom.length > 1 && (String(cl.interes || "").trim() || cl.prueba_dia)) await guardarLead(env, e.slug, "wa" + m.from, { ...cl, nombre: nom }, /^\d+$/.test(m.from) ? m.from : String(cl.celular || ""), sede, f, "bot-wa");
    const p1 = await responde(corta(o.respuesta, 1500), !!o.derivar && !o.luego);
    if (p1 === "ok") for (const d of o.med || []) { const sm = await waEnviar(env, phoneId, m.from, d.n, null, { type: d.tipo, link: d.url }); if (sm.ok) await rpcAnon(env, "xa_wa_saliente", { p_clave: env.WA_CLAVE, p_chat: e.chat, p_de: "bot", p_texto: (d.tipo === "video" ? "🎬 " : "📸 ") + d.n, p_wa_id: sm.id || null, p_derivar: false }); }
    if (o.doc && p1 === "ok") { const sd = await waEnviar(env, phoneId, m.from, o.doc.n, null, { link: o.doc.url, filename: o.doc.n.replace(/[^\w áéíóúñÁÉÍÓÚÑ.-]/g, "").slice(0, 60) + ".pdf" }); if (sd.ok) await rpcAnon(env, "xa_wa_saliente", { p_clave: env.WA_CLAVE, p_chat: e.chat, p_de: "bot", p_texto: "📄 " + o.doc.n, p_wa_id: sd.id || null, p_derivar: false }); }
    if (!o.luego || p1 !== "ok") return p1;
    await new Promise(r => setTimeout(r, 12000));   // «déjame consultarlo»: pausa corta y responde
    return await responde(corta(o.luego, 1500), !!o.derivar);
  } catch (err) {
    console.log("wa bot error", err?.status, err?.message);
    return "ia:" + (err?.message || "") + " " + await responde("En un momento te responde una persona de recepción 🙌", true);
  }
}

// ===== Comprobantes de pago por WhatsApp (SQL 39): el asistente lee la captura y la deja en «🤖 Ventas del bot» =====
async function waMedia(env, id) {   // descarga una imagen/documento de Meta (vence a los 30 días)
  const g = await fetch(`https://graph.facebook.com/${env.WA_GRAPH || "v24.0"}/${encodeURIComponent(id)}`, { headers: { authorization: "Bearer " + env.WA_TOKEN } }).then(r => r.ok ? r.json() : null).catch(() => null);
  if (!g || !g.url) return null;
  const r = await fetch(g.url, { headers: { authorization: "Bearer " + env.WA_TOKEN } }).catch(() => null);
  if (!r || !r.ok) return null;
  return { tipo: g.mime_type || r.headers.get("content-type") || "application/octet-stream", buf: await r.arrayBuffer() };
}
const b64 = buf => { const u = new Uint8Array(buf); let s = ""; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); };
const PAGO_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["es_pago", "monto", "operacion", "fecha", "metodo", "plan", "nombres", "dni", "nacimiento", "celular", "inicio", "nota", "respuesta"],
  properties: {
    es_pago: { type: "boolean" }, monto: { type: "string" }, operacion: { type: "string" }, fecha: { type: "string" }, metodo: { type: "string" },
    plan: { type: "string" }, nombres: { type: "string" }, dni: { type: "string" }, nacimiento: { type: "string" }, celular: { type: "string" }, inicio: { type: "string" }, nota: { type: "string" }, respuesta: { type: "string" },
  },
};
async function waComprobante(env, e, m, nombre, responde) {
  const md = m.image || m.document || {};
  const f = await ficha(env, e.slug);
  let o = null;
  try {
    const med = md.id ? await waMedia(env, md.id) : null;
    const img = med && /^image\/(jpeg|png|webp|gif)$/.test(med.tipo) && med.buf.byteLength < 4.5e6;
    if (img && f && env.ANTHROPIC_API_KEY) {
      const hist = (e.historial || []).slice(-16).map(x => (x.de === "cliente" ? "Cliente: " : "Negocio: ") + corta(x.t, 400)).join("\n");
      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2 });
      const r = await client.messages.create({
        model: env.BOT_MODELO || "claude-haiku-5-5", max_tokens: 1200,
        system: `Atiendes el WhatsApp de ${f.nombre} (Perú). El cliente envió una imagen. Decide si es un comprobante de pago (Yape, Plin, transferencia, depósito). Si lo es, lee: monto (solo número), número de operación, fecha y hora, método. De la CONVERSACIÓN saca el plan que acordaron y los datos del cliente (nombres completos, DNI, fecha de nacimiento AAAA-MM-DD, celular), «inicio» = día en que quiere empezar su membresía en AAAA-MM-DD si lo pidió (hoy es ${new Date(Date.now() - 18e6).toISOString().slice(0, 10)}) y «nota» = lo que recepción debe saber (ej. quiere congelar luego, lesión, horario); deja vacío lo que no esté, nunca inventes. «respuesta»: mensaje corto y cálido por WhatsApp, tuteando. Si es pago: agradece por su nombre, di que recepción verifica el pago y que apenas se confirme le llega su código QR de acceso; si faltan datos (nombres completos, DNI o fecha de nacimiento), pídelos en el mismo mensaje. Si no es un pago: agradece y di que recepción lo revisa. Nunca confirmes que el pago ya llegó: eso lo verifica recepción.\nFICHA:\n${f.texto}`,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: med.tipo, data: b64(med.buf) } },
          { type: "text", text: `Celular del chat: ${/^\d+$/.test(m.from) ? m.from : "(no visible)"} · Nombre en WhatsApp: ${corta(nombre, 80) || "-"}\nCONVERSACIÓN:\n${hist || "(sin mensajes previos)"}${md.caption ? "\nTexto con la imagen: " + corta(md.caption, 300) : ""}` },
        ] }],
        output_config: { effort: "low", format: { type: "json_schema", schema: PAGO_SCHEMA } },
      });
      if (r.stop_reason !== "refusal" && r.stop_reason !== "max_tokens") o = JSON.parse(r.content.filter(x => x.type === "text").map(x => x.text).join(""));
    }
  } catch (err) { console.log("wa comprobante error", err?.status, err?.message); }
  const pdf = m.type === "document";
  if (o && !o.es_pago) return responde(corta(o.respuesta, 1000) || "¡Gracias! 🙌 Recepción lo revisa en un momento.", true);
  const { respuesta, es_pago, ...datos } = o || {};
  if (!datos.celular && /^\d+$/.test(m.from)) datos.celular = m.from;
  const v = await rpcAnon(env, "xa_bot_venta", { p_clave: env.WA_CLAVE, p_chat: e.chat, p_media: md.id || null, p_datos: { ...datos, lectura: o ? "asistente" : pdf ? "pdf" : "sin leer" } });
  if (!v || !v.ok) return responde("¡Recibido! 🙌 Recepción revisa tu pago y en un momento te confirma por aquí.", true);
  return responde(corta(respuesta, 1000) || "¡Recibido! 🙌 Recepción verifica tu pago y apenas se confirme te llega tu código de acceso.", false);
}

async function waApi(req, env, ctx) {
  const u = new URL(req.url);
  if (req.method === "GET") {   // verificación del webhook (Meta)
    if (u.searchParams.get("hub.mode") === "subscribe" && env.WA_VERIFY && u.searchParams.get("hub.verify_token") === env.WA_VERIFY) return new Response(u.searchParams.get("hub.challenge") || "", { status: 200 });
    if (env.WA_VERIFY && u.searchParams.get("diag") === env.WA_VERIFY && u.searchParams.get("waba")) {   // diagnóstico: suscripción de la cuenta de WhatsApp a la app
      const w = encodeURIComponent(u.searchParams.get("waba")), g = `https://graph.facebook.com/${env.WA_GRAPH || "v24.0"}/${w}/subscribed_apps`, h = { authorization: "Bearer " + env.WA_TOKEN };
      const sub = u.searchParams.get("sub") === "1" ? await fetch(g, { method: "POST", headers: h }).then(r => r.json()).catch(e => ({ e: e.message })) : null;
      const ver = await fetch(g, { headers: h }).then(r => r.json()).catch(e => ({ e: e.message }));
      return json({ sub, ver, ultimo: globalThis.WA_ULT || null });
    }
    if (env.WA_VERIFY && u.searchParams.get("diag") === env.WA_VERIFY && u.searchParams.get("app")) {   // diagnóstico: ¿WA_APP_SECRET coincide con la app? (token de app = id|secreto)
      const id = encodeURIComponent(u.searchParams.get("app")), s = (env.WA_APP_SECRET || "");
      const r = await fetch(`https://graph.facebook.com/${env.WA_GRAPH || "v24.0"}/${id}/subscriptions?access_token=${id}|${encodeURIComponent(s)}`).then(r => r.json()).catch(e => ({ e: e.message }));
      return json({ largo: s.length, espacios: s !== s.trim(), r });
    }
    if (env.WA_VERIFY && u.searchParams.get("diag") === env.WA_VERIFY && u.searchParams.get("pid")) {   // diagnóstico: mensaje simulado de un número falso
      const r = await waProcesar(env, u.searchParams.get("pid"), { from: u.searchParams.get("from") || "51900000000", id: "diag-" + Date.now(), type: "text", text: { body: u.searchParams.get("t") || "hola, cuánto cuesta el mes?" } }, "Prueba XyroStudio");
      return json({ paso: r });
    }
    return json({ wa: env.WA_TOKEN && env.WA_APP_SECRET && env.WA_VERIFY && env.WA_CLAVE ? "✅ WhatsApp listo" : "⏳ Faltan secretos de WhatsApp en Cloudflare" });
  }
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const raw = await req.text();
  if (raw.length > 200000 || !(await firmaOk(env, raw, req.headers.get("x-hub-signature-256")))) { console.log("wa firma inválida", raw.length, !!req.headers.get("x-hub-signature-256")); globalThis.WA_ULT = "firma inválida " + new Date().toISOString(); return json({ error: "Firma inválida" }, 401); }
  console.log("wa webhook", raw.length);
  globalThis.WA_ULT = new Date().toISOString();
  let b; try { b = JSON.parse(raw); } catch { return json({ ok: true }); }
  const tareas = [];
  for (const en of b.entry || []) for (const ch of en.changes || []) {
    const v = ch.value || {}, pid = v.metadata && v.metadata.phone_number_id;
    const nombres = {}, otro = {}; (v.contacts || []).forEach(c => { const n = c.profile && c.profile.name; if (c.wa_id) nombres[c.wa_id] = n; if (c.user_id) nombres[c.user_id] = n; if (c.wa_id && c.user_id) { otro[c.wa_id] = c.user_id; otro[c.user_id] = c.wa_id; } });
    for (const m of v.messages || []) if (pid) { const id = m.from || m.from_user_id; tareas.push(waProcesar(env, pid, m, nombres[id] || "", (m.from && m.from_user_id && m.from !== m.from_user_id ? m.from_user_id : "") || otro[id] || "")); }
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
  const img = typeof b.imagen === "string" && b.imagen.startsWith(env.SB_URL + "/storage/v1/object/public/") ? b.imagen : null;   // solo imágenes de nuestro storage (QR, carnet)
  const r = await fetch(env.SB_URL + "/rest/v1/rpc/" + (b.bot ? "xa_wa_bot_envia" : "xa_wa_responder"), {
    method: "POST", headers: { apikey: env.SB_KEY, authorization: "Bearer " + token, "content-type": "application/json" },
    body: JSON.stringify(b.bot ? { p_chat: b.chat, p_texto: texto, p_humano: !!b.humano } : { p_chat: b.chat, p_texto: texto }),
  });
  if (r.status === 401) return json({ error: "Inicia sesión" }, 401);
  const d = r.ok ? await r.json() : null;
  if (!d || !d.ok) return json({ error: (d && d.motivo) || "No se pudo enviar" }, 403);
  const s = await waEnviar(env, d.phone_id, d.telefono, texto, img);
  if (!s.ok) return json({ error: "WhatsApp no aceptó el mensaje. Intenta de nuevo." }, 502);
  return json({ ok: true });
}

// App: el dueño sube el contrato o reglamento (PDF) y la IA saca su texto para que el asistente lo use. Usa el cupo del soporte.
async function botDoc(req, env) {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || token.length > 4000) return json({ error: "Inicia sesión" }, 401);
  if (!env.ANTHROPIC_API_KEY) return json({ error: "La IA no está disponible ahora." }, 503);
  const raw = await req.text();
  if (raw.length > 14e6) return json({ error: "El PDF pesa mucho (máximo 10 MB)." }, 413);
  let b; try { b = JSON.parse(raw); } catch { return json({ error: "Solicitud inválida" }, 400); }
  if (!b.pdf || typeof b.pdf !== "string") return json({ error: "Falta el PDF" }, 400);
  const c = await cupo(env, token, "soporte");
  if (c.err) return json({ error: c.err === 401 ? "Inicia sesión" : "No se pudo revisar tu cupo" }, c.err === 401 ? 401 : 502);
  if (!c.ok) return json({ error: c.motivo || "Llegaste al límite de hoy" }, 429);
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2 });
    const r = await client.messages.create({
      model: env.BOT_MODELO || "claude-haiku-5-5", max_tokens: 4000,
      messages: [{ role: "user", content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: b.pdf } },
        { type: "text", text: `Este es el ${b.tipo === "reglamento" ? "reglamento" : "contrato de membresía"} de un gimnasio. Escribe en español, en texto plano y ordenado por temas, TODO lo que un asistente de recepción necesita para responder dudas de clientes: condiciones, duración, pagos, devoluciones, congelamientos, transferencias, horarios, normas, sanciones, responsabilidades y cualquier cláusula importante. Fiel al documento, sin inventar ni opinar. Máximo 5000 caracteres.` },
      ] }],
    });
    const texto = r.content.filter(x => x.type === "text").map(x => x.text).join("").trim();
    if (!texto) return json({ error: "No se pudo leer el PDF" }, 502);
    return json({ texto: corta(texto, 6000) });
  } catch (e) {
    console.log("bot doc error", e?.status, e?.message);
    return json({ error: "No se pudo leer el PDF. ¿Es un PDF con texto?" }, 502);
  }
}

// App: el dueño escribe sus promos especiales como quiera y la IA las deja en reglas cortas y claras (el dueño las revisa). Cupo del soporte.
const REGLAS_SCHEMA = { type: "object", additionalProperties: false, required: ["reglas"], properties: { reglas: { type: "array", items: {
  type: "object", additionalProperties: false, required: ["promo", "precio", "cuando"], properties: { promo: { type: "string" }, precio: { type: "string" }, cuando: { type: "string" } } } } } };
async function botReglas(req, env) {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || token.length > 4000) return json({ error: "Inicia sesión" }, 401);
  if (!env.ANTHROPIC_API_KEY) return json({ error: "La IA no está disponible ahora." }, 503);
  let b; try { b = JSON.parse(await req.text()); } catch { return json({ error: "Solicitud inválida" }, 400); }
  const t = corta(b.texto, 4000).trim();
  if (t.length < 8) return json({ error: "Escribe tus promos en el borrador" }, 400);
  const c = await cupo(env, token, "soporte");
  if (c.err) return json({ error: c.err === 401 ? "Inicia sesión" : "No se pudo revisar tu cupo" }, c.err === 401 ? 401 : 502);
  if (!c.ok) return json({ error: c.motivo || "Llegaste al límite de hoy" }, 429);
  try {
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2 });
    const r = await client.messages.create({
      model: env.BOT_MODELO || "claude-haiku-5-5", max_tokens: 1500,
      system: "Ordenas las promos especiales que escribió el dueño de un gimnasio para que su asistente de ventas las aplique sin confundirse. Una regla por promo. «promo»: qué es, corto (ej. «Plan 1 año»). «precio»: el precio final en S/ y para cuántas personas (ej. «S/ 500» o «S/ 650 por las 2 personas»). «cuando»: la condición exacta en una frase corta, siempre incluye «paga hoy» si el dueño lo pide. Fiel a lo que escribió: no inventes promos, precios ni condiciones; si algo no está claro, ponlo tal cual. Español de Perú.",
      messages: [{ role: "user", content: `Planes del gym: ${corta(b.planes, 600) || "-"}\nBORRADOR DEL DUEÑO:\n${t}` }],
      output_config: { effort: "low", format: { type: "json_schema", schema: REGLAS_SCHEMA } },
    });
    const o = JSON.parse(r.content.filter(x => x.type === "text").map(x => x.text).join(""));
    const L = (o.reglas || []).slice(0, 12).map((x, i) => `🎁 ${i + 1}. ${corta(x.promo, 80)} → ${corta(x.precio, 60)}\n   Solo si: ${corta(x.cuando, 200)}`);
    if (!L.length) return json({ error: "No encontré promos en el borrador" }, 422);
    return json({ reglas: L.join("\n") });
  } catch (e) {
    console.log("bot reglas error", e?.status, e?.message);
    return json({ error: "No se pudo ordenar ahora. Intenta de nuevo." }, 502);
  }
}

// App: ver una imagen que llegó por WhatsApp (comprobante, foto). Solo el equipo del negocio (RPC xa_wa_media_ok).
async function waVerMedia(req, env) {
  const u = new URL(req.url), id = u.searchParams.get("id") || "";
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!/^\d{5,40}$/.test(id) || !token || token.length > 4000) return json({ error: "Solicitud inválida" }, 400);
  const ok = await fetch(env.SB_URL + "/rest/v1/rpc/xa_wa_media_ok", {
    method: "POST", headers: { apikey: env.SB_KEY, authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify({ p_media: id }),
  }).then(r => r.ok ? r.json() : false).catch(() => false);
  if (ok !== true) return json({ error: "Sin acceso" }, 403);
  const m = await waMedia(env, id);
  if (!m) return json({ error: "La imagen ya no está disponible en WhatsApp (dura 30 días)" }, 404);
  return new Response(m.buf, { headers: { "content-type": m.tipo, "cache-control": "private, max-age=3600" } });
}

// App «💳 Mi plan XyroStudio» (SQL 42): el admin del negocio sube la captura de su pago a XyroStudio; la IA la lee y la RPC renueva si cuadra.
const XPAGO_SCHEMA = { type: "object", additionalProperties: false, required: ["es_pago", "monto", "operacion", "fecha", "metodo", "destinatario", "destino_ok"],
  properties: { es_pago: { type: "boolean" }, monto: { type: "string" }, operacion: { type: "string" }, fecha: { type: "string" }, metodo: { type: "string" }, destinatario: { type: "string" }, destino_ok: { type: "boolean" } } };
async function xyroPago(req, env) {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || token.length > 4000) return json({ error: "Inicia sesión" }, 401);
  if (!env.ANTHROPIC_API_KEY || !env.WA_CLAVE) return json({ error: "La verificación no está disponible ahora." }, 503);
  let b; try { b = JSON.parse(await req.text()); } catch { return json({ error: "Solicitud inválida" }, 400); }
  const sitio = String(b.sitio || "").slice(0, 80), foto = String(b.foto || "");
  if (!sitio || !foto.startsWith(env.SB_URL + "/storage/v1/object/public/medios/" + sitio + "/")) return json({ error: "Imagen inválida" }, 400);
  const H = { apikey: env.SB_KEY, authorization: "Bearer " + token, "content-type": "application/json" };
  const cfg = await fetch(env.SB_URL + "/rest/v1/xa_xyro_cobro?id=eq.1&select=*", { headers: H }).then(r => r.ok ? r.json() : null).catch(() => null);
  if (!cfg) return json({ error: "Inicia sesión" }, 401);
  const C = cfg[0] || {};
  let d = { es_pago: false, monto: "", operacion: "", fecha: "", metodo: "", destinatario: "", destino_ok: true, lectura: "sin leer" };
  try {
    const im = await fetch(foto);
    const tipo = (im.headers.get("content-type") || "").split(";")[0];
    const buf = im.ok ? await im.arrayBuffer() : null;
    if (buf && /^image\/(jpeg|png|webp|gif)$/.test(tipo) && buf.byteLength < 4.5e6) {
      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2 });
      const r = await client.messages.create({
        model: env.BOT_MODELO || "claude-haiku-5-5", max_tokens: 600,
        system: `Revisas comprobantes de pago en Perú (Yape, Plin, transferencia, depósito). Lee de la imagen: monto (solo número), número de operación, fecha y hora, método y a quién se pagó (destinatario). «destino_ok» = true si el destinatario coincide con alguno de estos datos de XyroStudio (o si la imagen no muestra el destinatario): titular «${corta(C.titular || "", 80)}», Yape ${corta(C.yape || "-", 20)}, Plin ${corta(C.plin || "-", 20)}, cuenta ${corta(C.cuenta || "-", 30)}, CCI ${corta(C.cci || "-", 30)}. Los números pueden verse en parte (ej. ***066). Hoy es ${new Date(Date.now() - 18e6).toISOString().slice(0, 10)}. Deja vacío lo que no se vea; nunca inventes.`,
        messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: tipo, data: b64(buf) } }, { type: "text", text: "Lee este comprobante." }] }],
        output_config: { effort: "low", format: { type: "json_schema", schema: XPAGO_SCHEMA } },
      });
      if (r.stop_reason !== "refusal" && r.stop_reason !== "max_tokens") d = { ...JSON.parse(r.content.filter(x => x.type === "text").map(x => x.text).join("")), lectura: "ia" };
    }
  } catch (err) { console.log("xyro pago ia", err?.status, err?.message); }
  const r = await fetch(env.SB_URL + "/rest/v1/rpc/xa_xyro_pago", { method: "POST", headers: H, body: JSON.stringify({ p_clave: env.WA_CLAVE, p_sitio: sitio, p_foto: foto, p_datos: d }) }).catch(() => null);
  if (!r || !r.ok) return json({ error: r && r.status === 404 ? "Muy pronto podrás pagar desde aquí." : "No se pudo guardar tu pago. Intenta otra vez." }, 502);
  const o = await r.json().catch(() => null);
  if (!o) return json({ error: "No se pudo guardar tu pago." }, 502);
  return json(o, o.ok ? 200 : 403);
}

export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url);
    if (u.pathname === "/api/ia") return ia(req, env);
    if (u.pathname === "/api/bot") return botApi(req, env);
    if (u.pathname === "/api/wa") return waApi(req, env, ctx);
    if (u.pathname === "/api/wa/responder") return waResponder(req, env);
    if (u.pathname === "/api/wa/media") return waVerMedia(req, env);
    if (u.pathname === "/api/bot/doc") return botDoc(req, env);
    if (u.pathname === "/api/bot/reglas") return botReglas(req, env);
    if (u.pathname === "/api/xyro/pago") return xyroPago(req, env);
    if (u.pathname.startsWith("/api/")) return json({ error: "No existe" }, 404);
    return env.ASSETS.fetch(req);
  },
};
