// Xyro · Compras (Sprint 3): carta del negocio, carrito, pedido en el local / retiro / delivery, «Mis pedidos» y caja sorpresa.
// El precio y los puntos los calcula la base (xy_create_order, confirm_*, xy_mystery_open): el navegador solo muestra.
import { S, $, $$, esc, I, rpc, tabla, money, num, hora, fecha, toast, hoja, errDe, vib } from '../core.js';
import { disputa } from './p2p.js';

const qp = () => new URLSearchParams(location.hash.split('?')[1] || '');
const MODO = { IN_STORE: ['🍽️', 'En el local'], PICKUP: ['🛍️', 'Para recoger'], DELIVERY: ['🛵', 'Delivery'], DIGITAL: ['💾', 'Digital'] };
const EST = { CREATED: 'Enviado', AWAITING_PAYMENT: 'Por pagar', PAID: 'Pagado', READY: 'Listo', IN_TRANSIT: 'En camino', COMPLETED: 'Completado', CANCELLED: 'Cancelado', DISPUTED: 'En revisión', REFUNDED: 'Devuelto' };
const PILL = { AWAITING_PAYMENT: 'warn', PAID: 'ok', READY: 'ok', IN_TRANSIT: 'ok', COMPLETED: 'ok', CANCELLED: 'bad', DISPUTED: 'bad', REFUNDED: 'bad' };
const PREMIOS = [5, 10, 20, 30, 50, 100];   // mismas caras que mystery_rules (SQL 78)

export async function vista(r, el) {
  if (r === 'carta') return carta(el);
  if (r === 'pedido') return pedido(el);
  if (r === 'pedidos') return pedidos(el);
}

