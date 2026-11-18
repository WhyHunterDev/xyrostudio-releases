// Xyro · XyroStudio Panel (solo equipo con staff_role). Lo delicado sigue en /gestor/; aquí lo del núcleo Xyro (SQL 76 + 79):
// negocios por revisar, Boost pagado, Compra Protegida (cobro/retenido/pago al vendedor), cola de videos, tickets y moderación.
import { S, $, $$, esc, I, rpc, tabla, money, fecha, hora, toast, hoja, errDe } from '../core.js';
import { verTicket } from './p2p.js';

const TIPO = { PHYSICAL: 'Local físico', HYBRID: 'Híbrido', PROFESSIONAL: 'Profesional', DELIVERY_ECOMMERCE: 'Tienda con envíos', DIGITAL_PRODUCTS: 'Productos digitales' };
const ROL = { SUPERADMIN: 'Superadmin', SUPPORT: 'Soporte', MODERATOR: 'Moderación', SECURITY: 'Seguridad', MARKETING: 'Marketing', FINANCE: 'Finanzas' };
const pendientes = () => tabla('entities', (q) => q.select('id,slug,name,type,category,status,country,created_at').eq('status', 'PENDING').order('created_at').limit(100), 'entities_pending');

export async function vista(r, el) {
  if (r === 'p-inicio') return inicio(el);
  if (r === 'p-negocios') return negocios(el);
  if (r === 'p-soporte') return soporte(el);
  if (r === 'p-pagos') return pagos(el);
  if (r === 'p-videos') return videos(el);
}
const tiene = (...r) => S.me && (S.me.staff_role === 'SUPERADMIN' || r.includes(S.me.staff_role));
const sinRol = (t) => `<div class="card"><b>Sin acceso</b><span class="mu sm">${t}</span></div>`;
const cuenta = async (t, fn, dk) => { try { return (await tabla(t, fn, dk)).length; } catch (_) { return '—'; } };

async function inicio(el) {
  el.innerHTML = `<div><h1>XyroStudio Panel</h1><p class="mu">Tu rol: <b>${esc(ROL[S.me.staff_role] || S.me.staff_role)}</b></p></div>
    <div class="kpis"><div class="kpi"><span class="mu xs">Negocios por revisar</span><b id="kp">…</b></div>
      <div class="kpi"><span class="mu xs">Tickets abiertos</span><b id="kt">…</b><span class="mu xs">Xyro</span></div>
      <div class="kpi"><span class="mu xs">Pagos protegidos</span><b id="kg">…</b><span class="mu xs">por confirmar</span></div></div>
    <div class="card"><b>Atajos</b>
      <a class="li" href="#/p-negocios" style="text-decoration:none"><span class="ico">${I.shield}</span><span class="sp">Aprobar negocios nuevos</span>›</a>
      <a class="li" href="/gestor/" style="text-decoration:none"><span class="ico">${I.chart}</span><span class="sp">Abrir el Panel XyroStudio completo<br><span class="mu xs">Cobros, Actualizaciones, Registros gratis</span></span>›</a></div>`;
  try { $('#kp', el).textContent = (await pendientes()).length; } catch (e) { $('#kp', el).textContent = '—'; }
  $('#kt', el).textContent = await cuenta('support_tickets', (q) => q.select('id').eq('status', 'OPEN').limit(200), 'tickets');
  $('#kg', el).textContent = await cuenta('orders', (q) => q.select('id').eq('fulfillment_mode', 'P2P').eq('protected', true).eq('status', 'AWAITING_PAYMENT').limit(200), 'p2p_orders');
}

