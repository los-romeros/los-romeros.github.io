/**
 * Generar el programa de acomodación de un mes (botón en la app para el responsable del programa y el admin).
 *
 * - Solo cuando la reunión de entre semana y la del fin de semana de ese mes están aprobadas.
 * - Quién puede hacer cada cosa sale de la pestaña de habilitados de la hoja del responsable
 *   (ACOMODADORES, SONIDO, MICROFONOS; plataforma = ANCIANOS y SIERVOS MINISTERIALES, o una columna PLATAFORMA si existe).
 * - Respeta la pestaña "Condiciones" de esa hoja (p. ej. "Solo fin de semana"), que también se edita desde la app.
 * - No asigna a quien tiene una parte en la reunión de ese día, reparte parejo (prefiere a quien lleva más tiempo
 *   sin ese privilegio) y evita repetir a la misma persona en reuniones seguidas.
 * - Escribe una pestaña nueva copiando el formato de la última; queda como borrador para revisar y aprobar.
 */

var ROLES_ACOM = [
  { id: 'plataforma', nombre: 'Plataforma', lista: 'plataforma' },
  { id: 'audio', nombre: 'Audio', lista: 'sonido' },
  { id: 'video', nombre: 'Video', lista: 'sonido' },
  { id: 'microfono1', nombre: 'Micrófono', lista: 'microfonos' },
  { id: 'microfono2', nombre: 'Micrófono', lista: 'microfonos' },
  { id: 'hall', nombre: 'Acomodación Hall', lista: 'acomodadores' },
  { id: 'auditorio', nombre: 'Acomodación Auditorio', lista: 'acomodadores' }
];
var HOJA_CONDICIONES = 'Condiciones';
var CONDICIONES_ACOM = ['Solo fin de semana', 'Solo entre semana', 'No asignar en', 'Solo asignar en', 'Máximo al mes', 'No disponible', 'No asignar'];
var DIAS_MAYUS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

/* ------------------------------------------------------------------ */
/* Funciones puras (se prueban fuera de Apps Script)                    */
/* ------------------------------------------------------------------ */

/** "Bugueño, Joaquín (A)" -> "Joaquín Bugueño" */
function nombreDeLista_(t) {
  t = texto_(String(t || '').replace(/\([^)]*\)/g, ' '));
  var m = /^([^,]+),\s*(.+)$/.exec(t);
  return texto_(m ? m[2] + ' ' + m[1] : t);
}

/** Listas de la pestaña de habilitados, o null si esos valores no son esa pestaña. */
function habilitadosDeHoja_(values) {
  for (var r = 0; r < Math.min(values.length, 6); r++) {
    var t = (values[r] || []).map(function (v) { return norm_(texto_(v)); });
    if (!t.some(function (x) { return /^acomodador/.test(x); }) || !t.some(function (x) { return /microfono/.test(x); })) continue;
    var listas = {};
    t.forEach(function (x, c) {
      var k = /^acomodador/.test(x) ? 'acomodadores' : /sonido|audio/.test(x) ? 'sonido' : /microfono/.test(x) ? 'microfonos'
        : /plataforma/.test(x) ? 'plataforma' : /^ancian/.test(x) ? 'ancianos' : /siervo/.test(x) ? 'siervos' : '';
      if (!k) return;
      listas[k] = (listas[k] || []).concat(values.slice(r + 1).map(function (f) { return nombreDeLista_(f[c]); })
        .filter(function (n) { return n && !/^\d+$/.test(n); }));
    });
    if (!listas.plataforma) listas.plataforma = (listas.ancianos || []).concat(listas.siervos || []);
    return listas;
  }
  return null;
}

