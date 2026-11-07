/**
 * Reportes de los informes de predicación (en la app) e historial previo a la app.
 *
 * - "Historial" (pestaña de la planilla de informes): una fila por persona con el último mes que informó
 *   antes de usar la app. Sirve para saber quién es publicador activo mientras la app junta sus propios meses.
 * - "Precursores regulares" (pestaña de la planilla de informes): total de cada precursor regular por año de servicio.
 *   Las filas "Calculado" se rehacen con los informes; las demás (p. ej. "Manual") no se tocan.
 * - Activo: informó haber participado al menos una vez en los últimos N meses (Inicio ▸ mesesActivo, 6).
 * - Reportes (acción "reportes"): s1 (congregación), precursores, actividad. El S-1 solo para quien ve todos los grupos.
 */

var TITULOS_HISTORIAL = ['Nombre', 'Grupo', 'Servicio', 'Último informe antes de la app (AAAA-MM)', 'Notas'];
var TITULOS_PRECURSORES = ['Nombre', 'Año de servicio', 'Meses', 'Horas', 'Horas otros servicios', 'Estudios (promedio)', 'Origen'];
var HORAS_ANIO_REGULAR = 600;

function mesMenos_(ym, n) {
  var d = new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1 - n, 1);
  return d.getFullYear() + '-' + pad2_(d.getMonth() + 1);
}

/** Año de servicio de un mes 'AAAA-MM' (sep–ago: septiembre 2026 = año 2027). */
function anioDeMes_(ym) { return +ym.slice(0, 4) + (+ym.slice(5, 7) >= 9 ? 1 : 0); }

/** Los 12 meses 'AAAA-MM' de un año de servicio. */
function mesesDelAnio_(anio) {
  var out = [];
  for (var i = 0; i < 12; i++) out.push(mesMenos_((anio - 1) + '-09', -i));
  return out;
}

function participo_(x) { return !/^n/i.test(String(x.participo)); }

