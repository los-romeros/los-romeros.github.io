/**
 * Choques de asignaciones (la misma persona con dos cosas a la misma hora) y
 * sugerencias de reemplazo cuando alguien no puede.
 *
 * Choque: misma persona, mismo día, horarios que se cruzan, entre acomodación y audio/video
 * y las reuniones (o dos veces en acomodación). Es solo una advertencia.
 */

var PROGRAMAS_CON_REPETICION = ['vmc', 'finsemana'];

function minutos_(hora) {
  var m = /^(\d{1,2}):(\d{2})/.exec(String(hora || ''));
  return m ? +m[1] * 60 + +m[2] : null;
}

function duracionAsignacion_(a, cfg) {
  return a['Programa'] === 'predicacion' ? 90 : +cfg.duracionMin || 105;
}

/** ¿Se cruzan los horarios de dos asignaciones del mismo día? (sin hora = todo el día) */
function seCruzan_(a, b, cfg) {
  var ia = minutos_(a['Hora']), ib = minutos_(b['Hora']);
  if (ia == null || ib == null) return true;
  return ia < ib + duracionAsignacion_(b, cfg) && ib < ia + duracionAsignacion_(a, cfg);
}

/**
 * Solo se cruzan acomodación y audio/video (acomodación, micrófonos, plataforma, audio, video)
 * con las reuniones (entre semana y fin de semana), o consigo mismos.
 * Predicación, aseo y hospitalidad no se comparan.
 */
function chocan_(a, b, cfg) {
  if (a['Clave'] === b['Clave'] || a['Fecha'] !== b['Fecha']) return false;
  var pa = a['Programa'], pb = b['Programa'];
  if (pa !== 'acomodacion' && pb !== 'acomodacion') return false;
  var otro = pa === 'acomodacion' ? pb : pa;
  if (otro !== 'acomodacion' && PROGRAMAS_CON_REPETICION.indexOf(otro) < 0) return false;
  return seCruzan_(a, b, cfg);
}

/** Asignaciones personales (no de grupo ni externas) vigentes desde `desde`. */
function asignacionesPersonales_(asign, desde) {
  return asign.filter(function (a) {
    return a['Estado'] !== 'Eliminada' && a['Fecha'] >= desde && a['Nombre'] &&
      a['Reconocido'] !== 'Grupo' && a['Reconocido'] !== 'Externo';
  });
}

/**
 * Lista de choques: [{ fecha, nombre, items: [{clave, programa, programaNombre, asignacion, hora, reunion}] }]
 * `filtro(a)` opcional: solo choques donde al menos una asignación lo cumple.
 */
function choques_(asign, cfg, filtro, sinAceptados) {
  var aceptados = sinAceptados ? choquesAceptados_() : {};
  var nombresProg = {};
  leerTabla_('programas').forEach(function (p) { nombresProg[p['ID']] = p['Nombre']; });
  var grupos = {};
  asignacionesPersonales_(asign, hoyISO_()).forEach(function (a) {
    var k = a['Fecha'] + '|' + norm_(a['Nombre']);
    (grupos[k] = grupos[k] || []).push(a);
  });
  var out = [];
  Object.keys(grupos).forEach(function (k) {
    var lista = grupos[k];
    if (lista.length < 2) return;
    var enChoque = {};
    for (var i = 0; i < lista.length; i++) for (var j = i + 1; j < lista.length; j++) {
      if (chocan_(lista[i], lista[j], cfg)) { enChoque[i] = true; enChoque[j] = true; }
    }
    var items = lista.filter(function (a, i) { return enChoque[i]; });
    if (!items.length || (filtro && !items.some(filtro))) return;
    items.sort(function (a, b) { return String(a['Hora']).localeCompare(String(b['Hora'])); });
    var c = {
      fecha: items[0]['Fecha'], nombre: items[0]['Nombre'],
      items: items.map(function (a) {
        return { clave: a['Clave'], programa: a['Programa'], programaNombre: nombresProg[a['Programa']] || a['Programa'],
          asignacion: nombreAsignacion_(a), hora: a['Hora'], reunion: a['Reunión'] };
      })
    };
    c.id = claveChoque_(c);
    if (!aceptados[c.id]) out.push(c);
  });
  return out.sort(function (a, b) { return a.fecha.localeCompare(b.fecha) || a.nombre.localeCompare(b.nombre); });
}

/** Texto corto de un choque: "Maximiliano Wilson: Lector (Entre semana) y Video (Acomodación)". */
function textoChoque_(c) {
  return c.nombre + ': ' + c.items.map(function (x) { return x.asignacion + ' (' + x.programaNombre + ')'; }).join(' y ');
}

