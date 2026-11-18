// Xyro · datos de ejemplo (?demo=1, o mientras el SQL 76 no esté corrido). Nada de esto toca la base.
export const DEMO_USER = { id: 'demo-user', username: 'vale', display_name: 'Valeria Torres', level: 'SILVER', global_points_lifetime: 3420, current_streak_weeks: 3, streak_week_count: 1, currency: 'PEN', country: 'PE', staff_role: 'SUPERADMIN', xyro_pass_until: null };
const E = [
  { id: 'e1', slug: 'cafe-aurora', name: 'Café Aurora', type: 'PHYSICAL', category: 'cafeteria', status: 'ACTIVE', plan: 'PRO', boost_until: new Date(Date.now() + 36e5 * 3).toISOString(), rating_avg: 4.8, rating_count: 126, currency: 'PEN', owner_id: 'demo-user' },
];
const PROD = [
  ['Waffles con fresa y nutella', 'Café Aurora', 'cafe-aurora', 18, 'PEN', 4.8, 126, 240, true, '🧇', 'PRODUCT', 'PHYSICAL'],
  ['Plan mensual libre', 'Iron Gym Miraflores', 'iron-gym', 129, 'PEN', 4.7, 312, 600, false, '🏋️', 'MEMBERSHIP', 'PHYSICAL'],
  ['Pack 8 sesiones personalizadas', 'Coach Diego Ramírez', 'coach-diego', 480, 'PEN', 4.9, 38, null, false, '🧑‍🏫', 'CLASS_PACK', 'PROFESSIONAL'],
  ['Polera oversize negra', 'Nómada Store', 'nomada', 59, 'PEN', 4.6, 88, null, true, '👕', 'PRODUCT', 'DELIVERY_ECOMMERCE'],
  ['Ebook: 12 semanas de fuerza', 'Coach Diego Ramírez', 'coach-diego', 9.9, 'USD', 5, 12, null, false, '📘', 'DIGITAL', 'DIGITAL_PRODUCTS'],
  ['Corte + barba', 'Barbería Clásica', 'barberia-clasica', 35, 'PEN', 4.6, 41, 1300, false, '💈', 'SERVICE', 'PHYSICAL'],
  ['Ceviche clásico', 'Cevichería La Mar', 'la-mar', 42, 'PEN', 4.5, 203, 900, false, '🐟', 'PRODUCT', 'PHYSICAL'],
  ['Clase de inglés online', 'Profe Lucía Torres', 'profe-lucia', 15, 'USD', 5, 9, null, false, '📚', 'SESSION', 'PROFESSIONAL'],
].map((p, i) => ({ item_id: 'p' + i, title: p[0], entity_name: p[1], entity_slug: p[2], price: p[3], currency: p[4], rating_avg: p[5], rating_count: p[6], distance_m: p[7], boosted: p[8], photo: null, emoji: p[9], kind: p[10], entity_type: p[11], remote_ok: p[7] == null }));
const MKT = [
  { id: 'm1', title: 'Mancuernas 10 kg (par)', price: 120, currency: 'PEN', condition: 'USED', ships: false, status: 'ACTIVE', photos: [], emoji: '🏋️', created_at: new Date(Date.now() - 36e5 * 5).toISOString() },
  { id: 'm2', title: 'Zapatillas running talla 42', price: 180, currency: 'PEN', condition: 'LIKE_NEW', ships: true, status: 'ACTIVE', photos: [], emoji: '👟', created_at: new Date(Date.now() - 864e5).toISOString() },
  { id: 'm3', title: 'Bicicleta spinning casera', price: 650, currency: 'PEN', condition: 'USED', ships: false, status: 'ACTIVE', photos: [], emoji: '🚲', created_at: new Date(Date.now() - 864e5 * 2).toISOString() },
  { id: 'm4', title: 'Proteína whey 2 kg (sellada)', price: 210, currency: 'PEN', condition: 'NEW', ships: true, status: 'ACTIVE', photos: [], emoji: '🥤', created_at: new Date(Date.now() - 864e5 * 3).toISOString() },
];
const ORD = [
  { id: 'o1', code: 'A7F3K2Q9', fulfillment_mode: 'IN_STORE', status: 'AWAITING_PAYMENT', total: 36, currency: 'PEN', created_at: new Date(Date.now() - 6e5).toISOString(), buyer_id: 'u2', entity_id: 'e1' },
  { id: 'o2', code: 'B2M8P1X4', fulfillment_mode: 'PICKUP', status: 'PAID', total: 54, currency: 'PEN', created_at: new Date(Date.now() - 36e5).toISOString(), buyer_id: 'u3', entity_id: 'e1' },
  { id: 'o3', code: 'C9Q4T7L1', fulfillment_mode: 'IN_STORE', status: 'COMPLETED', total: 18, currency: 'PEN', created_at: new Date(Date.now() - 36e5 * 3).toISOString(), buyer_id: 'u4', entity_id: 'e1' },
];
const PEND = [
  { id: 'e9', slug: 'nomada', name: 'Nómada Store', type: 'DELIVERY_ECOMMERCE', category: 'ropa', status: 'PENDING', country: 'PE', created_at: new Date(Date.now() - 36e5 * 2).toISOString() },
  { id: 'e8', slug: 'yoga-ana', name: 'Yoga con Ana', type: 'PROFESSIONAL', category: 'entrenador', status: 'PENDING', country: 'MX', created_at: new Date(Date.now() - 36e5 * 9).toISOString() },
];

