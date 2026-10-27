/**
 * S-13 · Registro de asignación de territorio.
 *
 * Planilla propia (Inicio ▸ s13Planilla = su URL):
 *  - "Historial": una fila por vuelta de un territorio.
 *      Territorio | Asignado a | Fecha en que se asignó | Fecha en que se completó | Origen | Notas | Control
 *    Lo que se escribe o corrige a mano se respeta siempre ("Manual"). Una fila a mano sin fecha de término es una
 *    vuelta en curso: la app solo le completa el término ("Inicio manual"). Las "Automático" se recalculan con el
 *    registro de predicación en los espacios entre lo escrito a mano. "Control" (oculta) permite saber si una fila
 *    automática fue corregida.
 *  - "S-13 AAAA": el formulario de cada año de servicio (septiembre a agosto), listo para imprimir.
 *    Se rehace cada día y unos minutos después de editar el Historial.
 *
 * Una vuelta empieza la primera vez que se trabaja el territorio después de completado (encargado = quien
 * dirigió esa salida) y termina según calcularVueltasS13_.
 *
 * Inicio:
 *   s13Planilla = URL de la planilla
 *   s13Ven      = quiénes ven el S-13 en la app, además del responsable del programa de predicación
 *   s13Desde    = primer año de servicio que se muestra
 */

