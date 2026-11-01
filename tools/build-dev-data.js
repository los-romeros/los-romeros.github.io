// Genera web/dev-data.json (NO se publica) con el mismo formato que la API (accion=datos),
// a partir de los Excel exportados, para ver la app localmente con datos reales: ?demo
// Uso: node tools/build-dev-data.js [AAAA-MM-DD] ["Nombre del usuario de prueba"]
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const ctx = {}; vm.createContext(ctx);
for (const f of ['Parsers.js', 'Nombres.js', 'Calendario.js', 'Choques.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../apps-script', f), 'utf8'), ctx);
cp.execSync('node "' + path.join(__dirname, 'run-parsers.js') + '" --json');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'parsed.json'), 'utf8'));
const hoy = process.argv[2] || new Date().toISOString().slice(0, 10);
const yo = process.argv[3] || 'Felipe Valderrama';
const desde = ctx.sumarDias_(hoy, -7), hasta = ctx.sumarDias_(hoy, 120), fin = ctx.sumarDias_(hoy, 6);
const PROGS = [
  ['vmc', 'Reunión de entre semana', 'libro', true],
  ['finsemana', 'Reunión del fin de semana', 'atril', true],
  ['acomodacion', 'Acomodación y audio/video', 'audio', true],
  ['predicacion', 'Predicación', 'mapa', false],
  ['aseo', 'Aseo', 'escoba', false],
];
const ESTADOS = ['Confirmado', 'Pendiente', 'Confirmado', 'Rechazado', 'Confirmado'];
const estados = {}, resumen = [], misAsignaciones = [], nombres = new Set();
let n = 0;
const programas = PROGS.map(([id, nombre, icono, confirmacion]) => {
  const reuniones = [];
  for (const p of data[id] || []) for (const r of p.reuniones) {
    if (r.fecha < desde || r.fecha > hasta) continue;
    if (!r.hora && r.tipo !== 'salida') { const d = ctx.diaSemana_(r.fecha); r.hora = d === 0 || d === 6 ? '18:30' : '19:30'; }
    const reunion = {
      fecha: r.fecha, hora: r.hora, titulo: r.titulo, nota: r.nota, lugar: r.lugar, tipo: r.tipo || '', borrador: false, periodo: p.periodo,
      secciones: r.secciones.map(s => ({ titulo: s.titulo, filas: s.filas.map(f => ({ texto: f.texto, detalle: f.detalle,
        asignados: f.asignados.map(a => {
          const clave = a.externo ? '' : id + '|' + r.id + '|' + a.slot;
          if (clave) estados[clave] = confirmacion ? ESTADOS[n++ % ESTADOS.length] : 'Sin confirmación';
          if (!a.externo && !a.grupo) nombres.add(a.nombre);
          const x = { clave, rol: a.rol, sala: a.sala || '', grupo: a.grupo || null, sub: a.grupo ? 'Pablo Morales · Daniel Reyes' : a.externo ? a.origen || '' : '',
            nombre: a.nombre };
          if (clave && r.fecha >= hoy && ctx.norm_(a.nombre) === ctx.norm_(yo)) {
            (r.fecha <= fin ? [resumen, misAsignaciones] : [misAsignaciones]).forEach(l => l.push({ clave, programa: id, programaNombre: nombre, fecha: r.fecha, hora: r.hora, titulo: r.titulo, lugar: r.lugar,
              parte: f.texto, detalle: f.detalle, rol: a.rol, sala: a.sala || '', grupo: null, estado: estados[clave],
              puedeResponder: confirmacion }));
          }
          return x;
        }) })) }))
    };
    reuniones.push(reunion);
  }
  reuniones.sort((a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || '')));
  return { id, nombre, icono, descripcion: '', confirmacion, editable: true, borradores: [], reuniones };
});
// Ejemplo de periodo por aprobar
programas[0].borradores = [{ periodo: 'NOVIEMBRE (ejemplo)', desde: ctx.sumarDias_(hoy, 20), hasta: ctx.sumarDias_(hoy, 41), avisos: 'No reconocidos: Hector Riqelme' }];
[resumen, misAsignaciones].forEach(l => l.sort((a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || ''))));
const out = {
  ok: true, generado: new Date().toISOString(), hoy,
  usuario: { nombre: yo, correo: 'demo@example.com', rol: 'admin', privilegiado: true, editables: PROGS.map(p => p[0]), grupo: 4 },
  inicio: { congregacion: 'Congregación Los Romeros · Concón', mensaje: 'Bienvenidos. Aquí encontrarás los programas y asignaciones de la congregación.', direccion: 'Jardín Poniente 795, Concón',
    avisos: [{ titulo: 'Asamblea Regional', detalle: '9 al 11 de octubre', icono: 'megafono' }, { titulo: 'Visita del superintendente de circuito', detalle: '3 al 8 de noviembre', icono: 'grupo' }],
    zoom: { vmc: 'https://zoom.us/j/0000000000', finsemana: 'https://zoom.us/j/0000000000' } },
  resumen, misAsignaciones, programas, estados,
  personas: [...nombres].sort((a, b) => a.localeCompare(b, 'es')),
  enlaces: [{ titulo: 'Ejemplo: formulario de informe', url: 'https://forms.google.com', descripcion: 'Enlace de ejemplo', privilegiado: false },
            { titulo: 'Ejemplo: contenido para ancianos', url: 'https://drive.google.com', descripcion: 'Solo con privilegios', privilegiado: true }]
};
// Grupos (para elegir el grupo de aseo) y casas de predicación (admin); el usuario de prueba es dueño de las casas de su familia
out.grupos = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const apellido = ctx.norm_(yo).split(' ').pop(), casas = {};
programas.filter(p => p.id === 'predicacion').forEach(p => p.reuniones.forEach(r => {
  if (!r.lugar || /zoom|tel[eé]fono|cartas/i.test(r.lugar)) return;
  const f = r.secciones[0] && r.secciones[0].filas[0], fam = ((f && f.detalle || '').match(/^Familia ([^·]+)/) || [])[1] || '';
  const mia = ctx.norm_(fam).trim() === apellido;
  casas[r.lugar] = casas[r.lugar] || { lugar: r.lugar, familia: fam.trim(), duenos: mia ? [yo] : [], direccion: '', texto: '', lat: null, lng: null, confirmada: false, revisado: false };
  if (mia && r.fecha >= hoy) {
    const enc = f.asignados.map(a => a.nombre).join(', '), det = f.detalle.split(' · ').filter(x => !/^Familia /.test(x)).join(' · ');
    (r.fecha <= fin ? [resumen, misAsignaciones] : [misAsignaciones]).forEach(l => l.push({ clave: 'casa|' + r.fecha + '|' + r.hora, programa: 'predicacion', programaNombre: 'Predicación',
      fecha: r.fecha, hora: r.hora, titulo: r.titulo, lugar: r.lugar, ubic: '', parte: ['Encargado: ' + enc, det].filter(Boolean).join(' · '), detalle: '',
      rol: 'Salida desde tu casa', sala: '', grupo: null, estado: '', puedeResponder: false, casa: true }));
  }
}));
out.casas = Object.values(casas);
[resumen, misAsignaciones].forEach(l => l.sort((a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || ''))));
out.generarAcomodacion = { mes: '2026-11', nombre: 'noviembre 2026', listo: true, faltan: [] };
// Territorios, mapa y No pasar (con las manzanas de web/dev-territorios.json si existe)
out.documentos = { noPasar: true, mapa: true };
out.solicitudesNoPasar = { puedeSolicitar: true, porAprobar: [], mias: [] };
out.territorios = { puedeVer: true, manzanas: {} };
try { JSON.parse(fs.readFileSync(path.join(__dirname, '../web/dev-territorios.json'), 'utf8')).territorios.forEach(t => { out.territorios.manzanas[t.territorio] = t.manzanas; }); } catch (e) { /* sin territorios de prueba */ }
out.registrosPendientes = [];
// Asistencia: el usuario de prueba es encargado (?demo&acomodador lo muestra como acomodador)
out.asistencia = { puedeVer: true, encargado: true, porAprobar: 1, pendientes: [{ fecha: hoy, hora: '19:30', reunion: [0, 6].includes(ctx.diaSemana_(hoy)) ? 'Fin de semana' : 'Entre semana' }] };
// Choques, con la misma lógica del servidor
const filas = [];
programas.forEach(p => p.reuniones.forEach(r => r.secciones.forEach(s => s.filas.forEach(f => f.asignados.forEach(a => {
  if (!a.clave) return;
  filas.push({ Clave: a.clave, Programa: p.id, Fecha: r.fecha, Hora: r.hora || (p.id === 'acomodacion' ? (ctx.diaSemana_(r.fecha) === 6 ? '18:30' : '19:30') : ''),
    Reunión: r.fecha, Parte: f.texto, Rol: a.rol, Nombre: a.nombre, Reconocido: a.grupo ? 'Grupo' : 'Sí', Estado: 'Pendiente' });
})))));
ctx.leerTabla_ = () => PROGS.map(p => ({ ID: p[0], Nombre: p[1] }));
ctx.hoyISO_ = () => hoy;
ctx.PropertiesService = { getScriptProperties: () => ({ getProperty: () => null }) };
out.choques = ctx.choques_(filas, { duracionMin: 105 });
fs.writeFileSync(path.join(__dirname, '../web/dev-data.json'), JSON.stringify(out));
console.log('web/dev-data.json · resumen de', yo + ':', resumen.length, '· choques:', out.choques.length, '·', programas.map(p => p.id + ':' + p.reuniones.length).join(' '));
