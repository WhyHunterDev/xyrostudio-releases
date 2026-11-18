// Xyro · arranque: rutas por hash, estructura (barra lateral en PC, pestañas en celular), selector de modo y acceso.
import { S, $, $$, esc, I, MODOS, puedeModo, cargarCuenta, cliente, toast, hoja, errDe, ls, vib } from './core.js';

// Pestañas por modo: [ruta, texto, ícono, central]
const NAV = {
  user: [['explorar', 'Explorar', I.explore], ['market', 'Marketplace', I.market], ['escanear', 'Escanear', I.scan, 1], ['billetera', 'Billetera', I.wallet], ['perfil', 'Perfil', I.user]],
  control: [['c-inicio', 'Resumen', I.chart], ['c-pedidos', 'Pedidos', I.orders], ['c-qr', 'QR', I.qr, 1], ['c-boost', 'Boost', I.bolt], ['c-catalogo', 'Catálogo', I.catalog]],
  panel: [['p-inicio', 'Resumen', I.chart], ['p-negocios', 'Negocios', I.shield], ['p-soporte', 'Soporte', I.ticket]],
};
// Ruta → módulo de vista
const VISTA = {
  explorar: 'usuario', market: 'usuario', billetera: 'usuario', perfil: 'usuario', escanear: 'escanear',
  carta: 'compras', pedido: 'compras', pedidos: 'compras',
  'c-inicio': 'control', 'c-pedidos': 'control', 'c-qr': 'control', 'c-boost': 'control', 'c-catalogo': 'control',
  'p-inicio': 'panel', 'p-negocios': 'panel', 'p-soporte': 'panel',
};
const INICIO = { user: 'explorar', control: 'c-inicio', panel: 'p-inicio' };
const modoDe = (r) => r.startsWith('c-') ? 'control' : r.startsWith('p-') ? 'panel' : 'user';
const rutaAct = () => (location.hash.replace(/^#\/?/, '').split('?')[0]) || INICIO[S.modo];

function logo() { return `<div class="logo"><img src="/img/marca/logo-xyrostudio-app.svg" alt="">Xyro</div>`; }
const inicial = () => esc(((S.me && (S.me.display_name || S.me.username)) || '?').trim().charAt(0).toUpperCase());

function pintarMarco(r) {
  const m = modoDe(r), md = MODOS[m], nav = NAV[m];
  $('#top').innerHTML = `${logo()}<button class="modo ${md.c}" id="bModo" aria-label="Cambiar de modo"><i></i><span class="ell">${esc(md.t)}</span>▾</button><span class="sp"></span>
    ${S.demo ? '<span class="pill warn">Demo</span>' : ''}<button class="av" id="bAv" aria-label="Perfil">${inicial()}</button>`;
  $('#tabs').innerHTML = nav.map(([k, t, ic, fab]) => `<a class="tab${fab ? ' fab' : ''}${k === r ? ' on' : ''}" href="#/${k}" aria-label="${t}">${fab ? `<span>${ic}</span>` : ic}${fab ? '' : `<span>${t}</span>`}</a>`).join('');
  $('#side').innerHTML = `${logo()}
    <button class="mopt" id="sModo" style="padding:10px 12px"><span class="sp"><b class="sm">${esc(md.t)}</b><br><span class="mu xs">${esc(md.d)}</span></span>▾</button>
    <div class="lbl">${m === 'user' ? 'MI XYRO' : m === 'control' ? 'MI NEGOCIO' : 'EQUIPO'}</div>
    ${nav.map(([k, t, ic]) => `<a class="nv${k === r ? ' on' : ''}" href="#/${k}">${ic}${t}</a>`).join('')}
    <div class="pie">${S.me ? `<div class="row"><span class="av">${inicial()}</span><span class="sp ell sm b">${esc(S.me.display_name || S.me.username || '')}</span></div>` : ''}
      ${S.demo ? '' : `<button class="nv" id="sOut">${I.out}Salir</button>`}</div>`;
  $('#bModo').onclick = $('#sModo').onclick = elegirModo;
  $('#bAv').onclick = () => { location.hash = '#/perfil'; };
  const so = $('#sOut'); so && (so.onclick = salir);
}

function elegirModo() {
  vib();
  hoja(`<h2>¿Cómo quieres usar Xyro?</h2><p class="mu sm">Una sola cuenta para todo.</p>
    ${Object.entries(MODOS).map(([k, m]) => {
      const ok = puedeModo(k);
      if (!ok && k === 'panel') return '';
      return `<button class="mopt${S.modo === k ? ' on' : ''}" data-m="${k}" ${ok ? '' : 'data-reg="1"'}>
        <span class="ico">${k === 'user' ? I.user : k === 'control' ? I.orders : I.shield}</span>
        <span class="sp"><b>${m.t}</b><br><span class="mu sm">${ok ? m.d : 'Registra tu negocio o servicio gratis'}</span></span></button>`;
    }).join('')}
    <button class="btn l" data-x>Cerrar</button>`, (o, close) => {
    $$('[data-m]', o).forEach((b) => b.onclick = () => {
      close();
      if (b.dataset.reg) { location.href = '/#/entrar'; return; }
      S.modo = b.dataset.m; ls.s('x-modo', S.modo); location.hash = '#/' + INICIO[S.modo];
    });
  });
}

async function salir() { try { await S.sb.auth.signOut(); } catch (_) {} location.replace('/x/'); }

// ---------- acceso (misma cuenta que Mi Xyro) ----------
function pantallaEntrar() {
  $('#shell').classList.add('sin');
  $('#top').innerHTML = ''; $('#tabs').innerHTML = ''; $('#side').innerHTML = '';
  $('#view').innerHTML = `<div class="ent"><div class="card">
    <div class="logo" style="justify-content:center;font-size:22px"><img src="/img/marca/logo-xyrostudio-app.svg" alt="">Xyro</div>
    <h2 style="text-align:center">Entra a tu cuenta</h2>
    <p class="mu sm" style="text-align:center">La misma cuenta de Mi Xyro: compras, puntos y tu negocio en un solo lugar.</p>
    <button class="btn w" id="gG">Seguir con Google</button>
    <form id="fE" class="g"><label>Correo<input type="email" id="eM" autocomplete="email" required></label>
      <label>Clave<input type="password" id="eP" autocomplete="current-password" minlength="6" required></label>
      <div class="msg" id="eE"></div><button class="btn p w">Entrar</button></form>
    <p class="sm mu" style="text-align:center">¿No tienes cuenta? <a href="/#/entrar" class="b">Créala gratis</a> · <a href="?demo=1" class="b">Ver demo</a></p>
  </div></div>`;
  $('#gG').onclick = async () => {
    if (!S.sb) return toast('Sin conexión. Revisa tu internet.');
    const { error } = await S.sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/x/' } });
    if (error) toast(errDe(error));
  };
  $('#fE').onsubmit = async (e) => {
    e.preventDefault(); const m = $('#eE'); m.className = 'msg';
    if (!S.sb) { m.textContent = 'Sin conexión. Revisa tu internet.'; m.className = 'msg on'; return; }
    const { error } = await S.sb.auth.signInWithPassword({ email: $('#eM').value.trim(), password: $('#eP').value });
    if (error) { m.textContent = errDe(error); m.className = 'msg on'; return; }
    location.reload();
  };
}

// ---------- rutas ----------
let limpiar = null;
async function ir() {
  let r = rutaAct();
  if (!VISTA[r]) r = INICIO[S.modo];
  const m = modoDe(r);
  if (!puedeModo(m)) { location.replace('#/' + INICIO.user); return; }
  if (m !== S.modo) { S.modo = m; ls.s('x-modo', m); }
  if (limpiar) { try { limpiar(); } catch (_) {} limpiar = null; }
  pintarMarco(r);
  const v = $('#view');
  v.innerHTML = '<div class="in"><div class="sk" style="height:46px"></div><div class="sk" style="height:220px"></div></div>';
  try {
    const mod = await import(`./v/${VISTA[r]}.js`);
    if (rutaAct() !== r && VISTA[rutaAct()]) return;      // el usuario ya cambió de pestaña
    const box = document.createElement('div'); box.className = 'in';
    v.innerHTML = ''; v.appendChild(box); v.scrollTop = 0;
    limpiar = (await mod.vista(r, box)) || null;
  } catch (e) {
    console.error(e);
    v.innerHTML = `<div class="in"><div class="vacio"><div class="e">⚠️</div><b>No se pudo abrir esta sección</b><span class="mu sm">${esc(errDe(e))}</span><button class="btn" onclick="location.reload()">Reintentar</button></div></div>`;
  }
}

async function arrancar() {
  const q = new URLSearchParams(location.search).get('q');
  if (q) { try { sessionStorage.setItem('x-qr', q); } catch (_) {} history.replaceState(null, '', location.pathname + (S.demo ? '?demo=1' : '') + '#/escanear'); }
  try {
    if (!S.demo) await cliente();
    const ok = await cargarCuenta();
    if (!ok) return pantallaEntrar();
    if (!puedeModo(S.modo)) S.modo = 'user';
  } catch (e) { console.error(e); toast(errDe(e)); if (!S.me) return pantallaEntrar(); }
  addEventListener('hashchange', ir);
  ir();
}

if ('serviceWorker' in navigator && !S.demo && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
  addEventListener('load', () => navigator.serviceWorker.register('/x/sw.js', { scope: '/x/' }).catch(() => {}));
}
arrancar();