async function negocios(el) {
  el.innerHTML = `<div><h1>Negocios por revisar</h1><p class="mu">Al aprobar, el negocio aparece en Explorar. Verificado = revisaste sus documentos.</p></div><div class="card" id="ln"><div class="sk" style="height:120px"></div></div>
    <div class="card"><b>⚡ Boost y planes pagados</b><span class="mu sm">Cuando un negocio o entrenador te pague por Yape, búscalo y actívalo aquí (rol Finanzas o Superadmin). Plus o Pro duran 30 días por pago.</span>
      <div class="row"><input id="bq" placeholder="Nombre del negocio" autocomplete="off"><button class="btn" id="bb">Buscar</button></div><div id="br"></div></div>`;
  $('#bb', el).onclick = async () => {
    const t = $('#bq', el).value.trim(); if (t.length < 2) return toast('Escribe al menos 2 letras');
    try {
      const L = S.demo || S.sinCore ? (await tabla('entities', (q) => q)).filter((e) => e.name.toLowerCase().includes(t.toLowerCase()))
        : await tabla('entities', (q) => q.select('id,name,slug,boost_until,plan,plan_until,type').in('status', ['ACTIVE', 'PENDING']).ilike('name', '*' + t.replace(/[^\p{L}\p{N} .-]/gu, '') + '*').limit(8));
      $('#br', el).innerHTML = L.length ? L.map((e) => `<div class="li wrap"><span class="sp"><b>${esc(e.name)}</b><br><span class="mu xs">${e.boost_until && new Date(e.boost_until) > new Date() ? 'Boost hasta ' + fecha(e.boost_until) + ' ' + hora(e.boost_until) : 'Sin Boost'} · ${e.plan === 'FREE' || !e.plan ? 'Plan gratis' : '⭐ ' + esc(e.plan) + (e.plan_until ? ' hasta ' + fecha(e.plan_until) : '')}</span></span>
        <span class="row">${[[24, '1 día'], [168, '7 días'], [720, '30 días']].map(([h, t2]) => `<button class="btn sm" data-bo="${e.id}" data-h="${h}">${t2}</button>`).join('')}
          <button class="btn sm" data-pl="${e.id}" data-v="PLUS">Plus 30 días</button><button class="btn sm p" data-pl="${e.id}" data-v="PRO">⭐ Pro 30 días</button>${e.plan && e.plan !== 'FREE' ? `<button class="btn sm l" data-pl="${e.id}" data-v="FREE">Volver a gratis</button>` : ''}</span></div>`).join('') : '<p class="mu sm">Sin resultados.</p>';
      $$('[data-pl]', el).forEach((b) => b.onclick = async () => {
        b.disabled = true;
        try { await rpc('xy_set_plan', { p_entity: b.dataset.pl, p_plan: b.dataset.v, p_days: 30 }); toast(b.dataset.v === 'FREE' ? 'Volvió al plan gratis' : b.dataset.v + ' activado ⭐'); $('#bb', el).click(); }
        catch (e) { toast(errDe(e)); b.disabled = false; }
      });
      $$('[data-bo]', el).forEach((b) => b.onclick = async () => {
        b.disabled = true;
        try { await rpc('xy_boost', { p_entity: b.dataset.bo, p_hours: +b.dataset.h, p_points: 0, p_mult: 2 }); toast('Boost activado ⚡'); $('#bb', el).click(); }
        catch (e) { toast(errDe(e)); b.disabled = false; }
      });
    } catch (e) { toast(errDe(e)); }
  };
  const pinta = async () => {
    try {
      const L = await pendientes();
      $('#ln', el).innerHTML = L.length ? L.map((e) => `<div class="li wrap"><span class="ico">🏪</span><span class="sp"><b>${esc(e.name)}</b> <span class="mu xs">/${esc(e.slug)}</span><br>
        <span class="mu xs">${TIPO[e.type] || e.type} · ${esc(e.category)} · ${esc(e.country)} · ${fecha(e.created_at)} ${hora(e.created_at)}</span></span>
        <span class="row"><button class="btn sm" data-a="${e.id}" data-s="SUSPENDED">Rechazar</button><button class="btn sm" data-a="${e.id}" data-s="ACTIVE">Aprobar</button><button class="btn p sm" data-a="${e.id}" data-s="ACTIVE" data-v="1">Aprobar ✓ verificado</button></span></div>`).join('')
        : '<div class="vacio"><div class="e">✅</div><span class="mu">No hay negocios pendientes.</span></div>';
      $$('[data-a]', el).forEach((b) => b.onclick = async () => {
        b.disabled = true;
        try { await rpc('xy_entity_review', { p_entity: b.dataset.a, p_status: b.dataset.s, p_verified: !!b.dataset.v }); toast(b.dataset.s === 'ACTIVE' ? 'Aprobado ✓' : 'Rechazado'); pinta(); }
        catch (e) { toast(errDe(e)); b.disabled = false; }
      });
    } catch (e) { $('#ln', el).innerHTML = `<p class="mu">${esc(errDe(e))}</p>`; }
  };
  pinta();
}