function hojaInformes_(nombre, titulos) {
  var ss = planillaInformes_();
  var sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
    sh.getRange(1, 1, 1, titulos.length).setValues([titulos]).setFontWeight('bold').setBackground('#5e8499').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

/** { nombreNormalizado: { nombre, ultimo: 'AAAA-MM' } } */
function leerHistorial_() {
  var out = {};
  var ss = planillaInformes_();
  var sh = ss.getSheetByName('Historial');
  if (!sh) return out;
  var v = sh.getDataRange().getValues();
  v.shift();
  v.forEach(function (r) {
    var ult = mesTexto_(r[3]);
    if (r[0] && /^\d{4}-\d{2}$/.test(ult)) out[norm_(r[0])] = { nombre: r[0], ultimo: ult };
  });
  return out;
}

function leerPrecursoresGuardados_() {
  var sh = planillaInformes_().getSheetByName('Precursores regulares');
  if (!sh) return [];
  var v = sh.getDataRange().getValues();
  v.shift();
  return v.filter(function (r) { return r[0] && +r[1]; }).map(function (r) {
    return { nombre: String(r[0]), anio: +r[1], meses: +r[2] || 0, horas: +r[3] || 0, otros: +r[4] || 0, estudios: +r[5] || 0, origen: String(r[6] || '') };
  });
}

/** Informes por mes y persona (el más reciente de cada uno): { 'AAAA-MM': { nombreNorm: informe } } */
function informesPorMes_(informes) {
  var porMes = {};
  informes.forEach(function (x) {
    if (!/^\d{4}-\d{2}$/.test(String(x.mes))) return;
    var m = porMes[x.mes] = porMes[x.mes] || {};
    var n = norm_(x.nombre);
    if (!m[n] || new Date(x.ts) > new Date(m[n].ts)) m[n] = x;
  });
  return porMes;
}

/** Último mes con participación de cada persona, hasta 'hasta' (incluido), sumando el historial. { nombreNorm: 'AAAA-MM' } */
function ultimosMeses_(porMes, historial, hasta) {
  var out = {};
  Object.keys(historial).forEach(function (n) { if (historial[n].ultimo <= hasta) out[n] = historial[n].ultimo; });
  Object.keys(porMes).forEach(function (mes) {
    if (mes > hasta) return;
    Object.keys(porMes[mes]).forEach(function (n) {
      if (participo_(porMes[mes][n]) && (!out[n] || mes > out[n])) out[n] = mes;
    });
  });
  return out;
}

/** Personas con algún informe (aunque digan que no participaron): { nombreNorm: true } */
function conInforme_(porMes, historial) {
  var out = {};
  Object.keys(historial || {}).forEach(function (n) { out[n] = true; });
  Object.keys(porMes).forEach(function (m) { Object.keys(porMes[m]).forEach(function (n) { out[n] = true; }); });
  return out;
}

/** 'activo' | 'inactivo' | 'sinDatos' según el último mes con participación (sinDatos = nunca ha informado nada). */
function estadoActividad_(ultimo, mes, meses, algunInforme) {
  if (!ultimo) return algunInforme ? 'inactivo' : 'sinDatos';
  return ultimo >= mesMenos_(mes, meses - 1) ? 'activo' : 'inactivo';
}

/** Totales del S-1 de un mes. */
function totalesS1_(porMes, historial, mes, meses) {
  var lista = Object.keys(porMes[mes] || {}).map(function (n) { return porMes[mes][n]; }).filter(participo_);
  var pub = lista.filter(function (x) { return !/precursor/i.test(String(x.servicio)); });
  var aux = lista.filter(function (x) { return /auxiliar/i.test(String(x.servicio)); });
  var reg = lista.filter(function (x) { return /regular/i.test(String(x.servicio)); });
  var suma = function (l, c) { return l.reduce(function (s, x) { return s + (+x[c] || 0); }, 0); };
  var ult = ultimosMeses_(porMes, historial, mes);
  var activos = Object.keys(ult).filter(function (n) { return estadoActividad_(ult[n], mes, meses) === 'activo'; }).length;
  return {
    activos: activos,
    publicadores: { informaron: pub.length, estudios: suma(pub, 'estudios') },
    auxiliares: { informaron: aux.length, horas: suma(aux, 'horas'), estudios: suma(aux, 'estudios') },
    regulares: { informaron: reg.length, horas: suma(reg, 'horas'), otros: suma(reg, 'otros'), estudios: suma(reg, 'estudios') },
    noParticiparon: Object.keys(porMes[mes] || {}).length - lista.length
  };
}

/** Promedio de asistencia de un mes (si existe la planilla de asistencia). */
function asistenciaDelMes_(cfg, mes) {
  if (!PropertiesService.getScriptProperties().getProperty('ASISTENCIA_ID')) return null;
  try {
    var k = +mes.replace('-', '');
    var regs = leerAsistencia_(planillaAsistencia_(cfg)).filter(function (x) { return mesNumero_(x.fecha) === k; });
    var prom = function (r) {
      var l = regs.filter(function (x) { return x.reunion === r; });
      return l.length ? { reuniones: l.length, promedio: Math.round(l.reduce(function (s, x) { return s + x.total; }, 0) / l.length) } : null;
    };
    return { semana: prom('Entre semana'), finde: prom('Fin de semana') };
  } catch (e) { console.warn(e); return null; }
}

/** Acción "reportes": tipo = s1 | precursores | actividad. */
function reportesInformes_(yo, p, cfg) {
  var grupos = gruposVisiblesInformes_(yo, cfg);
  if (grupos !== 'todos' && !grupos.length) throw new Error('No tienes acceso a los informes.');
  var todos = grupos === 'todos';
  var tipo = String(p.tipo || 'actividad');
  var meses = +(cfg.mesesActivo || 6) || 6;
  var dir = directorio_();
  var porMes = informesPorMes_(leerInformes_(cfg, dir));
  var historial = leerHistorial_();
  var mesActual = mesAInformar_();
  var mes = /^\d{4}-\d{2}$/.test(String(p.mes || '')) ? String(p.mes) : mesActual;
  var visible = function (persona) { return todos || (persona && grupos.indexOf(+persona.grupo) >= 0); };
  var base = { ok: true, tipo: tipo, todos: todos, mes: mes, mesNombre: nombreMes_(mes), mesActual: mesActual, mesesActivo: meses };

  if (tipo === 's1') {
    if (!todos) throw new Error('El S-1 lo ven solo quienes ven los informes de toda la congregación.');
    var t = totalesS1_(porMes, historial, mes, meses);
    // Por grupo: cuántos informaron y cuántos activos faltan
    var ult = ultimosMeses_(porMes, historial, mes);
    var porGrupo = {};
    dir.personas.forEach(function (x) {
      var g = +x.grupo;
      if (!g) return;
      var o = porGrupo[g] = porGrupo[g] || { grupo: g, miembros: 0, informaron: 0, activos: 0, faltan: 0 };
      var n = norm_(x.nombre), inf = (porMes[mes] || {})[n];
      o.miembros++;
      if (inf) o.informaron++;
      if (estadoActividad_(ult[n], mes, meses) === 'activo') { o.activos++; if (!inf) o.faltan++; }
    });
    // Últimos 12 meses para comparar
    var historia = [];
    for (var i = 11; i >= 0; i--) {
      var m = mesMenos_(mes, i);
      if (!porMes[m] && !historia.length) continue;
      var tt = totalesS1_(porMes, historial, m, meses);
      historia.push({ mes: m, activos: tt.activos, informaron: tt.publicadores.informaron + tt.auxiliares.informaron + tt.regulares.informaron,
        horas: tt.auxiliares.horas + tt.regulares.horas, estudios: tt.publicadores.estudios + tt.auxiliares.estudios + tt.regulares.estudios });
    }
    base.s1 = t;
    base.asistencia = asistenciaDelMes_(cfg, mes);
    base.grupos = Object.keys(porGrupo).sort(function (a, b) { return +a - +b; }).map(function (g) { return porGrupo[g]; });
    base.historia = historia;
    base.historialCargado = Object.keys(historial).length;
    return base;
  }

  if (tipo === 'precursores') {
    var anio = +p.anio || anioDeMes_(mesActual);
    var lista = mesesDelAnio_(anio);
    var porNombre = {};
    lista.forEach(function (m, i) {
      Object.keys(porMes[m] || {}).forEach(function (n) {
        var x = porMes[m][n];
        if (!/regular/i.test(String(x.servicio))) return;
        var persona = reconocer_(x.nombre, dir);
        if (!visible(persona)) return;
        var o = porNombre[n] = porNombre[n] || { nombre: persona ? persona.nombre : x.nombre, grupo: persona ? +persona.grupo || null : null, meses: [], horas: 0, otros: 0, estudios: 0, informados: 0 };
        o.meses[i] = { horas: +x.horas || 0, otros: +x.otros || 0, estudios: +x.estudios || 0 };
        o.horas += +x.horas || 0; o.otros += +x.otros || 0; o.estudios += +x.estudios || 0; o.informados++;
      });
    });
    // Precursores marcados en Personas que aún no informan este año
    dir.personas.forEach(function (x) {
      if (/regular/i.test(String(x.servicio)) && visible(x) && !porNombre[norm_(x.nombre)])
        porNombre[norm_(x.nombre)] = { nombre: x.nombre, grupo: +x.grupo || null, meses: [], horas: 0, otros: 0, estudios: 0, informados: 0 };
    });
    var guardados = leerPrecursoresGuardados_();
    var transcurridos = lista.filter(function (m) { return m <= mesActual; }).length;
    base.anio = anio;
    base.anioActual = anioDeMes_(mesActual);
    base.meses = lista.map(function (m) { return MESES_LARGOS[+m.slice(5, 7) - 1].slice(0, 3); });
    base.transcurridos = transcurridos;
    base.metaAnual = HORAS_ANIO_REGULAR;
    base.precursores = Object.keys(porNombre).map(function (n) {
      var o = porNombre[n];
      var meta = Math.round(HORAS_ANIO_REGULAR / 12 * transcurridos);
      o.meta = meta;
      o.anterior = guardados.filter(function (g) { return norm_(g.nombre) === n && g.anio === anio - 1; })[0] || null;
      for (var k = 0; k < 12; k++) if (!o.meses[k]) o.meses[k] = null;
      return o;
    }).sort(function (a, b) { return (a.grupo || 99) - (b.grupo || 99) || a.nombre.localeCompare(b.nombre, 'es'); });
    base.guardados = guardados.filter(function (g) { var per = reconocer_(g.nombre, dir); return g.anio < anio && (todos || visible(per)); })
      .sort(function (a, b) { return b.anio - a.anio || a.nombre.localeCompare(b.nombre, 'es'); });
    return base;
  }

  if (tipo === 'grupo') return analisisGrupo_(yo, p, cfg, base, grupos, dir, porMes, historial, meses);

  // Actividad: quién está activo, inactivo o sin datos, por grupo
  var ultimos = ultimosMeses_(porMes, historial, mes);
  var conInf = conInforme_(porMes, historial);
  var gruposA = {};
  dir.personas.forEach(function (x) {
    var g = +x.grupo;
    if (!g || !visible(x)) return;
    var n = norm_(x.nombre);
    var ultimos6 = 0;
    for (var j = 0; j < meses; j++) { var inf = (porMes[mesMenos_(mes, j)] || {})[n]; if (inf && participo_(inf)) ultimos6++; }
    (gruposA[g] = gruposA[g] || []).push({
      nombre: x.nombre, servicio: x.servicio || '', ultimo: ultimos[n] || '', estado: estadoActividad_(ultimos[n], mes, meses, conInf[n]),
      meses: ultimos6, informoEste: !!(porMes[mes] || {})[n]
    });
  });
  base.grupos = Object.keys(gruposA).sort(function (a, b) { return +a - +b; }).map(function (g) {
    var l = gruposA[g].sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
    return { grupo: +g, personas: l,
      activos: l.filter(function (x) { return x.estado === 'activo'; }).length,
      inactivos: l.filter(function (x) { return x.estado === 'inactivo'; }).length,
      sinDatos: l.filter(function (x) { return x.estado === 'sinDatos'; }).length };
  });
  base.historialCargado = Object.keys(historial).length;
  return base;
}

/* ------------------------------------------------------------------ */
/* Recordatorio a superintendentes y auxiliares                         */
/* ------------------------------------------------------------------ */

/** ¿Hoy toca? "3,5,7,10,15+" = esos días, y desde el 15 todos los días. */
function tocaHoy_(texto, dia) {
  return String(texto || '').split(/[,;\s]+/).filter(Boolean).some(function (x) {
    var n = parseInt(x, 10);
    return /\+$/.test(x) ? dia >= n : dia === n;
  });
}

/**
 * Aviso push al superintendente y al auxiliar de cada grupo con los informes que faltan del mes anterior.
 * No cuentan los inactivos (sin informar hace más de mesesActivo meses); los "sin datos" sí cuentan,
 * por eso conviene cargar el historial. Se deja de avisar a un grupo cuando ya no le falta nadie.
 */
function recordatoriosInformeGrupos_(cfg) {
  var dia = +Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'd');
  var hora = +Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'H');
  var dias = cfg.diasRecordatorioInformeGrupo == null ? '3,5,7,10,15+' : cfg.diasRecordatorioInformeGrupo;
  if (!tocaHoy_(dias, dia) || hora < +(cfg.horaRecordatorioInforme || 10)) return 0;
  if (!si_(cfg.notificacionesActivas)) return 0;
  var mes = mesAInformar_();
  if (!informePedido_(cfg, mes) || !unaVezAlDia_('RECORDATORIO_INFORME_GRUPOS')) return 0;
  var meses = +(cfg.mesesActivo || 6) || 6;
  var dir = directorio_();
  var porMes = informesPorMes_(leerInformes_(cfg, dir));
  var historial = leerHistorial_();
  var ult = ultimosMeses_(porMes, historial, mes);
  var conInf = conInforme_(porMes, historial);
  var faltan = {};
  dir.personas.forEach(function (x) {
    var g = +x.grupo, n = norm_(x.nombre);
    if (!g || (porMes[mes] || {})[n]) return;
    if (estadoActividad_(ult[n], mes, meses, conInf[n]) === 'inactivo') return;
    (faltan[g] = faltan[g] || []).push(x.nombre);
  });
  var correoDe = function (nombre) {
    var p = nombre && reconocer_(nombre, dir);
    return p ? String(p.correo || '').toLowerCase() : '';
  };
  var mesNom = MESES_LARGOS[+mes.slice(5, 7) - 1].toLowerCase();
  var n = 0, detalle = [];
  Object.keys(faltan).forEach(function (g) {
    var l = faltan[g].sort(function (a, b) { return a.localeCompare(b, 'es'); });
    var g0 = dir.grupos[g] || {};
    var nombres = l.slice(0, 3).map(function (x) { return x.split(' ')[0] + ' ' + (x.split(' ')[1] || '').charAt(0) + '.'; }).join(', ') + (l.length > 3 ? ' y ' + (l.length - 3) + ' más' : '');
    var titulo = 'Grupo ' + g + ': falta' + (l.length === 1 ? '' : 'n') + ' ' + l.length + ' informe' + (l.length === 1 ? '' : 's') + ' de ' + mesNom;
    [g0.sup, g0.aux].map(correoDe).filter(function (c, i, a) { return c && a.indexOf(c) === i; }).forEach(function (c) {
      n += notificar_(cfg, c, titulo, nombres + '. Toca para ver quiénes faltan y recordarles.', './#informes', 'informes-grupo-' + g) ? 1 : 0;
    });
    detalle.push('G' + g + ': ' + l.length);
  });
  if (n) registrar_('Recordatorio de informes a grupos', n + ' aviso(s) · ' + nombreMes_(mes) + ' · faltan ' + detalle.join(', '));
  return n;
}

