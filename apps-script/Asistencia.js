/**
 * Asistencia a las reuniones.
 *
 * Se guarda en la planilla "Asistencia a las reuniones" (se crea sola y se comparte con el secretario):
 *  - "Registro": una fila por reunión (fecha, reunión, presencial, Zoom y total).
 *  - "S-3", "S-88" y "S-1": los formularios listos para imprimir. Se llenan solos con fórmulas;
 *    arriba se elige el mes o el año de servicio.
 *  - "Listas" y "Datos S-1" (ocultas): meses para elegir y los totales de los informes de predicación.
 *
 * Inicio:
 *   asistenciaRegistran = quiénes registran la asistencia (además, quien tiene acomodación ese día)
 *   asistenciaVen       = quiénes ven el resumen (S-88) y pueden corregir cualquier reunión
 *   congregacionNombre, ciudad, provincia, numeroCongregacion = encabezado de los formularios
 */

var TITULOS_ASISTENCIA = ['Fecha', 'Reunión', 'Presencial', 'Zoom', 'Total', 'Mes', 'Año de servicio', 'Registrado por', 'Registrado el', 'Notas'];
var REUNIONES_ASISTENCIA = ['Entre semana', 'Fin de semana'];
var FORMATO_ASISTENCIA = '3'; // subir al cambiar el diseño de los formularios (se rehacen)
var MINUTOS_REGISTRO_ASISTENCIA = 45; // la asistencia se cuenta a mitad de la reunión

/** Año de servicio de una fecha: septiembre a agosto, con el número del año en que termina. */
function anioServicio_(iso) {
  var p = String(iso).split('-');
  return +p[1] >= 9 ? +p[0] + 1 : +p[0];
}

function mesNumero_(iso) { return +String(iso).slice(0, 4) * 100 + +String(iso).slice(5, 7); }

/* ------------------------------------------------------------------ */
/* Planilla                                                             */
/* ------------------------------------------------------------------ */

function planillaAsistencia_(cfg) {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('ASISTENCIA_ID');
  var ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create('Asistencia a las reuniones');
    props.setProperty('ASISTENCIA_ID', ss.getId());
    props.deleteProperty('ASISTENCIA_FORMATO');
    registrar_('Planilla de asistencia creada', ss.getUrl());
  }
  if (props.getProperty('ASISTENCIA_FORMATO') !== FORMATO_ASISTENCIA) {
    construirPlanillaAsistencia_(ss, cfg);
    props.setProperty('ASISTENCIA_FORMATO', FORMATO_ASISTENCIA);
  }
  compartirAsistencia_(ss, cfg);
  return ss;
}

/** Da acceso de edición al secretario (y a quienes ven el resumen) una sola vez por correo. */
function compartirAsistencia_(ss, cfg) {
  var cache = CacheService.getScriptCache();
  if (cache.get('asistencia-compartida')) return; // se revisa cada 6 horas
  cache.put('asistencia-compartida', '1', 21600);
  var props = PropertiesService.getScriptProperties();
  var hechos = {};
  try { hechos = JSON.parse(props.getProperty('ASISTENCIA_COMPARTIDA') || '{}'); } catch (e) { hechos = {}; }
  var nuevos = correosEnAudiencia_(cfg.asistenciaVen || 'secretario').filter(function (c) { return !hechos[c]; });
  if (!nuevos.length) return;
  nuevos.forEach(function (c) {
    try { ss.addEditor(c); hechos[c] = hoyISO_(); } catch (e) { console.warn('No se pudo compartir con ' + c + ': ' + e.message); }
  });
  props.setProperty('ASISTENCIA_COMPARTIDA', JSON.stringify(hechos));
}

function hojaAsistencia_(ss, nombre) {
  return ss.getSheetByName(nombre) || ss.insertSheet(nombre);
}

