/**
 * Listado "No pasar" y mapa del territorio, leídos desde la carpeta de territorios en Drive.
 *
 * Inicio:
 *   carpetaTerritorios   = TERRITORIOS LOS ROMEROS   (nombre de la carpeta)
 *   archivoNoPasar       = Listado no pasar          (inicio del nombre; se toma el del año más reciente)
 *   archivoMapa          = Territorio Los Romeros    (inicio del nombre del PDF; ídem)
 *   noPasarVisiblePara / mapaVisiblePara = todos
 */

/** Busca en la carpeta el archivo cuyo nombre empieza con `prefijo`, prefiriendo el año más alto del nombre. */
function buscarArchivo_(cfg, prefijo, tipo) {
  var clave = 'archivo:' + prefijo + ':' + (tipo || '');
  var cache = CacheService.getScriptCache();
  var id = cache.get(clave);
  if (id) return DriveApp.getFileById(id);
  var carpetas = DriveApp.getFoldersByName(cfg.carpetaTerritorios || 'TERRITORIOS LOS ROMEROS');
  var candidatos = [];
  var p = norm_(prefijo);
  var revisar = function (it) {
    while (it.hasNext()) {
      var f = it.next();
      if (norm_(f.getName()).indexOf(p) !== 0) continue;
      if (tipo && f.getMimeType() !== tipo) continue;
      var anio = (f.getName().match(/(19|20)\d{2}/g) || ['0']).map(Number).sort().pop();
      candidatos.push({ f: f, anio: anio, mod: f.getLastUpdated().getTime() });
    }
  };
  while (carpetas.hasNext()) revisar(carpetas.next().getFiles());
  if (!candidatos.length) revisar(DriveApp.searchFiles('title contains "' + prefijo.replace(/"/g, '') + '" and trashed = false'));
  if (!candidatos.length) return null;
  candidatos.sort(function (a, b) { return (b.anio - a.anio) || (b.mod - a.mod); });
  cache.put(clave, candidatos[0].f.getId(), 21600);
  return candidatos[0].f;
}

/** Acción "nopasar": direcciones agrupadas por territorio. */
function listadoNoPasar_(yo, cfg) {
  if (!enAudiencia_(cfg.noPasarVisiblePara || 'todos', yo)) throw new Error('No tienes acceso a este listado.');
  var archivo = buscarArchivo_(cfg, cfg.archivoNoPasar || 'Listado no pasar', MimeType.GOOGLE_SHEETS);
  if (!archivo) throw new Error('No encontré el listado "No pasar" en la carpeta de territorios.');
  var sh = SpreadsheetApp.openById(archivo.getId()).getSheets()[0];
  var v = sh.getDataRange().getValues();
  var hdr = -1, col = {};
  for (var r = 0; r < Math.min(v.length, 10) && hdr < 0; r++) {
    var t = v[r].map(norm_);
    if (t.indexOf('territorio') >= 0 && t.some(function (x) { return /direcci/.test(x); })) {
      hdr = r;
      t.forEach(function (x, c) {
        if (x === 'territorio') col.territorio = c;
        else if (/manzana/.test(x)) col.manzana = c;
        else if (/direcci/.test(x)) col.direccion = c;
        else if (/fecha/.test(x)) col.fecha = c;
      });
    }
  }
  if (hdr < 0) throw new Error('El listado "No pasar" no tiene la fila de títulos (Territorio, Manzana, Dirección).');
  var porTerr = {};
  v.slice(hdr + 1).forEach(function (fila) {
    var terr = String(fila[col.territorio] === '' ? '' : fila[col.territorio]).replace(/\.0$/, '').trim();
    var dir = texto_(fila[col.direccion]);
    if (!terr || !dir || norm_(terr) === 'territorio' || /^direcci/.test(norm_(dir))) return; // filas de título repetidas
    var f = col.fecha != null ? fila[col.fecha] : '';
    (porTerr[terr] = porTerr[terr] || []).push({
      manzana: texto_(fila[col.manzana]),
      direccion: dir,
      fecha: f instanceof Date ? Utilities.formatDate(f, Session.getScriptTimeZone(), 'yyyy-MM-dd') : texto_(f)
    });
  });
  var territorios = Object.keys(porTerr).sort(function (a, b) { return (+a || 999) - (+b || 999) || a.localeCompare(b); }).map(function (t) {
    return { territorio: t, direcciones: porTerr[t].sort(function (a, b) { return a.manzana.localeCompare(b.manzana) || a.direccion.localeCompare(b.direccion); }) };
  });
  return { ok: true, archivo: archivo.getName(), actualizado: Utilities.formatDate(archivo.getLastUpdated(), Session.getScriptTimeZone(), 'yyyy-MM-dd'), territorios: territorios };
}

/** Acción "mapa": el mapa en base64 (la app lo guarda en el teléfono para no descargarlo cada vez).
 *  Con p.territorio entrega el de ese territorio; sin él, el general. Usa las imágenes de la carpeta
 *  "Mapas por territorio" (General.jpg, Territorio 1.jpg…) y, si no hay, el PDF completo. */
function mapaTerritorio_(yo, cfg, p) {
  if (!enAudiencia_(cfg.mapaVisiblePara || 'todos', yo)) throw new Error('No tienes acceso al mapa.');
  var t = String(p.territorio || '').replace(/\D/g, '');
  var archivo = mapaPorTerritorio_(t || 'general');
  if (!archivo && t) return { ok: true, sinMapa: true };
  if (!archivo) archivo = buscarArchivo_(cfg, cfg.archivoMapa || 'Territorio Los Romeros', MimeType.PDF);
  if (!archivo) throw new Error('No encontré el mapa del territorio en la carpeta de territorios.');
  var version = archivo.getId() + ':' + archivo.getLastUpdated().getTime();
  if (p.version === version) return { ok: true, version: version, sinCambios: true };
  var tipo = archivo.getMimeType();
  var datos = Utilities.base64Encode(archivo.getBlob().getBytes());
  return { ok: true, version: version, nombre: archivo.getName(), tipo: tipo, datos: datos, pdf: tipo === MimeType.PDF ? datos : undefined };
}

var CARPETA_MAPAS = 'Mapas por territorio';

/** Imagen (o PDF) del mapa de un territorio ('general' para el completo), o null si no existe. */
function mapaPorTerritorio_(t) {
  var clave = 'mapa-terr:' + t;
  var cache = CacheService.getScriptCache();
  var id = cache.get(clave);
  if (id === '-') return null;
  if (id) { try { return DriveApp.getFileById(id); } catch (e) { /* se busca de nuevo */ } }
  var base = t === 'general' ? 'general' : 'territorio ' + t;
  var encontrado = null;
  var carpetas = DriveApp.getFoldersByName(CARPETA_MAPAS);
  while (carpetas.hasNext() && !encontrado) {
    var it = carpetas.next().getFiles();
    while (it.hasNext()) {
      var f = it.next();
      if (norm_(f.getName()).replace(/\.(jpe?g|png|webp|pdf)$/, '') === base && !f.isTrashed()) { encontrado = f; break; }
    }
  }
  cache.put(clave, encontrado ? encontrado.getId() : '-', encontrado ? 21600 : 600);
  return encontrado;
}

/* ------------------------------------------------------------------ */
/* Solicitudes para agregar direcciones al listado No pasar             */
/* ------------------------------------------------------------------ */

/** Correos de las personas que pertenecen a una audiencia (para avisar a quienes aprueban). */
function correosEnAudiencia_(texto) {
  var usuarios = {};
  leerTabla_('usuarios').forEach(function (u) { if (u['Correo']) usuarios[String(u['Correo']).trim().toLowerCase()] = String(u['Rol'] || 'lector').toLowerCase(); });
  var out = {};
  leerTabla_('personas').forEach(function (p) {
    var correo = String(p['Correo'] || '').trim().toLowerCase();
    if (!correo) return;
    var yo = { correo: correo, rol: usuarios[correo] || '', privilegiado: !!usuarios[correo], grupo: +p['Grupo'] || null, perfiles: perfilesDe_(p) };
    if (enAudiencia_(texto, yo)) out[correo] = true;
  });
  Object.keys(usuarios).forEach(function (c) {
    if (enAudiencia_(texto, { correo: c, rol: usuarios[c], privilegiado: true, grupo: null, perfiles: [] })) out[c] = true;
  });
  return Object.keys(out);
}

function puedeSolicitarNoPasar_(yo, cfg) { return enAudiencia_(cfg.noPasarSolicitan || 'capitan, anciano', yo); }
function puedeAprobarNoPasar_(yo, cfg) { return yo.rol === 'admin' || enAudiencia_(cfg.noPasarAprueban || 'admin', yo) && !!String(cfg.noPasarAprueban || '').trim(); }

/** Acción "solicitarNoPasar". */
function solicitarNoPasar_(yo, p, cfg) {
  if (!puedeSolicitarNoPasar_(yo, cfg)) throw new Error('No tienes permiso para solicitar cambios al listado.');
  var terr = String(p.territorio || '').replace(/\D/g, '');
  var direccion = texto_(p.direccion);
  if (!terr) throw new Error('Elige el territorio.');
  if (direccion.length < 4) throw new Error('Escribe la dirección.');
  asegurarColumnas_('solicitudesNoPasar');
  agregarFilas_('solicitudesNoPasar', [{
    'Fecha': new Date(), 'Solicitado por': yo.nombre, 'Correo': yo.correo, 'Territorio': +terr,
    'Manzana': texto_(p.manzana).toUpperCase().slice(0, 20), 'Dirección': direccion.slice(0, 200), 'Notas': texto_(p.notas).slice(0, 300), 'Estado': 'Pendiente'
  }]);
  registrar_('Solicitud No pasar', yo.nombre + ': territorio ' + terr + ' · ' + direccion);
  correosEnAudiencia_(cfg.noPasarAprueban || 'admin').forEach(function (c) {
    notificar_(cfg, c, 'Solicitud para "No pasar"', yo.nombre + ' pide agregar: ' + direccion + ' (territorio ' + terr + ')', './', 'nopasar-sol');
  });
  return { ok: true };
}

function solicitudesNoPasar_() {
  try { return leerTabla_('solicitudesNoPasar', { opcional: true }); } catch (e) { return []; }
}

/** Acción "resolverNoPasar": aprueba (agrega al listado) o rechaza una solicitud. */
function resolverNoPasar_(yo, p, cfg) {
  if (!puedeAprobarNoPasar_(yo, cfg)) throw new Error('No tienes permiso para aprobar solicitudes.');
  var sol = solicitudesNoPasar_().filter(function (s) { return s._fila === +p.fila; })[0];
  if (!sol || sol['Estado'] !== 'Pendiente') throw new Error('Esa solicitud ya fue revisada.');
  var aprobar = p.decision === 'aprobar';
  if (aprobar) {
    var archivo = buscarArchivo_(cfg, cfg.archivoNoPasar || 'Listado no pasar', MimeType.GOOGLE_SHEETS);
    if (!archivo) throw new Error('No encontré el listado "No pasar".');
    var sh = SpreadsheetApp.openById(archivo.getId()).getSheets()[0];
    var hoy = Utilities.parseDate(hoyISO_(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    sh.appendRow([hoy, sol['Territorio'], sol['Manzana'], sol['Dirección']]);
  }
  actualizarFila_('solicitudesNoPasar', sol, { 'Estado': aprobar ? 'Aprobada' : 'Rechazada', 'Revisado por': yo.nombre, 'Revisado el': new Date() });
  registrar_('Solicitud No pasar ' + (aprobar ? 'aprobada' : 'rechazada'), yo.nombre + ': ' + sol['Dirección'] + ' (territorio ' + sol['Territorio'] + ')');
  notificar_(cfg, sol['Correo'], aprobar ? 'Dirección agregada a "No pasar"' : 'Solicitud de "No pasar" no aprobada',
    sol['Dirección'] + ' (territorio ' + sol['Territorio'] + ')', './#nopasar/' + sol['Territorio'], 'nopasar-res');
  return { ok: true };
}

/** Solicitudes para la app: pendientes por aprobar (si corresponde) y las propias recientes. */
function solicitudesParaUsuario_(yo, cfg) {
  var todas = solicitudesNoPasar_();
  var fmt = function (s) {
    return { fila: s._fila, fecha: s['Fecha'] instanceof Date ? Utilities.formatDate(s['Fecha'], Session.getScriptTimeZone(), 'yyyy-MM-dd') : '',
      por: s['Solicitado por'], territorio: String(s['Territorio']), manzana: s['Manzana'], direccion: s['Dirección'], notas: s['Notas'], estado: s['Estado'] };
  };
  var limite = sumarDias_(hoyISO_(), -30);
  return {
    puedeSolicitar: puedeSolicitarNoPasar_(yo, cfg),
    porAprobar: puedeAprobarNoPasar_(yo, cfg) ? todas.filter(function (s) { return s['Estado'] === 'Pendiente'; }).map(fmt) : [],
    mias: todas.filter(function (s) { return String(s['Correo']).toLowerCase() === yo.correo; }).map(fmt)
      .filter(function (s) { return s.estado === 'Pendiente' || s.fecha >= limite; })
  };
}