/* ------------------------------------------------------------------ */
/* Traspaso de formularios antiguos e historial                          */
/* ------------------------------------------------------------------ */

/**
 * Menú ▸ Informes: traspasar formularios antiguos y armar historial.
 * Con las planillas de Inicio ▸ informesFormularios:
 *  1. Copia a la planilla de informes los meses desde septiembre 2026 (si no estaban).
 *  2. Llena "Historial" con todas las personas y, si está vacío, el último mes que informaron antes de la app.
 *  3. Rehace las filas "Calculado" de "Precursores regulares" (total por año de servicio).
 * Se puede repetir: no duplica ni pisa lo escrito a mano.
 */
function traspasarInformesAntiguos() {
  var cfg = config_();
  var dir = directorio_();
  var todos = leerInformes_(cfg, dir);
  var desde = '2026-09';
  var app = todos.filter(function (x) { return x.origen === 'app'; });
  var antiguos = todos.filter(function (x) { return x.origen === 'formulario'; });
  var yaEsta = {};
  app.forEach(function (x) { yaEsta[norm_(x.nombre) + '|' + x.mes] = true; });

  // 1. Meses recientes a la planilla de informes
  var porMes = informesPorMes_(antiguos);
  var nuevas = [];
  Object.keys(porMes).filter(function (m) { return m >= desde; }).forEach(function (m) {
    Object.keys(porMes[m]).forEach(function (n) {
      var x = porMes[m][n];
      if (yaEsta[n + '|' + m]) return;
      var regular = /regular/i.test(String(x.servicio)), prec = /precursor/i.test(String(x.servicio));
      var servicio = regular ? 'Precursor Regular' : prec ? 'Precursor Auxiliar' : 'Publicador';
      nuevas.push([x.ts instanceof Date ? x.ts : new Date(), '', x.nombre, x.grupo || '', m, servicio, participo_(x) ? 'Sí' : 'No',
        +x.estudios || 0, prec ? +x.horas || 0 : '', texto_(x.comentarios || ''), 'Traspaso de formulario', '']);
    });
  });
  if (nuevas.length) {
    var sh = planillaInformes_().getSheetByName('Informes');
    var fila = sh.getLastRow() + 1;
    sh.getRange(fila, 5, nuevas.length, 1).setNumberFormat('@');
    sh.getRange(fila, 1, nuevas.length, nuevas[0].length).setValues(nuevas);
  }

  // 2. Historial: una fila por persona; el último mes antes de la app (sin pisar lo escrito)
  var antes = ultimosMeses_(informesPorMes_(antiguos.filter(function (x) { return x.mes < desde; })), {}, '9999-99');
  var hh = hojaInformes_('Historial', TITULOS_HISTORIAL);
  hh.getRange('D:D').setNumberFormat('@');
  var v = hh.getDataRange().getValues();
  v.shift();
  var filas = {};
  v.forEach(function (r, i) { if (r[0]) filas[norm_(r[0])] = { fila: i + 2, ultimo: mesTexto_(r[3]) }; });
  var agregar = [], completados = 0;
  dir.personas.forEach(function (x) {
    var n = norm_(x.nombre), ult = antes[n] || '';
    if (filas[n]) {
      if (ult && !/^\d{4}-\d{2}$/.test(filas[n].ultimo)) { hh.getRange(filas[n].fila, 4).setValue(ult); completados++; }
      return;
    }
    agregar.push([x.nombre, +x.grupo || '', x.servicio || '', ult, ult ? 'Formulario' : '']);
  });
  if (agregar.length) hh.getRange(hh.getLastRow() + 1, 1, agregar.length, TITULOS_HISTORIAL.length).setValues(agregar);
  hh.setColumnWidth(1, 220); hh.setColumnWidth(4, 260);

  // 3. Precursores regulares: total por año de servicio con los formularios y la app
  var nPrec = actualizarPrecursores_(cfg, dir, todos);

  var msg = nuevas.length + ' informe(s) copiados desde ' + desde + ', historial: ' + agregar.length + ' persona(s) nuevas y ' + completados + ' completadas, ' + nPrec + ' fila(s) de precursores.';
  registrar_('Traspaso de informes antiguos', msg);
  try { SpreadsheetApp.getActive().toast(msg, 'Informes', 10); } catch (e) { /* sin interfaz */ }
  return msg;
}

