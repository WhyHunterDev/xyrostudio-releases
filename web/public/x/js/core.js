// Xyro · núcleo del frontend (sin frameworks). Conexión a Supabase (SQL 76), estado, ayudantes y piezas de UI.
import { demoRpc, demoFrom, DEMO_USER } from './demo.js';

export const SB = { url: 'https://szvdzcaoxjstdyblhxrd.supabase.co', key: 'sb_publishable_LOmoV7GDpORg5J1eE7YriA_tB4Y6EYe' };
const P = new URLSearchParams(location.search);
export const S = {
  demo: P.has('demo'),            // ?demo=1 → datos de ejemplo, sin cuenta
  sinCore: false,                 // true si el SQL 76 aún no está corrido (se usa la demo y se avisa)
  sb: null, user: null, me: null, // sesión de Supabase y fila de public.users
  modo: localStorage.getItem('x-modo') || 'user',   // user | control | panel
  entidades: [], entidad: null,   // negocios/servicios que administra (Xyro Control)
  geo: null,
};

// ---------- ayudantes ----------
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const ls = { g: (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } }, s: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (_) {} } };
export const vib = () => { try { navigator.vibrate && navigator.vibrate(8); } catch (_) {} };
const LOC = { PEN: 'es-PE', MXN: 'es-MX', COP: 'es-CO', CLP: 'es-CL', ARS: 'es-AR', BOB: 'es-BO', EUR: 'es-ES', USD: 'es-US' };
export const money = (n, cur = 'PEN') => { try { return new Intl.NumberFormat(LOC[cur] || 'es', { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 2 }).format(+n || 0); } catch (_) { return cur + ' ' + (+n || 0).toFixed(2); } };
export const num = (n) => new Intl.NumberFormat('es').format(Math.round(+n || 0));
// Horas siempre en am/pm (regla del proyecto)
export const hora = (d) => new Date(d).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(/\s?a\.?\s?m\.?/i, ' am').replace(/\s?p\.?\s?m\.?/i, ' pm');
export const fecha = (d, o) => new Date(d).toLocaleDateString('es', o || { day: 'numeric', month: 'short' });
export const dist = (m) => m == null ? '' : m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(m < 10000 ? 1 : 0) + ' km';
export const errDe = (e) => {
  const t = String((e && (e.message || e.error_description || e.error)) || e || '');
  if (/Failed to fetch|NetworkError|network/i.test(t)) return 'Sin conexión. Revisa tu internet.';
  if (/Invalid login/i.test(t)) return 'Correo o clave incorrectos.';
  if (/JWT|sesion|not authenticated/i.test(t)) return 'Tu sesión venció. Vuelve a entrar.';
  return t.replace(/^.*?ERROR:\s*/, '') || 'Algo salió mal. Intenta de nuevo.';
};

export function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; $('#toasts').appendChild(d); setTimeout(() => d.remove(), 2800); }
export function hoja(html, fn) {
  const o = document.createElement('div'); o.className = 'ov'; o.innerHTML = `<div class="sh" role="dialog" aria-modal="true">${html}</div>`;
  const close = () => { o.remove(); document.removeEventListener('keydown', k); };
  const k = (e) => { if (e.key === 'Escape') close(); };
  o.addEventListener('click', (e) => { if (e.target === o || e.target.closest('[data-x]')) close(); });
  document.addEventListener('keydown', k); document.body.appendChild(o); fn && fn(o, close); return close;
}
// Ubicación solo para la consulta (nunca se guarda). En demo, si no hay permiso, usa Lima.
export function ubicar(ms = 8000) {
  return new Promise((ok) => {
    const demo = () => ok(S.demo ? { lat: -12.1211, lng: -77.0297, demo: true } : null);
    if (!navigator.geolocation) return demo();
    navigator.geolocation.getCurrentPosition((p) => { S.geo = { lat: p.coords.latitude, lng: p.coords.longitude }; ok(S.geo); }, demo, { enableHighAccuracy: true, timeout: ms, maximumAge: 60000 });
  });
}
export function cargaJS(src) { return new Promise((ok, ko) => { if ([...document.scripts].some((s) => s.src === src)) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); }); }

