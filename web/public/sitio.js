// xyrostudio.net · interacción: sonidos, menú móvil, demo animada, contadores, cinta, luz que sigue al ratón.
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- sonidos sintetizados (Web Audio, sin archivos) ----------
  let ctx = null, sonido = true;
  try { sonido = localStorage.getItem('xs.sonido') !== 'no'; } catch {}
  const audio = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());
  function tono(f = 880, d = 0.08, tipo = 'sine', vol = 0.05, desliz = 0) {
    if (!sonido || !ctx) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f, t); if (desliz) o.frequency.exponentialRampToValueAtTime(f * desliz, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + d + 0.02);
  }
  const SFX = {
    hover: () => tono(1400, 0.04, 'sine', 0.018),
    clic: () => { tono(620, 0.09, 'triangle', 0.06, 1.6); },
    tecla: () => tono(1800 + Math.random() * 400, 0.025, 'square', 0.01),
    paso: () => tono(980, 0.12, 'sine', 0.04, 1.25),
    listo: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tono(f, 0.35, 'sine', 0.045), i * 90)),
    swoosh: () => tono(300, 0.25, 'sawtooth', 0.012, 3),
  };
  // el navegador solo permite sonar tras el primer toque o clic
  addEventListener('pointerdown', () => { audio(); if (ctx.state === 'suspended') ctx.resume(); }, { once: true });
  const bSon = $('#bSonido');
  const pintaSon = () => { bSon.classList.toggle('apagado', !sonido); bSon.setAttribute('aria-label', sonido ? 'Silenciar sonidos' : 'Activar sonidos'); bSon.title = bSon.getAttribute('aria-label'); };
  bSon.onclick = () => { sonido = !sonido; try { localStorage.setItem('xs.sonido', sonido ? 'si' : 'no'); } catch {} pintaSon(); audio(); SFX.clic(); };
  pintaSon();
  const conHover = matchMedia('(hover: hover)').matches;
  $$('.btn, .menu a, .plan, .ventaja, .galeria-ej img, details summary').forEach((el) => {
    if (conHover) el.addEventListener('mouseenter', () => SFX.hover());
    el.addEventListener('click', () => SFX.clic());
  });

  // ---------- menú móvil ----------
  const bMenu = $('#bMenu'), panel = $('#menuMovil');
  bMenu.onclick = () => { const a = panel.classList.toggle('abierto'); bMenu.setAttribute('aria-expanded', a); document.body.classList.toggle('sin-scroll', a); SFX.swoosh(); };
  $$('#menuMovil a').forEach((a) => a.addEventListener('click', () => { panel.classList.remove('abierto'); document.body.classList.remove('sin-scroll'); }));

  // ---------- cabecera que se compacta al bajar + barra móvil ----------
  const cab = $('.cabecera'), barra = $('#barraMovil'), heroe = $('.heroe');
  addEventListener('scroll', () => {
    cab.classList.toggle('compacta', scrollY > 30);
    barra.classList.toggle('visible', scrollY > heroe.offsetHeight * 0.8 && innerHeight + scrollY < document.body.scrollHeight - 200);
  }, { passive: true });

  // ---------- aparición, contadores y demo al entrar en pantalla ----------
  const contar = (el) => {
    const fin = +el.dataset.num, suf = el.dataset.suf || '', t0 = performance.now(), dur = 1400;
    const paso = (t) => { const k = Math.min(1, (t - t0) / dur), v = Math.round(fin * (1 - Math.pow(1 - k, 3))); el.textContent = v + suf; if (k < 1) requestAnimationFrame(paso); };
    reducido ? (el.textContent = fin + suf) : requestAnimationFrame(paso);
  };
  const io = new IntersectionObserver((es) => es.forEach((x) => {
    if (!x.isIntersecting) return;
    const el = x.target; io.unobserve(el);
    if (el.classList.contains('aparece')) el.classList.add('visto');
    if (el.dataset.num) contar(el);
    if (el.id === 'demo') demo();
  }), { threshold: 0.18 });
  $$('.aparece, [data-num], #demo').forEach((e) => io.observe(e));

  // ---------- demo: así se crea un vídeo ----------
  const TEMA = 'El río que casi hierve en el Amazonas';
  const GUION = ['En el Amazonas hay un río que casi hierve.', 'Su agua llega a 90 grados.', 'Los animales que caen no sobreviven.', 'Y lo calienta el interior de la Tierra.'];
  let enDemo = false;
  async function demo() {
    if (enDemo) return; enDemo = true;
    const espera = (ms) => new Promise((r) => setTimeout(r, reducido ? 0 : ms));
    const tema = $('#dTema'), guion = $('#dGuion'), pasos = $$('#dPasos li'), barraP = $('#dBarra i'), vid = $('#dVideo'), pant = $('#dPantalla');
    while (true) {
      tema.textContent = ''; guion.innerHTML = ''; pasos.forEach((p) => p.className = ''); barraP.style.width = '0%'; pant.classList.remove('lista'); vid.pause();
      for (const c of TEMA) { tema.textContent += c; SFX.tecla(); await espera(38); }
      await espera(350);
      for (const fr of GUION) { const li = document.createElement('li'); li.textContent = fr; guion.appendChild(li); requestAnimationFrame(() => li.classList.add('ve')); SFX.paso(); await espera(420); }
      for (let i = 0; i < pasos.length; i++) {
        pasos[i].className = 'activo'; barraP.style.width = ((i + 1) / pasos.length * 100) + '%';
        await espera(650); pasos[i].className = 'hecho';
      }
      pant.classList.add('lista'); vid.currentTime = 0; vid.play().catch(() => {}); SFX.listo();
      await espera(9000);
    }
  }

  // ---------- luz que sigue al ratón en las tarjetas ----------
  if (conHover) $$('.foco').forEach((el) => el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect(); el.style.setProperty('--x', (e.clientX - r.left) + 'px'); el.style.setProperty('--y', (e.clientY - r.top) + 'px');
  }));

  // ---------- teléfonos del héroe: se inclinan con el ratón ----------
  const tels = $('.telefonos');
  if (conHover && !reducido && tels) addEventListener('pointermove', (e) => {
    const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
    tels.style.transform = `perspective(1200px) rotateY(${x * 8}deg) rotateX(${-y * 6}deg)`;
  }, { passive: true });
})();

