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
].map((p, i) => ({ item_id: 'p' + i, title: p[0], entity_name: p[1], entity_slug: p[2], price: p[3], currency: p[4], rating_avg: p[5], rating_count: p[6], distance_m: p[7], boosted: p[8], photo: null, emoji: p[9], kind: p[10], entity_type: p[11], remote_ok: p[7] == null, entity_id: 'e1' }));
const MKT = [
  { id: 'm1', seller_id: 'u9', description: 'Poco uso, sin óxido. Entrego en Miraflores.', protected_available: true, title: 'Mancuernas 10 kg (par)', price: 120, currency: 'PEN', condition: 'USED', ships: false, status: 'ACTIVE', photos: [], emoji: '🏋️', created_at: new Date(Date.now() - 36e5 * 5).toISOString() },
  { id: 'm2', seller_id: 'u9', protected_available: true, title: 'Zapatillas running talla 42', price: 180, currency: 'PEN', condition: 'LIKE_NEW', ships: true, status: 'ACTIVE', photos: [], emoji: '👟', created_at: new Date(Date.now() - 864e5).toISOString() },
  { id: 'm3', seller_id: 'u9', protected_available: true, title: 'Bicicleta spinning casera', price: 650, currency: 'PEN', condition: 'USED', ships: false, status: 'ACTIVE', photos: [], emoji: '🚲', created_at: new Date(Date.now() - 864e5 * 2).toISOString() },
  { id: 'm4', seller_id: 'u9', protected_available: true, title: 'Proteína whey 2 kg (sellada)', price: 210, currency: 'PEN', condition: 'NEW', ships: true, status: 'ACTIVE', photos: [], emoji: '🥤', created_at: new Date(Date.now() - 864e5 * 3).toISOString() },
];
const FRB = {};
const PMD = [{ type: 'YAPE', dato: '999 888 777', titular: 'Café Aurora' }];
const ORD = [
  { id: 'o1', code: 'A7F3K2Q9', fulfillment_mode: 'IN_STORE', status: 'AWAITING_PAYMENT', total: 36, currency: 'PEN', created_at: new Date(Date.now() - 6e5).toISOString(), buyer_paid_at: new Date(Date.now() - 3e5).toISOString(), buyer_pay_method: 'YAPE', buyer_pay_ref: '4821', buyer_id: 'u2', entity_id: 'e1' },
  { id: 'o2', code: 'B2M8P1X4', fulfillment_mode: 'PICKUP', status: 'PAID', total: 54, currency: 'PEN', created_at: new Date(Date.now() - 36e5).toISOString(), buyer_id: 'u3', entity_id: 'e1' },
  { id: 'o3', code: 'C9Q4T7L1', fulfillment_mode: 'IN_STORE', status: 'COMPLETED', total: 18, currency: 'PEN', created_at: new Date(Date.now() - 36e5 * 3).toISOString(), buyer_id: 'u4', entity_id: 'e1' },
];
const CAT_DEMO = [
  ['Waffles con fresa y nutella', 'Dulces', 18, '🧇', 'Masa crocante, fresas frescas'], ['Pancakes con miel', 'Dulces', 16, '🥞', null],
  ['Cappuccino', 'Bebidas', 9, '☕', null], ['Jugo de naranja', 'Bebidas', 8, '🍊', 'Recién exprimido'],
  ['Sándwich de pollo', 'Salados', 15, '🥪', null], ['Empanada de carne', 'Salados', 7, '🥟', null],
].map((x, i) => ({ id: 'ci' + i, title: x[0], category: x[1], price: x[2], currency: 'PEN', emoji: x[3], description: x[4], photos: [], stock: null, kind: 'PRODUCT', fulfillment_modes: i === 3 || i === 5 ? ['IN_STORE'] : ['IN_STORE', 'PICKUP', 'DELIVERY'] }));
const MY = [
  { id: 'my1', code: 'K3P9Z2M1', status: 'COMPLETED', total: 27, currency: 'PEN', fulfillment_mode: 'IN_STORE', created_at: new Date(Date.now() - 864e5).toISOString(), mystery_prize: null, entity_id: 'e1', entities: { name: 'Café Aurora' }, order_items: [{ title: 'Waffles con fresa y nutella', qty: 1, line_total: 18 }, { title: 'Cappuccino', qty: 1, line_total: 9 }] },
  { id: 'my2', code: 'R8T2W5Q0', status: 'COMPLETED', total: 129, currency: 'PEN', fulfillment_mode: 'IN_STORE', created_at: new Date(Date.now() - 864e5 * 6).toISOString(), mystery_prize: 20, entity_id: 'iron', entities: { name: 'Iron Gym Miraflores' }, order_items: [{ title: 'Plan mensual libre', qty: 1, line_total: 129 }] },
];
const LOCS = [];
MKT.push({ id: 'm5', seller_id: 'demo-user', title: 'Guantes de box 12 oz', price: 85, currency: 'PEN', condition: 'LIKE_NEW', ships: true, protected_available: true, status: 'ACTIVE', photos: [], emoji: '🥊', created_at: new Date(Date.now() - 864e5 * 4).toISOString() });
const P2P = [
  { id: 'pp1', code: 'P2P7Q4K1', status: 'PAID', total: 180, currency: 'PEN', protected: true, commission_amount: 10.8, buyer_id: 'demo-user', seller_user_id: 'u9', listing_id: 'm2', created_at: new Date(Date.now() - 36e5 * 20).toISOString(), payout_at: null, fulfillment_mode: 'P2P', marketplace_listings: { title: 'Zapatillas running talla 42', photos: [] } },
  { id: 'pp2', code: 'P2P3M8X2', status: 'CREATED', total: 85, currency: 'PEN', protected: false, commission_amount: 0, buyer_id: 'u7', seller_user_id: 'demo-user', listing_id: 'm5', created_at: new Date(Date.now() - 36e5 * 3).toISOString(), payout_at: null, fulfillment_mode: 'P2P', marketplace_listings: { title: 'Guantes de box 12 oz', photos: [] } },
  { id: 'pp3', code: 'P2P9T2W6', status: 'AWAITING_PAYMENT', total: 650, currency: 'PEN', protected: true, commission_amount: 39, buyer_id: 'u5', seller_user_id: 'u9', listing_id: 'm3', created_at: new Date(Date.now() - 36e5 * 2).toISOString(), payout_at: null, fulfillment_mode: 'P2P', marketplace_listings: { title: 'Bicicleta spinning casera', photos: [] } },
  { id: 'pp4', code: 'P2P1R5Z8', status: 'COMPLETED', total: 210, currency: 'PEN', protected: true, commission_amount: 12.6, buyer_id: 'u6', seller_user_id: 'u8', listing_id: 'm4', created_at: new Date(Date.now() - 864e5 * 2).toISOString(), payout_at: null, fulfillment_mode: 'P2P', marketplace_listings: { title: 'Proteína whey 2 kg (sellada)', photos: [] } },
];
const MSG = { pp1: [{ id: 1, sender_id: 'u9', body: '¡Hola! Te las envío mañana por Olva.', created_at: new Date(Date.now() - 36e5 * 19).toISOString() }, { id: 2, sender_id: 'demo-user', body: 'Perfecto, gracias 🙌', created_at: new Date(Date.now() - 36e5 * 18).toISOString() }], pp2: [{ id: 3, sender_id: 'u7', body: '¿Los puedo ver el sábado en el parque Kennedy?', created_at: new Date(Date.now() - 36e5 * 2).toISOString() }] };
const TK = [
  { id: 't1', user_id: 'demo-user', subject: 'Pedido #P2P7Q4K1', category: 'P2P_DISPUTE', status: 'PENDING_USER', priority: 1, order_id: 'pp1', messages: [{ de: 'user', t: 'Las zapatillas aún no llegan.', at: new Date(Date.now() - 36e5 * 5).toISOString() }, { de: 'staff', t: 'Hola Valeria, ya escribimos al vendedor. Tu dinero sigue protegido.', at: new Date(Date.now() - 36e5 * 4).toISOString() }], updated_at: new Date(Date.now() - 36e5 * 4).toISOString(), created_at: new Date(Date.now() - 36e5 * 5).toISOString() },
  { id: 't2', user_id: 'u5', subject: 'No me llegó el código de mi pedido', category: 'GENERAL', status: 'OPEN', priority: 2, messages: [{ de: 'user', t: 'Pagué con Yape y no veo el código.', at: new Date(Date.now() - 36e5).toISOString() }], updated_at: new Date(Date.now() - 36e5).toISOString(), created_at: new Date(Date.now() - 36e5).toISOString() },
];
const VAULT = [{ order_id: 'my9', item_id: 'p4', title: 'Ebook: 12 semanas de fuerza', entity_name: 'Coach Diego Ramírez', bought_at: new Date(Date.now() - 864e5 * 3).toISOString(), ready: true }, { order_id: 'my8', item_id: 'p8', title: 'Rutina en casa (PDF)', entity_name: 'Yoga con Ana', bought_at: new Date(Date.now() - 864e5).toISOString(), ready: false }];
const VID = [
  { id: 'v1', entity_id: 'e1', status: 'DONE', template: 'promo', prompt: 'Waffles del día con música alegre', r2_key: 'https://xyrostudio.net/', watermark: true, created_at: new Date(Date.now() - 864e5 * 40).toISOString(), entities: { name: 'Café Aurora' } },
  { id: 'v2', entity_id: 'e1', status: 'QUEUED', template: 'menu', prompt: 'Carta de bebidas', r2_key: null, watermark: true, created_at: new Date(Date.now() - 36e5).toISOString(), entities: { name: 'Café Aurora' } },
];
let DIGI = {};
export function demoMkSave(m) { const i = MKT.findIndex((x) => x.id === m.id); if (i >= 0) MKT[i] = { ...MKT[i], ...m }; else MKT.unshift(m); }
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
  if (t === 'my_orders') return c([...MY, ...P2P.filter((o) => o.buyer_id === 'demo-user' || o.seller_user_id === 'demo-user')]);
  if (t === 'catalog_items') return c(CAT_DEMO);
  if (t === 'locations') return c(LOCS);
  if (t === 'p2p_orders') return c(P2P);
  if (t.startsWith('p2p_messages:')) return c(MSG[t.split(':')[1]] || []);
  if (t === 'my_tickets') return c(TK.filter((x) => x.user_id === 'demo-user'));
  if (t === 'tickets') return c(TK);
  if (t === 'video_jobs') return c(VID);
  if (t === 'listings_reported') return c(MKT.filter((m) => m.reports).length ? MKT.filter((m) => m.reports) : [{ ...MKT[2], reports: 3 }]);
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
  if (f === 'xy_create_order') {
    const its = (a.p_items || []).map((x) => { const ci = CAT_DEMO.find((y) => y.id === x.id) || CAT_DEMO[0]; return { title: ci.title, qty: x.qty, line_total: ci.price * x.qty }; });
    const tot = its.reduce((s, x) => s + x.line_total, 0), id = 'my' + Date.now();
    MY.unshift({ id, code: Math.random().toString(36).slice(2, 10).toUpperCase(), status: 'AWAITING_PAYMENT', total: tot, currency: 'PEN', fulfillment_mode: a.p_mode, created_at: new Date().toISOString(), mystery_prize: null, entity_id: a.p_entity, entities: { name: 'Café Aurora' }, order_items: its });
    return { ok: true, order_id: id, total: tot, currency: 'PEN', delivery_pin: a.p_mode === 'DELIVERY' ? String(Math.floor(1000 + Math.random() * 9000)) : null };
  }
  if (f === 'xy_mystery_open') { const o = MY.find((x) => x.id === a.p_order); const pts = [5, 10, 20, 30, 50, 100][Math.floor(Math.random() * 6)]; if (o) o.mystery_prize = pts; return { ok: true, points: pts }; }
  if (f === 'xy_confirm_handoff') { const o = MY.find((x) => x.id === a.p_order) || ORD.find((x) => x.id === a.p_order); if (o) o.status = 'COMPLETED'; return { ok: true, mystery_box: true }; }
  if (f === 'xy_location_set') { LOCS.splice(0, 9, { id: 'loc1', name: a.p_name || 'Principal', address: a.p_address || null }); return { ok: true, location_id: 'loc1', qr_updated: 2 }; }
  if (f === 'confirm_order_and_distribute_points') { const m = MY.find((x) => x.id === a.p_order); if (m) { m.status = m.fulfillment_mode === 'IN_STORE' ? 'COMPLETED' : 'PAID'; return { ok: true, points: { local: 22, global: 5, entity: 5 } }; } const o = ORD.find((x) => x.id === a.p_order); if (o) o.status = o.fulfillment_mode === 'IN_STORE' ? 'COMPLETED' : 'PAID'; return { ok: true, points: { local: 78, global: 19, entity: 19 } }; }
  if (f === 'xy_qr_create') { const t = 'demo' + Math.random().toString(36).slice(2, 10); return { id: 'q' + Date.now(), qr_secret_token: t, url: location.origin + '/x/?q=' + t }; }
  if (f === 'xy_entity_review') { const i = PEND.findIndex((x) => x.id === a.p_entity); if (i >= 0) PEND.splice(i, 1); return { ok: true }; }
  if (f === 'xy_checkin') {
    if (!a.p_token) throw new Error('QR no válido o desactivado');
    if (/lejos/.test(a.p_token)) return { ok: false, reason: 'FAR', max_m: 50, entity_name: 'Iron Gym Miraflores', message: 'Estás a unos 320 m. Acércate a la entrada (máximo 50 m).' };
    if (/sinplan/.test(a.p_token)) return { ok: false, reason: 'NO_PLAN', entity_name: 'Iron Gym Miraflores', message: 'No tienes un plan activo aquí. Renueva tu plan para entrar.' };
    return { ok: true, visit_id: 1, entity_name: 'Iron Gym Miraflores', checkpoint: 'Entrada', kind: 'PASS', days_left: 18, sessions_left: null };
  }
  if (f === 'xy_boost') { E[0].boost_until = new Date(Date.now() + 36e5 * (a.p_hours || 1)).toISOString(); return { ok: true }; }
  if (f === 'xy_create_p2p_order') { const l = MKT.find((x) => x.id === a.p_listing); if (!l) throw new Error('Publicación no disponible'); if (l.seller_id === 'demo-user') throw new Error('No puedes comprar tu propia publicación');
    const id = 'pp' + Date.now(); l.status = 'RESERVED'; P2P.unshift({ id, code: Math.random().toString(36).slice(2, 10).toUpperCase(), status: a.p_protected ? 'AWAITING_PAYMENT' : 'CREATED', total: l.price, currency: l.currency, protected: !!a.p_protected, commission_amount: a.p_protected ? +(l.price * 0.06).toFixed(2) : 0, buyer_id: 'demo-user', seller_user_id: l.seller_id, listing_id: l.id, created_at: new Date().toISOString(), payout_at: null, fulfillment_mode: 'P2P', marketplace_listings: { title: l.title, photos: l.photos } });
    if (a.p_protected) setTimeout(() => { const o = P2P.find((x) => x.id === id); if (o && o.status === 'AWAITING_PAYMENT') o.status = 'PAID'; }, 5000);
    return { ok: true, order_id: id, protected: !!a.p_protected }; }
  const po = P2P.find((x) => x.id === a.p_order);
  if (f === 'xy_p2p_release') { po.status = 'COMPLETED'; const l = MKT.find((x) => x.id === po.listing_id); if (l) l.status = 'SOLD'; return { ok: true, points: { global: Math.round(po.total * 0.27 * 2) } }; }
  if (f === 'xy_p2p_close') { if (a.p_action === 'SOLD') { po.status = 'COMPLETED'; const l = MKT.find((x) => x.id === po.listing_id); if (l) l.status = 'SOLD'; } else { po.status = 'CANCELLED'; const l = MKT.find((x) => x.id === po.listing_id); if (l && l.status === 'RESERVED') l.status = 'ACTIVE'; } return { ok: true }; }
  if (f === 'xy_p2p_mark_paid') { po.status = 'PAID'; return { ok: true }; }
  if (f === 'xy_p2p_payout') { po.payout_at = new Date().toISOString(); return { ok: true, amount: po.total - po.commission_amount }; }
  if (f === 'p2p_msg') { (MSG[a.p_order] = MSG[a.p_order] || []).push({ id: Date.now(), sender_id: 'demo-user', body: a.body, created_at: new Date().toISOString() }); return { ok: true }; }
  if (f === 'xy_order_dispute') { if (String(a.p_text || '').trim().length < 10) throw new Error('Cuéntanos un poco más (mínimo 10 letras)'); const o = po || MY.find((x) => x.id === a.p_order) || {}; if (po && po.status === 'PAID') po.status = 'DISPUTED';
    TK.unshift({ id: 't' + Date.now(), user_id: 'demo-user', subject: 'Pedido #' + (o.code || ''), category: po ? 'P2P_DISPUTE' : 'ORDER', status: 'OPEN', priority: 1, messages: [{ de: 'user', t: a.p_text, at: new Date().toISOString() }], updated_at: new Date().toISOString(), created_at: new Date().toISOString() }); return { ok: true }; }
  if (f === 'ticket_new') { TK.unshift({ id: 't' + Date.now(), user_id: 'demo-user', subject: a.subject, category: 'GENERAL', status: 'OPEN', priority: 2, messages: [{ de: 'user', t: a.t, at: new Date().toISOString() }], updated_at: new Date().toISOString(), created_at: new Date().toISOString() }); return { ok: true }; }
  if (f === 'xy_ticket_reply') { const t = TK.find((x) => x.id === a.p_ticket); if (t) { if (String(a.p_text || '').trim()) t.messages.push({ de: a.p_status ? 'staff' : 'user', t: a.p_text, at: new Date().toISOString() }); t.status = a.p_status || 'OPEN'; t.updated_at = new Date().toISOString(); } return { ok: true }; }
  if (f === 'xy_vault') return JSON.parse(JSON.stringify(VAULT));
  if (f === 'xy_digital_get') return { ok: true, url: 'https://xyrostudio.net/terminos.html' };
  if (f === 'xy_digital_set') { if (a.p_link && !/^https:\/\/\S{4,}$/.test(a.p_link)) throw new Error('Pega un enlace que empiece con https://'); DIGI[a.p_item] = a.p_link; return { ok: true }; }
  if (f === 'xy_listing_report') return { ok: true, reports: 1 };
  if (f === 'xy_queue_video') { if (VID.filter((v) => new Date(v.created_at).getMonth() === new Date().getMonth()).length >= 2) throw new Error('Usaste tus 2 videos gratis de este mes. Compra créditos para más.'); VID.unshift({ id: 'v' + Date.now(), entity_id: a.p_entity, status: 'QUEUED', template: a.p_template, prompt: a.p_prompt, r2_key: null, watermark: true, created_at: new Date().toISOString(), entities: { name: 'Café Aurora' } }); return { ok: true, free_left: 0 }; }
  if (f === 'xy_video_set') { const v = VID.find((x) => x.id === a.p_job); if (a.p_status === 'DONE' && !/^https:\/\/\S{4,}$/.test(a.p_link || '')) throw new Error('Pega el enlace del video (https://)'); if (v) { v.status = a.p_status; if (a.p_status === 'DONE') v.r2_key = a.p_link; } return { ok: true }; }
  if (f === 'xy_paymethods_get') return JSON.parse(JSON.stringify(PMD));
  if (f === 'xy_paymethods_set') { PMD.length = 0; PMD.push(...(a.p_methods || []).slice(0, 4)); return { ok: true }; }
  if (f === 'xy_entity_features') { const e = E.find((x) => x.id === a.p_entity) || E[0], pro = e.plan !== 'FREE'; return { plan: e.plan, tier: e.plan, pro, type: e.type, max_students: pro ? null : 50, max_clients: pro ? null : 50, max_items: pro ? null : 6, max_qrs: pro ? null : 2, qrs: 2, web: e.plan === 'PRO', students: 3, clients: 38, items: 4, edits_free_left: Math.max(0, 2 - VID.length), edits_credits: pro ? 15 : 0, watermark: !pro, bots: pro, business_points: 312 }; }
  if (f === 'xy_set_plan') { const e = E.find((x) => x.id === a.p_entity); if (e) { e.plan = a.p_plan; e.plan_until = a.p_plan === 'FREE' ? null : new Date(Date.now() + 864e5 * 30).toISOString(); } return { ok: true }; }
  if (f === 'xy_fraud_signals') return [{ entity: 'e1', name: 'Café Aurora', blocked: !!FRB.e1, nivel: 'b', tipo: 'CONCENTRACION', detalle: '14 de 16 pedidos son de solo 3 clientes' }];
  if (f === 'xy_entity_points_block') { FRB[a.p_entity] = a.p_block; return { ok: true, reversed: a.p_block ? 4 : 0 }; }
  if (f === 'xy_points_release') return 0;
  if (f === 'xy_users_public') return [{ id: 'u9', display_name: 'Carlos M.' }];
  return { ok: true };
}