/** Ids de roles mencionados en un texto: "Audio y video", "Acomodación", "Micrófonos"… */
function rolesDeTexto_(t) {
  t = norm_(t);
  var r = [];
  if (/acomod/.test(t)) r.push('hall', 'auditorio');
  if (/\bhall\b/.test(t)) r.push('hall');
  if (/auditorio/.test(t)) r.push('auditorio');
  if (/microf/.test(t)) r.push('microfono1', 'microfono2');
  if (/plataf/.test(t)) r.push('plataforma');
  if (/audio|sonido/.test(t)) r.push('audio');
  if (/video|sonido/.test(t)) r.push('video');
  return r;
}

/** "10/12 al 20/12", "10 al 20 de diciembre", "28 de noviembre al 5 de diciembre", "diciembre" -> ['AAAA-MM-DD', 'AAAA-MM-DD'] */
function rangoFechasTexto_(texto, anio) {
  var n = norm_(texto).replace(/setiembre/g, 'septiembre');
  var a = /\b(20\d{2})\b/.exec(n);
  anio = a ? +a[1] : anio;
  var iso = function (d, m, y) { return (y || anio) + '-' + pad2_(m) + '-' + pad2_(d); };
  var orden = function (x) { x.sort(); return [x[0], x[x.length - 1]]; };
  var dm = n.match(/\b(\d{1,2})\s+de\s+([a-z]+)/g) || [];
  var conMes = dm.map(function (x) { var p = /(\d{1,2})\s+de\s+([a-z]+)/.exec(x); var m = MESES_NOMBRES.indexOf(p[2]); return m < 0 ? null : iso(+p[1], m + 1); }).filter(Boolean);
  if (conMes.length >= 2) return orden(conMes);
  var r = /(\d{1,2})\s*(?:al|-|a|y)\s*(\d{1,2})\s+de\s+([a-z]+)/.exec(n);
  if (r && MESES_NOMBRES.indexOf(r[3]) >= 0) return orden([iso(+r[1], MESES_NOMBRES.indexOf(r[3]) + 1), iso(+r[2], MESES_NOMBRES.indexOf(r[3]) + 1)]);
  if (conMes.length === 1) return [conMes[0], conMes[0]];
  var num = (n.match(/\b\d{1,2}[\/\-.]\d{1,2}(?:[\/\-.]\d{2,4})?\b/g) || []).map(function (x) {
    var p = x.split(/[\/\-.]/);
    return iso(+p[0], +p[1], p[2] ? (+p[2] < 100 ? 2000 + +p[2] : +p[2]) : 0);
  });
  if (num.length) return orden(num);
  var mes = MESES_NOMBRES.filter(function (x) { return n.indexOf(x) >= 0; })[0];
  if (mes) { var mm = MESES_NOMBRES.indexOf(mes) + 1; return [iso(1, mm), sumarDias_(iso(1, mm % 12 + 1, mm === 12 ? anio + 1 : anio), -1)]; }
  return null;
}

/** Filas [nombre, condición, detalle] -> { nombreNormalizado: reglas }. `canon(nombre)` da el nombre del directorio. */
function condicionesDeFilas_(filas, canon, anio) {
  var out = {};
  filas.forEach(function (f) {
    var nombre = canon(texto_(f[0]));
    var cond = norm_(f[1]), det = texto_(f[2]);
    if (!nombre || !cond) return;
    var c = out[norm_(nombre)] = out[norm_(nombre)] || { nombre: nombre, soloFinde: false, soloSemana: false, no: {}, solo: null, max: null, fuera: [], pausa: false };
    if (/solo/.test(cond) && /fin(es)? de semana|sabado|domingo/.test(cond)) c.soloFinde = true;
    else if (/solo/.test(cond) && /entre semana/.test(cond)) c.soloSemana = true;
    else if (/^no (asignar en|hace|puede)/.test(cond)) rolesDeTexto_(det).forEach(function (r) { c.no[r] = true; });
    else if (/^solo/.test(cond)) { c.solo = c.solo || {}; rolesDeTexto_(det || cond).forEach(function (r) { c.solo[r] = true; }); }
    else if (/maximo|\bmax\b/.test(cond)) { var x = parseInt(det, 10); if (x >= 0) c.max = x; }
    else if (/disponible|ausente|viaje|fuera/.test(cond)) { var rg = rangoFechasTexto_(det, anio); if (rg) c.fuera.push(rg); }
    else if (/^no asignar|pausa|no considerar/.test(cond)) c.pausa = true;
  });
  return out;
}

