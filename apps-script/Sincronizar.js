/**
 * Lee las hojas de origen de cada programa, detecta periodos nuevos o modificados
 * y mantiene al día las pestañas Periodos, Datos y Asignaciones.
 * Se ejecuta cada 15 minutos (ver instalarTareas) o desde el menú.
 */

var DIAS_HISTORIA = 45; // periodos cuya última fecha es más antigua que esto se ignoran

function sincronizar() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try {
    return sincronizar_();
  } finally {
    lock.releaseLock();
  }
}

function sincronizar_() {
  var cfg = config_();
  var programas = leerTabla_('programas').filter(function (p) {
    return p['ID'] && LECTORES[p['Lector']] && String(p['Hoja de origen (URL)']).indexOf('http') === 0;
  });
  var periodos = leerTabla_('periodos');
  var datos = leerTabla_('datos');
  var asignaciones = leerTabla_('asignaciones');
  var dir = directorio_();
  var especiales = fechasEspeciales_();
  var desde = sumarDias_(hoyISO_(), -DIAS_HISTORIA);
  var resumen = [];
  var hubo = false;

  programas.forEach(function (prog) {
    var ss;
    try {
      ss = SpreadsheetApp.openByUrl(prog['Hoja de origen (URL)']);
    } catch (e) {
      registrar_('Error de acceso', 'No pude abrir la hoja de "' + prog['Nombre'] + '". ¿Está compartida con esta cuenta? ' + e.message);
      return;
    }
    ss.getSheets().forEach(function (sh) {
      if (sh.isSheetHidden()) return;
      var rango = sh.getDataRange();
      var res;
      try {
        res = LECTORES[prog['Lector']]({ name: sh.getName(), values: rango.getValues(), display: rango.getDisplayValues() });
      } catch (e) {
        registrar_('Error de lectura', prog['Nombre'] + ' · ' + sh.getName() + ': ' + e.message);
        return;
      }
      if (!res.reuniones.length) return;
      var fechas = res.reuniones.map(function (r) { return r.fecha; }).sort();
      if (fechas[fechas.length - 1] < desde) return;

      res.reuniones.forEach(function (r) { if (!r.hora) r.hora = horaPorDefecto_(prog['ID'], r, cfg, especiales); });
      var json = JSON.stringify(res);
      var huella = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, json)).slice(0, 12);
      var per = periodos.filter(function (p) { return p['Programa'] === prog['ID'] && p['Periodo'] === res.periodo; })[0];
      if (per && per['Huella'] === huella) return;

      hubo = true;
      var ahora = new Date();
      if (!per) {
        per = { 'Programa': prog['ID'], 'Periodo': res.periodo, 'Estado': 'Borrador', 'Detectado': ahora };
        periodos.push(per);
      }
      per['Huella'] = huella;
      per['Actualizado'] = ahora;
      per['Primera fecha'] = fechas[0];
      per['Última fecha'] = fechas[fechas.length - 1];

      var dato = datos.filter(function (d) { return d['Programa'] === prog['ID'] && d['Periodo'] === res.periodo; })[0];
      if (!dato) datos.push(dato = { 'Programa': prog['ID'], 'Periodo': res.periodo });
      dato['JSON'] = json;

      var r = actualizarAsignaciones_(prog, per, res, asignaciones, dir);
      per['Avisos'] = res.avisos.concat(r.noReconocidos.length ? ['No reconocidos: ' + r.noReconocidos.join(', ')] : []).join(' · ');
      resumen.push({ programa: prog, periodo: per, cambios: r });
    });
  });

  // Periodos aprobados a mano en la planilla: sus asignaciones dejan de ser borrador.
  periodos.forEach(function (per) {
    if (per['Estado'] !== 'Aprobado') return;
    var prog = programas.filter(function (p) { return p['ID'] === per['Programa']; })[0];
    asignaciones.forEach(function (a) {
      if (a['Programa'] === per['Programa'] && a['Periodo'] === per['Periodo'] && a['Estado'] === 'Borrador') {
        a['Estado'] = estadoInicial_(prog, a);
        a['Actualizado'] = new Date();
        hubo = true;
      }
    });
  });

  if (hubo) {
    reescribirTabla_('periodos', periodos);
    reescribirTabla_('datos', datos);
    reescribirTabla_('asignaciones', asignaciones);
    limpiarCache_();
  }
  resumen.forEach(function (x) {
    registrar_('Programa ' + (x.periodo['Estado'] === 'Borrador' ? 'detectado' : 'actualizado'),
      x.programa['Nombre'] + ' · ' + x.periodo['Periodo'] + ' · ' + x.cambios.nuevas + ' nuevas, ' + x.cambios.cambiadas + ' cambiadas, ' + x.cambios.eliminadas + ' eliminadas');
    avisarResponsable_(x.programa, x.periodo, x.cambios, cfg);
  });
  return resumen.length;
}

