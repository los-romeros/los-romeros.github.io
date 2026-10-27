/**
 * S-13 · Registro de asignación de territorio.
 *
 * Planilla propia (Inicio ▸ s13Planilla = su URL):
 *  - "Historial": una fila por vuelta completa de un territorio.
 *      Territorio | Asignado a | Fecha en que se asignó | Fecha en que se completó | Origen | Notas
 *    Las filas con Origen "Manual" se respetan siempre (S-13 en papel o correcciones a mano).
 *    Las "Automático" se recalculan con el registro de predicación, después de la última vuelta manual de cada territorio.
 *  - "S-13 AAAA": el formulario de cada año de servicio (septiembre a agosto), listo para imprimir.
 *
 * Una vuelta empieza la primera vez que se trabaja el territorio después de completado (encargado = quien
 * dirigió esa salida) y termina cuando se trabajaron todas sus manzanas. Si faltan solo 1 o 2 manzanas y ya se
 * volvió a trabajar la mitad o más del territorio, se da por completada en la última fecha antes de repetir.
 *
 * Inicio:
 *   s13Planilla = URL de la planilla
 *   s13Ven      = quiénes ven el S-13 en la app, además del responsable del programa de predicación
 *   s13Desde    = primer año de servicio que se muestra
 */

var TITULOS_S13 = ['Territorio', 'Asignado a', 'Fecha en que se asignó', 'Fecha en que se completó', 'Origen', 'Notas'];
var S13_BLOQUES = 4; // vueltas por fila del formulario
var S13_MAX_FALTAN = 2; // manzanas que pueden faltar para darlo por completado
var S13_MIN_TRABAJADO = 0.6; // y al menos esta parte del territorio trabajada
var S13_URL = 'https://docs.google.com/spreadsheets/d/1jHDXRv-sdQgRTp6zfYyPFdbMMLzgMiy3TMWpbWI5d2U/edit'; // si Inicio aún no tiene s13Planilla

function urlS13_(cfg) { return String(cfg.s13Planilla || S13_URL).trim(); }

function planillaS13_(cfg) {
  return SpreadsheetApp.openByUrl(urlS13_(cfg));
}

/** ¿Ve el S-13? El responsable del programa de predicación y quienes estén en Inicio ▸ s13Ven. */
function puedeVerS13_(yo, cfg, responsables) {
  if (!urlS13_(cfg)) return false;
  responsables = responsables || responsablesPredicacion_();
  if (yo.correo && responsables.indexOf(yo.correo) >= 0) return true;
  return String(cfg.s13Ven || 'Felipe Valderrama').split(/[,;]+/).map(norm_).filter(Boolean)
    .some(function (x) { return x === norm_(yo.nombre) || x === yo.correo; });
}

function responsablesPredicacion_() {
  var prog = leerTabla_('programas').filter(function (p) { return p['ID'] === 'predicacion'; })[0];
  return String(prog && prog['Responsable (correo)'] || '').toLowerCase().split(/[,;\s]+/).filter(Boolean);
}

function fechaS13_(iso) {
  if (!iso) return '';
  var p = String(iso).split('-');
  return p[2] + '/' + p[1] + '/' + p[0];
}

/** Lee una fecha del Historial (texto dd/mm/aaaa, fecha real o ISO) como ISO. */
function isoS13_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var s = String(v || '').trim(), m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s);
  if (m) return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + pad2_(+m[2]) + '-' + pad2_(+m[1]);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
}

/** Nombre de quien registró: por su correo en Personas o, si usa otro correo, por el nombre que se lee en él. */
function nombrePorCorreo_(correo, personas) {
  correo = String(correo || '').trim().toLowerCase();
  if (!correo) return '';
  var exacto = personas.filter(function (p) { return p.correo === correo; })[0];
  if (exacto) return exacto.nombre;
  var local = norm_(correo.split('@')[0]).replace(/[^a-z]/g, '');
  var mejor = null, empate = false;
  personas.forEach(function (p) {
    var puntos = 0;
    norm_(p.nombre).split(' ').forEach(function (t) {
      var consonantes = t.replace(/[aeiou]/g, ''); // "drgtt" = Droguett
      if (t.length >= 4 && local.indexOf(t) >= 0) puntos += t.length;
      else if (consonantes.length >= 4 && local.indexOf(consonantes) >= 0) puntos += consonantes.length;
    });
    if (puntos < 5) return;
    if (!mejor || puntos > mejor.puntos) { mejor = { nombre: p.nombre, puntos: puntos }; empate = false; }
    else if (puntos === mejor.puntos && p.nombre !== mejor.nombre) empate = true;
  });
  return mejor && !empate ? mejor.nombre : correo.split('@')[0];
}

