/**
 * "Mis datos": cada hermano confirma su nombre, cómo quiere que lo llamen, su teléfono,
 * y deja registrado el correo de la cuenta de Google con la que entra.
 *
 * - Si aún no está registrado (su correo no está en Personas), elige su nombre de la lista.
 *   El correo se asigna de inmediato cuando el teléfono que escribe coincide con el que tenemos;
 *   si no coincide (o ese nombre ya tiene otro correo), queda pendiente para que el admin lo apruebe.
 * - Cambiar el nombre completo siempre requiere aprobación (los programas lo usan para reconocer a la persona).
 */

function digitos_(t) { return String(t || '').replace(/\D/g, ''); }
function mismoTelefono_(a, b) {
  a = digitos_(a); b = digitos_(b);
  return a.length >= 8 && b.length >= 8 && a.slice(-8) === b.slice(-8);
}

/** Fecha (AAAA-MM-DD) en que la persona confirmó sus datos por última vez, o ''. */
function datosConfirmadosEl_(fila) {
  var v = fila && fila['Datos confirmados el'];
  return v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(v || '').slice(0, 10);
}

/**
 * Fecha anual de confirmación (Inicio ▸ fechaConfirmarDatos, "día-mes", p. ej. 01-09) más reciente que ya llegó.
 * Ej.: con 01-09, el 25-10-2026 da 2026-09-01; el 15-03-2027 también da 2026-09-01.
 */
function inicioConfirmacion_(cfg) {
  var v = cfg.fechaConfirmarDatos;
  var dia, mes;
  if (v instanceof Date) { dia = v.getDate(); mes = v.getMonth() + 1; }
  else {
    var m = /^(\d{1,2})[-\/.](\d{1,2})/.exec(String(v || '01-09'));
    dia = m ? +m[1] : 1; mes = m ? +m[2] : 9;
  }
  var hoy = hoyISO_(), anio = +hoy.slice(0, 4);
  var f = anio + '-' + pad2_(mes) + '-' + pad2_(dia);
  return f <= hoy ? f : (anio - 1) + '-' + pad2_(mes) + '-' + pad2_(dia);
}

/** ¿Le toca confirmar sus datos? Sí, si no los ha confirmado desde la fecha anual de confirmación. */
function debeConfirmarDatos_(fila, cfg) {
  var f = datosConfirmadosEl_(fila);
  return !f || f < inicioConfirmacion_(cfg);
}

function personaFila_(nombre) {
  return leerTabla_('personas').filter(function (p) { return norm_(p['Nombre']) === norm_(nombre); })[0] || null;
}

/** Acción "misDatos": datos actuales (registrado) o la lista de nombres para elegir (no registrado). */
function misDatos_(correo, yo) {
  if (yo.registrado) {
    var f = personaFila_(yo.nombre) || {};
    return { ok: true, registrado: true, nombre: yo.nombre, apodo: f['Cómo le dicen'] || '', telefono: String(f['Teléfono (WhatsApp)'] || ''), correo: correo,
      direccion: f['Dirección'] || '', confirmadosEl: datosConfirmadosEl_(f),
      emergencia: { nombre: f['Emergencia: nombre'] || '', parentesco: f['Emergencia: parentesco'] || '', direccion: f['Emergencia: dirección'] || '', telefono: String(f['Emergencia: teléfono'] || '') } };
  }
  var nombres = leerTabla_('personas').filter(function (p) { return p['Nombre'] && !String(p['Correo'] || '').trim(); })
    .map(function (p) { return p['Nombre']; }).sort(function (a, b) { return a.localeCompare(b, 'es'); });
  return { ok: true, registrado: false, correo: correo, nombres: nombres };
}