/** Crea (o rehace) las pestañas. "Registro" nunca se borra: solo se le asegura el encabezado. */
function construirPlanillaAsistencia_(ss, cfg) {
  var reg = hojaAsistencia_(ss, 'Registro');
  reg.getRange(1, 1, 1, TITULOS_ASISTENCIA.length).setValues([TITULOS_ASISTENCIA]).setFontWeight('bold').setBackground('#5e8499').setFontColor('#ffffff');
  reg.setFrozenRows(1);
  reg.getRange('A:A').setNumberFormat('yyyy-mm-dd');
  [110, 120, 90, 80, 80, 80, 120, 200, 150, 260].forEach(function (w, i) { reg.setColumnWidth(i + 1, w); });
  var primera = ss.getSheets()[0];
  if (primera.getName() !== 'Registro') { ss.setActiveSheet(reg); ss.moveActiveSheet(1); }
  ['Hoja 1', 'Sheet1', 'Hoja1'].forEach(function (n) { var h = ss.getSheetByName(n); if (h && ss.getSheets().length > 1) ss.deleteSheet(h); });

  actualizarListasAsistencia_(ss);
  construirS3_(ss, cfg);
  construirS88_(ss);
  construirS1_(ss, cfg);
  ['Listas', 'Datos S-1'].forEach(function (n) { var h = ss.getSheetByName(n); if (h) h.hideSheet(); });
}

/** Pestaña oculta con los meses (para elegir en S-3 y S-1) y los años de servicio (S-88). */
function actualizarListasAsistencia_(ss) {
  var sh = hojaAsistencia_(ss, 'Listas');
  var hoy = hoyISO_(), meses = [];
  var d = new Date(2025, 8, 1); // desde septiembre de 2025
  var hasta = new Date(+hoy.slice(0, 4), +hoy.slice(5, 7) + 12, 1);
  while (d < hasta) {
    meses.push([MESES_LARGOS[d.getMonth()] + ' ' + d.getFullYear(), d.getFullYear() * 100 + d.getMonth() + 1]);
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  }
  sh.clear();
  sh.getRange(1, 1, 1, 3).setValues([['Mes', 'Clave', 'Año de servicio']]);
  sh.getRange(2, 1, meses.length, 2).setValues(meses);
  var anios = [];
  for (var a = 2026; a <= anioServicio_(hoy) + 1; a++) anios.push([a]);
  sh.getRange(2, 3, anios.length, 1).setValues(anios);
  return { meses: meses.length, anios: anios.length };
}

function bordes_(rango) { rango.setBorder(true, true, true, true, true, true, '#000000', SpreadsheetApp.BorderStyle.SOLID); }
function contorno_(rango) { rango.setBorder(true, true, true, true, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID_MEDIUM); }

function nuevaHojaFormulario_(ss, nombre, anchos) {
  var sh = ss.getSheetByName(nombre);
  if (sh) { sh.clear(); sh.clearConditionalFormatRules(); sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).breakApart().clearDataValidations(); }
  else sh = ss.insertSheet(nombre);
  sh.setHiddenGridlines(true);
  anchos.forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).setFontFamily('Arial').setFontSize(11).setVerticalAlignment('middle');
  return sh;
}

function selectorMes_(sh, celda, listas) {
  var r = sh.getRange(celda);
  r.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(listas.getRange('A2:A'), true).setAllowInvalid(false).build());
  var hoy = hoyISO_();
  var p = new Date(+hoy.slice(0, 4), +hoy.slice(5, 7) - 2, 1); // mes anterior
  r.setValue(MESES_LARGOS[p.getMonth()] + ' ' + p.getFullYear()).setBackground('#fff8dc').setFontWeight('bold');
  return r;
}

