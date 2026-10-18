/**
 * Informe mensual de predicación.
 *
 * - Los informes de la app se guardan en una planilla propia ("Informes de predicación"), creada automáticamente.
 * - También se leen las respuestas de formularios antiguos (Inicio ▸ informesFormularios, URLs separadas por coma),
 *   para que quien informó por el formulario no vea el aviso ni aparezca como pendiente.
 * - Desde el día 1 se pide el informe del mes anterior; se puede corregir hasta el día 20 (Inicio ▸ informeEditableHasta).
 * - Ven los informes: superintendente y auxiliar de cada grupo (los de su grupo), el perfil secretario y el admin (todos).
 */

var MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
var TITULOS_INFORMES = ['Marca temporal', 'Correo', 'Nombre', 'Grupo', 'Mes', 'Servicio', 'Participó', 'Estudios', 'Horas', 'Comentarios', 'Ingresado por', 'Horas otros servicios'];
var SERVICIOS = ['Publicador', 'Precursor Auxiliar', 'Precursor Regular'];

function planillaInformes_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('INFORMES_ID');
  if (id) {
    try {
      var existente = SpreadsheetApp.openById(id);
      var hoja = existente.getSheetByName('Informes');
      if (hoja && hoja.getLastColumn() < TITULOS_INFORMES.length) {
        hoja.getRange(1, 1, 1, TITULOS_INFORMES.length).setValues([TITULOS_INFORMES]).setFontWeight('bold').setBackground('#5e8499').setFontColor('#ffffff');
      }
      return existente;
    } catch (e) { /* se vuelve a crear */ }
  }
  var ss = SpreadsheetApp.create('Informes de predicación');
  var sh = ss.getSheets()[0];
  sh.setName('Informes');
  sh.getRange(1, 1, 1, TITULOS_INFORMES.length).setValues([TITULOS_INFORMES]).setFontWeight('bold').setBackground('#5e8499').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.getRange('E:E').setNumberFormat('@');
  props.setProperty('INFORMES_ID', ss.getId());
  registrar_('Planilla de informes creada', ss.getUrl());
  return ss;
}

/** Mes que se debe informar ahora ('AAAA-MM' del mes anterior). */
function mesAInformar_() {
  var p = hoyISO_().split('-');
  var d = new Date(+p[0], +p[1] - 2, 1);
  return d.getFullYear() + '-' + pad2_(d.getMonth() + 1);
}

function nombreMes_(ym) { return MESES_LARGOS[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4); }

/** Todos los informes conocidos: los de la app y los de formularios antiguos. [{ nombre, mes, servicio, participo, estudios, horas, comentarios, origen, fila }] */
function leerInformes_(cfg, dir) {
  var out = [];
  var sh = planillaInformes_().getSheetByName('Informes');
  var v = sh.getDataRange().getValues();
  v.shift();
  v.forEach(function (r, i) {
    if (!r[2] || !r[4]) return;
    out.push({ ts: r[0], correo: String(r[1] || '').toLowerCase(), nombre: r[2], grupo: +r[3] || null, mes: String(r[4]), servicio: r[5], participo: r[6],
      estudios: r[7], horas: r[8], comentarios: r[9], ingresadoPor: r[10], otros: r[11] || '', origen: 'app', fila: i + 2 });
  });
  String(cfg.informesFormularios || '').split(/[,\s]+/).filter(function (u) { return u.indexOf('http') === 0; }).forEach(function (url) {
    try {
      var hoja = SpreadsheetApp.openByUrl(url).getSheets()[0];
      var vv = hoja.getDataRange().getValues();
      var tit = vv.shift().map(norm_);
      var c = function (re) { for (var k = 0; k < tit.length; k++) if (re.test(tit[k])) return k; return -1; };
      var cTs = c(/marca temporal/), cNom = c(/nombre/), cServ = c(/servicio/), cPart = c(/particip/), cHoras = c(/horas/), cCom = c(/comentario/), cMes = c(/mes/), cEst = c(/estudio/);
      vv.forEach(function (r) {
        if (!r[cNom] || !r[cMes]) return;
        var ts = r[cTs] instanceof Date ? r[cTs] : new Date();
        var m = MESES_LARGOS.map(norm_).indexOf(norm_(r[cMes]));
        if (m < 0) return;
        var anio = ts.getFullYear() - (m > ts.getMonth() ? 1 : 0);
        var persona = reconocer_(nombreFormulario_(r[cNom]), dir);
        out.push({ ts: ts, correo: '', nombre: persona ? persona.nombre : nombreFormulario_(r[cNom]), grupo: persona ? +persona.grupo || null : null,
          mes: anio + '-' + pad2_(m + 1), servicio: r[cServ], participo: r[cPart], estudios: r[cEst], horas: r[cHoras], comentarios: r[cCom], origen: 'formulario' });
      });
    } catch (e) {
      console.warn('No se pudo leer el formulario de informes ' + url + ': ' + e.message);
    }
  });
  return out;
}