/**
 * Vueltas automáticas de cada territorio.
 * regs: [{ fecha, territorio, manzanas[], correo }], totales: { '8': ['A',…] },
 * manuales: [{ territorio, completado }], encargadoDe(territorio, fecha, correo) -> nombre.
 * Devuelve [{ territorio, asignado, inicio, termino ('' si sigue en curso), notas }].
 */
function calcularVueltasS13_(regs, totales, manuales, encargadoDe) {
  var out = [];
  Object.keys(totales).sort(function (a, b) { return +a - +b; }).forEach(function (t) {
    var todas = totales[t].map(function (m) { return String(m).trim().toUpperCase(); });
    if (!todas.length) return;
    var desde = manuales.filter(function (x) { return x.territorio === t && x.completado; })
      .reduce(function (max, x) { return x.completado > max ? x.completado : max; }, '');
    // Un día = todas las manzanas trabajadas esa fecha (puede haber varios registros)
    var dias = {};
    regs.forEach(function (g) {
      if (g.territorio !== t || g.fecha <= desde) return;
      var ms = g.manzanas.map(function (m) { return String(m).trim().toUpperCase(); }).filter(function (m) { return todas.indexOf(m) >= 0; });
      if (!ms.length) return;
      var d = dias[g.fecha] = dias[g.fecha] || { fecha: g.fecha, manzanas: {}, correo: g.correo };
      ms.forEach(function (m) { d.manzanas[m] = true; });
    });
    var seq = Object.keys(dias).sort().map(function (f) { return { fecha: f, manzanas: Object.keys(dias[f].manzanas), correo: dias[f].correo }; });
    var minRepetidas = Math.max(2, Math.ceil(todas.length / 2));
    var i = 0, inicio = -1, hechas = {}, nHechas = 0, ultima = '', repetidas = {}, nRep = 0, desdeRep = -1;
    var cerrar = function (termino, faltan) {
      var d = seq[inicio];
      out.push({ territorio: t, asignado: encargadoDe(t, d.fecha, d.correo), inicio: d.fecha, termino: termino,
        notas: faltan.length ? 'Se dio por completado (faltó ' + faltan.join(', ') + ')' : '' });
      inicio = -1;
    };
    while (i < seq.length) {
      var d = seq[i];
      if (inicio < 0) { inicio = i; hechas = {}; nHechas = 0; repetidas = {}; nRep = 0; desdeRep = -1; }
      var nuevas = d.manzanas.filter(function (m) { return !hechas[m]; });
      if (!nuevas.length) {
        // Se está repitiendo lo ya trabajado: ¿comenzó otra vuelta aunque falten 1 o 2?
        if (desdeRep < 0) desdeRep = i;
        d.manzanas.forEach(function (m) { if (!repetidas[m]) { repetidas[m] = true; nRep++; } });
        var faltan = todas.filter(function (m) { return !hechas[m]; });
        if (faltan.length <= S13_MAX_FALTAN && nHechas >= S13_MIN_TRABAJADO * todas.length && nRep >= minRepetidas) {
          cerrar(ultima, faltan);
          i = desdeRep;
          continue;
        }
      } else {
        nuevas.forEach(function (m) { hechas[m] = true; nHechas++; });
        ultima = d.fecha; repetidas = {}; nRep = 0; desdeRep = -1;
        if (nHechas >= todas.length) cerrar(d.fecha, []);
      }
      i++;
    }
    if (inicio >= 0) {
      var pend = todas.filter(function (m) { return !hechas[m]; });
      out.push({ territorio: t, asignado: encargadoDe(t, seq[inicio].fecha, seq[inicio].correo), inicio: seq[inicio].fecha, termino: '',
        notas: 'En curso · faltan ' + pend.join(', ') });
    }
  });
  return out;
}