/** S-3: asistencia de un mes, semana por semana. */
function construirS3_(ss, cfg) {
  var sh = nuevaHojaFormulario_(ss, 'S-3', [130, 95, 95, 95, 95, 95, 85, 95, 20, 90]);
  var listas = ss.getSheetByName('Listas');
  sh.getRange('A1:H1').merge().setValue('INFORME DE ASISTENCIA A LAS REUNIONES').setFontFamily('Georgia').setFontSize(17).setFontWeight('bold').setHorizontalAlignment('center');
  sh.getRange('A3:H4').merge().setValue('(La asistencia se contará una sola vez a mitad de cada reunión. Recuerden contar también a las personas aisladas o confinadas en casa que estén conectadas).')
    .setFontWeight('bold').setWrap(true).setVerticalAlignment('top');
  sh.setRowHeight(3, 24); sh.setRowHeight(4, 24);
  sh.getRange('A7').setValue('Nombre de la congregación:').setFontWeight('bold');
  sh.getRange('B7:D7').merge().setValue(cfg.congregacionNombre || 'Los Romeros').setBorder(null, null, true, null, null, null, '#000000', SpreadsheetApp.BorderStyle.DOTTED);
  sh.getRange('E7').setValue('Mes:').setFontWeight('bold').setHorizontalAlignment('right');
  sh.getRange('F7:H7').merge();
  selectorMes_(sh, 'F7', listas);
  sh.getRange('J7').setFormula('=IFERROR(VLOOKUP(F7,Listas!A:B,2,FALSE),"")').setFontColor('#ffffff');
  var enc = ['', 'Primera semana', 'Segunda semana', 'Tercera semana', 'Cuarta semana', 'Quinta semana', 'Total', 'Promedio'];
  sh.getRange('A9:H9').setValues([enc]).setFontWeight('bold').setHorizontalAlignment('center').setWrap(true);
  sh.setRowHeight(9, 46);
  [['Reunión de entre semana', 'Entre semana', 10], ['Reunión del fin de semana', 'Fin de semana', 11]].forEach(function (x) {
    var fila = x[2];
    sh.getRange(fila, 1).setValue(x[0]).setFontWeight('bold').setWrap(true);
    for (var n = 1; n <= 5; n++) {
      sh.getRange(fila, n + 1).setFormula('=IFERROR(INDEX(SORT(FILTER(Registro!$A$2:$E,Registro!$F$2:$F=$J$7,Registro!$B$2:$B="' + x[1] + '"),1,TRUE),' + n + ',5),"")');
    }
    sh.getRange(fila, 7).setFormula('=IF(COUNT(B' + fila + ':F' + fila + '),SUM(B' + fila + ':F' + fila + '),"")');
    sh.getRange(fila, 8).setFormula('=IF(COUNT(B' + fila + ':F' + fila + '),ROUND(AVERAGE(B' + fila + ':F' + fila + ')),"")');
    sh.setRowHeight(fila, 70);
  });
  sh.getRange('B10:H11').setHorizontalAlignment('center').setFontSize(13);
  bordes_(sh.getRange('A9:H11'));
  sh.getRange('A14').setValue('S-3-S   10/15').setFontSize(9);
}