function diasEntre_(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 864e5); }

/**
 * Arma las asignaciones del mes.
 * datos = {
 *   reuniones: [{ fecha, finde, especial }]        (especial = texto: esa reunión no se asigna)
 *   listas: { acomodadores, sonido, microfonos, plataforma }   (nombres del directorio)
 *   roles: ids de ROLES_ACOM que tiene la hoja
 *   condiciones: de condicionesDeFilas_
 *   ocupados: { fecha: { nombreNormalizado: true } }   (tienen parte en la reunión de ese día)
 *   historial: { nombreNormalizado: { lista: 'AAAA-MM-DD' } }  (última vez en cada privilegio)
 *   intentos, aleatorio
 * }
 * Devuelve { reuniones: [{ fecha, finde, especial, roles: { id: nombre } }], conteo: [{ nombre, n }], vacios: [{ fecha, rol }] }
 */
function armarAcomodacion_(datos) {
  var roles = ROLES_ACOM.filter(function (r) { return datos.roles.indexOf(r.id) >= 0; });
  var visible = {};
  var aptos = {};
  roles.forEach(function (rol) {
    aptos[rol.id] = [];
    (datos.listas[rol.lista] || []).forEach(function (nombre) {
      var n = norm_(nombre);
      visible[n] = visible[n] || nombre;
      if (aptos[rol.id].indexOf(n) < 0) aptos[rol.id].push(n);
    });
  });
  var cond = datos.condiciones || {}, ocupados = datos.ocupados || {}, historial = datos.historial || {};
  var rnd = datos.aleatorio || Math.random;
  var permitido = function (n, rol, reu) {
    var c = cond[n];
    if (!c) return true;
    if (c.pausa || (c.soloFinde && !reu.finde) || (c.soloSemana && reu.finde) || c.no[rol.id] || (c.solo && !c.solo[rol.id])) return false;
    return !c.fuera.some(function (rg) { return reu.fecha >= rg[0] && reu.fecha <= rg[1]; });
  };
  var todos = {};
  roles.forEach(function (rol) { aptos[rol.id].forEach(function (n) { if (!(cond[n] && cond[n].pausa)) todos[n] = true; }); });
  var reus = datos.reuniones.filter(function (r) { return !r.especial; });
  var mejor = null;

  for (var intento = 0; intento < (datos.intentos || 300); intento++) {
    var cuenta = {}, cuentaRol = {}, ultima = {}, plan = [], vacios = [], costo = 0, previa = {};
    reus.forEach(function (reu) {
      var asign = {}, enReunion = {};
      var cands = {};
      roles.forEach(function (rol) {
        cands[rol.id] = aptos[rol.id].filter(function (n) { return permitido(n, rol, reu) && !(ocupados[reu.fecha] || {})[n]; });
      });
      // Primero el privilegio con menos personas disponibles
      var orden = roles.slice().sort(function (a, b) { return cands[a.id].length - cands[b.id].length || rnd() - 0.5; });
      orden.forEach(function (rol) {
        var lista = cands[rol.id].filter(function (n) { return !enReunion[n] && !(cond[n] && cond[n].max != null && (cuenta[n] || 0) >= cond[n].max); });
        if (!lista.length) { vacios.push({ fecha: reu.fecha, rol: rol.nombre }); return; }
        var puntaje = function (n) {
          var u = ultima[n + '|' + rol.lista] || (historial[n] || {})[rol.lista];
          var dias = u ? diasEntre_(u, reu.fecha) : 240;
          return (cuenta[n] || 0) * 10 + (cuentaRol[n + '|' + rol.lista] || 0) * 4 + (previa[n] ? 12 : 0) - Math.min(dias, 240) / 24 + rnd() * 4;
        };
        var elegido = null, mejorP = 0;
        lista.forEach(function (n) { var p = puntaje(n); if (elegido === null || p < mejorP) { elegido = n; mejorP = p; } });
        asign[rol.id] = elegido;
        enReunion[elegido] = true;
        cuenta[elegido] = (cuenta[elegido] || 0) + 1;
        cuentaRol[elegido + '|' + rol.lista] = (cuentaRol[elegido + '|' + rol.lista] || 0) + 1;
        ultima[elegido + '|' + rol.lista] = reu.fecha;
      });
      Object.keys(enReunion).forEach(function (n) { if (previa[n]) costo += 8; });
      previa = enReunion;
      plan.push(asign);
    });
    Object.keys(todos).forEach(function (n) { var c = cuenta[n] || 0; costo += c * c * 3; });
    Object.keys(cuentaRol).forEach(function (k) { if (cuentaRol[k] > 1) costo += (cuentaRol[k] - 1) * 2; });
    costo += vacios.length * 1000;
    if (!mejor || costo < mejor.costo) mejor = { costo: costo, plan: plan, cuenta: cuenta, vacios: vacios };
  }

  var i = 0;
  var salida = datos.reuniones.map(function (r) {
    if (r.especial) return { fecha: r.fecha, finde: r.finde, especial: r.especial, roles: {} };
    var a = mejor ? mejor.plan[i++] : {}, roles2 = {};
    Object.keys(a).forEach(function (k) { roles2[k] = visible[a[k]]; });
    return { fecha: r.fecha, finde: r.finde, especial: '', roles: roles2 };
  });
  var conteo = Object.keys(todos).map(function (n) { return { nombre: visible[n], n: mejor ? mejor.cuenta[n] || 0 : 0 }; })
    .sort(function (a, b) { return b.n - a.n || a.nombre.localeCompare(b.nombre); });
  return { reuniones: salida, conteo: conteo, vacios: mejor ? mejor.vacios : [] };
}

