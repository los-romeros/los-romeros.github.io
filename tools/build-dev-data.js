// Genera web/dev-data.json (NO se publica) con el mismo formato que la API (accion=datos),
// a partir de los Excel exportados, para ver la app localmente con datos reales: ?demo
// Uso: node tools/build-dev-data.js [AAAA-MM-DD] ["Nombre del usuario de prueba"]
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const ctx = {}; vm.createContext(ctx);
for (const f of ['Parsers.js', 'Nombres.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../apps-script', f), 'utf8'), ctx);
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
const estados = {}, resumen = [], nombres = new Set();
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
          const x = { clave, rol: a.rol, sala: a.sala || '', grupo: a.grupo || null,
            nombre: a.externo ? a.nombre + (a.origen ? ' (' + a.origen + ')' : '') : a.nombre };
          if (clave && r.fecha >= hoy && r.fecha <= fin && ctx.norm_(a.nombre) === ctx.norm_(yo)) {
            resumen.push({ clave, programa: id, programaNombre: nombre, fecha: r.fecha, hora: r.hora, titulo: r.titulo, lugar: r.lugar,
              parte: f.texto, detalle: f.detalle, rol: a.rol, sala: a.sala || '', grupo: null, estado: estados[clave],
              puedeResponder: confirmacion });
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
resumen.sort((a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || '')));
const out = {
  ok: true, generado: new Date().toISOString(), hoy,
  usuario: { nombre: yo, correo: 'demo@example.com', rol: 'admin', privilegiado: true, editables: PROGS.map(p => p[0]), grupo: 4 },
  inicio: { congregacion: 'Congregación Los Romeros · Concón', mensaje: 'Bienvenidos. Aquí encontrarás los programas y asignaciones de la congregación.', aviso: '', direccion: 'Jardín Poniente 795, Concón' },
  resumen, programas, estados,
  personas: [...nombres].sort((a, b) => a.localeCompare(b, 'es')),
  enlaces: [{ titulo: 'Ejemplo: formulario de informe', url: 'https://forms.google.com', descripcion: 'Enlace de ejemplo', privilegiado: false },
            { titulo: 'Ejemplo: contenido para ancianos', url: 'https://drive.google.com', descripcion: 'Solo con privilegios', privilegiado: true }]
};
fs.writeFileSync(path.join(__dirname, '../web/dev-data.json'), JSON.stringify(out));
console.log('web/dev-data.json · resumen de', yo + ':', resumen.length, '·', programas.map(p => p.id + ':' + p.reuniones.length).join(' '));
