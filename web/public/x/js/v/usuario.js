// Xyro · Modo Usuario: Explorar, Billetera y Socios, Perfil. (Marketplace, Bóveda y Ayuda → p2p.js)
import { S, $, $$, esc, I, rpc, tabla, money, num, dist, fecha, hora, toast, hoja, errDe, ubicar, NIVELES, CAT, ls } from '../core.js';

export async function vista(r, el) {
  if (r === 'explorar') return explorar(el);
  if (r === 'billetera') return billetera(el);
  if (r === 'perfil') return perfil(el);
}

const estrellas = (a, n) => n ? `<span class="est">★ ${(+a).toFixed(1)}</span> <span class="mu xs">(${num(n)})</span>` : '<span class="mu xs">Nuevo</span>';
const MODO_TXT = { PRODUCT: 'Producto', SERVICE: 'Servicio', SESSION: 'Sesión', CLASS_PACK: 'Paquete', DIGITAL: 'Digital', MEMBERSHIP: 'Membresía' };

// ---------- Explorar ----------
function explorar(el) {
  const F = { q: '', cat: ls.g('x-cat') || '', radio: 15 };
  el.innerHTML = `<div><h1>Explorar</h1><p class="mu">Negocios, entrenadores y productos cerca de ti y en todo el mundo.</p></div>
    <div class="ex"><div class="filtros">
      <div class="srch">${I.search}<input id="q" type="search" placeholder="Busca «waffles», «gym», «inglés»…" enterkeyhint="search" autocomplete="off"></div>
      <div class="chips" id="cats">${CAT.map(([k, e, t]) => `<button class="chip${k === F.cat ? ' on' : ''}" data-c="${k}">${e} ${t}</button>`).join('')}</div>
      <div class="card solo-pc"><b class="sm">Distancia</b>
        <div class="seg" id="rad">${[2, 5, 15, 50].map((k) => `<button data-r="${k}" class="${k === F.radio ? 'on' : ''}">${k} km</button>`).join('')}</div>
        <p class="mu xs">Lo digital y los servicios en línea se ven en todo el mundo.</p></div>
      <div class="card solo-pc"><b class="sm">Cómo ordenamos</b><p class="mu xs">Primero negocios con Boost, luego mejor calificados y más cerca.</p></div>
    </div>
    <div class="g"><div class="row"><span class="mu sm sp" id="ub">${I.pin.replace('<svg', '<svg style="width:15px;height:15px;vertical-align:-2px"')} Buscando tu ubicación…</span></div>
      <div class="grid" id="res"></div></div></div>`;
  let t = 0;
  const cargar = async () => {
    const res = $('#res', el); res.innerHTML = Array(4).fill('<div class="sk" style="height:220px"></div>').join('');
    try {
      const L = await rpc('search_nearby_products', { p_query: F.q || null, p_lat: S.geo && S.geo.lat, p_lng: S.geo && S.geo.lng, p_radius_km: F.radio, p_country: S.me && S.me.country, p_category: F.cat || null, p_limit: 30, p_offset: 0 });
      if (!L || !L.length) { res.innerHTML = `<div class="vacio" style="grid-column:1/-1"><div class="e">🔎</div><b>No encontramos resultados</b><span class="mu sm">Prueba otra palabra o una categoría distinta.</span></div>`; return; }
      res.innerHTML = L.map((p, i) => `<button class="prod" data-i="${i}" style="animation-delay:${Math.min(i, 8) * 40}ms">
        <div class="ph" ${p.photo ? `style="background-image:url('${esc(p.photo)}')"` : ''}>${p.photo ? '' : esc(p.emoji || '🛍️')}${p.boosted ? '<span class="pill boost">⚡ Destacado</span>' : ''}</div>
        <div class="bd"><span class="mu xs ell">${esc(p.entity_name)}</span><b class="ell">${esc(p.title)}</b>
          <div class="row"><span class="pr">${money(p.price, p.currency)}</span><span class="sp"></span>${estrellas(p.rating_avg, p.rating_count)}</div>
          <span class="mu xs">${p.distance_m != null ? '📍 ' + dist(p.distance_m) : p.remote_ok ? '🌎 En línea / envío' : ''} · ${MODO_TXT[p.kind] || ''}</span></div></button>`).join('');
      $$('.prod', res).forEach((b) => b.onclick = () => detalle(L[+b.dataset.i]));
    } catch (e) { res.innerHTML = `<div class="vacio" style="grid-column:1/-1"><div class="e">⚠️</div><span>${esc(errDe(e))}</span></div>`; }
  };
  $('#q', el).oninput = (e) => { clearTimeout(t); t = setTimeout(() => { F.q = e.target.value.trim(); cargar(); }, 320); };
  $$('#cats .chip', el).forEach((b) => b.onclick = () => { F.cat = b.dataset.c; ls.s('x-cat', F.cat || null); $$('#cats .chip', el).forEach((x) => x.classList.toggle('on', x === b)); cargar(); });
  $$('#rad button', el).forEach((b) => b.onclick = () => { F.radio = +b.dataset.r; $$('#rad button', el).forEach((x) => x.classList.toggle('on', x === b)); cargar(); });
  ubicar().then((g) => { const u = $('#ub', el); if (u) u.lastChild.textContent = g ? (g.demo ? ' Ubicación de ejemplo: Lima' : ' Cerca de ti') : ' Sin ubicación: te mostramos lo de tu país'; cargar(); });
}