/** Otras asignaciones de una persona que se cruzan con `a` (para avisar al reasignar). */
function choquesDePersona_(nombre, a, asign, cfg) {
  var n = norm_(nombre);
  return asignacionesPersonales_(asign, a['Fecha']).filter(function (b) {
    return b['Fecha'] === a['Fecha'] && norm_(b['Nombre']) === n && chocan_(a, b, cfg);
  });
}

/* ------------------------------------------------------------------ */
/* Sugerencias de reemplazo                                             */
/* ------------------------------------------------------------------ */

/** Tipo de asignación para comparar participación: quienes han hecho lo mismo pueden reemplazar. */
function tipoAsignacion_(a) {
  var prog = a['Programa'], rol = String(a['Rol'] || ''), parte = norm_(a['Parte']);
  var slot = String(a['Clave'] || '').split('|')[2] || '';
  var t;
  if (prog === 'vmc' && /^asignado$/i.test(rol)) {
    if (/lectura de la biblia/.test(parte)) t = 'lectura';
    else if (/perlas escondidas/.test(parte)) t = 'perlas';
    else if (/estudio biblico de (la )?congregacion/.test(parte)) t = 'estudio';
    else if (/^p1-/.test(slot)) t = 'tesoros';
    else t = 'vida-cristiana';
  } else if (prog === 'vmc' && /^titular$/i.test(rol)) {
    t = /discurso/.test(parte) ? 'discurso-estudiante' : 'titular';
  } else if (/^acomodaci[oó]n · /i.test(rol)) {
    t = 'acomodacion';
  } else {
    t = norm_(rol);
  }
  return prog + '|' + t;
}

/**
 * Acción "sugerencias": hasta 5 personas que ya han hecho este tipo de asignación,
 * primero quienes llevan más tiempo sin hacerla, sin quienes ya tienen algo a esa hora.
 */
function sugerencias_(yo, p, cfg) {
  var asign = leerTabla_('asignaciones');
  var fila = asign.filter(function (a) { return a['Clave'] === p.clave && a['Estado'] !== 'Eliminada'; })[0];
  if (!fila) throw new Error('No encontré esa asignación.');
  puedeEditar_(yo, fila['Programa']);
  if (fila['Reconocido'] === 'Grupo') return { ok: true, sugerencias: [] };
  var tipo = tipoAsignacion_(fila);
  var actual = norm_(fila['Nombre']);

  var dir = directorio_();
  var enDirectorio = {};
  dir.personas.forEach(function (x) { enDirectorio[norm_(x.nombre)] = x.nombre; });

  // Historial de este tipo de asignación (pasado y futuro)
  var hist = {};
  asign.forEach(function (a) {
    if (a['Estado'] === 'Eliminada' || a['Reconocido'] !== 'Sí' || tipoAsignacion_(a) !== tipo) return;
    var n = norm_(a['Nombre']);
    var h = hist[n] = hist[n] || { nombre: a['Nombre'], veces: 0, ultima: '', anteriores: [], proximas: [] };
    h.veces++;
    if (a['Fecha'] < fila['Fecha']) h.anteriores.push(a['Fecha']);
    else if (a['Fecha'] > fila['Fecha']) h.proximas.push(a['Fecha']);
  });
  var candidatos = Object.keys(hist).map(function (n) { return hist[n]; });

  // Si casi nadie lo ha hecho aún (historial corto), en acomodación se suman los que participan
  if (candidatos.length < 5 && fila['Programa'] === 'acomodacion') {
    leerTabla_('personas').forEach(function (x) {
      var n = norm_(x['Nombre']);
      if (x['Nombre'] && si_(x['Participa']) && !hist[n]) candidatos.push(hist[n] = { nombre: x['Nombre'], veces: 0, anteriores: [], proximas: [] });
    });
  }

  // Quién rechazó antes esta misma asignación (no volver a sugerirlo)
  var rechazaron = {};
  leerTabla_('registro', { opcional: true }).forEach(function (r) {
    var t = String(r['Detalle'] || '');
    if (/^Respuesta en la app$/.test(r['Evento']) && / Rechazado · /.test(t) && t.indexOf(fila['Reunión']) >= 0) rechazaron[norm_(t.split(':')[0])] = true;
  });

  var out = candidatos.filter(function (c) {
    var n = norm_(c.nombre);
    return n !== actual && enDirectorio[n] && !rechazaron[n] && !choquesDePersona_(c.nombre, fila, asign, cfg).length &&
      !asign.some(function (a) { return a['Fecha'] === fila['Fecha'] && a['Programa'] === fila['Programa'] && a['Estado'] !== 'Eliminada' && norm_(a['Nombre']) === n && a['Clave'] !== fila['Clave'] && PROGRAMAS_CON_REPETICION.indexOf(a['Programa']) < 0; });
  }).map(function (c) {
    var ultima = c.anteriores.sort().pop() || '';
    var proxima = c.proximas.sort()[0] || '';
    return { nombre: enDirectorio[norm_(c.nombre)], veces: c.veces, ultima: ultima, proxima: proxima };
  });
  // Primero quien lleva más tiempo sin hacerla; quien la tiene pronto otra vez, al final
  var orden = function (s) { return (s.proxima && s.proxima <= sumarDias_(fila['Fecha'], 14) ? '1' : '0') + (s.ultima || '0000') + String(1000 + s.veces); };
  out.sort(function (a, b) { return orden(a).localeCompare(orden(b)); });
  return { ok: true, tipo: nombreAsignacion_(fila), sugerencias: out.slice(0, 5) };
}

