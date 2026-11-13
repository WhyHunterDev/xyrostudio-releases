(async function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const WA = '<svg viewBox="0 0 24 24" fill="currentColor"><use href="#i-wa"/></svg>';
  const fmt = (d) => new Date(d + 'T12:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
  const soles = (n) => 'S/ ' + Number(n).toLocaleString('es-PE', { maximumFractionDigits: 2 });
  const U = (ref) => SS.mediaUrl(ref);
  const app = $('#app');

  let data = await SS.load();
  const G = window.GYM || {}, NOM = G.nombre || '(nombre del gym)', TAG = '#' + (NOM.replace(/[^\p{L}\p{N}]+/gu, '') || 'TuGym');
  const LK = (k) => 'xg-' + (G.slug || 'demo') + '-' + k;   // claves por negocio (todos comparten el dominio)
  $('#yr').textContent = new Date().getFullYear();

  // ---------- Sede elegida ----------
  let sede = 'todas';
  try { sede = localStorage.getItem(LK('sede')) || 'todas'; } catch (_) {}
  const sedeObj = (id) => data.sedes.find((s) => s.id === id);
  if (sede !== 'todas' && !sedeObj(sede)) sede = 'todas';
  const sedeName = (id) => id === 'todas' ? 'Todas las sedes' : (sedeObj(id) || {}).nombre || '';
  const enSede = (x) => sede === 'todas' || !x.sede || x.sede === 'todas' || x.sede === sede || (Array.isArray(x.sedes) && x.sedes.includes(sede));
  const waSede = () => sedeObj(sede) || data.sedes[0] || { whatsapp: '' };
  // ---------- Cafetín por sede: número propio + horario de pedidos ----------
  const toHora = (t) => { const [a, b] = String(t || '').split(':').map(Number); return (a || 0) + (b || 0) / 60; };
  const cafeAbierto = (s) => {
    const p = (s && s.cafePedidos) || {};
    if (!p.activo) return true;
    const n = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }));
    if (n.getDay() === 0 && !p.dom) return false;      // domingo cerrado salvo que lo activen
    const h = n.getHours() + n.getMinutes() / 60;
    return h >= toHora(p.desde) && h < toHora(p.hasta);
  };
  const cafeWa = (s) => { const w = String((s && s.cafeWhatsapp) || '').replace(/\D/g, ''); return w || (s && s.whatsapp) || ''; };
  const h12w = (h) => { const [a, b] = String(h || '').split(':'); if (b === undefined) return h || ''; const n = +a; return `${n % 12 || 12}:${b} ${n < 12 ? 'am' : 'pm'}`; };
  const cafeHorarioTxt = (s) => { const p = (s && s.cafePedidos) || {}; return `${esc(p.diasTxt || 'Lun a Sáb')}${p.dom ? ' y domingos' : ''} · ${esc(h12w(p.desde))} a ${esc(h12w(p.hasta))}`; };
  // ---------- Sede más cercana (ubicación del visitante) ----------
  const distKm = (a, b, c, d) => { const R = 6371, r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  function geoNota(txt) { const n = document.createElement('div'); n.className = 'geonota'; n.textContent = txt; document.body.appendChild(n); setTimeout(() => n.remove(), 4200); }
  function sedeCercana() {
    try { localStorage.setItem(LK('geo-ask'), '1'); } catch (_) {}
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: la, longitude: lo } = pos.coords;
      const cand = data.sedes.filter((s) => s.lat && s.lng).map((s) => ({ s, km: distKm(la, lo, +s.lat, +s.lng) })).sort((a, b) => a.km - b.km)[0];
      if (!cand) return;
      setSede(cand.s.id);
      geoNota(`📍 Te mostramos la sede ${cand.s.nombre} (a ${cand.km < 1 ? Math.round(cand.km * 1000) + ' m' : cand.km.toFixed(1) + ' km'} de ti)`);
    }, () => geoNota('No pudimos ver tu ubicación. Elige tu sede arriba.'), { enableHighAccuracy: false, timeout: 9000, maximumAge: 600000 });
  }
  function setSede(id) { sede = id; try { localStorage.setItem(LK('sede'), id); } catch (_) {} chrome(); render(true); }

  // ---------- Elementos fijos ----------
  // ---------- Marca del negocio (nombre, logo y color vienen de Xyro Apps) ----------
  function marca() {
    const pal = NOM.trim().split(/\s+/), ult = pal.length > 1 ? pal.pop() : '', ini = (NOM.replace(/[^\p{L}\p{N}]/gu, '')[0] || 'G').toUpperCase();
    const logo = G.logo ? `<img src="${esc(G.logo)}" alt="${esc(NOM)}" width="42" height="42">` : `<i class="mono">${esc(ini)}</i>`;
    $$('.brand').forEach((el) => { el.innerHTML = `${logo}<span>${esc(pal.join(' '))}${ult ? ` <b>${esc(ult)}</b>` : ''}</span>`; });
    $$('[data-nom]').forEach((el) => { el.textContent = NOM; });
    $$('.sheet-logo').forEach((el) => { el.innerHTML = logo; });
    if (G.color && /^#[0-9a-f]{6}$/i.test(G.color)) {
      const h = G.color, rgb = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255, st = document.documentElement.style;
      st.setProperty('--y', h); st.setProperty('--y2', `color-mix(in srgb,${h} 70%,#fff)`); st.setProperty('--on', lum > 0.6 ? '#000' : '#fff');
    }
    if (G.logo) { const ic = document.querySelector('link[rel=icon]'); if (ic) ic.href = G.logo; }
    const hs = (data.sedes[0] || {}).horario || [];
    $('#footHor').innerHTML = hs.map((x) => `<li>${esc(x[0])} · ${esc(x[1])}</li>`).join('');
    document.body.classList.toggle('una-sede', data.sedes.length < 2);
  }
  // ---------- Estilo (plantilla) y secciones que el negocio usa ----------
  // Diseño elegido (config.estilo): fuerza = clásico · impacto = portada dividida · comunidad = collage + barra flotante.
  const ESTILOS = { fuerza: '', impacto: 'Oswald:wght@500;600;700', comunidad: 'Poppins:wght@500;600;700;800' };
  let EST = 'fuerza';
  function estilo() {
    const q = new URLSearchParams(location.search).get('e'), e = ESTILOS[q] !== undefined ? q : (ESTILOS[data.config.estilo] !== undefined ? data.config.estilo : 'fuerza');
    EST = e; document.documentElement.dataset.estilo = e;
    if (ESTILOS[e] && !document.getElementById('fEst-' + e)) { const l = document.createElement('link'); l.id = 'fEst-' + e; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=' + ESTILOS[e] + '&display=swap'; document.head.appendChild(l); }
    // Impacto: menú a pantalla completa (en vez de pestañas)
    if (e === 'impacto' && !$('#imMenu')) {
      const b = document.createElement('button'); b.id = 'imMenu'; b.className = 'im-burger'; b.setAttribute('aria-label', 'Menú'); b.innerHTML = '<i></i><i></i>';
      $('.navr').prepend(b);
      const o = document.createElement('div'); o.id = 'imNav'; document.body.appendChild(o);
      const pinta = () => { o.innerHTML = `<div class="wrap">${$$('#tabs a').filter((a) => ON(a.dataset.r)).map((a, i) => `<a href="${a.getAttribute('href')}"><small>${String(i + 1).padStart(2, '0')}</small>${esc(a.textContent)}</a>`).join('')}<button class="btn btn-y" data-wa>${WA}Escríbenos</button></div>`; };
      b.onclick = () => { pinta(); document.body.classList.toggle('im-open'); };
      o.addEventListener('click', (ev) => { if (ev.target.closest('a,button')) document.body.classList.remove('im-open'); });
      addEventListener('hashchange', () => document.body.classList.remove('im-open'));
    }
  }
  // config.secciones = { cafetin:false, nutricion:false, … } → esas secciones desaparecen de menús, inicio y enlaces.
  const SECC = ['planes', 'coaches', 'clases', 'nutricion', 'cafetin', 'sedes', 'galeria', 'promos'];
  const SIN = (new URLSearchParams(location.search).get('sin') || '').split(',');   // vista previa: ?sin=cafetin,nutricion
  const ON = (k) => !SECC.includes(k) || ((data.config.secciones || {})[k] !== false && !SIN.includes(k));
  function secciones() {
    const off = SECC.filter((k) => !ON(k));
    let st = document.getElementById('seccOff'); if (!st) { st = document.createElement('style'); st.id = 'seccOff'; document.head.appendChild(st); }
    st.textContent = off.map((k) => `a[href^="#/${k}"],[data-r="${k}"]${k === 'coaches' ? ',a[href^="#/coach/"]' : ''}`).join(',') + (off.length ? '{display:none!important}' : '')
      + (off.some((k) => ['coaches', 'cafetin', 'sedes', 'galeria', 'planes'].includes(k)) ? '.bento{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))!important;grid-template-rows:auto!important}.bento .tile{min-height:260px}.bento .tile.big{grid-row:auto!important;grid-column:auto!important}' : '');
    // barra de abajo (celular): si se quita una de las 4 fijas, sube una de «Más»
    const bb = $('#bbar'); if (bb) bb.style.gridTemplateColumns = `repeat(${$$('#bbar > a').filter((a) => ON(a.dataset.r)).length + 1},1fr)`;
    const mas = $$('#moreSheet a').filter((a) => ON(a.getAttribute('href').slice(2))); if ($('#moreBtn')) $('#moreBtn').style.display = mas.length ? '' : 'none';
  }
  estilo(); secciones();
  marca();
  function chrome() {
    $('#sedePillTx').textContent = sede === 'todas' ? 'Todas las sedes' : 'Sede ' + sedeName(sede);
    $('#footSedes').innerHTML = data.sedes.map((s) => `<li><a href="${esc(s.maps)}" target="_blank" rel="noopener">${esc(s.nombre)}</a></li>`).join('');
    const r = data.config.redes || {};
    $('#social').innerHTML = [
      r.instagram && `<a href="${esc(r.instagram)}" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/></svg></a>`,
      r.tiktok && `<a href="${esc(r.tiktok)}" target="_blank" rel="noopener" aria-label="TikTok"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 1 0 4.9 5.7V9a7.4 7.4 0 0 0 4.3 1.4V7.3a4.3 4.3 0 0 1-3.2-1.5z"/></svg></a>`,
      r.facebook && `<a href="${esc(r.facebook)}" target="_blank" rel="noopener" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v8h4v-8h3l1-4h-4V8z"/></svg></a>`
    ].filter(Boolean).join('');
  }
  const nav = $('#nav');
  addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > 30), { passive: true });
  $('#sedePill').addEventListener('click', (e) => {
    e.stopPropagation(); $('.sedemenu')?.remove();
    const r = e.currentTarget.getBoundingClientRect(), m = document.createElement('div');
    m.className = 'sedemenu'; m.style.top = r.bottom + 8 + 'px'; m.style.right = Math.max(12, innerWidth - r.right) + 'px';
    m.innerHTML = (navigator.geolocation ? '<button data-cerca class="cerca">📍 La más cercana a mí</button>' : '') + [['todas', 'Todas las sedes'], ...data.sedes.map((s) => [s.id, 'Sede ' + s.nombre])].map(([id, n]) => `<button data-sede="${id}" class="${id === sede ? 'on' : ''}">${esc(n)}${id === sede ? ' ✓' : ''}</button>`).join('');
    document.body.appendChild(m);
  });
  function moveInd() {
    const a = $('#tabs a.on'), ind = $('#ind');
    if (!a) { ind.style.width = '0'; return; }
    ind.style.left = a.offsetLeft + 'px'; ind.style.width = a.offsetWidth + 'px';
  }
  addEventListener('resize', moveInd); document.fonts && document.fonts.ready.then(moveInd);

  // ---------- Helpers de UI ----------
  const head = (eyebrow, t, acc, txt, extra = '') => `<header class="phead"><div class="wrap"><span class="eyebrow">${esc(eyebrow)}</span><h1 class="h1">${esc(t)} <em>${esc(acc)}</em></h1>${txt ? `<p class="lead">${esc(txt)}</p>` : ''}${extra}</div></header>`;
  const sedeChips = () => `<div class="chips" style="margin-top:1.4rem">${[['todas', 'Todas'], ...data.sedes.map((s) => [s.id, s.nombre])].map(([id, n]) => `<button class="chip ${id === sede ? 'on' : ''}" data-sede="${id}">${esc(n)}</button>`).join('')}</div>`;
  const eventoOn = (p) => p.precioEvento !== '' && p.precioEvento != null && (!p.eventoHasta || p.eventoHasta >= SS.today());
  const precioDe = (p) => eventoOn(p) ? +p.precioEvento : +p.precio;
  const abierto = () => { const n = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' })), h = n.getHours() + n.getMinutes() / 60; return n.getDay() === 0 ? h >= 8 && h < 21 : h >= 5 && h < 23; };
  const pubVis = (g) => g.estado === 'publicado';
  const carousel = (id, inner) => `<div class="car" data-car><div class="car-track" id="${id}">${inner}</div><div class="car-ctl"><button class="car-btn" data-dir="-1" aria-label="Anterior">←</button><div class="car-bar"><i></i></div><button class="car-btn" data-dir="1" aria-label="Siguiente">→</button></div></div>`;
  async function reelHTML(list) {
    return (await Promise.all(list.map(async (g, i) => `<button class="reel" data-reel="${i}" aria-label="Ver video: ${esc(g.titulo)}">
      <video data-src="${await U(g.media)}" ${g.poster ? `poster="${await U(g.poster)}"` : ''} muted loop playsinline preload="none"></video>
      <span class="rc tag y">${esc(g.categoria || 'Video')}</span><span class="rt">${esc(g.titulo || '')}</span><i class="play">▶</i></button>`))).join('');
  }

  // ---------- Páginas ----------
  const P = {};

  P.inicio = async () => {
    const c = data.config, h = c.hero, v = c.vision, mq = c.marquee;
    const plan = [...data.planes].sort((a, b) => precioDe(a) / a.meses - precioDe(b) / b.meses)[0];
    const promos = data.publicaciones.filter((p) => SS.vigente(p) && enSede(p)).sort((a, b) => b.creado - a.creado).slice(0, 3);
    reelList = data.galeria.filter((g) => pubVis(g) && g.mediaTipo === 'video' && g.destacado && enSede(g)).slice(0, 8);
    const coachN = data.entrenadores.filter(enSede).length, cafeImg = data.cafetin.imagen || (data.cafetin.items[0] || {}).foto;
    return `
    <header class="hero">
      <div class="hero-bg" style="background-image:url('${esc(await U(h.imagen))}')"></div>
      <div class="wrap">
        <span class="eyebrow fade">${esc(h.eyebrow)}</span>
        <h1><span class="ln"><span>${esc(h.l1)}</span></span><span class="ln"><span class="ol">${esc(h.l2)}</span></span><span class="ln"><span class="y">${esc(h.l3)}</span></span></h1>
        <div class="hero-row fade">
          <p>${esc(h.texto)}</p>
          <div class="hero-side">
            <div class="seg">${[['todas', 'Todas'], ...data.sedes.map((s) => [s.id, s.nombre])].map(([id, n]) => `<button class="${id === sede ? 'on' : ''}" data-sede="${id}">${esc(n)}</button>`).join('')}</div>
            <div class="ctas"><button class="btn btn-y" data-wa>${WA}Escríbenos</button><a class="btn btn-o" href="#/planes">Ver planes</a></div>
          </div>
        </div>
      </div>
    </header>
    ${mq.activo && mq.mensajes.length ? `<div class="marquee" aria-hidden="true"><div class="track">${[...mq.mensajes, ...mq.mensajes, ...mq.mensajes].map((w) => `<span>${esc(w)}</span>`).join('')}</div></div>` : ''}

    <section class="sec"><div class="wrap">
      <div class="stats rv">${c.stats.map((s) => `<div class="stat"><b>${esc(s.n)}</b><small>${esc(s.t)}</small></div>`).join('')}</div>
    </div></section>

    <section class="sec" style="padding-top:0"><div class="wrap vision">
      <div class="rv"><span class="eyebrow">${esc(v.eyebrow)}</span><h2 class="h2">${esc(v.titulo)} <em>${esc(v.acento)}</em></h2><p class="lead">${esc(v.texto)}</p>
        <div class="pillars">${v.pilares.map((p, i) => `<div class="pillar"><i>0${i + 1}</i><div><h4>${esc(p.t)}</h4><p>${esc(p.d)}</p></div></div>`).join('')}</div></div>
      <div class="vision-img rv"><img src="${esc(await U(v.imagen))}" alt="" loading="lazy"><span class="badge">${esc(TAG)}</span></div>
    </div></section>

    <section class="sec alt"><div class="wrap">
      <div class="row-hd"><div><span class="eyebrow rv">Explora</span><h2 class="h2 rv">Todo lo que <em>necesitas</em></h2></div></div>
      <div class="bento">
        <a class="tile big rv" href="#/coaches"><img src="${esc(await U((data.entrenadores[0] || {}).foto || 'img/coach.jpg'))}" alt="" loading="lazy"><span class="go">→</span><small>${coachN} entrenadores${sede !== 'todas' ? ' en ' + esc(sedeName(sede)) : ''}</small><h3>Conoce a tu entrenador</h3><p>Rutinas semi personalizadas y asesoría nutricional según tu objetivo.</p></a>
        <a class="tile ytile rv" href="#/planes"><span class="go" style="background:#000;color:var(--y)">→</span><small>Planes desde</small><div class="price">${soles(Math.round(precioDe(plan) / plan.meses))}<span style="font-size:1rem;font-family:var(--fb);font-weight:700"> /mes</span></div><p>Con el plan ${esc(plan.nombre)}. Todas las clases incluidas.</p></a>
        <a class="tile rv" href="#/cafetin"><img src="${esc(await U(cafeImg))}" alt="" loading="lazy"><span class="go">→</span><small>Cafetín fit</small><h3>Come como entrenas</h3></a>
        <a class="tile rv" href="#/sedes"><img src="${esc(await U((sedeObj(sede) || data.sedes[0] || {}).foto || 'img/interior.jpg'))}" alt="" loading="lazy"><span class="go">→</span><small>${data.sedes.length} sedes</small><h3>Encuéntranos</h3></a>
        <a class="tile rv" href="#/galeria"><img src="${esc(await U((data.galeria.find((g) => g.mediaTipo !== 'video' && pubVis(g)) || {}).media || 'img/clase.jpg'))}" alt="" loading="lazy"><span class="go">→</span><small>Galería</small><h3>Fotos y videos</h3></a>
      </div>
    </div></section>

    ${promos.length && ON('promos') ? `<section class="sec"><div class="wrap">
      <div class="row-hd"><div><span class="eyebrow rv">Lo nuevo</span><h2 class="h2 rv">Promos y <em>eventos</em></h2></div><a class="more" href="#/promos">Ver todas →</a></div>
      <div class="promos">${await promoCards(promos)}</div></div></section>` : ''}

    ${reelList.length && ON('galeria') ? `<section class="sec alt"><div class="wrap">
      <div class="row-hd"><div><span class="eyebrow rv">${esc(c.videos.eyebrow)}</span><h2 class="h2 rv">${esc(c.videos.titulo)} <em>${esc(c.videos.acento)}</em></h2><p class="lead rv">${esc(c.videos.texto)}</p></div><a class="more" href="#/galeria">Ver galería completa →</a></div>
      ${carousel('reelTrack', await reelHTML(reelList))}
    </div></section>` : ''}

    <section class="sec"><div class="wrap"><div class="cta-band rv"><h2>Tu primer día<br>es hoy</h2><button class="btn" data-wa>${WA}Quiero inscribirme</button></div></div></section>`;
  };


  // =====================================================================
  //  DISEÑOS de portada (config.estilo). Cada uno mueve todo a otra estructura;
  //  el color siempre es el del negocio. fuerza = P.inicio (el clásico).
  // =====================================================================
  const INI = {};
  const porHora = (a, b) => String(a.hora).localeCompare(String(b.hora));
  const coachDeK = (k) => data.entrenadores.find((c) => c.id === k.coach);
  const desde = () => { const p = [...data.planes].sort((a, b) => precioDe(a) / a.meses - precioDe(b) / b.meses)[0]; return p ? soles(Math.round(precioDe(p) / p.meses)) : ''; };

  // ---------- 2) IMPACTO: portada dividida, planes y horario de hoy en la portada ----------
  INI.impacto = async () => {
    const c = data.config, h = c.hero, v = c.vision, hoy = hoyDia();
    const planes = [...data.planes].sort((a, b) => a.meses - b.meses);
    const coaches = data.entrenadores.filter(enSede).slice(0, 10);
    const kHoy = clasesVis().filter((k) => (k.dias || []).includes(hoy)).sort(porHora);
    const sedes = data.sedes.filter((s) => sede === 'todas' || s.id === sede);
    const anillo = `${NOM} · Inscríbete hoy · `.toUpperCase();
    return `
    <header class="im-hero">
      <div class="im-l">
        <span class="eyebrow fade">${esc(h.eyebrow)}</span>
        <h1 class="im-t"><span class="ln"><span>${esc(h.l1)}</span></span><span class="ln"><span class="y">${esc(h.l2)}</span></span><span class="ln"><span>${esc(h.l3)}</span></span></h1>
        <p class="fade">${esc(h.texto)}</p>
        <div class="ctas fade"><button class="btn btn-y" data-wa>${WA}Escríbenos</button>${ON('planes') ? '<a class="btn btn-o" href="#/planes">Ver planes</a>' : ''}</div>
        <div class="im-stats fade">${c.stats.slice(0, 3).map((s) => `<div><b>${esc(s.n)}</b><small>${esc(s.t)}</small></div>`).join('')}</div>
      </div>
      <div class="im-r">
        <img src="${esc(await U(h.imagen))}" alt="" fetchpriority="high">
        ${ON('planes') && data.planes.length ? `<a class="im-badge" href="#/planes"><svg viewBox="0 0 200 200" aria-hidden="true"><defs><path id="imRing" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0"/></defs><text><textPath href="#imRing" textLength="486" lengthAdjust="spacing">${esc(anillo)}</textPath></text></svg><span><small>Desde</small><b>${desde()}</b><small>al mes</small></span></a>` : ''}
      </div>
    </header>

    ${c.marquee.activo && c.marquee.mensajes.length ? `<div class="im-mq" aria-hidden="true"><div class="track">${[...c.marquee.mensajes, ...c.marquee.mensajes, ...c.marquee.mensajes].map((w) => `<span>${esc(w)}</span>`).join('')}</div></div>` : ''}

    ${ON('planes') && planes.length ? `<section class="sec"><div class="wrap">
      <div class="im-hd rv"><span class="im-n">01</span><div><span class="eyebrow">Membresías</span><h2 class="h2">Elige tu <em>plan</em></h2></div><a class="more" href="#/planes">Ver detalle →</a></div>
      <div class="im-planes">${planes.map((p) => `<article class="im-plan rv ${p.destacado ? 'hot' : ''}">
        ${p.destacado ? '<span class="im-tag">★ El favorito</span>' : ''}<h3>${esc(p.nombre)}</h3>
        <div class="im-pr">${eventoOn(p) ? `<s>${soles(p.precio)}</s>` : ''}${soles(precioDe(p))}</div>
        <small>${soles(Math.round(precioDe(p) / p.meses))} al mes</small>
        <button class="btn ${p.destacado ? 'btn-y' : 'btn-o'}" data-wa data-plan="${esc(p.nombre)}">Lo quiero</button></article>`).join('')}</div>
    </div></section>` : ''}

    <section class="sec alt"><div class="wrap im-why">
      <div class="im-why-l"><div class="im-hd"><span class="im-n">02</span><div><span class="eyebrow">${esc(v.eyebrow)}</span><h2 class="h2">${esc(v.titulo)} <em>${esc(v.acento)}</em></h2></div></div><p class="lead">${esc(v.texto)}</p>
        <img src="${esc(await U(v.imagen))}" alt="" loading="lazy"></div>
      <ol class="im-list">${(c.incluye || []).map((x, i) => `<li class="rv"><span>${String(i + 1).padStart(2, '0')}</span><div><h4>${esc(x.i || '')} ${esc(x.t)}</h4><p>${esc(x.d)}</p></div></li>`).join('')}</ol>
    </div></section>

    ${ON('coaches') && coaches.length ? `<section class="sec"><div class="wrap"><div class="im-hd rv"><span class="im-n">03</span><div><span class="eyebrow">Tu equipo</span><h2 class="h2">Nuestros <em>entrenadores</em></h2></div><a class="more" href="#/coaches">Ver todos →</a></div></div>
      <div class="im-coaches">${(await Promise.all(coaches.map(async (k) => `<a class="im-coach rv" href="#/coach/${esc(k.id)}"><img src="${esc(await U(k.foto))}" alt="" loading="lazy" style="object-position:${esc(k.pos || '50% 30%')}"><span class="im-cv">${esc(k.nombre)}</span><small>${esc(k.especialidad)}</small></a>`))).join('')}</div>
    </section>` : ''}

    ${ON('clases') && kHoy.length ? `<section class="sec alt"><div class="wrap"><div class="im-hd rv"><span class="im-n">04</span><div><span class="eyebrow">Horario</span><h2 class="h2">Hoy en el <em>gym</em></h2></div><a class="more" href="#/clases">Semana completa →</a></div>
      <div class="im-hoy">${kHoy.map((k) => { const co = coachDeK(k); return `<button class="im-row rv" data-clase="${esc(k.id)}" data-dia="${hoy}"><b>${esc(hora12(k.hora))}</b><span class="nm">${esc(k.nombre)}</span><span class="co">${esc(co ? co.nombre : k.profe || '')}</span><span class="go">Separar cupo →</span></button>`; }).join('')}</div>
    </div></section>` : ''}

    ${ON('sedes') ? `<section class="sec"><div class="wrap"><div class="im-hd rv"><span class="im-n">05</span><div><span class="eyebrow">Encuéntranos</span><h2 class="h2">Ven a <em>entrenar</em></h2></div></div>
      <div class="im-sedes">${sedes.map((s) => `<div class="im-sede rv"><h3>${esc(s.nombre)}</h3><p>${esc(s.distrito)}</p><ul>${(s.horario || []).map((x) => `<li><span>${esc(x[0])}</span><b>${esc(x[1])}</b></li>`).join('')}</ul>
        <div class="ctas"><a class="btn btn-wa" target="_blank" rel="noopener" href="${SS.waLink(s.whatsapp, `Hola ${NOM} ${s.nombre} 👋 Quiero información para inscribirme.`)}">${WA}WhatsApp</a>${s.maps ? `<a class="btn btn-o" target="_blank" rel="noopener" href="${esc(s.maps)}">Cómo llegar</a>` : ''}</div></div>`).join('')}</div>
    </div></section>` : ''}

    <section class="im-final"><div class="wrap"><h2>¿Empiezas <em>hoy?</em></h2><button class="btn btn-y" data-wa>${WA}Quiero inscribirme</button></div></section>`;
  };

  // ---------- 3) COMUNIDAD: collage, historias, «¿cuál es tu objetivo?», barra flotante ----------
  INI.comunidad = async () => {
    const c = data.config, h = c.hero, hoy = hoyDia();
    const fotos = data.galeria.filter((g) => pubVis(g) && g.mediaTipo !== 'video' && enSede(g));
    const col = [h.imagen, ...fotos.map((g) => g.media), ...data.entrenadores.map((k) => k.foto)].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).slice(0, 5);
    const promos = data.publicaciones.filter((p) => SS.vigente(p) && enSede(p)).sort((a, b) => b.creado - a.creado);
    const hist = [...(ON('promos') ? promos.map((p) => ({ t: p.titulo.split(' ').slice(0, 2).join(' '), m: p.media, href: '#/promos' })) : []),
      ...(ON('galeria') ? fotos.slice(0, 6).map((g) => ({ t: g.categoria || g.titulo, m: g.media, href: '#/galeria' })) : [])].slice(0, 8);
    const kHoy = clasesVis().filter((k) => (k.dias || []).includes(hoy)).sort(porHora);
    const coaches = data.entrenadores.filter(enSede);
    const planes = [...data.planes].sort((a, b) => a.meses - b.meses);
    galList = fotos;
    const abiertoYa = (() => { try { return abierto(); } catch (_) { return false; } })();
    return `
    <header class="co-hero">
      ${hist.length ? `<div class="co-stories">${(await Promise.all(hist.map(async (x) => `<a href="${x.href}" class="co-st"><i><img src="${esc(await U(x.m))}" alt="" loading="lazy"></i><span>${esc(x.t)}</span></a>`))).join('')}</div>` : ''}
      <div class="co-collage" aria-hidden="true">${(await Promise.all(col.map(async (m, i) => `<span class="co-ph p${i}"><img src="${esc(await U(m))}" alt="" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}></span>`))).join('')}</div>
      <div class="wrap co-c">
        <span class="co-pill ${abiertoYa ? 'on' : ''}"><i></i>${abiertoYa ? 'Abierto ahora' : 'Hoy te esperamos'}</span>
        <h1 class="co-t">${esc(h.l1)} ${esc(h.l2)} <em>${esc(h.l3)}</em></h1>
        <p>${esc(h.texto)}</p>
        <div class="ctas"><button class="btn btn-y" data-wa>${WA}Únete a ${esc(NOM)}</button>${ON('planes') ? `<a class="btn btn-o" href="#/planes">Planes desde ${desde()}/mes</a>` : ''}</div>
      </div>
    </header>

    <section class="sec"><div class="wrap co-goal">
      <div class="rv"><span class="eyebrow">30 segundos</span><h2 class="h2">¿Cuál es tu <em>objetivo?</em></h2><p class="lead">Toca uno y te decimos cómo empezar.</p>
        <div class="qopts co-goals"><button data-goal="definicion"><b>🔥</b>Bajar grasa</button><button data-goal="volumen"><b>💪</b>Ganar músculo</button><button data-goal="salud"><b>❤️</b>Salud y energía</button></div></div>
      <div class="qres rv" id="qres"><p style="color:var(--mu);text-align:center">👈 Elige tu objetivo</p></div>
    </div></section>

    ${ON('coaches') && coaches.length ? `<section class="sec alt"><div class="wrap"><div class="co-hd rv"><h2 class="h2">Entrena con <em>nosotros</em></h2><a class="more" href="#/coaches">Ver equipo →</a></div>
      <div class="co-team">${(await Promise.all(coaches.map(async (k) => `<a class="co-m rv" href="#/coach/${esc(k.id)}"><img src="${esc(await U(k.foto))}" alt="" loading="lazy" style="object-position:${esc(k.pos || '50% 30%')}"><b>${esc(k.nombre)}</b><small>${esc(k.especialidad)}</small></a>`))).join('')}</div>
    </div></section>` : ''}

    ${ON('clases') && kHoy.length ? `<section class="sec"><div class="wrap"><div class="co-hd rv"><h2 class="h2">Clases de <em>hoy</em></h2><a class="more" href="#/clases">Toda la semana →</a></div>
      <div class="co-clases">${kHoy.map((k) => { const co = coachDeK(k); return `<button class="co-k rv" data-clase="${esc(k.id)}" data-dia="${hoy}"><span class="h">${esc(hora12(k.hora))}</span><b>${esc(k.nombre)}</b><small>${esc(co ? co.nombre : k.profe || '')}${k.duracion ? ' · ' + esc(k.duracion) + ' min' : ''}</small><span class="go">Reservar</span></button>`; }).join('')}</div>
    </div></section>` : ''}

    ${ON('galeria') && fotos.length ? `<section class="sec alt"><div class="wrap"><div class="co-hd rv"><h2 class="h2">Así se vive <em>${esc(NOM)}</em></h2><a class="more" href="#/galeria">Galería →</a></div>
      <div class="co-mason">${(await Promise.all(fotos.slice(0, 7).map(async (g, i) => `<button class="co-g rv" data-g="${i}"><img src="${esc(await U(g.media))}" alt="" loading="lazy"><span>${esc(g.titulo || '')}</span></button>`))).join('')}</div>
    </div></section>` : ''}

    ${ON('planes') && planes.length ? `<section class="sec"><div class="wrap"><div class="co-hd rv"><h2 class="h2">Tu <em>membresía</em></h2><a class="more" href="#/planes">Comparar →</a></div>
      <div class="co-planes">${planes.map((p) => `<div class="co-p rv ${p.destacado ? 'hot' : ''}"><div><b>${esc(p.nombre)}</b>${p.destacado ? ' <span class="tag y">Recomendado</span>' : ''}<small>${(c.incluye || []).slice(0, 2).map((x) => esc(x.t)).join(' · ')}</small></div><div class="r"><span>${soles(precioDe(p))}</span><button class="btn ${p.destacado ? 'btn-y' : 'btn-o'}" data-wa data-plan="${esc(p.nombre)}">Elegir</button></div></div>`).join('')}</div>
    </div></section>` : ''}

    ${ON('promos') && promos.length ? `<section class="sec alt"><div class="wrap"><div class="co-hd rv"><h2 class="h2">Promos y <em>eventos</em></h2><a class="more" href="#/promos">Ver todas →</a></div>
      <div class="promos">${await promoCards(promos.slice(0, 3))}</div></div></section>` : ''}

    <section class="sec"><div class="wrap"><div class="co-end rv"><h2>Tu comunidad te <em>espera</em></h2><p>${esc(data.sedes.map((s) => s.nombre + ' · ' + s.distrito).join('  |  '))}</p><button class="btn btn-y" data-wa>${WA}Escríbenos</button></div></div></section>`;
  };

  async function promoCards(list) {
    return (await Promise.all(list.map(async (p) => {
      const s = sedeObj(p.sede) || waSede(), url = await U(p.media);
      return `<article class="promo rv"><div class="media">${p.mediaTipo === 'video' ? `<video src="${url}" muted loop playsinline autoplay preload="metadata"></video>` : `<img src="${url}" alt="" loading="lazy">`}</div>
        <div class="body"><div class="chips"><span class="tag y">${esc(p.tipo)}</span><span class="tag">${esc(sedeName(p.sede))}</span></div>
        <h3>${esc(p.titulo)}</h3><p>${esc(p.descripcion)}</p>
        <div class="foot"><span>${p.fin ? 'Hasta el ' + fmt(p.fin) : ''}</span><a href="${SS.waLink(s.whatsapp, `Hola ${NOM} 👋 Vi "${p.titulo}" en la web y quiero más información.`)}" target="_blank" rel="noopener">Me interesa →</a></div></div></article>`;
    }))).join('');
  }

  P.promos = async () => {
    const list = data.publicaciones.filter((p) => SS.vigente(p) && enSede(p)).sort((a, b) => b.creado - a.creado);
    return head('Lo nuevo', 'Promos y', 'eventos', 'Lo último de cada sede. Elige tu sede para ver lo que hay cerca de ti.', sedeChips()) +
      `<section class="sec" style="padding-top:0"><div class="wrap"><div class="promos">${list.length ? await promoCards(list) : '<div class="empty">Pronto nuevas promociones en esta sede 💪</div>'}</div></div></section>`;
  };

  P.planes = async () => {
    const planes = [...data.planes].sort((a, b) => a.meses - b.meses);
    const base = Math.max(...planes.map((p) => p.precio / p.meses));
    const cards = planes.map((p) => {
      const pr = precioDe(p), ahorro = Math.round(base * p.meses - pr);
      return `<article class="plan rv ${p.destacado ? 'hot' : ''}">${p.destacado ? '<span class="badge">★ Recomendado</span>' : ''}
        <h3>${esc(p.nombre)}</h3>
        <div class="price">${eventoOn(p) ? `<span class="old">${soles(p.precio)}</span>` : ''}${soles(pr)}</div>
        <div class="pm">Equivale a <b>${soles(Math.round(pr / p.meses))}</b> al mes</div>
        ${ahorro > 0 ? `<span class="save">Ahorras ${soles(ahorro)}</span>` : ''}
        ${eventoOn(p) ? `<div class="evt"><span>⚡ ${esc(p.eventoTexto || 'Precio de evento')}</span><b>${p.eventoHasta ? 'hasta ' + fmt(p.eventoHasta) : ''}</b></div>` : ''}
        <ul>${(data.config.incluye || []).slice(0, 3).map((x) => `<li>${esc(x.t)}</li>`).join('')}</ul>
        <button class="btn ${p.destacado ? '' : 'btn-o'}" data-wa data-plan="${esc(p.nombre)}">Quiero ${esc(p.nombre)}</button></article>`;
    }).join('');
    return head('Membresías', 'Mientras más largo,', 'más ahorras', 'Elige tu plan y empieza hoy. Todos incluyen lo de abajo.') + `
      <section class="sec" style="padding-top:12px"><div class="wrap">
        <div class="plans">${cards}</div>
        <div class="pase rv"><div><h4>Pase diario</h4><p>${esc(data.notaPlanes || '')}</p></div><div class="pp"><div><b>${soles(data.pase.socio)}</b><small>Socios</small></div><div><b>${soles(data.pase.noSocio)}</b><small>No socios</small></div></div></div>
      </div></section>
      <section class="sec alt"><div class="wrap"><span class="eyebrow rv">Todos los planes incluyen</span><h2 class="h2 rv">Todo <em>incluido</em></h2>
        <div class="inc">${data.config.incluye.map((x) => `<div class="inc-i rv"><i>${esc(x.i)}</i><h4>${esc(x.t)}</h4><p>${esc(x.d)}</p></div>`).join('')}</div></div></section>
      <section class="sec"><div class="wrap quiz rv">
        <div><span class="eyebrow">30 segundos</span><h2 class="h2">¿Cuál es tu <em>objetivo?</em></h2><p class="lead">Elige y te decimos cómo empezar: plan, entrenador y qué comer en el cafetín.</p>
          <div class="qopts"><button data-goal="definicion"><b>🔥</b>Bajar grasa</button><button data-goal="volumen"><b>💪</b>Ganar músculo</button><button data-goal="salud"><b>❤️</b>Salud y energía</button></div></div>
        <div class="qres" id="qres"><p style="color:var(--mu);text-align:center">Toca una opción</p></div>
      </div></section>`;
  };
  const goals = { definicion: ['Bajar grasa', /grasa|cardio|funcional/i, 'Cardio y funcional 4–5 veces por semana con la rutina de tu entrenador.'], volumen: ['Ganar músculo', /fuerza|hipertrofia/i, 'Máquinas y pesas 4–5 veces por semana con progresión de cargas.'], salud: ['Salud y energía', /funcional|baile|cardio/i, 'Baile, funcional y cardio para moverte con energía.'] };
  function renderQuiz(g) {
    $$('.qopts button').forEach((b) => b.classList.toggle('on', b.dataset.goal === g));
    const [t, re, txt] = goals[g], plan = data.planes.find((p) => p.destacado) || data.planes[0];
    const coach = data.entrenadores.filter(enSede).find((c) => re.test(c.especialidad)) || data.entrenadores.filter(enSede)[0];
    const food = data.cafetin.items.filter((i) => i.disponible && enSede(i) && i.objetivo === (g === 'salud' ? 'definicion' : g)).slice(0, 2);
    $('#qres').innerHTML = `<span class="eyebrow">Tu plan para ${esc(t.toLowerCase())}</span><h3>Así empiezas</h3><ol>
      <li><div><b>Plan ${esc(plan.nombre)}</b> · ${soles(precioDe(plan))}<br><span>El que más ahorra para resultados reales.</span></div></li>
      <li><div><b>${esc(txt)}</b>${coach ? `<br><span>Te recomendamos a <a href="#/coach/${coach.id}" style="color:var(--y)">${esc(coach.nombre)}</a>.</span>` : ''}</div></li>
      ${food.length ? `<li><div><b>En el cafetín:</b> ${food.map((f) => esc(f.nombre)).join(' · ')}</div></li>` : ''}</ol>
      <a class="btn btn-y" target="_blank" rel="noopener" href="${SS.waLink(waSede().whatsapp, `Hola ${NOM} 👋 Mi objetivo es ${t.toLowerCase()}. Quiero el plan ${plan.nombre}.`)}">${WA}Empezar por WhatsApp</a>`;
  }

  const DIAS_W = [['lun', 'Lunes'], ['mar', 'Martes'], ['mie', 'Miércoles'], ['jue', 'Jueves'], ['vie', 'Viernes'], ['sab', 'Sábado'], ['dom', 'Domingo']];
  const hora12 = (h) => { const [a, b] = String(h || '').split(':'); if (b === undefined) return h || ''; const n = +a; return `${n % 12 || 12}:${b} ${n < 12 ? 'am' : 'pm'}`; };
  const hoyDia = () => { try { return { Mon: 'lun', Tue: 'mar', Wed: 'mie', Thu: 'jue', Fri: 'vie', Sat: 'sab', Sun: 'dom' }[new Date().toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Lima' })] || 'lun'; } catch (_) { return 'lun'; } };
  let claseTipo = 'todas';
  const clasesVis = () => (data.clases || []).filter((k) => k.activo !== false && enSede(k));
  P.clases = async () => {
    const all = clasesVis(), tipos = [...new Set(all.map((k) => k.tipo || k.nombre).filter(Boolean))];
    if (claseTipo !== 'todas' && !tipos.includes(claseTipo)) claseTipo = 'todas';
    const list = all.filter((k) => claseTipo === 'todas' || (k.tipo || k.nombre) === claseTipo), hoy = hoyDia();
    const coachDe = (k) => data.entrenadores.find((c) => c.id === k.coach);
    const fotos = {}; await Promise.all(all.map(async (k) => { const c = coachDe(k), f = k.profeFoto || (c && c.foto); if (f) fotos[k.id] = await U(f); }));
    const card = (k, d) => { const c = coachDe(k), prof = c ? c.nombre : k.profe, fo = fotos[k.id];
      return `<button class="clase" data-clase="${esc(k.id)}" data-dia="${d}"><b class="ch">${esc(hora12(k.hora))}</b><span class="cn">${esc(k.nombre)}</span>${prof || fo ? `<span class="cp">${fo ? `<img src="${esc(fo)}" alt="" loading="lazy" style="object-position:${esc((c && !k.profeFoto && c.pos) || 'center')}">` : ''}${prof ? 'con ' + esc(prof) : ''}</span>` : ''}<span class="cm">${esc(k.duracion || 60)} min${sede === 'todas' ? ' · ' + esc(sedeName(k.sede)) : ''}</span>${k.nota ? `<span class="cnota">${esc(k.nota)}</span>` : ''}</button>`; };
    const cols = DIAS_W.map(([d, n]) => { const ks = list.filter((k) => (k.dias || []).includes(d)).sort((a, b) => String(a.hora).localeCompare(String(b.hora)));
      return `<div class="cl-dia ${d === hoy ? 'hoy' : ''}" ${d === hoy ? 'id="clHoy"' : ''}><h4>${n}${d === hoy ? ' <small>Hoy</small>' : ''}</h4>${ks.map((k) => card(k, d)).join('') || '<p class="cl-vacio">Sin clases</p>'}</div>`; }).join('');
    const chips = tipos.length > 1 ? `<div class="chips" style="margin-top:.8rem">${[['todas', 'Todas las clases'], ...tipos.map((x) => [x, x])].map(([id, n]) => `<button class="chip ${id === claseTipo ? 'on' : ''}" data-ctipo="${esc(id)}">${esc(n)}</button>`).join('')}</div>` : '';
    return head('Horario', 'Clases', 'grupales', 'Funcional, baile, crossfit y más. Toca una clase para separar tu cupo por WhatsApp.', sedeChips() + chips) +
      `<section class="sec" style="padding-top:0"><div class="wrap">${all.length ? `<div class="cl-week">${cols}</div>` : '<div class="empty">Pronto publicaremos el horario de clases de esta sede.</div>'}</div></section>`;
  };

  // ---------- Asesoría nutricional ----------
  const nutriVis = () => (data.nutricion || []).filter((n) => n.activo !== false && enSede(n));
  const toMin = (h) => { const [a, b] = String(h || '0:0').split(':').map(Number); return a * 60 + (b || 0); };
  const fromMin = (m) => p2(Math.floor(m / 60)) + ':' + p2(m % 60);
  P.nutricion = async () => {
    const all = nutriVis(), hoy = hoyDia();
    const fotos = {}; await Promise.all(all.map(async (n) => { if (n.foto) fotos[n.id] = await U(n.foto); }));
    const nutris = [...new Map(all.map((n) => [n.nutri, n])).values()].map((n) => all.find((x) => x.nutri === n.nutri && x.foto) || n);
    const pro = nutris.length ? `<div class="nu-pros">${nutris.map((n) => `<div class="nu-pro">${fotos[n.id] ? `<img src="${esc(fotos[n.id])}" alt="" loading="lazy">` : '<span class="nu-ini">🥗</span>'}<div><b>${esc(n.nutri)}</b><small>Nutricionista</small></div></div>`).join('')}</div>` : '';
    const bloque = (n, d) => {
      const c = +n.cita || 0, a = toMin(n.desde), b = toMin(n.hasta), turnos = [];
      if (c) for (let m = a; m + c <= b && turnos.length < 24; m += c) turnos.push(fromMin(m));
      return `<div class="nu-blk"><div class="nu-hd"><b>${esc(hora12(n.desde))} – ${esc(hora12(n.hasta))}</b><span>${esc(n.modalidad || 'Presencial')}${sede === 'todas' ? ' · ' + esc(n.sede === 'todas' ? 'Todas las sedes' : sedeName(n.sede)) : ''}</span></div>${nutris.length > 1 ? `<small class="nu-who">con ${esc(n.nutri)}</small>` : ''}
        ${turnos.length ? `<div class="nu-slots">${turnos.map((h) => `<button class="nu-slot" data-nutri="${esc(n.id)}" data-dia="${d}" data-h="${h}">${esc(hora12(h))}</button>`).join('')}</div>` : `<button class="btn btn-y btn-sm nu-go" data-nutri="${esc(n.id)}" data-dia="${d}">Separar cupo</button>`}
        ${n.nota ? `<p class="nu-nota">${esc(n.nota)}</p>` : ''}</div>`;
    };
    const cols = DIAS_W.map(([d, nm]) => { const ns = all.filter((n) => (n.dias || []).includes(d)).sort((x, y) => String(x.desde).localeCompare(String(y.desde)));
      return `<div class="cl-dia ${d === hoy ? 'hoy' : ''}" ${d === hoy ? 'id="clHoy"' : ''}><h4>${nm}${d === hoy ? ' <small>Hoy</small>' : ''}</h4>${ns.map((n) => bloque(n, d)).join('') || '<p class="cl-vacio">No atiende</p>'}</div>`; }).join('');
    const pasos = `<div class="nu-pasos"><div><b>1</b>Elige el día y la hora que te quede mejor.</div><div><b>2</b>Se abre WhatsApp con tu mensaje listo para la sede.</div><div><b>3</b>Recepción te confirma tu cupo.</div></div>`;
    return head('Incluida en tu plan', 'Asesoría', 'nutricional', 'Tu entrenamiento rinde el doble con una buena alimentación. Separa tu cita con nuestra nutricionista.', sedeChips()) +
      `<section class="sec" style="padding-top:0"><div class="wrap">${pro}${pasos}${all.length ? `<div class="cl-week nu-week">${cols}</div>` : '<div class="empty">Pronto publicaremos los horarios de asesoría nutricional de esta sede.</div>'}</div></section>`;
  };

  // Acepta '@usuario', 'usuario' o un enlace de Instagram y devuelve solo el usuario.
  const igUser = (v) => { const s = String(v || '').trim(); const m = s.match(/instagram\.com\/([A-Za-z0-9._]+)/i); return (m ? m[1] : s.replace(/^@+/, '').replace(/[/?#].*$/, '')).replace(/[^A-Za-z0-9._]/g, ''); };
  P.coaches = async () => {
    const list = data.entrenadores.filter(enSede);
    const cards = await Promise.all(list.map(async (c) => `<a class="coach rv" href="#/coach/${c.id}">${c.foto ? `<img src="${esc(await U(c.foto))}" alt="${esc(c.nombre)}" style="object-position:${esc(c.pos || 'center')}" loading="lazy">` : `<div class="ini">${esc((c.nombre.replace(/^coach\s+/i, '')[0] || 'S').toUpperCase())}</div>`}
      <span class="sd tag y">${esc(sedeName(c.sede))}</span><div class="c"><h3>${esc(c.nombre)}</h3><div class="es">${esc(c.especialidad)}</div><span class="vp">Ver perfil ${c.video ? '· ▶ video' : ''} →</span></div></a>`));
    return head('Tu equipo', 'Nuestros', 'entrenadores', 'Entrenadores y profesores calificados en cada sede. Toca uno para conocerlo.', sedeChips()) +
      `<section class="sec" style="padding-top:0"><div class="wrap"><div class="coaches">${cards.join('') || '<div class="empty">Pronto presentaremos al equipo de esta sede.</div>'}</div></div></section>`;
  };

  P.coach = async (id) => {
    const c = data.entrenadores.find((x) => x.id === id);
    if (!c) return P.coaches();
    const s = sedeObj(c.sede) || waSede();
    const fotos = await Promise.all((c.fotos || []).map(async (f) => `<button data-photo="${esc(await U(f))}"><img src="${esc(await U(f))}" alt="" loading="lazy"></button>`));
    const otros = data.entrenadores.filter((x) => x.id !== c.id).slice(0, 3);
    return `<section class="sec" style="padding-top:0"><div class="wrap prof">
      <div class="prof-ph">${c.foto ? `<img src="${esc(await U(c.foto))}" alt="${esc(c.nombre)}" style="object-position:${esc(c.pos || 'center')}">` : ''}<span class="tag y">${esc(sedeName(c.sede))}</span></div>
      <div>
        <a class="back" href="#/coaches">← Todos los entrenadores</a>
        <span class="eyebrow">${esc(c.especialidad)}</span>
        <h1 class="h1" style="font-size:clamp(3rem,8vw,6rem)">${esc(c.nombre)}</h1>
        ${c.mensaje ? `<q>${esc(c.mensaje)}</q>` : ''}
        <p class="bio">${esc(c.bio || '')}</p>
        ${(c.logros || []).length ? `<div class="logros">${c.logros.map((l) => `<span>${esc(l)}</span>`).join('')}</div>` : ''}
        <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1rem">
          <a class="btn btn-y" target="_blank" rel="noopener" href="${SS.waLink(s.whatsapp, `Hola ${NOM} 👋 Quiero entrenar con ${c.nombre} en la sede ${s.nombre}.`)}">${WA}Entrenar con ${esc(c.nombre.replace(/^coach\s+/i, ''))}</a>
          ${igUser(c.ig) ? `<a class="btn btn-o" target="_blank" rel="noopener" href="https://instagram.com/${esc(igUser(c.ig))}/"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>@${esc(igUser(c.ig))}</a>` : ''}
        </div>
        <div class="pvid" ${c.video ? `data-cvid="${c.id}"` : ''}>${c.video ? `<video src="${esc(await U(c.video))}" muted playsinline preload="metadata"></video><span class="pl">▶</span>` : `<div class="ph"><b>Video de presentación</b>Muy pronto ${esc(c.nombre)} se presenta en video.</div>`}</div>
        ${fotos.length ? `<h4 style="margin-top:1.8rem;font-size:.8rem;letter-spacing:.2em;text-transform:uppercase;color:var(--mu)">En acción</h4><div class="pfotos">${fotos.join('')}</div>` : ''}
      </div></div></section>
      ${otros.length ? `<section class="sec alt"><div class="wrap"><span class="eyebrow">Conoce también a</span><div class="coaches">${(await Promise.all(otros.map(async (o) => `<a class="coach" href="#/coach/${o.id}">${o.foto ? `<img src="${esc(await U(o.foto))}" alt="" style="object-position:${esc(o.pos || 'center')}" loading="lazy">` : ''}<span class="sd tag y">${esc(sedeName(o.sede))}</span><div class="c"><h3>${esc(o.nombre)}</h3><div class="es">${esc(o.especialidad)}</div></div></a>`))).join('')}</div></div></section>` : ''}`;
  };

  let cat = 'Todo';
  P.cafetin = async () => {
    const cf = data.cafetin, items = cf.items.filter(enSede);
    const cats = ['Todo', ...new Set(items.map((i) => i.categoria))]; if (!cats.includes(cat)) cat = 'Todo';
    const combos = cf.combos.filter((c) => enSede(c) && (!c.hasta || c.hasta >= SS.today()));
    const vis = items.filter((i) => cat === 'Todo' || i.categoria === cat).sort((a, b) => (b.disponible - a.disponible) || (b.destacado - a.destacado));
    const cs = sede !== 'todas' ? sedeObj(sede) : null;
    const cafeBadge = (cs && cs.cafePedidos && cs.cafePedidos.activo)
      ? `<div class="cafe-status ${cafeAbierto(cs) ? 'ab' : 'ce'}">${cafeAbierto(cs) ? '🟢 Pedidos abiertos ahora' : '🔴 Pedidos cerrados ahora'} · ${cafeHorarioTxt(cs)}</div>`
      : (sede === 'todas' ? `<div class="cafe-status todas">Elige tu sede para ver el horario de pedidos del cafetín</div>` : '');
    return `<section class="sec" style="padding-top:0"><div class="wrap">
      <div class="cafe-hero"><img src="${esc(await U(cf.imagen))}" alt="">
        <div><span class="eyebrow">Cafetín fit · ${esc(sede === 'todas' ? 'todas las sedes' : 'sede ' + sedeName(sede))}</span><h1 class="h1">${esc(cf.titulo)} <em>${esc(cf.acento)}</em></h1><p class="lead" style="color:#ddd">${esc(cf.texto)}</p>${cafeBadge}</div></div>
      ${sedeChips()}
      ${combos.length ? `<h2 class="h2" style="font-size:2rem;margin-top:2.6rem">Combos <em>del momento</em></h2><div class="combos">${(await Promise.all(combos.map(async (c) => `<button class="combo rv" data-combo="${c.id}"><div class="ci">${c.foto ? `<img src="${esc(await U(c.foto))}" alt="" loading="lazy">` : ''}</div><div><small>Combo${c.hasta ? ' · hasta ' + fmt(c.hasta) : ''}</small><h4>${esc(c.nombre)}</h4><p>${esc(c.incluye)}</p></div><div class="cp">${c.precioAntes ? `<s>${soles(c.precioAntes)}</s>` : ''}<b>${soles(c.precio)}</b><span class="cpedir">Pedir →</span></div></button>`))).join('')}</div>` : ''}
      <div class="row-hd" style="margin-top:2.6rem"><h2 class="h2" style="font-size:2rem;margin:0">Nuestro <em>menú</em></h2><div class="chips">${cats.map((c) => `<button class="chip ${c === cat ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>
      <div class="menu">${(await Promise.all(vis.map(async (i) => `<button class="mcard rv ${i.disponible ? '' : 'off'}" data-item="${i.id}">
        <div class="mi">${i.foto ? `<img src="${esc(await U(i.foto))}" alt="${esc(i.nombre)}" loading="lazy">` : '🥤'}${!i.disponible ? '<span class="tag x">Agotado</span>' : i.destacado ? '<span class="tag y">Favorito</span>' : ''}<span class="pr">${soles(i.precio)}</span></div>
        <div class="mb"><h4>${esc(i.nombre)}</h4><p>${esc(i.descripcion)}</p><div class="mac">${i.proteina ? `<span class="p">${i.proteina} g prot.</span>` : ''}${i.kcal ? `<span>${i.kcal} kcal</span>` : ''}${i.objetivo === 'definicion' ? '<span>🔥 Definición</span>' : i.objetivo === 'volumen' ? '<span>💪 Volumen</span>' : ''}</div></div></button>`))).join('') || '<div class="empty">Sin productos en esta categoría.</div>'}</div>
    </div></section>`;
  };
  async function openCombo(id) {
    const c = data.cafetin.combos.find((x) => x.id === id); if (!c) return;
    const s = (sede !== 'todas' && sedeObj(sede)) ? sedeObj(sede) : (sedeObj((c.sedes || [])[0]) || waSede());
    $('#modal').innerHTML = `<div class="box"><div class="im">${c.foto ? `<img src="${esc(await U(c.foto))}" alt="">` : ''}</div><div class="bd">
      <span class="eyebrow">Combo${c.hasta ? ' · hasta ' + fmt(c.hasta) : ''}</span><h3>${esc(c.nombre)}</h3><p style="color:#cfcabf">${esc(c.incluye)}</p>
      <div class="big">${c.precioAntes ? `<s style="font-size:.55em;color:var(--mu);margin-right:.4rem">${soles(c.precioAntes)}</s>` : ''}${soles(c.precio)}</div><small style="color:var(--mu)">Disponible en: ${(c.sedes || []).map(sedeName).join(', ')}</small>
      ${cafeAbierto(s) ? `<a class="btn btn-wa" target="_blank" rel="noopener" href="${SS.waLink(cafeWa(s), `Hola 👋 Quiero pedir el ${c.nombre} (${c.incluye}) a ${soles(c.precio)} en la sede ${s.nombre}. ¿Está disponible?`)}">${WA}Pedir combo por WhatsApp</a>` : `<div class="cafe-cerrado">🕒 <b>Pedidos cerrados ahora</b><span>Cafetín ${esc(s.nombre)}: ${cafeHorarioTxt(s)}</span></div>`}
    </div><button class="xbtn" data-mclose aria-label="Cerrar">×</button></div>`;
    $('#modal').classList.add('on');
  }
  async function openItem(id) {
    const i = data.cafetin.items.find((x) => x.id === id); if (!i) return;
    const s = (sede !== 'todas' && sedeObj(sede)) ? sedeObj(sede) : (sedeObj((i.sedes || [])[0]) || waSede());
    $('#modal').innerHTML = `<div class="box"><div class="im">${i.foto ? `<img src="${esc(await U(i.foto))}" alt="">` : ''}</div><div class="bd">
      <span class="eyebrow">${esc(i.categoria)}</span><h3>${esc(i.nombre)}</h3><p style="color:#cfcabf">${esc(i.descripcion)}</p>
      <div class="mac">${i.proteina ? `<span class="p">${i.proteina} g proteína</span>` : ''}${i.kcal ? `<span>${i.kcal} kcal</span>` : ''}</div>
      <div class="big">${soles(i.precio)}</div><small style="color:var(--mu)">Disponible en: ${i.sedes.map(sedeName).join(', ')}</small>
      ${i.disponible ? (cafeAbierto(s) ? `<a class="btn btn-wa" target="_blank" rel="noopener" href="${SS.waLink(cafeWa(s), `Hola 👋 Quiero pedir un ${i.nombre} en la sede ${s.nombre}. ¿Está disponible?`)}">${WA}Pedir por WhatsApp</a>` : `<div class="cafe-cerrado">🕒 <b>Pedidos cerrados ahora</b><span>Cafetín ${esc(s.nombre)}: ${cafeHorarioTxt(s)}</span></div>`) : '<span class="tag x">Agotado por hoy</span>'}
    </div><button class="xbtn" data-mclose aria-label="Cerrar">×</button></div>`;
    $('#modal').classList.add('on');
  }

  P.sedes = async () => {
    const on = abierto();
    const list = sede === 'todas' ? data.sedes : [sedeObj(sede), ...data.sedes.filter((s) => s.id !== sede)];
    return head('Encuéntranos', 'Nuestras', 'sedes', 'Escríbele directo a la recepción de tu sede por WhatsApp. Te responden en minutos.') +
      `<section class="sec" style="padding-top:0"><div class="wrap"><div class="sedes">${(await Promise.all(list.map(async (s) => `
      <article class="sede rv"><div class="ph"><img src="${esc(await U(s.foto))}" alt="Sede ${esc(s.nombre)}" loading="lazy"><span class="open ${on ? 'on' : ''}">${on ? 'Abierto ahora' : 'Cerrado ahora'}</span>${s.video && data.galeria.some((g) => g.id === s.video) ? `<button class="svid" data-svid="${s.video}">▶ Cómo llegar</button>` : ''}<h3>${esc(s.nombre)}</h3></div>
        <div class="info"><span class="dist">${esc(s.distrito)}</span>
          <div class="hrs">${s.horario.map(([d, h]) => `<div><span>${esc(d)}</span><b>${esc(h)}</b></div>`).join('')}</div>
          ${s.lat ? `<div class="map" data-lat="${s.lat}" data-lng="${s.lng}"></div>` : ''}
          <div class="acts"><a class="btn btn-wa" target="_blank" rel="noopener" href="${SS.waLink(s.whatsapp, `Hola ${NOM} ${s.nombre} 👋 Quiero información para inscribirme.`)}">${WA}WhatsApp</a>${s.maps ? `<a class="btn btn-o" target="_blank" rel="noopener" href="${esc(s.maps)}">Cómo llegar</a>` : ''}</div></div></article>`))).join('')}</div></div></section>`;
  };

  let gtab = data.galeria.some((g) => g.mediaTipo === 'video' && g.estado === 'publicado') ? 'videos' : 'fotos', gcat = 'Todo', gshow = 12;
  P.galeria = async () => {
    const all = data.galeria.filter((g) => pubVis(g) && enSede(g)), isV = gtab === 'videos';
    const items = all.filter((g) => (g.mediaTipo === 'video') === isV);
    const cats = ['Todo', ...new Set(items.map((g) => g.categoria || 'General'))]; if (!cats.includes(gcat)) gcat = 'Todo';
    const vis = items.filter((g) => gcat === 'Todo' || (g.categoria || 'General') === gcat);
    galList = vis;
    const shown = vis.slice(0, gshow);
    const tiles = await Promise.all(shown.map(async (g, i) => `<button class="gitem" data-g="${i}" style="animation-delay:${(i % 12) * 40}ms"><img src="${esc(await U(isV ? g.poster || '' : g.media))}" alt="" loading="lazy">${isV ? '<i class="play">▶</i>' : ''}<span>${esc(g.titulo || '')}</span></button>`));
    return head('Galería', 'Así se vive', NOM, 'Todas nuestras fotos y videos en un solo lugar.', sedeChips()) + `
      <section class="sec" style="padding-top:0"><div class="wrap">
        <div class="gal-top"><div class="gtabs"><button class="${isV ? 'on' : ''}" data-gtab="videos">Videos · ${all.filter((g) => g.mediaTipo === 'video').length}</button><button class="${!isV ? 'on' : ''}" data-gtab="fotos">Fotos · ${all.filter((g) => g.mediaTipo !== 'video').length}</button></div>
          <div class="chips">${cats.map((c) => `<button class="chip ${c === gcat ? 'on' : ''}" data-gcat="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>
        <div class="ggrid ${isV ? 'v' : ''}">${tiles.join('') || '<div class="empty">Aún no hay contenido aquí.</div>'}</div>
        ${vis.length > gshow ? `<div class="gmore">Mostrando ${shown.length} de ${vis.length}<button class="btn btn-o" data-gmore>Ver más</button></div>` : ''}
      </div></section>`;
  };
  let galList = [], reelList = [];

  // ---------- Temas de temporada PREMIUM ----------
  const TEMAS = {
    navidad:        { nom: 'Navidad', emo: '🎄', tag: 'Edición Navidad', titulo: 'Regálate tu mejor versión', promo: '2×1 en inscripción, solo diciembre', fx: 'nieve', cols: ['#ffffff', '#dff3ff'], hasta: '12-31', lights: true },
    halloween:      { nom: 'Halloween', emo: '🎃', tag: 'Reto Halloween', titulo: 'Sin miedo al cambio', promo: 'Inscríbete y llévate 1 semana gratis', fx: 'brasas', cols: ['#ff8a1f', '#ffc078', '#b06bff'], hasta: '10-31' },
    anionuevo:      { nom: 'Año Nuevo', emo: '🎆', tag: 'Año Nuevo', titulo: 'Año nuevo, nueva versión de ti', promo: '20% de descuento en planes anuales', fx: 'fuegos', cols: ['#f1c84b', '#ffe9a8', '#ffffff', '#ffb347'], hasta: '01-15' },
    fiestaspatrias: { nom: 'Fiestas Patrias', emo: '', flag: 1, tag: 'Fiestas Patrias', titulo: 'Entrena con orgullo peruano', promo: 'Plan 3 meses al precio de 2', fx: 'fuegos', cols: ['#ff2a3d', '#ffffff', '#ff6b78'], hasta: '07-31' },
    sanvalentin:    { nom: 'San Valentín', emo: '❤️', tag: 'Plan Pareja', titulo: 'Entrenar en dúo es mejor', promo: 'Inscríbete con tu pareja y paguen menos', fx: 'corazones', cols: ['#ff4d6d', '#ff8fa3', '#ffd1dc'], hasta: '02-14' }
  };
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fxStop = null, cdTimer = 0;
  // Fin de la promo: la fecha que pongan, o el fin de la temporada (cuenta regresiva solo si faltan ≤ 60 días)
  const temaFin = (c, cfg) => {
    const d = String(c.temaHasta || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) { const f = new Date(d + 'T23:59:59-05:00'); return f - Date.now() > 0 ? f : null; }
    const y = new Date().getFullYear();
    let f = new Date(`${y}-${cfg.hasta}T23:59:59-05:00`);
    if (f < Date.now()) f = new Date(`${y + 1}-${cfg.hasta}T23:59:59-05:00`);
    return f - Date.now() < 864e5 * 60 ? f : null;
  };
  const cdParts = (ms) => { const s = Math.max(0, ms / 1e3 | 0); return [s / 86400 | 0, (s % 86400) / 3600 | 0, (s % 3600) / 60 | 0, s % 60]; };
  const p2 = (n) => String(n).padStart(2, '0');

  // Motor de partículas en canvas: liviano, se pausa si la pestaña no se ve
  function temaFx(kind, cols) {
    const cv = document.createElement('canvas'); cv.id = 'temaFx'; cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    const cx = cv.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 1.5);
    let W = 0, H = 0, mob = false, raf = 0, last = 0, t = 0, nextRocket = 0.6, nextBat = 3;
    const P = [], S = [], B = [];
    const R = (a, b) => a + Math.random() * (b - a), pick = (a) => a[(Math.random() * a.length) | 0];
    const sprite = (col, soft) => { const s = document.createElement('canvas'); s.width = s.height = 64; const g = s.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, col); gr.addColorStop(soft ? 0.25 : 0.45, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return s; };
    const heart = (col) => { const s = document.createElement('canvas'); s.width = s.height = 64; const g = s.getContext('2d'); g.shadowColor = col; g.shadowBlur = 14; g.fillStyle = col; g.beginPath(); g.moveTo(32, 52); g.bezierCurveTo(6, 36, 8, 12, 24, 12); g.bezierCurveTo(29, 12, 32, 16, 32, 19); g.bezierCurveTo(32, 16, 35, 12, 40, 12); g.bezierCurveTo(56, 12, 58, 36, 32, 52); g.fill(); return s; };
    const SP = cols.map((c) => sprite(c)), SOFT = cols.map((c) => sprite(c, 1)), HE = kind === 'corazones' ? cols.map(heart) : null;
    function size() { W = innerWidth; H = innerHeight; mob = W < 700; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; cx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    function seed() {
      P.length = 0;
      const n = kind === 'nieve' ? (mob ? 70 : 150) : kind === 'brasas' ? (mob ? 34 : 70) : kind === 'corazones' ? (mob ? 16 : 30) : (mob ? 18 : 36);
      for (let i = 0; i < n; i++) P.push(mk(true));
    }
    function mk(init) {
      const z = Math.random() ** 1.6;
      if (kind === 'nieve') return { x: R(0, W), y: init ? R(-H, H) : R(-40, -10), z, r: 0.8 + z * 3.4, vy: 18 + z * 62, ph: R(0, 6.3), w: R(0.4, 1.3), sp: pick(z > 0.7 ? SOFT : SP) };
      if (kind === 'brasas') return { x: R(0, W), y: init ? R(0, H) : H + 10, z, r: 0.8 + z * 2.6, vy: -(14 + z * 46), ph: R(0, 6.3), w: R(0.6, 1.8), sp: pick(SP), fl: R(2, 6) };
      if (kind === 'corazones') return { x: R(0, W), y: init ? R(0, H) : H + 30, z, r: 7 + z * 15, vy: -(16 + z * 30), ph: R(0, 6.3), w: R(0.5, 1.2), sp: pick(HE), rot: R(-0.4, 0.4) };
      return { x: R(0, W), y: init ? R(-H, H) : -10, z, r: 0.6 + z * 1.8, vy: 10 + z * 26, ph: R(0, 6.3), w: R(1, 3), sp: pick(SP), tw: 1 };
    }
    function burst(x, y, n, sp, big) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.283 + R(-0.12, 0.12), v = big ? R(90, 260) : R(60, 170);
        S.push({ x, y, px: x, py: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: big ? R(1.1, 1.9) : R(0.6, 1.1), c: pick(cols), sp: sp || pick(SP), r: big ? R(1.2, 2.2) : R(1, 1.8) });
      }
    }
    function rocket() { const x = R(W * 0.12, W * 0.88); B.push({ x, y: H + 5, vx: R(-20, 20), vy: -R(H * 0.85, H * 1.15), ty: R(H * 0.12, H * 0.42), c: pick(cols) }); }
    function bat() { const dir = Math.random() < 0.5 ? 1 : -1; B.push({ bat: 1, x: dir > 0 ? -40 : W + 40, y: R(H * 0.08, H * 0.45), vx: dir * R(110, 190), ph: R(0, 6), s: R(0.7, 1.3) }); }
    function drawBat(b) {
      const f = Math.sin(t * 16 + b.ph) * 0.9, s = 14 * b.s;
      cx.save(); cx.translate(b.x, b.y + Math.sin(t * 3 + b.ph) * 8); cx.scale(b.vx > 0 ? 1 : -1, 1); cx.fillStyle = 'rgba(10,4,18,.88)';
      cx.beginPath(); cx.moveTo(0, 0); cx.quadraticCurveTo(-s * 0.7, -s * (0.4 + f), -s * 1.6, -s * (0.1 + f)); cx.quadraticCurveTo(-s, s * 0.05, -s * 0.9, s * 0.35); cx.quadraticCurveTo(-s * 0.4, s * 0.1, 0, s * 0.3);
      cx.quadraticCurveTo(s * 0.4, s * 0.1, s * 0.9, s * 0.35); cx.quadraticCurveTo(s, s * 0.05, s * 1.6, -s * (0.1 + f)); cx.quadraticCurveTo(s * 0.7, -s * (0.4 + f), 0, 0); cx.fill(); cx.restore();
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - (last || now)) / 1e3); last = now; t += dt;
      cx.clearRect(0, 0, W, H);
      cx.globalCompositeOperation = kind === 'brasas' || kind === 'fuegos' ? 'lighter' : 'source-over';
      for (let i = 0; i < P.length; i++) {
        const p = P[i];
        p.y += p.vy * dt; p.x += Math.sin(t * p.w + p.ph) * (kind === 'nieve' ? 22 : 14) * dt * (0.4 + p.z);
        if (p.y > H + 40 || p.y < -60) P[i] = mk(false);
        let a = kind === 'nieve' ? 0.35 + p.z * 0.6 : kind === 'brasas' ? (0.35 + 0.65 * Math.abs(Math.sin(t * p.fl + p.ph))) * (p.y / H + 0.15) : kind === 'corazones' ? 0.35 + p.z * 0.5 : 0.25 + 0.75 * Math.abs(Math.sin(t * p.w + p.ph));
        cx.globalAlpha = Math.min(1, a);
        if (kind === 'corazones') { cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot + Math.sin(t + p.ph) * 0.25); cx.drawImage(p.sp, -p.r, -p.r, p.r * 2, p.r * 2); cx.restore(); }
        else { const d = p.r * (kind === 'nieve' && p.z > 0.7 ? 5 : 4); cx.drawImage(p.sp, p.x - d / 2, p.y - d / 2, d, d); }
      }
      if (kind === 'fuegos') { nextRocket -= dt; if (nextRocket <= 0 && !document.hidden) { rocket(); nextRocket = mob ? R(1.6, 3) : R(0.9, 2.2); } }
      if (kind === 'brasas') { nextBat -= dt; if (nextBat <= 0) { bat(); if (!mob && Math.random() < 0.4) setTimeout(bat, 350); nextBat = R(5, 11); } }
      for (let i = B.length - 1; i >= 0; i--) {
        const b = B[i];
        if (b.bat) { b.x += b.vx * dt; cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 1; drawBat(b); cx.globalCompositeOperation = 'lighter'; if (b.x < -80 || b.x > W + 80) B.splice(i, 1); continue; }
        b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 240 * dt;
        cx.globalAlpha = 0.9; cx.drawImage(SP[0], b.x - 5, b.y - 5, 10, 10);
        cx.globalAlpha = 0.35; cx.drawImage(SP[0], b.x - 3, b.y + 6, 6, 18);
        if (b.y <= b.ty || b.vy >= -20) { burst(b.x, b.y, mob ? 42 : 70, null, true); B.splice(i, 1); }
      }
      for (let i = S.length - 1; i >= 0; i--) {
        const s = S[i]; s.life += dt; if (s.life > s.max) { S.splice(i, 1); continue; }
        s.px = s.x; s.py = s.y; s.vx *= 1 - 1.6 * dt; s.vy = s.vy * (1 - 1.6 * dt) + 70 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
        const k = 1 - s.life / s.max; cx.globalAlpha = k * (0.6 + 0.4 * Math.random());
        cx.strokeStyle = s.c; cx.lineWidth = s.r; cx.beginPath(); cx.moveTo(s.px, s.py); cx.lineTo(s.x, s.y); cx.stroke();
        cx.drawImage(s.sp, s.x - s.r * 3, s.y - s.r * 3, s.r * 6, s.r * 6);
      }
      cx.globalAlpha = 1;
    }
    const tap = (e) => { if (e.target.closest('input,textarea,select,video,.player,#temaPop')) return; const n = mob ? 16 : 22; burst(e.clientX, e.clientY, n, HE ? null : null, false); };
    const vis = () => { cancelAnimationFrame(raf); last = 0; if (!document.hidden) raf = requestAnimationFrame(frame); };
    const rs = () => { size(); seed(); };
    size(); seed(); raf = requestAnimationFrame(frame);
    addEventListener('resize', rs); document.addEventListener('visibilitychange', vis); document.addEventListener('pointerdown', tap, { passive: true });
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', rs); document.removeEventListener('visibilitychange', vis); document.removeEventListener('pointerdown', tap); cv.remove(); };
  }

  function applyTema() {
    // ?tema=navidad → vista previa (no cambia nada guardado). La usan las demos e Integraciones de Xyro Apps.
    const qt = (new URLSearchParams(location.search).get('tema') || '').toLowerCase(), prev = !!TEMAS[qt];
    const c = data.config, t = prev ? qt : (c.tema || '').toLowerCase(), cfg = TEMAS[t], root = document.documentElement;
    if (prev && !$('#temaPrev')) { const b = document.createElement('div'); b.id = 'temaPrev'; b.textContent = '👀 Vista previa · tema ' + TEMAS[qt].nom; b.style.cssText = 'position:fixed;left:50%;top:calc(var(--nav) + 10px);transform:translateX(-50%);z-index:90;padding:.5rem 1rem;border-radius:999px;background:#000d;color:#fff;font:700 .8rem var(--fb);border:1px solid #fff3;pointer-events:none'; document.body.appendChild(b); }
    if (cfg) root.dataset.tema = t; else root.removeAttribute('data-tema');
    ['#temaDeco', '#temaRibbon', '#temaLights', '#temaPop', '#temaBadge'].forEach((s) => $(s)?.remove());
    if (fxStop) { fxStop(); fxStop = null; } clearInterval(cdTimer);
    if (!cfg) { root.removeAttribute('data-ribbon'); root.style.removeProperty('--tema-tag'); return; }
    root.style.setProperty('--tema-tag', JSON.stringify((cfg.emo ? cfg.emo + '  ' : '') + cfg.tag.toUpperCase()));
    const emoH = cfg.flag ? '<i class="flagpe" role="img" aria-label="Bandera del Perú"></i>' : cfg.emo;
    root.style.setProperty('--tema-emo', JSON.stringify(cfg.emo));
    const deco = document.createElement('div'); deco.id = 'temaDeco'; deco.setAttribute('aria-hidden', 'true');
    deco.innerHTML = '<div class="glow"></div><div class="vig"></div>'; document.body.appendChild(deco);
    if (!RM && !document.body.classList.contains('mant')) fxStop = temaFx(cfg.fx, cfg.cols);
    if (cfg.lights) { const lg = document.createElement('div'); lg.id = 'temaLights'; lg.setAttribute('aria-hidden', 'true'); lg.innerHTML = Array.from({ length: 28 }, (_, i) => `<i style="--i:${i}"></i>`).join(''); document.body.appendChild(lg); }
    const promo = (c.temaPromo || '').trim() || cfg.promo, titulo = (c.temaTitulo || '').trim() || cfg.titulo;
    const fin = temaFin(c, cfg), vivo = !!fin;
    const msg = `Vi la promo de ${cfg.nom} en la web (${promo}) y quiero aprovecharla.`;
    const rib = document.createElement('div'); rib.id = 'temaRibbon';
    rib.innerHTML = `<span class="em">${emoH}</span><b>${esc(promo)}</b>${vivo ? '<span class="cd">Termina en <i data-tcd="s">--</i></span>' : ''}<button class="go" data-wa data-msg="${esc(msg)}">Lo quiero</button><button class="x" aria-label="Cerrar">×</button>`;
    rib.querySelector('.x').addEventListener('click', (e) => { e.stopPropagation(); rib.remove(); root.removeAttribute('data-ribbon'); });
    rib.addEventListener('click', (e) => { if (!e.target.closest('button')) temaPop(true); });
    document.body.appendChild(rib); root.setAttribute('data-ribbon', '');
    function temaPop(force) {
      if ($('#temaPop') || document.body.classList.contains('mant')) return;
      const key = LK('tpop') + t + '-' + promo.length;
      if (!force) { try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch (_) {} }
      const m = document.createElement('div'); m.id = 'temaPop'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', cfg.tag);
      m.innerHTML = `<div class="tp-card"><button class="x" aria-label="Cerrar">×</button>
        <div class="tp-emo">${emoH}</div><span class="tp-tag">${esc(cfg.tag)}</span>
        <h2 class="tp-t">${esc(titulo)}</h2><p class="tp-p">${esc(promo)}</p>
        ${vivo ? `<div class="tp-cd"><small>La promo termina en</small><div>${['Días', 'Horas', 'Min', 'Seg'].map((l, i) => `<span><b data-tcd="${i}">--</b><em>${l}</em></span>`).join('')}</div></div>` : ''}
        <div class="tp-ctas"><button class="btn btn-y tp-go" data-wa data-msg="${esc(msg)}">${WA}Quiero la promo</button><a class="btn btn-o" href="#/planes">Ver planes</a></div>
        <button class="tp-no">Ahora no</button></div>`;
      const close = () => { m.classList.add('out'); setTimeout(() => m.remove(), 260); document.removeEventListener('keydown', esck); };
      const esck = (e) => { if (e.key === 'Escape') close(); };
      m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('.x,.tp-no,a,.tp-go')) close(); });
      document.addEventListener('keydown', esck);
      document.body.appendChild(m); tick(); m.querySelector('.tp-go').focus({ preventScroll: true });
    }
    function tick() {
      const [d, h, mi, s] = cdParts(fin - Date.now());
      $$('[data-tcd]').forEach((el) => { const k = el.dataset.tcd; el.textContent = k === 's' ? (d ? `${d}d ${p2(h)}:${p2(mi)}:${p2(s)}` : `${p2(h)}:${p2(mi)}:${p2(s)}`) : p2([d, h, mi, s][k]); });
    }
    if (vivo) { tick(); cdTimer = setInterval(tick, 1000); }
    if (c.temaPopup !== false) setTimeout(() => temaPop(false), 2200);
  }

  // ---------- Router ----------
  let route = '';
  async function render(keepScroll) {
    const h = location.hash.replace(/^#\/?/, '') || 'inicio', [name, arg] = h.split('/');
    const key = P[name] && ON(name === 'coach' ? 'coaches' : name) ? name : 'inicio';
    const y = scrollY, changed = route !== h; route = h;
    nav.classList.toggle('inner', key !== 'inicio');
    const tabKey = key === 'coach' ? 'coaches' : key;
    $$('#tabs a,#bbar [data-r]').forEach((a) => a.classList.toggle('on', a.dataset.r === tabKey || (a.id === 'moreBtn' && ['clases', 'nutricion', 'sedes', 'galeria', 'promos'].includes(tabKey))));
    moveInd();
    app.innerHTML = `<div class="page">${await (key === 'inicio' && INI[EST] ? INI[EST]() : P[key](arg))}</div>`;
    document.title = (key === 'inicio' ? '' : ({ planes: 'Planes', coaches: 'Entrenadores', coach: 'Entrenador', clases: 'Horario de clases', nutricion: 'Asesoría nutricional', cafetin: 'Cafetín fit', sedes: 'Sedes', galeria: 'Galería', promos: 'Promos' }[key] + ' · ')) + NOM;
    if (changed && !keepScroll) scrollTo(0, 0); else scrollTo(0, y);
    afterRender();
    if ((key === 'clases' || key === 'nutricion') && innerWidth < 900) { const hc = $('#clHoy'); if (hc) hc.parentNode.scrollLeft = hc.offsetLeft - 16; }
  }
  addEventListener('hashchange', () => { $('#moreSheet').classList.remove('on'); closeAll(); render(); });

  function afterRender() {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } }), { threshold: .1 });
    $$('.rv').forEach((el) => io.observe(el));
    const vio = new IntersectionObserver((es) => es.forEach((e) => { const v = e.target; if (e.isIntersecting) { if (!v.getAttribute('src')) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause(); }), { threshold: .6 });
    $$('.reel video').forEach((v) => vio.observe(v));
    const mio = new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) return; const el = e.target; mio.unobserve(el); el.innerHTML = `<iframe loading="lazy" title="Mapa" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=${el.dataset.lat},${el.dataset.lng}&z=16&output=embed"></iframe>`; }), { rootMargin: '200px' });
    $$('.map').forEach((m) => mio.observe(m));
    $$('[data-car]').forEach((car) => {
      const t = car.querySelector('.car-track'), bar = car.querySelector('.car-bar i'), [pv, nx] = car.querySelectorAll('.car-btn');
      const upd = () => { const max = t.scrollWidth - t.clientWidth, w = Math.max(12, (t.clientWidth / t.scrollWidth) * 100); bar.style.width = w + '%'; bar.style.transform = `translateX(${max > 0 ? (t.scrollLeft / max) * (100 / w * 100 - 100) : 0}%)`; pv.disabled = t.scrollLeft < 5; nx.disabled = t.scrollLeft > max - 5; car.querySelector('.car-ctl').style.display = max > 5 ? '' : 'none'; };
      t.addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
      [pv, nx].forEach((b) => (b.onclick = () => t.scrollBy({ left: +b.dataset.dir * t.clientWidth * .85, behavior: 'smooth' })));
    });
  }

  // ---------- Reproductor / visor ----------
  const pl = document.createElement('div'); pl.className = 'player';
  pl.innerHTML = `<div class="pbox"><video playsinline controls></video><img alt="" hidden><div class="pinfo"><small></small><b></b></div></div><button class="pnav prev" aria-label="Anterior">‹</button><button class="pnav next" aria-label="Siguiente">›</button><button class="xbtn" data-pclose aria-label="Cerrar">×</button>`;
  document.body.appendChild(pl);
  let cur = 0, plist = [];
  async function openPlayer(list, i) {
    if (!list.length) return; plist = list; cur = (i + list.length) % list.length; const g = list[cur];
    const v = pl.querySelector('video'), im = pl.querySelector('img'), isV = g.mediaTipo === 'video';
    pl.querySelector('.pbox').classList.toggle('wide', !isV);
    if (isV) { im.hidden = true; v.hidden = false; v.src = await U(g.media); v.play().catch(() => {}); } else { v.pause(); v.hidden = true; im.hidden = false; im.src = await U(g.media); }
    pl.querySelector('small').textContent = [g.categoria, sedeName(g.sede)].filter(Boolean).join(' · ');
    pl.querySelector('b').textContent = g.titulo || '';
    $$('.pnav', pl).forEach((b) => (b.style.display = list.length > 1 ? '' : 'none'));
    pl.classList.add('on'); document.body.style.overflow = 'hidden'; $$('.reel video').forEach((x) => x.pause());
  }
  function closeAll() {
    if (pl.classList.contains('on')) { const v = pl.querySelector('video'); v.pause(); v.removeAttribute('src'); v.load(); pl.classList.remove('on'); }
    $('#modal').classList.remove('on'); $('#sheet').classList.remove('on'); document.body.style.overflow = '';
  }
  pl.querySelector('.prev').onclick = () => openPlayer(plist, cur - 1);
  pl.querySelector('.next').onclick = () => openPlayer(plist, cur + 1);
  pl.querySelector('video').addEventListener('ended', () => plist.length > 1 && openPlayer(plist, cur + 1));
  let tx = 0; pl.addEventListener('touchstart', (e) => (tx = e.touches[0].clientX), { passive: true });
  pl.addEventListener('touchend', (e) => { const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 60 && plist.length > 1) openPlayer(plist, cur + (d < 0 ? 1 : -1)); });

  // ---------- WhatsApp ----------
  function openSheet(plan, msg) {
    const txt = (s) => `Hola ${NOM} ${s.nombre} 👋 ` + (msg || (plan ? `Me interesa el plan ${plan}.` : 'Quiero información para inscribirme.'));
    if (sede !== 'todas' && sedeObj(sede)) { window.open(SS.waLink(sedeObj(sede).whatsapp, txt(sedeObj(sede))), '_blank', 'noopener'); return; }
    $('#sheetOpts').innerHTML = '<div class="bubble">¡Hola! 💪 ¿A qué sede quieres escribir?</div>' + data.sedes.map((s) => `<a class="opt" target="_blank" rel="noopener" href="${SS.waLink(s.whatsapp, txt(s))}" data-pick="${s.id}"><span>Sede ${esc(s.nombre)}<small>${esc(s.distrito)}</small></span><span style="color:var(--wa)">${WA.replace('<svg', '<svg width="22" height="22"')}</span></a>`).join('');
    $('#sheet').classList.add('on');
  }

  // ---------- Clicks ----------
  document.addEventListener('click', async (e) => {
    const t = (s) => e.target.closest(s);
    if (!t('.sedemenu') && !t('#sedePill')) $('.sedemenu')?.remove();
    let el;
    if ((el = t('[data-cerca]'))) { $('.sedemenu')?.remove(); $('#geoAsk')?.remove(); sedeCercana(); return; }
    if ((el = t('[data-geono]'))) { $('#geoAsk')?.remove(); return; }
    if ((el = t('[data-sede]'))) { $('.sedemenu')?.remove(); setSede(el.dataset.sede); return; }
    if ((el = t('[data-pick]'))) { $('#sheet').classList.remove('on'); setTimeout(() => setSede(el.dataset.pick), 300); return; }
    if ((el = t('[data-wa]'))) { e.preventDefault(); openSheet(el.dataset.plan, el.dataset.msg); return; }
    if ((el = t('[data-goal]'))) { renderQuiz(el.dataset.goal); return; }
    if ((el = t('[data-ctipo]'))) { claseTipo = el.dataset.ctipo; render(true); return; }
    if ((el = t('[data-nutri]'))) { const n = (data.nutricion || []).find((x) => x.id === el.dataset.nutri); if (n) { const s = (n.sede && n.sede !== 'todas' && sedeObj(n.sede)) || waSede(), dn = (DIAS_W.find((x) => x[0] === el.dataset.dia) || [, ''])[1].toLowerCase(), cuando = el.dataset.h ? `el ${dn} a las ${hora12(el.dataset.h)}` : `el ${dn} (de ${hora12(n.desde)} a ${hora12(n.hasta)})`; open(SS.waLink(s.whatsapp, `Hola ${NOM} ${s.nombre} 👋 Quiero separar mi cupo para la asesoría nutricional ${cuando}${n.modalidad === 'Virtual' ? ' (virtual)' : ''}. ¿Está disponible?`), '_blank', 'noopener'); } return; }
    if ((el = t('[data-clase]'))) { const k = (data.clases || []).find((x) => x.id === el.dataset.clase); if (k) { const s = (k.sede && k.sede !== 'todas' && sedeObj(k.sede)) || waSede(), dn = (DIAS_W.find((x) => x[0] === el.dataset.dia) || [, ''])[1]; open(SS.waLink(s.whatsapp, `Hola ${NOM} 👋 Quiero separar mi cupo en la clase de ${k.nombre} del ${dn.toLowerCase()} a las ${hora12(k.hora)} (sede ${s.nombre}).`), '_blank', 'noopener'); } return; }
    if ((el = t('[data-cat]'))) { cat = el.dataset.cat; render(true); return; }
    if ((el = t('[data-combo]'))) { openCombo(el.dataset.combo); return; }
    if ((el = t('[data-item]'))) { openItem(el.dataset.item); return; }
    if ((el = t('[data-reel]'))) { openPlayer(reelList, +el.dataset.reel); return; }
    if ((el = t('[data-g]'))) { openPlayer(galList, +el.dataset.g); return; }
    if ((el = t('[data-svid]'))) { const g = data.galeria.find((x) => x.id === el.dataset.svid); if (g) openPlayer([g], 0); return; }
    if ((el = t('[data-cvid]'))) { const c = data.entrenadores.find((x) => x.id === el.dataset.cvid); openPlayer([{ media: c.video, mediaTipo: 'video', titulo: c.nombre, categoria: 'Presentación', sede: c.sede }], 0); return; }
    if ((el = t('[data-photo]'))) { openPlayer([{ media: el.dataset.photo, mediaTipo: 'image', titulo: '' }], 0); return; }
    if ((el = t('[data-gtab]'))) { gtab = el.dataset.gtab; gcat = 'Todo'; gshow = 12; render(true); return; }
    if ((el = t('[data-gcat]'))) { gcat = el.dataset.gcat; gshow = 12; render(true); return; }
    if (t('[data-gmore]')) { gshow += 12; render(true); return; }
    if (t('#moreBtn')) { $('#moreSheet').classList.add('on'); return; }
    if (e.target.id === 'moreSheet') { $('#moreSheet').classList.remove('on'); return; }
    if (t('[data-close]') || e.target.id === 'sheet' || t('[data-mclose]') || e.target.id === 'modal' || t('[data-pclose]') || e.target === pl) closeAll();
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeAll(); $('#moreSheet').classList.remove('on'); $('.sedemenu')?.remove(); }
    if (pl.classList.contains('on') && e.key === 'ArrowRight') openPlayer(plist, cur + 1);
    if (pl.classList.contains('on') && e.key === 'ArrowLeft') openPlayer(plist, cur - 1);
  });

  // ---------- Modo mantenimiento ----------
  function pantallaMantenimiento(c, sedes) {
    const m = c.manto || {};
    const titulo = (m.titulo || '').trim() || 'Estamos mejorando la web';
    const msg = (m.msg || '').trim() || 'Volvemos en un momento con algo mejor para ti. Gracias por tu paciencia. 💪';
    const num = (sedes && sedes[0] && sedes[0].whatsapp) ? String(sedes[0].whatsapp).replace(/\D/g, '') : '';
    const r = c.redes || {};
    const soc = [
      r.instagram && `<a href="${esc(r.instagram)}" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/></svg></a>`,
      r.tiktok && `<a href="${esc(r.tiktok)}" target="_blank" rel="noopener" aria-label="TikTok"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 1 0 4.9 5.7V9a7.4 7.4 0 0 0 4.3 1.4V7.3a4.3 4.3 0 0 1-3.2-1.5z"/></svg></a>`,
      r.facebook && `<a href="${esc(r.facebook)}" target="_blank" rel="noopener" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v8h4v-8h3l1-4h-4V8z"/></svg></a>`
    ].filter(Boolean).join('');
    document.title = 'En mantenimiento';
    document.body.classList.add('mant');
    const el = document.createElement('div'); el.id = 'mantoScreen';
    el.innerHTML = `<div class="mc">
      ${G.logo ? `<img class="logo" src="${esc(G.logo)}" alt="">` : ''}
      <span class="badge">🛠️ En mantenimiento</span>
      <h1>${esc(titulo)}</h1>
      <p>${esc(msg)}</p>
      ${num ? `<a class="wa" href="https://wa.me/${num}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.8.7.8-2.7-.2-.3A8 8 0 1 1 12 20zm4.5-5.8c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-1.9-1.2 7.2 7.2 0 0 1-1.3-1.7c-.1-.2 0-.4.1-.5l.4-.4.3-.5v-.4l-.8-1.9c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3a2.7 2.7 0 0 0-.9 2c0 1.2.9 2.4 1 2.5.1.2 1.7 2.7 4.2 3.8 1.5.6 2 .7 2.7.6.4-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1l-.3-.3z"/></svg> Escríbenos por WhatsApp</a>` : ''}
      ${soc ? `<div class="social">${soc}</div>` : ''}
      <div class="dots"><span></span><span></span><span></span></div>
    </div>`;
    document.body.appendChild(el);
  }
  if (data.config.mantenimiento) { pantallaMantenimiento(data.config, data.sedes); return; }

  chrome(); applyTema(); await render();
  try {
    if (navigator.geolocation && !localStorage.getItem(LK('sede')) && !localStorage.getItem(LK('geo-ask')) && data.sedes.filter((x) => x.lat).length > 1) {
      setTimeout(() => { const g = document.createElement('div'); g.id = 'geoAsk'; g.innerHTML = '<span>📍 ¿Te mostramos la sede más cercana a ti?</span><button data-cerca>Sí, mostrar</button><button data-geono aria-label="No">×</button>'; document.body.appendChild(g); try { localStorage.setItem(LK('geo-ask'), '1'); } catch (_) {} }, 1800);
    }
  } catch (_) {}
  // ---------- Métricas (solo en la nube) ----------
  const BK = window.SS_BACKEND;
  if (BK && BK.metrica) {
    let primera = true;
    try { if (sessionStorage.getItem(LK('vis'))) primera = false; else sessionStorage.setItem(LK('vis'), '1'); } catch (_) {}
    if (primera) BK.metrica('visita');
    addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (a && /wa\.me|api\.whatsapp|whatsapp\.com/i.test(a.href)) BK.metrica('whatsapp');
    }, true);
  }
  addEventListener('storage', async (e) => { if (e.key === 'ss-ping') { data = await SS.load(); estilo(); secciones(); marca(); chrome(); applyTema(); render(true); } });
})();
