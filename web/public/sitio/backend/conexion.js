/* Base Xyro Webs · conexión de la web pública (solo lectura, llave pública).
   Negocio = ?s=codigo (xyrostudio.net/sitio/?s=titan-gym). Sin código: vista de plantilla, sin nube.
   Nombre, logo y color salen de los ajustes de Xyro Apps (contenido 'app'). */
(function () {
  const CONFIG = {
    url: 'https://szvdzcaoxjstdyblhxrd.supabase.co',
    anonKey: 'sb_publishable_LOmoV7GDpORg5J1eE7YriA_tB4Y6EYe',
    sitio: (new URLSearchParams(location.search).get('s') || '').toLowerCase().replace(/[^a-z0-9-]/g, '')
  };
  const q = new URLSearchParams(location.search);
  // Vista de plantilla para vender: /sitio/?n=Titan%20Gym&c=2563eb muestra la base con ese nombre y color (sin nube).
  window.GYM = { slug: CONFIG.sitio, nombre: CONFIG.sitio ? '' : (q.get('n') || '').slice(0, 40), color: CONFIG.sitio ? '' : (/^[0-9a-f]{6}$/i.test(q.get('c') || '') ? '#' + q.get('c') : ''), logo: CONFIG.sitio ? '' : (/^https:\/\//.test(q.get('l') || '') ? q.get('l') : '') };
  if (!window.supabase || !CONFIG.sitio) return;
  const sb = window.supabase.createClient(CONFIG.url, CONFIG.anonKey, { auth: { storageKey: 'xyro-web-pub', persistSession: false, autoRefreshToken: false } });
  let sitioId = null;
  async function idDe() {
    if (sitioId) return sitioId;
    const { data } = await sb.from('sitios').select('id,negocio').eq('slug', CONFIG.sitio).maybeSingle();
    if (!data) throw new Error('negocio no encontrado');
    window.GYM.nombre = data.negocio;
    return (sitioId = data.id);
  }
  async function cargar() {
    const sid = await idDe();
    const { data, error } = await sb.from('contenido').select('clave,valor').eq('sitio_id', sid);
    if (error) throw error;
    const out = {};
    (data || []).forEach((r) => { out[r.clave] = r.valor; });
    const app = out.app || {};
    Object.assign(window.GYM, { nombre: app.nombre || window.GYM.nombre, logo: app.logo || '', color: app.color || '' });
    return out;
  }
  async function metrica(tipo) { try { await sb.rpc('registrar_evento', { p_slug: CONFIG.sitio, p_tipo: tipo }); } catch (_) {} }
  let nErr = 0; const vistos = new Set();
  function reportarError(msg, det) {
    try {
      msg = String(msg || '').slice(0, 300);
      if (!msg || /^Script error\.?$/i.test(msg) || /ResizeObserver loop/i.test(msg) || vistos.has(msg) || ++nErr > 8) return;
      vistos.add(msg);
      sb.rpc('registrar_error', { p_slug: CONFIG.sitio, p_origen: 'web', p_msg: msg, p_det: String(det || '').slice(0, 1500), p_url: location.href.slice(0, 300), p_ua: navigator.userAgent.slice(0, 200) }).then(() => {}, () => {});
    } catch (_) {}
  }
  addEventListener('error', (e) => { const t = e.target; if (t && t !== window && (t.src || t.href)) return reportarError('No cargó un archivo: ' + (t.currentSrc || t.src || t.href)); reportarError(e.message, (e.filename || '') + ':' + (e.lineno || '')); }, true);
  addEventListener('unhandledrejection', (e) => { const r = e.reason || {}; reportarError('Promesa fallida: ' + (r.message || r), r.stack || ''); });
  window.SS_BACKEND = { sb, cargar, metrica, reportarError, sitio: CONFIG.sitio, idDe };
})();
