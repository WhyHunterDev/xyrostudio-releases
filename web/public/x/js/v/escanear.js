// Xyro · Escanear QR: cámara (BarcodeDetector o jsQR) → GPS → verify_qr_and_distance → compra en el local o modo vitrina.
// La ubicación solo viaja a la consulta: la base guarda location_verified = true, nunca las coordenadas.
import { S, $, esc, I, rpc, toast, errDe, ubicar, cargaJS, vib, hora } from '../core.js';

const tokenDe = (txt) => {
  const t = String(txt || '').trim();
  try { const u = new URL(t); return u.searchParams.get('q') || u.pathname.split('/').filter(Boolean).pop(); } catch (_) { return /^[\w-]{6,80}$/.test(t) ? t : null; }
};

export async function vista(r, el) {
  let stream = null, vivo = true, raf = 0;
  const parar = () => { vivo = false; cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach((t) => t.stop()); stream = null; };
  const chk = new URLSearchParams(location.hash.split('?')[1] || '').get('c');   // check-in de una membresía
  el.innerHTML = `${chk ? '<div><h1>Check-in</h1><p class="mu">Escanea el QR de la entrada. Validamos que estés a 50 m o menos del local.</p></div>'
    : '<div><h1>Escanear QR</h1><p class="mu">Apunta al QR de la mesa, el mostrador o el celular del profesional.</p></div>'}
    <div id="zona"></div>
    <div class="card"><b class="sm">¿No funciona la cámara?</b><form class="row" id="fM"><input id="cM" placeholder="Pega el enlace o código del QR" autocomplete="off"><button class="btn p">Ir</button></form></div>`;

  const verificar = async (tok) => {
    parar(); vib();
    const z = $('#zona', el);
    z.innerHTML = `<div class="card" style="text-align:center;justify-items:center;padding:28px"><div class="sk" style="width:64px;height:64px;border-radius:50%"></div><b>Verificando que estés en el local…</b><span class="mu sm">Usamos tu ubicación solo para esta comprobación.</span></div>`;
    if (chk) return entrada(tok, z);
    try {
      const g = await ubicar(10000);
      const d = await rpc('verify_qr_and_distance', { p_token: tok, p_lat: g ? g.lat : null, p_lng: g ? g.lng : null });
      if (d && d.ok) {
        z.innerHTML = `<div class="card" style="border-color:#22c55e66;text-align:center;justify-items:center;padding:24px">
          <div style="font-size:48px">✅</div><h2>¡Estás en el local!</h2><span class="mu">${esc(d.checkpoint || '')} · tu sesión dura ${esc(d.expires_in_min || 120)} min</span>
          <span class="pill ok">Compra en el local activa</span>
          <div class="card pronto" style="width:100%;text-align:left"><b class="sm">Carta y pedido</b><span class="mu sm">El pedido desde aquí llega muy pronto. Mientras, pide en caja: al confirmar tu pago sumas puntos.</span></div>
          <button class="btn w" id="otra">Escanear otro</button></div>`;
      } else {
        z.innerHTML = `<div class="card" style="border-color:#f59e0b66;text-align:center;justify-items:center;padding:24px">
          <div style="font-size:48px">👀</div><h2>Modo vitrina</h2><span class="mu">${esc((d && d.message) || 'Puedes ver la carta, pero para comprar aquí debes estar en el local.')}</span>
          <button class="btn w" id="otra">Escanear otro</button></div>`;
      }
    } catch (e) {
      z.innerHTML = `<div class="card" style="border-color:#ef444466;text-align:center;justify-items:center;padding:24px"><div style="font-size:48px">⚠️</div><b>${esc(errDe(e))}</b><button class="btn w" id="otra">Intentar de nuevo</button></div>`;
    }
    const o = $('#otra', el); o && (o.onclick = () => { vivo = true; camara(); });
  };

  // Check-in: la base valida QR + GPS ≤ 50 m + plan vigente y registra la visita (entity_visits + audit_logs)
  const entrada = async (tok, z) => {
    const fin = (borde, emo, tit, txt, extra = '') => {
      z.innerHTML = `<div class="card" style="border-color:${borde};text-align:center;justify-items:center;padding:24px"><div style="font-size:52px">${emo}</div><h2>${tit}</h2><span class="mu">${txt}</span>${extra}<button class="btn w" id="otra">Escanear de nuevo</button><a class="btn l w" href="#/billetera">Volver a mis membresías</a></div>`;
      const o = $('#otra', el); o && (o.onclick = () => { vivo = true; camara(); });
    };
    try {
      const g = await ubicar(10000);
      const d = await rpc('xy_checkin', { p_token: tok, p_lat: g ? g.lat : null, p_lng: g ? g.lng : null });
      const queda = d.sessions_left != null && d.kind === 'CLASS_PACK' ? `Te quedan <b>${esc(d.sessions_left)}</b> sesiones` : d.days_left != null ? `Te quedan <b>${esc(d.days_left)}</b> días de plan` : '';
      if (d.ok && d.repeated) fin('#22c55e66', '👍', 'Ya marcaste tu entrada', `${esc(d.entity_name)} · hace menos de 3 horas. ${queda}`);
      else if (d.ok) fin('#22c55e66', '✅', '¡Entrada registrada!', `${esc(d.entity_name)}${d.checkpoint ? ' · ' + esc(d.checkpoint) : ''} · ${hora(new Date())}`, queda ? `<span class="pill ok">${queda}</span>` : '');
      else if (d.reason === 'NO_PLAN') fin('#f59e0b66', '🎟️', 'Sin plan activo', esc(d.message), '<a class="btn p w" href="#/billetera">↻ Renovar plan</a>');
      else fin('#f59e0b66', '📍', 'Acércate a la entrada', esc(d.message || 'Debes estar a 50 m o menos del local.'));
    } catch (e) { fin('#ef444466', '⚠️', 'No se pudo marcar', esc(errDe(e))); }
  };

  const camara = async () => {
    const z = $('#zona', el);
    z.innerHTML = `<div class="cam"><video playsinline muted></video><div class="mk"></div></div>`;
    const v = $('video', z);
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      if (!vivo) return parar();
      v.srcObject = stream; await v.play();
    } catch (_) {
      z.innerHTML = `<div class="vacio card"><div class="e">📷</div><b>No pudimos abrir la cámara</b><span class="mu sm">Da permiso a la cámara en tu navegador o escribe el código abajo.</span><button class="btn" id="re">Reintentar</button></div>`;
      $('#re', z).onclick = camara; return;
    }
    let leer;
    if ('BarcodeDetector' in window) {
      const bd = new window.BarcodeDetector({ formats: ['qr_code'] });
      leer = async () => { const c = await bd.detect(v); return c[0] && c[0].rawValue; };
    } else {
      await cargaJS('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js');
      const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
      leer = async () => { const w = 480, h = Math.round(w * v.videoHeight / v.videoWidth) || 640; cv.width = w; cv.height = h; cx.drawImage(v, 0, 0, w, h); const c = window.jsQR(cx.getImageData(0, 0, w, h).data, w, h); return c && c.data; };
    }
    let ult = 0;
    const bucle = async (t) => {
      if (!vivo) return;
      if (t - ult > 220 && v.readyState >= 2) {
        ult = t;
        try { const txt = await leer(); const tok = txt && tokenDe(txt); if (tok) return verificar(tok); } catch (_) {}
      }
      raf = requestAnimationFrame(bucle);
    };
    raf = requestAnimationFrame(bucle);
  };

  $('#fM', el).onsubmit = (e) => { e.preventDefault(); const tok = tokenDe($('#cM', el).value); tok ? verificar(tok) : toast('Ese código no es válido'); };

  let pend = null; try { pend = sessionStorage.getItem('x-qr'); sessionStorage.removeItem('x-qr'); } catch (_) {}
  if (pend) verificar(pend); else camara();
  return parar;
}
