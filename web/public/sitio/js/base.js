/* Base Xyro Webs · Gimnasio.
 * Contenido de partida de toda web de gimnasio. Sin datos de negocios reales:
 * lo que va entre paréntesis lo cambia el dueño en Xyro Apps → Mi web.
 * La usan: la web pública (cuando falta algo) y el Panel XyroStudio (al activar Xyro Webs, la copia al negocio).
 * BASE = lo que incluye el plan. Diseño nuevo, secciones a medida, fotos/videos producidos, dominio propio = EXTRA (se cotiza). */
(function () {
  const hoy = (o = 0) => { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); };
  const H = ['Lunes a sábado', '6:00 am – 10:00 pm'], H2 = ['Domingos y feriados', '8:00 am – 1:00 pm'];
  window.XYRO_BASE_GYM = function (nombre) {
    const N = (nombre || '').trim() || '(nombre del gym)';
    return {
      config: {
        hero: { eyebrow: 'Gimnasio · (distrito)', l1: 'Forja tu', l2: 'mejor', l3: 'versión', texto: 'Fuerza, disciplina y una comunidad que te empuja a más. Ven a entrenar a ' + N + '.', imagen: 'img/hero.webp' },
        marquee: { activo: true, mensajes: ['Forja tu mejor versión', 'Lun – Sáb 6am a 10pm', 'Entrenadores en sala', 'Todas las clases incluidas'] },
        vision: { eyebrow: 'Nuestra visión', titulo: 'Más que un gym,', acento: 'una familia', texto: 'Queremos que cada persona que entra a ' + N + ' se sienta acompañada, motivada y orgullosa de su progreso.', imagen: 'img/clase.webp',
          pilares: [{ t: 'Acompañamiento real', d: 'Tu entrenador te arma la rutina y te corrige en sala.' }, { t: 'Comunidad', d: 'Retos y gente que entrena con tu misma hambre.' }, { t: 'Espacios limpios', d: 'Limpieza constante, duchas y lockers.' }] },
        stats: [{ n: '1', t: 'Sede' }, { n: '16', t: 'Horas al día' }, { n: '3', t: 'Tipos de clases' }, { n: '6am', t: 'Abrimos desde' }],
        videos: { eyebrow: N + ' en redes', titulo: 'Así se vive', acento: N, texto: 'Toca un video para verlo con sonido.' },
        incluye: [
          { i: '🎟️', t: 'Todas las clases', d: 'Funcional, cardio y máquinas.' }, { i: '🏅', t: 'Entrenadores en sala', d: 'Te guían desde el primer día.' },
          { i: '🚿', t: 'Duchas', d: 'Para salir listo al trabajo.' }, { i: '🔐', t: 'Lockers', d: 'Tus cosas seguras.' },
          { i: '✨', t: 'Limpieza constante', d: 'Sala y máquinas impecables.' }, { i: '📲', t: 'Ingreso con QR', d: 'Tu carnet digital en el celular.' }
        ],
        aprobacion: false,
        redes: { tiktok: '', instagram: '', facebook: '' }
      },
      sedes: [
        { id: 'principal', nombre: 'Sede principal', distrito: '(distrito) · Lima', whatsapp: '', lat: null, lng: null, maps: '', foto: 'img/interior.webp', video: '', cafeWhatsapp: '', cafePedidos: { activo: false, desde: '08:00', hasta: '20:00', diasTxt: 'Lunes a sábado', dom: false }, horario: [[...H], [...H2]] }
      ],
      planes: [
        { id: 'p1m', nombre: '1 mes', meses: 1, precio: 100, destacado: false, precioEvento: '', eventoTexto: '', eventoHasta: '' },
        { id: 'p3m', nombre: '3 meses', meses: 3, precio: 270, destacado: false, precioEvento: '', eventoTexto: '', eventoHasta: '' },
        { id: 'p12m', nombre: '1 año', meses: 12, precio: 900, destacado: true, precioEvento: '', eventoTexto: '', eventoHasta: '' }
      ],
      pase: { socio: 5, noSocio: 10 },
      notaPlanes: '(Precios de ejemplo: cámbialos en Mi web → Planes.)',
      entrenadores: [
        { id: 'c1', nombre: 'Coach (nombre)', sede: 'principal', especialidad: 'Fuerza e hipertrofia', mensaje: 'Te armo la rutina y te acompaño hasta que la técnica salga perfecta.', bio: '(Cuenta aquí su experiencia y cómo entrena.)', logros: ['(Certificación)'], foto: 'img/coach.webp', pos: '70% 30%', fotos: [], video: '', ig: '' },
        { id: 'c2', nombre: 'Coach (nombre)', sede: 'principal', especialidad: 'Funcional y cardio', mensaje: 'Entrenar también puede ser divertido. Ven con energía.', bio: '(Cuenta aquí su experiencia y cómo entrena.)', logros: ['(Certificación)'], foto: 'img/atleta.webp', pos: '50% 25%', fotos: [], video: '', ig: '' }
      ],
      clases: [
        { id: 'k1', nombre: 'Funcional', tipo: 'Funcional', coach: 'c2', profe: '', sede: 'principal', dias: ['lun', 'mie', 'vie'], hora: '07:00', duracion: 60, nota: 'Trae toalla y agua', activo: true },
        { id: 'k2', nombre: 'Cardio intenso', tipo: 'Cardio', coach: 'c2', profe: '', sede: 'principal', dias: ['mar', 'jue'], hora: '19:00', duracion: 45, nota: '', activo: true },
        { id: 'k3', nombre: 'Fuerza guiada', tipo: 'Fuerza', coach: 'c1', profe: '', sede: 'principal', dias: ['lun', 'mie', 'vie'], hora: '18:30', duracion: 60, nota: 'Cupos limitados', activo: true }
      ],
      nutricion: [
        { id: 'n1', nutri: 'Lic. (nombre)', foto: '', sede: 'principal', dias: ['mar', 'jue'], desde: '16:00', hasta: '20:00', cita: 30, modalidad: 'Presencial', nota: '', activo: true }
      ],
      cafetin: {
        titulo: 'Come como', acento: 'entrenas', texto: 'Batidos y snacks con su proteína y calorías a la vista.', imagen: 'img/cafe/hero.webp',
        items: [
          { id: 'i1', nombre: 'Batido de proteína', categoria: 'Batidos', descripcion: 'Proteína, leche, plátano y cacao.', precio: 10, proteina: 30, kcal: 320, objetivo: 'volumen', sedes: ['principal'], disponible: true, destacado: true, foto: 'img/cafe/1.webp' },
          { id: 'i2', nombre: 'Batido verde', categoria: 'Batidos', descripcion: 'Espinaca, piña, manzana verde y chía.', precio: 9, proteina: 18, kcal: 190, objetivo: 'definicion', sedes: ['principal'], disponible: true, destacado: false, foto: 'img/cafe/2.webp' },
          { id: 'i3', nombre: 'Bowl de pollo', categoria: 'Platos', descripcion: 'Pollo a la plancha, quinua, palta y huevo.', precio: 15, proteina: 42, kcal: 520, objetivo: 'volumen', sedes: ['principal'], disponible: true, destacado: true, foto: 'img/cafe/3.webp' },
          { id: 'i4', nombre: 'Barra proteica', categoria: 'Snacks', descripcion: '20 g de proteína.', precio: 7, proteina: 20, kcal: 210, objetivo: 'definicion', sedes: ['principal'], disponible: true, destacado: false, foto: 'img/cafe/6.webp' }
        ],
        combos: []
      },
      publicaciones: [
        { id: 'p1', tipo: 'Promo', titulo: 'Inscripción gratis este mes', descripcion: 'Matricúlate este mes y no pagas inscripción. (Cambia o borra esta promo en Mi web → Promos.)', sede: 'todas', media: 'img/grip.webp', mediaTipo: 'image', inicio: hoy(), fin: hoy(30), estado: 'publicado', autor: 'Administrador', creado: Date.now() }
      ],
      galeria: [
        { id: 'g1', media: 'img/hero.webp', mediaTipo: 'image', sede: 'todas', categoria: 'Entrenamiento', titulo: 'Fuerza', estado: 'publicado' },
        { id: 'g2', media: 'img/atleta.webp', mediaTipo: 'image', sede: 'todas', categoria: 'Entrenamiento', titulo: 'Disciplina', estado: 'publicado' },
        { id: 'g3', media: 'img/interior.webp', mediaTipo: 'image', sede: 'todas', categoria: 'Sede', titulo: 'Nuestra sala', estado: 'publicado' },
        { id: 'g4', media: 'img/clase.webp', mediaTipo: 'image', sede: 'todas', categoria: 'Clases', titulo: 'Funcional', estado: 'publicado' },
        { id: 'g5', media: 'img/coach.webp', mediaTipo: 'image', sede: 'todas', categoria: 'Entrenamiento', titulo: 'Coaching', estado: 'publicado' },
        { id: 'g6', media: 'img/grip.webp', mediaTipo: 'image', sede: 'todas', categoria: 'Entrenamiento', titulo: 'Grip', estado: 'publicado' }
      ]
    };
  };
  // Qué entra en la base y qué se cobra aparte (lo muestra el Panel XyroStudio).
  window.XYRO_BASE_GYM.incluye = ['Web tipo app con todas las secciones (inicio, planes, entrenadores, clases, nutrición, cafetín, sedes, galería, promos)', 'Nombre, logo y color del gimnasio', 'Edición de textos, precios, fotos, promos y horarios desde Mi web', 'Botón de WhatsApp y métricas de visitas', 'Temas de temporada y modo mantenimiento'];
  window.XYRO_BASE_GYM.extras = ['Diseño o estilo nuevo (otra tipografía, otro orden, efectos)', 'Secciones a medida (tienda en línea, reservas, blog…)', 'Sesión de fotos o videos producidos (Xyro Edits)', 'Dominio propio (.com / .pe) y correo', 'Migrar contenido de su web anterior'];
})();
