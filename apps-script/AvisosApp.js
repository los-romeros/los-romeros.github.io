/**
 * Avisos importantes publicados desde la app (pestaña Avisos).
 * Pueden publicar y quitar: admin e Inicio ▸ avisosPublican (por defecto Felipe González, Hermes Moraga).
 * Quitar no borra la fila: pone "Mostrar hasta" en ayer (se puede recuperar en la planilla).
 */

function avisosPublican_(cfg) {
  return cfg && cfg.avisosPublican != null ? cfg.avisosPublican : 'Felipe González, Hermes Moraga';
}

function puedePublicarAvisos_(yo, cfg) {
  if (yo.rol === 'admin') return true;
  var t = avisosPublican_(cfg);
  return !!texto_(t) && !!yo.nombre && enAudiencia_(t, yo);
}

function accionAvisos_(yo, p, cfg) {
  if (!puedePublicarAvisos_(yo, cfg)) throw new Error('No tienes permiso para publicar avisos.');
  asegurarColumnas_('avisos');
  var fecha = function (v) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : ''; };
  if (p.op === 'crear') {
    var titulo = texto_(p.titulo || '').slice(0, 120);
    if (!titulo) throw new Error('Escribe un título.');
    var f = fecha(p.fecha), fin = fecha(p.fin);
    if (fin && f && fin < f) throw new Error('La fecha de término es anterior a la de inicio.');
    var hasta = fecha(p.hasta);
    if (!f && !hasta) throw new Error('Indica la fecha del evento o hasta cuándo se muestra el aviso.');
    var hora = /^\d{1,2}:\d{2}$/.test(String(p.hora || '')) ? String(p.hora) : '';
    var aviso = {
      'Título': titulo, 'Detalle': String(p.detalle || '').trim().slice(0, 1000), 'Ícono': ['megafono', 'grupo', 'calendario', 'libro'].indexOf(p.icono) >= 0 ? p.icono : 'megafono',
      'Mostrar hasta': hasta, 'Orden': '', 'Visible para': texto_(p.visiblePara || '') || 'todos', 'Fecha del evento': f, 'Fecha fin': fin, 'Hora': hora,
      'Lugar': texto_(p.lugar || '').slice(0, 200), 'Fijo (no se puede quitar)': '', 'Recordar días antes': p.recordar === '' || p.recordar == null ? '' : Math.max(0, Math.min(60, +p.recordar || 0)),
      'Publicado por': yo.nombre
    };
    agregarFilas_('avisos', [aviso]);
    // Fechas como texto (si no, Sheets las interpreta según el idioma de la planilla)
    var sh = hoja_('avisos'), fila = sh.getLastRow(), tit = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    ['Mostrar hasta', 'Fecha del evento', 'Fecha fin', 'Hora'].forEach(function (c) {
      var k = tit.indexOf(c);
      if (k >= 0 && aviso[c]) sh.getRange(fila, k + 1).setNumberFormat('@').setValue(aviso[c]);
    });
    registrar_('Aviso publicado en la app', yo.nombre + ': ' + titulo);
    return { ok: true };
  }
  if (p.op === 'quitar') {
    var filas = leerTabla_('avisos', { opcional: true });
    var objetivo = filas.filter(function (a) { var x = avisoDeFila_(cfg, a); return x && x.id === p.id; })[0];
    if (!objetivo) throw new Error('No encontré ese aviso. Puede que ya se haya quitado.');
    if (objetivo['Fijo (no se puede quitar)'] === true || si_(objetivo['Fijo (no se puede quitar)'])) throw new Error('Ese aviso está marcado como fijo; se quita desde la planilla.');
    var ayer = sumarDias_(hoyISO_(), -1);
    actualizarFila_('avisos', objetivo, { 'Mostrar hasta': ayer });
    registrar_('Aviso quitado en la app', yo.nombre + ': ' + objetivo['Título']);
    return { ok: true };
  }
  throw new Error('Acción inválida');
}
