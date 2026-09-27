// Genera web/dev-data.json (NO se publica) con el mismo formato que la API pública,
// a partir de los Excel exportados, para ver la app localmente con datos reales.
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const ctx = {}; vm.createContext(ctx);
for (const f of ['Parsers.js', 'Nombres.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../apps-script', f), 'utf8'), ctx);
cp.execSync('node "' + path.join(__dirname, 'run-parsers.js') + '" --json');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'parsed.json'), 'utf8'));
const hoy = process.argv[2] || new Date().toISOString().slice(0, 10);
const desde = ctx.sumarDias_(hoy, -7), hasta = ctx.sumarDias_(hoy, 120);
const PROGS = [
  ['vmc', 'Reunión de entre semana', 'libro', 'Vida y Ministerio Cristianos'],
  ['finsemana', 'Reunión del fin de semana', 'atril', 'Reunión pública, La Atalaya, hospitalidad y oradores que salen'],
  ['acomodacion', 'Acomodación y audio/video', 'audio', 'Acomodadores, micrófonos, plataforma, audio y video'],
  ['predicacion', 'Predicación', 'mapa', 'Reuniones para el servicio del campo'],
  ['aseo', 'Aseo', 'escoba', 'Limpieza del Salón después de cada reunión'],
];
const programas = PROGS.map(([id, nombre, icono, descripcion]) => {
  const reuniones = [];
  for (const p of data[id] || []) for (const r of p.reuniones) {
    if (r.fecha < desde || r.fecha > hasta) continue;
    if (!r.hora && r.tipo !== 'salida') { const d = ctx.diaSemana_(r.fecha); r.hora = d === 0 || d === 6 ? '18:30' : '19:30'; }
    reuniones.push({
      fecha: r.fecha, hora: r.hora, titulo: r.titulo, nota: r.nota, lugar: r.lugar, tipo: r.tipo || '',
      secciones: r.secciones.map(s => ({ titulo: s.titulo, filas: s.filas.map(f => ({ texto: f.texto, detalle: f.detalle,
        asignados: f.asignados.map(a => ({ rol: a.rol, sala: a.sala || '',
          nombre: a.grupo ? a.nombre : a.externo ? a.nombre + (a.origen ? ' (' + a.origen + ')' : '') : ctx.nombrePublico_(a.nombre) })) })) }))
    });
  }
  reuniones.sort((a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || '')));
  return { id, nombre, icono, descripcion, reuniones };
});
const out = {
  ok: true, generado: new Date().toISOString(), hoy,
  inicio: { congregacion: 'Congregación Los Romeros · Concón', mensaje: 'Bienvenidos. Aquí encontrarás los programas y asignaciones de la congregación.', aviso: 'Ejemplo de aviso: la semana del 5 de octubre es la Asamblea Regional.', direccion: 'Jardín Poniente 795, Concón' },
  programas,
  enlaces: [{ titulo: 'Ejemplo: formulario de informe', url: 'https://forms.google.com', descripcion: 'Enlace de ejemplo' }]
};
fs.writeFileSync(path.join(__dirname, '../web/dev-data.json'), JSON.stringify(out));
console.log('web/dev-data.json', programas.map(p => p.id + ':' + p.reuniones.length).join(' '));