function detalle(p) {
  hoja(`<div class="ph" style="height:160px;border-radius:16px;background:var(--c2) ${p.photo ? `url('${esc(p.photo)}') center/cover` : ''};display:grid;place-items:center;font-size:60px">${p.photo ? '' : esc(p.emoji || '🛍️')}</div>
    <div><span class="mu sm">${esc(p.entity_name)}</span><h2>${esc(p.title)}</h2></div>
    <div class="row"><b style="font-size:22px">${money(p.price, p.currency)}</b><span class="sp"></span>${estrellas(p.rating_avg, p.rating_count)}</div>
    <div class="card" style="background:var(--c2)"><b class="sm">¿Cómo se compra?</b>
      <span class="mu sm">${p.entity_type === 'PHYSICAL' ? 'En el local: escanea el QR de la mesa o del mostrador y paga ahí. Sumas puntos al confirmar el pago.' : p.kind === 'DIGITAL' ? 'Producto digital: pídelo desde su carta y, cuando el negocio confirme tu pago, queda en tu Bóveda digital (Billetera).' : 'Escríbele por chat o escanea su QR para coordinar.'}</span></div>
    <div class="dos" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <a class="btn" href="#/carta?e=${encodeURIComponent(p.entity_id || '')}" data-x>🍽️ Ver carta</a>
      <a class="btn p" href="#/escanear" data-x>${I.scan} Escanear QR</a></div>
    <a class="btn l" href="/mi/?n=${encodeURIComponent(p.entity_slug)}">Ver su perfil en Mi Xyro</a>
    <button class="btn l" data-x>Cerrar</button>`);
}

// ---------- Billetera y Socios ----------
async function billetera(el) {
  const me = S.me || {};
  const lv = me.level || 'BRONZE', ks = Object.keys(NIVELES), sig = ks[ks.indexOf(lv) + 1];
  const vida = +me.global_points_lifetime || 0, de = NIVELES[lv][1], a = sig ? NIVELES[sig][1] : vida;
  const pct = sig ? Math.min(100, Math.round((vida - de) / Math.max(1, a - de) * 100)) : 100;
  el.innerHTML = `<h1>Billetera</h1><div class="dos"><div class="g">
    <div class="wallet ${lv}"><div class="row"><b>Xyro Points</b><span class="sp"></span><span class="pill" style="background:#0006">${NIVELES[lv][0]}</span></div>
      <div><div class="pts" id="pG">…</div><span class="sm" id="pP" style="opacity:.8"></span></div>
      <div class="g" style="gap:6px"><div class="barra"><b style="width:${pct}%"></b></div>
        <span class="xs" style="opacity:.85">${sig ? `${num(a - vida)} puntos para ${NIVELES[sig][0]}` : 'Nivel máximo'}</span></div></div>
    <div class="kpis" style="grid-template-columns:repeat(2,1fr)">
      <div class="kpi"><span class="mu xs">Racha</span><b>${I.flame.replace('<svg', '<svg style="width:18px;height:18px;color:#fb923c;vertical-align:-2px"')} ${num(me.current_streak_weeks)} sem</b><span class="mu xs">${num(me.streak_week_count)}/2 compras esta semana</span></div>
      <div class="kpi"><span class="mu xs">Xyro Pass</span><b>${me.xyro_pass_until && new Date(me.xyro_pass_until) > new Date() ? 'Activo' : '—'}</b><span class="mu xs">${me.xyro_pass_until ? 'Hasta ' + fecha(me.xyro_pass_until) : 'Muy pronto'}</span></div></div>
    <a class="li card" href="#/boveda" style="text-decoration:none;padding:14px 16px"><span class="ico">🔐</span><span class="sp"><b>Bóveda digital</b><br><span class="mu xs">Tus ebooks, rutinas y cursos comprados</span></span>›</a>
    <div class="card"><b>Puntos por negocio</b><span class="mu xs">Se canjean solo en ese negocio.</span><div id="loc"><div class="sk" style="height:60px"></div></div></div>
  </div><div class="g"><div class="row"><h2 class="sp">Mis membresías activas</h2></div><div class="g" id="mem"><div class="sk" style="height:170px"></div></div></div></div>`;
  try {
    const B = await tabla('points_balances', (q) => q.select('entity_id,bucket,available,pending').eq('user_id', S.user.id));
    const G = B.find((b) => b.bucket === 'USER_GLOBAL') || { available: 0, pending: 0 };
    $('#pG', el).textContent = num(G.available);
    $('#pP', el).textContent = +G.pending ? `+${num(G.pending)} por confirmar` : 'Puntos globales: úsalos en cualquier negocio Xyro';
    const L = B.filter((b) => b.bucket === 'USER_LOCAL');
    if (L.length && !L[0].entity_name && !S.demo && !S.sinCore) {
      const ids = L.map((x) => x.entity_id); const E = await tabla('entities', (q) => q.select('id,name').in('id', ids));
      L.forEach((x) => { const e = E.find((y) => y.id === x.entity_id); x.entity_name = e ? e.name : 'Negocio'; });
    }
    $('#loc', el).innerHTML = L.length ? L.map((x) => `<div class="li"><span class="ico">🏪</span><span class="sp ell">${esc(x.entity_name)}</span><span style="text-align:right"><b>${num(x.available)}</b>${+x.pending ? `<br><span class="mu xs">+${num(x.pending)}</span>` : ''}</span></div>`).join('')
      : '<p class="mu sm">Compra escaneando el QR de un negocio y suma puntos aquí.</p>';
    const M = await tabla('user_entity_memberships', (q) => q.select('id,entity_id,kind,status,valid_from,valid_until,sessions_left,stamps,entities(name,slug,category,phone)').eq('user_id', S.user.id).eq('status', 'ACTIVE').neq('kind', 'FOLLOW').order('valid_until', { ascending: true, nullsFirst: false }));
    pintarMembresias($('#mem', el), M);
  } catch (e) { toast(errDe(e)); }
}

