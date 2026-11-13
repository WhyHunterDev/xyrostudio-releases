/* Editor de la web del negocio dentro de Xyro Apps (xyrostudio.net/app/web/). Basado en el panel de Santos. */
/* ============================================================
 *  Conexión al backend real (Supabase)
 *  Cómo usarlo:
 *   1) Pon tus datos en CONFIG (los copias de Supabase → Settings → API).
 *   2) En index.html y panel-ss-7q2k.html, ANTES de store.js agrega:
 *        <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *        <script src="backend/conexion.js"></script>
 *   3) store.js detecta esta conexión y, si existe, usa la nube en vez del
 *      navegador. Si no la pones, todo sigue funcionando en modo demo local.
 * ============================================================ */
(function () {
  const CONFIG = {
    url: 'https://szvdzcaoxjstdyblhxrd.supabase.co',             // Project URL
    anonKey: 'sb_publishable_LOmoV7GDpORg5J1eE7YriA_tB4Y6EYe',  // llave publishable (pública)
    sitio: new URLSearchParams(location.search).get('s') || ''   // negocio (?s=slug); si no, el de la cuenta
  };
  if (!window.supabase || CONFIG.url.includes('TU-PROYECTO')) return; // sin configurar → demo local

  // El Gestor guarda su sesión aparte: así entrar al panel del cliente en el mismo navegador no lo cambia de cuenta.
  // Editor de la web dentro de Xyro Apps: usa la MISMA sesión de Xyro Apps (mismo dominio), sin login propio.
  const sb = window.supabase.createClient(CONFIG.url, CONFIG.anonKey, { auth: { storageKey: 'xyro-apps-auth' } });
  let sitioId = null, negocio = '';
  async function idDe() {
    if (sitioId) return sitioId;
    let s = null;
    if (CONFIG.sitio) s = (await sb.from('sitios').select('*').eq('slug', CONFIG.sitio).maybeSingle()).data;
    else { const { data: u } = await sb.auth.getUser(); if (u && u.user) { const { data: p } = await sb.from('perfiles').select('sitio_id').eq('id', u.user.id).maybeSingle(); if (p && p.sitio_id) s = (await sb.from('sitios').select('*').eq('id', p.sitio_id).maybeSingle()).data; } }
    if (!s) throw new Error('sin negocio');
    CONFIG.sitio = s.slug; negocio = s.negocio || s.nombre || ''; if (window.SS_BACKEND) { window.SS_BACKEND.sitio = s.slug; window.SS_BACKEND.negocio = negocio; }
    return (sitioId = s.id);
  }

  // Convierte las filas de 'contenido' en el mismo objeto que usa la web.
  async function cargar() {
    const sid = await idDe();
    const { data } = await sb.from('contenido').select('clave,valor').eq('sitio_id', sid);
    const out = {};
    (data || []).forEach((r) => { out[r.clave] = r.valor; });
    const { data: us } = await sb.from('perfiles').select('*').eq('sitio_id', sid);
    out.usuarios = us || [];
    const app = out.app || {};                       // ajustes de Xyro Apps: web pública y logo del negocio
    let w = app.web || ''; try { if (w) { const u = new URL(w); w = /\.[a-z0-9]+$/i.test(u.pathname) ? u.href.replace(/[^/]*$/, '') : u.origin + u.pathname.replace(/\/?$/, '/'); } } catch (_) { w = ''; }
    window.SS_WEB = w;
    window.SS_WEBURL = app.web || '';               // enlace completo (la base Xyro Webs lleva ?s=codigo)
    window.SS_BASE = /xyrostudio\.net\/sitio\//.test(app.web || '');   // web hecha con la base: tiene estilos y secciones
    window.SS_LOGO = app.logo || '';
    window.SS_NOMBRE = app.nombre || negocio || '';
    return out;
  }
  async function guardarClave(clave, valor) {
    const sid = await idDe();
    await sb.from('contenido').upsert({ sitio_id: sid, clave, valor });
  }

  // Sube una foto/video al bucket 'medios' y devuelve su URL pública.
  async function subir(file) {
    const sid = await idDe();
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const path = `${sid}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error } = await sb.storage.from('medios').upload(path, file, { upsert: false });
    if (error) throw error;
    return sb.storage.from('medios').getPublicUrl(path).data.publicUrl;
  }

  async function actividad(sitioSlug, quien, que) {
    const sid = await idDe();
    await sb.from('actividad').insert({ sitio_id: sid, quien, que });
  }

  // Registra una visita o un clic a WhatsApp (anonimo y seguro, via RPC).
  async function metrica(tipo) {
    try { await sb.rpc('registrar_evento', { p_slug: CONFIG.sitio || null, p_tipo: tipo }); } catch (_) {}
  }

  // Autenticación (reemplaza al login local del panel).
  const auth = {
    async entrar(email, pass) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      const { data: perfil } = await sb.from('perfiles').select('*').eq('id', data.user.id).single();
      return perfil;
    },
    async salir() {},   // la sesión es la de Xyro Apps: se cierra desde allá
    async actual() {
      const { data } = await sb.auth.getUser();
      if (!data.user) return null;
      return (await sb.from('perfiles').select('*').eq('id', data.user.id).single()).data;
    },
    async cambiarPass(nueva) { const { error } = await sb.auth.updateUser({ password: nueva }); if (error) throw error; }
  };

  // Registro de errores de la web y del panel (solo lo ve el gestor).
  const ESGESTOR = false;
  const ORIGEN = 'panel';
  let nErr = 0; const vistos = new Set();
  function reportarError(msg, det) {
    try {
      if (ESGESTOR) return;
      msg = String(msg || '').slice(0, 300);
      if (!msg || /^Script error\.?$/i.test(msg) || /ResizeObserver loop/i.test(msg) || vistos.has(msg) || ++nErr > 8) return;
      vistos.add(msg);
      sb.rpc('registrar_error', { p_slug: CONFIG.sitio || null, p_origen: ORIGEN, p_msg: msg, p_det: String(det || '').slice(0, 1500),
        p_url: location.href.slice(0, 300), p_ua: navigator.userAgent.slice(0, 200) }).then(() => {}, () => {});
    } catch (_) {}
  }
  addEventListener('error', (e) => {
    const t = e.target;
    if (t && t !== window && (t.src || t.href)) return reportarError('No cargó un archivo: ' + (t.currentSrc || t.src || t.href));
    reportarError(e.message, (e.filename || '') + ':' + (e.lineno || '') + ':' + (e.colno || '') + '\n' + ((e.error && e.error.stack) || ''));
  }, true);
  addEventListener('unhandledrejection', (e) => { const r = e.reason || {}; reportarError('Promesa fallida: ' + (r.message || r), r.stack || ''); });

  // Expuesto para que store.js lo use si está presente.
  window.SS_BACKEND = { sb, cargar, guardarClave, subir, actividad, metrica, reportarError, sitio: CONFIG.sitio, negocio, auth, idDe };
})();
