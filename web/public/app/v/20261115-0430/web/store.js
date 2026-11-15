/* Santos Strength — capa de datos de la DEMO.
   En la demo todo se guarda en el navegador (IndexedDB).
   En la versión real, estas mismas funciones llaman a la base de datos en la nube (Supabase: Postgres + Storage + Auth). */
(function () {
  const DB_NAME = 'santos-strength-demo';
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      let req;
      try { req = indexedDB.open(DB_NAME, 1); } catch (e) { reject(e); return; }
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        if (!d.objectStoreNames.contains('media')) d.createObjectStore('media');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }
  async function tx(store, mode, fn) {
    const d = await db();
    return new Promise((resolve, reject) => {
      const t = d.transaction(store, mode), r = fn(t.objectStore(store));
      t.oncomplete = () => resolve(r && 'result' in r ? r.result : undefined);
      t.onerror = () => reject(t.error);
    });
  }
  const memory = {};
  async function get(key) { try { return await tx('kv', 'readonly', (s) => s.get(key)); } catch (e) { return memory[key]; } }
  async function set(key, val) { memory[key] = val; try { await tx('kv', 'readwrite', (s) => s.put(val, key)); } catch (e) {} }
  async function putMedia(id, blob) { memory['m:' + id] = blob; try { await tx('media', 'readwrite', (s) => s.put(blob, id)); } catch (e) {} }
  const urlCache = {};
  async function mediaUrl(ref) {
    if (!ref) return '';
    if (!ref.startsWith('idb:')) return /^(https?:|data:|blob:|\/)/.test(ref) || !window.SS_WEB ? ref : window.SS_WEB + ref;
    const id = ref.slice(4);
    if (urlCache[id]) return urlCache[id];
    let blob;
    try { blob = await tx('media', 'readonly', (s) => s.get(id)); } catch (e) { blob = memory['m:' + id]; }
    if (!blob) return '';
    return (urlCache[id] = URL.createObjectURL(blob));
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const today = (o = 0) => { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); };
  const DEMO_WA = '51936449066';
  const VERSION = 4;
  const H = ['Lunes a sábado', '5:00 am – 11:00 pm'], H2 = ['Domingos y feriados', '8:00 am – 9:00 pm'];

  function seed() {
    return {
      version: VERSION,
      config: {
        hero: { eyebrow: 'Gimnasio · Lima, Perú', l1: 'Forja tu', l2: 'mejor', l3: 'versión', texto: 'Fuerza, disciplina y una comunidad que te empuja a más. Abiertos desde las 5 de la mañana.', imagen: 'img/hero.jpg' },
        marquee: { activo: true, mensajes: ['Forja tu mejor versión', 'Lun – Sáb 5am a 11pm', 'Cafetín fit en todas las sedes', 'Asesoría nutricional incluida', 'Todas las clases incluidas'] },
        vision: { eyebrow: 'Nuestra visión', titulo: 'Más que un gym,', acento: 'una familia', texto: 'Queremos que cada persona que entra a Santos Strength encuentre un lugar donde se sienta acompañada, motivada y orgullosa de su progreso. Entrenamos fuerte, pero sobre todo entrenamos juntos.', imagen: 'img/comunidad.jpg',
          pilares: [{ t: 'Acompañamiento real', d: 'Tu entrenador te arma la rutina y te corrige en sala.' }, { t: 'Comunidad', d: 'Eventos, retos y gente que entrena con tu misma hambre.' }, { t: 'Espacios impecables', d: 'Limpieza constante, duchas con agua caliente y lockers.' }] },
        stats: [{ n: '2', t: 'Sedes en Lima' }, { n: '18', t: 'Horas al día' }, { n: '4', t: 'Tipos de clases' }, { n: '5am', t: 'Abrimos desde' }],
        videos: { eyebrow: 'Santos en redes', titulo: 'Así se vive', acento: 'Santos', texto: 'Entrenamiento, humor, promos y comunidad. Toca un video para verlo con sonido.' },
        incluye: [
          { i: '🥗', t: 'Asesoría nutricional', d: 'Enfocada en tu objetivo.' }, { i: '🎟️', t: 'Todas las clases', d: 'Funcional, baile, cardio y máquinas.' },
          { i: '⏱️', t: 'Sin límite de tiempo', d: 'Quédate lo que quieras.' }, { i: '🚿', t: 'Duchas con agua caliente', d: 'En todas las sedes.' },
          { i: '🔐', t: 'Lockers', d: 'Tus cosas seguras.' }, { i: '✨', t: 'Limpieza constante', d: 'Personal dedicado a sala y máquinas.' },
          { i: '🏅', t: 'Entrenadores calificados', d: 'En cada sede.' }, { i: '🥤', t: 'Cafetín fit', d: 'Batidos y comida con macros.' }
        ],
        aprobacion: false,
        redes: { tiktok: 'https://www.tiktok.com/@santos.strength7', instagram: 'https://www.instagram.com/gymsantosstrength/', facebook: 'https://www.facebook.com/p/Santos-Strength-61557276908804/' }
      },
      sedes: [
        { id: 'manchay', nombre: 'Manchay', distrito: 'Pachacámac · Lima', whatsapp: DEMO_WA, lat: -12.113283, lng: -76.872614, maps: 'https://maps.app.goo.gl/AFX4uoJvAJQP8BAi9', foto: 'img/interior.jpg', video: 'r4', cafeWhatsapp: '', cafePedidos: { activo: true, desde: '08:00', hasta: '20:00', diasTxt: 'Lunes a sábado', dom: false }, horario: [[...H], [...H2]] },
        { id: 'vmt', nombre: 'Villa María', distrito: 'Villa María del Triunfo · Lima', whatsapp: DEMO_WA, lat: -12.1665603, lng: -76.9512038, maps: 'https://maps.app.goo.gl/jrt1raV4EUicwpyHA', foto: 'img/coach.jpg', video: 'r1', cafeWhatsapp: '', cafePedidos: { activo: true, desde: '08:00', hasta: '20:00', diasTxt: 'Lunes a sábado', dom: false }, horario: [[...H], [...H2]] }
      ],
      planes: [
        { id: 'p3m', nombre: '3 meses', meses: 3, precio: 400, destacado: false, precioEvento: '', eventoTexto: '', eventoHasta: '' },
        { id: 'p6m', nombre: '6 meses', meses: 6, precio: 700, destacado: false, precioEvento: '', eventoTexto: '', eventoHasta: '' },
        { id: 'p12m', nombre: '1 año', meses: 12, precio: 1000, destacado: true, precioEvento: 899, eventoTexto: 'Precio Black Friday', eventoHasta: today(17) }
      ],
      pase: { socio: 9, noSocio: 12 },
      notaPlanes: 'Planes de lunes a sábado. Domingos y feriados con pase diario.',
      entrenadores: [
        { id: 'c1', nombre: 'Coach Diego', sede: 'manchay', especialidad: 'Fuerza e hipertrofia', mensaje: 'Te armo la rutina y te acompaño hasta que la técnica salga perfecta.', bio: 'Más de 6 años entrenando a personas que empiezan desde cero y a atletas que buscan su mejor marca. Su enfoque: técnica primero, progreso constante.', logros: ['Certificado en entrenamiento de fuerza', '+300 alumnos acompañados'], foto: 'img/coach.jpg', pos: '70% 30%', fotos: ['img/interior.jpg', 'img/grip.jpg'], video: '', ig: '' },
        { id: 'c2', nombre: 'Coach Andrea', sede: 'manchay', especialidad: 'Funcional y baile', mensaje: 'Entrenar también puede ser divertido. Ven con energía.', bio: 'Dirige las clases de funcional y baile. Cree que la constancia nace cuando disfrutas lo que haces.', logros: ['Instructora de baile fitness', 'Especialista en entrenamiento funcional'], foto: 'img/atleta.jpg', pos: '50% 25%', fotos: ['img/clase.jpg'], video: '', ig: '' },
        { id: 'c3', nombre: 'Coach Luis', sede: 'vmt', especialidad: 'Pérdida de grasa', mensaje: 'Tu objetivo es mi objetivo: rutina + nutrición, sin excusas.', bio: 'Combina entrenamiento y asesoría nutricional para que bajes tu porcentaje de grasa sin perder fuerza.', logros: ['Asesor nutricional deportivo'], foto: 'img/hero.jpg', pos: '62% 20%', fotos: [], video: '', ig: '' },
        { id: 'c4', nombre: 'Coach Mía', sede: 'vmt', especialidad: 'Cardio y acondicionamiento', mensaje: 'Paso a paso, cada día un poco más fuerte.', bio: 'Te ayuda a ganar resistencia y energía con planes de cardio que se adaptan a tu nivel.', logros: ['Especialista en acondicionamiento físico'], foto: 'img/clase.jpg', pos: '42% 35%', fotos: [], video: '', ig: '' }
      ],
      cafetin: {
        titulo: 'Come como', acento: 'entrenas', texto: 'Batidos, platos y snacks con su proteína y calorías a la vista. Pide antes o después de entrenar.', imagen: 'img/cafe/hero.jpg',
        items: [
          { id: 'i1', nombre: 'Batido Whey Chocolate', categoria: 'Batidos', descripcion: 'Proteína whey, leche descremada, plátano y cacao.', precio: 12, proteina: 30, kcal: 320, objetivo: 'volumen', sedes: ['manchay', 'vmt'], disponible: true, destacado: true, foto: 'img/cafe/1.jpg' },
          { id: 'i2', nombre: 'Batido Verde Detox', categoria: 'Batidos', descripcion: 'Espinaca, piña, manzana verde, chía y proteína vegetal.', precio: 10, proteina: 18, kcal: 190, objetivo: 'definicion', sedes: ['manchay', 'vmt'], disponible: true, destacado: false, foto: 'img/cafe/2.jpg' },
          { id: 'i3', nombre: 'Bowl Pollo & Quinua', categoria: 'Platos', descripcion: 'Pechuga a la plancha, quinua, palta, tomate y huevo.', precio: 16, proteina: 42, kcal: 520, objetivo: 'volumen', sedes: ['manchay'], disponible: true, destacado: true, foto: 'img/cafe/3.jpg' },
          { id: 'i4', nombre: 'Ensalada Atún Fit', categoria: 'Platos', descripcion: 'Atún, mix de hojas, choclo, huevo y limón.', precio: 14, proteina: 35, kcal: 340, objetivo: 'definicion', sedes: ['vmt'], disponible: true, destacado: false, foto: 'img/cafe/4.jpg' },
          { id: 'i5', nombre: 'Pancakes de Avena', categoria: 'Snacks', descripcion: 'Avena, claras, plátano y miel. Ideal pre-entreno.', precio: 9, proteina: 20, kcal: 300, objetivo: 'volumen', sedes: ['manchay', 'vmt'], disponible: true, destacado: false, foto: 'img/cafe/5.jpg' },
          { id: 'i6', nombre: 'Barra Proteica + Agua', categoria: 'Snacks', descripcion: 'Barra de 20 g de proteína y agua mineral.', precio: 9, proteina: 20, kcal: 210, objetivo: 'definicion', sedes: ['manchay', 'vmt'], disponible: false, destacado: false, foto: 'img/cafe/6.jpg' }
        ],
        combos: [
          { id: 'k1', nombre: 'Combo Post-Entreno', incluye: 'Batido Whey + Pancakes de Avena', precio: 18, precioAntes: 21, sedes: ['manchay', 'vmt'], hasta: today(20), foto: 'img/cafe/1.jpg' },
          { id: 'k2', nombre: 'Combo Definición', incluye: 'Batido Verde + Ensalada Atún Fit', precio: 21, precioAntes: 24, sedes: ['vmt'], hasta: today(20), foto: 'img/cafe/4.jpg' }
        ]
      },
      publicaciones: [
        { id: 'p1', tipo: 'Promo', titulo: 'Inscripción GRATIS en noviembre', descripcion: 'Matricúlate este mes en cualquiera de nuestras sedes y no pagas inscripción. Trae a un amigo y ambos reciben una semana extra.', sede: 'todas', media: 'img/grip.jpg', mediaTipo: 'image', inicio: today(-3), fin: today(19), estado: 'publicado', autor: 'Administrador', creado: Date.now() - 86400000 * 3 },
        { id: 'p2', tipo: 'Evento', titulo: 'Reto Deadlift Santos', descripcion: 'Competencia interna de peso muerto por categorías. Premios para el top 3 y polo oficial para todos.', sede: 'manchay', media: 'img/hero.jpg', mediaTipo: 'image', inicio: today(-1), fin: today(25), estado: 'publicado', autor: 'Recepción Manchay', creado: Date.now() - 86400000 },
        { id: 'p3', tipo: 'Evento', titulo: 'Noche de Baile Fitness', descripcion: 'Clase especial de baile con DJ en vivo. Cupos limitados, separa tu lugar por WhatsApp.', sede: 'vmt', media: 'img/clase.jpg', mediaTipo: 'image', inicio: today(-2), fin: today(10), estado: 'publicado', autor: 'Recepción Villa María', creado: Date.now() - 86400000 * 2 }
      ],
      clases: [
        { id: 'k1', nombre: 'Funcional', tipo: 'Funcional', coach: 'c2', profe: '', sede: 'manchay', dias: ['lun', 'mie', 'vie'], hora: '07:00', duracion: 60, nota: 'Trae toalla y agua', activo: true },
        { id: 'k2', nombre: 'Baile fitness', tipo: 'Baile', coach: 'c2', profe: '', sede: 'manchay', dias: ['mar', 'jue'], hora: '19:00', duracion: 60, nota: '', activo: true },
        { id: 'k3', nombre: 'Crossfit', tipo: 'Crossfit', coach: 'c3', profe: '', sede: 'vmt', dias: ['lun', 'mie', 'vie'], hora: '18:30', duracion: 60, nota: 'Cupos limitados', activo: true },
        { id: 'k4', nombre: 'Cardio intenso', tipo: 'Cardio', coach: 'c4', profe: '', sede: 'vmt', dias: ['mar', 'jue', 'sab'], hora: '08:00', duracion: 45, nota: '', activo: true }
      ],
      nutricion: [
        { id: 'n1', nutri: 'Lic. Carla Rojas', foto: '', sede: 'manchay', dias: ['lun', 'mie', 'vie'], desde: '08:00', hasta: '12:00', cita: 30, modalidad: 'Presencial', nota: 'Trae tu última evaluación si la tienes', activo: true },
        { id: 'n2', nutri: 'Lic. Carla Rojas', foto: '', sede: 'vmt', dias: ['mar', 'jue'], desde: '16:00', hasta: '20:00', cita: 30, modalidad: 'Presencial', nota: '', activo: true },
        { id: 'n3', nutri: 'Lic. Carla Rojas', foto: '', sede: 'todas', dias: ['sab'], desde: '09:00', hasta: '11:00', cita: 30, modalidad: 'Virtual', nota: 'Por videollamada', activo: true }
      ],
      galeria: [
        { id: 'r9', media: 'vid/r9.mp4', poster: 'vid/r9.jpg', mediaTipo: 'video', sede: 'todas', categoria: 'Tips', titulo: '¿Qué te hace realmente fuerte?', estado: 'publicado', destacado: true },
        { id: 'r4', media: 'vid/r4.mp4', poster: 'vid/r4.jpg', mediaTipo: 'video', sede: 'manchay', categoria: 'Sedes', titulo: 'Cómo llegar a Manchay', estado: 'publicado', destacado: true },
        { id: 'r1', media: 'vid/r1.mp4', poster: 'vid/r1.jpg', mediaTipo: 'video', sede: 'vmt', categoria: 'Sedes', titulo: 'Conoce Villa María', estado: 'publicado', destacado: true },
        { id: 'r6', media: 'vid/r6.mp4', poster: 'vid/r6.jpg', mediaTipo: 'video', sede: 'todas', categoria: 'Humor', titulo: 'Todos son favoritos', estado: 'publicado', destacado: true },
        { id: 'r5', media: 'vid/r5.mp4', poster: 'vid/r5.jpg', mediaTipo: 'video', sede: 'todas', categoria: 'Humor', titulo: 'La dupla de entrenamiento', estado: 'publicado', destacado: true },
        { id: 'r7', media: 'vid/r7.mp4', poster: 'vid/r7.jpg', mediaTipo: 'video', sede: 'todas', categoria: 'Comunidad', titulo: 'Cuidamos nuestro espacio', estado: 'publicado', destacado: true },
        { id: 'r3', media: 'vid/r3.mp4', poster: 'vid/r3.jpg', mediaTipo: 'video', sede: 'todas', categoria: 'Promos', titulo: 'Refiere a un amigo', estado: 'publicado', destacado: false },
        { id: 'r2', media: 'vid/r2.mp4', poster: 'vid/r2.jpg', mediaTipo: 'video', sede: 'manchay', categoria: 'Promos', titulo: 'Promo dúo 2x1', estado: 'publicado', destacado: false },
        { id: 'r8', media: 'vid/r8.mp4', poster: 'vid/r8.jpg', mediaTipo: 'video', sede: 'todas', categoria: 'Eventos', titulo: 'Santosween Fest', estado: 'publicado', destacado: false },
        { id: 'g0', media: 'img/comunidad.jpg', mediaTipo: 'image', sede: 'todas', categoria: 'Comunidad', titulo: 'Familia Santos', estado: 'publicado' },
        { id: 'g1', media: 'img/hero.jpg', mediaTipo: 'image', sede: 'manchay', categoria: 'Entrenamiento', titulo: 'Fuerza pura', estado: 'publicado' },
        { id: 'g2', media: 'img/atleta.jpg', mediaTipo: 'image', sede: 'vmt', categoria: 'Entrenamiento', titulo: 'Disciplina', estado: 'publicado' },
        { id: 'g3', media: 'img/interior.jpg', mediaTipo: 'image', sede: 'manchay', categoria: 'Sedes', titulo: 'Nuestra sala', estado: 'publicado' },
        { id: 'g4', media: 'img/clase.jpg', mediaTipo: 'image', sede: 'vmt', categoria: 'Clases', titulo: 'Funcional', estado: 'publicado' },
        { id: 'g5', media: 'img/coach.jpg', mediaTipo: 'image', sede: 'manchay', categoria: 'Entrenamiento', titulo: 'Coaching', estado: 'publicado' },
        { id: 'g6', media: 'img/grip.jpg', mediaTipo: 'image', sede: 'vmt', categoria: 'Entrenamiento', titulo: 'Grip', estado: 'publicado' }
      ],
      // Contraseñas guardadas cifradas (hash SHA-256 con sal). Nunca en texto plano.
      usuarios: [
        { id: 'u1', nombre: 'Administrador', email: 'admin@santosstrength.pe', rol: 'admin', sede: 'todas', activo: true, salt: 'b8340a7582033880', hash: '0691fcdf93cdb1825fd7da5c8448304b44ef698e5f20d4cfba867b5d4d9f0e76', debeCambiar: true },
        { id: 'u2', nombre: 'Recepción Manchay', email: 'manchay@santosstrength.pe', rol: 'recepcion', sede: 'manchay', activo: true, salt: '24e1cef70e29c74e', hash: '6b6ce605215bab868971f2c6575e0c74483eb31897e5419e1eedf1eeac6a9384', debeCambiar: true },
        { id: 'u3', nombre: 'Recepción Villa María', email: 'villamaria@santosstrength.pe', rol: 'recepcion', sede: 'vmt', activo: true, salt: '56b1c02d21467ce3', hash: '7c2198cf858ce52547a9796cd175bb6e894c9bb0aed4f9d0a76e226db2e5bad2', debeCambiar: true },
        { id: 'u4', nombre: 'Encargada Cafetín', email: 'cafetin@santosstrength.pe', rol: 'cafetin', sede: 'todas', activo: true, salt: '69f71c2ea90ea2a8', hash: 'e52b4782ad0ef415ad74aacbe1d767048b56864866f3aa090083685c34b7bafd', debeCambiar: true }
      ],
      actividad: [{ t: Date.now() - 86400000, quien: 'Recepción Manchay', que: 'publicó el evento «Reto Deadlift Santos»' }]
    };
  }

  // ---------- Seguridad ----------
  async function sha256(txt) {
    if (crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 0; for (const c of txt) h = (h * 31 + c.charCodeAt(0)) | 0; return 'x' + h; // respaldo mínimo
  }
  async function hashPass(pass, salt) { return sha256(salt + '::' + pass + '::santos'); }
  async function setPass(u, pass) { u.salt = uid() + uid(); u.hash = await hashPass(pass, u.salt); delete u.temp; }
  async function checkPass(u, pass) { return !!u.hash && (await hashPass(pass, u.salt)) === u.hash; }
  const passOK = (p) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

  // Claves de contenido que viven en la nube (tabla 'contenido').
  const CLAVES = ['config', 'sedes', 'planes', 'pase', 'notaPlanes', 'entrenadores', 'clases', 'nutricion', 'cafetin', 'publicaciones', 'galeria'];
  const B = () => window.SS_BACKEND;

  const vacio = (v) => Array.isArray(v) ? [] : typeof v === 'string' ? '' : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([a, b]) => [a, vacio(b)])) : v;
  async function load() {
    if (B()) {
      try {
        const base = seed(), nube = await B().cargar();      // trae lo que ya hay en la nube
        for (const k of CLAVES) {                            // primera vez: siembra lo que falte
          if (nube[k] === undefined) nube[k] = vacio(base[k]);   // negocio nuevo: misma forma, sin datos de ejemplo
        }
        nube.version = VERSION;
        return nube;
      } catch (e) { console.warn('Backend no disponible:', e); throw e; }
    }
    let data = await get('data');
    if (!data || data.version !== VERSION) {
      data = seed();
      await set('data', data);
    }
    return data;
  }
  async function save(data) {
    if (B()) {
      try { await Promise.all(CLAVES.map((k) => data[k] !== undefined && B().guardarClave(k, data[k]))); return; }
      catch (e) { console.warn('No se pudo guardar en la nube:', e); }
    }
    await set('data', data); try { localStorage.setItem('ss-ping', Date.now()); } catch (e) {}
  }
  async function reset() { await set('data', null); return load(); }

  function vigente(p) { const t = today(); return p.estado === 'publicado' && (!p.inicio || p.inicio <= t) && (!p.fin || p.fin >= t); }
  const waLink = (n, t) => 'https://wa.me/' + String(n).replace(/\D/g, '') + '?text=' + encodeURIComponent(t);

  window.SS = { load, save, reset, get, set, putMedia, mediaUrl, uid, today, vigente, waLink, setPass, checkPass, passOK };
})();