/* ------------------------------------------------------------------ */
/* Con la planilla                                                      */
/* ------------------------------------------------------------------ */

/** Nombre del directorio para un nombre de las listas; también "Max Wilson" -> "Maximiliano Wilson" si es único. */
function reconocerLista_(nombre, dir) {
  var p = reconocer_(nombre, dir);
  if (p) return p.nombre;
  var t = tokens_(nombre);
  if (t.length >= 2) {
    var c = dir.personas.filter(function (x) {
      var tx = tokens_(x.nombre);
      return tx.length >= 2 && tx[0].indexOf(t[0]) === 0 && tx.indexOf(t[t.length - 1]) >= 1;
    });
    if (c.length === 1) return c[0].nombre;
  }
  return '';
}

function mesSiguiente_(ym, n) { var d = new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + (n || 1), 1); return d.getFullYear() + '-' + pad2_(d.getMonth() + 1); }

/** Reuniones (no salidas) de un programa por mes: { 'AAAA-MM': { aprobadas, borradores } } */
function reunionesPorMes_(prog) {
  var out = {};
  (prog ? prog.reuniones : []).forEach(function (r) {
    if (r.tipo === 'salida') return;
    var o = out[r.fecha.slice(0, 7)] = out[r.fecha.slice(0, 7)] || { aprobadas: 0, borradores: 0 };
    if (r.borrador) o.borradores++; else o.aprobadas++;
  });
  return out;
}