/**
 * Valores y celdas combinadas del formulario de un año de servicio.
 * vueltas: [{ territorio, asignado, inicio, termino }] (todas), territorios: ['1','2',…].
 * Devuelve { valores: [[…10 columnas]], combinar: [[fila, col, filas, cols]] } (fila y col desde 1).
 */
function paginaS13_(anio, vueltas, territorios, actualizado) {
  var ini = (anio - 1) + '-09-01', fin = anio + '-08-31';
  var vacia = function () { return ['', '', '', '', '', '', '', '', '', '']; };
  var valores = [], combinar = [];
  var fila = function (v) { valores.push(v); return valores.length; };
  var r = fila(vacia()); valores[r - 1][0] = 'REGISTRO DE ASIGNACIÓN DE TERRITORIO'; combinar.push([r, 1, 1, 10]);
  r = fila(vacia()); valores[r - 1][0] = 'Año de servicio:'; valores[r - 1][2] = String(anio);
  valores[r - 1][4] = '(septiembre ' + (anio - 1) + ' a agosto ' + anio + ')';
  combinar.push([r, 1, 1, 2], [r, 5, 1, 6]);
  fila(vacia());
  r = fila(['Núm. de terr.', 'Última fecha en que se completó*', 'Asignado a', '', 'Asignado a', '', 'Asignado a', '', 'Asignado a', '']);
  fila(['', '', 'Fecha en que se asignó', 'Fecha en que se completó', 'Fecha en que se asignó', 'Fecha en que se completó',
    'Fecha en que se asignó', 'Fecha en que se completó', 'Fecha en que se asignó', 'Fecha en que se completó']);
  combinar.push([r, 1, 2, 1], [r, 2, 2, 1], [r, 3, 1, 2], [r, 5, 1, 2], [r, 7, 1, 2], [r, 9, 1, 2]);
  territorios.forEach(function (t) {
    var propias = vueltas.filter(function (v) { return v.territorio === t; });
    var delAnio = propias.filter(function (v) { return v.inicio >= ini && v.inicio <= fin; })
      .sort(function (a, b) { return a.inicio.localeCompare(b.inicio); });
    var previa = propias.filter(function (v) { return v.termino && v.termino < ini; })
      .reduce(function (max, v) { return v.termino > max ? v.termino : max; }, '');
    var grupos = [];
    for (var k = 0; k < Math.max(1, delAnio.length); k += S13_BLOQUES) grupos.push(delAnio.slice(k, k + S13_BLOQUES));
    grupos.forEach(function (g, gi) {
      var a = vacia(), b = vacia();
      a[0] = t; a[1] = gi === 0 ? fechaS13_(previa) : '';
      g.forEach(function (v, j) { a[2 + 2 * j] = v.asignado; b[2 + 2 * j] = fechaS13_(v.inicio); b[3 + 2 * j] = fechaS13_(v.termino); });
      var ra = fila(a); fila(b);
      combinar.push([ra, 1, 2, 1], [ra, 2, 2, 1], [ra, 3, 1, 2], [ra, 5, 1, 2], [ra, 7, 1, 2], [ra, 9, 1, 2]);
    });
  });
  fila(vacia());
  r = fila(vacia()); valores[r - 1][0] = '*Cuando comience una nueva página, anote en esta columna la última fecha en que los territorios se completaron.'; combinar.push([r, 1, 1, 10]);
  r = fila(vacia()); valores[r - 1][0] = 'S-13-S · Se completa solo con el registro de predicación' + (actualizado ? ' · actualizado el ' + actualizado : ''); combinar.push([r, 1, 1, 10]);
  return { valores: valores, combinar: combinar };
}