// ---------- Carta + carrito ----------
async function carta(el) {
  const p = qp(), eid = p.get('e'), ses = p.get('s'), mesa = p.get('m');
  if (!eid) { location.replace('#/explorar'); return; }
  el.innerHTML = '<div class="sk" style="height:80px"></div><div class="sk" style="height:300px"></div>';
  let ent = null, items = [];
  try {
    const E = await tabla('entities', (q) => q.select('id,name,slug,currency,category').eq('id', eid).limit(1));
    ent = E[0] || { id: eid, name: 'Negocio', currency: 'PEN' };
    items = await tabla('catalog_items', (q) => q.select('id,title,description,category,price,currency,photos,fulfillment_modes,stock,kind').eq('entity_id', eid).eq('active', true).order('category').order('title'));
  } catch (e) { el.innerHTML = `<div class="vacio"><div class="e">⚠️</div><span>${esc(errDe(e))}</span></div>`; return; }
  const modos = [...new Set(items.flatMap((x) => x.fulfillment_modes || []))].filter((m) => MODO[m] && (m !== 'IN_STORE' || ses));
  let modo = ses ? 'IN_STORE' : (modos.find((m) => m !== 'IN_STORE') || null);
  const cart = new Map();

  const pinta = () => {
    const vis = items.filter((x) => !modo || (x.fulfillment_modes || []).includes(modo));
    const cats = [...new Set(vis.map((x) => x.category || 'Carta'))];
    el.innerHTML = `<div class="row wrap"><div class="sp"><span class="mu sm">${ses ? `📍 Estás en el local${mesa ? ' · ' + esc(mesa) : ''}` : 'Carta'}</span><h1 class="ell">${esc(ent.name)}</h1></div>
        ${ses ? '<span class="pill ok">Compra en el local</span>' : ''}</div>
      ${!ses && modos.length > 1 ? `<div class="seg" id="md">${modos.map((m) => `<button data-m="${m}" class="${m === modo ? 'on' : ''}">${MODO[m][0]} ${MODO[m][1]}</button>`).join('')}</div>` : ''}
      ${!ses && !modos.length ? `<div class="card"><b>Este negocio vende en su local</b><span class="mu sm">Escanea el QR de su mesa o mostrador para pedir y sumar puntos.</span><a class="btn p" href="#/escanear">${I.scan} Escanear QR</a></div>` : ''}
      ${vis.length ? cats.map((c) => `<div class="g"><h3>${esc(c)}</h3><div class="grid">${vis.filter((x) => (x.category || 'Carta') === c).map((x) => {
        const n = cart.get(x.id) || 0, ph = x.photos && x.photos[0];
        return `<div class="prod"><div class="ph" ${ph ? `style="background-image:url('${esc(ph)}')"` : ''}>${ph ? '' : esc(x.emoji || '🍽️')}</div>
          <div class="bd"><b class="ell">${esc(x.title)}</b>${x.description ? `<span class="mu xs ell">${esc(x.description)}</span>` : ''}
          <div class="row"><span class="pr sp">${money(x.price, x.currency)}</span>
          ${modo && (ses || modo !== 'IN_STORE') ? (n ? `<span class="qty"><button data-q="${x.id}" data-d="-1" aria-label="Quitar">−</button><b>${n}</b><button data-q="${x.id}" data-d="1" aria-label="Agregar">＋</button></span>`
            : `<button class="btn p sm" data-q="${x.id}" data-d="1">Agregar</button>`) : ''}</div></div></div>`;
      }).join('')}</div></div>`).join('') : '<div class="vacio"><div class="e">📋</div><b>Aún no hay productos aquí</b></div>'}
      <div style="height:70px"></div>
      ${cart.size ? `<button class="carro" id="carro"><span class="pill" style="background:#0005">${[...cart.values()].reduce((a, b) => a + b, 0)}</span><b class="sp">Ver mi pedido</b><b>${money(total(), ent.currency)}</b></button>` : ''}`;
    $$('[data-m]', el).forEach((b) => b.onclick = () => { modo = b.dataset.m; cart.clear(); pinta(); });
    $$('[data-q]', el).forEach((b) => b.onclick = () => {
      vib(); const id = b.dataset.q, it = items.find((x) => x.id === id), n = (cart.get(id) || 0) + +b.dataset.d;
      if (it && it.stock != null && n > it.stock) return toast('No hay más stock');
      n > 0 ? cart.set(id, Math.min(n, 100)) : cart.delete(id); pinta();
    });
    const c = $('#carro', el); c && (c.onclick = revisar);
  };
  const total = () => [...cart].reduce((a, [id, n]) => a + (+(items.find((x) => x.id === id) || {}).price || 0) * n, 0);

  const revisar = () => hoja(`<h2>Tu pedido</h2><span class="mu sm">${MODO[modo][0]} ${MODO[modo][1]} · ${esc(ent.name)}</span>
    <div>${[...cart].map(([id, n]) => { const x = items.find((y) => y.id === id); return `<div class="li"><b>${n}×</b><span class="sp ell">${esc(x.title)}</span><b>${money(x.price * n, x.currency)}</b></div>`; }).join('')}</div>
    <div class="row"><b class="sp">Total</b><b style="font-size:20px">${money(total(), ent.currency)}</b></div>
    ${modo === 'DELIVERY' ? '<label>Dirección de entrega<input id="dir" maxlength="200" placeholder="Calle, número, referencia" required></label>' : ''}
    <label>Nota (opcional)<input id="nota" maxlength="200" placeholder="${modo === 'IN_STORE' ? 'Ej.: sin azúcar' : 'Ej.: llego en 20 min'}"></label>
    <p class="mu xs">${modo === 'IN_STORE' ? 'Pagas en caja; al confirmar tu pago sumas Xyro Points.' : modo === 'PICKUP' ? 'Pagas al negocio y recoges mostrando tu código.' : 'Te daremos un PIN: dáselo al repartidor solo cuando recibas tu pedido.'}</p>
    <button class="btn p" id="env">Enviar pedido</button><button class="btn l" data-x>Seguir viendo</button>`, (h, close) => {
    $('#env', h).onclick = async (ev) => {
      const dir = $('#dir', h);
      if (dir && dir.value.trim().length < 6) { dir.focus(); return toast('Escribe tu dirección'); }
      ev.target.disabled = true;
      try {
        const d = await rpc('xy_create_order', { p_entity: ent.id, p_mode: modo, p_items: [...cart].map(([id, qty]) => ({ id, qty })),
          p_qr_session: modo === 'IN_STORE' ? ses : null, p_location: null, p_delivery_address: dir ? { direccion: dir.value.trim() } : null, p_notes: $('#nota', h).value.trim() || null });
        if (d.delivery_pin) { try { sessionStorage.setItem('x-pin-' + d.order_id, d.delivery_pin); } catch (_) {} }
        close(); toast('Pedido enviado ✓'); location.hash = '#/pedido?o=' + encodeURIComponent(d.order_id);
      } catch (e) { toast(errDe(e)); ev.target.disabled = false; }
    };
  });
  pinta();
}