/* ------------------------------------------------------------------ */
/* Aviso a los responsables cuando aparece un choque nuevo              */
/* ------------------------------------------------------------------ */

function claveChoque_(c) {
  return c.fecha + '|' + norm_(c.nombre) + '|' + c.items.map(function (x) { return x.clave; }).sort().join(',');
}

function choquesAceptados_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('choquesAceptados') || '{}'); } catch (e) { return {}; }
}

/** Acción "aceptarChoque": el responsable indica que está bien así y deja de verse como advertencia. */
function aceptarChoque_(yo, p, cfg) {
  var c = choques_(leerTabla_('asignaciones'), cfg).filter(function (x) { return x.id === p.id; })[0];
  if (!c) return { ok: true };
  if (!c.items.some(function (x) { return yo.editables.indexOf(x.programa) >= 0; })) throw new Error('No tienes permiso para modificar este programa.');
  var aceptados = choquesAceptados_(), hoy = hoyISO_();
  Object.keys(aceptados).forEach(function (k) { if (k.split('|')[0] < hoy) delete aceptados[k]; });
  aceptados[c.id] = hoy;
  PropertiesService.getScriptProperties().setProperty('choquesAceptados', JSON.stringify(aceptados));
  registrar_('Choque aceptado', yo.nombre + ': ' + c.fecha + ' · ' + textoChoque_(c));
  return { ok: true };
}

/** Avisa (correo y notificación) a los responsables de los programas involucrados en choques nuevos. */
function avisarChoquesNuevos_(asign, cfg) {
  var props = PropertiesService.getScriptProperties();
  var avisados = {};
  try { avisados = JSON.parse(props.getProperty('choquesAvisados') || '{}'); } catch (e) { avisados = {}; }
  var hoy = hoyISO_();
  var vigentes = {}, nuevos = [];
  choques_(asign, cfg, null, true).forEach(function (c) {
    var k = c.id;
    vigentes[k] = avisados[k] || hoy;
    if (!avisados[k]) nuevos.push(c);
  });
  props.setProperty('choquesAvisados', JSON.stringify(vigentes));
  if (!nuevos.length) return 0;

  var responsables = {};
  leerTabla_('programas').forEach(function (p) {
    responsables[p['ID']] = String(p['Responsable (correo)'] || '').split(/[,;\s]+/).map(function (c) { return c.trim().toLowerCase(); }).filter(Boolean);
  });
  var porCorreo = {};
  nuevos.forEach(function (c) {
    var correos = {};
    c.items.forEach(function (x) { (responsables[x.programa] || []).forEach(function (r) { correos[r] = true; }); });
    Object.keys(correos).forEach(function (r) { (porCorreo[r] = porCorreo[r] || []).push(c); });
  });
  Object.keys(porCorreo).forEach(function (para) {
    var lista = porCorreo[para];
    var lineas = lista.map(function (c) { return ' • ' + etiquetaReunion_({ fecha: c.fecha }) + ' · ' + textoChoque_(c); });
    try {
      notificar_(cfg, para, lista.length === 1 ? 'Posible choque de asignaciones' : lista.length + ' posibles choques de asignaciones',
        lista.length === 1 ? textoChoque_(lista[0]) : 'Revísalos en la app.', './', 'choques');
    } catch (e) { /* sin notificación */ }
    enviarCorreo_(cfg, para, lista.length === 1 ? 'Posible choque de asignaciones: ' + lista[0].nombre : lista.length + ' posibles choques de asignaciones',
      ['Hola,', '', 'Estas personas tienen dos asignaciones a la misma hora. Es solo un aviso: si está bien así, no tienes que hacer nada.', '']
        .concat(lineas, ['', 'Para cambiar a alguien, ábrelo en la app y toca su nombre: verás sugerencias de reemplazo.'],
          cfg.urlApp ? ['', 'Abrir la app: ' + cfg.urlApp] : [], ['', 'Mensaje automático de la app de programas.']));
  });
  registrar_('Choques avisados', nuevos.map(textoChoque_).join(' | '));
  return nuevos.length;
}