/** S-88: registro anual (dos años de servicio lado a lado), entre semana y fin de semana. */
function construirS88_(ss) {
  var sh = nuevaHojaFormulario_(ss, 'S-88', [110, 80, 80, 85, 110, 80, 80, 85, 20, 120]);
  var listas = ss.getSheetByName('Listas');
  sh.getRange('A1:H1').merge().setValue('REGISTRO DE ASISTENCIA A LAS REUNIONES DE CONGREGACIÓN').setFontFamily('Georgia').setFontSize(14).setFontWeight('bold').setHorizontalAlignment('center');
  sh.getRange('J1').setValue('Año de servicio:').setFontWeight('bold');
  var sel = sh.getRange('J2');
  sel.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(listas.getRange('C2:C'), true).setAllowInvalid(false).build());
  sel.setValue(anioServicio_(hoyISO_())).setBackground('#fff8dc').setFontWeight('bold').setHorizontalAlignment('center');
  sh.getRange('J3').setValue('(elige el año de la izquierda)').setFontSize(8).setFontColor('#666666');
  var mesesServ = ['Septiembre', 'Octubre', 'Noviembre', 'Diciembre', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto'];
  var bloque = function (filaTitulo, titulo, reunion) {
    sh.getRange(filaTitulo, 1, 1, 4).merge().setValue(titulo).setFontFamily('Georgia').setFontWeight('bold').setFontSize(12);
    var f0 = filaTitulo + 1;
    [0, 4].forEach(function (desp, lado) {
      var c = 1 + desp;
      var anio = lado === 0 ? '$J$2' : '($J$2+1)';
      sh.getRange(f0, c).setFormula('="Año de servicio "&' + anio).setFontWeight('bold').setFontSize(9).setWrap(true);
      sh.getRange(f0, c + 1, 1, 3).setValues([['Número de reuniones', 'Asistencia total', 'Promedio de asistencia semanal']]).setFontWeight('bold').setFontSize(9).setWrap(true).setHorizontalAlignment('center');
      mesesServ.forEach(function (m, i) {
        var f = f0 + 1 + i;
        var clave = i < 4 ? '((' + anio + '-1)*100+' + (9 + i) + ')' : '(' + anio + '*100+' + (i - 3) + ')';
        var cuenta = 'COUNTIFS(Registro!$F$2:$F,' + clave + ',Registro!$B$2:$B,"' + reunion + '")';
        var celdaN = sh.getRange(f, c + 1).getA1Notation(), celdaT = sh.getRange(f, c + 2).getA1Notation();
        sh.getRange(f, c).setValue(m);
        sh.getRange(f, c + 1).setFormula('=IF(' + cuenta + '=0,"",' + cuenta + ')');
        sh.getRange(f, c + 2).setFormula('=IF(' + celdaN + '="","",SUMIFS(Registro!$E$2:$E,Registro!$F$2:$F,' + clave + ',Registro!$B$2:$B,"' + reunion + '"))');
        sh.getRange(f, c + 3).setFormula('=IF(' + celdaN + '="","",ROUND(' + celdaT + '/' + celdaN + '))');
      });
      var fp = f0 + 13;
      sh.getRange(fp, c, 1, 3).merge().setValue('Promedio de asistencia mensual').setFontWeight('bold').setHorizontalAlignment('center');
      var prom = sh.getRange(f0 + 1, c + 3, 12, 1).getA1Notation();
      sh.getRange(fp, c + 3).setFormula('=IFERROR(ROUND(AVERAGE(' + prom + ')),"")');
      sh.getRange(f0 + 1, c + 1, 13, 3).setHorizontalAlignment('center');
      bordes_(sh.getRange(f0, c, 14, 4));
    });
    sh.setRowHeight(f0, 40);
  };
  bloque(3, 'Reunión de entre semana', 'Entre semana');
  bloque(20, 'Reunión del fin de semana', 'Fin de semana');
  sh.getRange('A37').setValue('S-88-S   12/18').setFontSize(8);
}

