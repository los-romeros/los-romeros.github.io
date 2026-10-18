/**
 * Registro de predicación (capitanes) y resumen de territorios.
 *
 * Usa la planilla existente "Registro Predicación (Respuestas)" (Inicio ▸ registroPredicacion = su URL):
 *  - pestaña "Respuestas de formulario 1": Marca temporal | Correo | Fecha trabajada | Territorio | Manzanas | Notas
 *  - pestaña "Territorios y Manzanas": Territorio | Manzanas totales
 * La app agrega filas con el mismo formato que el formulario, así el formulario y el resumen actual siguen funcionando.
 */

var HOJA_RESPUESTAS_REGISTRO = 'Respuestas de formulario 1';
var HOJA_MANZANAS = 'Territorios y Manzanas';
var DIAS_REGISTRO_PENDIENTE = 30; // salidas más antiguas que esto ya no generan aviso

function planillaRegistro_(cfg) {
  if (!cfg.registroPredicacion) return null;
  try { return SpreadsheetApp.openByUrl(cfg.registroPredicacion); } catch (e) { return null; }
}

function isoDe_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(v));
  return m ? m[3] + '-' + pad2_(+m[2]) + '-' + pad2_(+m[1]) : String(v || '').slice(0, 10);
}

/** Registros: [{ ts, correo, fecha, territorio, manzanas[], notas }] */
function leerRegistros_(ss) {
  var sh = ss.getSheetByName(HOJA_RESPUESTAS_REGISTRO);
  if (!sh) return [];
  var v = sh.getDataRange().getValues();
  v.shift();
  return v.filter(function (r) { return r[2] && r[3] !== '' && isoDe_(r[2]) >= '2000'; }).map(function (r) {
    return {
      ts: r[0] instanceof Date ? r[0].getTime() : 0,
      correo: String(r[1] || '').toLowerCase(),
      fecha: isoDe_(r[2]),
      territorio: String(r[3]).replace(/\.0$/, ''),
      manzanas: String(r[4] || '').split(',').map(function (m) { return m.trim(); }).filter(Boolean),
      notas: String(r[5] || '')
    };
  });
}

/** { '8': ['A','B',…] } */
function manzanasPorTerritorio_(ss) {
  var out = {};
  var sh = ss && ss.getSheetByName(HOJA_MANZANAS);
  if (!sh) return out;
  var v = sh.getDataRange().getValues();
  v.shift();
  v.forEach(function (r) {
    if (r[0] === '' || r[0] == null) return;
    out[String(r[0]).replace(/\.0$/, '')] = String(r[1] || '').split(',').map(function (m) { return m.trim(); }).filter(Boolean);
  });
  return out;
}

/** Territorios numéricos mencionados en el detalle de la salida ("Territorio 19 y 21 · Grupo 3"). */
function territoriosDeDetalle_(detalle) {
  var m = /Territorio ([^·]+)/.exec(String(detalle || ''));
  if (!m) return [];
  return (m[1].match(/\d+/g) || []).filter(function (n) { return +n >= 1 && +n <= 99; });
}

/**
 * Salidas que encabezó el usuario y aún no tienen registro (de la app o del formulario).
 * `info` = mapa clave -> { programa, reunion, fila, asignado } de datosUsuario_.
 */
function registrosPendientes_(yo, info, cfg) {
  var hoy = hoyISO_(), desde = sumarDias_(hoy, -DIAS_REGISTRO_PENDIENTE);
  var ahora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm');
  var candidatas = [];
  Object.keys(info).forEach(function (clave) {
    var x = info[clave], r = x.reunion;
    if (x.programa.id !== 'predicacion' || r.fecha < desde || r.fecha > hoy) return;
    if (norm_(x.asignado.nombre) !== norm_(yo.nombre)) return;
    if (r.fecha === hoy && r.hora && sumarMinutos_(r.hora, 60) > ahora) return; // aún no termina
    var terrs = territoriosDeDetalle_(x.fila.detalle);
    if (!terrs.length) return; // Zoom, cartas, etc.
    candidatas.push({ clave: clave, fecha: r.fecha, hora: r.hora || '', lugar: r.lugar || '', territorios: terrs });
  });
  if (!candidatas.length) return [];
  var ss = planillaRegistro_(cfg);
  if (!ss) return [];
  var regs = leerRegistros_(ss);
  return candidatas.filter(function (c) {
    return !regs.some(function (g) {
      return g.fecha === c.fecha && (c.territorios.indexOf(g.territorio) >= 0 || (yo.correo && g.correo === yo.correo));
    });
  }).sort(function (a, b) { return a.fecha.localeCompare(b.fecha); });
}

