/**
 * Casas desde donde salen a predicar (pestaña "Casas de predicación" de la planilla central).
 *
 * - Una fila por cada "Lugar" del programa de predicación (se agregan solas).
 * - "Dirección para el mapa" y "Ubicación (mapa)": la corrección del admin para que Google Maps
 *   lleve al lugar correcto (se hace en la app, tocando "Corregir mapa" junto a la dirección).
 * - "Dueños de casa": quiénes viven ahí. Se adivina con el apellido de la columna Familia y la
 *   dirección de Personas; el admin lo corrige en la app o aquí. Reciben el aviso de la salida.
 */

/** Clave para comparar lugares escritos con pequeñas diferencias (tildes, espacios, puntos). */
function claveCasa_(lugar) {
  return norm_(lugar).replace(/[^a-z0-9ñ]+/g, ' ').trim();
}

/** ¿Es una dirección (y no Zoom, teléfono o cartas)? */
function esDireccionCasa_(lugar) {
  return !!texto_(lugar) && !/zoom|tel[eé]fono|cartas/i.test(lugar);
}

/** "Familia Droguett · Territorio 1 · Grupo 2" -> "Droguett" */
function familiaDeDetalle_(detalle) {
  var m = /^Familia ([^·]+)/.exec(String(detalle || ''));
  return m ? texto_(m[1]) : '';
}

function textoMapaCasa_(c) {
  return texto_(c['Dirección para el mapa']) || limpiarDireccion_(c['Lugar']);
}

function duenosDeCasa_(c) {
  return String(c['Dueños de casa'] || '').split(/[,;]+/).map(texto_).filter(Boolean);
}

/** { lat, lng } guardados en "Ubicación (mapa)" (sin importar el texto), o null. */
function coordenadas_(v) {
  var c = /^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/.exec(String(v || ''));
  return c ? { lat: +c[1], lng: +c[2] } : null;
}

function metrosEntre_(a, b) {
  var rad = Math.PI / 180, x = (b.lng - a.lng) * rad * Math.cos((a.lat + b.lat) / 2 * rad), y = (b.lat - a.lat) * rad;
  return Math.sqrt(x * x + y * y) * 6371000;
}

/** Casas por clave del lugar. */
function casasPorClave_() {
  var out = {};
  leerTabla_('casas', { opcional: true }).forEach(function (c) { if (texto_(c['Lugar'])) out[claveCasa_(c['Lugar'])] = c; });
  return out;
}

/** Datos de una casa para la app: ubicación, texto que se busca y dueños. */
function casaParaApp_(c) {
  var tx = textoMapaCasa_(c), u = tx ? ubicacionGuardada_(c, tx) : null;
  return {
    lugar: c['Lugar'], familia: c['Familia'] || '', duenos: duenosDeCasa_(c), direccion: texto_(c['Dirección para el mapa']), texto: tx,
    lat: u && u.lat !== '' ? u.lat : null, lng: u && u.lng !== '' ? u.lng : null,
    confirmada: String(c['Ubicación (mapa)'] || '').indexOf('✓') >= 0, revisado: !!texto_(c['Revisado por'])
  };
}

/**
 * Personas que viven en esa casa: el apellido de la familia en su nombre y la misma dirección
 * (o su pin del mapa a menos de 60 m). En un edificio, el apellido evita avisar a los vecinos.
 */
function adivinarDuenos_(lugar, familia, personas, ubicCasa) {
  var apellidos = tokens_(familia).filter(function (t) { return !PARTICULAS_[t] && t.length > 2; });
  if (!apellidos.length) return [];
  var dirCasa = norm_(limpiarDireccion_(lugar));
  return personas.filter(function (p) {
    var tk = tokens_(p['Nombre']);
    if (!apellidos.some(function (a) { return tk.indexOf(a) >= 1; })) return false;
    var dp = limpiarDireccion_(p['Dirección']);
    if (dp && dirCasa && norm_(dp) === dirCasa) return true;
    var up = coordenadas_(p['Ubicación (mapa)']);
    return !!(ubicCasa && up && metrosEntre_(ubicCasa, up) < 60);
  }).map(function (p) { return p['Nombre']; });
}