/** Recalcula el Historial y rehace los formularios. Corre una vez al día y al abrir el S-13 en la app. */
function actualizarS13_(cfg) {
  var ss = planillaS13_(cfg);
  var reg = planillaRegistro_(cfg);
  if (!reg) throw new Error('Falta configurar la planilla del registro de predicación.');
  var totales = manzanasPorTerritorio_(reg);
  var regs = leerRegistros_(reg);

  var hist = ss.getSheetByName('Historial') || ss.insertSheet('Historial', 0);
  var v = hist.getDataRange().getValues();
  var manuales = v.slice(1).filter(function (r) { return r[0] !== '' && /^manual/i.test(String(r[4])); }).map(function (r) {
    return { territorio: String(r[0]).replace(/\.0$/, ''), asignado: String(r[1] || ''), inicio: isoS13_(r[2]), termino: isoS13_(r[3]), notas: String(r[5] || ''), origen: String(r[4]) };
  });
  manuales.forEach(function (m) { m.completado = m.termino; });

  // Encargado: quien dirigió la salida de ese día en ese territorio (programa) o, si no está, quien la registró
  var salidas = {};
  leerTabla_('datos').forEach(function (d) {
    if (d['Programa'] !== 'predicacion') return;
    try {
      JSON.parse(d['JSON']).reuniones.forEach(function (r) { r.secciones.forEach(function (s) { s.filas.forEach(function (f) {
        var n = f.asignados[0] && f.asignados[0].nombre;
        if (n) territoriosDeDetalle_(f.detalle).forEach(function (t) { salidas[r.fecha + '|' + t] = salidas[r.fecha + '|' + t] || n; });
      }); }); });
    } catch (e) { /* periodo con otro formato */ }
  });
  var personas = directorio_().personas.map(function (p) { return { nombre: p.nombre, correo: String(p.correo || '').toLowerCase() }; });
  // Quien ya no está en Personas pero aparece en el S-13 anterior también se reconoce por su correo
  manuales.forEach(function (m) {
    if (m.asignado && !personas.some(function (p) { return norm_(p.nombre) === norm_(m.asignado); })) personas.push({ nombre: m.asignado, correo: '' });
  });
  var encargadoDe = function (t, fecha, correo) { return salidas[fecha + '|' + t] || nombrePorCorreo_(correo, personas); };

  var auto = calcularVueltasS13_(regs, totales, manuales, encargadoDe);
  var todas = manuales.map(function (m) { return { territorio: m.territorio, asignado: m.asignado, inicio: m.inicio, termino: m.termino, origen: m.origen, notas: m.notas }; })
    .concat(auto.map(function (a) { return { territorio: a.territorio, asignado: a.asignado, inicio: a.inicio, termino: a.termino, origen: 'Automático', notas: a.notas }; }))
    .sort(function (a, b) { return (+a.territorio - +b.territorio) || a.inicio.localeCompare(b.inicio); });

  var filas = [TITULOS_S13].concat(todas.map(function (x) { return [x.territorio, x.asignado, fechaS13_(x.inicio), fechaS13_(x.termino), x.origen, x.notas]; }));
  hist.getRange(1, 1, hist.getMaxRows(), TITULOS_S13.length).clearContent();
  hist.getRange(1, 1, filas.length, TITULOS_S13.length).setNumberFormat('@').setValues(filas);
  hist.getRange(1, 1, 1, TITULOS_S13.length).setFontWeight('bold').setBackground('#5e8499').setFontColor('#ffffff');
  hist.setFrozenRows(1);

  var territorios = Object.keys(totales).sort(function (a, b) { return +a - +b; });
  var hoy = hoyISO_(), actualizado = fechaS13_(hoy);
  for (var anio = +(cfg.s13Desde || 2026); anio <= anioServicio_(hoy); anio++) {
    escribirPaginaS13_(ss, anio, paginaS13_(anio, todas, territorios, actualizado), 2 + anio - +(cfg.s13Desde || 2026));
  }
  compartirS13_(ss, cfg);
  registrar_('S-13 actualizado', auto.length + ' vueltas automáticas, ' + manuales.length + ' manuales');
  return { ss: ss, vueltas: todas, territorios: territorios };
}

