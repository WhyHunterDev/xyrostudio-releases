// Xyro · Xyro Control (negocios y servicios): resumen, pedidos, QR, Boost, catálogo (con fotos y digitales) y videos (Xyro Edits).
// Todo pasa por funciones de la base (SQL 76): el navegador nunca reparte puntos ni cambia montos.
import { S, $, $$, esc, I, rpc, tabla, money, num, hora, fecha, toast, hoja, errDe, cargaJS, ls, ubicar, subirFoto, ptsFx, WA_XYRO } from '../core.js';

const EST = { CREATED: ['Nuevo', ''], AWAITING_PAYMENT: ['Por cobrar', 'warn'], PAID: ['Pagado', 'ok'], READY: ['Listo', 'ok'], IN_TRANSIT: ['En camino', ''], COMPLETED: ['Completado', 'ok'], CANCELLED: ['Cancelado', 'bad'], DISPUTED: ['En disputa', 'bad'], REFUNDED: ['Devuelto', 'bad'] };
const MOD = { IN_STORE: 'En el local', PICKUP: 'Para recoger', DELIVERY: 'Delivery', DIGITAL: 'Digital', P2P: 'P2P' };
const PAGO = [['YAPE', 'Yape'], ['PLIN', 'Plin'], ['CASH', 'Efectivo'], ['CARD', 'Tarjeta'], ['TRANSFER', 'Transferencia']];