// Tarjetas estilo Wallet: días restantes, check-in (QR + GPS ≤ 50 m en la base) y renovar.
const K_MEM = { PASS: 'Membresía', CLASS_PACK: 'Paquete de clases', STAMP_CARD: 'Tarjeta de sellos' };
const EMO = { gym: '🏋️', entrenador: '🧑‍🏫', profesor: '📚', cafeteria: '☕', restaurante: '🍽️', barberia: '💈', consultorio: '🦷' };
function pintarMembresias(box, M) {
  M = M.filter((m) => !m.valid_until || new Date(m.valid_until) > new Date());
  if (!M.length) { box.innerHTML = `<div class="card vacio"><div class="e">🎟️</div><b>Aún no tienes membresías</b><span class="mu sm">Cuando te afilies a un gym o entrenador, tu tarjeta aparece aquí.</span><a class="btn" href="#/explorar">Explorar gyms y entrenadores</a></div>`; return; }
  const ahora = Date.now();
  box.innerHTML = M.map((m) => {
    const e = m.entities || {}, fin = m.valid_until ? +new Date(m.valid_until) : null, ini = m.valid_from ? +new Date(m.valid_from) : null;
    const dias = fin ? Math.max(0, Math.ceil((fin - ahora) / 864e5)) : null;
    const pct = fin && ini && fin > ini ? Math.max(0, Math.min(100, Math.round((fin - ahora) / (fin - ini) * 100))) : 100;
    const poco = (dias != null && dias <= 3) || (m.kind === 'CLASS_PACK' && +m.sessions_left <= 1);
    const grande = m.kind === 'CLASS_PACK' ? [num(m.sessions_left), +m.sessions_left === 1 ? 'sesión' : 'sesiones'] : m.kind === 'STAMP_CARD' ? [num(m.stamps) + '/10', 'sellos'] : [dias == null ? '∞' : num(dias), dias === 1 ? 'día' : 'días'];
    const ren = e.phone ? `https://wa.me/${String(e.phone).replace(/\D/g, '')}?text=${encodeURIComponent('Hola, quiero renovar mi plan en ' + (e.name || '') + ' (vengo de Xyro)')}` : '/mi/?n=' + encodeURIComponent(e.slug || '');
    return `<div class="mem ${esc(e.category || '')}${poco ? ' poco' : ''}">
      <div class="row"><span class="mem-ic">${esc(m.emoji || EMO[e.category] || '🎟️')}</span><span class="sp"><b class="ell">${esc(e.name || 'Negocio')}</b><br><span class="xs" style="opacity:.8">${K_MEM[m.kind] || ''}</span></span>
        ${poco ? '<span class="pill warn">Por vencer</span>' : '<span class="pill ok">Activa</span>'}</div>
      <div class="row" style="align-items:flex-end"><div class="sp"><span class="mem-n">${grande[0]}</span> <span class="sm">${grande[1]}${m.kind === 'PASS' ? ' restantes' : ''}</span></div>
        ${fin ? `<span class="xs" style="opacity:.8;text-align:right">Vence<br><b>${fecha(m.valid_until)}</b></span>` : ''}</div>
      ${m.kind !== 'STAMP_CARD' ? `<div class="barra"><b style="width:${pct}%"></b></div>` : ''}
      <div class="mem-bt">${m.kind !== 'STAMP_CARD' ? `<a class="btn p sm" href="#/escanear?c=${encodeURIComponent(m.id)}">${I.scan} Check-in / Escanear entrada</a>` : ''}
        <a class="btn sm" href="${esc(ren)}" ${e.phone ? 'target="_blank" rel="noopener"' : ''}>↻ Renovar plan</a></div></div>`;
  }).join('');
}