// ---------- Soporte: tickets de Xyro (compras, P2P, disputas) + publicaciones reportadas ----------
const TEST = { OPEN: ['Abierto', 'warn'], PENDING_USER: ['Esperando a la persona', ''], RESOLVED: ['Resuelto', 'ok'], CLOSED: ['Cerrado', ''] };
const TCAT = { GENERAL: '💬', ORDER: '🧾', PAYMENT: '💳', FRAUD: '🚨', VERIFICATION: '🪪', P2P_DISPUTE: '🤝', ACCOUNT: '👤' };
// ---------- Alertas de puntos (SQL 82): patrones de farmeo y castigo (deja de dar globales y anula los que están en espera)
const FTIPO = { CONCENTRACION: '👥 Siempre los mismos clientes', CUENTAS_NUEVAS: '🆕 Compradores con cuentas nuevas', CRUZADAS: '🔁 Se compran entre ellos', RAPIDAS: '⚡ Confirmaciones al instante', TOPES: '🧱 Choca con los topes' };
async function alertas(el) {
  el.insertAdjacentHTML('beforeend', `<div class="card"><b>🚩 Alertas de puntos</b><span class="mu xs">Últimos 14 días. Los puntos globales quedan 7 días en espera: si bloqueas, se anulan los que aún no se liberan.</span><div id="fa"><div class="sk" style="height:60px"></div></div></div>`);
  const box = $('#fa', el);
  const carga = async () => { try {
    const L = await rpc('xy_fraud_signals') || [];
    box.innerHTML = L.length ? L.map((a) => `<div class="li wrap"><span class="sp"><b>${esc(a.name)}</b> ${a.blocked ? '<span class="pill bad">Bloqueado</span>' : ''}<br><span class="xs">${FTIPO[a.tipo] || esc(a.tipo)}</span><br><span class="mu xs">${esc(a.detalle)}</span></span>
      <button class="btn sm ${a.blocked ? '' : 'p'}" data-fb="${esc(a.entity)}" data-v="${a.blocked ? '0' : '1'}">${a.blocked ? 'Desbloquear' : 'Bloquear puntos'}</button></div>`).join('')
      : '<p class="mu sm">Sin alertas. Todo en orden ✓</p>';
    $$('[data-fb]', box).forEach((b) => b.onclick = async () => {
      b.disabled = true;
      try { const r = await rpc('xy_entity_points_block', { p_entity: b.dataset.fb, p_block: b.dataset.v === '1', p_reason: 'Alerta de puntos' }); toast(b.dataset.v === '1' ? `Bloqueado ✓ ${r && r.reversed ? r.reversed + ' asientos anulados' : ''}` : 'Desbloqueado ✓'); carga(); }
      catch (e) { toast(errDe(e)); b.disabled = false; }
    });
  } catch (e) { box.innerHTML = `<p class="mu sm">${esc(errDe(e))}</p>`; } };
  carga();
}