function sumarMinutos_(hhmm, min) {
  var p = String(hhmm).split(':'), t = (+p[0]) * 60 + (+p[1]) + min;
  return pad2_(Math.floor(t / 60) % 24) + ':' + pad2_(t % 60);
}

function puedeVerTerritorios_(yo, cfg) {
  return enAudiencia_(cfg.territoriosVisiblePara || 'anciano, capitan', yo);
}

/** Acción "registrar": agrega una fila con el mismo formato del formulario. */
function registrarPredicacion_(yo, p, cfg) {
  var ss = planillaRegistro_(cfg);
  if (!ss) throw new Error('Falta configurar la planilla del registro de predicación.');
  var fecha = String(p.fecha || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error('Indica la fecha.');
  if (fecha > hoyISO_()) throw new Error('La fecha no puede ser futura.');
  var terr = String(p.territorio || '').replace(/\D/g, '');
  if (!terr) throw new Error('Elige el territorio.');
  var noSePredico = !!p.noSePredico;
  var validas = manzanasPorTerritorio_(ss)[terr] || [];
  var manzanas = noSePredico ? [] : (p.manzanas || []).filter(function (m) { return validas.indexOf(m) >= 0; });
  var notas = texto_(p.notas || '');
  if (noSePredico && !notas) notas = 'No se predicó';
  else if (noSePredico) notas = 'No se predicó. ' + notas;
  if (!noSePredico && !manzanas.length) throw new Error('Marca las manzanas trabajadas, o indica que no se predicó.');
  var sh = ss.getSheetByName(HOJA_RESPUESTAS_REGISTRO);
  sh.appendRow([new Date(), yo.correo, Utilities.parseDate(fecha, Session.getScriptTimeZone(), 'yyyy-MM-dd'), +terr, manzanas.join(', '), notas]);
  registrar_('Registro de predicación', yo.nombre + ': territorio ' + terr + ' · ' + fecha + ' · ' + (manzanas.join(', ') || 'no se predicó'));
  return { ok: true };
}

/** Acción "territorios": resumen por territorio para la vista de la app. */
function resumenTerritorios_(yo, cfg) {
  if (!puedeVerTerritorios_(yo, cfg)) throw new Error('No tienes acceso al resumen de territorios.');
  var ss = planillaRegistro_(cfg);
  if (!ss) throw new Error('Falta configurar la planilla del registro de predicación.');
  var regs = leerRegistros_(ss);
  var totales = manzanasPorTerritorio_(ss);
  var hoy = hoyISO_();
  var mesActual = hoy.slice(0, 7);
  var p = hoy.split('-');
  var prev = new Date(+p[0], +p[1] - 2, 1);
  var mesAnterior = prev.getFullYear() + '-' + pad2_(prev.getMonth() + 1);
  var desdeHistorial = sumarDias_(hoy, -120);

  var lista = Object.keys(totales).sort(function (a, b) { return +a - +b; }).map(function (t) {
    var propios = regs.filter(function (g) { return g.territorio === t; }).sort(function (a, b) { return (b.fecha + b.ts).localeCompare(a.fecha + a.ts); });
    var enMes = function (mes) {
      var s = {};
      propios.forEach(function (g) { if (g.fecha.slice(0, 7) === mes) g.manzanas.forEach(function (m) { s[m] = true; }); });
      return s;
    };
    var actual = enMes(mesActual), anterior = enMes(mesAnterior);
    var conManzanas = propios.filter(function (g) { return g.manzanas.length; });
    return {
      territorio: t,
      manzanas: totales[t],
      trabajadasMes: totales[t].filter(function (m) { return actual[m]; }),
      pendientesMes: totales[t].filter(function (m) { return !actual[m]; }),
      noTrabajadasMesAnterior: totales[t].filter(function (m) { return !anterior[m]; }),
      ultima: conManzanas.length ? conManzanas[0].fecha : '',
      historial: propios.filter(function (g) { return g.fecha >= desdeHistorial; }).slice(0, 25)
        .map(function (g) { return { fecha: g.fecha, manzanas: g.manzanas.join(', '), notas: g.notas }; })
    };
  });
  return { ok: true, hoy: hoy, mesActual: mesActual, mesAnterior: mesAnterior, territorios: lista };
}