/** Rehace las filas "Calculado" de "Precursores regulares" (años ya terminados y el año en curso). */
function actualizarPrecursores_(cfg, dir, informes) {
  dir = dir || directorio_();
  informes = informes || leerInformes_(cfg, dir);
  var porMes = informesPorMes_(informes);
  var acum = {};
  Object.keys(porMes).forEach(function (m) {
    Object.keys(porMes[m]).forEach(function (n) {
      var x = porMes[m][n];
      if (!/regular/i.test(String(x.servicio))) return;
      var k = n + '|' + anioDeMes_(m);
      var persona = reconocer_(x.nombre, dir);
      var o = acum[k] = acum[k] || { nombre: persona ? persona.nombre : x.nombre, anio: anioDeMes_(m), meses: 0, horas: 0, otros: 0, estudios: 0 };
      o.meses++; o.horas += +x.horas || 0; o.otros += +x.otros || 0; o.estudios += +x.estudios || 0;
    });
  });
  var sh = hojaInformes_('Precursores regulares', TITULOS_PRECURSORES);
  var v = sh.getDataRange().getValues();
  var tit = v.shift();
  var manuales = v.filter(function (r) { return r[0] && String(r[6]) !== 'Calculado'; });
  var fijos = {};
  manuales.forEach(function (r) { fijos[norm_(r[0]) + '|' + (+r[1])] = true; });
  var calculadas = Object.keys(acum).filter(function (k) { return !fijos[k]; }).map(function (k) {
    var o = acum[k];
    return [o.nombre, o.anio, o.meses, o.horas, o.otros || '', o.meses ? Math.round(10 * o.estudios / o.meses) / 10 : 0, 'Calculado'];
  });
  var todas = manuales.map(function (r) { return r.slice(0, TITULOS_PRECURSORES.length); }).concat(calculadas)
    .sort(function (a, b) { return (+b[1]) - (+a[1]) || String(a[0]).localeCompare(String(b[0]), 'es'); });
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, Math.max(tit.length, TITULOS_PRECURSORES.length)).clearContent();
  if (todas.length) sh.getRange(2, 1, todas.length, TITULOS_PRECURSORES.length).setValues(todas);
  return calculadas.length;
}