function escribirPaginaS13_(ss, anio, pag, posicion) {
  var nombre = 'S-13 ' + anio;
  var sh = nuevaHojaFormulario_(ss, nombre, [70, 110, 105, 105, 105, 105, 105, 105, 105, 105]);
  var n = pag.valores.length;
  if (sh.getMaxRows() < n) sh.insertRowsAfter(sh.getMaxRows(), n - sh.getMaxRows());
  var rango = sh.getRange(1, 1, n, 10);
  rango.setNumberFormat('@').setValues(pag.valores).setHorizontalAlignment('center').setFontSize(10).setWrap(true);
  pag.combinar.forEach(function (c) { sh.getRange(c[0], c[1], c[2], c[3]).merge(); });
  sh.getRange(1, 1).setFontSize(14).setFontWeight('bold');
  sh.getRange(2, 1, 1, 3).setFontWeight('bold');
  sh.getRange(2, 1).setHorizontalAlignment('right');
  sh.getRange(2, 3).setBorder(null, null, true, null, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(2, 5).setHorizontalAlignment('left').setFontColor('#666666');
  var cuerpo = n - 6; // la tabla va de la fila 4 hasta antes del pie (3 filas)
  sh.getRange(4, 1, 2, 10).setFontWeight('bold').setBackground('#eeeeee').setFontSize(9);
  bordes_(sh.getRange(4, 1, cuerpo, 10));
  contorno_(sh.getRange(4, 1, cuerpo, 10));
  for (var r = 6; r < 4 + cuerpo; r += 2) {
    sh.getRange(r, 1).setFontWeight('bold').setFontSize(12);
    sh.getRange(r + 1, 3, 1, 8).setFontSize(9);
  }
  sh.getRange(n - 1, 1, 2, 10).setHorizontalAlignment('left').setFontSize(8).setWrap(false);
  sh.setFrozenRows(5);
  // Las pestañas de los años, en orden después del Historial
  ss.setActiveSheet(sh); ss.moveActiveSheet(Math.min(ss.getSheets().length, posicion));
}

/** Da acceso de edición a quienes ven el S-13 (una vez por correo). */
function compartirS13_(ss, cfg) {
  var props = PropertiesService.getScriptProperties();
  var hechos = {};
  try { hechos = JSON.parse(props.getProperty('S13_COMPARTIDA') || '{}'); } catch (e) { hechos = {}; }
  var correos = {}, responsables = responsablesPredicacion_();
  directorio_().personas.forEach(function (p) {
    var c = String(p.correo || '').trim().toLowerCase();
    if (c && puedeVerS13_({ correo: c, nombre: p.nombre }, cfg, responsables)) correos[c] = true;
  });
  var nuevos = Object.keys(correos).filter(function (c) { return !hechos[c]; });
  if (!nuevos.length) return;
  nuevos.forEach(function (c) {
    try { ss.addEditor(c); hechos[c] = hoyISO_(); } catch (e) { console.warn('No se pudo compartir el S-13 con ' + c + ': ' + e.message); }
  });
  props.setProperty('S13_COMPARTIDA', JSON.stringify(hechos));
}

/** Acción "s13": vueltas del año de servicio para verlas en la app y enlace a la planilla. */
function resumenS13_(yo, p, cfg) {
  if (!puedeVerS13_(yo, cfg)) throw new Error('No tienes acceso al S-13.');
  var cache = CacheService.getScriptCache();
  var datos = null;
  if (!p.recalcular) { try { datos = JSON.parse(cache.get('s13') || 'null'); } catch (e) { datos = null; } }
  if (!datos) {
    var r = actualizarS13_(cfg);
    datos = { url: r.ss.getUrl(), territorios: r.territorios,
      vueltas: r.vueltas.map(function (x) { return { t: x.territorio, a: x.asignado, i: x.inicio, f: x.termino, n: x.notas, m: /^manual/i.test(x.origen) }; }) };
    try { cache.put('s13', JSON.stringify(datos), 3600); } catch (e) { /* muy grande para la caché */ }
  }
  var hoy = hoyISO_();
  return { ok: true, hoy: hoy, anioActual: anioServicio_(hoy), desde: +(cfg.s13Desde || 2026), url: datos.url, territorios: datos.territorios, vueltas: datos.vueltas };
}

function menuActualizarS13() {
  var r = actualizarS13_(config_());
  CacheService.getScriptCache().remove('s13');
  SpreadsheetApp.getUi().alert('S-13 actualizado: ' + r.vueltas.length + ' vueltas en el Historial.\n\n' + r.ss.getUrl());
}