export function demoFrom(t) {
  const c = (x) => JSON.parse(JSON.stringify(x));
  if (t === 'users') return [c(DEMO_USER)];
  if (t === 'entities') return c(E);
  if (t === 'entities_pending') return c(PEND);
  if (t === 'entity_staff') return [];
  if (t === 'marketplace_listings') return c(MKT);
  if (t === 'orders') return c(ORD);
  if (t === 'points_balances') return [
    { user_id: 'demo-user', entity_id: null, bucket: 'USER_GLOBAL', available: 684, pending: 22 },
    { user_id: 'demo-user', entity_id: 'e1', bucket: 'USER_LOCAL', available: 1240, pending: 0, entity_name: 'Café Aurora' },
    { user_id: 'demo-user', entity_id: 'iron', bucket: 'USER_LOCAL', available: 560, pending: 86, entity_name: 'Iron Gym Miraflores' },
  ];
  if (t === 'entity_points') return [{ entity_id: 'e1', bucket: 'ENTITY_GLOBAL', available: 312, pending: 0 }];
  if (t === 'user_entity_memberships') return [
    { id: 'ms1', entity_id: 'iron', kind: 'PASS', status: 'ACTIVE', valid_from: new Date(Date.now() - 864e5 * 12).toISOString(), valid_until: new Date(Date.now() + 864e5 * 18).toISOString(), entities: { name: 'Iron Gym Miraflores', slug: 'iron-gym', category: 'gym', phone: '51936449066' }, emoji: '🏋️' },
    { id: 'ms2', entity_id: 'coach', kind: 'CLASS_PACK', status: 'ACTIVE', sessions_left: 5, valid_from: new Date(Date.now() - 864e5 * 20).toISOString(), valid_until: new Date(Date.now() + 864e5 * 40).toISOString(), entities: { name: 'Coach Diego Ramírez', slug: 'coach-diego', category: 'entrenador', phone: null }, emoji: '🧑‍🏫' },
    { id: 'ms4', entity_id: 'yoga', kind: 'PASS', status: 'ACTIVE', valid_from: new Date(Date.now() - 864e5 * 28).toISOString(), valid_until: new Date(Date.now() + 864e5 * 2).toISOString(), entities: { name: 'Yoga con Ana', slug: 'yoga-ana', category: 'entrenador', phone: null }, emoji: '🧘' },
    { id: 'ms3', entity_id: 'e1', kind: 'STAMP_CARD', status: 'ACTIVE', stamps: 6, entities: { name: 'Café Aurora', slug: 'cafe-aurora', category: 'cafeteria' }, emoji: '☕' },
  ];
  if (t === 'qr_checkpoints') return [{ id: 'q1', label: 'Mesa 1', kind: 'TABLE', active: true }, { id: 'q2', label: 'Recepción', kind: 'RECEPTION', active: true }];
  return [];
}

