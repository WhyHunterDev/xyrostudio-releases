/* Base Xyro Webs · Gimnasio — capa de datos de la web pública (solo lectura).
   Con negocio (?s=codigo): lee su contenido de la nube; lo que falte sale de la base (js/base.js).
   Sin negocio: muestra la base con «(nombre del gym)» (vista de plantilla). */
(function () {
  const CLAVES = ['config', 'sedes', 'planes', 'pase', 'notaPlanes', 'entrenadores', 'clases', 'nutricion', 'cafetin', 'publicaciones', 'galeria'];
  const today = (o = 0) => { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); };
  const seed = () => window.XYRO_BASE_GYM((window.GYM || {}).nombre);
  async function load() {
    const B = window.SS_BACKEND;
    if (!B) return seed();
    let nube = {};
    try { nube = await B.cargar(); } catch (e) { console.warn('Sin conexión, muestro la base:', e); return seed(); }
    const base = seed();   // después de cargar: ya sabe el nombre del negocio
    const out = {};
    CLAVES.forEach((k) => { out[k] = nube[k] === undefined || nube[k] === null ? base[k] : nube[k]; });
    out.config = { ...base.config, ...out.config };   // secciones nuevas de la base no rompen webs antiguas
    ['hero', 'marquee', 'vision', 'videos'].forEach((k) => { out.config[k] = { ...base.config[k], ...(out.config[k] || {}) }; });
    ['sedes', 'planes', 'entrenadores', 'clases', 'nutricion', 'publicaciones', 'galeria'].forEach((k) => { if (!Array.isArray(out[k])) out[k] = base[k]; });
    out.cafetin = { ...base.cafetin, ...out.cafetin, items: (out.cafetin && out.cafetin.items) || [], combos: (out.cafetin && out.cafetin.combos) || [] };
    return out;
  }
  const mediaUrl = async (ref) => ref || '';
  function vigente(p) { const t = today(); return p.estado === 'publicado' && (!p.inicio || p.inicio <= t) && (!p.fin || p.fin >= t); }
  const waLink = (n, t) => 'https://wa.me/' + String(n || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(t);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  window.SS = { load, mediaUrl, uid, today, vigente, waLink };
})();