async function soporte(el) {
  if (!tiene('SUPPORT', 'MODERATOR', 'SECURITY')) { el.innerHTML = sinRol('Tickets y moderación son para Soporte, Moderación o Seguridad.'); return; }
  el.innerHTML = `<div><h1>Soporte</h1><p class="mu">Tickets de Xyro con prioridad. Los de Xyro Apps siguen en el <a href="/gestor/">Panel XyroStudio</a>.</p></div>
    <div class="seg" id="tf"><button data-f="OPEN" class="on">Abiertos</button><button data-f="PENDING_USER">Esperando</button><button data-f="RESOLVED">Resueltos</button></div>
    <div class="dos"><div class="card" id="lt"><div class="sk" style="height:120px"></div></div>
    <div class="card"><b>🚩 Publicaciones reportadas</b><span class="mu xs">Con 5 reportes se ocultan solas. Revisa y decide.</span><div id="lr"><div class="sk" style="height:80px"></div></div></div></div>`;
  alertas(el);
  let f = 'OPEN';
  const cargar = async () => {
    try {
      let L = await tabla('support_tickets', (q) => q.select('id,subject,category,status,priority,messages,order_id,updated_at').eq('status', f).order('priority').order('updated_at').limit(60), 'tickets');
      if (S.demo || S.sinCore) L = L.filter((t) => t.status === f);
      $('#lt', el).innerHTML = L.length ? L.map((t, i) => `<button class="li" data-i="${i}" style="width:100%;text-align:left"><span class="ico">${TCAT[t.category] || '💬'}</span>
        <span class="sp"><b class="ell">${esc(t.subject)}</b>${t.priority === 1 ? ' <span class="pill bad">Prioridad</span>' : ''}<br><span class="mu xs">${esc(((t.messages || []).slice(-1)[0] || {}).t || '').slice(0, 80)} · ${fecha(t.updated_at)} ${hora(t.updated_at)}</span></span>
        <span class="pill ${(TEST[t.status] || [])[1] || ''}">${(TEST[t.status] || [t.status])[0]}</span></button>`).join('')
        : '<div class="vacio"><div class="e">✅</div><span class="mu">Nada por aquí.</span></div>';
      $$('#lt [data-i]', el).forEach((b) => b.onclick = () => verTicket(L[+b.dataset.i], cargar, true));
    } catch (e) { $('#lt', el).innerHTML = `<p class="mu">${esc(errDe(e))}</p>`; }
  };
  const reportes = async () => {
    try {
      const R = await tabla('marketplace_listings', (q) => q.select('id,title,price,currency,status,reports,photos,description').gt('reports', 0).in('status', ['ACTIVE', 'RESERVED', 'REMOVED']).order('reports', { ascending: false }).limit(30), 'listings_reported');
      $('#lr', el).innerHTML = R.length ? R.map((m) => `<div class="li wrap"><span class="sp"><b class="ell">${esc(m.title)}</b> <span class="pill bad">${m.reports} 🚩</span><br><span class="mu xs">${money(m.price, m.currency)} · ${m.status === 'REMOVED' ? 'Oculta' : 'Visible'}</span></span>
        <span class="row"><button class="btn sm" data-m="${m.id}" data-s="ACTIVE">Está bien</button><button class="btn sm" data-m="${m.id}" data-s="BANNED">Bloquear</button></span></div>`).join('')
        : '<p class="mu sm">Sin reportes.</p>';
      $$('[data-m]', el).forEach((b) => b.onclick = async () => {
        if (!tiene('MODERATOR')) return toast('Solo Moderación');
        b.disabled = true;
        try {
          if (!S.demo && !S.sinCore) { const { error } = await S.sb.from('marketplace_listings').update({ status: b.dataset.s }).eq('id', b.dataset.m); if (error) throw error; }
          toast(b.dataset.s === 'BANNED' ? 'Bloqueada' : 'Aprobada'); b.closest('.li').remove();
        } catch (e) { toast(errDe(e)); b.disabled = false; }
      });
    } catch (e) { $('#lr', el).innerHTML = `<p class="mu sm">${esc(errDe(e))}</p>`; }
  };
  $$('#tf button', el).forEach((b) => b.onclick = () => { f = b.dataset.f; $$('#tf button', el).forEach((x) => x.classList.toggle('on', x === b)); cargar(); });
  cargar(); reportes();
}

