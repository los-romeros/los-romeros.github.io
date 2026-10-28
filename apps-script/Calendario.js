/**
 * Fase 4: invitaciones de Google Calendar y lectura de respuestas.
 * Los únicos correos son los de Calendar (invitación y cancelación); el resto de los
 * avisos (rechazos, recordatorios, día anterior) van como notificación de la app.
 *
 * Interruptores en la pestaña Inicio:
 *   invitacionesActivas = Sí   -> se crean eventos e invitaciones
 *   soloEstosCorreos    = a@x.com, b@y.com  -> modo prueba: solo estos destinatarios
 *
 * Tareas: las invitaciones se envían en cada sincronización (cada 15 min);
 * respuestas y recordatorios corren en tareasHorarias() (cada hora).
 */

var NOMBRE_CALENDARIO = 'Programas de la congregación';

function calendario_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('CALENDARIO_ID');
  var cal = id ? CalendarApp.getCalendarById(id) : null;
  if (!cal) {
    cal = CalendarApp.createCalendar(NOMBRE_CALENDARIO, { timeZone: Session.getScriptTimeZone(), color: CalendarApp.Color.TEAL });
    props.setProperty('CALENDARIO_ID', cal.getId());
  }
  return cal;
}

function listaPrueba_(cfg) {
  return String(cfg.soloEstosCorreos || '').toLowerCase().split(/[,;\s]+/).filter(Boolean);
}

function permitido_(cfg, correo) {
  var lista = listaPrueba_(cfg);
  return !lista.length || lista.indexOf(String(correo).toLowerCase()) >= 0;
}

function puedeInvitar_(cfg, correo) {
  return si_(cfg.invitacionesActivas) && !!correo && permitido_(cfg, correo);
}

function eliminarEvento_(id) {
  if (!id) return;
  try {
    var ev = calendario_().getEventById(id);
    if (ev) ev.deleteEvent(); // Google avisa la cancelación al invitado
  } catch (e) {
    console.warn('No se pudo eliminar el evento ' + id + ': ' + e.message);
  }
}

/** Información de cada asignación tomada de Datos (lugar, tipo de reunión). */
function infoReuniones_() {
  var out = {};
  leerTabla_('datos').forEach(function (d) {
    var res;
    try { res = JSON.parse(d['JSON']); } catch (e) { return; }
    res.reuniones.forEach(function (r) {
      r.secciones.forEach(function (s) { s.filas.forEach(function (f) { f.asignados.forEach(function (a) {
        out[d['Programa'] + '|' + r.id + '|' + a.slot] = { lugar: r.lugar || '', tipo: r.tipo || '', titulo: r.titulo || '', detalle: f.detalle || '' };
      }); }); });
    });
  });
  return out;
}

/**
 * Completa correos que se agregaron después al directorio y crea las invitaciones que falten.
 * Trabaja sobre el arreglo en memoria; quien llama decide cuándo guardarlo. Devuelve cuántas envió.
 */
function procesarInvitaciones_(asignaciones, cfg) {
  var hoy = hoyISO_();
  var dir = directorio_();
  var programas = {};
  leerTabla_('programas').forEach(function (p) { programas[p['ID']] = p; });
  var aprobados = {};
  leerTabla_('periodos').forEach(function (p) { if (p['Estado'] === 'Aprobado') aprobados[p['Programa'] + '|' + p['Periodo']] = true; });
  var info = null, cal = null, enviadas = 0, completados = 0, inicio = Date.now();

  asignaciones.forEach(function (a) {
    if (Date.now() - inicio > 240000) return; // dejar el resto para la próxima vuelta
    if (a['Fecha'] < hoy || ['Borrador', 'Eliminada'].indexOf(a['Estado']) >= 0) return;
    if (!aprobados[a['Programa'] + '|' + a['Periodo']]) return;

    // Correos agregados después al directorio
    if (!a['Correo'] && (a['Reconocido'] === 'Sí' || a['Reconocido'] === 'Grupo')) {
      var ident = identificar_({ nombre: a['Nombre'], grupo: a['Reconocido'] === 'Grupo' ? +String(a['Nombre']).replace(/\D/g, '') : null }, dir);
      if (ident.correo) {
        a['Correo'] = ident.correo;
        completados++;
        if (a['Estado'] === 'Avisar manualmente') a['Estado'] = estadoInicial_(programas[a['Programa']], a);
      }
    }
    if (a['ID evento'] || !puedeInvitar_(cfg, a['Correo']) || esConductorHabitual_(a, cfg)) return;

    info = info || infoReuniones_();
    cal = cal || calendario_();
    var prog = programas[a['Programa']] || {};
    var x = info[a['Clave']] || {};
    var ev = crearEvento_(cal, a, prog, x, cfg);
    a['ID evento'] = ev.getId();
    a['Invitado el'] = new Date();
    enviadas++;
    try { notificar_(cfg, a['Correo'], 'Nueva asignación', nombreAsignacion_(a) + ' · ' + a['Reunión'] + (a['Hora'] ? ' · ' + a['Hora'] : ''), './', 'nueva-' + a['Clave']); } catch (e) { /* sin notificación */ }
  });
  if (enviadas) registrar_('Invitaciones enviadas', enviadas + ' invitación(es) de calendario');
  return enviadas + completados; // cantidad de filas modificadas (para saber si hay que guardar)
}