function horaPorDefecto_(programaId, reunion, cfg, especiales) {
  if (reunion.tipo === 'salida') return null;
  if (especiales[reunion.fecha] && especiales[reunion.fecha].hora) return especiales[reunion.fecha].hora;
  var dia = diaSemana_(reunion.fecha);
  return String(dia === 0 || dia === 6 ? cfg.horaFinSemana || '18:30' : cfg.horaEntreSemana || '19:30');
}

function fechasEspeciales_() {
  var out = {};
  leerTabla_('especiales', { mostrados: true }).forEach(function (f) {
    var v = f['Fecha'];
    var m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(v);
    var iso = m ? m[3] + '-' + pad2_(+m[2]) + '-' + pad2_(+m[1]) : v;
    out[iso] = { hora: hora_(null, f['Hora']), nota: f['Nota'] };
  });
  return out;
}

/** Directorio: personas + grupos, con un índice para reconocer nombres. */
function directorio_() {
  var personas = leerTabla_('personas').map(function (p) {
    return {
      id: p['Nombre'], nombre: p['Nombre'],
      alias: String(p['Otras formas de escribirlo (separadas por ;)'] || '').split(';').map(texto_).filter(Boolean),
      publico: p['Nombre público'] || nombrePublico_(p['Nombre']),
      correo: String(p['Correo'] || '').trim(), telefono: p['Teléfono (WhatsApp)'], grupo: p['Grupo']
    };
  });
  var grupos = {};
  leerTabla_('grupos').forEach(function (g) { grupos[+g['Grupo']] = { sup: g['Superintendente'], aux: g['Auxiliar'] }; });
  return { personas: personas, indice: indicePersonas_(personas), grupos: grupos };
}

function reconocer_(nombre, dir) {
  var r = buscarPersona_(nombre, dir.personas, dir.indice);
  return r ? r.persona : null;
}

function estadoInicial_(prog, a) {
  if (a['Reconocido'] === 'Externo') return 'Sin confirmación';
  if (!a['Correo']) return 'Avisar manualmente';
  return prog && si_(prog['Requiere confirmación']) ? 'Pendiente' : 'Sin confirmación';
}

function etiquetaReunion_(r) {
  var p = r.fecha.split('-');
  var dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return dias[diaSemana_(r.fecha)] + ' ' + (+p[2]) + ' ' + MESES_CORTOS[+p[1] - 1] + (r.titulo ? ' · ' + r.titulo : '');
}

