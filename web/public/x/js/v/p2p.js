// Xyro · Sprint 4 (Modo Usuario): Marketplace P2P (publicar, comprar, chat, liberar, disputa), Bóveda digital y Ayuda (tickets).
// Montos, estados y comisión los decide la base (SQL 76 + 79): el navegador solo muestra y pide.
import { S, $, $$, esc, I, rpc, tabla, money, fecha, hora, toast, hoja, errDe, vib, subirFoto, WA_XYRO } from '../core.js';
import { demoMkSave } from '../demo.js';

const qp = () => new URLSearchParams(location.hash.split('?')[1] || '');
const COND = { NEW: 'Nuevo', LIKE_NEW: 'Como nuevo', USED: 'Usado' };
const EST = { CREATED: 'Coordinando', AWAITING_PAYMENT: 'Por pagar', PAID: 'Pago protegido', COMPLETED: 'Completado', CANCELLED: 'Cancelado', DISPUTED: 'En revisión', REFUNDED: 'Devuelto' };
const PILL = { AWAITING_PAYMENT: 'warn', PAID: 'ok', COMPLETED: 'ok', CANCELLED: 'bad', DISPUTED: 'bad', REFUNDED: 'bad' };
const MONEDAS = ['PEN', 'USD', 'MXN', 'COP', 'CLP', 'ARS', 'BOB', 'EUR'];
const foto = (m) => (m.photos && m.photos[0]) || null;

export async function vista(r, el) {
  if (r === 'market') return market(el);
  if (r === 'trato') return trato(el);
  if (r === 'boveda') return boveda(el);
  if (r === 'ayuda') return ayuda(el);
}

