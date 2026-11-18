// Xyro · Xyro Control (negocios y servicios): resumen, pedidos, QR, Boost y catálogo.
// Todo pasa por funciones de la base (SQL 76): el navegador nunca reparte puntos ni cambia montos.
import { S, $, $$, esc, I, rpc, tabla, money, num, hora, fecha, toast, hoja, errDe, cargaJS, ls } from '../core.js';

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
  if (r === 'c-inicio') return inicio(el);
  if (r === 'c-pedidos') return pedidos(el);
  if (r === 'c-qr') return qrs(el);
  if (r === 'c-boost') return boost(el);
  if (r === 'c-catalogo') return catalogo(el);
}

const deHoy = (o) => new Date(o.created_at).toDateString() === new Date().toDateString();
const cargarPedidos = () => tabla('orders', (q) => q.select('id,code,fulfillment_mode,status,total,currency,created_at,payment_method').eq('entity_id', S.entidad.id).order('created_at', { ascending: false }).limit(60))
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
      <a class="li" href="#/c-qr" style="text-decoration:none"><span class="ico">${I.qr}</span><span class="sp">Crear QR de mesa o mostrador</span>›</a>
      <a class="li" href="#/c-boost" style="text-decoration:none"><span class="ico">${I.bolt}</span><span class="sp">Destacar mi negocio (Boost)</span>›</a>
      <a class="li" href="/app/" style="text-decoration:none"><span class="ico">${I.catalog}</span><span class="sp">Abrir mi panel completo</span>›</a></div></div>`);
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

const filaPedido = (o) => `<div class="li"><span class="ico">${I.orders}</span><span class="sp"><b>#${esc(o.code)}</b> <span class="pill ${EST[o.status] ? EST[o.status][1] : ''}">${EST[o.status] ? EST[o.status][0] : esc(o.status)}</span><br>
  <span class="mu xs">${MOD[o.fulfillment_mode] || ''} · ${hora(o.created_at)}</span></span><b>${money(o.total, o.currency)}</b></div>`;

async function pedidos(el) {
  cabecera(el, 'Pedidos', 'Confirma el pago y el cliente recibe sus puntos al instante.');
  el.insertAdjacentHTML('beforeend', `<div class="seg" id="fl"><button data-f="cob" class="on">Por cobrar</button><button data-f="cur">En curso</button><button data-f="all">Todos</button></div><div class="card" id="lp"><div class="sk" style="height:120px"></div></div>`);
  let O = [], f = 'cob';
  const pinta = () => {
    const L = O.filter((o) => f === 'all' || (f === 'cob' ? ['CREATED', 'AWAITING_PAYMENT'].includes(o.status) : ['PAID', 'READY', 'IN_TRANSIT'].includes(o.status)));
    $('#lp', el).innerHTML = L.length ? L.map((o) => `${filaPedido(o)}${['CREATED', 'AWAITING_PAYMENT'].includes(o.status) ? `<button class="btn p w sm" data-c="${o.id}" style="margin-bottom:8px">Confirmar pago</button>`
      : o.status === 'PAID' && o.fulfillment_mode === 'PICKUP' ? `<button class="btn w sm" data-h="${o.id}" style="margin-bottom:8px">Marcar entregado</button>` : ''}`).join('')
      : `<div class="vacio"><div class="e">🧾</div><span class="mu">Nada por aquí.</span></div>`;
    $$('[data-c]', el).forEach((b) => b.onclick = () => cobrar(O.find((o) => o.id === b.dataset.c)));
    $$('[data-h]', el).forEach((b) => b.onclick = async () => {
      b.disabled = true;
      try { await rpc('xy_confirm_handoff', { p_order: b.dataset.h, p_pin: null }); toast('Entregado ✓ Puntos liberados'); recargar(); } catch (e) { toast(errDe(e)); b.disabled = false; }
    });
  };
  const recargar = async () => { try { O = await cargarPedidos(); pinta(); } catch (e) { toast(errDe(e)); } };
  const cobrar = (o) => hoja(`<h2>Confirmar pago</h2><p class="mu">Pedido <b>#${esc(o.code)}</b> · ${money(o.total, o.currency)}</p>
    <b class="sm">¿Cómo pagó?</b><div class="chips" style="margin:0;padding:0;flex-wrap:wrap">${PAGO.map(([k, t], i) => `<button class="chip${i ? '' : ' on'}" data-p="${k}">${t}</button>`).join('')}</div>
    <p class="mu xs">Confirma solo si ya viste el pago. Quien atiende no puede ser el comprador: la base lo bloquea.</p>
    <button class="btn p" id="ok">Sí, ya pagó</button><button class="btn l" data-x>Cancelar</button>`, (h, close) => {
    let m = 'YAPE';
    $$('[data-p]', h).forEach((b) => b.onclick = () => { m = b.dataset.p; $$('[data-p]', h).forEach((x) => x.classList.toggle('on', x === b)); });
    $('#ok', h).onclick = async (ev) => {
      ev.target.disabled = true;
      try {
        const d = await rpc('confirm_order_and_distribute_points', { p_order: o.id, p_payment_method: m });
        close(); const p = d && d.points;
        toast(p ? `Pago confirmado ✓ Cliente: +${num(p.local)} pts locales y +${num(p.global)} globales` : 'Pago confirmado ✓');
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
    <div class="card"><b>Tus QR</b><div id="lq"><div class="sk" style="height:60px"></div></div></div></div>`);
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
      ev.target.reset(); lista();
    } catch (e) { toast(errDe(e)); }
    b.disabled = false;
  };
  lista();
}