function actualizarAsignaciones_(prog, per, res, asignaciones, dir) {
  var porClave = {};
  asignaciones.forEach(function (a) { porClave[a['Clave']] = a; });
  var vistas = {};
  var out = { nuevas: 0, cambiadas: 0, eliminadas: 0, noReconocidos: [] };
  var ahora = new Date();

  res.reuniones.forEach(function (r) {
    r.secciones.forEach(function (s) {
      s.filas.forEach(function (f) {
        f.asignados.forEach(function (a) {
          if (a.externo) return;
          var clave = prog['ID'] + '|' + r.id + '|' + a.slot;
          vistas[clave] = true;
          var fila = porClave[clave];
          var base = {
            'Programa': prog['ID'], 'Periodo': per['Periodo'], 'Fecha': r.fecha, 'Hora': r.hora || '',
            'Reunión': etiquetaReunion_(r), 'Parte': f.texto + (a.sala ? ' · ' + a.sala : ''), 'Rol': a.rol
          };
          if (fila && fila['Nombre en programa'] === a.nombre && fila['Estado'] !== 'Eliminada') {
            for (var k in base) fila[k] = base[k];
            return;
          }
          // Nueva asignación o cambio de nombre en la hoja de origen
          var ident = identificar_(a, dir);
          if (ident.reconocido === 'No') out.noReconocidos.push(a.nombre);
          var nueva = !fila;
          if (nueva) {
            fila = { 'Clave': clave };
            asignaciones.push(fila);
            porClave[clave] = fila;
            out.nuevas++;
          } else {
            out.cambiadas++;
          }
          for (var k2 in base) fila[k2] = base[k2];
          fila['Nombre en programa'] = a.nombre;
          fila['Nombre'] = ident.nombre;
          fila['Reconocido'] = ident.reconocido;
          fila['Correo'] = ident.correo;
          fila['Respuesta calendario'] = '';
          fila['Rechazo avisado el'] = '';
          fila['Recordatorio el'] = '';
          fila['Estado'] = per['Estado'] === 'Aprobado' ? estadoInicial_(prog, fila) : 'Borrador';
          fila['Actualizado'] = ahora;
        });
      });
    });
  });

  asignaciones.forEach(function (a) {
    if (a['Programa'] === prog['ID'] && a['Periodo'] === per['Periodo'] && !vistas[a['Clave']] && a['Estado'] !== 'Eliminada') {
      a['Estado'] = 'Eliminada';
      a['Actualizado'] = ahora;
      out.eliminadas++;
    }
  });
  out.noReconocidos = out.noReconocidos.filter(function (n, i, arr) { return arr.indexOf(n) === i; });
  return out;
}

/** Determina persona, correo y tipo de reconocimiento de un asignado. */
function identificar_(a, dir) {
  if (a.grupo) {
    var g = dir.grupos[a.grupo];
    var sup = g && g.sup ? reconocer_(g.sup, dir) : null;
    return { nombre: a.nombre, reconocido: 'Grupo', correo: sup ? sup.correo : '' };
  }
  var p = reconocer_(a.nombre, dir);
  if (!p) return { nombre: a.nombre, reconocido: 'No', correo: '' };
  return { nombre: p.nombre, reconocido: 'Sí', correo: p.correo };
}

function avisarResponsable_(prog, per, cambios, cfg) {
  var para = String(prog['Responsable (correo)'] || '').trim();
  if (!para || !si_(cfg.correosActivos)) return;
  var nuevo = per['Estado'] === 'Borrador';
  var asunto = (nuevo ? 'Programa listo para revisar: ' : 'Programa actualizado: ') + prog['Nombre'] + ' · ' + per['Periodo'];
  var lineas = [
    'Hola,',
    '',
    nuevo
      ? 'Detectamos el programa "' + prog['Nombre'] + '" (' + per['Periodo'] + '). Revísalo y apruébalo para publicarlo y enviar las invitaciones.'
      : 'Detectamos cambios en "' + prog['Nombre'] + '" (' + per['Periodo'] + '): ' + cambios.nuevas + ' nuevas, ' + cambios.cambiadas + ' cambiadas, ' + cambios.eliminadas + ' eliminadas.',
    ''
  ];
  if (cambios.noReconocidos.length) {
    lineas.push('Estos nombres no están en el directorio (revisa cómo están escritos o avísale al administrador):');
    cambios.noReconocidos.forEach(function (n) { lineas.push(' • ' + n); });
    lineas.push('');
  }
  if (cfg.urlApp) lineas.push('Abrir la app: ' + cfg.urlApp, '');
  lineas.push('Mensaje automático de la app de programas.');
  MailApp.sendEmail({ to: para, subject: asunto, body: lineas.join('\n'), name: cfg.remitente || 'Programas de la congregación' });
}