// ---------- Marketplace ----------
async function market(el) {
  let ver = qp().get('v') === 'mias' ? 'mias' : 'todo', L = [], q = '';
  el.innerHTML = `<div class="row wrap"><div class="sp"><h1>Marketplace</h1><p class="mu">Compra y vende entre personas. Pagas directo a quien vende y, con la captura del pago, sumas Xyro Points.</p></div>
    <button class="btn p" id="pub">＋ Publicar</button></div>
    <div class="row wrap"><div class="seg" id="vv" style="flex:1;min-width:220px"><button data-v="todo">Explorar</button><button data-v="mias">Mis publicaciones</button></div>
      <div class="srch" style="flex:2;min-width:220px">${I.search}<input id="mq" type="search" placeholder="Busca «bici», «mancuernas»…" autocomplete="off"></div></div>
    <div class="grid" id="mk"></div>`;
  const pinta = () => {
    const V = L.filter((m) => !q || (m.title + ' ' + (m.description || '')).toLowerCase().includes(q));
    $('#mk', el).innerHTML = V.length ? V.map((m, i) => `<button class="prod" data-i="${L.indexOf(m)}" style="animation-delay:${Math.min(i, 8) * 40}ms">
      <div class="ph" ${foto(m) ? `style="background-image:url('${esc(foto(m))}')"` : ''}>${foto(m) ? '' : esc(m.emoji || '📦')}${m.status !== 'ACTIVE' ? `<span class="pill ${m.status === 'SOLD' ? 'ok' : 'warn'}">${{ RESERVED: 'Reservado', SOLD: 'Vendido', REMOVED: 'Oculto', BANNED: 'Bloqueado' }[m.status] || ''}</span>` : ''}</div>
      <div class="bd"><b class="ell">${esc(m.title)}</b><span class="pr">${money(m.price, m.currency)}</span>
      <span class="mu xs">${COND[m.condition] || ''}${m.ships ? ' · Envío' : ' · En persona'} · ${fecha(m.created_at)}</span></div></button>`).join('')
      : `<div class="vacio" style="grid-column:1/-1"><div class="e">📦</div><b>${ver === 'mias' ? 'Aún no publicas nada' : 'No hay publicaciones'}</b>${ver === 'mias' ? '<span class="mu sm">Vende lo que ya no usas: toma una foto y publícalo en 1 minuto.</span>' : ''}</div>`;
    $$('#mk .prod', el).forEach((b) => b.onclick = () => detalle(L[+b.dataset.i], cargar));
  };
  const cargar = async () => {
    $$('#vv button', el).forEach((b) => b.classList.toggle('on', b.dataset.v === ver));
    $('#mk', el).innerHTML = Array(4).fill('<div class="sk" style="height:200px"></div>').join('');
    try {
      const sel = 'id,seller_id,title,description,price,currency,condition,ships,protected_available,status,photos,created_at';
      L = await tabla('marketplace_listings', (x) => ver === 'mias'
        ? x.select(sel).eq('seller_id', S.user.id).neq('status', 'BANNED').order('created_at', { ascending: false }).limit(60)
        : x.select(sel).eq('status', 'ACTIVE').order('featured_until', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(60));
      if (S.demo || S.sinCore) L = L.filter((m) => ver === 'mias' ? m.seller_id === S.user.id : m.status === 'ACTIVE');
      pinta();
    } catch (e) { $('#mk', el).innerHTML = `<div class="vacio" style="grid-column:1/-1"><span>${esc(errDe(e))}</span></div>`; }
  };
  let t = 0;
  $('#mq', el).oninput = (e) => { clearTimeout(t); t = setTimeout(() => { q = e.target.value.trim().toLowerCase(); pinta(); }, 200); };
  $$('#vv button', el).forEach((b) => b.onclick = () => { ver = b.dataset.v; cargar(); });
  $('#pub', el).onclick = () => publicar(null, () => { ver = 'mias'; cargar(); });
  await cargar();
}

function publicar(x, listo) {
  const fotos = x ? [...(x.photos || [])] : [];
  hoja(`<h2>${x ? 'Editar publicación' : 'Publicar algo'}</h2>
    <div class="fotos" id="ft"></div>
    <label>¿Qué vendes?<input id="pT" maxlength="120" placeholder="Ej: Mancuernas 10 kg (par)" value="${esc(x ? x.title : '')}"></label>
    <div style="display:grid;grid-template-columns:1fr 110px;gap:10px"><label>Precio<input id="pP" type="number" min="0" step="0.1" inputmode="decimal" value="${x ? esc(x.price) : ''}"></label>
      <label>Moneda<select id="pM">${MONEDAS.map((c) => `<option ${c === ((x && x.currency) || (S.me && S.me.currency) || 'PEN') ? 'selected' : ''}>${c}</option>`).join('')}</select></label></div>
    <label>Estado<select id="pC">${Object.entries(COND).map(([k, t]) => `<option value="${k}" ${(x ? x.condition : 'USED') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label>Descripción<textarea id="pD" maxlength="2000" rows="3" placeholder="Medidas, detalles, dónde lo entregas…">${esc((x && x.description) || '')}</textarea></label>
    <label class="row" style="color:var(--tx)"><input type="checkbox" id="pS" style="width:auto" ${x && x.ships ? 'checked' : ''}> Puedo enviarlo</label>
    <p class="mu xs">Al publicar aceptas los <a href="/terminos.html" target="_blank" rel="noopener">términos</a>. Nada de armas, medicinas, animales ni cosas robadas.</p>
    <button class="btn p" id="ok">${x ? 'Guardar cambios' : 'Publicar'}</button><button class="btn l" data-x>Cancelar</button>`, (h, close) => {
    const pf = () => {
      $('#ft', h).innerHTML = fotos.map((u, i) => `<span class="fto" style="background-image:url('${esc(u)}')"><button type="button" data-q="${i}" aria-label="Quitar foto">✕</button></span>`).join('')
        + (fotos.length < 4 ? `<label class="fto add">📷<span class="xs">Foto</span><input type="file" accept="image/*" id="fi" hidden></label>` : '');
      $$('[data-q]', h).forEach((b) => b.onclick = () => { fotos.splice(+b.dataset.q, 1); pf(); });
      const fi = $('#fi', h); fi && (fi.onchange = async () => {
        const f = fi.files[0]; if (!f) return;
        const lb = fi.parentElement; lb.classList.add('cargando');
        try { fotos.push(await subirFoto(f)); } catch (e) { toast(errDe(e)); }
        pf();
      });
    };
    pf();
    $('#ok', h).onclick = async (ev) => {
      const d = { title: $('#pT', h).value.trim(), price: +$('#pP', h).value, currency: $('#pM', h).value, condition: $('#pC', h).value,
        description: $('#pD', h).value.trim() || null, ships: $('#pS', h).checked, protected_available: false, photos: fotos };
      if (d.title.length < 3) return toast('Escribe qué vendes');
      if ($('#pP', h).value === '' || !(d.price >= 0)) return toast('Escribe el precio');
      ev.target.disabled = true;
      try {
        if (S.demo || S.sinCore) demoMkSave(x ? { ...x, ...d } : { id: 'n' + Date.now(), seller_id: S.user.id, status: 'ACTIVE', created_at: new Date().toISOString(), ...d });
        else {
          const r = x ? await S.sb.from('marketplace_listings').update(d).eq('id', x.id) : await S.sb.from('marketplace_listings').insert({ ...d, seller_id: S.user.id });
          if (r.error) throw r.error;
        }
        close(); toast(x ? 'Guardado ✓' : '¡Publicado! 🎉'); listo && listo();
      } catch (e) { toast(errDe(e)); ev.target.disabled = false; }
    };
  });
}

function detalle(m, recargar) {
  const mia = m.seller_id === S.user.id;
  const fts = (m.photos || []).length ? `<div class="galeria">${m.photos.map((u) => `<img src="${esc(u)}" alt="" loading="lazy">`).join('')}</div>`
    : `<div class="ph" style="height:150px;border-radius:16px;background:var(--c2);display:grid;place-items:center;font-size:60px">${esc(m.emoji || '📦')}</div>`;
  hoja(`${fts}<div><span class="mu sm">${COND[m.condition] || ''} · ${m.ships ? 'Con envío' : 'Entrega en persona'} · ${fecha(m.created_at)}</span><h2>${esc(m.title)}</h2></div>
    <b style="font-size:24px">${money(m.price, m.currency)}</b>
    ${m.description ? `<p class="sm" style="white-space:pre-line;margin:0">${esc(m.description)}</p>` : ''}
    <div id="vend" class="mu sm"></div>
    ${mia ? `<div class="card" style="background:var(--c2)"><b class="sm">Es tu publicación</b><span class="mu xs">Las conversaciones con compradores están en Perfil → Mis pedidos y ventas.</span></div>
      <button class="btn" id="ed">✏️ Editar</button>${m.status === 'ACTIVE' ? '<button class="btn l" id="qt">Quitar publicación</button>' : m.status === 'REMOVED' ? '<button class="btn" id="rp">Volver a publicar</button>' : ''}`
    : m.status !== 'ACTIVE' ? '<div class="card"><b>Ya no está disponible</b></div>' : `
      <button class="btn p" id="cd" style="flex-direction:column;gap:2px;padding:10px 16px">🤝 Lo quiero<span class="xs" style="display:block;font-weight:500;opacity:.85">Coordinan por chat y pagas directo a quien vende. Sube la captura del pago y suma Xyro Points.</span></button>
      <span class="mu xs">Xyro no recibe tu dinero: solo los conecta. Paga cuando estés seguro, mejor al recibir el producto.</span>
      <button class="btn l sm" id="rep">🚩 Reportar</button>`}
    <button class="btn l" data-x>Cerrar</button>`, (h, close) => {
    if (!S.demo && !S.sinCore && m.seller_id) rpc('xy_users_public', { p_ids: [m.seller_id] }).then((u) => { u = u && u[0]; const v = $('#vend', h); if (v && u) v.textContent = 'Vende: ' + (u.display_name || (u.username ? '@' + u.username : 'Usuario Xyro')); }).catch(() => {});
    const comprar = (prot) => async (ev) => {
      ev.currentTarget.disabled = true;
      try { const d = await rpc('xy_create_p2p_order', { p_listing: m.id, p_protected: prot }); close(); vib(); location.hash = '#/trato?o=' + encodeURIComponent(d.order_id); }
      catch (e) { toast(errDe(e)); ev.target.disabled = false; }
    };
    const on = (id, fn) => { const b = $(id, h); b && (b.onclick = fn); };
    on('#cd', comprar(false));
    on('#ed', () => { close(); publicar(m, recargar); });
    const estado = (s, txt) => async () => {
      try { if (S.demo || S.sinCore) demoMkSave({ ...m, status: s }); else { const { error } = await S.sb.from('marketplace_listings').update({ status: s }).eq('id', m.id); if (error) throw error; } close(); toast(txt); recargar(); }
      catch (e) { toast(errDe(e)); }
    };
    on('#qt', estado('REMOVED', 'Publicación quitada')); on('#rp', estado('ACTIVE', 'Publicada de nuevo ✓'));
    on('#rep', () => { close(); hoja(`<h2>Reportar publicación</h2><p class="mu sm">Moderación la revisa. Con varios reportes se oculta sola.</p>
      ${['Es una estafa', 'Producto prohibido', 'Foto o texto ofensivo', 'Otra cosa'].map((t) => `<button class="btn" data-r="${t}">${t}</button>`).join('')}<button class="btn l" data-x>Cancelar</button>`, (h2, c2) => {
      $$('[data-r]', h2).forEach((b) => b.onclick = async () => { try { await rpc('xy_listing_report', { p_listing: m.id, p_reason: b.dataset.r }); c2(); toast('Gracias, lo revisaremos'); } catch (e) { toast(errDe(e)); } });
    }); });
  });
}

// ---------- Trato P2P: estado, pago protegido, chat y cierre ----------
async function trato(el) {
  const id = qp().get('o');
  let canal = null, poll = 0, ultimo = -1;
  const cargar = async () => {
    const O = await tabla('orders', (q) => q.select('id,code,status,total,currency,protected,commission_amount,buyer_id,seller_user_id,listing_id,created_at,payout_at,buyer_paid_at,buyer_pay_method,buyer_pay_ref,buyer_pay_foto,marketplace_listings(title,photos)').eq('id', id).limit(1), 'p2p_orders');
    return O.find((o) => o.id === id);
  };
  const pinta = (o) => {
    if (!o) { el.innerHTML = '<div class="vacio"><div class="e">🤝</div><b>No encontramos este trato</b><a class="btn" href="#/pedidos">Mis pedidos</a></div>'; return; }
    const yoC = o.buyer_id === S.user.id, li = o.marketplace_listings || {}, abierto = !['CANCELLED', 'REFUNDED'].includes(o.status);
    const pasos = o.protected ? ['AWAITING_PAYMENT', 'PAID', 'COMPLETED'] : ['CREATED', 'COMPLETED'];
    const iAct = Math.max(0, pasos.indexOf(o.status)), fin = o.status === 'COMPLETED';
    const msg = o.protected ? {
      AWAITING_PAYMENT: yoC ? 'Paga a Xyro por Yape y envía la captura con tu código. Xyro guarda el dinero hasta que recibas.' : 'Esperando que el comprador pague a Xyro. Te avisamos cuando el dinero esté protegido.',
      PAID: yoC ? 'Tu dinero está protegido. Cuando tengas el producto en la mano, libera el pago.' : '¡Pago protegido! Coordina la entrega por el chat. Cobras cuando el comprador confirme.',
      COMPLETED: yoC ? '¡Listo! Gracias por comprar con Compra Protegida.' : o.payout_at ? 'Xyro ya te transfirió el pago.' : 'El comprador confirmó. Xyro te transfiere el pago (menos 6 %) en breve.',
      DISPUTED: 'Xyro está revisando este caso. Te escribimos por Ayuda.' }[o.status]
      : { CREATED: o.buyer_paid_at ? (yoC ? 'Avisaste que pagaste. Cuando quien vende lo confirme, sumas tus puntos.' : 'El comprador dice que ya pagó. Revisa tu Yape o efectivo y confirma la venta.') : (yoC ? 'Coordina por el chat. Paga directo a quien vende y luego toca «Ya pagué» con tu captura.' : 'Coordina la entrega por el chat. El comprador te paga directo a ti.'),
        COMPLETED: yoC ? (o.buyer_pay_foto ? '¡Listo! Tus puntos ya están en camino.' : 'Vendido. Sin captura del pago no hubo puntos.') : 'Vendido. ¡Gracias por usar Xyro!', DISPUTED: 'Xyro está revisando este caso.' }[o.status];
    el.innerHTML = `<div class="row"><a class="btn sm" href="#/pedidos">‹ Mis pedidos</a><span class="sp"></span><span class="pill ${PILL[o.status] || ''}">${EST[o.status] || esc(o.status)}</span></div>
      <div class="dos"><div class="g">
        <div class="card" style="text-align:center;justify-items:center;padding:20px">
          <span class="mu sm">${o.protected ? '🛡️ Compra Protegida' : '🤝 Trato directo'} · ${yoC ? 'Compras' : 'Vendes'}</span>
          <b style="font-size:18px">${esc(li.title || 'Publicación')}</b><span class="codigo">${esc(o.code)}</span><b>${money(o.total, o.currency)}</b>
          <span class="mu sm">${msg || 'Este trato no siguió.'}</span>
          ${abierto && o.status !== 'DISPUTED' ? `<div class="pasos">${pasos.map((s, i) => `<span class="${i <= (fin ? pasos.length : iAct) ? 'on' : ''}">${EST[s]}</span>`).join('')}</div>` : ''}
        </div>
        <div class="g" id="acc"></div></div>
        <div class="card chat"><b>Chat ${yoC ? 'con quien vende' : 'con quien compra'}</b><span class="mu xs">No compartas claves ni datos de tarjetas. Xyro nunca te pide pagar fuera del chat.</span>
          <div class="msgs" id="ms"><div class="sk" style="height:60px"></div></div>
          ${abierto ? '<form class="row" id="fm"><input id="mt" maxlength="600" placeholder="Escribe un mensaje…" autocomplete="off"><button class="btn p">Enviar</button></form>' : ''}</div></div>`;
    const acc = $('#acc', el), B = [];
    if (o.protected && o.status === 'AWAITING_PAYMENT' && yoC) B.push(`<a class="btn p" target="_blank" rel="noopener" href="https://wa.me/${WA_XYRO}?text=${encodeURIComponent(`Hola Xyro, pagué la Compra Protegida ${o.code} (${money(o.total, o.currency)}). Adjunto la captura.`)}">💳 Pagar y enviar captura</a>`);
    if (o.protected && o.status === 'PAID' && yoC) B.push('<button class="btn p" id="lib">✅ Ya lo recibí: liberar pago</button>');
    if (!o.protected && o.status === 'CREATED' && yoC && !o.buyer_paid_at) B.push('<button class="btn p" id="pag">💳 Ya pagué · subir captura</button>');
    if (!o.protected && o.status === 'CREATED' && !yoC) {
      if (o.buyer_paid_at) B.push(`<div class="card" style="gap:6px"><b class="sm">Pago reportado: ${esc({ YAPE: 'Yape', PLIN: 'Plin', TRANSFER: 'Transferencia', CASH: 'Efectivo' }[o.buyer_pay_method] || 'Otro')}${o.buyer_pay_ref ? ' · N.º ' + esc(o.buyer_pay_ref) : ''}</b>${o.buyer_pay_foto ? `<a href="${esc(o.buyer_pay_foto)}" target="_blank" rel="noopener"><img src="${esc(o.buyer_pay_foto)}" alt="Captura del pago" style="max-width:200px;max-height:260px;border-radius:12px"></a>` : '<span class="mu xs">Sin captura</span>'}<span class="mu xs">Revisa que el dinero llegó a tu cuenta antes de confirmar.</span></div>`);
      B.push('<button class="btn p" id="vnd">✅ Recibí el pago · confirmar venta</button>');
    }
    if (['CREATED', 'AWAITING_PAYMENT'].includes(o.status)) B.push('<button class="btn l" id="can">Cancelar trato</button>');
    if (['PAID', 'COMPLETED', 'CREATED'].includes(o.status)) B.push('<button class="btn l sm" id="dis">⚠️ Tengo un problema</button>');
    acc.innerHTML = B.join('');
    const on = (s, fn) => { const b = $(s, el); b && (b.onclick = fn); };
    on('#lib', () => hoja(`<h2>¿Ya tienes el producto?</h2><p class="mu sm">Al liberar, Xyro le paga al vendedor y tú sumas Xyro Points. Esto no se puede deshacer.</p>
      <button class="btn p" id="si">Sí, lo recibí bien</button><button class="btn l" data-x>Todavía no</button>`, (h, c) => { $('#si', h).onclick = async () => { try { const r = await rpc('xy_p2p_release', { p_order: o.id }); c(); vib(); toast('¡Listo! +' + ((r.points && r.points.global) || 0) + ' Xyro Points'); refrescar(); } catch (e) { toast(errDe(e)); } }; }));
    on('#pag', () => hoja(`<h2>💳 ¿Cómo pagaste?</h2><p class="mu sm">Pagaste directo a quien vende. Sube la captura para sumar tus Xyro Points cuando confirme.</p>
      <select id="pm"><option value="YAPE">Yape</option><option value="PLIN">Plin</option><option value="TRANSFER">Transferencia</option><option value="CASH">Efectivo</option><option value="OTHER">Otro</option></select>
      <input id="pr" maxlength="40" placeholder="N.º de operación (opcional)"><input type="file" id="pf" accept="image/*" hidden><button class="btn" id="pfb">📎 Subir captura del pago</button>
      <button class="btn p" id="pok">Avisar que pagué</button><button class="btn l" data-x>Cancelar</button>`, (h, c) => {
      let foto = ''; const fb = $('#pfb', h), fi = $('#pf', h);
      fb.onclick = () => fi.click();
      fi.onchange = async () => { const fl = fi.files[0]; if (!fl) return; fb.disabled = true; fb.textContent = 'Subiendo…'; try { foto = await subirFoto(fl, 1400); fb.textContent = '✅ Captura lista'; } catch (e) { toast(errDe(e)); fb.textContent = '📎 Subir captura del pago'; } fb.disabled = false; };
      $('#pok', h).onclick = async (ev) => { ev.target.disabled = true; try { await rpc('xy_order_report_payment', Object.assign({ p_order: o.id, p_method: $('#pm', h).value, p_ref: $('#pr', h).value }, foto && /^https:/.test(foto) ? { p_foto: foto } : {})); c(); vib(); toast('Listo. Avisamos a quien vende'); refrescar(); } catch (e) { toast(errDe(e)); ev.target.disabled = false; } };
    }));
    on('#vnd', async () => { try { await rpc('xy_p2p_close', { p_order: o.id, p_action: 'SOLD' }); toast(o.buyer_pay_foto ? 'Vendido ✓ · el comprador suma sus puntos' : 'Vendido ✓'); refrescar(); } catch (e) { toast(errDe(e)); } });
    on('#can', async () => { try { await rpc('xy_p2p_close', { p_order: o.id, p_action: 'CANCEL' }); toast('Trato cancelado'); refrescar(); } catch (e) { toast(errDe(e)); } });
    on('#dis', () => disputa(o.id, refrescar));
    const f = $('#fm', el); f && (f.onsubmit = async (e) => {
      e.preventDefault(); const t = $('#mt', el).value.trim(); if (!t) return;
      $('#mt', el).value = '';
      try {
        if (S.demo || S.sinCore) await rpc('p2p_msg', { p_order: o.id, body: t });
        else { const { error } = await S.sb.from('p2p_messages').insert({ order_id: o.id, sender_id: S.user.id, body: t }); if (error) throw error; }
        mensajes(o);
      } catch (er) { toast(errDe(er)); $('#mt', el).value = t; }
    });
    mensajes(o);
  };
  const mensajes = async (o) => {
    try {
      const M = await tabla('p2p_messages', (q) => q.select('id,sender_id,body,created_at').eq('order_id', o.id).order('id').limit(300), 'p2p_messages:' + o.id);
      const box = $('#ms', el); if (!box) return;
      if (M.length === ultimo && box.children.length) return; ultimo = M.length;
      box.innerHTML = M.length ? M.map((m) => `<div class="burb${m.sender_id === S.user.id ? ' yo' : ''}">${esc(m.body)}<span>${hora(m.created_at)}</span></div>`).join('')
        : '<p class="mu sm" style="text-align:center">Aún no hay mensajes. ¡Saluda!</p>';
      box.scrollTop = box.scrollHeight;
    } catch (e) { const box = $('#ms', el); box && (box.innerHTML = `<p class="mu sm">${esc(errDe(e))}</p>`); }
  };
  const refrescar = async () => { try { ultimo = -1; pinta(await cargar()); } catch (e) { toast(errDe(e)); } };
  await refrescar();
  if (!S.demo && !S.sinCore && S.sb) {
    canal = S.sb.channel('x-p2p-' + id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'p2p_messages', filter: 'order_id=eq.' + id }, () => { vib(); cargar().then((o) => o && mensajes(o)); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: 'id=eq.' + id }, () => { vib(); refrescar(); }).subscribe();
    poll = setInterval(() => cargar().then((o) => o && mensajes(o)).catch(() => {}), 15000);   // respaldo si Realtime no llega
  }
  return () => { clearInterval(poll); if (canal) S.sb.removeChannel(canal); };
}

function disputa(orderId, listo) {
  hoja(`<h2>¿Qué pasó?</h2><p class="mu sm">Cuéntanos y el equipo de Xyro te responde en Ayuda. Xyro no guarda dinero: te ayudamos a revisar el caso y podemos sancionar a quien incumplió.</p>
    <textarea id="dt" rows="4" maxlength="1000" placeholder="Ej: el producto llegó roto, no responde el vendedor…"></textarea>
    <button class="btn p" id="ok">Enviar a Xyro</button><button class="btn l" data-x>Cancelar</button>`, (h, c) => {
    $('#ok', h).onclick = async (ev) => {
      ev.target.disabled = true;
      try { await rpc('xy_order_dispute', { p_order: orderId, p_text: $('#dt', h).value }); c(); toast('Enviado. Te respondemos en Ayuda'); listo && listo(); }
      catch (e) { toast(errDe(e)); ev.target.disabled = false; }
    };
  });
}
export { disputa };

// ---------- Bóveda digital ----------
async function boveda(el) {
  el.innerHTML = `<div class="row"><a class="btn sm" href="#/billetera">‹ Billetera</a></div>
    <div><h1>🔐 Bóveda digital</h1><p class="mu">Tus compras digitales (ebooks, rutinas, cursos). Solo tú puedes abrirlas.</p></div><div class="card" id="bv"><div class="sk" style="height:100px"></div></div>`;
  try {
    const L = await rpc('xy_vault', {});
    $('#bv', el).innerHTML = (L && L.length) ? L.map((x) => `<div class="li"><span class="ico">💾</span><span class="sp"><b class="ell">${esc(x.title)}</b><br><span class="mu xs">${esc(x.entity_name || '')} · ${fecha(x.bought_at)}</span></span>
      ${x.ready ? `<button class="btn p sm" data-o="${esc(x.order_id)}" data-i="${esc(x.item_id)}">Abrir</button>` : '<span class="pill warn">Preparando</span>'}</div>`).join('')
      : `<div class="vacio"><div class="e">💾</div><b>Aún no tienes compras digitales</b><span class="mu sm">Cuando compres un ebook o curso y el negocio confirme tu pago, aparece aquí.</span><a class="btn" href="#/explorar">Explorar digitales</a></div>`;
    $$('[data-o]', el).forEach((b) => b.onclick = async () => {
      b.disabled = true;
      try { const d = await rpc('xy_digital_get', { p_order: b.dataset.o, p_item: b.dataset.i }); if (d && d.url) window.open(d.url, '_blank', 'noopener'); }
      catch (e) { toast(errDe(e)); } b.disabled = false;
    });
  } catch (e) { $('#bv', el).innerHTML = `<p class="mu">${esc(errDe(e))}</p>`; }
}

// ---------- Ayuda: mis tickets (disputas y consultas) ----------
const TEST = { OPEN: ['Abierto', 'warn'], PENDING_USER: ['Te respondimos', 'ok'], RESOLVED: ['Resuelto', 'ok'], CLOSED: ['Cerrado', ''] };
async function ayuda(el) {
  el.innerHTML = `<div class="row"><a class="btn sm" href="#/perfil">‹ Perfil</a><span class="sp"></span><button class="btn p sm" id="nt">＋ Nueva consulta</button></div>
    <div><h1>Ayuda</h1><p class="mu">Tus consultas y reclamos con el equipo de Xyro.</p></div><div class="card" id="lt"><div class="sk" style="height:100px"></div></div>`;
  const cargar = async () => {
    try {
      const L = await tabla('support_tickets', (q) => q.select('id,subject,category,status,messages,updated_at').eq('user_id', S.user.id).order('updated_at', { ascending: false }).limit(30), 'my_tickets');
      $('#lt', el).innerHTML = L.length ? L.map((t, i) => `<button class="li" data-i="${i}" style="width:100%;text-align:left"><span class="ico">${t.category === 'P2P_DISPUTE' ? '🤝' : '💬'}</span><span class="sp"><b class="ell">${esc(t.subject)}</b><br><span class="mu xs">${fecha(t.updated_at)} ${hora(t.updated_at)}</span></span><span class="pill ${(TEST[t.status] || [])[1] || ''}">${(TEST[t.status] || [t.status])[0]}</span></button>`).join('')
        : '<div class="vacio"><div class="e">💬</div><b>No tienes consultas</b><span class="mu sm">Si algo sale mal con un pedido, ábrelo desde el pedido con «Tengo un problema».</span></div>';
      $$('[data-i]', el).forEach((b) => b.onclick = () => verTicket(L[+b.dataset.i], cargar));
    } catch (e) { $('#lt', el).innerHTML = `<p class="mu">${esc(errDe(e))}</p>`; }
  };
  $('#nt', el).onclick = () => hoja(`<h2>Nueva consulta</h2><label>Asunto<input id="ns" maxlength="140" placeholder="Ej: No me llegó mi código"></label><textarea id="nm" rows="4" maxlength="1000" placeholder="Cuéntanos qué pasó"></textarea>
    <button class="btn p" id="ok">Enviar</button><button class="btn l" data-x>Cancelar</button>`, (h, c) => {
    $('#ok', h).onclick = async () => {
      const s = $('#ns', h).value.trim(), m = $('#nm', h).value.trim();
      if (s.length < 3 || m.length < 5) return toast('Escribe el asunto y el detalle');
      try {
        if (S.demo || S.sinCore) await rpc('ticket_new', { subject: s, t: m });
        else { const { error } = await S.sb.from('support_tickets').insert({ user_id: S.user.id, subject: s, messages: [{ de: 'user', t: m, at: new Date().toISOString() }] }); if (error) throw error; }
        c(); toast('Enviado ✓'); cargar();
      } catch (e) { toast(errDe(e)); }
    };
  });
  await cargar();
}

export function verTicket(t, listo, staff) {
  hoja(`<h2 class="ell">${esc(t.subject)}</h2><div class="msgs" style="max-height:46vh">${(t.messages || []).map((m) => `<div class="burb${(m.de === 'staff') === !!staff ? ' yo' : ''}">${esc(m.t)}<span>${m.de === 'staff' ? 'Xyro · ' : ''}${m.at ? fecha(m.at) + ' ' + hora(m.at) : ''}</span></div>`).join('')}</div>
    ${t.status === 'CLOSED' ? '<p class="mu sm">Esta consulta está cerrada.</p>' : `<textarea id="rt" rows="3" maxlength="1000" placeholder="Escribe tu respuesta"></textarea>
    ${staff ? `<div class="seg" id="st">${[['PENDING_USER', 'Responder'], ['RESOLVED', 'Resolver'], ['CLOSED', 'Cerrar']].map(([k, x], i) => `<button data-s="${k}" class="${i ? '' : 'on'}">${x}</button>`).join('')}</div>` : ''}
    <button class="btn p" id="ok">Enviar</button>`}<button class="btn l" data-x>Cerrar</button>`, (h, c) => {
    $$('#st button', h).forEach((b) => b.onclick = () => $$('#st button', h).forEach((x) => x.classList.toggle('on', x === b)));
    const ok = $('#ok', h); ok && (ok.onclick = async () => {
      const st = staff ? ($('#st .on', h) || {}).dataset.s : null;
      try { await rpc('xy_ticket_reply', { p_ticket: t.id, p_text: $('#rt', h).value, p_status: st || null }); c(); toast('Enviado ✓'); listo && listo(); }
      catch (e) { toast(errDe(e)); }
    });
  });
}