/** Para la app: el próximo mes sin programa de acomodación y si ya se puede generar. null si el usuario no lo edita. */
function estadoGenerarAcomodacion_(yo, base) {
  if (yo.editables.indexOf('acomodacion') < 0) return null;
  var prog = function (id) { return base.programas.filter(function (p) { return p.id === id; })[0]; };
  var vmc = reunionesPorMes_(prog('vmc')), fs = reunionesPorMes_(prog('finsemana')), ac = reunionesPorMes_(prog('acomodacion'));
  var mes = hoyISO_().slice(0, 7);
  for (var i = 0; i < 4; i++, mes = mesSiguiente_(mes)) {
    if (ac[mes]) continue;
    var faltan = [];
    if (!vmc[mes] || vmc[mes].borradores || !vmc[mes].aprobadas) faltan.push('Reunión de entre semana');
    if (!fs[mes] || fs[mes].borradores || !fs[mes].aprobadas) faltan.push('Reunión del fin de semana');
    return { mes: mes, nombre: nombreMes_(mes).toLowerCase(), listo: !faltan.length, faltan: faltan };
  }
  return null;
}

/** Reuniones de entre semana y fin de semana aprobadas del mes, desde la pestaña Datos (no depende del rango de la app). */
function reunionesDelMes_(mes) {
  var aprobados = {}, borradores = { vmc: 0, finsemana: 0 }, porFecha = {};
  leerTabla_('periodos').forEach(function (p) { aprobados[p['Programa'] + '|' + p['Periodo']] = p['Estado'] === 'Aprobado'; });
  var acomExiste = false;
  leerTabla_('datos').forEach(function (d) {
    var prog = d['Programa'];
    if (['vmc', 'finsemana', 'acomodacion'].indexOf(prog) < 0) return;
    var res;
    try { res = JSON.parse(d['JSON']); } catch (e) { return; }
    res.reuniones.forEach(function (r) {
      if (r.fecha.slice(0, 7) !== mes || r.tipo === 'salida') return;
      if (prog === 'acomodacion') { acomExiste = true; return; }
      if (!aprobados[prog + '|' + d['Periodo']]) { borradores[prog]++; return; }
      var sin = !totalAsignados_(r);
      var nota = texto_(r.nota);
      porFecha[r.fecha] = { fecha: r.fecha, finde: prog === 'finsemana', programa: prog,
        especial: !sin ? '' : !nota || /^sin asignaciones/i.test(nota) ? 'SIN REUNIÓN' : nota.toUpperCase() };
    });
  });
  var lista = Object.keys(porFecha).sort().map(function (f) { return porFecha[f]; });
  var tiene = function (p) { return lista.some(function (r) { return r.programa === p; }); };
  var faltan = [];
  if (!tiene('vmc') || borradores.vmc) faltan.push('Reunión de entre semana');
  if (!tiene('finsemana') || borradores.finsemana) faltan.push('Reunión del fin de semana');
  return { reuniones: lista, faltan: faltan, acomExiste: acomExiste };
}

function hojaAcomodacion_() {
  var prog = programaPorId_('acomodacion');
  var url = prog && String(prog['Hoja de origen (URL)'] || '');
  if (url.indexOf('http') !== 0) throw new Error('Falta la hoja del programa de acomodación en Programas.');
  return { prog: prog, ss: SpreadsheetApp.openByUrl(url), url: url };
}

function leerHabilitados_(ss) {
  var hojas = ss.getSheets();
  for (var i = 0; i < hojas.length; i++) {
    var sh = hojas[i];
    if (!sh.getLastRow() || !sh.getLastColumn()) continue;
    var listas = habilitadosDeHoja_(sh.getDataRange().getValues());
    if (listas) { listas.hoja = sh.getName(); return listas; }
  }
  throw new Error('No encontré la pestaña con la lista de quiénes pueden participar (columnas ACOMODADORES, SONIDO, MICROFONOS…).');
}