/** Nombre corto y claro de la asignación: "Audio", "Micrófono", "Lectura de la Biblia", "Lector de La Atalaya"… */
function nombreAsignacion_(a) {
  var rol = String(a['Rol'] || ''), parte = String(a['Parte'] || '');
  if (/^(asignado|titular|ayudante)$/i.test(rol)) {
    var p = parte.split(' · ')[0].replace(/^\d+\.\s*/, '').replace(/\s*\(\d+ ?mins?\.?\)\s*/gi, ' ').trim();
    var sala = /sala auxiliar/i.test(parte) ? ' · sala auxiliar' : '';
    return p + (/ayudante/i.test(rol) ? ' (ayudante)' : '') + sala;
  }
  if (/^acomodaci[oó]n · /i.test(rol)) return 'Acomodación ' + rol.split(' · ')[1];
  if (rol.indexOf(' · ') >= 0) return rol.split(' · ').pop();
  if (/^micr[oó]fonos$/i.test(rol)) return 'Micrófono';
  if (a['Reconocido'] === 'Grupo') return rol + ' · ' + a['Nombre'];
  return rol;
}

function crearEvento_(cal, a, prog, x, cfg) {
  var tz = Session.getScriptTimeZone();
  var esAseo = a['Programa'] === 'aseo';
  var titulo = nombreAsignacion_(a);
  var lugar = x.lugar || cfg.direccion || '';
  var descripcion = [
    a['Reunión'],
    a['Parte'] && a['Parte'] !== a['Rol'] ? a['Parte'] : '',
    x.detalle,
    a['Reconocido'] === 'Grupo' ? 'Asignación para ' + a['Nombre'] + ' (recibes esta invitación como superintendente del grupo).' : '',
    '',
    si_(prog['Requiere confirmación']) ? 'Por favor responde Sí o No a esta invitación, o usa los botones de la app.' : '',
    cfg.urlApp ? 'App de programas: ' + cfg.urlApp : ''
  ].filter(function (l, i, arr) { return l || (i > 0 && arr[i - 1]); }).join('\n');
  var opciones = { guests: a['Correo'], sendInvites: true, location: lugar, description: descripcion };

  if (!a['Hora']) return cal.createAllDayEvent(titulo, Utilities.parseDate(a['Fecha'], tz, 'yyyy-MM-dd'), opciones);
  var inicio = Utilities.parseDate(a['Fecha'] + ' ' + a['Hora'], tz, 'yyyy-MM-dd HH:mm');
  var minutos = x.tipo === 'salida' ? 90 : +cfg.duracionMin || 105;
  if (esAseo) { inicio = new Date(inicio.getTime() + minutos * 60000); minutos = 45; } // después de la reunión
  return cal.createEvent(titulo, inicio, new Date(inicio.getTime() + minutos * 60000), opciones);
}

/* ------------------------------------------------------------------ */
/* Tareas horarias                                                      */
/* ------------------------------------------------------------------ */