// En el celular la app no se puede instalar (es para PC con Windows): el botón de descarga pasa a «enviarme el enlace»
(() => {
  const movil = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  if (!movil) return;
  document.querySelectorAll('a[href*="XyroStudio-setup.exe"]').forEach((a) => {
    a.removeAttribute('href'); a.setAttribute('role', 'button'); a.style.cursor = 'pointer';
    a.innerHTML = '📲 Enviarme el enlace para mi PC';
    const nota = document.createElement('p'); nota.className = 'nota';
    nota.textContent = 'XyroStudio es una app para PC con Windows 10 u 11. Envíate el enlace y descárgala desde tu ordenador.';
    a.closest('.acciones')?.after(nota);
    a.addEventListener('click', async () => {
      const datos = { title: 'XyroStudio', text: 'Descarga XyroStudio en tu PC:', url: 'https://xyrostudio.net/videos/#descargar' };
      try { if (navigator.share) await navigator.share(datos); else { await navigator.clipboard.writeText(datos.url); a.textContent = '✓ Enlace copiado'; } } catch {}
    });
  });
})();

// Microsoft Store: poner TIENDA = true cuando Microsoft apruebe la app (se instala sin avisos de Windows)
(() => { const TIENDA = true; const b = document.getElementById('btnTienda'); if (!TIENDA || !b) return;
  b.hidden = false; b.classList.add('btn-primario');
  const d = document.querySelector('a[href*="XyroStudio-setup.exe"]'); if (d) { d.classList.remove('btn-primario'); d.textContent = 'Descarga directa (instalador)'; d.parentElement.insertBefore(b, d); b.style.marginTop = '0'; }
  const n = [...document.querySelectorAll('.nota')].find((x) => x.textContent.includes('Windows protegió'));
  if (n) n.innerHTML = 'Recomendado: <b>Microsoft Store</b>, se instala con un clic y se actualiza sola. Con el instalador directo, si Windows avisa, pulsa <b>Más información → Ejecutar de todas formas</b>.'; })();
