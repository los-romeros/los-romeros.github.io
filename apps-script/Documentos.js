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

/** Acción "mapa": el PDF del territorio en base64 (la app lo guarda en el teléfono para no descargarlo cada vez). */
function mapaTerritorio_(yo, cfg, p) {
  if (!enAudiencia_(cfg.mapaVisiblePara || 'todos', yo)) throw new Error('No tienes acceso al mapa.');
  var archivo = buscarArchivo_(cfg, cfg.archivoMapa || 'Territorio Los Romeros', MimeType.PDF);
  if (!archivo) throw new Error('No encontré el mapa del territorio (PDF) en la carpeta de territorios.');
  var version = archivo.getId() + ':' + archivo.getLastUpdated().getTime();
  if (p.version === version) return { ok: true, version: version, sinCambios: true };
  return { ok: true, version: version, nombre: archivo.getName(), pdf: Utilities.base64Encode(archivo.getBlob().getBytes()) };
}