function entidad() {
  const id = ls.g('x-ent');
  S.entidad = S.entidades.find((e) => e.id === id) || S.entidades[0] || null;
  return S.entidad;
}
function cabecera(el, titulo, sub) {
  const e = S.entidad, varias = S.entidades.length > 1;
  el.insertAdjacentHTML('beforeend', `<div class="row wrap"><div class="sp"><h1>${titulo}</h1><p class="mu">${sub}</p></div>
    ${varias ? `<select id="ent" style="width:auto;max-width:100%">${S.entidades.map((x) => `<option value="${x.id}" ${x.id === e.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>` : `<span class="pill">${esc(e.name)}</span>`}</div>`);
  const s = $('#ent', el); s && (s.onchange = () => { ls.s('x-ent', s.value); dispatchEvent(new HashChangeEvent('hashchange')); });
  if (e.status === 'PENDING') el.insertAdjacentHTML('beforeend', '<div class="aviso" style="margin:0">⏳ Tu negocio está en revisión. Mientras tanto puedes preparar tus QR; aparecerás en Explorar cuando lo aprobemos.</div>');
}

export async function vista(r, el) {
  if (!entidad()) { el.innerHTML = '<div class="vacio"><div class="e">🏪</div><b>Aún no tienes un negocio</b><a class="btn p" href="/#/entrar">Registrarlo gratis</a></div>'; return; }
  if (S.entidad.type === 'PROFESSIONAL') { document.querySelectorAll('#tabs a[href="#/c-qr"],#side a[href="#/c-qr"]').forEach((a) => a.remove()); if (r === 'c-qr') { location.hash = '#/c-inicio'; return; } }
  if (r === 'c-inicio') return inicio(el);
  if (r === 'c-pedidos') return pedidos(el);
  if (r === 'c-qr') return qrs(el);
  if (r === 'c-boost') return boost(el);
  if (r === 'c-catalogo') return catalogo(el);
  if (r === 'c-videos') { location.hash = '#/c-inicio'; return; } // Xyro Edits oculto hasta lanzarlo
}

const deHoy = (o) => new Date(o.created_at).toDateString() === new Date().toDateString();
const cargarPedidos = () => tabla('orders', (q) => q.select('id,code,fulfillment_mode,status,total,currency,created_at,payment_method,buyer_paid_at,buyer_pay_method,buyer_pay_ref,notes,delivery_address,order_items(title,qty)').eq('entity_id', S.entidad.id).order('created_at', { ascending: false }).limit(60))
  .then((L) => L.filter((o) => !o.entity_id || o.entity_id === S.entidad.id));
const ptsNegocio = async () => {
  const B = await tabla('points_balances', (q) => q.select('available,pending').eq('entity_id', S.entidad.id).eq('bucket', 'ENTITY_GLOBAL'), 'entity_points');
  return B.reduce((a, b) => a + (+b.available || 0), 0);
};

async function inicio(el) {
  cabecera(el, 'Resumen', 'Lo importante de hoy en tu negocio.');
  el.insertAdjacentHTML('beforeend', `<div class="kpis" id="k">${Array(4).fill('<div class="sk" style="height:86px"></div>').join('')}</div>
    <div class="dos"><div class="card"><div class="row"><b class="sp">Últimos pedidos</b><a class="btn sm" href="#/c-pedidos">Ver todos</a></div><div id="ul"></div></div>
    <div class="card"><b>Accesos rápidos</b>
      ${S.entidad.type === 'PROFESSIONAL' ? '' : `<a class="li" href="#/c-qr" style="text-decoration:none"><span class="ico">${I.qr}</span><span class="sp">Crear QR de mesa o mostrador</span>›</a>`}
      <a class="li" href="#/c-boost" style="text-decoration:none"><span class="ico">${I.bolt}</span><span class="sp">Destacar mi negocio (Boost)</span>›</a>
      <a class="li" href="/app/" style="text-decoration:none"><span class="ico">${I.catalog}</span><span class="sp">Abrir mi panel completo</span>›</a></div></div>
    <div class="dos"><div class="card" id="pm"><div class="sk" style="height:60px"></div></div><div class="card" id="pl"><div class="sk" style="height:60px"></div></div></div>`);
  pagosCard($('#pm', el)); planCard($('#pl', el));
  try {
    const [O, P] = await Promise.all([cargarPedidos(), ptsNegocio()]);
    const H = O.filter(deHoy), cobrado = H.filter((o) => ['PAID', 'READY', 'IN_TRANSIT', 'COMPLETED'].includes(o.status)).reduce((a, o) => a + (+o.total || 0), 0);
    const cur = S.entidad.currency || 'PEN', e = S.entidad;
    $('#k', el).innerHTML = `<div class="kpi"><span class="mu xs">Vendido hoy</span><b>${money(cobrado, cur)}</b><span class="mu xs">${H.length} pedidos</span></div>
      <div class="kpi"><span class="mu xs">Por cobrar</span><b>${O.filter((o) => o.status === 'AWAITING_PAYMENT' || o.status === 'CREATED').length}</b><span class="mu xs">confirma el pago</span></div>
      <div class="kpi"><span class="mu xs">Puntos del negocio</span><b>${num(P)}</b><span class="mu xs">para Boost</span></div>
      <div class="kpi"><span class="mu xs">Calificación</span><b>${+e.rating_count ? '★ ' + (+e.rating_avg).toFixed(1) : '—'}</b><span class="mu xs">${num(e.rating_count)} reseñas verificadas</span></div>`;
    $('#ul', el).innerHTML = O.slice(0, 5).map(filaPedido).join('') || '<p class="mu sm">Aún no hay pedidos.</p>';
  } catch (e) { toast(errDe(e)); }
}

// ---------- Cómo te pagan (privado: solo se muestra dentro de una orden) y tu plan ----------
const PMT = [['YAPE', 'Yape'], ['PLIN', 'Plin'], ['TRANSFER', 'Transferencia']];
async function pagosCard(box) {
  let M = [];
  const pinta = () => {
    box.innerHTML = `<div class="row"><b class="sp">💳 Cómo te pagan</b><button class="btn sm" id="pmE">Editar</button></div>
      <span class="mu xs">Tus clientes los ven solo dentro de su orden en Xyro, nunca en público.</span>
      ${M.length ? M.map((m) => `<div class="li"><span class="ico">💸</span><span class="sp"><b class="sm">${esc((PMT.find((p) => p[0] === m.type) || ['', m.type])[1])}</b><br><span class="mu xs">${esc(m.dato || '')}${m.titular ? ' · ' + esc(m.titular) : ''}</span></span></div>`).join('')
        : '<p class="sm" style="color:#fbbf24">Aún no agregas cómo te pagan: tus clientes no podrán pagarte.</p>'}`;
    $('#pmE', box).onclick = editar;
  };
  const editar = () => hoja(`<h2>Cómo te pagan</h2><p class="mu sm">Hasta 3. Número de Yape/Plin o cuenta/CCI.</p>
    ${[0, 1, 2].map((i) => { const m = M[i] || {}; return `<div class="card" style="background:var(--c2);gap:6px"><select data-ty="${i}"><option value="">— Ninguno —</option>${PMT.map(([k, t]) => `<option value="${k}" ${m.type === k ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <input data-da="${i}" maxlength="120" placeholder="Número o cuenta" value="${esc(m.dato || '')}"><input data-ti="${i}" maxlength="80" placeholder="A nombre de (opcional)" value="${esc(m.titular || '')}"></div>`; }).join('')}
    <button class="btn p" id="ok">Guardar</button><button class="btn l" data-x>Cancelar</button>`, (h, close) => {
    $('#ok', h).onclick = async (ev) => {
      const L = [0, 1, 2].map((i) => ({ type: $(`[data-ty="${i}"]`, h).value, dato: $(`[data-da="${i}"]`, h).value.trim(), titular: $(`[data-ti="${i}"]`, h).value.trim() || null })).filter((m) => m.type);
      if (L.some((m) => m.dato.length < 6)) return toast('Escribe el número o cuenta completo');
      ev.target.disabled = true;
      try { await rpc('xy_paymethods_set', { p_entity: S.entidad.id, p_methods: L }); M = L; close(); pinta(); toast('Guardado ✓'); } catch (e) { toast(errDe(e)); ev.target.disabled = false; }
    };
  });
  try { const d = await rpc('xy_paymethods_get', { p_entity: S.entidad.id }); M = Array.isArray(d) ? d : (d && d.methods) || []; } catch (_) {}
  pinta();
}
async function planCard(box) {
  let f = null; try { f = await rpc('xy_entity_features', { p_entity: S.entidad.id }); } catch (_) {}
  if (!f) { box.innerHTML = '<b>Tu plan</b><p class="mu sm">No disponible por ahora.</p>'; return; }
  const lim = (n, m) => m == null ? `${num(n)} (ilimitado)` : `${num(n)} de ${num(m)}`;
  const T = { FREE: 'Gratis', PLUS: 'Plus', PRO: 'Pro', ENTERPRISE: 'Empresa' }, t = f.tier || (f.pro ? 'PRO' : 'FREE'), sig = t === 'FREE' ? 'Plus' : t === 'PLUS' ? 'Pro' : null;
  box.innerHTML = `<div class="row"><b class="sp">Tu plan</b><span class="pill ${f.pro ? 'ok' : ''}">${f.pro ? '⭐ ' : ''}${T[t] || t}</span></div>
    <div class="li"><span class="ico">👥</span><span class="sp sm">${f.type === 'PROFESSIONAL' ? 'Alumnos' : 'Clientes'} activos: <b>${lim(f.clients ?? f.students, f.max_clients ?? f.max_students)}</b></span></div>
    ${f.max_qrs !== undefined ? `<div class="li"><span class="ico">${I.qr}</span><span class="sp sm">Códigos QR: <b>${lim(f.qrs, f.max_qrs)}</b></span></div>` : ''}
    <div class="li"><span class="ico">🏷️</span><span class="sp sm">Planes o productos: <b>${lim(f.items, f.max_items)}</b></span></div>
    <div class="li"><span class="ico">🌐</span><span class="sp sm">${f.web ? '<b>Tu web en xyrostudio.net incluida</b>' : 'Web propia: solo en Pro'}</span></div>
    ${sig ? `<a class="btn p w" target="_blank" rel="noopener" href="https://wa.me/${WA_XYRO}?text=${encodeURIComponent('Hola XyroStudio, quiero el plan ' + sig + ' para ' + (S.entidad.name || 'mi negocio'))}">⭐ Pasar a ${sig}</a><span class="mu xs">${sig === 'Plus' ? 'Plus: 2,000 clientes, 25 productos, 10 QR y mesas, 5 videos al mes sin marca.' : 'Pro: sin límites, tu web en xyrostudio.net, 15 videos al mes y Bots al lanzarse.'}</span>` : ''}`;
}

const filaPedido = (o) => `<div class="li"><span class="ico">${I.orders}</span><span class="sp"><b>#${esc(o.code)}</b> <span class="pill ${EST[o.status] ? EST[o.status][1] : ''}">${EST[o.status] ? EST[o.status][0] : esc(o.status)}</span><br>
  <span class="mu xs">${MOD[o.fulfillment_mode] || ''} · ${hora(o.created_at)}</span>
  ${o.order_items && o.order_items.length ? `<br><span class="xs">${o.order_items.map((x) => `${x.qty}× ${esc(x.title)}`).join(', ')}</span>` : ''}
  ${o.buyer_paid_at && ['CREATED', 'AWAITING_PAYMENT'].includes(o.status) ? `<br><span class="pill warn">💸 Dice que pagó${o.buyer_pay_method ? ' por ' + ((PAGO.find((p) => p[0] === o.buyer_pay_method) || ['', 'transferencia'])[1]) : ''}${o.buyer_pay_ref ? ' · op. ' + esc(o.buyer_pay_ref) : ''}</span>` : ''}
  ${o.notes ? `<br><span class="xs mu">📝 ${esc(o.notes)}</span>` : ''}${o.delivery_address && o.delivery_address.direccion ? `<br><span class="xs mu">📍 ${esc(o.delivery_address.direccion)}</span>` : ''}</span><b>${money(o.total, o.currency)}</b></div>`;

async function pedidos(el) {
  cabecera(el, 'Pedidos', 'Confirma el pago y el cliente recibe sus puntos al instante.');
  el.insertAdjacentHTML('beforeend', `<div class="seg" id="fl"><button data-f="cob" class="on">Por cobrar</button><button data-f="cur">En curso</button><button data-f="all">Todos</button></div><div class="card" id="lp"><div class="sk" style="height:120px"></div></div>`);
  let O = [], f = 'cob';
  const pinta = () => {
    const L = O.filter((o) => f === 'all' || (f === 'cob' ? ['CREATED', 'AWAITING_PAYMENT'].includes(o.status) : ['PAID', 'READY', 'IN_TRANSIT'].includes(o.status)));
    $('#lp', el).innerHTML = L.length ? L.map((o) => `${filaPedido(o)}${['CREATED', 'AWAITING_PAYMENT'].includes(o.status) ? `<button class="btn p w sm" data-c="${o.id}" style="margin-bottom:8px">Confirmar pago</button>`
      : o.status === 'PAID' && o.fulfillment_mode === 'PICKUP' ? `<button class="btn w sm" data-h="${o.id}" style="margin-bottom:8px">Marcar entregado</button>`
      : ['PAID', 'READY', 'IN_TRANSIT'].includes(o.status) && o.fulfillment_mode === 'DELIVERY' ? `<button class="btn w sm" data-pin="${o.id}" style="margin-bottom:8px">🔐 Entregar con PIN</button>` : ''}`).join('')
      : `<div class="vacio"><div class="e">🧾</div><span class="mu">Nada por aquí.</span></div>`;
    $$('[data-c]', el).forEach((b) => b.onclick = () => cobrar(O.find((o) => o.id === b.dataset.c)));
    $$('[data-pin]', el).forEach((b) => b.onclick = () => hoja(`<h2>Entregar con PIN</h2><p class="mu sm">Pídele al cliente su PIN de 4 dígitos cuando reciba el pedido.</p>
      <input id="pn" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="0000" style="font-size:28px;letter-spacing:.4em;text-align:center"><button class="btn p" id="ok">Confirmar entrega</button><button class="btn l" data-x>Cancelar</button>`, (h, close) => {
      $('#ok', h).onclick = async (ev) => {
        const pin = $('#pn', h).value.trim(); if (!/^\d{4}$/.test(pin)) return toast('El PIN tiene 4 dígitos');
        ev.target.disabled = true;
        try { await rpc('xy_confirm_handoff', { p_order: b.dataset.pin, p_pin: pin }); close(); toast('Entregado ✓ Puntos liberados'); recargar(); } catch (e) { toast(errDe(e)); ev.target.disabled = false; }
      };
    }));
    $$('[data-h]', el).forEach((b) => b.onclick = async () => {
      b.disabled = true;
      try { await rpc('xy_confirm_handoff', { p_order: b.dataset.h, p_pin: null }); toast('Entregado ✓ Puntos liberados'); recargar(); } catch (e) { toast(errDe(e)); b.disabled = false; }
    });
  };
  const recargar = async () => { try { O = await cargarPedidos(); pinta(); } catch (e) { toast(errDe(e)); } };
  const cobrar = (o) => hoja(`<h2>Confirmar pago</h2><p class="mu">Pedido <b>#${esc(o.code)}</b> · ${money(o.total, o.currency)}</p>
    <b class="sm">¿Cómo pagó?</b><div class="chips" style="margin:0;padding:0;flex-wrap:wrap">${PAGO.map(([k, t], i) => `<button class="chip${k === (o.buyer_pay_method || 'YAPE') ? ' on' : ''}" data-p="${k}">${t}</button>`).join('')}</div>
    ${o.buyer_paid_at ? `<p class="sm">💸 El cliente avisó que pagó${o.buyer_pay_ref ? ` · op. <b>${esc(o.buyer_pay_ref)}</b>` : ''}. Revisa tu Yape/Plin/banco.</p>` : ''}
    <p class="mu xs">Confirma solo si ya viste el pago. Quien atiende no puede ser el comprador: la base lo bloquea.</p>
    <button class="btn p" id="ok">Sí, ya pagó</button><button class="btn l" data-x>Cancelar</button>`, (h, close) => {
    let m = o.buyer_pay_method || 'YAPE';
    $$('[data-p]', h).forEach((b) => b.onclick = () => { m = b.dataset.p; $$('[data-p]', h).forEach((x) => x.classList.toggle('on', x === b)); });
    $('#ok', h).onclick = async (ev) => {
      ev.target.disabled = true;
      try {
        const d = await rpc('confirm_order_and_distribute_points', { p_order: o.id, p_payment_method: m });
        close(); const p = d && d.points;
        toast(p ? `Pago confirmado ✓ Cliente: +${num(p.local)} pts locales y +${num(p.global)} globales` : 'Pago confirmado ✓');
        if (p && +p.entity) setTimeout(() => ptsFx(p.entity, 'puntos para tu negocio'), 300);
        recargar();
      } catch (e) { toast(errDe(e)); ev.target.disabled = false; }
    };
  });
  $$('#fl button', el).forEach((b) => b.onclick = () => { f = b.dataset.f; $$('#fl button', el).forEach((x) => x.classList.toggle('on', x === b)); pinta(); });
  // Pedidos en vivo (Realtime) cuando el SQL 76 está corrido
  let canal = null;
  if (!S.demo && !S.sinCore && S.sb) {
    canal = S.sb.channel('x-ord-' + S.entidad.id).on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: 'entity_id=eq.' + S.entidad.id }, recargar).subscribe();
  }
  await recargar();
  return () => { if (canal) S.sb.removeChannel(canal); };
}

const KQ = { TABLE: 'Mesa', RECEPTION: 'Recepción', COUNTER: 'Mostrador', PRO_PHONE: 'Mi celular (profesional)', PICKUP: 'Retiro' };
async function qrs(el) {
  cabecera(el, 'Códigos QR', 'Cada QR valida que el cliente esté en tu local antes de comprar.');
  el.insertAdjacentHTML('beforeend', `<div class="dos"><form class="card" id="fQ"><b>Nuevo QR</b>
      <label>Nombre<input id="qL" maxlength="40" placeholder="Mesa 1, Recepción, Barra…" required></label>
      <label>Tipo<select id="qK">${Object.entries(KQ).map(([k, t]) => `<option value="${k}" ${S.entidad.type === 'PROFESSIONAL' && k === 'PRO_PHONE' ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <button class="btn p">${I.qr} Crear QR</button>
      <p class="mu xs">Por seguridad el código se muestra una sola vez: descárgalo o imprímelo al crearlo. Si lo pierdes, crea otro.</p></form>
    <div class="g"><div class="card" id="ubi"><div class="sk" style="height:60px"></div></div>
    <div class="card"><b>Tus QR</b><div id="lq"><div class="sk" style="height:60px"></div></div></div></div></div>`);
  const ubi = async () => {
    const box = $('#ubi', el);
    let L = []; try { L = await tabla('locations', (q) => q.select('id,name,address').eq('entity_id', S.entidad.id).limit(1)); } catch (_) {}
    const l = L[0];
    box.innerHTML = `<div class="row"><span class="ico">${I.pin}</span><span class="sp"><b>Ubicación del local</b><br><span class="mu xs">${l ? esc(l.address || l.name || 'Guardada') + ' · tus QR validan que el cliente esté a 50 m o menos' : 'Sin ubicación: tus QR no pueden validar que el cliente esté en el local'}</span></span>${l ? '<span class="pill ok">Lista</span>' : '<span class="pill warn">Falta</span>'}</div>
      <input id="uDir" maxlength="200" placeholder="Dirección (opcional)" value="${esc((l && l.address) || '')}">
      <button class="btn ${l ? '' : 'p'}" id="uSet">${I.pin} ${l ? 'Actualizar con mi ubicación actual' : 'Guardar mi ubicación actual'}</button><span class="mu xs">Hazlo parado dentro de tu local. Es la ubicación del negocio, no la de tus clientes.</span>`;
    $('#uSet', box).onclick = async (ev) => {
      ev.target.disabled = true;
      const g = await ubicar(12000);
      if (!g) { toast('Activa la ubicación del navegador'); ev.target.disabled = false; return; }
      try { const d = await rpc('xy_location_set', { p_entity: S.entidad.id, p_name: S.entidad.name, p_lat: g.lat, p_lng: g.lng, p_address: $('#uDir', box).value.trim() || null });
        toast('Ubicación guardada ✓' + (d.qr_updated ? ` · ${d.qr_updated} QR ahora validan GPS` : '')); ubi(); lista(); }
      catch (e) { toast(errDe(e)); ev.target.disabled = false; }
    };
  };
  const lista = async () => {
    try {
      const L = await tabla('qr_checkpoints', (q) => q.select('id,label,kind,active,created_at').eq('entity_id', S.entidad.id).order('created_at'));
      $('#lq', el).innerHTML = L.length ? L.map((q) => `<div class="li"><span class="ico">${I.qr}</span><span class="sp"><b>${esc(q.label)}</b><br><span class="mu xs">${KQ[q.kind] || q.kind}</span></span><span class="pill ${q.active ? 'ok' : ''}">${q.active ? 'Activo' : 'Apagado'}</span></div>`).join('')
        : '<p class="mu sm">Crea tu primer QR para la mesa o el mostrador.</p>';
    } catch (e) { toast(errDe(e)); }
  };
  $('#fQ', el).onsubmit = async (ev) => {
    ev.preventDefault(); const b = $('button', ev.target); b.disabled = true;
    try {
      const d = await rpc('xy_qr_create', { p_entity: S.entidad.id, p_location: null, p_kind: $('#qK', el).value, p_label: $('#qL', el).value.trim() });
      await cargaJS('https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js');
      const qr = window.qrcode(0, 'M'); qr.addData(d.url); qr.make();
      const svg = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
      const nom = $('#qL', el).value.trim();
      hoja(`<h2>QR listo: ${esc(nom)}</h2><div style="background:#fff;border-radius:18px;padding:14px;max-width:300px;margin:0 auto;width:100%">${svg}</div>
        <p class="mu xs" style="text-align:center;word-break:break-all">${esc(d.url)}</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button class="btn" id="dl">Descargar</button><button class="btn p" id="pr">Imprimir</button></div>
        <button class="btn l" data-x>Listo</button>`, (h) => {
        $('#dl', h).onclick = () => { const a = document.createElement('a'); a.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); a.download = 'qr-' + nom.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.svg'; a.click(); };
        $('#pr', h).onclick = () => { const w = open('', '_blank'); if (!w) return; w.document.write(`<title>QR ${esc(nom)}</title><body style="font-family:system-ui;text-align:center;padding:40px"><h1>${esc(S.entidad.name)}</h1><div style="width:320px;margin:0 auto">${svg}</div><h2>${esc(nom)}</h2><p>Escanea para pedir y sumar Xyro Points</p><script>onload=()=>print()<\/script>`); w.document.close(); };
      });
      if (d.gps === false) toast('Ojo: este QR no valida GPS hasta que guardes la ubicación del local');
      ev.target.reset(); lista();
    } catch (e) { toast(errDe(e)); }
    b.disabled = false;
  };
  ubi(); lista();
}

const PLAN_B = [[2, 100, 'Prueba rápida'], [6, 250, 'Hora punta'], [24, 800, 'Todo el día']];
async function boost(el) {
  cabecera(el, 'Boost', 'Sal primero en Explorar y da puntos dobles a tus clientes.');
  const e = S.entidad, activo = e.boost_until && new Date(e.boost_until) > new Date();
  el.insertAdjacentHTML('beforeend', `<div class="dos"><div class="card" style="${activo ? 'border-color:#a855f799' : ''}"><div class="row"><span class="ico">${I.bolt}</span><span class="sp"><b>${activo ? 'Boost activo' : 'Sin Boost'}</b><br>
      <span class="mu sm">${activo ? `Hasta las ${hora(e.boost_until)} del ${fecha(e.boost_until)}` : 'Actívalo con los puntos que gana tu negocio en cada venta.'}</span></span>${activo ? '<span class="pill boost">⚡ x2</span>' : ''}</div>
      <span class="mu sm">Puntos de tu negocio: <b id="pn">…</b></span></div>
    <div class="card"><b>Elige cuánto tiempo</b>${PLAN_B.map(([h, p, t]) => `<button class="mopt" data-h="${h}" data-p="${p}"><span class="ico">⚡</span><span class="sp"><b>${h} horas</b><br><span class="mu xs">${t}</span></span><b>${num(p)} pts</b></button>`).join('')}
      <a class="btn w" target="_blank" rel="noopener" href="https://wa.me/51936449066?text=${encodeURIComponent('Hola, quiero activar Boost con pago para ' + e.name + ' (' + e.slug + ')')}">💳 Boost con pago por Yape</a>
      <p class="mu xs">Con pago: nos escribes, pagas por Yape y lo activamos al momento.</p></div></div>`);
  let P = 0; try { P = await ptsNegocio(); } catch (_) {}
  $('#pn', el).textContent = num(P);
  $$('[data-h]', el).forEach((b) => { if (+b.dataset.p > P) b.disabled = true; b.onclick = async () => {
    b.disabled = true;
    try { await rpc('xy_boost', { p_entity: e.id, p_hours: +b.dataset.h, p_points: +b.dataset.p, p_mult: 2 }); e.boost_until = new Date(Math.max(Date.now(), +new Date(e.boost_until || 0)) + b.dataset.h * 36e5).toISOString(); toast('Boost activado ⚡'); dispatchEvent(new HashChangeEvent('hashchange')); }
    catch (er) { toast(errDe(er)); b.disabled = false; }
  }; });
}

const KIND = { PRODUCT: 'Producto', SERVICE: 'Servicio', SESSION: 'Sesión', CLASS_PACK: 'Paquete de clases', MEMBERSHIP: 'Membresía', DIGITAL: 'Digital' };
const MODOS_V = [['IN_STORE', '🍽️ En el local'], ['PICKUP', '🛍️ Para recoger'], ['DELIVERY', '🛵 Delivery'], ['DIGITAL', '💾 Digital']];
let DEMO_CAT = null;
async function catalogo(el) {
  cabecera(el, 'Catálogo', 'Tus productos y servicios: aparecen en tu carta al escanear el QR y en Explorar.');
  el.insertAdjacentHTML('beforeend', `<div class="row"><span class="sp"></span><button class="btn p" id="nuevo">＋ Agregar</button></div><div class="card" id="lc"><div class="sk" style="height:120px"></div></div>`);
  let L = [];
  const pinta = () => {
    $('#lc', el).innerHTML = L.length ? L.map((x) => `<div class="li"><span class="ico"${x.photos && x.photos[0] ? ` style="background:url('${esc(x.photos[0])}') center/cover"` : ''}>${x.photos && x.photos[0] ? '' : esc(x.emoji || (x.kind === 'DIGITAL' ? '💾' : '🏷️'))}</span><span class="sp"><b class="ell">${esc(x.title)}</b><br>
      <span class="mu xs">${esc(x.category || 'Sin categoría')} · ${KIND[x.kind] || ''} · ${(x.fulfillment_modes || []).map((m) => (MODOS_V.find((v) => v[0] === m) || ['', m])[1].split(' ')[0]).join(' ')}${x.stock != null ? ' · stock ' + num(x.stock) : ''}</span></span>
      <span style="text-align:right"><b>${money(x.price, x.currency)}</b><br><span class="pill ${x.active ? 'ok' : ''}">${x.active ? 'Visible' : 'Oculto'}</span></span><button class="btn sm" data-ed="${x.id}">Editar</button></div>`).join('')
      : '<div class="vacio"><div class="e">🏷️</div><b>Aún no tienes productos</b><span class="mu sm">Agrega lo que vendes para que tus clientes pidan desde la mesa o para recoger.</span></div>';
    $$('[data-ed]', el).forEach((b) => b.onclick = () => form(L.find((x) => x.id === b.dataset.ed)));
  };
  const cargar = async () => {
    try {
      if (S.demo || S.sinCore) { DEMO_CAT = DEMO_CAT || await tabla('catalog_items', (q) => q); L = DEMO_CAT; }
      else L = await tabla('catalog_items', (q) => q.select('id,title,description,category,price,currency,kind,fulfillment_modes,stock,active,photos,membership_days,sessions_included').eq('entity_id', S.entidad.id).order('category').order('title'));
      pinta();
    } catch (e) { toast(errDe(e)); }
  };
  const form = (x) => { let fotoU = (x && x.photos && x.photos[0]) || null; hoja(`<h2>${x ? 'Editar' : 'Nuevo'} producto o servicio</h2>
    <div class="fotos" id="cf"></div>
    <label>Nombre<input id="fT" maxlength="120" value="${esc(x ? x.title : '')}" required></label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label>Precio (${esc(S.entidad.currency || 'PEN')})<input id="fP" type="number" min="0" step="0.1" inputmode="decimal" value="${x ? esc(x.price) : ''}"></label>
      <label>Categoría<input id="fC" maxlength="40" placeholder="Bebidas, Postres…" value="${esc((x && x.category) || '')}"></label></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label>Tipo<select id="fK">${Object.entries(KIND).map(([k, t]) => `<option value="${k}" ${x && x.kind === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>Stock<input id="fS" type="number" min="0" placeholder="Sin control" value="${x && x.stock != null ? esc(x.stock) : ''}"></label></div>
    <label>Descripción<input id="fD" maxlength="300" value="${esc((x && x.description) || '')}"></label>
    <div id="mbw" style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label>Días del plan<input id="fDy" type="number" min="1" max="730" placeholder="30" value="${x && x.membership_days ? esc(x.membership_days) : ''}"></label>
      <label>Sesiones<input id="fSe" type="number" min="1" max="500" placeholder="—" value="${x && x.sessions_included ? esc(x.sessions_included) : ''}"></label></div>
    <div id="mdw"><b class="sm">¿Cómo se puede pedir?</b><div class="chips" style="margin:0;padding:0;flex-wrap:wrap">${MODOS_V.filter((v) => v[0] !== 'DIGITAL').map(([k, t]) => `<button type="button" class="chip${!x || (x.fulfillment_modes || []).includes(k) ? ' on' : ''}" data-mo="${k}">${t}</button>`).join('')}</div></div>
    <div id="dgw" class="card" style="background:var(--c2)"><b class="sm">🔐 Archivo para el cliente</b><span class="mu xs">Pega el enlace privado (Google Drive, Dropbox…). Solo lo ve quien pagó, en su Bóveda digital.${x && x.kind === 'DIGITAL' ? ' Déjalo vacío para no cambiar el actual.' : ''}</span>
      <input id="fL" type="url" maxlength="600" placeholder="https://drive.google.com/…" autocomplete="off"></div>
    <label class="row" style="color:var(--tx)"><input type="checkbox" id="fA" style="width:auto" ${!x || x.active ? 'checked' : ''}> Visible para clientes</label>
    <button class="btn p" id="gd">Guardar</button><button class="btn l" data-x>Cancelar</button>`, (h, close) => {
    $$('[data-mo]', h).forEach((b) => b.onclick = () => b.classList.toggle('on'));
    const dig = () => { const k = $('#fK', h).value, d = k === 'DIGITAL'; $('#mdw', h).hidden = d; $('#dgw', h).hidden = !d; $('#mbw', h).hidden = !['MEMBERSHIP', 'CLASS_PACK', 'SESSION'].includes(k); };
    $('#fK', h).onchange = dig; dig();
    const pf = () => {
      $('#cf', h).innerHTML = fotoU ? `<span class="fto" style="background-image:url('${esc(fotoU)}')"><button type="button" id="cq" aria-label="Quitar foto">✕</button></span>`
        : '<label class="fto add">📷<span class="xs">Foto</span><input type="file" accept="image/*" id="ci" hidden></label>';
      const q = $('#cq', h); q && (q.onclick = () => { fotoU = null; pf(); });
      const i = $('#ci', h); i && (i.onchange = async () => { if (!i.files[0]) return; i.parentElement.classList.add('cargando'); try { fotoU = await subirFoto(i.files[0], 800); } catch (e) { toast(errDe(e)); } pf(); });
    };
    pf();
    $('#gd', h).onclick = async (ev) => {
      const d = { title: $('#fT', h).value.trim(), price: +$('#fP', h).value, category: $('#fC', h).value.trim() || null, kind: $('#fK', h).value,
        stock: $('#fS', h).value === '' ? null : Math.max(0, parseInt($('#fS', h).value, 10) || 0), description: $('#fD', h).value.trim() || null,
        fulfillment_modes: $('#fK', h).value === 'DIGITAL' ? ['DIGITAL'] : $$('[data-mo].on', h).map((b) => b.dataset.mo), active: $('#fA', h).checked, photos: fotoU ? [fotoU] : [],
        membership_days: parseInt($('#fDy', h).value, 10) || null, sessions_included: parseInt($('#fSe', h).value, 10) || null };
      const link = $('#fL', h).value.trim();
      if (d.kind === 'DIGITAL' && link && !/^https:\/\/\S{4,}$/.test(link)) return toast('El enlace debe empezar con https://');
      if (d.kind === 'DIGITAL' && !x && !link) return toast('Pega el enlace del archivo');
      if (d.title.length < 2) return toast('Escribe el nombre');
      if (!(d.price >= 0) || $('#fP', h).value === '') return toast('Escribe el precio');
      if (!d.fulfillment_modes.length) return toast('Elige al menos una forma de pedir');
      ev.target.disabled = true;
      try {
        if (S.demo || S.sinCore) { if (x) Object.assign(x, d); else DEMO_CAT.unshift({ id: 'n' + Date.now(), currency: 'PEN', ...d }); }
        else {
          const q = x ? S.sb.from('catalog_items').update(d).eq('id', x.id).select('id') : S.sb.from('catalog_items').insert({ ...d, entity_id: S.entidad.id, currency: S.entidad.currency || 'PEN' }).select('id');
          const { data, error } = await q; if (error) throw error;
          if (d.kind === 'DIGITAL' && link) await rpc('xy_digital_set', { p_item: (data && data[0] && data[0].id) || x.id, p_link: link });
        }
        close(); toast('Guardado ✓'); cargar();
      } catch (e) { toast(errDe(e)); ev.target.disabled = false; }
    };
  }); };
  $('#nuevo', el).onclick = () => form(null);
  await cargar();
}

// ---------- Videos para redes (Xyro Edits): 2 gratis al mes con marca de agua; el equipo los edita y deja el enlace ----------
const PLANT = [['promo', '⚡ Promo del día', 'Un producto o promo con música y texto grande'], ['menu', '📋 Carta o servicios', 'Recorrido rápido por lo que vendes'], ['local', '🏪 Conoce el local', 'Ambiente, equipo y ubicación']];
const VEST = { QUEUED: ['En cola', 'warn'], PROCESSING: ['Editando', ''], DONE: ['Listo', 'ok'], FAILED: ['No se pudo', 'bad'], EXPIRED: ['Vencido', ''] };
async function videos(el) {
  cabecera(el, 'Videos para redes', 'Xyro Edits: pídenos un video vertical (9:16) para TikTok, Reels o Shorts.');
  el.insertAdjacentHTML('beforeend', `<div class="dos"><form class="card" id="fv"><b>Pedir un video</b>
      <div class="g" id="tp">${PLANT.map(([k, t, d], i) => `<button type="button" class="mopt${i ? '' : ' on'}" data-t="${k}"><span class="sp"><b class="sm">${t}</b><br><span class="mu xs">${d}</span></span></button>`).join('')}</div>
      <label>Productos que salen (opcional)<select id="vp" multiple size="4"></select></label>
      <label>¿Qué quieres que diga o muestre?<textarea id="vt" rows="3" maxlength="1000" placeholder="Ej: 2x1 en waffles este viernes, música alegre"></textarea></label>
      <p class="mu xs" id="vcr">Los gratis llevan marca de agua de Xyro. Para más videos o sin marca, pasa a PRO.</p>
      <button class="btn p">Enviar pedido</button></form>
    <div class="card"><b>Mis videos</b><span class="mu xs">El enlace dura 30 días: descárgalo cuando esté listo.</span><div id="lv"><div class="sk" style="height:90px"></div></div></div></div>`);
  rpc('xy_entity_features', { p_entity: S.entidad.id }).then((f) => { if (f) $('#vcr', el).textContent = f.pro ? `PRO: te quedan ${num(f.edits_credits)} créditos este mes, sin marca de agua.` : `Te quedan ${num(f.edits_free_left)} gratis este mes (con marca de agua). Con PRO: 15 al mes sin marca.`; }).catch(() => {});
  let plant = 'promo';
  $$('#tp [data-t]', el).forEach((b) => b.onclick = () => { plant = b.dataset.t; $$('#tp [data-t]', el).forEach((x) => x.classList.toggle('on', x === b)); });
  tabla('catalog_items', (q) => q.select('id,title').eq('entity_id', S.entidad.id).eq('active', true).order('title').limit(100))
    .then((C) => { $('#vp', el).innerHTML = C.map((c) => `<option value="${esc(c.id)}">${esc(c.title)}</option>`).join(''); }).catch(() => {});
  const cargar = async () => {
    try {
      const L = await tabla('video_jobs', (q) => q.select('id,status,template,prompt,r2_key,watermark,error,created_at,expires_at').eq('entity_id', S.entidad.id).order('created_at', { ascending: false }).limit(30));
      $('#lv', el).innerHTML = L.length ? L.map((v) => `<div class="li"><span class="ico">${I.film}</span><span class="sp"><b>${esc((PLANT.find((p) => p[0] === v.template) || ['', 'Video'])[1])}</b> <span class="pill ${VEST[v.status][1]}">${VEST[v.status][0]}</span><br>
        <span class="mu xs">${fecha(v.created_at)} · ${esc(v.prompt || '')}</span>${v.error ? `<br><span class="xs" style="color:#f87171">${esc(v.error)}</span>` : ''}</span>
        ${v.status === 'DONE' && v.r2_key ? `<a class="btn p sm" href="${esc(v.r2_key)}" target="_blank" rel="noopener">Ver</a>` : ''}</div>`).join('')
        : '<div class="vacio"><div class="e">🎬</div><span class="mu sm">Aún no pides videos.</span></div>';
    } catch (e) { $('#lv', el).innerHTML = `<p class="mu sm">${esc(errDe(e))}</p>`; }
  };
  $('#fv', el).onsubmit = async (e) => {
    e.preventDefault(); const b = $('button.p', e.target); b.disabled = true;
    try {
      const d = await rpc('xy_queue_video', { p_entity: S.entidad.id, p_items: [...$('#vp', el).selectedOptions].map((o) => o.value).slice(0, 6), p_template: plant, p_prompt: $('#vt', el).value.trim() || null });
      toast(d && d.free_left > 0 ? 'Pedido enviado ✓ Te queda 1 gratis este mes' : 'Pedido enviado ✓'); $('#vt', el).value = ''; cargar();
    } catch (er) { toast(errDe(er)); }
    b.disabled = false;
  };
  await cargar();
}