/** "Valderrama, Déborah de" -> "Déborah de Valderrama" */
function nombreFormulario_(t) {
  var p = String(t || '').split(',');
  return p.length > 1 ? texto_(p.slice(1).join(' ') + ' ' + p[0]) : texto_(t);
}

/** Último informe de una persona para un mes (el más reciente gana). */
function informeDe_(informes, nombre, mes) {
  var lista = informes.filter(function (x) { return x.mes === mes && norm_(x.nombre) === norm_(nombre); });
  lista.sort(function (a, b) { return new Date(b.ts) - new Date(a.ts); });
  return lista[0] || null;
}

function editableHasta_(cfg, mes) {
  // El informe del mes M se corrige hasta el día N del mes M+1
  var p = mes.split('-');
  var d = new Date(+p[0], +p[1], +(cfg.informeEditableHasta || 20));
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/** Grupos cuyos informes puede ver el usuario: [] ninguno, 'todos' o lista de números. */
function gruposVisiblesInformes_(yo) {
  if (yo.rol === 'admin' || yo.perfiles.indexOf('secretario') >= 0) return 'todos';
  var out = [];
  leerTabla_('grupos').forEach(function (g) {
    if (norm_(g['Superintendente']) === norm_(yo.nombre) || norm_(g['Auxiliar']) === norm_(yo.nombre)) out.push(+g['Grupo']);
  });
  return out;
}

/** Estado del informe del usuario para la pantalla de inicio. */
function estadoInforme_(yo, cfg) {
  var mes = mesAInformar_();
  var dir = directorio_();
  var informes = leerInformes_(cfg, dir);
  var mio = informeDe_(informes, yo.nombre, mes);
  var ultimo = informes.filter(function (x) { return norm_(x.nombre) === norm_(yo.nombre); })
    .sort(function (a, b) { return new Date(b.ts) - new Date(a.ts); })[0];
  var persona = dir.personas.filter(function (p) { return norm_(p.nombre) === norm_(yo.nombre); })[0];
  var hasta = editableHasta_(cfg, mes);
  var grupos = gruposVisiblesInformes_(yo);
  return {
    mes: mes, mesNombre: nombreMes_(mes),
    enviado: mio ? { servicio: mio.servicio, participo: mio.participo, estudios: mio.estudios, horas: mio.horas, otros: mio.otros || '', comentarios: mio.comentarios, origen: mio.origen } : null,
    editable: hoyISO_() <= hasta, editableHasta: hasta,
    servicio: (mio && mio.servicio) || (ultimo && ultimo.servicio) || (persona && persona.servicio) || 'Publicador',
    verGrupos: grupos === 'todos' || grupos.length > 0
  };
}

/** Acción "informe": guarda el informe propio, o el de otra persona si el usuario ve su grupo. */
function guardarInforme_(yo, p, cfg) {
  var mes = String(p.mes || mesAInformar_());
  if (!/^\d{4}-\d{2}$/.test(mes)) throw new Error('Mes inválido');
  var dir = directorio_();
  var nombre = yo.nombre, grupo = yo.grupo, correo = yo.correo, ingresadoPor = '';
  if (p.nombre && norm_(p.nombre) !== norm_(yo.nombre)) {
    var persona = reconocer_(p.nombre, dir);
    if (!persona) throw new Error('No encontré a esa persona en el directorio.');
    var grupos = gruposVisiblesInformes_(yo);
    if (grupos !== 'todos' && grupos.indexOf(+persona.grupo) < 0) throw new Error('Solo puedes ingresar informes de tu grupo.');
    nombre = persona.nombre; grupo = +persona.grupo || null; correo = persona.correo; ingresadoPor = yo.nombre;
  }
  var informes = leerInformes_(cfg, dir);
  var previo = informeDe_(informes, nombre, mes);
  if (previo && hoyISO_() > editableHasta_(cfg, mes) && !ingresadoPor) throw new Error('El plazo para corregir este informe terminó. Habla con tu superintendente de grupo.');
  var servicio = SERVICIOS.indexOf(p.servicio) >= 0 ? p.servicio : 'Publicador';
  var participo = p.participo === 'No' ? 'No' : 'Sí';
  var estudios = Math.max(0, Math.min(99, parseInt(p.estudios, 10) || 0));
  var horas = /precursor/i.test(servicio) ? Math.max(0, Math.min(300, parseFloat(String(p.horas).replace(',', '.')) || 0)) : '';
  // Horas de otros servicios (LDC, Escuela, etc.): solo precursores regulares, y con nota obligatoria
  var otros = servicio === 'Precursor Regular' ? Math.max(0, Math.min(300, parseFloat(String(p.otros || '').replace(',', '.')) || 0)) : 0;
  var comentarios = texto_(p.comentarios || '').slice(0, 500);
  if (otros > 0 && !comentarios) throw new Error('Indica en comentarios a qué corresponden las horas de otros servicios (por ejemplo, LDC).');
  var fila = [new Date(), correo, nombre, grupo || '', mes, servicio, participo, estudios, horas, comentarios, ingresadoPor, otros || ''];
  var sh = planillaInformes_().getSheetByName('Informes');
  if (previo && previo.origen === 'app') sh.getRange(previo.fila, 1, 1, fila.length).setValues([fila]);
  else sh.appendRow(fila);
  registrar_('Informe de predicación', (ingresadoPor ? ingresadoPor + ' por ' : '') + nombre + ' · ' + nombreMes_(mes));
  return { ok: true };
}

/** Acción "informes": estado de los informes de un mes para los grupos que el usuario puede ver. */
function informesGrupos_(yo, p, cfg) {
  var grupos = gruposVisiblesInformes_(yo);
  if (grupos !== 'todos' && !grupos.length) throw new Error('No tienes acceso a los informes.');
  var mes = /^\d{4}-\d{2}$/.test(String(p.mes || '')) ? p.mes : mesAInformar_();
  var dir = directorio_();
  var informes = leerInformes_(cfg, dir);
  var personas = dir.personas.filter(function (x) {
    var g = +x.grupo;
    return g && (grupos === 'todos' || grupos.indexOf(g) >= 0);
  });
  var porGrupo = {};
  personas.forEach(function (x) {
    var inf = informeDe_(informes, x.nombre, mes);
    (porGrupo[+x.grupo] = porGrupo[+x.grupo] || []).push({
      nombre: x.nombre,
      informe: inf ? { servicio: inf.servicio, participo: inf.participo, estudios: inf.estudios, horas: inf.horas, otros: inf.otros || '', comentarios: inf.comentarios, origen: inf.origen, ingresadoPor: inf.ingresadoPor || '' } : null
    });
  });
  var lista = Object.keys(porGrupo).sort(function (a, b) { return +a - +b; }).map(function (g) {
    var miembros = porGrupo[g].sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
    var hechos = miembros.filter(function (m) { return m.informe; });
    return {
      grupo: +g,
      miembros: miembros,
      enviados: hechos.length,
      participaron: hechos.filter(function (m) { return /^s/i.test(String(m.informe.participo)); }).length,
      horas: hechos.reduce(function (s, m) { return s + (+m.informe.horas || 0); }, 0),
      otros: hechos.reduce(function (s, m) { return s + (+m.informe.otros || 0); }, 0),
      estudios: hechos.reduce(function (s, m) { return s + (+m.informe.estudios || 0); }, 0)
    };
  });
  return { ok: true, mes: mes, mesNombre: nombreMes_(mes), mesAnterior: (function () { var q = mes.split('-'); var d = new Date(+q[0], +q[1] - 2, 1); return d.getFullYear() + '-' + pad2_(d.getMonth() + 1); })(), grupos: lista, servicios: SERVICIOS };
}