export async function demoRpc(f, a) {
  await new Promise((r) => setTimeout(r, 250));
  if (f === 'search_nearby_products') {
    const q = String(a.p_query || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const cat = a.p_category;
    const catOk = (p) => !cat || (cat === 'digital' ? p.kind === 'DIGITAL' : cat === 'entrenador' ? p.entity_type === 'PROFESSIONAL'
      : cat === 'ropa' ? /polera/i.test(p.title) : cat === 'cafeteria' ? /waffle/i.test(p.title) : cat === 'gym' ? p.kind === 'MEMBERSHIP' : cat === 'barberia' ? /corte/i.test(p.title) : cat === 'restaurante' ? /ceviche/i.test(p.title) : true);
    const L = PROD.filter((p) => catOk(p) && (!q || q.split(/\s+/).every((w) => (p.title + ' ' + p.entity_name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/(.)\1/g, '$1').includes(w.replace(/(.)\1/g, '$1').slice(0, Math.max(3, w.length - 1))))));
    return L.sort((x, y) => (y.boosted - x.boosted) || (((y.rating_avg * y.rating_count) + 20) / (y.rating_count + 5) - ((x.rating_avg * x.rating_count) + 20) / (x.rating_count + 5)) || ((x.distance_m ?? 1e9) - (y.distance_m ?? 1e9)));
  }
  if (f === 'verify_qr_and_distance') {
    if (!a.p_token) throw new Error('QR no válido o desactivado');
    if (a.p_lat == null) throw new Error('Activa tu ubicación para comprar en el local');
    return /lejos/.test(a.p_token) ? { ok: false, mode: 'SHOWCASE', message: 'Estás lejos del local: puedes ver la carta en modo vitrina.' }
      : { ok: true, mode: 'IN_STORE', qr_session_id: 'qs-demo', entity_id: 'e1', checkpoint: 'Mesa 1', expires_in_min: 120 };
  }
  if (f === 'confirm_order_and_distribute_points') { const o = ORD.find((x) => x.id === a.p_order); if (o) o.status = o.fulfillment_mode === 'IN_STORE' ? 'COMPLETED' : 'PAID'; return { ok: true, points: { local: 78, global: 19, entity: 19 } }; }
  if (f === 'xy_qr_create') { const t = 'demo' + Math.random().toString(36).slice(2, 10); return { id: 'q' + Date.now(), qr_secret_token: t, url: location.origin + '/x/?q=' + t }; }
  if (f === 'xy_entity_review') { const i = PEND.findIndex((x) => x.id === a.p_entity); if (i >= 0) PEND.splice(i, 1); return { ok: true }; }
  if (f === 'xy_checkin') {
    if (!a.p_token) throw new Error('QR no válido o desactivado');
    if (/lejos/.test(a.p_token)) return { ok: false, reason: 'FAR', max_m: 50, entity_name: 'Iron Gym Miraflores', message: 'Estás a unos 320 m. Acércate a la entrada (máximo 50 m).' };
    if (/sinplan/.test(a.p_token)) return { ok: false, reason: 'NO_PLAN', entity_name: 'Iron Gym Miraflores', message: 'No tienes un plan activo aquí. Renueva tu plan para entrar.' };
    return { ok: true, visit_id: 1, entity_name: 'Iron Gym Miraflores', checkpoint: 'Entrada', kind: 'PASS', days_left: 18, sessions_left: null };
  }
  if (f === 'xy_boost') { E[0].boost_until = new Date(Date.now() + 36e5 * (a.p_hours || 1)).toISOString(); return { ok: true }; }
  return { ok: true };
}