// ---------- Pagos: Compra Protegida (cobro → retenido → pago al vendedor) ----------
async function pagos(el) {
  if (!tiene('FINANCE', 'SUPPORT', 'SECURITY')) { el.innerHTML = sinRol('Pagos es para Finanzas.'); return; }
  el.innerHTML = `<div><h1>Pagos protegidos</h1><p class="mu">Marketplace con Compra Protegida. El comprador te paga por Yape con su código; tú lo confirmas aquí.</p></div>
    <div class="seg" id="pf"><button data-f="cob" class="on">Por confirmar</button><button data-f="ret">Retenidos</button><button data-f="pag">Pagar al vendedor</button><button data-f="dis">En disputa</button></div>
    <div class="card" id="lp"><div class="sk" style="height:120px"></div></div>`;
  const F = { cob: (o) => o.status === 'AWAITING_PAYMENT', ret: (o) => o.status === 'PAID', pag: (o) => o.status === 'COMPLETED' && !o.payout_at, dis: (o) => o.status === 'DISPUTED' };
  let f = 'cob', O = [];
  const pinta = () => {
    const L = O.filter(F[f]);
    $('#lp', el).innerHTML = L.length ? L.map((o) => `<div class="li wrap"><span class="ico">🛡️</span><span class="sp"><b>#${esc(o.code)}</b> · ${esc((o.marketplace_listings && o.marketplace_listings.title) || '')}<br>
      <span class="mu xs">${fecha(o.created_at)} ${hora(o.created_at)} · total ${money(o.total, o.currency)} · comisión ${money(o.commission_amount, o.currency)}</span></span>
      <span class="row">${f === 'cob' ? `<button class="btn p sm" data-a="paid" data-o="${o.id}">Recibí ${money(o.total, o.currency)}</button>`
        : f === 'pag' ? `<button class="btn p sm" data-a="out" data-o="${o.id}">Ya le pagué ${money(o.total - o.commission_amount, o.currency)}</button>`
        : f === 'ret' ? '<span class="mu xs">Esperando que el comprador confirme</span>' : '<a class="btn sm" href="#/p-soporte">Ver ticket</a>'}</span></div>`).join('')
      : '<div class="vacio"><div class="e">✅</div><span class="mu">Nada pendiente.</span></div>';
    $$('[data-a]', el).forEach((b) => b.onclick = () => hoja(`<h2>${b.dataset.a === 'paid' ? '¿Te llegó el pago?' : '¿Ya transferiste al vendedor?'}</h2>
      <p class="mu sm">${b.dataset.a === 'paid' ? 'Revisa tu Yape: monto y código deben coincidir. El dinero queda retenido hasta que el comprador reciba.' : 'Confírmalo solo después de transferir. Queda registrado en la auditoría.'}</p>
      <button class="btn p" id="si">Sí, confirmar</button><button class="btn l" data-x>Cancelar</button>`, (h, c) => {
      $('#si', h).onclick = async () => {
        try { await rpc(b.dataset.a === 'paid' ? 'xy_p2p_mark_paid' : 'xy_p2p_payout', { p_order: b.dataset.o }); c(); toast('Listo ✓'); cargar(); }
        catch (e) { toast(errDe(e)); }
      };
    }));
  };
  const cargar = async () => {
    try {
      O = await tabla('orders', (q) => q.select('id,code,status,total,currency,commission_amount,created_at,payout_at,protected,marketplace_listings(title)').eq('fulfillment_mode', 'P2P').eq('protected', true).in('status', ['AWAITING_PAYMENT', 'PAID', 'COMPLETED', 'DISPUTED']).order('created_at').limit(200), 'p2p_orders');
      O = O.filter((o) => o.protected);
      pinta();
    } catch (e) { $('#lp', el).innerHTML = `<p class="mu">${esc(errDe(e))}</p>`; }
  };
  $$('#pf button', el).forEach((b) => b.onclick = () => { f = b.dataset.f; $$('#pf button', el).forEach((x) => x.classList.toggle('on', x === b)); pinta(); });
  await cargar();
}