// ---------- Perfil ----------
function perfil(el) {
  const me = S.me || {};
  const P = [['PE', 'Perú', 'PEN'], ['MX', 'México', 'MXN'], ['CO', 'Colombia', 'COP'], ['CL', 'Chile', 'CLP'], ['AR', 'Argentina', 'ARS'], ['EC', 'Ecuador', 'USD'], ['BO', 'Bolivia', 'BOB'], ['ES', 'España', 'EUR'], ['US', 'Estados Unidos', 'USD']];
  el.innerHTML = `<div class="row"><span class="av" style="width:64px;height:64px;font-size:26px">${esc((me.display_name || '?').charAt(0).toUpperCase())}</span>
    <div class="sp"><h1 class="ell">${esc(me.display_name || 'Tu perfil')}</h1><span class="mu">${me.username ? '@' + esc(me.username) : esc(S.user && S.user.email || '')}</span></div></div>
    <div class="dos"><form class="card" id="fP"><b>Tus datos</b>
      <label>Nombre<input id="pN" maxlength="80" value="${esc(me.display_name || '')}"></label>
      <label>Usuario<input id="pU" maxlength="24" pattern="[a-z0-9_.]{3,24}" value="${esc(me.username || '')}" placeholder="solo minúsculas, números, _ y ."></label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label>País<select id="pC">${P.map(([c, n]) => `<option value="${c}" ${c === me.country ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label>Moneda<select id="pM">${[...new Set(P.map((x) => x[2]))].map((c) => `<option ${c === me.currency ? 'selected' : ''}>${c}</option>`).join('')}</select></label></div>
      <div class="msg" id="pE"></div><button class="btn p">Guardar</button></form>
    <div class="g"><div class="card"><b>Tu cuenta</b>
      <a class="li" href="#/pedidos" style="text-decoration:none"><span class="ico">${I.orders}</span><span class="sp">Mis pedidos y ventas<br><span class="mu xs">Estado, código, cajas sorpresa y tratos del Marketplace</span></span>›</a>
      <a class="li" href="#/ayuda" style="text-decoration:none"><span class="ico">💬</span><span class="sp">Ayuda<br><span class="mu xs">Tus consultas y reclamos con Xyro</span></span>›</a>
      <a class="li" href="/mi/" style="text-decoration:none"><span class="ico">🪪</span><span class="sp">Mi Xyro<br><span class="mu xs">Tus negocios guardados, carnet y chat</span></span>›</a>
      <a class="li" href="/mi/?registro=1" style="text-decoration:none"><span class="ico">🏪</span><span class="sp">Registrar mi negocio o servicio<br><span class="mu xs">Gratis: perfil, QR y promos</span></span>›</a>
      <div class="li"><span class="ico">🕑</span><span class="sp">Miembro desde<br><span class="mu xs">${me.created_at ? fecha(me.created_at, { month: 'long', year: 'numeric' }) : '—'}</span></span></div></div>
      ${S.demo ? '<a class="btn" href="/x/">Salir de la demo</a>' : '<button class="btn" id="out">Cerrar sesión</button>'}</div></div>`;
  $('#pC', el).onchange = (e) => { const p = P.find((x) => x[0] === e.target.value); p && ($('#pM', el).value = p[2]); };
  const o = $('#out', el); o && (o.onclick = async () => { await S.sb.auth.signOut(); location.replace('/x/'); });
  $('#fP', el).onsubmit = async (e) => {
    e.preventDefault(); const m = $('#pE', el); m.className = 'msg';
    const d = { display_name: $('#pN', el).value.trim() || null, username: $('#pU', el).value.trim().toLowerCase() || null, country: $('#pC', el).value, currency: $('#pM', el).value };
    if (S.demo || S.sinCore) { Object.assign(S.me, d); toast('Guardado (demo)'); return; }
    const { error } = await S.sb.from('users').update(d).eq('id', S.user.id);
    if (error) { m.textContent = /duplicate|unique/i.test(error.message) ? 'Ese usuario ya existe. Prueba otro.' : errDe(error); m.className = 'msg on'; return; }
    Object.assign(S.me, d); toast('Guardado ✓');
  };
}