/* ------------------------------------------------------------------ */
/* Importar el historial de la planilla "Los Romeros - Registro Predicación" */
/* ------------------------------------------------------------------ */

// Copia privada subida el 2026-11-07 (cuenta congrelosromeros). Pestañas "Registros" y "Precursores 2026".
var HISTORIAL_IMPORTAR_ID = '1pRtYGLWpH8tgA5h9TxWS5AGz4KFljuCFMYNwxUZk4E8';

/** "Septiembre 2026" -> '2026-09' */
function mesDeTexto_(t) {
  var m = /([a-záéíóú]+)\s+(\d{4})/i.exec(String(t || ''));
  if (!m) return '';
  var i = MESES_LARGOS.map(norm_).indexOf(norm_(m[1]));
  return i < 0 ? '' : m[2] + '-' + pad2_(i + 1);
}

/**
 * Menú ▸ Informes: importar historial (Registro Predicación).
 * - Todos los informes mensuales de "Registros" (sep 2025 en adelante) pasan a la planilla de informes
 *   (Ingresado por = "Importado"); no se duplican ni pisan los que ya estaban.
 *   Publicador sin horas = no participó. Horas de crédito de los precursores regulares en "Horas otros servicios".
 * - "Precursores 2026" se resume por precursor en "Precursores regulares" (año de servicio 2026, origen "Importado").
 * - "Historial" queda con el último mes informado de cada persona.
 * Se puede repetir sin duplicar.
 */