/** S-1: informe mensual de predicación y asistencia (con los totales de los informes). */
function construirS1_(ss, cfg) {
  var datos = hojaAsistencia_(ss, 'Datos S-1');
  if (datos.getLastRow() < 1) datos.getRange(1, 1, 1, 10).setValues([['Clave', 'Pub. informaron', 'Pub. cursos', 'Aux. informaron', 'Aux. cursos', 'Aux. horas', 'Reg. informaron', 'Reg. cursos', 'Reg. horas', 'Activos']]);
  var sh = nuevaHojaFormulario_(ss, 'S-1', [170, 110, 110, 110, 30, 150, 110, 120, 20, 90]);
  var listas = ss.getSheetByName('Listas');
  sh.getRange('A1:H1').merge().setValue('INFORME DE PREDICACIÓN Y DE ASISTENCIA').setFontSize(16).setFontWeight('bold').setHorizontalAlignment('center');
  sh.getRange('A2:H2').merge().setValue('A LAS REUNIONES DE LA CONGREGACIÓN').setFontSize(16).setFontWeight('bold').setHorizontalAlignment('center');
  var punteado = function (r) { r.setBorder(null, null, true, null, null, null, '#000000', SpreadsheetApp.BorderStyle.DOTTED); return r; };
  punteado(sh.getRange('A4:D4').merge().setValue(cfg.congregacionNombre || 'Los Romeros').setHorizontalAlignment('center'));
  punteado(sh.getRange('E4:F4').merge().setValue(cfg.ciudad || 'Concón').setHorizontalAlignment('center'));
  punteado(sh.getRange('G4:H4').merge().setValue(cfg.provincia || 'Valparaíso').setHorizontalAlignment('center'));
  sh.getRange('A5:D5').merge().setValue('(Nombre de la congregación)').setHorizontalAlignment('center').setFontSize(10);
  sh.getRange('E5:F5').merge().setValue('(Ciudad)').setHorizontalAlignment('center').setFontSize(10);
  sh.getRange('G5:H5').merge().setValue('(Provincia o estado)').setHorizontalAlignment('center').setFontSize(10);
  sh.getRange('A7').setValue('Informe de');
  punteado(sh.getRange('B7:D7').merge());
  selectorMes_(sh, 'B7', listas);
  sh.getRange('B8:D8').merge().setValue('(Mes y año)').setHorizontalAlignment('center').setFontSize(10);
  sh.getRange('F7:G7').merge().setValue('Número de la congregación:').setHorizontalAlignment('right');
  punteado(sh.getRange('H7').setValue(cfg.numeroCongregacion || '').setHorizontalAlignment('center'));
  sh.getRange('J7').setFormula('=IFERROR(VLOOKUP(B7,Listas!A:B,2,FALSE),"")').setFontColor('#ffffff');

  sh.getRange('B10:D10').setValues([['Cuántos informaron', 'Cursos bíblicos', 'Horas']]).setHorizontalAlignment('center').setWrap(true);
  var col = function (n) { return '=IFERROR(VLOOKUP($J$7,\'Datos S-1\'!$A:$J,' + n + ',FALSE),"")'; };
  [['Publicadores', 2, 3, 0], ['Precursores auxiliares', 4, 5, 6], ['Precursores regulares', 7, 8, 9]].forEach(function (x, i) {
    var f = 11 + i;
    sh.getRange(f, 1).setValue(x[0]);
    sh.getRange(f, 2).setFormula(col(x[1]));
    sh.getRange(f, 3).setFormula(col(x[2]));
    if (x[3]) sh.getRange(f, 4).setFormula(col(x[3])); else sh.getRange(f, 4).setBackground('#808080');
    sh.setRowHeight(f, 40);
  });
  sh.setRowHeight(10, 46);
  sh.getRange('B11:D13').setHorizontalAlignment('center').setFontSize(13);
  bordes_(sh.getRange('A10:D13'));
  contorno_(sh.getRange('A10:D13'));

  sh.getRange('A15').setValue('Publicadores activos').setWrap(true);
  sh.getRange('B15').setFormula(col(10)).setHorizontalAlignment('center').setFontSize(13);
  bordes_(sh.getRange('A15:B15')); contorno_(sh.getRange('A15:B15'));
  sh.getRange('C15:D15').merge().setValue('Promedio de asistencia a la reunión del fin de semana').setWrap(true);
  var cuenta = 'COUNTIFS(Registro!$F$2:$F,$J$7,Registro!$B$2:$B,"Fin de semana")';
  sh.getRange('F15').setFormula('=IF(' + cuenta + '=0,"",ROUND(SUMIFS(Registro!$E$2:$E,Registro!$F$2:$F,$J$7,Registro!$B$2:$B,"Fin de semana")/' + cuenta + '))')
    .setHorizontalAlignment('center').setFontSize(13);
  bordes_(sh.getRange('C15:F15')); contorno_(sh.getRange('C15:F15'));
  sh.getRange('E15').setBorder(true, true, true, null, null, null, '#000000', SpreadsheetApp.BorderStyle.SOLID);
  sh.setRowHeight(15, 46);

  var secretario = (leerTabla_('personas').filter(function (p) { return si_(p['Secretario']) || p['Secretario'] === true; })[0] || {})['Nombre'] || '';
  punteado(sh.getRange('E18:H18').merge().setValue(secretario).setHorizontalAlignment('center'));
  sh.getRange('E19:H19').merge().setValue('(Secretario)').setHorizontalAlignment('center').setFontSize(10);
  sh.getRange('A20').setValue('S-1-S   11/23').setFontSize(9);
}