/** Pestaña "Condiciones" de la hoja del responsable (se crea con su lista desplegable si no existe). */
function hojaCondiciones_(ss) {
  var sh = ss.getSheetByName(HOJA_CONDICIONES);
  if (sh) return sh;
  sh = ss.insertSheet(HOJA_CONDICIONES);
  sh.getRange(1, 1, 1, 4).setValues([['Nombre', 'Condición', 'Detalle', 'Agregada por']]).setFontWeight('bold').setBackground('#1a4d8f').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  [200, 170, 300, 180].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.getRange(2, 2, 300, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(CONDICIONES_ACOM, true).setAllowInvalid(true).build());
  sh.getRange(1, 3).setNote('Detalle según la condición:\n· No asignar en / Solo asignar en: Acomodación, Micrófonos, Plataforma, Audio, Video\n· Máximo al mes: un número\n· No disponible: fechas, p. ej. "10 al 20 de diciembre" o "10/12 al 20/12"');
  return sh;
}

function leerCondiciones_(ss) {
  var sh = ss.getSheetByName(HOJA_CONDICIONES);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 3).getDisplayValues().map(function (f, i) {
    return { fila: i + 2, nombre: texto_(f[0]), condicion: texto_(f[1]), detalle: texto_(f[2]) };
  }).filter(function (c) { return c.nombre && c.condicion; });
}

/** Última vez que cada persona tuvo cada privilegio de acomodación (antes del mes). */
function historialAcomodacion_(asign, mes) {
  var lista = { acomodacion: 'acomodadores', microfono: 'microfonos', plataforma: 'plataforma', av: 'sonido' };
  var out = {};
  asign.forEach(function (a) {
    if (a['Programa'] !== 'acomodacion' || a['Estado'] === 'Eliminada' || !a['Nombre'] || String(a['Fecha']).slice(0, 7) >= mes) return;
    var slot = (String(a['Clave']).split('|')[2] || '').split('-')[0];
    var l = lista[slot];
    if (!l) return;
    var h = out[norm_(a['Nombre'])] = out[norm_(a['Nombre'])] || {};
    if (!h[l] || h[l] < a['Fecha']) h[l] = a['Fecha'];
  });
  return out;
}

/** Acción "acomodacion": op = estado | agregarCondicion | quitarCondicion | generar. */
function accionAcomodacion_(yo, p, cfg) {
  puedeEditar_(yo, 'acomodacion');
  var h = hojaAcomodacion_();
  if (p.op === 'agregarCondicion') {
    var nombre = texto_(p.nombre), cond = texto_(p.condicion);
    if (!nombre || CONDICIONES_ACOM.indexOf(cond) < 0) throw new Error('Elige la persona y la condición.');
    if (/en$|al mes|disponible/i.test(cond) && !texto_(p.detalle)) throw new Error('Completa el detalle de la condición.');
    var persona = reconocerLista_(nombre, directorio_());
    hojaCondiciones_(h.ss).appendRow([persona || nombre, cond, texto_(p.detalle), yo.nombre]);
    registrar_('Condición de acomodación', yo.nombre + ': ' + (persona || nombre) + ' · ' + cond + (p.detalle ? ' · ' + p.detalle : ''));
  } else if (p.op === 'quitarCondicion') {
    var sh = h.ss.getSheetByName(HOJA_CONDICIONES);
    var fila = +p.fila;
    var actual = sh && fila >= 2 ? sh.getRange(fila, 1, 1, 3).getDisplayValues()[0] : null;
    // Se confirma que la fila sigue siendo la misma (alguien pudo editar la hoja entre medio)
    if (!actual || norm_(actual[0]) !== norm_(p.nombre) || norm_(actual[1]) !== norm_(p.condicion)) throw new Error('La condición cambió en la hoja. Vuelve a abrir esta ventana.');
    sh.deleteRow(fila);
    registrar_('Condición de acomodación quitada', yo.nombre + ': ' + actual.join(' · '));
  } else if (p.op === 'generar') {
    return generarAcomodacion_(yo, p, cfg, h);
  }
  var mes = /^\d{4}-\d{2}$/.test(String(p.mes || '')) ? p.mes : '';
  var listas = leerHabilitados_(h.ss);
  var nombres = [];
  ['acomodadores', 'sonido', 'microfonos', 'plataforma'].forEach(function (k) {
    (listas[k] || []).forEach(function (n) { if (nombres.indexOf(n) < 0) nombres.push(n); });
  });
  var cond = h.ss.getSheetByName(HOJA_CONDICIONES);
  return {
    ok: true, condiciones: leerCondiciones_(h.ss), tipos: CONDICIONES_ACOM,
    habilitados: nombres.sort(function (a, b) { return a.localeCompare(b, 'es'); }),
    reuniones: mes ? reunionesDelMes_(mes).reuniones.map(function (r) { return { fecha: r.fecha, especial: r.especial }; }) : [],
    url: h.url + (cond ? '#gid=' + cond.getSheetId() : '')
  };
}

