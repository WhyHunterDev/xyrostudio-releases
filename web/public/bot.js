/* Xyro Bots · chat del negocio para su web.
   Uso: <script src="https://xyrostudio.net/bot.js" data-s="slug" data-c="#f5c400" data-n="Nombre" data-sobre=".boton-whatsapp" defer></script>
   Responde con los datos del negocio (horarios, planes, sedes…) vía xyrostudio.net/api/bot. Sin librerías. */
(function () {
  if (window.__xyroBot) return; window.__xyroBot = 1;
  const me = document.currentScript || document.querySelector('script[src*="bot.js"]');
  const ds = (me && me.dataset) || {}, P = new URLSearchParams(location.search);
  const slug = ds.s || P.get('s'); if (!slug) return;
  const col = /^#?[0-9a-f]{6}$/i.test(ds.c || '') ? '#' + ds.c.replace('#', '') : '#f5c400';
  const nom = ds.n || 'nosotros', API = 'https://xyrostudio.net/api/bot', K = 'xyro-bot-' + slug;
  let H = []; try { H = JSON.parse(sessionStorage.getItem(K) || '[]'); } catch (_) {}
  let wa = '', ocupado = false, SD = [];
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const host = document.createElement('div'); host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483000';
  const sh = host.attachShadow({ mode: 'open' });
  sh.innerHTML = `<style>
  *{box-sizing:border-box;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  .b{width:58px;height:58px;border-radius:50%;border:0;background:${col};color:#000;display:grid;place-items:center;cursor:pointer;box-shadow:0 8px 24px #0006;transition:transform .2s}
  .b:hover{transform:scale(1.07)}.b svg{width:28px;height:28px}
  .p{position:absolute;right:0;bottom:70px;width:min(360px,calc(100vw - 32px));height:min(520px,calc(100vh - 110px));background:#0b0b0c;color:#f2f2f2;border:1px solid #262628;border-radius:18px;display:none;flex-direction:column;overflow:hidden;box-shadow:0 18px 50px #000a}
  .p.on{display:flex;animation:in .22s ease}@keyframes in{from{opacity:0;transform:translateY(10px)}}
  .h{padding:12px 14px;border-bottom:1px solid #262628;display:flex;align-items:center;gap:10px}
  .h i{width:10px;height:10px;border-radius:50%;background:#22c55e}.h b{flex:1;font-size:15px}.h button{background:none;border:0;color:#aaa;font-size:20px;cursor:pointer}
  .m{flex:1;overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px}
  .g{max-width:85%;padding:9px 12px;border-radius:14px;font-size:14px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word}
  .bo{background:#1b1b1d;align-self:flex-start;border-bottom-left-radius:4px}.yo{background:${col};color:#000;align-self:flex-end;border-bottom-right-radius:4px}
  .w{align-self:flex-start;background:#22c55e;color:#000;text-decoration:none;font-weight:700;padding:8px 12px;border-radius:10px;font-size:13px}
  .s{display:flex;gap:6px;flex-wrap:wrap;padding:0 12px 8px}.s button{background:#1b1b1d;color:#ddd;border:1px solid #333;border-radius:99px;padding:6px 10px;font-size:12px;cursor:pointer}
  form{display:flex;gap:8px;padding:10px;border-top:1px solid #262628}
  input{flex:1;background:#151517;border:1px solid #333;color:#fff;border-radius:12px;padding:10px;font-size:14px;outline:none}
  form button{background:${col};border:0;border-radius:12px;padding:0 14px;font-weight:700;cursor:pointer}
  .x{font-size:10px;color:#666;text-align:center;padding:0 0 6px}.x a{color:#888}
  .d i{display:inline-block;width:6px;height:6px;margin:0 2px;border-radius:50%;background:#888;animation:d 1s infinite}.d i:nth-child(2){animation-delay:.15s}.d i:nth-child(3){animation-delay:.3s}
  @keyframes d{50%{opacity:.2}}
  </style>
  <div class="p"><div class="h"><i></i><b>${esc(nom)}</b><button aria-label="Cerrar">×</button></div><div class="m"></div>
  <div class="s"></div><form><input placeholder="Escribe tu pregunta…" maxlength="500" aria-label="Mensaje"><button>➤</button></form>
  <div class="x">Asistente automático · <a href="https://xyrostudio.net" target="_blank" rel="noopener">Xyro Bots</a></div></div>
  <button class="b" aria-label="Abrir chat"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.5 3 2 6.6 2 11c0 2.4 1.3 4.6 3.4 6.1L4.6 21l4.3-2.3c1 .2 2 .3 3.1.3 5.5 0 10-3.6 10-8s-4.5-8-10-8zm-4 9.3a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6zm4 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6zm4 0a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6z"/></svg></button>`;
  const $ = s => sh.querySelector(s), pn = $('.p'), M = $('.m'), F = $('form'), I = $('input');
  const SUG = ['¿Cuánto cuesta el mes?', '¿Qué horario tienen?', '¿Dónde quedan?', '¿Qué clases hay?'];
  function pinta(pen) {
    const saludo = `¡Hola! 👋 Bienvenido a ${nom}. ¿En qué te ayudo? Precios, horarios, clases, lo que necesites.`;
    const btn = (n, w) => `<a class="w" target="_blank" rel="noopener" href="https://wa.me/${w}?text=${encodeURIComponent('Hola ' + nom + (n ? ' (sede ' + n + ')' : '') + ', vengo de su web 👋')}">💬 Hablar con recepción${n ? ' · ' + esc(n) : ''}</a>`;
    const links = m => { if (!m.w) return ''; const s1 = m.sede && SD.find(x => x.n === m.sede && x.wa); if (s1) return btn(s1.n, s1.wa); const con = SD.filter(x => x.wa); if (con.length > 1 && new Set(con.map(x => x.wa)).size > 1) return con.map(x => btn(x.n, x.wa)).join(''); return wa ? btn('', wa) : ''; };
    M.innerHTML = `<div class="g bo">${esc(saludo)}</div>` + H.map(m => `<div class="g ${m.de === 'b' ? 'bo' : 'yo'}">${esc(m.t)}</div>${links(m)}`).join('') + (pen ? '<div class="g bo d"><i></i><i></i><i></i></div>' : '');
    $('.s').innerHTML = H.length ? '' : SUG.map(t => `<button>${t}</button>`).join('');
    sh.querySelectorAll('.s button').forEach(b => b.onclick = () => envia(b.textContent));
    M.scrollTop = M.scrollHeight;
    try { sessionStorage.setItem(K, JSON.stringify(H.slice(-20))); } catch (_) {}
  }
  async function envia(t) {
    t = String(t || '').trim(); if (!t || ocupado) return; ocupado = true; I.value = '';
    const hist = H.slice(-8).map(m => ({ de: m.de, t: m.t }));
    H.push({ de: 'u', t }); pinta(1);
    let r = {};
    try { const x = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ s: slug, mensaje: t, historial: hist }) }); r = await x.json().catch(() => ({})); }
    catch (_) { r = { error: 'Sin conexión. Intenta de nuevo.' }; }
    if (r.wa) wa = r.wa; if (Array.isArray(r.sedes)) SD = r.sedes;
    H.push({ de: 'b', t: r.respuesta || r.error || 'No pude responder ahora.', w: !!(r.derivar || r.error), sede: r.sede || '' });
    ocupado = false; pinta(); I.focus();
  }
  F.onsubmit = e => { e.preventDefault(); envia(I.value); };
  $('.b').onclick = () => { pn.classList.toggle('on'); if (pn.classList.contains('on')) { pinta(); I.focus(); } };
  $('.h button').onclick = () => pn.classList.remove('on');
  // data-sobre=".selector": se pone encima de ese botón (ej. el de WhatsApp de la web) para no taparlo.
  // Se pone encima del botón flotante de WhatsApp de la web (data-sobre o detectado solo) para no taparlo.
  const SEL = 'a[href*="wa.me"],a[href*="whatsapp"],a[href*="api.whatsapp"],[data-wa],.fab,[class*="whatsapp"],[id*="whatsapp"]';
  function flota(el) { for (let e = el; e && e !== document.body; e = e.parentElement) { const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky') return true; } return false; }
  function ubica() {
    const en = ds.en && document.querySelector(ds.en);
    if (en) { en.style.visibility = 'hidden'; en.style.pointerEvents = 'none'; const q = en.getBoundingClientRect(); if (q.width) { host.style.bottom = Math.round(innerHeight - q.bottom) + 'px'; host.style.right = Math.round(innerWidth - q.right + (q.width - 58) / 2) + 'px'; return; } }
    let r = null;
    const L = [...(ds.sobre ? document.querySelectorAll(ds.sobre) : []), ...document.querySelectorAll(SEL)];
    for (const el of L) { if (host.contains(el)) continue; const q = el.getBoundingClientRect(); if (q.width && q.width < 160 && q.right > innerWidth - 140 && q.bottom > innerHeight - 220 && flota(el)) { if (!r || q.top < r.top) r = q; } }
    if (r) { host.style.bottom = Math.round(innerHeight - r.top + 12) + 'px'; host.style.right = Math.max(8, Math.round(innerWidth - r.right + (r.width - 58) / 2)) + 'px'; }
    else { host.style.bottom = '16px'; host.style.right = '16px'; }
  }
  (document.body ? Promise.resolve() : new Promise(r => addEventListener('DOMContentLoaded', r))).then(() => { document.body.appendChild(host); ubica(); setTimeout(ubica, 800); setTimeout(ubica, 2500); addEventListener('resize', ubica); addEventListener('scroll', () => { clearTimeout(ubica.t); ubica.t = setTimeout(ubica, 200); }, { passive: true }); });
})();