/** Recalcula "Datos S-1" con los informes de predicación (los de la app y los de formularios antiguos). */
function actualizarDatosS1_(cfg) {
  var ss = planillaAsistencia_(cfg);
  var informes = leerInformes_(cfg, directorio_());
  var porMes = {};
  informes.forEach(function (x) {
    var k = +String(x.mes).replace('-', '');
    if (!k) return;
    // El más reciente de cada persona y mes
    var m = porMes[k] = porMes[k] || {};
    var n = norm_(x.nombre);
    if (!m[n] || new Date(x.ts) > new Date(m[n].ts)) m[n] = x;
  });
  var claves = Object.keys(porMes).map(Number).sort();
  var participo = function (x) { return !/^n/i.test(String(x.participo)); };
  var filas = claves.map(function (k) {
    var lista = Object.keys(porMes[k]).map(function (n) { return porMes[k][n]; }).filter(participo);
    var de = function (re) { return lista.filter(function (x) { return re.test(String(x.servicio)); }); };
    var pub = lista.filter(function (x) { return !/precursor/i.test(String(x.servicio)); }), aux = de(/auxiliar/i), reg = de(/regular/i);
    var suma = function (l, campo) { return l.reduce(function (s, x) { return s + (+x[campo] || 0); }, 0); };
    // Activos: informaron haber participado al menos una vez en los últimos 6 meses (incluido este)
    var activos = {};
    for (var i = 0; i < 6; i++) {
      var y = Math.floor(k / 100), mm = k % 100 - i;
      while (mm < 1) { mm += 12; y--; }
      var mes = porMes[y * 100 + mm] || {};
      Object.keys(mes).forEach(function (n) { if (participo(mes[n])) activos[n] = true; });
    }
    return [k, pub.length, suma(pub, 'estudios'), aux.length, suma(aux, 'estudios'), suma(aux, 'horas'), reg.length, suma(reg, 'estudios'), suma(reg, 'horas'), Object.keys(activos).length];
  });
  var sh = hojaAsistencia_(ss, 'Datos S-1');
  sh.clear();
  sh.getRange(1, 1, 1, 10).setValues([['Clave', 'Pub. informaron', 'Pub. cursos', 'Aux. informaron', 'Aux. cursos', 'Aux. horas', 'Reg. informaron', 'Reg. cursos', 'Reg. horas', 'Activos']]);
  if (filas.length) sh.getRange(2, 1, filas.length, 10).setValues(filas);
  sh.hideSheet();
  return filas.length;
}

/* ------------------------------------------------------------------ */
/* Datos                                                                */
/* ------------------------------------------------------------------ */

function leerAsistencia_(ss) {
  var sh = ss.getSheetByName('Registro');
  var v = sh.getDataRange().getValues();
  v.shift();
  var out = [];
  v.forEach(function (r, i) {
    if (!r[0] || !r[1]) return;
    out.push({ fila: i + 2, fecha: isoDe_(r[0]), reunion: String(r[1]), presencial: +r[2] || 0, zoom: +r[3] || 0, total: +r[4] || 0,
      por: String(r[7] || ''), notas: String(r[9] || '') });
  });
  return out;
}