function tareasHorarias() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
    var cfg = config_();
    var asign = leerTabla_('asignaciones');
    var cambios = revisarRespuestas_(asign, cfg);
    cambios += recordatoriosSinRespuesta_(asign, cfg);
    var ahora = new Date();
    var hora = +Utilities.formatDate(ahora, Session.getScriptTimeZone(), 'H');
    if (hora >= +(cfg.horaAvisoDiaAntes || 18) && unaVezAlDia_('AVISO_DIA_ANTES')) cambios += avisosDiaAntes_(asign, cfg);
    try { recordatoriosInforme_(cfg); } catch (e) { registrar_('Error en recordatorio de informe', e.message); }
    if (hora >= +(cfg.horaRecordatorioAvisos || 10) && unaVezAlDia_('RECORDATORIO_AVISOS')) {
      try { recordatoriosAvisos_(cfg); } catch (e) { registrar_('Error en recordatorio de avisos', e.message); }
    }
    if (hora >= 3 && unaVezAlDia_('UBICAR_DIRECCIONES')) {
      try { ubicarDirecciones_(40); } catch (e) { registrar_('Error al ubicar direcciones', e.message); }
    }
    if (hora >= 3 && PropertiesService.getScriptProperties().getProperty('EMERGENCIAS_ID') && unaVezAlDia_('EMERGENCIAS')) {
      try { planillaEmergencias_(cfg, true); } catch (e) { registrar_('Error al actualizar contactos de emergencia', e.message); }
    }
    if (hora >= 2 && unaVezAlDia_('S13')) {
      try { actualizarS13_(cfg); CacheService.getScriptCache().remove('s13'); } catch (e) { registrar_('Error al actualizar S-13', e.message); }
    }
    if (hora >= 3 && PropertiesService.getScriptProperties().getProperty('ASISTENCIA_ID') && unaVezAlDia_('DATOS_S1')) {
      try { actualizarDatosS1_(cfg); } catch (e) { registrar_('Error al actualizar S-1', e.message); }
    }
    if (cambios) {
      reescribirTabla_('asignaciones', asign);
      limpiarCache_();
    }
  } catch (e) {
    registrar_('Error en tareas horarias', e.message);
  } finally {
    lock.releaseLock();
  }
}

function unaVezAlDia_(clave) {
  var props = PropertiesService.getScriptProperties();
  var hoy = hoyISO_();
  if (props.getProperty(clave) === hoy) return false;
  props.setProperty(clave, hoy);
  return true;
}

/** Lee la respuesta de cada invitado en Calendar y actualiza el estado solo cuando esa respuesta cambia. */
function revisarRespuestas_(asign, cfg) {
  var programas = {};
  leerTabla_('programas').forEach(function (p) { programas[p['ID']] = p; });
  var desde = sumarDias_(hoyISO_(), -1);
  var cal = null, n = 0, inicio = Date.now();
  asign.forEach(function (a) {
    if (Date.now() - inicio > 200000) return;
    if (!a['ID evento'] || !a['Correo'] || a['Fecha'] < desde || a['Estado'] === 'Eliminada') return;
    if (!si_((programas[a['Programa']] || {})['Requiere confirmación'])) return;
    cal = cal || calendario_();
    var ev;
    try { ev = cal.getEventById(a['ID evento']); } catch (e) { return; }
    if (!ev) return;
    var g = ev.getGuestByEmail(a['Correo']);
    if (!g) return;
    var st = String(g.getGuestStatus());
    var resp = st === 'YES' ? 'Sí' : st === 'NO' ? 'No' : st === 'MAYBE' ? 'Quizás' : '';
    if (resp === String(a['Respuesta calendario'] || '')) return;
    a['Respuesta calendario'] = resp;
    a['Actualizado'] = new Date();
    n++;
    if (resp === 'Sí') a['Estado'] = 'Confirmado';
    if (resp === 'No') {
      a['Estado'] = 'Rechazado';
      if (!a['Rechazo avisado el']) avisarRechazoMemoria_(a, programas[a['Programa']], cfg);
    }
  });
  if (n) registrar_('Respuestas de calendario', n + ' respuesta(s) nuevas');
  return n;
}

function avisarRechazoMemoria_(a, prog, cfg) {
  var para = prog ? String(prog['Responsable (correo)'] || '').split(/[,;\s]+/).filter(Boolean) : [];
  var push = 0;
  para.forEach(function (c) {
    push += notificar_(cfg, c, 'Asignación rechazada', a['Nombre'] + ' no puede: ' + nombreAsignacion_(a) + ' · ' + a['Reunión'], './', 'rechazo-' + a['Clave']);
  });
  if (push) a['Rechazo avisado el'] = new Date();
}

/** Notificación a quienes no han respondido 2 días después de la invitación. */
function recordatoriosSinRespuesta_(asign, cfg) {
  var limite = Date.now() - 2 * 864e5, manana = sumarDias_(hoyISO_(), 1);
  var porPersona = {};
  asign.forEach(function (a) {
    if (a['Estado'] !== 'Pendiente' || !a['Correo'] || a['Recordatorio el'] || !a['Invitado el']) return;
    if (new Date(a['Invitado el']).getTime() > limite || a['Fecha'] < manana) return;
    (porPersona[a['Correo']] = porPersona[a['Correo']] || []).push(a);
  });
  var n = 0;
  Object.keys(porPersona).forEach(function (correo) {
    var lista = porPersona[correo];
    var ok = notificar_(cfg, correo, 'Confirma tu asignación',
      lista.map(function (a) { return nombreAsignacion_(a) + ' · ' + a['Reunión']; }).join(' · ') + '. Toca "Confirmo" o "No puedo" en la app.', './#mias', 'confirmar-' + correo);
    if (ok) lista.forEach(function (a) { a['Recordatorio el'] = new Date(); n++; });
  });
  return n;
}

/** Notificación la tarde anterior: "Mañana tienes…". */
function avisosDiaAntes_(asign, cfg) {
  if (!si_(cfg.avisoDiaAntes || 'Sí')) return 0;
  var manana = sumarDias_(hoyISO_(), 1);
  var porPersona = {};
  asign.forEach(function (a) {
    if (a['Fecha'] !== manana || !a['Correo'] || ['Rechazado', 'Eliminada', 'Borrador'].indexOf(a['Estado']) >= 0 || esConductorHabitual_(a, cfg)) return;
    (porPersona[a['Correo']] = porPersona[a['Correo']] || []).push(a);
  });
  var avisados = 0;
  Object.keys(porPersona).forEach(function (correo) {
    var lista = porPersona[correo];
    avisados += notificar_(cfg, correo, 'Mañana tienes ' + (lista.length > 1 ? lista.length + ' asignaciones' : 'una asignación'),
      lista.map(function (a) { return nombreAsignacion_(a) + (a['Hora'] ? ' · ' + a['Hora'] : ''); }).join(' · '), './', 'manana-' + correo);
  });
  if (Object.keys(porPersona).length) registrar_('Aviso del día anterior', Object.keys(porPersona).length + ' persona(s) con asignación mañana · ' + avisados + ' notificación(es) entregadas a teléfonos');
  return 0;
}

/** Crea las tareas automáticas que falten. Se llama desde la sincronización. */
function asegurarTareas_() {
  var existentes = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  if (existentes.indexOf('sincronizar') < 0) ScriptApp.newTrigger('sincronizar').timeBased().everyMinutes(15).create();
  if (existentes.indexOf('tareasHorarias') < 0) ScriptApp.newTrigger('tareasHorarias').timeBased().everyHours(1).create();
  if (existentes.indexOf('notificacionesFrecuentes') < 0) ScriptApp.newTrigger('notificacionesFrecuentes').timeBased().everyMinutes(10).create();
  try { asegurarTareaS13_(); } catch (e) { console.warn('Tarea del S-13: ' + e.message); }
}

/**
 * Deja las asignaciones como antes de enviar invitaciones (para repetir una prueba).
 * Borra los eventos creados, limpia respuestas y recordatorios, recalcula el estado
 * y apaga invitacionesActivas para que no se reenvíe nada hasta que lo vuelvas a encender.
 */
function reiniciarPruebaInvitaciones() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.alert('Reiniciar prueba de invitaciones',
    'Se borrarán los eventos creados por la app (los invitados pueden recibir un aviso de cancelación), se limpiarán respuestas y recordatorios, y las asignaciones confirmadas o rechazadas volverán a su estado inicial.\n\nTambién se apagará "invitacionesActivas". ¿Continuar?',
    ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var programas = {};
    leerTabla_('programas').forEach(function (p) { programas[p['ID']] = p; });
    var asign = leerTabla_('asignaciones'), n = 0;
    asign.forEach(function (a) {
      if (['Borrador', 'Eliminada'].indexOf(a['Estado']) >= 0) return;
      var tocada = a['ID evento'] || a['Invitado el'] || a['Respuesta calendario'] || ['Confirmado', 'Rechazado'].indexOf(a['Estado']) >= 0;
      if (!tocada) return;
      if (a['ID evento']) eliminarEvento_(a['ID evento']);
      ['ID evento', 'Invitado el', 'Respuesta calendario', 'Recordatorio el', 'Rechazo avisado el'].forEach(function (k) { a[k] = ''; });
      a['Estado'] = estadoInicial_(programas[a['Programa']], a);
      a['Actualizado'] = new Date();
      n++;
    });
    reescribirTabla_('asignaciones', asign);
    var ini = leerTabla_('inicio').filter(function (f) { return f['Clave'] === 'invitacionesActivas'; })[0];
    if (ini) actualizarFila_('inicio', ini, { 'Valor': 'No' });
    PropertiesService.getScriptProperties().deleteProperty('AVISO_DIA_ANTES');
    limpiarCache_();
    registrar_('Prueba reiniciada', n + ' asignación(es) vueltas a su estado inicial');
    ui.alert('Listo: ' + n + ' asignación(es) reiniciadas. Cuando quieras probar de nuevo, pon invitacionesActivas = Sí y usa "Sincronizar ahora".');
  } finally {
    lock.releaseLock();
  }
}
