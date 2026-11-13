/* Mi web — editor de la página del negocio dentro de Xyro Apps (misma sesión). */
(async function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const U = (r) => SS.mediaUrl(r);
  const B = () => window.SS_BACKEND;                 // nube (Supabase) si está configurada
  let data = await SS.load().catch(() => null), me = null, view = 'resumen', editing = null, gpage = 1;
  if (!data) { location.replace('../'); return; }
  data.actividad = data.actividad || [];
  const IDLE_MIN = 60, MAX_TRY = 5, LOCK_MIN = 5;
  const rolLabel = { admin: 'Administrador', recepcion: 'Recepción', cafetin: 'Cafetín', gestor: 'Gestor' };

  // ---------- Utilidades ----------
  const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); };
  const getP = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const setP = (o, p, v) => { const ks = p.split('.'), l = ks.pop(); ks.reduce((a, k) => a[k] ?? (a[k] = {}), o)[l] = v; };
  const sedeName = (id) => id === 'todas' ? 'Todas' : (data.sedes.find((s) => s.id === id) || {}).nombre || '—';
  const isAdmin = () => me && me.rol === 'admin';
  const mySede = () => (me.sede && me.sede !== 'todas' ? me.sede : null);
  const log = (que) => {
    if (me && me.gestor) return;                                   // soporte del gestor: sin rastro
    if (B()) { try { B().actividad(null, me.nombre, que).catch(() => {}); } catch (_) {} return; }
    data.actividad.unshift({ t: Date.now(), quien: me.nombre, que }); data.actividad = data.actividad.slice(0, 300);
  };
  async function commit(msg, act) { if (act) log(act); await SS.save(data); if (msg) toast(msg); }
  const tempPass = () => 'Ss' + Math.random().toString(36).slice(2, 7) + Math.floor(10 + Math.random() * 89) + '!';
  const isVid = (r) => /\.(mp4|webm|mov)$/i.test(r || '') || mt[r] === 'video';
  const mt = {}, posters = {};

  // ---------- Medios: comprime fotos, saca portada de videos ----------
  function compress(file, max = 1600) {
    return new Promise((res) => {
      const img = new Image(), u = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        c.toBlob((b) => res(b || file), 'image/jpeg', 0.82);
      };
      img.onerror = () => res(file); img.src = u;
    });
  }
  function frame(file) {
    return new Promise((res) => {
      const v = document.createElement('video'), u = URL.createObjectURL(file);
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = u;
      const done = (b) => { URL.revokeObjectURL(u); res(b); };
      v.onloadeddata = () => { v.currentTime = Math.min(1.5, (v.duration || 2) / 3); };
      v.onseeked = () => { const c = document.createElement('canvas'), k = Math.min(1, 720 / v.videoWidth); c.width = v.videoWidth * k; c.height = v.videoHeight * k; c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); c.toBlob(done, 'image/jpeg', 0.8); };
      v.onerror = () => done(null); setTimeout(() => done(null), 8000);
    });
  }
  async function upload(file) {
    const video = file.type.startsWith('video');
    if (!video && !file.type.startsWith('image')) throw new Error('Solo fotos o videos');
    if (file.size > (video ? 80 : 15) * 1048576) throw new Error(video ? 'Video muy pesado (máx. 80 MB)' : 'Foto muy pesada (máx. 15 MB)');
    const blob = video ? file : await compress(file);
    if (B()) {                                        // nube: sube al almacenamiento de Supabase
      const ref = await B().subir(new File([blob], file.name || 'foto.jpg', { type: video ? file.type : 'image/jpeg' }));
      mt[ref] = video ? 'video' : 'image';
      if (video) { const p = await frame(file); if (p) posters[ref] = await B().subir(new File([p], 'poster.jpg', { type: 'image/jpeg' })); }
      return ref;
    }
    const id = SS.uid();
    await SS.putMedia(id, blob);
    const ref = 'idb:' + id; mt[ref] = video ? 'video' : 'image';
    if (video) { const p = await frame(file); if (p) { const pid = SS.uid(); await SS.putMedia(pid, p); posters[ref] = 'idb:' + pid; } }
    return ref;
  }
  const thumb = async (r) => r ? (isVid(r) ? `<video src="${esc(await U(r))}" muted preload="metadata"></video>` : `<img src="${esc(await U(r))}" alt="">`) : '';

  const DIAS = [['lun', 'Lunes'], ['mar', 'Martes'], ['mie', 'Miércoles'], ['jue', 'Jueves'], ['vie', 'Viernes'], ['sab', 'Sábado'], ['dom', 'Domingo']];
  const h12 = (h) => { const [a, b] = String(h || '').split(':'); if (a === undefined || b === undefined) return h || ''; const n = +a; return `${n % 12 || 12}:${b} ${n < 12 ? 'am' : 'pm'}`; };
  // ---------- Campos de formulario ----------
  // f = [clave, etiqueta, tipo, opciones]
  async function field(obj, [k, lab, t = 'text', o = {}]) {
    const v = getP(obj, k), cls = o.full || ['area', 'media', 'medias', 'rows', 'lines', 'sedes'].includes(t) ? 'full' : '', hint = o.hint ? `<span class="hint">${esc(o.hint)}</span>` : '';
    const dis = o.lock ? 'disabled' : '';
    if (t === 'bool') return `<label class="ck ${cls}"><input type="checkbox" data-k="${k}" data-t="bool" ${v ? 'checked' : ''} ${dis}>${esc(lab)}</label>`;
    if (t === 'select') return `<label class="${cls}">${esc(lab)}<select data-k="${k}" ${dis}>${o.opts.map(([a, b]) => `<option value="${esc(a)}" ${String(a) === String(v) ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>${hint}</label>`;
    if (t === 'area') return `<label class="full">${esc(lab)}<textarea data-k="${k}" rows="${o.rows || 3}" maxlength="${o.max || 1200}">${esc(v)}</textarea>${hint}</label>`;
    if (t === 'lines') return `<label class="full">${esc(lab)}<textarea data-k="${k}" data-t="lines" rows="${o.rows || 4}">${esc((v || []).join('\n'))}</textarea><span class="hint">${esc(o.hint || 'Uno por línea.')}</span></label>`;
    if (t === 'rows') return `<label class="full">${esc(lab)}<textarea data-k="${k}" data-t="rows" data-cols="${o.cols || ''}" rows="${o.rows || 4}">${esc((v || []).map((r) => (Array.isArray(r) ? r : o.cols.split(',').map((c) => r[c] ?? '')).join(' | ')).join('\n'))}</textarea><span class="hint">${esc(o.hint)}</span></label>`;
    if (t === 'time') { const [hh, mm] = String(v || '07:00').split(':'); const H = +hh || 0, h = H % 12 || 12, ap = H < 12 ? 'am' : 'pm', M = String(mm || '00').padStart(2, '0'); const mins = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']; if (!mins.includes(M)) mins.push(M);
      return `<label class="${cls}">${esc(lab)}<span class="hora12" data-k="${k}" data-t="time"><select aria-label="Hora">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((x) => `<option ${x === h ? 'selected' : ''}>${x}</option>`).join('')}</select><b>:</b><select aria-label="Minutos">${mins.map((x) => `<option ${x === M ? 'selected' : ''}>${x}</option>`).join('')}</select><select aria-label="am o pm"><option value="am" ${ap === 'am' ? 'selected' : ''}>am</option><option value="pm" ${ap === 'pm' ? 'selected' : ''}>pm</option></select></span>${hint}</label>`; }
    if (t === 'dias') return `<div class="full"><label>${esc(lab)}</label><div class="chk" data-k="${k}" data-t="dias">${DIAS.map(([a, b]) => `<label class="ck"><input type="checkbox" value="${a}" ${(v || []).includes(a) ? 'checked' : ''}>${esc(b)}</label>`).join('')}</div>${hint}</div>`;
    if (t === 'sedes') { const opts = [...data.sedes.map((s) => [s.id, s.nombre])]; return `<div class="full"><label>${esc(lab)}</label><div class="chk" data-k="${k}" data-t="sedes">${opts.map(([a, b]) => `<label class="ck"><input type="checkbox" value="${a}" ${(v || []).includes(a) ? 'checked' : ''}>${esc(b)}</label>`).join('')}</div></div>`; }
    if (t === 'media' || t === 'medias') {
      const list = t === 'media' ? (v ? [v] : []) : v || [];
      return `<div class="full"><label>${esc(lab)}</label><div class="drop" data-multi="${t === 'medias' ? 1 : ''}"><input type="file" accept="${o.accept || 'image/*'}" ${t === 'medias' ? 'multiple' : ''}><input type="hidden" data-k="${k}" data-t="${t}" value="${esc(JSON.stringify(list))}">
        <div>📤 Toca o arrastra ${t === 'medias' ? 'tus archivos' : 'un archivo'} aquí</div>${hint}<div class="pv">${(await Promise.all(list.map(thumb))).join('')}</div></div>
        ${list.length ? `<button type="button" class="btn btn-g btn-sm" data-clear style="margin-top:6px">Quitar ${t === 'medias' ? 'todas' : ''}</button>` : ''}</div>`;
    }
    return `<label class="${cls}">${esc(lab)}<input type="${t === 'num' ? 'number' : t}" ${t === 'num' ? 'step="any"' : ''} data-k="${k}" data-t="${t}" value="${esc(v)}" maxlength="${o.max || 200}" ${o.req ? 'required' : ''} ${dis}>${hint}</label>`;
  }
  const form = async (obj, fields, id = 'f') => `<form class="form" id="${id}">${(await Promise.all(fields.map((f) => field(obj, f)))).join('')}</form>`;
  function collect(fm, obj) {
    $$('[data-k]', fm).forEach((el) => {
      if (el.disabled) return;
      const k = el.dataset.k, t = el.dataset.t; let v;
      if (t === 'bool') v = el.checked;
      else if (t === 'num') v = el.value === '' ? '' : +el.value;
      else if (t === 'lines') v = el.value.split('\n').map((s) => s.trim()).filter(Boolean);
      else if (t === 'rows') { const cols = el.dataset.cols; v = el.value.split('\n').filter((s) => s.trim()).map((l) => { const p = l.split('|').map((s) => s.trim()); return cols ? Object.fromEntries(cols.split(',').map((c, i) => [c, p[i] || ''])) : p; }); }
      else if (t === 'time') { const [a, b, c] = $$('select', el).map((x) => x.value); let n = (+a) % 12; if (c === 'pm') n += 12; v = String(n).padStart(2, '0') + ':' + b; }
      else if (t === 'sedes' || t === 'dias') v = $$('input:checked', el).map((i) => i.value);
      else if (t === 'media') v = JSON.parse(el.value)[0] || '';
      else if (t === 'medias') v = JSON.parse(el.value);
      else v = el.value.trim();
      setP(obj, k, v);
    });
    return obj;
  }
  document.addEventListener('change', async (e) => {
    const el = e.target; if (!(el.dataset && (el.dataset.urol || el.dataset.used)) || !B()) return;
    const tr = el.closest('tr'), id = el.dataset.urol || el.dataset.used, rol = $('[data-urol]', tr).value, sd = $('[data-used]', tr).value, nombre = $('b', tr).textContent;
    el.disabled = true;
    try { const { error } = await B().sb.rpc('gestor_actualizar_usuario', { p_user: id, p_nombre: nombre, p_rol: rol, p_sede: sd }); if (error) throw error; log(`cambió los permisos de ${nombre} (${rolLabel[rol]} · ${sedeName(sd)})`); toast('Permisos guardados ✓'); }
    catch (ex) { toast(ex.message || 'No se pudo guardar'); go(view); }
    el.disabled = false;
  });
  document.addEventListener('change', async (e) => {
    const inp = e.target; if (inp.type !== 'file') return;
    const drop = inp.closest('.drop'), hid = $('input[type=hidden]', drop);
    let list = drop.dataset.multi ? JSON.parse(hid.value) : [];
    drop.style.opacity = '.6';
    try { for (const f of [...inp.files].slice(0, 30)) { list.push(await upload(f)); if (!drop.dataset.multi) break; } }
    catch (er) { toast(er.message); }
    drop.style.opacity = ''; hid.value = JSON.stringify(list);
    $('.pv', drop).innerHTML = (await Promise.all(list.map(thumb))).join('');
  });

  // ---------- Sesión y seguridad ----------
  const lockGet = () => { try { return JSON.parse(localStorage.getItem('ss-lock') || '{}'); } catch (_) { return {}; } };
  const lockSet = (o) => { try { localStorage.setItem('ss-lock', JSON.stringify(o)); } catch (_) {} };
  const asMe = (perfil, email) => ({ id: perfil.id, nombre: perfil.nombre || 'Usuario', email, rol: perfil.rol === 'gestor' ? 'admin' : perfil.rol === 'supervisor' ? 'recepcion' : perfil.rol, sede: perfil.sede || 'todas', gestor: perfil.rol === 'gestor', debeCambiar: false });
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const em = $('#em').value.trim().toLowerCase(), pw = $('#pw').value, err = $('#err');
    const fail = (m) => { err.textContent = m; err.hidden = false; };
    $('#lbtn').disabled = true;
    if (B()) {                                        // nube: login con Supabase Auth
      try {
        const perfil = await B().auth.entrar(em, pw);
        if (!perfil || !perfil.activo) throw new Error('Tu cuenta no tiene acceso o está desactivada.');
        me = asMe(perfil, em); data = await SS.load(); data.actividad = data.actividad || [];
        $('#pw').value = ''; err.hidden = true; start(); log('entró al panel');
      } catch (ex) {
        const m = (ex.message || '').toLowerCase();
        fail(m.includes('invalid login') ? 'Correo o contraseña incorrectos.' : m.includes('rate') ? 'Demasiados intentos. Espera un momento.' : (ex.message || 'No se pudo entrar.'));
      }
      $('#lbtn').disabled = false; return;
    }
    const L = lockGet(), l = L[em] || { n: 0, until: 0 };
    if (l.until > Date.now()) { $('#lbtn').disabled = false; return fail(`Demasiados intentos. Intenta en ${Math.ceil((l.until - Date.now()) / 60000)} min.`); }
    data = await SS.load();
    const u = data.usuarios.find((x) => x.email.toLowerCase() === em);
    const ok = u && (await SS.checkPass(u, pw));
    await new Promise((r) => setTimeout(r, 450)); // frena ataques de fuerza bruta
    $('#lbtn').disabled = false;
    if (!ok) { l.n++; if (l.n >= MAX_TRY) { l.until = Date.now() + LOCK_MIN * 60000; l.n = 0; } L[em] = l; lockSet(L); return fail(l.until > Date.now() ? `Cuenta bloqueada ${LOCK_MIN} min por seguridad.` : `Correo o contraseña incorrectos. Te quedan ${MAX_TRY - l.n} intentos.`); }
    if (!u.activo) return fail('Tu cuenta está desactivada. Habla con el administrador.');
    delete L[em]; lockSet(L);
    me = u; sessionStorage.setItem('ss-ses', JSON.stringify({ id: u.id, t: Date.now() }));
    $('#pw').value = ''; err.hidden = true; start();
  });
  // Xyro Apps (lo activa XyroStudio): entra con un clic usando un pase de un solo uso.
  async function abrirXyroApps() {
    const base = 'https://xyrostudio.net/app/?s=' + encodeURIComponent((B() && B().sitio) || 'santos-strength') + '&e=' + encodeURIComponent(me.email || '');
    const w = window.open('about:blank', '_blank');
    let url = base;
    try { if (B()) { const { data: c } = await B().sb.rpc('xa_pase'); if (c) url += '#xa=' + c; } } catch (_) {}
    if (w) { try { w.opener = null; } catch (_) {} w.location.href = url; } else location.href = url;
    log('abrió Xyro Apps');
  }
  async function logout(msg) { return location.replace('../'); // la sesión es la de Xyro Apps: aquí nunca se cierra
    if (B()) { try { await B().auth.salir(); } catch (_) {} } sessionStorage.removeItem('ss-ses'); me = null; $('#app').style.display = 'none'; $('#login').style.display = ''; if (msg && $('#err')) { $('#err').textContent = msg; $('#err').hidden = false; } }
  // Recuperación de contraseña por correo (solo en modo nube).
  const forgotBtn = $('#forgotLink');
  if (forgotBtn) { if (!B()) forgotBtn.hidden = true; else { forgotBtn.addEventListener('click', () => { const fb = $('#forgotBox'); fb.hidden = !fb.hidden; $('#err').hidden = true; $('#okm').hidden = true; });
  const fs = $('#forgotSend'); if (fs) fs.addEventListener('click', () => { const em = $('#em').value.trim(); fs.href = 'https://wa.me/51936449066?text=' + encodeURIComponent('Hola, soy administrador del Panel Santos y olvidé mi contraseña.' + (em ? ' Mi correo de acceso es: ' + em : '')); });
  } }
  if (B()) B().sb.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY') { (async () => { try { const p = await B().auth.actual(); if (p) { const { data: au } = await B().sb.auth.getUser(); me = asMe(p, au.user?.email || ''); data = await SS.load(); data.actividad = data.actividad || []; start(); go('cuenta'); toast('Crea tu nueva contraseña'); } } catch (_) {} })(); } });
  let idleT; const bump = () => { try { sessionStorage.setItem('ss-ses', JSON.stringify({ id: me.id, t: Date.now() })); } catch (_) {} clearTimeout(idleT);  };
  ['click', 'keydown', 'scroll', 'touchstart'].forEach((ev) => addEventListener(ev, () => me && bump(), { passive: true }));

  // ---------- Navegación ----------
  const NAV = [
    ['General', [['resumen', '📊', 'Resumen', 'all']]],
    ['Página web', [['contenido', '🎨', 'Contenido de inicio', 'admin'], ['planes', '💳', 'Planes y precios', 'admin'], ['sedes', '📍', 'Sedes', 'admin']]],
    ['Publicar', [['promos', '📣', 'Promos y eventos', 'admin,recepcion'], ['galeria', '🎬', 'Galería', 'admin,recepcion'], ['clases', '🗓️', 'Horario de clases', 'admin,recepcion'], ['nutricion', '🥗', 'Asesoría nutricional', 'admin,recepcion'], ['coaches', '🏋️', 'Entrenadores', 'admin'], ['cafetin', '🥤', 'Cafetín', 'admin,cafetin']]],
    ['Registro', [['actividad', '🕑', 'Actividad', 'admin'], ['reclamos', '📕', 'Libro de reclamaciones', 'admin']]],
    ['Ayuda', [['guia', '📘', 'Guía de uso', 'all']]]
  ];
  const can = (r) => r === 'all' || r.split(',').includes(me.rol);
  const allowed = () => NAV.flatMap(([, it]) => it).filter((i) => can(i[3])).map((i) => i[0]);
  function side() {
    const pend = isAdmin() ? data.publicaciones.filter((p) => p.estado === 'pendiente').length + data.galeria.filter((g) => g.estado === 'pendiente').length : 0;
    $('#side').innerHTML = `<div class="brand disp"><img src="${esc(window.SS_LOGO || '../../img/marca/logo-apps-app.svg')}" alt="" style="object-fit:contain"><span>Mi <b>web</b></span></div>` +
      NAV.map(([g, it]) => { const v = it.filter((i) => can(i[3])); return v.length ? `<div class="grp">${g}</div>` + v.map(([id, ic, n]) => `<button class="nv ${id === view ? 'on' : ''}" data-v="${id}">${ic} ${n}${id === 'resumen' && pend ? `<span class="ct">${pend}</span>` : ''}</button>`).join('') : ''; }).join('') +
      `<a class="nv" href="../">← Volver a Xyro Apps</a>${window.SS_WEB ? `<a class="nv" href="${esc(window.SS_WEB)}" target="_blank" rel="noopener">` : '<a class="nv" hidden>'}🌐 Ver página web</a>
      <div class="me"><b>${esc(me.nombre)}</b><small>${esc(me.gestor ? 'Gestor (agencia)' : rolLabel[me.rol])} · ${esc(sedeName(me.sede))}</small></div>`;
  }
  async function go(v) {
    if (me.debeCambiar) v = 'cuenta';
    else if (!allowed().includes(v)) v = 'resumen';
    if (v !== view) { editing = null; gpage = 1; }
    view = v; side(); $('#side').classList.remove('open');
    $('#topActs').innerHTML = '';
    $('#view').innerHTML = await V[v]();
    scrollTo(0, 0);
  }
  function start() {
    $('#login').style.display = 'none'; $('#app').style.display = 'grid'; bump();
    go(me.debeCambiar ? 'cuenta' : 'resumen');
  }

  // ---------- CRUD genérico ----------
  // def: { key, titulo, campos(item), nuevo(), card(item), filtro(item), puede(item), antesGuardar(item), etiqueta }
  async function crudList(def) {
    const items = getP(data, def.key).filter(def.filtro || (() => true));
    if (editing) {
      const it = editing === 'new' ? def.nuevo() : structuredClone(items.find((x) => x.id === editing) || def.nuevo());
      return `<div class="panel"><h3>${editing === 'new' ? (def.fem ? 'Nueva' : 'Nuevo') : 'Editar'} ${esc(def.etiqueta)}</h3><p class="d">Los cambios se publican en la web al guardar.</p>${await form(it, def.campos(it))}
        <div style="display:flex;gap:8px;margin-top:18px;flex-wrap:wrap"><button class="btn btn-y" data-save="${it.id}">Guardar</button><button class="btn btn-g" data-cancel>Cancelar</button>${editing !== 'new' ? `<button class="btn btn-bad" data-del="${it.id}" style="margin-left:auto">Eliminar</button>` : ''}</div></div>`;
    }
    $('#topActs').innerHTML = `<button class="btn btn-y" data-new>＋ Agregar ${esc(def.etiqueta)}</button>`;
    let list = items; const per = def.paginar ? 24 : 1e9;
    const shown = list.slice(0, per * gpage);
    return (def.intro || '') + `<div class="cards">${(await Promise.all(shown.map(async (x) => `<div class="card"><div class="im">${await thumb(def.img(x)) || '📷'}${def.estado && x.estado !== 'publicado' ? `<span class="st ${x.estado}">${x.estado}</span>` : ''}</div>
      <div class="b"><b>${esc(def.nombre(x))}</b><small>${esc(def.sub(x))}</small></div>
      <div class="a">${!def.puede || def.puede(x) ? `<button class="btn btn-g btn-sm" data-edit="${x.id}">Editar</button>` : ''}${isAdmin() && x.estado === 'pendiente' ? `<button class="btn btn-ok btn-sm" data-ok="${x.id}">Aprobar</button>` : ''}${def.extra ? def.extra(x) : ''}</div></div>`))).join('') || '<p class="d" style="color:var(--mu)">Aún no hay nada. Usa el botón «Agregar».</p>'}</div>
      ${list.length > shown.length ? `<div class="pager"><button class="btn btn-g" data-more>Ver más (${list.length - shown.length})</button></div>` : ''}`;
  }
  let DEF = null;
  const nuevoEstado = () => (data.config.aprobacion && !isAdmin() ? 'pendiente' : 'publicado');
  const sedeOpts = (todas = true) => { const s = mySede(); if (s && !isAdmin()) return [[s, sedeName(s)]]; return [...(todas ? [['todas', 'Todas las sedes']] : []), ...data.sedes.map((x) => [x.id, x.nombre])]; };
  const DEFS = {
    promos: { key: 'publicaciones', etiqueta: 'promo o evento', estado: true,
      filtro: () => true,                                   // recepción ve y edita promos de todas las sedes
      puede: () => isAdmin() || me.rol === 'recepcion' || !mySede(),
      nuevo: () => ({ id: SS.uid(), tipo: 'Promo', titulo: '', descripcion: '', sede: mySede() || 'todas', media: '', mediaTipo: 'image', inicio: SS.today(), fin: SS.today(15), estado: nuevoEstado(), autor: me.nombre, creado: Date.now() }),
      campos: () => [['tipo', 'Tipo', 'select', { opts: [['Promo', 'Promoción'], ['Evento', 'Evento'], ['Aviso', 'Aviso']] }], ['sede', 'Sede', 'select', { opts: [['todas', 'Todas las sedes'], ...data.sedes.map((x) => [x.id, x.nombre])] }], ['titulo', 'Título', 'text', { full: 1, req: 1, max: 80 }], ['descripcion', 'Descripción', 'area'], ['inicio', 'Desde', 'date'], ['fin', 'Hasta', 'date', { hint: 'Se oculta sola cuando vence.' }], ['media', 'Foto o video', 'media', { accept: 'image/*,video/*' }]],
      img: (p) => p.media, nombre: (p) => p.titulo, sub: (p) => `${p.tipo} · ${sedeName(p.sede)} · hasta ${p.fin || '—'}${p.fin && p.fin < SS.today() ? ' (vencido)' : ''}`,
      antes: (p) => { p.mediaTipo = isVid(p.media) ? 'video' : 'image'; } },
    galeria: { key: 'galeria', etiqueta: 'foto o video', fem: true, estado: true, paginar: true,
      filtro: () => true,                                   // recepción ve y edita la galería de todas las sedes
      puede: () => isAdmin() || me.rol === 'recepcion' || !mySede(),
      nuevo: () => ({ id: SS.uid(), media: '', poster: '', mediaTipo: 'image', sede: mySede() || 'todas', categoria: 'Entrenamiento', titulo: '', estado: nuevoEstado(), destacado: false }),
      campos: () => [['media', 'Archivo', 'media', { accept: 'image/*,video/*', hint: 'Videos verticales (9:16) se ven mejor. Las fotos se optimizan solas.' }], ['titulo', 'Título corto', 'text', { max: 60 }], ['categoria', 'Categoría', 'text', { hint: 'Ej.: Entrenamiento, Humor, Eventos, Promos, Sedes, Tips' }], ['sede', 'Sede', 'select', { opts: [['todas', 'Todas las sedes'], ...data.sedes.map((x) => [x.id, x.nombre])] }], ['destacado', 'Mostrar en la portada (solo videos)', 'bool']],
      img: (g) => g.mediaTipo === 'video' ? g.poster || g.media : g.media, nombre: (g) => g.titulo || '(sin título)', sub: (g) => `${g.mediaTipo === 'video' ? '🎬 Video' : '📷 Foto'} · ${g.categoria || 'General'} · ${sedeName(g.sede)}${g.destacado ? ' · ⭐ portada' : ''}`,
      antes: (g) => { if (!g.media) throw new Error('Sube un archivo'); g.mediaTipo = isVid(g.media) ? 'video' : 'image'; if (posters[g.media]) g.poster = posters[g.media]; if (g.mediaTipo === 'image') g.poster = ''; } },
    clases: { key: 'clases', etiqueta: 'clase', fem: true,
      filtro: () => true,
      puede: () => isAdmin() || me.rol === 'recepcion' || !mySede(),
      nuevo: () => ({ id: SS.uid(), nombre: '', tipo: 'Funcional', coach: '', profe: '', sede: mySede() || data.sedes[0]?.id || 'todas', dias: ['lun', 'mie', 'vie'], hora: '07:00', duracion: 60, nota: '', activo: true }),
      campos: () => [['nombre', 'Nombre de la clase', 'text', { req: 1, max: 60, hint: 'Ej.: Funcional, Baile, Crossfit, Zumba, Spinning' }], ['tipo', 'Tipo', 'text', { max: 30, hint: 'Sirve para filtrar en la web. Ej.: Funcional, Baile, Crossfit, Cardio' }],
        ['sede', 'Sede', 'select', { opts: [['todas', 'Todas las sedes'], ...data.sedes.map((x) => [x.id, x.nombre])] }], ['coach', 'Profesor o profesora (de Entrenadores)', 'select', { opts: [['', '— Otro / por definir —'], ...data.entrenadores.map((c) => [c.id, c.nombre])] }],
        ['profe', 'Otro profesor o profesora (si no está en Entrenadores)', 'text', { max: 60 }], ['profeFoto', 'Foto del profesor o profesora', 'media', { hint: 'Opcional. Si eliges a alguien de Entrenadores, se usa su foto automáticamente.' }], ['dias', 'Días', 'dias'], ['hora', 'Hora de inicio', 'time'], ['duracion', 'Duración (minutos)', 'num'],
        ['nota', 'Nota para los alumnos', 'text', { full: 1, max: 120, hint: 'Opcional. Ej.: Cupos limitados, trae toalla.' }], ['activo', 'Mostrar en la web', 'bool']],
      img: (k) => k.profeFoto || (data.entrenadores.find((c) => c.id === k.coach) || {}).foto || '', nombre: (k) => `${k.nombre} · ${h12(k.hora)}`,
      sub: (k) => `${(k.dias || []).map((d) => (DIAS.find((x) => x[0] === d) || [, d])[1].slice(0, 3)).join(' ')} · ${sedeName(k.sede)} · ${(data.entrenadores.find((c) => c.id === k.coach) || {}).nombre || k.profe || 'Profesor por definir'}${k.activo === false ? ' · oculta' : ''}`,
      antes: (k) => { if (!(k.dias || []).length) throw new Error('Marca al menos un día'); if (!/^\d{2}:\d{2}$/.test(k.hora || '')) throw new Error('Pon la hora de inicio'); k.duracion = +k.duracion || 60; } },
    nutricion: { key: 'nutricion', etiqueta: 'horario', fem: false,
      filtro: () => true,
      puede: () => isAdmin() || me.rol === 'recepcion' || !mySede(),
      nuevo: () => ({ id: SS.uid(), nutri: (data.nutricion || [])[0]?.nutri || '', foto: (data.nutricion || [])[0]?.foto || '', sede: mySede() || data.sedes[0]?.id || 'todas', dias: ['lun', 'mie', 'vie'], desde: '08:00', hasta: '12:00', cita: 30, modalidad: 'Presencial', nota: '', activo: true }),
      campos: () => [['nutri', 'Nutricionista', 'text', { req: 1, max: 60, hint: 'Ej.: Lic. Carla Rojas' }], ['sede', 'Sede', 'select', { opts: [['todas', 'Todas las sedes'], ...data.sedes.map((x) => [x.id, x.nombre])] }],
        ['dias', 'Días que atiende', 'dias'], ['desde', 'Desde', 'time'], ['hasta', 'Hasta', 'time'],
        ['cita', 'Duración de cada cita', 'select', { opts: [['20', '20 minutos'], ['30', '30 minutos'], ['45', '45 minutos'], ['60', '1 hora'], ['0', 'Sin turnos (solo mostrar el rango)']] }],
        ['modalidad', 'Modalidad', 'select', { opts: [['Presencial', 'Presencial'], ['Virtual', 'Virtual (videollamada)'], ['Presencial o virtual', 'Presencial o virtual']] }],
        ['foto', 'Foto de la nutricionista', 'media', { hint: 'Opcional. Da confianza ver a quién te atiende.' }],
        ['nota', 'Nota', 'text', { full: 1, max: 120, hint: 'Opcional. Ej.: Ven en ayunas, trae tu última evaluación.' }], ['activo', 'Mostrar en la web', 'bool']],
      img: (n) => n.foto || '', nombre: (n) => `${n.nutri} · ${h12(n.desde)} a ${h12(n.hasta)}`,
      sub: (n) => `${(n.dias || []).map((d) => (DIAS.find((x) => x[0] === d) || [, d])[1].slice(0, 3)).join(' ')} · ${sedeName(n.sede)} · ${n.modalidad || 'Presencial'}${n.activo === false ? ' · oculto' : ''}`,
      antes: (n) => { if (!(n.dias || []).length) throw new Error('Marca al menos un día'); if (!(n.desde < n.hasta)) throw new Error('La hora «Hasta» debe ser después de «Desde»'); n.cita = +n.cita || 0; } },
    coaches: { key: 'entrenadores', etiqueta: 'entrenador',
      antes: (c) => { const v = String(c.ig || '').trim(), m = v.match(/instagram\.com\/([A-Za-z0-9._]+)/i), u = (m ? m[1] : v.replace(/^@+/, '').replace(/[/?#].*$/, '')).replace(/[^A-Za-z0-9._]/g, ''); c.ig = u ? '@' + u : ''; },
      nuevo: () => ({ id: SS.uid(), nombre: '', sede: data.sedes[0]?.id, especialidad: '', mensaje: '', bio: '', logros: [], foto: '', pos: 'center', fotos: [], video: '', ig: '' }),
      campos: () => [['nombre', 'Nombre', 'text', { req: 1 }], ['sede', 'Sede', 'select', { opts: sedeOpts(false) }], ['especialidad', 'Especialidad', 'text', { full: 1 }], ['mensaje', 'Frase para los clientes', 'text', { full: 1, max: 140 }], ['bio', 'Presentación', 'area', { rows: 4 }], ['logros', 'Logros y certificaciones', 'lines'], ['foto', 'Foto principal', 'media'], ['fotos', 'Más fotos', 'medias'], ['video', 'Video de presentación', 'media', { accept: 'video/*', hint: 'Video vertical (como reel o TikTok), corto: 30–60 s presentándose.' }], ['ig', 'Instagram (usuario, opcional)', 'text', { max: 60, hint: 'Solo el usuario, ej.: @santosstrength. Si pegas el enlace, lo convertimos solo.' }], ['pos', 'Encuadre de la foto', 'select', { opts: [['center', 'Centro'], ['50% 20%', 'Arriba'], ['50% 80%', 'Abajo'], ['30% 30%', 'Izquierda'], ['70% 30%', 'Derecha']] }]],
      img: (c) => c.foto, nombre: (c) => c.nombre, sub: (c) => `${c.especialidad} · ${sedeName(c.sede)}${c.video ? ' · 🎬' : ''}` },
    cafe: { key: 'cafetin.items', etiqueta: 'producto',
      nuevo: () => ({ id: SS.uid(), nombre: '', categoria: 'Batidos', descripcion: '', precio: '', proteina: '', kcal: '', objetivo: '', sedes: data.sedes.map((s) => s.id), disponible: true, destacado: false, foto: '' }),
      campos: () => [['nombre', 'Nombre', 'text', { req: 1 }], ['categoria', 'Categoría', 'text', { hint: 'Ej.: Batidos, Platos, Snacks, Bebidas' }], ['descripcion', 'Descripción / receta', 'area'], ['precio', 'Precio (S/)', 'num'], ['proteina', 'Proteína (g)', 'num'], ['kcal', 'Calorías (kcal)', 'num'], ['objetivo', 'Ideal para', 'select', { opts: [['', '—'], ['volumen', 'Volumen'], ['definicion', 'Definición']] }], ['sedes', 'Disponible en', 'sedes'], ['disponible', 'Hay stock hoy', 'bool'], ['destacado', 'Destacar', 'bool'], ['foto', 'Foto', 'media']],
      img: (i) => i.foto, nombre: (i) => i.nombre, sub: (i) => `S/ ${i.precio} · ${i.categoria}${i.disponible ? '' : ' · agotado'}`,
      extra: (i) => `<button class="btn btn-sm ${i.disponible ? 'btn-ok' : 'btn-bad'}" data-stock="${i.id}">${i.disponible ? 'Disponible' : 'Agotado'}</button>` },
    combos: { key: 'cafetin.combos', etiqueta: 'combo',
      nuevo: () => ({ id: SS.uid(), nombre: '', incluye: '', precio: '', precioAntes: '', sedes: data.sedes.map((s) => s.id), hasta: SS.today(15), foto: '' }),
      campos: () => [['nombre', 'Nombre del combo', 'text', { req: 1 }], ['incluye', 'Qué incluye', 'text'], ['precio', 'Precio combo (S/)', 'num'], ['precioAntes', 'Precio normal (S/)', 'num'], ['hasta', 'Válido hasta', 'date'], ['sedes', 'Sedes', 'sedes'], ['foto', 'Foto', 'media']],
      img: (k) => k.foto, nombre: (k) => k.nombre, sub: (k) => `S/ ${k.precio} · hasta ${k.hasta || '—'}` },
    sedes: { key: 'sedes', etiqueta: 'sede',
      nuevo: () => ({ id: SS.uid(), nombre: '', distrito: '', whatsapp: '51', cafeWhatsapp: '', cafePedidos: { activo: true, desde: '08:00', hasta: '20:00', diasTxt: 'Lunes a sábado', dom: false }, lat: '', lng: '', maps: '', foto: '', video: '', horario: [['Lunes a sábado', '5:00 am – 11:00 pm'], ['Domingos y feriados', '8:00 am – 9:00 pm']] }),
      campos: () => [['nombre', 'Nombre', 'text', { req: 1 }], ['distrito', 'Distrito / referencia', 'text'], ['whatsapp', 'WhatsApp de recepción', 'tel', { hint: 'Con código de país, ej.: 51987654321' }], ['cafeWhatsapp', 'WhatsApp de la cafetería', 'tel', { hint: 'Para los pedidos del cafetín. Déjalo vacío para usar el de recepción.' }], ['cafePedidos.activo', 'Limitar los pedidos del cafetín a un horario', 'bool'], ['cafePedidos.desde', 'Cafetín atiende desde', 'time'], ['cafePedidos.hasta', 'Cafetín atiende hasta', 'time'], ['cafePedidos.diasTxt', 'Días del cafetín (texto que verá el cliente)', 'text', { hint: 'Ej: Lunes a sábado' }], ['cafePedidos.dom', '¿El cafetín atiende domingos?', 'bool'], ['maps', 'Enlace de Google Maps', 'url'], ['lat', 'Latitud (para el mapa)', 'num', { hint: 'En Google Maps: clic derecho sobre el local → copia los números.' }], ['lng', 'Longitud', 'num'], ['horario', 'Horario', 'rows', { hint: 'Una línea por horario: Días | Horas' }], ['foto', 'Foto de la sede', 'media'], ['video', 'Video «Cómo llegar»', 'select', { opts: [['', '— Ninguno —'], ...data.galeria.filter((g) => g.mediaTipo === 'video').map((g) => [g.id, g.titulo || g.id])], hint: 'Elige un video subido en Galería.' }]],
      img: (s) => s.foto, nombre: (s) => s.nombre, sub: (s) => `${s.distrito} · WhatsApp ${s.whatsapp}`,
      antes: (s) => { s.whatsapp = String(s.whatsapp).replace(/\D/g, ''); if (s.whatsapp.length < 9) throw new Error('Revisa el número de WhatsApp'); s.cafeWhatsapp = String(s.cafeWhatsapp || '').replace(/\D/g, ''); },
      borrar: (s) => { if (data.sedes.length <= 1) throw new Error('Debe quedar al menos una sede'); data.entrenadores.forEach((c) => { if (c.sede === s.id) c.sede = data.sedes.find((x) => x.id !== s.id).id; }); data.usuarios.forEach((u) => { if (u.sede === s.id) u.sede = 'todas'; }); } }
  };

  // ---------- Vistas ----------
  const V = {};
  const title = (t, sub) => { $('#vt').textContent = t; return sub ? `<p class="sub">${esc(sub)}</p>` : ''; };
  V.resumen = async () => {
    const t = SS.today(), act = data.publicaciones.filter(SS.vigente).length, pend = [...data.publicaciones, ...data.galeria].filter((x) => x.estado === 'pendiente');
    const q = [['promos', '📣 Publicar promo o evento'], ['galeria', '🎬 Subir fotos o videos'], ['cafetin', '🥤 Actualizar cafetín'], ['contenido', '🎨 Cambiar textos de inicio'], ['coaches', '🏋️ Editar entrenadores']].filter(([v]) => allowed().includes(v));
    return title('Hola, ' + me.nombre.split(' ')[0], 'Esto es lo que pasa hoy en tu web' + (B() && B().negocio ? ' de ' + B().negocio : '') + '.') + `
      <div class="grid4"><div class="kpi"><b>${act}</b><small>Promos activas</small></div><div class="kpi"><b>${data.galeria.length}</b><small>Fotos y videos</small></div><div class="kpi"><b>${data.entrenadores.length}</b><small>Entrenadores</small></div><div class="kpi"><b>${data.sedes.length}</b><small>Sedes</small></div></div>
      ${pend.length && isAdmin() ? `<div class="info">Tienes ${pend.length} publicación(es) esperando aprobación en Promos o Galería.</div>` : ''}
      <div class="panel"><h3>Acciones rápidas</h3><p class="d">Lo que más se usa, a un toque.</p><div style="display:flex;gap:8px;flex-wrap:wrap">${q.map(([v, n]) => `<button class="btn btn-g" data-v="${v}">${n}</button>`).join('')}</div></div>
      <div class="panel"><h3>Por vencer</h3><p class="d">Promos y combos que terminan en los próximos 5 días.</p>${[...data.publicaciones.filter((p) => p.fin && p.fin >= t && p.fin <= SS.today(5)).map((p) => `📣 ${esc(p.titulo)} — ${p.fin}`), ...data.cafetin.combos.filter((k) => k.hasta && k.hasta >= t && k.hasta <= SS.today(5)).map((k) => `🥤 ${esc(k.nombre)} — ${k.hasta}`)].map((x) => `<div style="padding:.35rem 0">${x}</div>`).join('') || '<small style="color:var(--mu)">Nada por vencer. 👌</small>'}</div>
      ${isAdmin() ? `<div class="panel"><h3>Últimos movimientos</h3>${data.actividad.slice(0, 5).map((a) => `<div style="padding:.3rem 0;font-size:.88rem"><b>${esc(a.quien)}</b> ${esc(a.que)} <small style="color:var(--mu)">· ${new Date(a.t).toLocaleString('es-PE')}</small></div>`).join('')}</div>` : ''}`;
  };
  const crudView = (k, t, sub) => async () => { DEF = DEFS[k]; return title(t, sub) + await crudList(DEFS[k]); };
  V.promos = crudView('promos', 'Promos y eventos', 'Lo que publiques aparece en la web al instante y se oculta solo al vencer.');
  V.galeria = crudView('galeria', 'Galería', 'Todo queda ordenado en la pestaña Galería de la web, sin alargar la página.');
  V.clases = async () => { data.clases = data.clases || []; DEF = DEFS.clases; return title('Horario de clases', 'Funcional, baile, crossfit… Agrega cada clase con su profesor, días y hora. Aparece en la web en la pestaña Clases.') + await crudList(DEFS.clases); };
  V.nutricion = async () => { data.nutricion = data.nutricion || []; DEF = DEFS.nutricion; return title('Asesoría nutricional', 'Pon los días y horas en que atiende la nutricionista en cada sede. En la web la gente elige un turno y separa su cupo por WhatsApp con la sede.') + await crudList(DEFS.nutricion); };
  V.coaches = crudView('coaches', 'Entrenadores', 'Cada entrenador tiene su propia página con fotos y video.');
  V.sedes = crudView('sedes', 'Sedes', 'Agrega, edita o elimina sedes. Cada una tiene su WhatsApp de recepción.');
  let cafeTab = 'cafe';
  V.cafetin = async () => {
    DEF = DEFS[cafeTab];
    const tabs = `<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">${[['cafe', 'Productos'], ['combos', 'Combos'], ['banner', 'Portada del cafetín']].map(([k, n]) => `<button class="btn btn-sm ${k === cafeTab ? 'btn-y' : 'btn-g'}" data-ctab="${k}">${n}</button>`).join('')}</div>`;
    if (cafeTab === 'banner') return title('Cafetín') + tabs + `<div class="panel"><p class="d">El WhatsApp y el horario de pedidos del cafetín se configuran por sede, en <b>Sedes</b> → editar cada sede.</p>${await form(data.cafetin, [['titulo', 'Título', 'text'], ['acento', 'Palabra resaltada', 'text'], ['texto', 'Texto', 'area'], ['imagen', 'Foto de portada', 'media']], 'fb')}<button class="btn btn-y" data-savecfg="fb:cafetin" style="margin-top:16px">Guardar</button></div>`;
    return title('Cafetín', 'Usa «Disponible / Agotado» para actualizar el stock en un toque.') + (editing ? '' : tabs) + await crudList(DEF);
  };
  const TEMAS_UI = [['', 'Normal (sin tema)'], ['navidad', '🎄 Navidad'], ['halloween', '🎃 Halloween'], ['anionuevo', '🎆 Año Nuevo'], ['fiestaspatrias', '🎊 Fiestas Patrias'], ['sanvalentin', '❤️ San Valentín']];
  function temasPermitidosDe(c) {
    if (c.temasPermitidos && c.temasPermitidos.length) return c.temasPermitidos;
    if (c.temaExtra) return ['navidad', 'halloween', 'anionuevo', 'fiestaspatrias', 'sanvalentin'];
    return [];
  }
  async function temaSec(c) {
    const permitidos = temasPermitidosDe(c), cur = c.tema || '';
    const lista = TEMAS_UI.filter(([v]) => v === '' || permitidos.includes(v));
    const opts = lista.map(([v, n]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${n}</option>`).join('');
    const extra = (await Promise.all([['temaTitulo', 'Título de la tarjeta de promo', 'text', { max: 50, hint: 'Ej.: Regálate tu mejor versión. Vacío = título de la temporada.' }], ['temaPromo', 'Tu promoción', 'text', { max: 90, full: 1, hint: 'Ej.: 2×1 en inscripción solo diciembre. Sale en la cinta superior y en la tarjeta.' }], ['temaHasta', 'La promo termina el', 'date', { hint: 'Activa la cuenta regresiva. Vacío = fin de la temporada.' }], ['temaPopup', 'Mostrar tarjeta de promo al entrar', 'bool']].map((f) => field(c.temaPopup === undefined ? { ...c, temaPopup: true } : c, f)))).join('');
    return `<details class="panel"><summary>🎉 Tema de temporada</summary><p class="d">Tu web se viste por temporada: efectos animados (nieve, fuegos artificiales, corazones), cinta con cuenta regresiva y una tarjeta de promo con botón directo a WhatsApp.</p>
      <div id="ctema" class="form">
        <label>Temporada<select data-k="tema">${opts}</select></label>${extra}
      </div>
      <p class="hint" style="margin-top:4px">Déjalo en «Normal» para quitar el tema.</p>
      <button class="btn btn-y" data-savecfg="ctema" style="margin-top:14px">Guardar tema</button></details>`;
  }
  V.contenido = async () => {
    const c = data.config, blk = async (id, t, d, obj, f, open) => `<details class="panel" ${open ? 'open' : ''}><summary>${t}</summary><p class="d">${d}</p>${await form(obj, f, id)}<button class="btn btn-y" data-savecfg="${id}" style="margin-top:16px">Guardar</button></details>`;
    return title('Contenido de inicio', 'Toca cada bloque para editarlo. Los cambios se ven en la web al guardar.') +
      await blk('c1', '🏠 Portada principal', 'Lo primero que ve la gente.', c, [['hero.eyebrow', 'Texto pequeño superior', 'text'], ['hero.l1', 'Línea 1', 'text'], ['hero.l2', 'Línea 2 (resaltada)', 'text'], ['hero.l3', 'Línea 3', 'text'], ['hero.texto', 'Descripción', 'area'], ['hero.imagen', 'Foto de fondo', 'media', { hint: 'Horizontal y de buena calidad.' }]], true) +
      await blk('c2', '📢 Barra animada', 'La franja amarilla que se mueve. Escribe tus mensajes.', c, [['marquee.activo', 'Mostrar barra', 'bool'], ['marquee.mensajes', 'Mensajes', 'lines', { hint: 'Un mensaje por línea. Cortos se ven mejor.' }]]) +
      await blk('c3', '❤️ Visión del gym', 'La sección «Más que un gym».', c, [['vision.eyebrow', 'Texto pequeño', 'text'], ['vision.titulo', 'Título', 'text'], ['vision.acento', 'Palabra resaltada', 'text'], ['vision.texto', 'Texto de la visión', 'area', { rows: 4 }], ['vision.pilares', 'Pilares', 'rows', { cols: 't,d', hint: 'Uno por línea: Título | Descripción' }], ['vision.imagen', 'Foto', 'media']]) +
      await blk('c4', '🔢 Números', 'Las cifras grandes de la portada.', c, [['stats', 'Cifras', 'rows', { cols: 'n,t', hint: 'Una por línea: Número | Texto' }]]) +
      await blk('c5', '🎬 Encabezado de videos', 'El título sobre el carrusel de videos.', c, [['videos.eyebrow', 'Texto pequeño', 'text'], ['videos.titulo', 'Título', 'text'], ['videos.acento', 'Palabra resaltada', 'text'], ['videos.texto', 'Descripción', 'area']]) +
      await blk('c6', '✅ Qué incluye tu plan', 'Beneficios que se muestran en Planes.', c, [['incluye', 'Beneficios', 'rows', { cols: 'i,t,d', rows: 8, hint: 'Uno por línea: Emoji | Título | Descripción' }]]) +
      await blk('c7', '🔗 Redes sociales', 'Enlaces del pie de página.', c, [['redes.instagram', 'Instagram', 'url'], ['redes.tiktok', 'TikTok', 'url'], ['redes.facebook', 'Facebook', 'url']]) +
      await blk('c9', '⚖️ Datos legales', 'Salen en el Libro de Reclamaciones, la política de privacidad y los términos. Son obligatorios para cumplir la ley.', c, [['legal.razon', 'Razón social', 'text', { hint: 'Como figura en SUNAT. Ej.: Santos Strength S.A.C.' }], ['legal.ruc', 'RUC', 'text', { max: 11 }], ['legal.direccion', 'Dirección fiscal', 'text', { full: 1 }], ['legal.email', 'Correo para reclamos y datos personales', 'email']]) +
      await blk('c8', '🛡️ Aprobación', 'Si lo activas, lo que suban recepción y cafetín espera tu visto bueno antes de salir.', c, [['aprobacion', 'Revisar publicaciones antes de mostrarlas', 'bool']]) +
      (temasPermitidosDe(c).length ? await temaSec(c) : '');
  };
  V.planes = async () => title('Planes y precios', 'Para un descuento por evento, llena «Precio evento» y su fecha final. Al vencer vuelve al precio normal.') +
    (await Promise.all(data.planes.map(async (p, i) => `<div class="panel"><h3>${esc(p.nombre)}</h3>${await form(p, [['nombre', 'Nombre', 'text'], ['meses', 'Meses', 'num'], ['precio', 'Precio normal (S/)', 'num'], ['destacado', 'Recomendado', 'bool'], ['precioEvento', 'Precio evento (S/)', 'num'], ['eventoTexto', 'Nombre del evento', 'text', { hint: 'Ej.: Black Friday' }], ['eventoHasta', 'Evento hasta', 'date']], 'pl' + i)}<div style="display:flex;gap:8px;margin-top:14px"><button class="btn btn-y" data-saveplan="${i}">Guardar</button><button class="btn btn-bad btn-sm" data-delplan="${i}" style="margin-left:auto">Eliminar plan</button></div></div>`))).join('') +
    `<button class="btn btn-g" data-addplan style="margin-bottom:16px">＋ Agregar plan</button><div class="panel"><h3>Pase diario y nota</h3>${await form(data, [['pase.socio', 'Pase diario socio (S/)', 'num'], ['pase.noSocio', 'Pase diario no socio (S/)', 'num'], ['notaPlanes', 'Nota bajo los planes', 'text', { full: 1 }]], 'pp')}<button class="btn btn-y" data-savecfg="pp:root" style="margin-top:14px">Guardar</button></div>`;
  let claveNueva = null;
  const ROLES = [['admin', 'Administrador'], ['recepcion', 'Recepción'], ['cafetin', 'Cafetín']];
  const genClave = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789', r = crypto.getRandomValues(new Uint32Array(10)); return 'Ss-' + [...r].map((n) => a[n % a.length]).join(''); };
  V.usuarios = async () => {
    const cloud = !!B();
    if (!cloud) {
      $('#topActs').innerHTML = '<button class="btn btn-y" data-newuser>＋ Nuevo usuario</button>';
      return title('Usuarios', 'Las cuentas del equipo para entrar a este panel.') +
      `<div id="nu"></div><div class="panel tbl"><table><tr><th>Nombre</th><th>Rol</th><th>Sede</th><th>Estado</th><th></th></tr>${(data.usuarios || []).map((u) => `<tr><td><b>${esc(u.nombre)}</b>${u.email ? `<br><small style="color:var(--mu)">${esc(u.email)}</small>` : ''}</td><td><span class="role ${u.rol}">${esc(rolLabel[u.rol] || u.rol)}</span></td><td>${esc(sedeName(u.sede))}</td><td>${u.activo ? '<span class="st publicado">Activo</span>' : '<span class="st bloqueado">Bloqueado</span>'}${u.debeCambiar ? '<br><small style="color:var(--mu)">Clave temporal</small>' : ''}</td>
        <td style="white-space:nowrap">${u.id === me.id ? '<small style="color:var(--mu)">Tú</small>' : `<button class="btn btn-g btn-sm" data-ureset="${u.id}">Nueva clave</button> <button class="btn btn-g btn-sm" data-utog="${u.id}">${u.activo ? 'Bloquear' : 'Activar'}</button> <button class="btn btn-bad btn-sm" data-udel="${u.id}">✕</button>`}</td></tr>`).join('')}</table></div>`;
    }
    const { data: us, error } = await B().sb.rpc('gestor_listar_usuarios', { p_slug: B().sitio });
    if (error) return title('Usuarios') + `<div class="info">⚙️ La gestión de cuentas aún no está activa. Avísale a tu proveedor (WhyHunter).</div>`;
    const sedeOpts2 = [['todas', 'Todas las sedes'], ...data.sedes.map((x) => [x.id, x.nombre])];
    const sel = (opts, v, attr) => `<select ${attr}>${opts.map(([a, b]) => `<option value="${esc(a)}" ${a === v ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>`;
    let box = '';
    if (claveNueva) { const c = claveNueva; claveNueva = null;
      const msg = `Hola ${c.nombre} 👋 Tu acceso al panel de Santos Strength:\nEnlace: ${location.href.split('#')[0]}\nCorreo: ${c.email}\nClave temporal: ${c.pass}\nAl entrar te pedirá crear tu propia contraseña.`;
      box = `<div class="info clavebox">🔑 <b>${c.nuevo ? 'Cuenta creada' : 'Clave reiniciada'}</b> para <b>${esc(c.nombre)}</b> (${esc(c.email)}). Clave temporal: <code>${esc(c.pass)}</code>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn btn-y btn-sm" data-ucopy="${esc(c.pass)}">Copiar clave</button><button class="btn btn-g btn-sm" data-ucopy="${esc(msg)}">Copiar mensaje para enviar</button></div>
        <small style="color:var(--mu)">Se muestra una sola vez. Envíala por privado.</small></div>`; }
    const rows = (us || []).map((u) => { const yo = u.id === me.id; return `<tr><td><b>${esc(u.nombre)}</b><br><small style="color:var(--mu)">${esc(u.email)}</small></td>
      <td>${yo ? `<span class="role ${u.rol}">${esc(rolLabel[u.rol] || u.rol)}</span>` : sel(ROLES, u.rol, `data-urol="${u.id}" aria-label="Rol"`)}</td>
      <td>${yo ? esc(sedeName(u.sede)) : sel(sedeOpts2, u.sede, `data-used="${u.id}" aria-label="Sede"`)}</td>
      <td>${u.activo ? '<span class="st publicado">Activo</span>' : '<span class="st bloqueado">Bloqueado</span>'}${u.debe_cambiar ? '<br><small style="color:var(--mu)">Clave temporal</small>' : ''}<br><small style="color:var(--mu)">${u.ultimo_ingreso ? 'Entró ' + new Date(u.ultimo_ingreso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }) : 'Nunca entró'}</small></td>
      <td style="white-space:nowrap">${yo ? '<small style="color:var(--mu)">Tú</small>' : `<button class="btn btn-g btn-sm" data-crest="${u.id}" data-n="${esc(u.nombre)}" data-e="${esc(u.email)}">🔑 Nueva clave</button> <button class="btn btn-g btn-sm" data-cact="${u.id}" data-on="${u.activo ? 0 : 1}" data-n="${esc(u.nombre)}">${u.activo ? '🔒 Bloquear' : '✅ Activar'}</button> <button class="btn btn-bad btn-sm" data-cdel="${u.id}" data-n="${esc(u.nombre)}">✕</button>`}</td></tr>`; }).join('');
    return title('Usuarios', 'Crea las cuentas de tu equipo, cambia sus permisos y ayúdalos si olvidan su clave.') + box +
      `<div class="panel tbl"><table><tr><th>Persona</th><th>Rol (permisos)</th><th>Sede</th><th>Estado</th><th></th></tr>${rows || '<tr><td colspan="5">Aún no hay cuentas.</td></tr>'}</table>
        <p class="d" style="margin-top:10px">Cambia el rol o la sede en la lista y se guarda solo. <b>Administrador</b>: todo · <b>Recepción</b>: promos, galería · <b>Cafetín</b>: productos y combos.</p></div>
      <div class="panel"><h3>＋ Nueva cuenta</h3><form class="form" id="cuf"><label>Nombre<input id="cuN" maxlength="60" required placeholder="Ej: Recepción Manchay"></label><label>Correo<input id="cuE" type="email" maxlength="120" required></label>
        <label>Rol${sel(ROLES, 'recepcion', 'id="cuR"')}</label><label>Sede${sel(sedeOpts2, 'todas', 'id="cuS"')}</label></form>
        <button class="btn btn-y" data-cnew style="margin-top:14px">Crear cuenta con clave temporal</button></div>`;
  };
  V.reclamos = async () => {
    const sub = 'Reclamos y quejas que dejan en la web. La ley te da 15 días hábiles para responder.';
    if (!B()) return title('Libro de reclamaciones', sub) + '<div class="panel"><p class="d">Disponible cuando la web está conectada a la nube.</p></div>';
    let list = [], err = false;
    try { const sid = await B().idDe(); const r = await B().sb.from('reclamos').select('*').eq('sitio_id', sid).order('creado', { ascending: false }).limit(200); if (r.error) throw r.error; list = r.data || []; } catch (_) { err = true; }
    if (err) return title('Libro de reclamaciones', sub) + '<div class="panel"><p class="d">Aún no está activado. Pide a soporte que lo active.</p></div>';
    const habiles = (d) => { let n = 0; const x = new Date(d), hoy = new Date(); while (x < hoy) { x.setDate(x.getDate() + 1); const w = x.getDay(); if (w && w !== 6) n++; } return n; };
    const pend = list.filter((r) => r.estado !== 'respondido').length;
    const card = (r) => { const dias = habiles(r.creado), tarde = r.estado !== 'respondido' && dias > 12;
      return `<details class="panel" ${r.estado !== 'respondido' ? 'open' : ''}><summary>${r.tipo === 'queja' ? '🗣️ Queja' : '📕 Reclamo'} N.º ${esc(r.codigo)} · ${esc(r.nombre)} <span class="role ${r.estado === 'respondido' ? 'admin' : 'recepcion'}">${r.estado === 'respondido' ? 'Respondido' : (tarde ? '⚠️ ' : '') + 'Pendiente · ' + dias + ' de 15 días'}</span></summary>
        <p class="d">${new Date(r.creado).toLocaleString('es-PE')} · Sede: ${esc(r.sede || '—')} · ${esc(r.bien)}${r.monto ? ' · S/ ' + esc(r.monto) : ''}</p>
        <p style="font-size:.88rem;line-height:1.55"><b>Cliente:</b> ${esc(r.nombre)} · ${esc(r.documento)} · ${esc(r.telefono)} · ${esc(r.email)}${r.domicilio ? ' · ' + esc(r.domicilio) : ''}${r.menor ? ' · Menor de edad, apoderado: ' + esc(r.apoderado) : ''}<br>
        <b>Qué contrató:</b> ${esc(r.descripcion || '—')}<br><b>Detalle:</b> ${esc(r.detalle)}<br><b>Pedido:</b> ${esc(r.pedido || '—')}</p>
        <label style="display:block;margin-top:10px;font-size:.84rem">Respuesta al cliente<textarea data-recresp="${r.id}" rows="3" style="width:100%;margin-top:6px">${esc(r.respuesta || '')}</textarea></label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn btn-y btn-sm" data-recsave="${r.id}">Guardar respuesta</button>${r.email ? `<a class="btn btn-g btn-sm" href="mailto:${esc(r.email)}?subject=${encodeURIComponent('Respuesta a su ' + r.tipo + ' N.º ' + r.codigo)}">Enviar por correo</a>` : ''}${r.telefono ? `<a class="btn btn-g btn-sm" target="_blank" rel="noopener" href="https://wa.me/51${esc(String(r.telefono).replace(/\D/g, '').slice(-9))}">WhatsApp</a>` : ''}</div></details>`; };
    return title('Libro de reclamaciones', sub) + `<div class="grid4"><div class="kpi"><b>${pend}</b><small>Pendientes</small></div><div class="kpi"><b>${list.length}</b><small>Total</small></div></div>` +
      (list.map(card).join('') || '<div class="panel"><p class="d">No hay reclamos. 🎉</p></div>') +
      '<p class="hint" style="margin-top:10px">Responde por correo o WhatsApp y guarda aquí la respuesta como constancia. Además, cada sede debe tener su libro físico y el aviso visible.</p>';
  };
  V.actividad = async () => {
    let list = data.actividad || [];
    if (B()) { try { const sid = await B().idDe(); const r = await B().sb.from('actividad').select('quien,que,t').eq('sitio_id', sid).order('t', { ascending: false }).limit(150); list = r.data || []; } catch (_) { list = []; } }
    return title('Actividad', 'Quién hizo qué y cuándo.') + `<div class="panel tbl"><table><tr><th>Fecha</th><th>Usuario</th><th>Acción</th></tr>${list.slice(0, 150).map((a) => `<tr><td style="white-space:nowrap">${new Date(a.t).toLocaleString('es-PE')}</td><td>${esc(a.quien)}</td><td>${esc(a.que)}</td></tr>`).join('') || '<tr><td colspan="3">Sin actividad todavía.</td></tr>'}</table></div>`;
  };
  V.cuenta = async () => title('Mi cuenta') + `${me.debeCambiar ? '<div class="info">🔐 Por seguridad, crea tu propia contraseña antes de continuar.</div>' : ''}
    <div class="panel" style="max-width:520px"><h3>Cambiar contraseña</h3><p class="d">Mínimo 8 caracteres, con letras y números. No la compartas con nadie.</p>
    <form class="form" id="pwf" style="grid-template-columns:1fr">${B() ? '' : '<label>Contraseña actual<input type="password" id="p0" autocomplete="current-password" required></label>'}<label>Nueva contraseña<input type="password" id="p1" autocomplete="new-password" required></label><label>Repite la nueva<input type="password" id="p2" autocomplete="new-password" required></label><button class="btn btn-y">Guardar contraseña</button></form></div>
    ${B() ? `<div class="panel" style="max-width:520px"><h3>Acceso</h3><p class="d">Tu acceso es <b>${esc(me.email)}</b>. Si olvidas tu contraseña, usa «¿Olvidaste tu contraseña?» en la pantalla de inicio.</p></div>` : ''}`;
  // Xyros: lo que ya tiene (config.xyros, lo activa XyroStudio) y lo que puede sumar.
  const XYROS = [['webs', 'Xyro Webs', 'Tu web y este panel editable', 'webs'], ['apps', 'Xyro Apps', 'Membresías, cobros automáticos y recordatorios', 'apps'], ['control', 'Xyro Control', 'Caja, inventario del cafetín, asistencia y reportes', 'control'], ['bots', 'Xyro Bots', 'WhatsApp que responde, agenda y vende 24/7', 'bots'], ['edits', 'Xyro Edits', 'Reels y videos con IA para tus redes', 'edits']];
  V.xyros = async () => {
    const act = (data.config && data.config.xyros) || ['webs'];
    const card = ([k, n, d, logo], on) => `<div class="panel" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap"><img src="https://xyrostudio.net/img/marca/logo-${logo}-app.svg" alt="" width="48" height="48" style="border-radius:12px"><div style="flex:1;min-width:180px"><b>${n}</b><p class="d" style="margin:2px 0 0">${d}</p></div>${on ? '<span class="st publicado">✅ Activo</span>' : `<button class="btn btn-y" data-xup="${k}">Lo quiero</button>`}</div>`;
    const falta = XYROS.filter((x) => !act.includes(x[0]));
    return title('Haz crecer tu negocio', 'Suma más herramientas de XyroStudio a tu gimnasio. Toca «Lo quiero» y te contactamos para activarlo.') +
      (falta.length ? falta.map((x) => card(x, false)).join('') : '<div class="info">🎉 Ya tienes todo el ecosistema XyroStudio.</div>') +
      `<h3 style="margin:18px 0 8px;font-size:.95rem">Lo que ya tienes</h3>` + XYROS.filter((x) => act.includes(x[0])).map((x) => card(x, true)).join('');
  };
  V.guia = async () => {
    const G = {
      admin: [['Entra siempre por tu enlace privado', 'No está en la web pública. Guárdalo en favoritos y no lo compartas.'], ['Crea las cuentas del equipo', 'Usuarios → Nuevo usuario. El sistema da una clave temporal; la persona crea la suya al entrar.'], ['Edita la portada', 'Contenido de inicio: textos, barra animada, visión, números, encabezado de videos y redes.'], ['Precios y eventos', 'Planes y precios: para Black Friday u otro evento, pon el precio y la fecha final. Vuelve solo al precio normal.'], ['Sedes', 'Agrega o elimina sedes. Cada una con su WhatsApp, horario, foto y video de cómo llegar.'], ['Entrenadores', 'Cada entrenador tiene su página: foto, más fotos, presentación, logros y video.'], ['Clases y nutrición', 'Horario de clases y Asesoría nutricional: días, horas y profesor. Recepción también puede editarlos.'], ['Libro de reclamaciones', 'Responde cada reclamo antes de 15 días hábiles. El contador te avisa cuánto falta.'], ['Control', 'Si alguien deja el trabajo: Usuarios → Bloquear. En Actividad ves todo lo que se cambió.']],
      recepcion: [['Publica promos y eventos', 'Promos y eventos → Agregar. Ponle foto, fechas y listo: sale en la web al instante.'], ['Se ocultan solas', 'Al pasar la fecha «Hasta», la promo desaparece de la web. No tienes que borrarla.'], ['Sube fotos y videos', 'Galería → Agregar. Se guardan ordenados por categoría y no llenan la página.'], ['Videos para la portada', 'Marca «Mostrar en la portada» para que salga en el carrusel de inicio.'], ['Horarios de clases y nutrición', 'En «Horario de clases» y «Asesoría nutricional» agregas o cambias días y horas. La gente separa su cupo por WhatsApp y te llega a ti.'], ['Responde el WhatsApp', 'Los mensajes de la web llegan al WhatsApp de tu sede.']],
      cafetin: [['Actualiza el stock', 'Cafetín → botón Disponible / Agotado en cada producto.'], ['Nuevo producto', 'Agregar producto: foto, precio, proteína, calorías y en qué sedes hay.'], ['Combos', 'Pestaña Combos: precio combo, precio normal y hasta cuándo vale.'], ['Portada del cafetín', 'Cambia el título, texto y la foto grande del cafetín.']]
    };
    const comun = [['Seguridad', 'Tras 5 intentos fallidos la cuenta se bloquea 5 minutos. La sesión se cierra sola tras 1 hora sin uso.'], ['Fotos', 'Usa fotos con buena luz. El sistema las optimiza para que la web cargue rápido.']];
    return title('Guía de uso', 'Pasos simples para tu rol.') + `<div class="guide">${[...G[me.rol], ...comun].map(([h, p], i) => `<div class="step"><span class="n">${i + 1}</span><div><h4>${esc(h)}</h4><p>${esc(p)}</p></div></div>`).join('')}</div>`;
  };

  // ---------- Acciones ----------
  document.addEventListener('submit', async (e) => {
    if (e.target.id !== 'pwf') return; e.preventDefault();
    const b = $('#p1').value, c = $('#p2').value;
    if (b !== c) return toast('Las contraseñas nuevas no coinciden');
    if (!SS.passOK(b)) return toast('Usa 8+ caracteres con letras y números');
    if (B()) { try { await B().auth.cambiarPass(b); try { await B().sb.rpc('limpiar_debe_cambiar'); } catch (_) {} me.debeCambiar = false; toast('Contraseña actualizada ✓'); return go('resumen'); } catch (ex) { return toast(ex.message || 'No se pudo cambiar'); } }
    const a = $('#p0').value;
    if (!(await SS.checkPass(me, a))) return toast('La contraseña actual no es correcta');
    if (b === a) return toast('La nueva debe ser distinta a la actual');
    await SS.setPass(me, b); me.debeCambiar = false;
    await commit('Contraseña actualizada ✓', 'cambió su contraseña'); go('resumen');
  });
  document.addEventListener('click', async (e) => {
    const el = e.target.closest('button,a'); if (!el || !me) return;
    const d = el.dataset, list = DEF ? getP(data, DEF.key) : [];
    try {
      if (d.v) return go(d.v);
      if (d.xup) { const x = XYROS.find((y) => y[0] === d.xup); log('pidió ' + x[1]); open('https://wa.me/51936449066?text=' + encodeURIComponent(`Hola XyroStudio, quiero sumar ${x[1]} a Santos Strength.`), '_blank', 'noopener'); return toast('Te contactamos pronto ✓'); }
      if ('xapps' in d) return abrirXyroApps();
      if ('logout' in d) return logout();
      if (el.id === 'menuBtn') return $('#side').classList.toggle('open');
      if ('clear' in d) { const w = el.previousElementSibling; $('input[type=hidden]', w).value = '[]'; $('.pv', w).innerHTML = ''; el.remove(); return; }
      if ('new' in d) { editing = 'new'; return go(view); }
      if (d.edit) { editing = d.edit; return go(view); }
      if ('cancel' in d) { editing = null; return go(view); }
      if ('more' in d) { gpage++; return go(view); }
      if (d.ctab) { cafeTab = d.ctab; editing = null; return go(view); }
      if (d.save) {
        const fm = $('#f'); if (!fm.reportValidity()) return;
        const i = list.findIndex((x) => x.id === d.save), it = collect(fm, i >= 0 ? structuredClone(list[i]) : DEF.nuevo());
        it.id = d.save; DEF.antes && DEF.antes(it);
        if (i >= 0) list[i] = it; else list.unshift(it);
        await commit(it.estado === 'pendiente' ? 'Enviado para aprobación' : 'Guardado y publicado ✓', `${i >= 0 ? 'editó' : 'agregó'} ${DEF.etiqueta} «${DEF.nombre(it)}»`);
        editing = null; return go(view);
      }
      if (d.del) {
        const i = list.findIndex((x) => x.id === d.del); if (i < 0) return;
        if (!confirm(`¿Eliminar «${DEF.nombre(list[i])}»? No se puede deshacer.`)) return;
        DEF.borrar && DEF.borrar(list[i]);
        const [x] = list.splice(i, 1);
        await commit('Eliminado', `eliminó ${DEF.etiqueta} «${DEF.nombre(x)}»`); editing = null; return go(view);
      }
      if (d.ok) { const x = list.find((y) => y.id === d.ok); x.estado = 'publicado'; await commit('Aprobado ✓', `aprobó «${DEF.nombre(x)}»`); return go(view); }
      if (d.stock) { const x = list.find((y) => y.id === d.stock); x.disponible = !x.disponible; await commit(x.disponible ? 'Marcado disponible' : 'Marcado agotado', `marcó ${x.nombre} como ${x.disponible ? 'disponible' : 'agotado'}`); return go(view); }
      if (d.savecfg) { const [fid, root] = d.savecfg.split(':'); collect($('#' + fid), root === 'cafetin' ? data.cafetin : root === 'root' ? data : data.config); await commit('Guardado ✓', 'actualizó el contenido de la web'); return; }
      if (d.saveplan) { const p = data.planes[+d.saveplan]; collect($('#pl' + d.saveplan), p); await commit('Plan guardado ✓', `editó el plan ${p.nombre}`); return go(view); }
      if ('addplan' in d) { data.planes.push({ id: SS.uid(), nombre: 'Nuevo plan', meses: 1, precio: 0, destacado: false, precioEvento: '', eventoTexto: '', eventoHasta: '' }); await commit('Plan agregado'); return go(view); }
      if (d.delplan) { const p = data.planes[+d.delplan]; if (!confirm(`¿Eliminar el plan ${p.nombre}?`)) return; data.planes.splice(+d.delplan, 1); await commit('Plan eliminado', `eliminó el plan ${p.nombre}`); return go(view); }
      if ('newuser' in d) {
        $('#nu').innerHTML = `<div class="panel"><h3>Nuevo usuario</h3><form class="form" id="uf"><label>Nombre<input id="un" required maxlength="60"></label><label>Correo<input id="ue" type="email" required></label><label>Rol<select id="ur"><option value="recepcion">Recepción</option><option value="cafetin">Cafetín</option><option value="admin">Administrador</option></select></label><label>Sede<select id="us">${[['todas', 'Todas'], ...data.sedes.map((s) => [s.id, s.nombre])].map(([a, b]) => `<option value="${a}">${esc(b)}</option>`).join('')}</select></label></form><button class="btn btn-y" data-mkuser style="margin-top:14px">Crear cuenta</button></div>`; return;
      }
      if ('mkuser' in d) {
        const fm = $('#uf'); if (!fm.reportValidity()) return;
        const email = $('#ue').value.trim().toLowerCase();
        if (data.usuarios.some((u) => u.email.toLowerCase() === email)) return toast('Ese correo ya existe');
        const u = { id: SS.uid(), nombre: $('#un').value.trim(), email, rol: $('#ur').value, sede: $('#us').value, activo: true, debeCambiar: true }, tp = tempPass();
        await SS.setPass(u, tp); data.usuarios.push(u);
        await commit('', `creó la cuenta de ${u.nombre}`); await go(view);
        $('#nu').innerHTML = `<div class="info">✅ Cuenta creada. Envía estos datos a <b>${esc(u.nombre)}</b> por privado. Solo se muestran una vez:<br>Correo: <b>${esc(email)}</b> · Clave temporal: <b>${esc(tp)}</b></div>`; return;
      }
      if (d.ucopy !== undefined) { try { await navigator.clipboard.writeText(d.ucopy); toast('Copiado ✓'); } catch (_) { toast('Cópialo manualmente'); } return; }
      if ('cnew' in d) { const fm = $('#cuf'); if (!fm.reportValidity()) return; const nombre = $('#cuN').value.trim(), email = $('#cuE').value.trim().toLowerCase(), pass = genClave();
        const { error } = await B().sb.rpc('gestor_crear_usuario', { p_slug: B().sitio, p_email: email, p_pass: pass, p_nombre: nombre, p_rol: $('#cuR').value, p_sede: $('#cuS').value }); if (error) throw error;
        log(`creó la cuenta de ${nombre}`); claveNueva = { nombre, email, pass, nuevo: true }; toast('Cuenta creada ✓'); return go(view); }
      if (d.recsave) { const txt = $(`[data-recresp="${d.recsave}"]`).value.trim(); if (!txt) return toast('Escribe la respuesta');
        const { error } = await B().sb.from('reclamos').update({ respuesta: txt, estado: 'respondido', respondido: new Date().toISOString() }).eq('id', +d.recsave); if (error) throw error;
        log('respondió un reclamo'); toast('Respuesta guardada ✓'); return go(view); }
      if (d.crest) { if (!confirm(`¿Darle una clave nueva a ${d.n}? Se cerrarán sus sesiones abiertas.`)) return; const pass = genClave();
        const { error } = await B().sb.rpc('gestor_reiniciar_clave', { p_user: d.crest, p_pass: pass }); if (error) throw error;
        log(`reinició la clave de ${d.n}`); claveNueva = { nombre: d.n, email: d.e, pass }; toast('Clave reiniciada ✓'); return go(view); }
      if (d.cact) { const on = d.on === '1'; const { error } = await B().sb.rpc('gestor_set_activo', { p_user: d.cact, p_activo: on }); if (error) throw error;
        log(`${on ? 'activó' : 'bloqueó'} la cuenta de ${d.n}`); toast(on ? 'Cuenta activada ✓' : 'Cuenta bloqueada 🔒'); return go(view); }
      if (d.cdel) { if (!confirm(`¿Borrar la cuenta de ${d.n}? Ya no podrá entrar. No se puede deshacer.`)) return;
        const { error } = await B().sb.rpc('gestor_borrar_usuario', { p_user: d.cdel }); if (error) throw error;
        log(`borró la cuenta de ${d.n}`); toast('Cuenta borrada'); return go(view); }
      if (d.ureset) { const u = data.usuarios.find((x) => x.id === d.ureset), tp = tempPass(); if (!confirm(`¿Generar nueva clave para ${u.nombre}?`)) return; await SS.setPass(u, tp); u.debeCambiar = true; await commit('', `reinició la clave de ${u.nombre}`); await go(view); $('#nu').innerHTML = `<div class="info">🔑 Nueva clave temporal de <b>${esc(u.nombre)}</b>: <b>${esc(tp)}</b> (se muestra una sola vez)</div>`; return; }
      if (d.utog) { const u = data.usuarios.find((x) => x.id === d.utog); u.activo = !u.activo; await commit(u.activo ? 'Usuario activado' : 'Usuario bloqueado', `${u.activo ? 'activó' : 'bloqueó'} a ${u.nombre}`); return go(view); }
      if (d.udel) { const i = data.usuarios.findIndex((x) => x.id === d.udel); if (!confirm(`¿Eliminar la cuenta de ${data.usuarios[i].nombre}?`)) return; const [u] = data.usuarios.splice(i, 1); await commit('Cuenta eliminada', `eliminó la cuenta de ${u.nombre}`); return go(view); }
    } catch (er) { toast(er.message || 'Ocurrió un error'); try { B() && B().reportarError && B().reportarError('Panel: ' + (er.message || er), er.stack || ''); } catch (_) {} }
  });

  // Recupera la sesión si sigue activa.
  if (B()) {
    try {
      const perfil = await B().auth.actual();
      if (perfil && perfil.activo) { const { data: au } = await B().sb.auth.getUser(); me = asMe(perfil, au.user?.email || ''); data = await SS.load(); data.actividad = data.actividad || []; start(); }
    } catch (_) {}
    if (!me) location.replace('../' + (B() && B().sitio ? '?s=' + encodeURIComponent(B().sitio) : ''));
  } else {
    try {
      const s = JSON.parse(sessionStorage.getItem('ss-ses') || 'null');
      if (s && Date.now() - s.t < IDLE_MIN * 60000) { const u = data.usuarios.find((x) => x.id === s.id && x.activo); if (u) { me = u; start(); } }
    } catch (_) {}
    addEventListener('storage', async (e) => { if (e.key === 'ss-ping' && me && !editing) { data = await SS.load(); me = data.usuarios.find((u) => u.id === me.id); if (!me || !me.activo) return logout('Tu cuenta fue desactivada.'); } });
  }
})();