/** Acción "actualizarDatos". */
function actualizarDatos_(correo, yo, p, cfg) {
  asegurarColumnas_('personas');
  asegurarColumnas_('actualizacionesDatos');
  var nombre = yo.registrado ? yo.nombre : texto_(p.nombre);
  var fila = personaFila_(nombre);
  if (!fila) throw new Error('Elige tu nombre de la lista.');
  var telefono = texto_(p.telefono), apodo = texto_(p.apodo).slice(0, 40), nombreCorrecto = texto_(p.nombreCorrecto).slice(0, 80);
  if (digitos_(telefono).length < 8) throw new Error('Escribe tu número de teléfono (con WhatsApp).');

  var registro = { 'Fecha': new Date(), 'Correo': correo, 'Persona': fila['Nombre'], 'Nombre correcto': nombreCorrecto !== fila['Nombre'] ? nombreCorrecto : '',
    'Cómo le dicen': apodo, 'Teléfono': telefono };
  var motivos = [];
  var correoActual = String(fila['Correo'] || '').trim().toLowerCase();
  if (!yo.registrado) {
    if (correoActual && correoActual !== correo) motivos.push('Ese nombre ya tenía otro correo (' + correoActual + ')');
    if (fila['Teléfono (WhatsApp)'] && !mismoTelefono_(fila['Teléfono (WhatsApp)'], telefono)) motivos.push('El teléfono no coincide con el registrado');
    if (!fila['Teléfono (WhatsApp)']) motivos.push('No teníamos teléfono para comparar');
  }
  var cambios = {};
  if (apodo !== String(fila['Cómo le dicen'] || '')) cambios['Cómo le dicen'] = apodo;
  // Dirección y contacto de emergencia: solo desde "Mis datos" de quien ya está registrado (se guardan directo)
  if (yo.registrado) {
    var em = p.emergencia || {};
    var extra = { 'Dirección': p.direccion, 'Emergencia: nombre': em.nombre, 'Emergencia: parentesco': em.parentesco, 'Emergencia: dirección': em.direccion, 'Emergencia: teléfono': em.telefono };
    Object.keys(extra).forEach(function (k) {
      if (extra[k] === undefined) return;
      var v = texto_(extra[k]).slice(0, 200);
      if (v !== texto_(fila[k])) cambios[k] = v;
    });
  }
  if (!motivos.length) {
    if (!yo.registrado) cambios['Correo'] = correo;
    if (!mismoTelefono_(fila['Teléfono (WhatsApp)'], telefono)) cambios['Teléfono (WhatsApp)'] = telefono;
  }
  // Guardar "Mis datos" estando registrado cuenta como la confirmación anual (aunque no cambie nada)
  if (yo.registrado) cambios['Datos confirmados el'] = new Date();
  if (Object.keys(cambios).length) actualizarFila_('personas', fila, cambios);
  if (registro['Nombre correcto']) motivos.push('Cambio de nombre');
  registro['Estado'] = motivos.length ? 'Pendiente' : 'Aplicada';
  registro['Motivo'] = motivos.join(' · ');
  agregarFilas_('actualizacionesDatos', [registro]);
  limpiarCache_();
  if (motivos.length) {
    correosEnAudiencia_(cfg.datosAprueban || 'admin').forEach(function (c) {
      notificar_(cfg, c, 'Revisar datos de ' + fila['Nombre'], registro['Motivo'], './', 'datos-pend');
    });
  }
  registrar_('Datos actualizados', fila['Nombre'] + ' (' + correo + ') · ' + registro['Estado'] + (registro['Motivo'] ? ' · ' + registro['Motivo'] : ''));
  return { ok: true, estado: registro['Estado'], registrado: yo.registrado || !motivos.length, pendientePorNombre: !!registro['Nombre correcto'] && motivos.length === 1 };
}

/** Pendientes para el admin. */
function actualizacionesPendientes_() {
  return leerTabla_('actualizacionesDatos', { opcional: true }).filter(function (a) { return a['Estado'] === 'Pendiente'; }).map(function (a) {
    return { fila: a._fila, persona: a['Persona'], correo: a['Correo'], nombreCorrecto: a['Nombre correcto'], apodo: a['Cómo le dicen'], telefono: String(a['Teléfono']), motivo: a['Motivo'] };
  });
}

/** Acción "resolverDatos": aplica o descarta una actualización pendiente. */
function resolverDatos_(yo, p, cfg) {
  if (!enAudiencia_(cfg.datosAprueban || 'admin', yo) || !yo.privilegiado) throw new Error('No tienes permiso para aprobar datos.');
  var act = leerTabla_('actualizacionesDatos').filter(function (a) { return a._fila === +p.fila; })[0];
  if (!act || act['Estado'] !== 'Pendiente') throw new Error('Esa actualización ya fue revisada.');
  var aprobar = p.decision === 'aprobar';
  if (aprobar) {
    var fila = personaFila_(act['Persona']);
    if (!fila) throw new Error('No encontré a ' + act['Persona'] + ' en el directorio.');
    var cambios = { 'Correo': act['Correo'], 'Teléfono (WhatsApp)': String(act['Teléfono']) };
    if (act['Cómo le dicen']) cambios['Cómo le dicen'] = act['Cómo le dicen'];
    if (act['Nombre correcto'] && act['Nombre correcto'] !== fila['Nombre']) {
      // El nombre anterior queda como otra forma de escribirlo, para seguir reconociéndolo en los programas
      var alias = String(fila['Otras formas de escribirlo (separadas por ;)'] || '');
      cambios['Otras formas de escribirlo (separadas por ;)'] = (alias ? alias + '; ' : '') + fila['Nombre'];
      cambios['Nombre'] = act['Nombre correcto'];
      cambios['Nombre público'] = nombrePublico_(act['Nombre correcto']);
    }
    actualizarFila_('personas', fila, cambios);
  }
  actualizarFila_('actualizacionesDatos', act, { 'Estado': aprobar ? 'Aprobada' : 'Rechazada', 'Revisado por': yo.nombre, 'Revisado el': new Date() });
  limpiarCache_();
  notificar_(cfg, act['Correo'], aprobar ? 'Tus datos quedaron actualizados' : 'No pudimos confirmar tus datos',
    aprobar ? 'Ya puedes usar la app con normalidad.' : 'Habla con un anciano para revisarlo.', './', 'datos-res');
  return { ok: true };
}