const PLAN_B = [[2, 100, 'Prueba rápida'], [6, 250, 'Hora punta'], [24, 800, 'Todo el día']];
async function boost(el) {
  cabecera(el, 'Boost', 'Sal primero en Explorar y da puntos dobles a tus clientes.');
  const e = S.entidad, activo = e.boost_until && new Date(e.boost_until) > new Date();
  el.insertAdjacentHTML('beforeend', `<div class="dos"><div class="card" style="${activo ? 'border-color:#a855f799' : ''}"><div class="row"><span class="ico">${I.bolt}</span><span class="sp"><b>${activo ? 'Boost activo' : 'Sin Boost'}</b><br>
      <span class="mu sm">${activo ? `Hasta las ${hora(e.boost_until)} del ${fecha(e.boost_until)}` : 'Actívalo con los puntos que gana tu negocio en cada venta.'}</span></span>${activo ? '<span class="pill boost">⚡ x2</span>' : ''}</div>
      <span class="mu sm">Puntos de tu negocio: <b id="pn">…</b></span></div>
    <div class="card"><b>Elige cuánto tiempo</b>${PLAN_B.map(([h, p, t]) => `<button class="mopt" data-h="${h}" data-p="${p}"><span class="ico">⚡</span><span class="sp"><b>${h} horas</b><br><span class="mu xs">${t}</span></span><b>${num(p)} pts</b></button>`).join('')}
      <p class="mu xs">Pagar Boost con dinero: muy pronto.</p></div></div>`);
  let P = 0; try { P = await ptsNegocio(); } catch (_) {}
  $('#pn', el).textContent = num(P);
  $$('[data-h]', el).forEach((b) => { if (+b.dataset.p > P) b.disabled = true; b.onclick = async () => {
    b.disabled = true;
    try { await rpc('xy_boost', { p_entity: e.id, p_hours: +b.dataset.h, p_points: +b.dataset.p, p_mult: 2 }); e.boost_until = new Date(Math.max(Date.now(), +new Date(e.boost_until || 0)) + b.dataset.h * 36e5).toISOString(); toast('Boost activado ⚡'); dispatchEvent(new HashChangeEvent('hashchange')); }
    catch (er) { toast(errDe(er)); b.disabled = false; }
  }; });
}

function catalogo(el) {
  cabecera(el, 'Catálogo', 'Tus productos, servicios, clases y membresías.');
  el.insertAdjacentHTML('beforeend', `<div class="card pronto"><b>Muy pronto aquí</b><span class="mu sm">Podrás subir productos con foto, paquetes de clases, membresías y productos digitales. Por ahora tu carta se maneja desde tu panel.</span>
    <a class="btn" href="/app/">Abrir mi panel</a></div>`);
}