function importarHistorialInformes() {
  var cfg = config_();
  var dir = directorio_();
  var src = SpreadsheetApp.openById(HISTORIAL_IMPORTAR_ID);
  var col = function (tit, re) { for (var k = 0; k < tit.length; k++) if (re.test(norm_(tit[k]))) return k; return -1; };
  var nombreDe = function (t) { var p = reconocer_(nombreFormulario_(t), dir); return { nombre: p ? p.nombre : nombreFormulario_(t), grupo: p ? +p.grupo || '' : '', ok: !!p }; };

  // Crédito de los precursores regulares por persona y mes (pestaña "Precursores 2026")
  var credito = {}, resumen = {};
  var hp = src.getSheetByName('Precursores 2026');
  if (hp) {
    var vp = hp.getDataRange().getValues(), tp = vp.shift();
    var cN = col(tp, /^nombre$/), cH = col(tp, /^horas$/), cC = col(tp, /^cursos/), cCr = col(tp, /^horas credito$/), cM = col(tp, /^mes/);
    vp.forEach(function (r) {
      var mes = mesDeTexto_(r[cM]);
      if (!r[cN] || !mes) return;
      var p = nombreDe(r[cN]), k = norm_(p.nombre);
      credito[k + '|' + mes] = +r[cCr] || 0;
      var a = anioDeMes_(mes), o = resumen[k + '|' + a] = resumen[k + '|' + a] || { nombre: p.nombre, anio: a, meses: 0, horas: 0, otros: 0, estudios: 0 };
      o.meses++; o.horas += +r[cH] || 0; o.otros += +r[cCr] || 0; o.estudios += +r[cC] || 0;
    });
  }

  // Informes mensuales (pestaña "Registros")
  var hr = src.getSheetByName('Registros');
  var v = hr.getDataRange().getValues(), t = v.shift();
  var cNom = col(t, /^nombre$/), cHor = col(t, /^horas$/), cCur = col(t, /^cursos/), cCom = col(t, /^comentario/), cTipo = col(t, /^p\/pr\/pa/), cMes = col(t, /^mes/);
  var existentes = {};
  leerInformes_(cfg, dir).forEach(function (x) { if (x.origen === 'app') existentes[norm_(x.nombre) + '|' + x.mes] = true; });
  var filas = [], sinReconocer = {}, ultimo = {};
  v.forEach(function (r) {
    var mes = mesDeTexto_(r[cMes]);
    if (!r[cNom] || !mes) return;
    var p = nombreDe(r[cNom]), k = norm_(p.nombre);
    if (!p.ok) sinReconocer[p.nombre] = true;
    var tipo = norm_(r[cTipo]);
    var servicio = /reg/.test(tipo) ? 'Precursor Regular' : /aux/.test(tipo) ? 'Precursor Auxiliar' : 'Publicador';
    var horas = r[cHor] === '' || r[cHor] === null ? null : +r[cHor];
    var participo = servicio !== 'Publicador' || horas ? 'Sí' : 'No';
    if (participo === 'Sí' && (!ultimo[k] || mes > ultimo[k].mes)) ultimo[k] = { nombre: p.nombre, grupo: p.grupo, servicio: servicio, mes: mes };
    if (existentes[k + '|' + mes]) return;
    existentes[k + '|' + mes] = true;
    var otros = '';
    if (servicio === 'Precursor Regular') {
      otros = credito[k + '|' + mes];
      if (otros == null) { var mm = /(\d+)\s*(h|hrs|horas)\b/i.exec(String(r[cCom] || '')); otros = mm ? +mm[1] : ''; }
    }
    var d = new Date(+mes.slice(0, 4), +mes.slice(5, 7), 1); // día 1 del mes siguiente
    filas.push([d, '', p.nombre, p.grupo, mes, servicio, participo, +r[cCur] || 0, servicio === 'Publicador' ? '' : (horas || 0), texto_(r[cCom] || ''), 'Importado', otros || '']);
  });
  if (filas.length) {
    var sh = planillaInformes_().getSheetByName('Informes');
    var desde = sh.getLastRow() + 1;
    sh.getRange(desde, 5, filas.length, 1).setNumberFormat('@');
    sh.getRange(desde, 1, filas.length, TITULOS_INFORMES.length).setValues(filas);
  }

  // Precursores regulares: total del año 2026 con el crédito
  var spr = hojaInformes_('Precursores regulares', TITULOS_PRECURSORES);
  var vpr = spr.getDataRange().getValues(); vpr.shift();
  var ya = {};
  vpr.forEach(function (r, i) { if (r[0]) ya[norm_(r[0]) + '|' + (+r[1])] = i + 2; });
  var nPrec = 0;
  Object.keys(resumen).forEach(function (k) {
    var o = resumen[k];
    var fila = [o.nombre, o.anio, o.meses, o.horas, o.otros || '', o.meses ? Math.round(10 * o.estudios / o.meses) / 10 : 0, 'Importado'];
    if (ya[k]) spr.getRange(ya[k], 1, 1, fila.length).setValues([fila]); else spr.appendRow(fila);
    nPrec++;
  });

  // Historial: último mes con participación de cada persona
  var hh = hojaInformes_('Historial', TITULOS_HISTORIAL);
  hh.getRange('D:D').setNumberFormat('@');
  var vh = hh.getDataRange().getValues(); vh.shift();
  var enHist = {};
  vh.forEach(function (r, i) { if (r[0]) enHist[norm_(r[0])] = { fila: i + 2, ultimo: mesTexto_(r[3]) }; });
  var nuevas = [];
  Object.keys(ultimo).forEach(function (k) {
    var u = ultimo[k];
    if (enHist[k]) { if (!/^\d{4}-\d{2}$/.test(enHist[k].ultimo) || enHist[k].ultimo < u.mes) hh.getRange(enHist[k].fila, 4).setValue(u.mes); return; }
    nuevas.push([u.nombre, u.grupo, u.servicio, u.mes, 'Importado']);
  });
  if (nuevas.length) hh.getRange(hh.getLastRow() + 1, 1, nuevas.length, TITULOS_HISTORIAL.length).setValues(nuevas);

  var faltan = Object.keys(sinReconocer);
  var msg = filas.length + ' informe(s) importados, ' + nPrec + ' precursor(es) con su total 2026, ' + nuevas.length + ' persona(s) en Historial.' +
    (faltan.length ? ' No reconocidos en Personas (se guardan con el nombre del archivo): ' + faltan.join(', ') : '');
  registrar_('Historial de informes importado', msg);
  try { actualizarDatosS1_(cfg); } catch (e) { console.warn(e); }
  try { SpreadsheetApp.getActive().toast(msg.slice(0, 250), 'Informes', 15); } catch (e) { /* sin interfaz */ }
  return msg;
}