// ---------- Videos: cola de Xyro Edits ----------
const VEST = { QUEUED: ['En cola', 'warn'], PROCESSING: ['Editando', ''], DONE: ['Listo', 'ok'], FAILED: ['No se pudo', 'bad'], EXPIRED: ['Vencido', ''] };
async function videos(el) {
  if (!tiene('SUPPORT', 'MARKETING')) { el.innerHTML = sinRol('La cola de videos es para Soporte o Marketing.'); return; }
  el.innerHTML = `<div><h1>Cola de videos</h1><p class="mu">Pedidos de Xyro Edits. Edita el video 9:16, súbelo (Drive) y pega el enlace: el negocio lo ve en su Xyro Control.</p></div>
    <div class="seg" id="vf"><button data-f="cola" class="on">Por hacer</button><button data-f="hech">Hechos</button></div><div class="card" id="lv"><div class="sk" style="height:120px"></div></div>`;
  let f = 'cola';
  const cargar = async () => {
    try {
      let L = await tabla('video_jobs', (q) => q.select('id,status,template,prompt,catalog_item_ids,r2_key,error,created_at,entity_id,entities(name,slug)')
        .in('status', f === 'cola' ? ['QUEUED', 'PROCESSING'] : ['DONE', 'FAILED']).order('created_at', { ascending: f === 'cola' }).limit(60));
      if (S.demo || S.sinCore) L = L.filter((v) => (f === 'cola') === ['QUEUED', 'PROCESSING'].includes(v.status));
      $('#lv', el).innerHTML = L.length ? L.map((v) => `<div class="li wrap"><span class="ico">🎬</span><span class="sp"><b>${esc((v.entities && v.entities.name) || 'Negocio')}</b> <span class="pill ${VEST[v.status][1]}">${VEST[v.status][0]}</span><br>
        <span class="mu xs">${esc(v.template)} · ${fecha(v.created_at)} ${hora(v.created_at)}${(v.catalog_item_ids || []).length ? ' · ' + v.catalog_item_ids.length + ' productos' : ''}</span>${v.prompt ? `<br><span class="xs">“${esc(v.prompt)}”</span>` : ''}</span>
        <span class="row">${v.status === 'QUEUED' ? `<button class="btn sm" data-v="${v.id}" data-s="PROCESSING">Empezar</button>` : ''}${['QUEUED', 'PROCESSING'].includes(v.status) ? `<button class="btn p sm" data-v="${v.id}" data-s="DONE">Entregar</button><button class="btn sm" data-v="${v.id}" data-s="FAILED">No se puede</button>` : v.r2_key ? `<a class="btn sm" href="${esc(v.r2_key)}" target="_blank" rel="noopener">Ver</a>` : ''}</span></div>`).join('')
        : '<div class="vacio"><div class="e">🎬</div><span class="mu">Nada en esta lista.</span></div>';
      $$('[data-v]', el).forEach((b) => b.onclick = async () => {
        const s = b.dataset.s;
        const env = async (link, err) => { try { await rpc('xy_video_set', { p_job: b.dataset.v, p_status: s, p_link: link || null, p_error: err || null }); toast('Listo ✓'); cargar(); return true; } catch (e) { toast(errDe(e)); return false; } };
        if (s === 'PROCESSING') return env();
        hoja(`<h2>${s === 'DONE' ? 'Entregar video' : '¿Por qué no se puede?'}</h2>
          <input id="vl" ${s === 'DONE' ? 'type="url" placeholder="https://drive.google.com/…"' : 'maxlength="300" placeholder="Ej: faltan fotos del producto"'} autocomplete="off">
          <button class="btn p" id="ok">Guardar</button><button class="btn l" data-x>Cancelar</button>`, (h, c) => {
          $('#ok', h).onclick = async () => { const v = $('#vl', h).value.trim(); if (await (s === 'DONE' ? env(v) : env(null, v))) c(); };
        });
      });
    } catch (e) { $('#lv', el).innerHTML = `<p class="mu">${esc(errDe(e))}</p>`; }
  };
  $$('#vf button', el).forEach((b) => b.onclick = () => { f = b.dataset.f; $$('#vf button', el).forEach((x) => x.classList.toggle('on', x === b)); cargar(); });
  await cargar();
}