/**
 * Agrega las casas nuevas del programa de predicación, completa dueños (si nadie los revisó) y
 * ubica en el mapa las que falten (máx. `max` búsquedas). Se llama tras sincronizar y una vez al día.
 */
function actualizarCasas_(max) {
  asegurarColumnas_('casas');
  var base = baseCacheada_();
  var prog = base.programas.filter(function (p) { return p.id === 'predicacion'; })[0];
  if (!prog) return 0;
  var vistas = {};
  prog.reuniones.forEach(function (r) {
    if (!esDireccionCasa_(r.lugar)) return;
    var k = claveCasa_(r.lugar);
    var fam = '';
    r.secciones.forEach(function (s) { s.filas.forEach(function (f) { fam = fam || familiaDeDetalle_(f.detalle); }); });
    if (!vistas[k] || (!vistas[k].familia && fam)) vistas[k] = { lugar: r.lugar, familia: fam };
  });
  var filas = leerTabla_('casas'), porClave = {};
  filas.forEach(function (c) { porClave[claveCasa_(c['Lugar'])] = c; });
  var personas = leerTabla_('personas').filter(function (p) { return texto_(p['Nombre']); });
  var nuevas = [], cambios = 0, buscadas = 0;
  Object.keys(vistas).forEach(function (k) {
    var v = vistas[k], c = porClave[k];
    if (!c) {
      var tx = limpiarDireccion_(v.lugar), g = null, ub = '';
      if (tx && buscadas < (max || 20)) {
        buscadas++;
        try { g = geocodificar_(tx); ub = (g ? g.lat + ',' + g.lng + (g.exacta ? '' : ' ~') : 'No encontrada') + ' | ' + tx; } catch (e) { /* se reintenta mañana */ }
      }
      nuevas.push({ 'Lugar': v.lugar, 'Familia': v.familia, 'Dueños de casa': adivinarDuenos_(v.lugar, v.familia, personas, g).join(', '), 'Ubicación (mapa)': ub });
      return;
    }
    var cambio = {};
    if (!texto_(c['Familia']) && v.familia) cambio['Familia'] = v.familia;
    var tx2 = textoMapaCasa_(c);
    if (tx2 && !ubicacionGuardada_(c, tx2) && buscadas < (max || 20)) {
      buscadas++;
      try {
        var g2 = geocodificar_(tx2);
        cambio['Ubicación (mapa)'] = (g2 ? g2.lat + ',' + g2.lng + (g2.exacta ? '' : ' ~') : 'No encontrada') + ' | ' + tx2;
      } catch (e) { /* se reintenta mañana */ }
    }
    if (!texto_(c['Dueños de casa']) && !texto_(c['Revisado por'])) {
      var d = adivinarDuenos_(c['Lugar'], cambio['Familia'] || c['Familia'], personas, coordenadas_(cambio['Ubicación (mapa)'] || c['Ubicación (mapa)']));
      if (d.length) cambio['Dueños de casa'] = d.join(', ');
    }
    if (Object.keys(cambio).length) { actualizarFila_('casas', c, cambio); cambios++; }
  });
  agregarFilas_('casas', nuevas);
  if (nuevas.length || cambios) limpiarCache_();
  return nuevas.length + cambios;
}

