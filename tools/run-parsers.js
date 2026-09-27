// Prueba los lectores de apps-script/Parsers.js con los Excel exportados en tools/fixtures.
// Uso: node tools/run-parsers.js [--json]
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../apps-script/Parsers.js'), 'utf8'), ctx);

const FUENTES = {
  'VMC.json': 'vmc',
  '02_Programa_Acomodación_Los_Romeros_2026.json': 'acomodacion',
  'Pogramas Reunion Publica.json': 'finsemana',
  'Predicación.json': 'predicacion',
};
const soloPeriodos = { finsemana: /^(sept|oct) 26$/, predicacion: /SEPTIEMBRE CAMPAÑA/, acomodacion: /Septiembre/, vmc: /./ };

function display(values) {
  return values.map(r => r.map(v => v && v.$t ? v.$t : v && v.$d ? v.$d : String(v ?? '')));
}
const resultado = {};
for (const [archivo, prog] of Object.entries(FUENTES)) {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', archivo), 'utf8'));
  resultado[prog] = [];
  for (const sh of data.sheets) {
    if (sh.hidden || !soloPeriodos[prog].test(sh.name)) continue;
    const p = ctx.LECTORES[prog]({ name: sh.name, values: sh.values, display: display(sh.values) });
    resultado[prog].push(p);
  }
}
if (process.argv.includes('--json')) { fs.writeFileSync(path.join(__dirname, 'out', 'parsed.json'), JSON.stringify(resultado, null, 1)); process.exit(0); }
for (const [prog, periodos] of Object.entries(resultado)) {
  for (const p of periodos) {
    console.log(`\n##### ${prog} · ${p.periodo} · ${p.reuniones.length} reuniones ${p.avisos.join(' ')}`);
    for (const r of p.reuniones) {
      console.log(`  ${r.fecha} ${r.hora || ''} ${r.titulo}${r.lugar ? ' @ ' + r.lugar : ''}${r.nota ? ' [' + r.nota + ']' : ''}`);
      for (const s of r.secciones) {
        if (s.titulo) console.log(`    -- ${s.titulo}`);
        for (const f of s.filas) console.log(`      ${f.texto}${f.detalle ? ' (' + f.detalle + ')' : ''}: ${f.asignados.map(a => `${a.nombre} <${a.rol}${a.sala ? ', ' + a.sala : ''}${a.externo ? ', externo' : ''}> {${a.slot}}`).join(' | ')}`);
      }
    }
  }
}