function generarAcomodacion_(yo, p, cfg, h) {
  var mes = String(p.mes || '');
  if (!/^\d{4}-\d{2}$/.test(mes)) throw new Error('Mes inválido.');
  var info = reunionesDelMes_(mes);
  if (info.faltan.length) throw new Error('Aún falta aprobar: ' + info.faltan.join(' y ') + ' de ' + nombreMes_(mes).toLowerCase() + '.');
  if (info.acomExiste) throw new Error('Ya hay un programa de acomodación con fechas de ' + nombreMes_(mes).toLowerCase() + '.');
  var titulo = MESES_NOMBRES[+mes.slice(5, 7) - 1].charAt(0).toUpperCase() + MESES_NOMBRES[+mes.slice(5, 7) - 1].slice(1) + ' ' + mes.slice(0, 4);
  if (h.ss.getSheetByName(titulo)) throw new Error('Ya existe la pestaña «' + titulo + '» en la hoja de acomodación. Bórrala u ocúltala si quieres generarla de nuevo.');

  // Quién puede, con los nombres del directorio
  var dir = directorio_(), sinReconocer = [];
  var canon = function (n) { var x = reconocerLista_(n, dir); if (!x && sinReconocer.indexOf(n) < 0) sinReconocer.push(n); return x || n; };
  var crudas = leerHabilitados_(h.ss), listas = {};
  ['acomodadores', 'sonido', 'microfonos', 'plataforma'].forEach(function (k) { listas[k] = (crudas[k] || []).map(canon); });
  var condiciones = condicionesDeFilas_(leerCondiciones_(h.ss).map(function (c) { return [c.nombre, c.condicion, c.detalle]; }), function (n) { return reconocerLista_(n, dir) || n; }, +mes.slice(0, 4));

  // Ocupados: tienen una parte en la reunión de entre semana o del fin de semana ese día
  var asign = leerTabla_('asignaciones');
  var ocupados = {};
  asign.forEach(function (a) {
    if (['vmc', 'finsemana'].indexOf(a['Programa']) < 0 || a['Estado'] === 'Eliminada' || String(a['Fecha']).slice(0, 7) !== mes || a['Reconocido'] !== 'Sí') return;
    (ocupados[a['Fecha']] = ocupados[a['Fecha']] || {})[norm_(a['Nombre'])] = true;
  });

  // Plantilla: la última pestaña del programa (la de fechas más recientes)
  var plantilla = null, ultima = '';
  h.ss.getSheets().forEach(function (sh) {
    if (sh.isSheetHidden() || !sh.getLastRow()) return;
    var rango = sh.getDataRange();
    var res = parseAcomodacion({ name: sh.getName(), values: rango.getValues(), display: rango.getDisplayValues() });
    var f = res.reuniones.map(function (r) { return r.fecha; }).sort().pop() || '';
    if (f > ultima) { ultima = f; plantilla = sh; }
  });
  if (!plantilla) throw new Error('No encontré una pestaña de programa para copiar su formato.');
  var cols = columnasAcomodacion_(plantilla.getDataRange().getValues());
  var grupo = function (slot) { return cols.grupos.filter(function (g) { return g.slot === slot; })[0]; };
  var roles = [];
  if (grupo('acomodacion')) roles.push('hall', 'auditorio');
  if (grupo('microfono')) roles.push('microfono1', 'microfono2');
  if (grupo('plataforma')) roles.push('plataforma');
  if (grupo('av')) roles.push('audio', 'video');

  var plan = armarAcomodacion_({ reuniones: info.reuniones, listas: listas, roles: roles, condiciones: condiciones,
    ocupados: ocupados, historial: historialAcomodacion_(asign, mes), intentos: 400 });

  // Pestaña nueva con el formato de la plantilla
  var nueva = plantilla.copyTo(h.ss).setName(titulo);
  try { h.ss.setActiveSheet(nueva); h.ss.moveActiveSheet(plantilla.getIndex() + 1); } catch (e) { /* queda al final */ }
  var valores = nueva.getDataRange().getValues();
  var ancho = nueva.getLastColumn();
  var inicio = -1;
  for (var r = cols.hdr + 1; r < valores.length && inicio < 0; r++) if (fecha_(valores[r][cols.colFecha])) inicio = r;
  if (inicio < 0) inicio = cols.hdr + 2;
  if (nueva.getLastRow() > inicio) nueva.getRange(inicio + 1, 1, nueva.getLastRow() - inicio, ancho).clearContent();
  // Título del encabezado ("Programa Sept - Oct 2026" -> "Programa Diciembre 2026")
  for (r = 0; r < cols.hdr; r++) {
    for (var c = 0; c < ancho; c++) {
      var v = valores[r][c];
      if (typeof v === 'string' && /programa/i.test(v) && !/acomod/i.test(v) && /\b(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i.test(v)) nueva.getRange(r + 1, c + 1).setValue('Programa ' + titulo);
    }
  }
  var tz = Session.getScriptTimeZone();
  var filas = [];
  plan.reuniones.forEach(function (re) {
    var f1 = [], f2 = [];
    for (var k = 0; k < ancho; k++) { f1.push(''); f2.push(''); }
    if (cols.colDia >= 0) f1[cols.colDia] = DIAS_MAYUS[diaSemana_(re.fecha)];
    f1[cols.colFecha] = Utilities.parseDate(re.fecha, tz, 'yyyy-MM-dd');
    var g;
    if (re.especial) {
      if ((g = grupo('acomodacion'))) f1[g.col] = re.especial;
    } else {
      var x = re.roles;
      if ((g = grupo('acomodacion'))) { f1[g.col] = 'Hall'; f1[g.col + 1] = x.hall || ''; f2[g.col] = 'Auditorio'; f2[g.col + 1] = x.auditorio || ''; }
      if ((g = grupo('microfono'))) { f1[g.col] = x.microfono1 || ''; f2[g.col] = x.microfono2 || ''; }
      if ((g = grupo('plataforma'))) f1[g.col] = x.plataforma || '';
      if ((g = grupo('av'))) { f1[g.col] = 'Audio'; f1[g.col + 1] = x.audio || ''; f2[g.col] = 'Video'; f2[g.col + 1] = x.video || ''; }
    }
    filas.push(f1, f2);
  });
  if (filas.length) nueva.getRange(inicio + 1, 1, filas.length, ancho).setValues(filas);
  SpreadsheetApp.flush();
  registrar_('Programa de acomodación generado', yo.nombre + ': ' + titulo + ' · ' + plan.reuniones.length + ' reuniones' + (plan.vacios.length ? ' · ' + plan.vacios.length + ' sin asignar' : ''));

  // Se lee de inmediato para que aparezca como borrador en la app
  try { sincronizar_(false, 'acomodacion'); } catch (e) { registrar_('Error al sincronizar acomodación', e.message); }
  return {
    ok: true, pestana: titulo, url: h.url + '#gid=' + nueva.getSheetId(), reuniones: plan.reuniones.length,
    conteo: plan.conteo, vacios: plan.vacios, sinReconocer: sinReconocer
  };
}