/** Acción "guardarCasa" (solo admin): dirección para el mapa, pin y dueños de una casa. */
function guardarCasa_(yo, p) {
  if (yo.rol !== 'admin') throw new Error('Solo el administrador puede corregir las direcciones del mapa.');
  var lugar = texto_(p.lugar);
  if (!lugar) throw new Error('Falta la dirección.');
  asegurarColumnas_('casas');
  var dir = directorio_();
  var duenos = (p.duenos || []).map(function (n) {
    var x = reconocer_(n, dir);
    if (!x) throw new Error('No encontré a «' + n + '» en el directorio.');
    return x.nombre;
  }).filter(function (n, i, a) { return a.indexOf(n) === i; });
  var fila = leerTabla_('casas').filter(function (c) { return claveCasa_(c['Lugar']) === claveCasa_(lugar); })[0];
  var valores = { 'Lugar': lugar, 'Dirección para el mapa': texto_(p.direccion), 'Dueños de casa': duenos.join(', '), 'Revisado por': yo.nombre, 'Revisado el': new Date() };
  if (texto_(p.familia) && !(fila && texto_(fila['Familia']))) valores['Familia'] = texto_(p.familia);
  var tx = valores['Dirección para el mapa'] || limpiarDireccion_(lugar);
  var marcada = coordenadasValidas_(p.ubicacion);
  var g = marcada ? null : geocodificar_(tx);
  valores['Ubicación (mapa)'] = marcada ? marcada.lat + ',' + marcada.lng + ' ✓ | ' + tx
    : (g ? g.lat + ',' + g.lng + (g.exacta ? '' : ' ~') : 'No encontrada') + ' | ' + tx;
  if (fila) actualizarFila_('casas', fila, valores);
  else agregarFilas_('casas', [fila = valores]);
  registrar_('Casa de predicación corregida', yo.nombre + ': ' + lugar + ' → ' + tx + (duenos.length ? ' · dueños: ' + duenos.join(', ') : ''));
  return { ok: true, casa: casaParaApp_(fila) };
}

/**
 * Salidas de predicación (publicadas) desde la casa de esta persona, de hoy en adelante.
 * [{ reunion, casa, encargado, detalle }]
 */
function salidasDesdeCasa_(nombre, base, casas) {
  var n = norm_(nombre), hoy = hoyISO_(), out = [];
  var prog = base.programas.filter(function (p) { return p.id === 'predicacion'; })[0];
  if (!prog || !n) return out;
  prog.reuniones.forEach(function (r) {
    if (r.borrador || r.fecha < hoy || !esDireccionCasa_(r.lugar)) return;
    var c = casas[claveCasa_(r.lugar)];
    if (!c || !duenosDeCasa_(c).some(function (d) { return norm_(d) === n; })) return;
    var enc = [], det = '';
    r.secciones.forEach(function (s) { s.filas.forEach(function (f) {
      f.asignados.forEach(function (a) { enc.push(a.nombre); });
      det = det || String(f.detalle || '').split(' · ').filter(function (x) { return !/^Familia /.test(x); }).join(' · ');
    }); });
    out.push({ reunion: r, encargado: enc.join(', '), detalle: det });
  });
  return out;
}

/** Texto con los detalles de la salida: "lunes 3 de noviembre · 10:00 · Encargado: X · Territorio 4". */
function textoSalidaCasa_(x) {
  var r = x.reunion, p = r.fecha.split('-');
  var dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  return [dias[diaSemana_(r.fecha)] + ' ' + (+p[2]) + ' de ' + MESES_NOMBRES[+p[1] - 1], r.hora || '',
    x.encargado ? 'Encargado: ' + x.encargado : '', x.detalle].filter(Boolean).join(' · ');
}

/** Notificación a los dueños de casa: `dias` antes de la salida (7 a las 10:00, 1 a las 18:00). */
function avisosCasas_(cfg, dias) {
  var base = baseCacheada_(), casas = casasPorClave_(), dir = directorio_();
  var fecha = sumarDias_(hoyISO_(), dias), n = 0, avisados = 0;
  dir.personas.forEach(function (p) {
    if (!p.correo) return;
    var lista = salidasDesdeCasa_(p.nombre, base, casas).filter(function (x) { return x.reunion.fecha === fecha; });
    if (!lista.length) return;
    n++;
    avisados += notificar_(cfg, p.correo, (dias === 1 ? 'Mañana' : 'En ' + dias + ' días') + ' salen a predicar desde tu casa',
      lista.map(textoSalidaCasa_).join(' | '), './#mias', 'casa-' + dias + '-' + fecha);
  });
  if (n) registrar_('Aviso a dueños de casa', n + ' persona(s) · salida en ' + dias + ' día(s) · ' + avisados + ' notificación(es) entregadas');
  return n;
}