// ---------- Un pedido (estado en vivo + caja sorpresa) ----------
async function pedido(el) {
  const id = qp().get('o');
  let canal = null, demoT = 0;
  const cargar = async () => {
    const O = await tabla('orders', (q) => q.select('id,code,status,total,currency,fulfillment_mode,created_at,mystery_prize,entity_id,entities(name),order_items(title,qty,line_total)').eq('id', id).limit(1), 'my_orders');
    return O.find((o) => o.id === id) || O[0];
  };
  const pinta = (o) => {
    if (!o) { el.innerHTML = '<div class="vacio"><div class="e">🧾</div><b>No encontramos este pedido</b><a class="btn" href="#/pedidos">Mis pedidos</a></div>'; return; }
    let pin = null; try { pin = sessionStorage.getItem('x-pin-' + o.id); } catch (_) {}
    const pasos = o.fulfillment_mode === 'IN_STORE' ? ['AWAITING_PAYMENT', 'COMPLETED'] : o.fulfillment_mode === 'PICKUP' ? ['AWAITING_PAYMENT', 'PAID', 'COMPLETED'] : ['AWAITING_PAYMENT', 'PAID', 'IN_TRANSIT', 'COMPLETED'];
    const iAct = Math.max(0, pasos.indexOf(o.status === 'READY' ? 'PAID' : o.status));
    const fin = o.status === 'COMPLETED', mal = ['CANCELLED', 'DISPUTED', 'REFUNDED'].includes(o.status);
    el.innerHTML = `<div class="row"><a class="btn sm" href="#/pedidos">‹ Mis pedidos</a><span class="sp"></span><span class="pill ${PILL[o.status] || ''}">${EST[o.status] || esc(o.status)}</span></div>
      <div class="dos"><div class="g">
      <div class="card" style="text-align:center;justify-items:center;padding:22px">
        <span class="mu sm">${esc((o.entities && o.entities.name) || '')} · ${MODO[o.fulfillment_mode] ? MODO[o.fulfillment_mode].join(' ') : ''}</span>
        <span class="codigo">${esc(o.code)}</span>
        <span class="mu sm">${fin ? '¡Listo! Gracias por tu compra.' : mal ? 'Este pedido no siguió.' : o.fulfillment_mode === 'IN_STORE' ? 'Muestra este código en caja y paga ahí.' : o.fulfillment_mode === 'PICKUP' ? 'Paga al negocio y recoge mostrando este código.' : 'El negocio confirmará tu pago y lo enviará.'}</span>
        ${!mal ? `<div class="pasos">${pasos.map((s, i) => `<span class="${i <= (fin ? pasos.length : iAct) ? 'on' : ''}">${EST[s]}</span>`).join('')}</div>` : ''}
      </div>
      ${o.fulfillment_mode === 'DELIVERY' && !fin && !mal ? `<div class="card"><b>🔐 PIN de entrega</b>${pin ? `<span class="codigo" style="font-size:34px;letter-spacing:.3em">${esc(pin)}</span><span class="mu xs">Dáselo al repartidor solo cuando tengas tu pedido en la mano.</span>`
        : '<span class="mu sm">Se mostró al hacer el pedido. Si no lo tienes, pulsa «Ya lo recibí» cuando llegue.</span>'}
        ${['PAID', 'READY', 'IN_TRANSIT'].includes(o.status) ? '<button class="btn w" id="rec">Ya lo recibí</button>' : ''}</div>` : ''}
      <div id="caja"></div></div>
      <div class="card"><b>Detalle</b>${(o.order_items || []).map((x) => `<div class="li"><b>${x.qty}×</b><span class="sp ell">${esc(x.title)}</span><span>${money(x.line_total, o.currency)}</span></div>`).join('') || '<span class="mu sm">—</span>'}
        <div class="row"><b class="sp">Total</b><b>${money(o.total, o.currency)}</b></div><span class="mu xs">${fecha(o.created_at)} · ${hora(o.created_at)}</span>
        ${o.status !== 'CANCELLED' ? '<button class="btn l sm" id="prob">⚠️ Tengo un problema con este pedido</button>' : ''}</div></div>`;
    const pb = $('#prob', el); pb && (pb.onclick = () => disputa(o.id, () => { location.hash = '#/ayuda'; }));
    const rec = $('#rec', el); rec && (rec.onclick = async () => { rec.disabled = true; try { await rpc('xy_confirm_handoff', { p_order: o.id, p_pin: null }); toast('¡Recibido! Puntos liberados'); refrescar(); } catch (e) { toast(errDe(e)); rec.disabled = false; } });
    if (fin) caja($('#caja', el), o);
  };
  const refrescar = async () => { try { pinta(await cargar()); } catch (e) { toast(errDe(e)); } };
  await refrescar();
  if (!S.demo && !S.sinCore && S.sb) {
    canal = S.sb.channel('x-ped-' + id).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: 'id=eq.' + id }, () => { vib(); refrescar(); }).subscribe();
  } else {
    // Demo: el cajero «confirma» a los 4 segundos para ver el flujo completo
    demoT = setTimeout(async () => { const o = await cargar(); if (o && o.status === 'AWAITING_PAYMENT') { await rpc('confirm_order_and_distribute_points', { p_order: o.id, p_payment_method: 'YAPE' }); toast('El negocio confirmó tu pago ✓ (demo)'); refrescar(); } }, 4000);
  }
  return () => { clearTimeout(demoT); if (canal) S.sb.removeChannel(canal); };
}