/** Reuniones de los programas (entre semana y fin de semana) entre dos fechas: [{ fecha, hora, reunion }] */
function reunionesAsistencia_(desde, hasta) {
  var base = baseCacheada_(), out = [];
  base.programas.forEach(function (p) {
    var tipo = p.id === 'vmc' ? 'Entre semana' : p.id === 'finsemana' ? 'Fin de semana' : '';
    if (!tipo) return;
    p.reuniones.forEach(function (r) {
      if (r.borrador || r.tipo === 'salida' || r.fecha < desde || r.fecha > hasta) return;
      var asignados = 0;
      r.secciones.forEach(function (s) { s.filas.forEach(function (f) { asignados += f.asignados.length; }); });
      if (!asignados) return; // semana de asamblea u otra sin reunión
      out.push({ fecha: r.fecha, hora: r.hora || '', reunion: tipo });
    });
  });
  return out.sort(function (a, b) { return (a.fecha + a.hora).localeCompare(b.fecha + b.hora); });
}

function puedeVerAsistencia_(yo, cfg) {
  return yo.rol === 'admin' || enAudiencia_(cfg.asistenciaVen || 'secretario', yo) && !!String(cfg.asistenciaVen || 'secretario').trim();
}

/** Puede registrar: los de Inicio ▸ asistenciaRegistran, quienes ven el resumen, o quien tiene acomodación esa fecha. */
function puedeRegistrarAsistencia_(yo, cfg, fecha, asign) {
  if (puedeVerAsistencia_(yo, cfg) || enAudiencia_(cfg.asistenciaRegistran || 'anciano, secretario', yo)) return true;
  return (asign || leerTabla_('asignaciones')).some(function (a) {
    return a['Programa'] === 'acomodacion' && a['Fecha'] === fecha && a['Estado'] !== 'Eliminada' && norm_(a['Nombre']) === norm_(yo.nombre);
  });
}

/** Para el inicio: reuniones de los últimos 7 días (y la de hoy desde la mitad) sin asistencia registrada. */
function asistenciaPendiente_(yo, cfg, asign) {
  var hoy = hoyISO_();
  var ahora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm');
  var reuniones = reunionesAsistencia_(sumarDias_(hoy, -7), hoy).filter(function (r) {
    if (r.fecha === hoy && sumarMinutos_(r.hora || '19:30', MINUTOS_REGISTRO_ASISTENCIA) > ahora) return false;
    return puedeRegistrarAsistencia_(yo, cfg, r.fecha, asign);
  });
  if (!reuniones.length) return { puede: true, pendientes: [] };
  var hechas = {};
  var id = PropertiesService.getScriptProperties().getProperty('ASISTENCIA_ID');
  if (id) {
    try { leerAsistencia_(SpreadsheetApp.openById(id)).forEach(function (x) { hechas[x.fecha + '|' + x.reunion] = true; }); } catch (e) { /* aún no existe */ }
  }
  return { puede: true, pendientes: reuniones.filter(function (r) { return !hechas[r.fecha + '|' + r.reunion]; }) };
}