var TITULOS_S13 = ['Territorio', 'Asignado a', 'Fecha en que se asignó', 'Fecha en que se completó', 'Origen', 'Notas', 'Control (no editar)'];
var S13_BLOQUES = 4; // vueltas por fila del formulario
var S13_MINUTOS_TRAS_EDITAR = 5; // espera tras la última edición del Historial antes de rehacer los formularios
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
  if (m) return +m[2] >= 1 && +m[2] <= 12 && +m[1] >= 1 && +m[1] <= 31 ? (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + pad2_(+m[2]) + '-' + pad2_(+m[1]) : '';
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

/** Texto de control de una fila escrita por la app: si la fila ya no coincide, alguien la corrigió a mano. */
function controlS13_(fila) {
  return fila.slice(0, 6).map(function (x) { return String(x == null ? '' : x).trim(); }).join('|');
}

/**
 * Clasifica las filas del Historial ([Territorio, Asignado, Asignó, Completó, Origen, Notas, Control]):
 *  - automáticas sin tocar: se descartan (se recalculan);
 *  - sin fecha de término (escritas a mano o "Inicio manual"): vuelta en curso que la app completa (ancla);
 *  - el resto: vuelta fija, se respeta tal cual (si era automática y se corrigió, pasa a "Manual (corregido)").
 */
function clasificarHistorialS13_(filas) {
  var fijas = [], anclas = [];
  filas.forEach(function (r) {
    if (r[0] === '' || r[0] == null) return;
    var texto = function (x) { return x instanceof Date ? fechaS13_(isoS13_(x)) : String(x == null ? '' : x).trim(); };
    var seis = [String(r[0]).replace(/\.0$/, '').trim(), texto(r[1]), texto(r[2]), texto(r[3]), texto(r[4]), texto(r[5])];
    var origen = seis[4], intacta = String(r[6] || '') === controlS13_(seis);
    var v = { territorio: seis[0], asignado: seis[1], inicio: isoS13_(r[2]), termino: isoS13_(r[3]), origen: origen, notas: seis[5], fila: seis };
    if (/^autom/i.test(origen) && intacta) return;
    if (!seis[3] || (/^inicio manual/i.test(origen) && intacta)) {
      if (v.inicio) { anclas.push(v); return; }
    }
    if (!/^manual/i.test(origen)) v.origen = v.fila[4] = /^(autom|inicio)/i.test(origen) ? 'Manual (corregido)' : 'Manual';
    fijas.push(v);
  });
  return { fijas: fijas, anclas: anclas };
}

/**
 * Vueltas de cada territorio calculadas con el registro de predicación, alrededor de las que se escribieron a mano.
 * regs: [{ fecha, territorio, manzanas[], correo }], totales: { '8': ['A',…] },
 * fijas: [{ territorio, inicio, termino }], anclas: [{ territorio, asignado, inicio }] (vueltas en curso puestas a mano),
 * encargadoDe(territorio, fecha, correo) -> nombre.
 * Devuelve [{ territorio, asignado, inicio, termino ('' si sigue en curso), notas, origen }].
 *
 * Criterio (el de quien lleva el S-13): una vuelta termina cuando se trabajaron todas las manzanas, o cuando una
 * salida vuelve a trabajar sobre todo manzanas ya hechas en la vuelta (2 de cada 3 o más) y ya se cubrió al menos
 * la mitad del territorio: ahí comenzó otra vuelta, y la anterior se da por completada en la salida previa.
 */
function calcularVueltasS13_(regs, totales, fijas, anclas, encargadoDe) {
  var out = [];
  Object.keys(totales).sort(function (a, b) { return +a - +b; }).forEach(function (t) {
    var todas = totales[t].map(function (m) { return String(m).trim().toUpperCase(); });
    if (!todas.length) return;
    // Un día = todas las manzanas trabajadas esa fecha (puede haber varios registros)
    var dias = {};
    regs.forEach(function (g) {
      if (g.territorio !== t) return;
      var ms = g.manzanas.map(function (m) { return String(m).trim().toUpperCase(); }).filter(function (m) { return todas.indexOf(m) >= 0; });
      if (!ms.length) return;
      var d = dias[g.fecha] = dias[g.fecha] || { fecha: g.fecha, manzanas: {}, correo: g.correo };
      ms.forEach(function (m) { d.manzanas[m] = true; });
    });
    var seq = Object.keys(dias).sort().map(function (f) { return { fecha: f, manzanas: Object.keys(dias[f].manzanas), correo: dias[f].correo }; });

    var nueva = function (d, ancla) {
      return { asignado: ancla ? ancla.asignado : encargadoDe(t, d.fecha, d.correo), inicio: ancla ? ancla.inicio : d.fecha,
        origen: ancla ? 'Inicio manual' : 'Automático', hechas: {}, n: 0, ultima: '' };
    };
    var faltan = function (v) { return todas.filter(function (m) { return !v.hechas[m]; }); };
    var cerrar = function (v, termino) {
      var f = faltan(v);
      out.push({ territorio: t, asignado: v.asignado, inicio: v.inicio, termino: termino, origen: v.origen,
        notas: f.length ? 'Se dio por completado (faltó ' + f.join(', ') + ')' : '' });
    };
    /** Recorre las salidas; si cerrarAlFinal, la vuelta abierta termina en su última salida (después viene una vuelta escrita a mano). */
    var simular = function (lista, ancla, cerrarAlFinal) {
      var v = ancla ? nueva(null, ancla) : null, ultimo = '';
      lista.forEach(function (d) {
        if (!v) v = nueva(d);
        else {
          var rep = d.manzanas.filter(function (m) { return v.hechas[m]; }).length;
          if (v.n && rep && rep * 3 >= d.manzanas.length * 2 && v.n * 2 >= todas.length) {
            cerrar(v, v.ultima); ultimo = v.ultima;
            v = nueva(d);
          }
        }
        d.manzanas.forEach(function (m) { if (!v.hechas[m]) { v.hechas[m] = true; v.n++; } });
        v.ultima = d.fecha;
        if (v.n >= todas.length) { cerrar(v, d.fecha); ultimo = d.fecha; v = null; }
      });
      if (v) {
        if (cerrarAlFinal && v.ultima) { cerrar(v, v.ultima); ultimo = v.ultima; }
        else out.push({ territorio: t, asignado: v.asignado, inicio: v.inicio, termino: '', origen: v.origen,
          notas: v.n ? 'En curso · faltan ' + faltan(v).join(', ') : 'En curso' });
      }
      return ultimo;
    };

    var marcas = fijas.filter(function (x) { return x.territorio === t && x.inicio; }).map(function (x) { return { fija: true, inicio: x.inicio, termino: x.termino || x.inicio }; })
      .concat(anclas.filter(function (x) { return x.territorio === t; }).map(function (x) { return { fija: false, inicio: x.inicio, ancla: x }; }))
      .sort(function (a, b) { return a.inicio.localeCompare(b.inicio); });
    if (!marcas.length) { simular(seq, null, false); return; }
    var limite = null;
    marcas.forEach(function (m, k) {
      var sig = marcas[k + 1];
      // Salidas entre la vuelta anterior y esta (escrita a mano): vueltas automáticas que terminan antes de esta
      if (limite !== null) simular(seq.filter(function (d) { return d.fecha > limite && d.fecha < m.inicio; }), null, true);
      if (m.fija) { limite = limite && limite > m.termino ? limite : m.termino; return; }
      var propias = seq.filter(function (d) { return d.fecha >= m.inicio && (!sig || d.fecha < sig.inicio); });
      limite = simular(propias, m.ancla, !!sig) || (propias.length ? propias[propias.length - 1].fecha : m.inicio);
    });
    if (marcas[marcas.length - 1].fija) simular(seq.filter(function (d) { return d.fecha > limite; }), null, false);
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
  var h = clasificarHistorialS13_(v.slice(1).map(function (r) { return r.concat(['', '', '', '', '', '', '']).slice(0, 7); }));

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
  h.fijas.concat(h.anclas).forEach(function (m) {
    if (m.asignado && !personas.some(function (p) { return norm_(p.nombre) === norm_(m.asignado); })) personas.push({ nombre: m.asignado, correo: '' });
  });
  var encargadoDe = function (t, fecha, correo) { return salidas[fecha + '|' + t] || nombrePorCorreo_(correo, personas); };

  var auto = calcularVueltasS13_(regs, totales, h.fijas, h.anclas, encargadoDe);
  var todas = h.fijas.map(function (m) { return { territorio: m.territorio, asignado: m.asignado, inicio: m.inicio, termino: m.termino, origen: m.origen, notas: m.notas, fila: m.fila.concat(['']) }; })
    .concat(auto.map(function (a) {
      var seis = [a.territorio, a.asignado, fechaS13_(a.inicio), fechaS13_(a.termino), a.origen, a.notas];
      return { territorio: a.territorio, asignado: a.asignado, inicio: a.inicio, termino: a.termino, origen: a.origen, notas: a.notas, fila: seis.concat([controlS13_(seis)]) };
    }))
    .sort(function (a, b) { return (+a.territorio - +b.territorio) || (a.inicio || '9').localeCompare(b.inicio || '9'); });

  var filas = [TITULOS_S13].concat(todas.map(function (x) { return x.fila; }));
  hist.getRange(1, 1, hist.getMaxRows(), Math.max(hist.getMaxColumns(), TITULOS_S13.length)).clearContent();
  hist.getRange(1, 1, filas.length, TITULOS_S13.length).setNumberFormat('@').setValues(filas);
  hist.getRange(1, 1, 1, TITULOS_S13.length).setFontWeight('bold').setBackground('#5e8499').setFontColor('#ffffff');
  hist.setFrozenRows(1);
  hist.hideColumns(TITULOS_S13.length);

  var territorios = Object.keys(totales).sort(function (a, b) { return +a - +b; });
  var hoy = hoyISO_(), actualizado = fechaS13_(hoy);
  for (var anio = +(cfg.s13Desde || 2026); anio <= anioServicio_(hoy); anio++) {
    escribirPaginaS13_(ss, anio, paginaS13_(anio, todas, territorios, actualizado), 2 + anio - +(cfg.s13Desde || 2026));
  }
  compartirS13_(ss, cfg);
  registrar_('S-13 actualizado', auto.length + ' vueltas calculadas, ' + h.fijas.length + ' escritas a mano');
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

/** Tarea instalada en la planilla del S-13: al editar el Historial, los formularios se rehacen unos minutos después. */
function alEditarS13(e) {
  if (e && e.range && e.range.getSheet().getName() !== 'Historial') return;
  PropertiesService.getScriptProperties().setProperty('S13_EDITADO', String(Date.now()));
}

/** Se llama cada 15 minutos (sincronizar): si el Historial se editó hace más de unos minutos, rehace el S-13. */
function revisarS13Editado_(cfg) {
  var props = PropertiesService.getScriptProperties();
  var t = +props.getProperty('S13_EDITADO') || 0;
  if (!t || Date.now() - t < S13_MINUTOS_TRAS_EDITAR * 60000) return;
  props.deleteProperty('S13_EDITADO');
  actualizarS13_(cfg);
  CacheService.getScriptCache().remove('s13');
}

function asegurarTareaS13_() {
  if (ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'alEditarS13'; })) return;
  ScriptApp.newTrigger('alEditarS13').forSpreadsheet(planillaS13_(config_()).getId()).onEdit().create();
}

function menuActualizarS13() {
  var r = actualizarS13_(config_());
  CacheService.getScriptCache().remove('s13');
  SpreadsheetApp.getUi().alert('S-13 actualizado: ' + r.vueltas.length + ' vueltas en el Historial.\n\n' + r.ss.getUrl());
}