// ---------- íconos (trazo, 24 px) ----------
const sv = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const I = {
  explore: sv('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>'),
  scan: sv('<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7 12h10"/>'),
  market: sv('<path d="M3 9 5 4h14l2 5M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0zM5 13v7h14v-7"/>'),
  wallet: sv('<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18M16 15h2M7 6l9-3 1 3"/>'),
  user: sv('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  search: sv('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  pin: sv('<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
  orders: sv('<path d="M6 3h12l1 4H5zM5 7h14v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM9 11h6M9 15h4"/>'),
  qr: sv('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>'),
  catalog: sv('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'),
  bolt: sv('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  chart: sv('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  shield: sv('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>'),
  ticket: sv('<path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z"/>'),
  swap: sv('<path d="M7 7h13l-4-4M17 17H4l4 4"/>'),
  out: sv('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3"/>'),
  film: sv('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>'),
  flame: sv('<path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 2-2 3-3 3 0-3-1-6-4-9 0 4-4 7-4 12 0 4.5 3 8 7 8z"/>'),
};

// ---------- Supabase ----------
export async function cliente() {
  if (S.sb || S.demo) return S.sb;
  await cargaJS('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js');
  // Misma sesión que Mi Xyro: una sola cuenta para todo.
  S.sb = window.supabase.createClient(SB.url, SB.key, { auth: { storageKey: 'xyro-mi-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return S.sb;
}
const falta = (e) => /function .* does not exist|Could not find the function|relation .* does not exist|schema cache/i.test(String(e && (e.message || e)));
export async function rpc(f, a) {
  if (S.demo || S.sinCore) return demoRpc(f, a || {});
  const { data, error } = await S.sb.rpc(f, a || {});
  if (error) { if (falta(error)) { activarSinCore(); return demoRpc(f, a || {}); } throw error; }
  return data;
}
// Lectura de tablas con RLS (el filtro de seguridad lo hace la base, no el navegador)
export async function tabla(t, fn, dk) {
  if (S.demo || S.sinCore) return demoFrom(dk || t);
  const { data, error } = await fn(S.sb.from(t));
  if (error) { if (falta(error)) { activarSinCore(); return demoFrom(dk || t); } throw error; }
  return data || [];
}
function activarSinCore() {
  if (S.sinCore) return; S.sinCore = true;
  const a = $('#aviso'); a && (a.innerHTML = '<div class="aviso">🧪 Falta correr <b>76-xyro-core.sql</b> en Supabase. Mientras tanto ves datos de ejemplo.</div>');
}

// Carga la cuenta (public.users) y sus negocios. En demo usa datos de ejemplo.
export async function cargarCuenta() {
  if (S.demo) { S.user = { id: DEMO_USER.id, email: 'demo@xyrostudio.net' }; S.me = DEMO_USER; S.entidades = demoFrom('entities'); return true; }
  await cliente();
  const { data: { session } } = await S.sb.auth.getSession();
  if (!session) return false;
  S.user = session.user;
  const me = await tabla('users', (q) => q.select('*').eq('id', S.user.id).maybeSingle());
  S.me = Array.isArray(me) ? me[0] : me;
  if (!S.me) S.me = { id: S.user.id, display_name: S.user.email, level: 'BRONZE', global_points_lifetime: 0, current_streak_weeks: 0, currency: 'PEN', country: 'PE' };
  // Negocios que administra: dueño o equipo (el RLS de entities ya filtra lo que puede ver)
  const ents = await tabla('entities', (q) => q.select('id,slug,name,type,category,status,plan,boost_until,rating_avg,rating_count,currency,owner_id').or(`owner_id.eq.${S.user.id}`));
  const staff = S.sinCore ? [] : await tabla('entity_staff', (q) => q.select('entity_id,role,entities(id,slug,name,type,category,status,plan,boost_until,rating_avg,rating_count,currency,owner_id)').eq('user_id', S.user.id));
  S.entidades = [...ents, ...staff.map((s) => s.entities).filter(Boolean)].filter((e, i, a) => a.findIndex((x) => x.id === e.id) === i);
  return true;
}

// Modos disponibles para esta cuenta
export const MODOS = {
  user: { t: 'Modo Usuario', d: 'Explora, compra y suma puntos', c: '' },
  control: { t: 'Xyro Control', d: 'Tu negocio o servicio: pedidos, QR, catálogo', c: 'ctl' },
  panel: { t: 'XyroStudio Panel', d: 'Equipo XyroStudio: moderación, soporte, métricas', c: 'adm' },
};
export const puedeModo = (m) => m === 'user' || (m === 'control' && S.entidades.length > 0) || (m === 'panel' && !!(S.me && S.me.staff_role));
export const NIVELES = { BRONZE: ['Bronce', 0], SILVER: ['Plata', 2000], GOLD: ['Oro', 10000], BLACK: ['Black', 50000] };
export const CAT = [['', '✨', 'Todo'], ['gym', '🏋️', 'Gimnasios'], ['entrenador', '🧑‍🏫', 'Entrenadores'], ['cafeteria', '☕', 'Cafeterías'], ['restaurante', '🍽️', 'Restaurantes'], ['ropa', '👕', 'Ropa'], ['barberia', '💈', 'Barberías'], ['digital', '💾', 'Digitales']];

// Foto liviana (webp ≤ max px) a medios/mi/<id>/ (permiso del SQL 57). En demo queda solo en este navegador.
export async function subirFoto(fl, max = 1080) {
  const img = await new Promise((ok, ko) => { const u = URL.createObjectURL(fl), im = new Image(); im.onload = () => ok(im); im.onerror = () => ko(new Error('No pudimos leer esa imagen')); im.src = u; });
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  const cx = c.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.drawImage(img, 0, 0, c.width, c.height);
  let b = await new Promise((r) => c.toBlob(r, 'image/webp', 0.82)), ext = 'webp';
  if (!b || b.type !== 'image/webp') { b = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82)); ext = 'jpg'; }
  if (S.demo || S.sinCore) return URL.createObjectURL(b);
  const path = 'mi/' + S.user.id + '/' + Date.now() + Math.random().toString(36).slice(2, 6) + '.' + ext;
  const { error } = await S.sb.storage.from('medios').upload(path, b, { contentType: b.type, cacheControl: '31536000' });
  if (error) throw error;
  return S.sb.storage.from('medios').getPublicUrl(path).data.publicUrl;
}
export const WA_XYRO = '';

// Animación de puntos ganados
export function ptsFx(n, txt) { vib(); const d = document.createElement('div'); d.className = 'ptsfx'; d.innerHTML = `<b>+${num(n)}</b><span>${esc(txt || 'Xyro Points')}</span>`; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }
