/**
 * Notificaciones en el teléfono (Firebase Cloud Messaging, gratuito).
 *
 * Cada teléfono que activa los avisos guarda su "token" en la pestaña Dispositivos.
 * El envío usa la API FCM v1 con el permiso de la cuenta de la congregación
 * (el proyecto de Apps Script debe estar vinculado al proyecto de Google Cloud donde está Firebase).
 *
 * Inicio:
 *   notificacionesActivas = Sí
 *   firebaseProyecto      = ID del proyecto de Firebase (p. ej. programas-los-romeros)
 *   silencioDesde / silencioHasta = horas sin notificaciones (22 / 8)
 *   soloEstosCorreos      = (modo prueba) también limita las notificaciones
 */

function registrarDispositivo_(yo, p) {
  var token = String(p.dispositivo || '').trim();
  if (token.length < 20) throw new Error('Token inválido');
  asegurarColumnas_('dispositivos');
  var filas = leerTabla_('dispositivos');
  var ya = filas.filter(function (d) { return d['Token'] === token; })[0];
  if (ya) {
    actualizarFila_('dispositivos', ya, { 'Correo': yo.correo, 'Nombre': yo.nombre, 'Último uso': new Date() });
  } else {
    agregarFilas_('dispositivos', [{ 'Correo': yo.correo, 'Nombre': yo.nombre, 'Token': token, 'Plataforma': String(p.plataforma || '').slice(0, 60), 'Registrado': new Date(), 'Último uso': new Date() }]);
  }
  return { ok: true };
}

function enSilencio_(cfg) {
  var h = +Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'H');
  var desde = +(cfg.silencioDesde || 22), hasta = +(cfg.silencioHasta || 8);
  return desde > hasta ? (h >= desde || h < hasta) : (h >= desde && h < hasta);
}

/**
 * Envía una notificación a todos los teléfonos de una persona. Devuelve cuántos la recibieron.
 * opciones.ignorarSilencio = true para avisos que no deben esperar.
 */
function notificar_(cfg, correo, titulo, cuerpo, url, tag, opciones) {
  correo = String(correo || '').toLowerCase();
  if (!si_(cfg.notificacionesActivas) || !cfg.firebaseProyecto || !correo || !permitido_(cfg, correo)) return 0;
  if (enSilencio_(cfg) && !(opciones && opciones.ignorarSilencio)) return 0;
  var filas;
  try { filas = leerTabla_('dispositivos', { opcional: true }); } catch (e) { return 0; }
  var mios = filas.filter(function (d) { return String(d['Correo']).toLowerCase() === correo && d['Token']; });
  if (!mios.length) return 0;
  var url_ = 'https://fcm.googleapis.com/v1/projects/' + encodeURIComponent(cfg.firebaseProyecto) + '/messages:send';
  var token = ScriptApp.getOAuthToken();
  var enviados = 0, borrar = [];
  mios.forEach(function (d) {
    var r = UrlFetchApp.fetch(url_, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true,
      payload: JSON.stringify({
        message: {
          token: d['Token'],
          data: { titulo: String(titulo), cuerpo: String(cuerpo || ''), url: String(url || './'), tag: String(tag || '') },
          webpush: { headers: { Urgency: 'high', TTL: '3600' } }
        }
      })
    });
    var code = r.getResponseCode();
    if (code === 200) enviados++;
    else if (code === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(r.getContentText())) borrar.push(d);
    else {
      var err = 'FCM ' + code + ': ' + r.getContentText().slice(0, 300);
      console.warn(err);
      if (opciones && opciones.errores) opciones.errores.push(err);
      if (!notificar_.errorAnotado) { notificar_.errorAnotado = true; registrar_('Error en notificaciones', correo + ' · ' + err); }
    }
  });
  // Teléfonos que ya no existen (app desinstalada, permiso quitado)
  if (borrar.length) {
    var tokens = borrar.map(function (d) { return d['Token']; });
    reescribirTabla_('dispositivos', filas.filter(function (d) { return tokens.indexOf(d['Token']) < 0; }));
  }
  return enviados;
}

/** Acción "probarAviso": envía una notificación de prueba a los teléfonos del propio usuario. */
function probarAviso_(yo, cfg) {
  if (!si_(cfg.notificacionesActivas)) return { ok: false, error: 'Las notificaciones están desactivadas (Inicio ▸ notificacionesActivas).' };
  if (!permitido_(cfg, yo.correo)) return { ok: false, error: 'Tu correo no está en soloEstosCorreos (modo prueba).' };
  var errores = [];
  var n = notificar_(cfg, yo.correo, 'Aviso de prueba', 'Si ves esto, los avisos funcionan en este teléfono.', './', 'prueba', { ignorarSilencio: true, errores: errores });
  registrar_('Aviso de prueba', yo.nombre + ': ' + n + ' teléfono(s)' + (errores.length ? ' · ' + errores[0] : ''));
  if (n) return { ok: true, enviados: n };
  return { ok: false, error: errores.length ? 'Google rechazó el envío: ' + errores[0].slice(0, 160) : 'Este teléfono no está registrado. Toca "Activar avisos" en el inicio.' };
}

/**
 * Cada 10 minutos: recuerda a los capitanes que registren lo trabajado,
 * desde 2 horas después de la salida y hasta que lo registren (con pausa nocturna).
 */
function notificacionesFrecuentes() {
  var cfg = config_();
  if (!si_(cfg.notificacionesActivas) || enSilencio_(cfg)) return;
  try {
    var hoy = hoyISO_(), desde = sumarDias_(hoy, -DIAS_REGISTRO_PENDIENTE);
    var ahora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm');
    var info = infoReuniones_();
    var candidatas = leerTabla_('asignaciones').filter(function (a) {
      if (a['Programa'] !== 'predicacion' || !/\|encargado$/.test(a['Clave']) || !a['Correo']) return false;
      if (['Borrador', 'Eliminada'].indexOf(a['Estado']) >= 0 || a['Fecha'] < desde || a['Fecha'] > hoy) return false;
      if (a['Fecha'] === hoy && sumarMinutos_(a['Hora'] || cfg.horaPredicacionPorDefecto || '10:30', 120) > ahora) return false;
      return territoriosDeDetalle_((info[a['Clave']] || {}).detalle).length > 0;
    });
    if (!candidatas.length) return;
    var ss = planillaRegistro_(cfg);
    if (!ss) return;
    var regs = leerRegistros_(ss);
    candidatas.forEach(function (a) {
      var terrs = territoriosDeDetalle_((info[a['Clave']] || {}).detalle);
      var hecho = regs.some(function (g) {
        return g.fecha === a['Fecha'] && (terrs.indexOf(g.territorio) >= 0 || g.correo === String(a['Correo']).toLowerCase());
      });
      if (hecho) return;
      var dia = a['Fecha'] === hoy ? 'de hoy' : 'del ' + a['Reunión'].split(' · ')[0];
      notificar_(cfg, a['Correo'], 'Registra lo trabajado', 'Salida ' + dia + ' · Territorio ' + terrs.join(' y ') + '. Toca para registrar.', './#registrar', 'registro-' + a['Clave']);
    });
  } catch (e) {
    registrar_('Error en notificaciones', e.message);
  }
}