// Caja sorpresa: ruleta con las caras de mystery_rules; el premio lo decide la base.
function caja(box, o) {
  if (o.mystery_prize != null) {
    box.innerHTML = `<div class="card" style="text-align:center">🎁 <b>Caja sorpresa abierta</b><span class="mu sm">${+o.mystery_prize ? `Ganaste <b>+${num(o.mystery_prize)}</b> Xyro Points` : 'Esta compra no tenía premio.'}</span></div>`;
    return;
  }
  const seg = 360 / PREMIOS.length;
  box.innerHTML = `<div class="card" style="text-align:center;justify-items:center"><b>🎁 ¡Tienes una caja sorpresa!</b><span class="mu sm">Gira y gana Xyro Points extra por tu compra.</span>
    <div class="rul"><div class="rul-r" id="rr">${PREMIOS.map((p, i) => `<span style="transform:rotate(${i * seg + seg / 2}deg) translateY(-92px) rotate(${-(i * seg + seg / 2)}deg)">+${p}</span>`).join('')}</div><i></i></div>
    <button class="btn p w" id="gir">Girar</button></div>`;
  $('#gir', box).onclick = async (ev) => {
    ev.target.disabled = true; vib();
    const rr = $('#rr', box); rr.style.transition = 'none'; rr.style.transform = 'rotate(0deg)';
    rr.classList.add('gira');
    try {
      const d = await rpc('xy_mystery_open', { p_order: o.id });
      const pts = +d.points || 0, i = Math.max(0, PREMIOS.indexOf(pts));
      rr.classList.remove('gira'); void rr.offsetWidth;
      rr.style.transition = 'transform 3.2s cubic-bezier(.12,.8,.2,1)';
      rr.style.transform = `rotate(${360 * 6 - (i * seg + seg / 2)}deg)`;
      setTimeout(() => { o.mystery_prize = pts; vib(); toast(pts ? `🎉 +${num(pts)} Xyro Points` : (d.reason || 'Sin premio esta vez')); caja(box, o); }, 3400);
    } catch (e) { rr.classList.remove('gira'); toast(errDe(e)); ev.target.disabled = false; }
  };
}

// ---------- Mis pedidos ----------
async function pedidos(el) {
  el.innerHTML = `<div><h1>Mis pedidos y ventas</h1><p class="mu">Tus compras en negocios Xyro y tus tratos del Marketplace.</p></div><div class="card" id="lp"><div class="sk" style="height:120px"></div></div>`;
  try {
    const L = await tabla('orders', (q) => q.select('id,code,status,total,currency,fulfillment_mode,created_at,mystery_prize,buyer_id,seller_user_id,entities(name),marketplace_listings(title)')
      .or(`buyer_id.eq.${S.user.id},and(seller_user_id.eq.${S.user.id},fulfillment_mode.eq.P2P)`).order('created_at', { ascending: false }).limit(50), 'my_orders');
    L.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    $('#lp', el).innerHTML = L.length ? L.map((o) => { const p2p = o.fulfillment_mode === 'P2P', vendo = p2p && o.seller_user_id === S.user.id; return `<a class="li" href="#/${p2p ? 'trato' : 'pedido'}?o=${encodeURIComponent(o.id)}">
      <span class="ico">${p2p ? (vendo ? '💰' : '🤝') : MODO[o.fulfillment_mode] ? MODO[o.fulfillment_mode][0] : '🧾'}</span><span class="sp"><b class="ell">${esc(p2p ? (o.marketplace_listings && o.marketplace_listings.title) || 'Marketplace' : (o.entities && o.entities.name) || 'Pedido')}</b><br><span class="mu xs">${p2p ? (vendo ? 'Vendes · ' : 'Compras · ') : ''}#${esc(o.code)} · ${fecha(o.created_at)} ${hora(o.created_at)}</span></span>
      <span style="text-align:right"><b>${money(o.total, o.currency)}</b><br><span class="pill ${PILL[o.status] || ''}">${p2p && o.status === 'CREATED' ? 'Coordinando' : EST[o.status] || esc(o.status)}</span>${o.status === 'COMPLETED' && o.mystery_prize == null && !p2p ? ' 🎁' : ''}</span></a>`; }).join('')
      : `<div class="vacio"><div class="e">🛍️</div><b>Aún no tienes pedidos</b><a class="btn p" href="#/explorar">Explorar</a></div>`;
  } catch (e) { $('#lp', el).innerHTML = `<p class="mu">${esc(errDe(e))}</p>`; }
}