/* ------------------------------------------------------------------ */
/* Análisis de un grupo (para superintendentes)                          */
/* ------------------------------------------------------------------ */

function analisisGrupo_(yo, p, cfg, base, grupos, dir, porMes, historial, meses) {
  var todos = grupos === 'todos';
  var lista = todos ? Object.keys(dir.grupos).map(Number).filter(Boolean).sort(function (a, b) { return a - b; }) : grupos.slice().sort(function (a, b) { return a - b; });
  var g = +p.grupo;
  if (lista.indexOf(g) < 0) g = lista.indexOf(+yo.grupo) >= 0 ? +yo.grupo : lista[0];
  if (!g) throw new Error('No hay grupos para analizar.');
  var mes = base.mesActual;
  var miembros = dir.personas.filter(function (x) { return +x.grupo === g; });
  var congregacion = dir.personas.filter(function (x) { return +x.grupo; });
  var de = function (m, x) { return (porMes[m] || {})[norm_(x.nombre)]; };
  var conInf = conInforme_(porMes, historial);

  // Serie de 12 meses (con la composición actual del grupo)
  var serie = [];
  for (var i = 11; i >= 0; i--) {
    var m = mesMenos_(mes, i);
    var infs = miembros.map(function (x) { return de(m, x); }).filter(Boolean);
    var part = infs.filter(participo_);
    var congInf = congregacion.filter(function (x) { return de(m, x); }).length;
    serie.push({
      mes: m, informaron: infs.length, participaron: part.length,
      horas: part.reduce(function (s2, x) { return s2 + (/precursor/i.test(String(x.servicio)) ? +x.horas || 0 : 0); }, 0),
      estudios: part.reduce(function (s2, x) { return s2 + (+x.estudios || 0); }, 0),
      auxiliares: part.filter(function (x) { return /auxiliar/i.test(String(x.servicio)); }).length,
      pct: miembros.length ? Math.round(100 * infs.length / miembros.length) : 0,
      pctCong: congregacion.length ? Math.round(100 * congInf / congregacion.length) : 0
    });
  }
  while (serie.length && !serie[0].informaron) serie.shift();

  // Estado de cada persona
  var ult = ultimosMeses_(porMes, historial, mes);
  var ultAnt = ultimosMeses_(porMes, historial, mesMenos_(mes, 1));
  var personas = miembros.map(function (x) {
    var n = norm_(x.nombre), est = estadoActividad_(ult[n], mes, meses, conInf[n]);
    var seguidos = 0;
    for (var j = 0; j < meses; j++) { var inf = de(mesMenos_(mes, j), x); if (inf && participo_(inf)) seguidos++; }
    if (est === 'activo' && seguidos < meses && Object.keys(porMes).some(function (mm) { return mm <= mesMenos_(mes, meses - 1); })) est = 'irregular';
    var este = de(mes, x);
    var motivo = '';
    if (est !== 'inactivo' && est !== 'sinDatos') {
      if (ult[n] && ult[n] <= mesMenos_(mes, meses - 1)) motivo = 'Si no informa este mes queda inactivo';
      else if (ult[n] && ult[n] <= mesMenos_(mes, 2)) motivo = 'No informa participación desde ' + nombreMes_(ult[n]).toLowerCase();
    }
    if (este && participo_(este) && estadoActividad_(ultAnt[n], mesMenos_(mes, 1), meses, conInf[n]) === 'inactivo') motivo = 'Se reactivó este mes';
    if (este && !participo_(este)) motivo = motivo || 'Informó que no participó este mes';
    return { nombre: x.nombre, telefono: String(x.telefono || ''), estado: est, ultimo: ult[n] || '', meses: seguidos, motivo: motivo, informoEste: !!este, servicio: este ? este.servicio : x.servicio || '' };
  }).sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
  var cuenta = function (e) { return personas.filter(function (x) { return x.estado === e; }).length; };

  // Precursores del grupo (año de servicio actual)
  var anio = anioDeMes_(mes), mesesAnio = mesesDelAnio_(anio).filter(function (m2) { return m2 <= mes; });
  var precursores = miembros.map(function (x) {
    var hs = 0, ot = 0, n2 = 0;
    mesesAnio.forEach(function (m2) { var inf = de(m2, x); if (inf && /regular/i.test(String(inf.servicio))) { hs += +inf.horas || 0; ot += +inf.otros || 0; n2++; } });
    return n2 || /regular/i.test(String(x.servicio)) ? { nombre: x.nombre, horas: hs, otros: ot, meses: n2, meta: Math.round(HORAS_ANIO_REGULAR / 12 * mesesAnio.length) } : null;
  }).filter(Boolean);
  var auxiliares = miembros.filter(function (x) { var inf = de(mes, x); return inf && /auxiliar/i.test(String(inf.servicio)); }).map(function (x) { var inf = de(mes, x); return { nombre: x.nombre, horas: +inf.horas || 0 }; });

  // Puntualidad: día del mes siguiente en que se envió cada informe (solo los enviados en la app)
  var puntualidad = [];
  for (var k = 5; k >= 0; k--) {
    var m3 = mesMenos_(mes, k);
    var dias = miembros.map(function (x) { return de(m3, x); }).filter(function (x) { return x && x.ingresadoPor !== 'Importado' && x.ts; })
      .map(function (x) { var d = new Date(x.ts), sig = mesMenos_(m3, -1); var ym = Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM'); return ym === sig ? +Utilities.formatDate(d, Session.getScriptTimeZone(), 'd') : ym < sig ? 1 : 31; })
      .sort(function (a, b) { return a - b; });
    if (dias.length) puntualidad.push({ mes: m3, enviados: dias.length, antesDel10: dias.filter(function (d) { return d <= 10; }).length, mediana: dias[Math.floor((dias.length - 1) / 2)], ultimo: dias[dias.length - 1] });
  }

  base.grupo = g;
  base.gruposLista = lista;
  base.miembros = miembros.length;
  base.serie = serie;
  base.resumen = { activos: cuenta('activo'), irregulares: cuenta('irregular'), inactivos: cuenta('inactivo'), sinDatos: cuenta('sinDatos') };
  base.personas = personas;
  base.atencion = personas.filter(function (x) { return x.motivo; });
  base.precursores = precursores;
  base.auxiliares = auxiliares;
  base.puntualidad = puntualidad;
  base.anio = anio;
  return base;
}
