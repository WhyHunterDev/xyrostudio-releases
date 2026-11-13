// xyrostudio.net: sirve la web estática (public/) y, solo en /api/*, la IA del soporte.
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

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === "/api/ia") return ia(req, env);
    if (u.pathname.startsWith("/api/")) return json({ error: "No existe" }, 404);
    return env.ASSETS.fetch(req);
  },
};