/** Acción "asistencia": guarda (o corrige) la asistencia de una reunión. */
function guardarAsistencia_(yo, p, cfg) {
  var fecha = String(p.fecha || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error('Indica la fecha.');
  if (fecha > hoyISO_()) throw new Error('La fecha no puede ser futura.');
  var reunion = REUNIONES_ASISTENCIA.indexOf(p.reunion) >= 0 ? p.reunion : '';
  if (!reunion) throw new Error('Indica la reunión.');
  if (!puedeRegistrarAsistencia_(yo, cfg, fecha)) throw new Error('No tienes permiso para registrar la asistencia.');
  var presencial = parseInt(p.presencial, 10), zoom = parseInt(p.zoom || 0, 10);
  if (isNaN(presencial) || presencial < 0 || presencial > 2000) throw new Error('Indica cuántos asistieron en persona.');
  if (isNaN(zoom) || zoom < 0 || zoom > 2000) throw new Error('Indica cuántos se conectaron por Zoom (0 si nadie).');
  var ss = planillaAsistencia_(cfg);
  var previo = leerAsistencia_(ss).filter(function (x) { return x.fecha === fecha && x.reunion === reunion; })[0];
  if (previo && !puedeVerAsistencia_(yo, cfg) && norm_(previo.por) !== norm_(yo.nombre)) throw new Error('Esa reunión ya tiene asistencia registrada por ' + previo.por + '. Pide al secretario que la corrija.');
  var fila = [Utilities.parseDate(fecha, Session.getScriptTimeZone(), 'yyyy-MM-dd'), reunion, presencial, zoom, presencial + zoom,
    mesNumero_(fecha), anioServicio_(fecha), yo.nombre, new Date(), texto_(p.notas || '').slice(0, 300)];
  var sh = ss.getSheetByName('Registro');
  if (previo) sh.getRange(previo.fila, 1, 1, fila.length).setValues([fila]);
  else sh.appendRow(fila);
  registrar_('Asistencia', yo.nombre + ': ' + fecha + ' · ' + reunion + ' · ' + presencial + ' + ' + zoom + ' Zoom = ' + (presencial + zoom));
  return { ok: true, total: presencial + zoom };
}

/** Acción "resumenAsistencia": S-88 del año de servicio, últimas reuniones y enlace a la planilla. */
function resumenAsistencia_(yo, p, cfg) {
  if (!puedeVerAsistencia_(yo, cfg)) throw new Error('No tienes acceso al resumen de asistencia.');
  var ss = planillaAsistencia_(cfg);
  var cache = CacheService.getScriptCache();
  if (!cache.get('asistencia-listas')) {
    try { actualizarListasAsistencia_(ss); actualizarDatosS1_(cfg); } catch (e) { console.warn(e); }
    cache.put('asistencia-listas', '1', 3600);
  }
  var anio = +p.anio || anioServicio_(hoyISO_());
  var registros = leerAsistencia_(ss);
  var meses = [];
  for (var i = 0; i < 12; i++) {
    var y = i < 4 ? anio - 1 : anio, m = i < 4 ? 9 + i : i - 3;
    var k = y * 100 + m;
    var fila = { mes: MESES_LARGOS[m - 1], clave: k };
    REUNIONES_ASISTENCIA.forEach(function (r) {
      var l = registros.filter(function (x) { return mesNumero_(x.fecha) === k && x.reunion === r; });
      var total = l.reduce(function (s, x) { return s + x.total; }, 0);
      fila[r === 'Entre semana' ? 'semana' : 'finde'] = l.length ? { reuniones: l.length, total: total, promedio: Math.round(total / l.length) } : null;
    });
    meses.push(fila);
  }
  var promedio = function (k) {
    var l = meses.filter(function (m) { return m[k]; });
    return l.length ? Math.round(l.reduce(function (s, m) { return s + m[k].promedio; }, 0) / l.length) : null;
  };
  var pendientes = reunionesAsistencia_(sumarDias_(hoyISO_(), -60), hoyISO_()).filter(function (r) {
    return !registros.some(function (x) { return x.fecha === r.fecha && x.reunion === r.reunion; });
  });
  return {
    ok: true, anio: anio, anioActual: anioServicio_(hoyISO_()), url: ss.getUrl(), meses: meses,
    promedioSemana: promedio('semana'), promedioFinde: promedio('finde'),
    recientes: registros.filter(function (x) { return anioServicio_(x.fecha) === anio; }).sort(function (a, b) { return (b.fecha + b.reunion).localeCompare(a.fecha + a.reunion); }).slice(0, 40),
    sinRegistrar: pendientes
  };
}
