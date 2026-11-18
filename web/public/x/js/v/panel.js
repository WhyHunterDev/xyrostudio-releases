// Xyro · XyroStudio Panel (solo equipo con staff_role). Lo delicado sigue en /gestor/; aquí lo del núcleo Xyro (SQL 76).
import { S, $, $$, esc, I, rpc, tabla, fecha, hora, toast, errDe } from '../core.js';

const TIPO = { PHYSICAL: 'Local físico', HYBRID: 'Híbrido', PROFESSIONAL: 'Profesional', DELIVERY_ECOMMERCE: 'Tienda con envíos', DIGITAL_PRODUCTS: 'Productos digitales' };
const ROL = { SUPERADMIN: 'Superadmin', SUPPORT: 'Soporte', MODERATOR: 'Moderación', SECURITY: 'Seguridad', MARKETING: 'Marketing', FINANCE: 'Finanzas' };
const pendientes = () => tabla('entities', (q) => q.select('id,slug,name,type,category,status,country,created_at').eq('status', 'PENDING').order('created_at').limit(100), 'entities_pending');

export async function vista(r, el) {
  if (r === 'p-inicio') return inicio(el);
  if (r === 'p-negocios') return negocios(el);
  if (r === 'p-soporte') return soporte(el);
}

async function inicio(el) {
  el.innerHTML = `<div><h1>XyroStudio Panel</h1><p class="mu">Tu rol: <b>${esc(ROL[S.me.staff_role] || S.me.staff_role)}</b></p></div>
    <div class="kpis"><div class="kpi"><span class="mu xs">Negocios por revisar</span><b id="kp">…</b></div>
      <div class="kpi"><span class="mu xs">Tickets</span><b>—</b><span class="mu xs">en el panel completo</span></div>
      <div class="kpi"><span class="mu xs">Videos en cola</span><b>—</b><span class="mu xs">Sprint 4</span></div>
      <div class="kpi"><span class="mu xs">Reportes P2P</span><b>—</b><span class="mu xs">Sprint 4</span></div></div>
    <div class="card"><b>Atajos</b>
      <a class="li" href="#/p-negocios" style="text-decoration:none"><span class="ico">${I.shield}</span><span class="sp">Aprobar negocios nuevos</span>›</a>
      <a class="li" href="/gestor/" style="text-decoration:none"><span class="ico">${I.chart}</span><span class="sp">Abrir el Panel XyroStudio completo<br><span class="mu xs">Cobros, Actualizaciones, Registros gratis</span></span>›</a></div>`;
  try { $('#kp', el).textContent = (await pendientes()).length; } catch (e) { $('#kp', el).textContent = '—'; }
}

async function negocios(el) {
  el.innerHTML = `<div><h1>Negocios por revisar</h1><p class="mu">Al aprobar, el negocio aparece en Explorar. Verificado = revisaste sus documentos.</p></div><div class="card" id="ln"><div class="sk" style="height:120px"></div></div>`;
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

function soporte(el) {
  el.innerHTML = `<div><h1>Soporte</h1><p class="mu">Tickets y chat de ayuda.</p></div>
    <div class="card"><b>Los tickets siguen en el Panel XyroStudio</b><span class="mu sm">Ahí están 🎫 Tickets, 📨 Mensaje directo y 💬 Chat de ayuda.</span><a class="btn p" href="/gestor/">Abrir tickets</a></div>
    <div class="card pronto"><b>Muy pronto aquí</b><span class="mu sm">Tickets de Xyro (compras, P2P y disputas) con prioridad y asignación al equipo.</span></div>`;
}
