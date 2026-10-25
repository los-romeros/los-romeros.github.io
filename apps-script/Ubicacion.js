/**
 * Ubicación en el mapa de las direcciones de los hermanos.
 *
 * Las direcciones escritas a mano (con block, depto., villa…) Google Maps no las encuentra bien.
 * Por eso:
 *  1. Se limpia la dirección (calle + número + comuna), o se usa "Dirección para el mapa" si alguien la escribió.
 *  2. Se ubica una vez con el geocodificador de Google (gratis desde Apps Script) y se guarda en
 *     "Ubicación (mapa)" como "lat,lng | texto buscado". Si cambia el texto, se vuelve a ubicar sola.
 *  3. La app abre Maps en esas coordenadas; si no se encontró, busca el texto limpio.
 */

// Zona de búsqueda: Concón, Reñaca y Viña del Mar
var ZONA_MAPA = { sur: -33.10, oeste: -71.62, norte: -32.85, este: -71.40 };

/** "Los Lobos 610 block N depto 402 villa primavera, concon" -> "Los Lobos 610, Concón, Chile" */
function limpiarDireccion_(texto) {
  var t = String(texto || '').replace(/ /g, ' ');
  if (!texto_(t)) return '';
  var comuna = /re[nñ]aca|jard[ií]n del mar/i.test(t) && !/con\s?c[oó]n\s*[-–]?\s*re[nñ]aca/i.test(t) ? 'Reñaca, Viña del Mar'
    : /vi[nñ]a\s+del\s+mar/i.test(t) ? 'Viña del Mar' : 'Concón';
  t = t.replace(/con\s?c[oó]n\s*[-–]?\s*re[nñ]aca/gi, '§CR§') // la avenida Concón-Reñaca es nombre de calle
    .replace(/\(\s*(\d+)\s*\)/g, ' $1 ').replace(/\(.*?\)/g, ' ')
    .replace(/\bN\s*[°º*]\s*/gi, ' ').replace(/#/g, ' ')
    .replace(/\bc\/\s*/gi, ' con ')
    // comunas y barrios (no ayudan a ubicar la calle); se conservan si van seguidos de un número ("Jardines de Reñaca 35")
    .replace(/\b(con\s?con|conc[oó]n|vi[nñ]a\s+del\s+mar|re[nñ]aca|chile)\b\.?(?!\s*\d)/gi, ' ')
    .replace(/\b(v\.|villa)\s*primavera\b|\bvilla\s+(san\s+andr[eé]s|r\.?p\.?c\.?)\b|\bvilla\s+comercio(?=\s*$)/gi, ' ')
    .replace(/\b(nueva\s+)?(pobl(aci[oó]n)?\.?|pob\.?)\s*(nueva\s+)?(r\.?p\.?c\.?|los troncos|el carmen|el mirador|las gaviotas)\b\.?/gi, ' ')
    .replace(/\b(nva\.?\s*)?r\.?p\.?c\b\.?|\blos troncos\b|\blos romeros\b|\blomas de montemar\b|\bjard[ií]n del mar\b|\bcostas de montemar\b(?!\s+\d)/gi, ' ')
    .replace(/\bcondominio\s+(los\s+)?[a-zñáéíóú]+/gi, ' ')
    .replace(/\bedf\s*\.\s*\w+(\s+\d+)?/gi, ' ');
  // "casa 529" es el número cuando la calle aún no tiene número
  t = t.replace(/^([^\d]*?[a-zñáéíóú.]\s+)casa\s+(\d+)/i, '$1$2');
  // Desde el block, depto., torre… en adelante no sirve para el mapa
  t = t.split(/\b(block|blok|bloque|torre|edificio|depto|dpto|dpt|dp|dep|drt|departamento|apartamento|piso|local|casa)\b\.?/i)[0];
  t = t.replace(/\s+con\s+/i, ' & ').replace(/[.,;\-–]+\s*$/g, '').replace(/\s*[,.]\s*/g, ' ').replace(/\s+-\s+/g, ' ').replace(/\s+/g, ' ').trim();
  t = t.replace(/^(pasaje|pje\.?|psje\.?)\s+/i, 'Pasaje ').replace(/\bpta\b\.?/i, 'Punta').replace(/\b(\d+)-?[a-z]\b/i, '$1')
    .replace(/§CR§/g, 'Concón-Reñaca');
  return t ? t + ', ' + comuna + ', Chile' : '';
}

/** Texto que se busca en el mapa para una persona (la corrección manual manda). */
function textoMapa_(p) {
  return texto_(p['Dirección para el mapa']) || limpiarDireccion_(p['Dirección']);
}

/** { lat, lng } guardados para ese texto, o null si hay que (re)ubicar. '' en lat = no se encontró. */
function ubicacionGuardada_(p, texto) {
  var v = String(p['Ubicación (mapa)'] || '');
  var partes = v.split('|');
  if (partes.length < 2 || texto_(partes.slice(1).join('|')) !== texto) return null;
  var c = /^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/.exec(partes[0]);
  return c ? { lat: +c[1], lng: +c[2] } : { lat: '', lng: '' };
}

/** Busca un texto en el geocodificador de Google, solo dentro de la zona. */
function geocodificar_(texto) {
  var g = Maps.newGeocoder().setRegion('cl').setLanguage('es').setBounds(ZONA_MAPA.sur, ZONA_MAPA.oeste, ZONA_MAPA.norte, ZONA_MAPA.este);
  var r = g.geocode(texto);
  if (r.status !== 'OK' || !r.results || !r.results.length) return null;
  var x = r.results[0];
  var tipos = x.types || [];
  // Solo la comuna o la región no sirve: debe ser una calle, una dirección o un lugar
  if (tipos.indexOf('locality') >= 0 || tipos.indexOf('administrative_area_level_1') >= 0 || tipos.indexOf('administrative_area_level_3') >= 0) return null;
  var loc = x.geometry.location;
  if (loc.lat < ZONA_MAPA.sur || loc.lat > ZONA_MAPA.norte || loc.lng < ZONA_MAPA.oeste || loc.lng > ZONA_MAPA.este) return null;
  return { lat: Math.round(loc.lat * 1e6) / 1e6, lng: Math.round(loc.lng * 1e6) / 1e6, exacta: tipos.indexOf('street_address') >= 0 || tipos.indexOf('premise') >= 0 || tipos.indexOf('subpremise') >= 0 };
}

/**
 * Ubica las direcciones que aún no tienen ubicación (o cuyo texto cambió). Devuelve { ubicadas, noEncontradas: [nombres] }.
 * `max` limita cuántas se buscan en esta vuelta; `todas` vuelve a buscar incluso las ya ubicadas.
 */
function ubicarDirecciones_(max, todas) {
  asegurarColumnas_('personas');
  var filas = leerTabla_('personas');
  var ubicadas = 0, noEncontradas = [], buscadas = 0, inicio = Date.now();
  filas.forEach(function (p) {
    if (!texto_(p['Nombre']) || !texto_(p['Dirección'])) return;
    if (buscadas >= (max || 1000) || Date.now() - inicio > 240000) return;
    var texto = textoMapa_(p);
    if (!texto) { noEncontradas.push(p['Nombre']); return; }
    if (!todas && ubicacionGuardada_(p, texto)) return;
    buscadas++;
    var g = null;
    try { g = geocodificar_(texto); } catch (e) { console.warn(e.message); return; }
    if (g) ubicadas++; else noEncontradas.push(p['Nombre']);
    actualizarFila_('personas', p, { 'Ubicación (mapa)': (g ? g.lat + ',' + g.lng + (g.exacta ? '' : ' ~') : 'No encontrada') + ' | ' + texto });
    Utilities.sleep(150);
  });
  return { ubicadas: ubicadas, noEncontradas: noEncontradas, buscadas: buscadas };
}

/** Datos para abrir el mapa desde la app: { lat, lng } si se ubicó; si no, el texto limpio para buscar. */
function mapaDePersona_(p) {
  var texto = textoMapa_(p);
  var u = texto ? ubicacionGuardada_(p, texto) : null;
  return { lat: u && u.lat !== '' ? u.lat : null, lng: u && u.lng !== '' ? u.lng : null, texto: texto };
}

/** Menú ▸ Ubicar direcciones en el mapa. */
function menuUbicarDirecciones() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.alert('Ubicar direcciones en el mapa', '¿Volver a ubicar también las que ya están ubicadas?\n\n(No = solo las nuevas o las que cambiaron)', ui.ButtonSet.YES_NO_CANCEL);
  if (resp === ui.Button.CANCEL || resp === ui.Button.CLOSE) return;
  var r = ubicarDirecciones_(1000, resp === ui.Button.YES);
  limpiarCache_();
  registrar_('Direcciones ubicadas', r.ubicadas + ' ubicadas, ' + r.noEncontradas.length + ' sin ubicar');
  ui.alert('Listo', r.buscadas + ' dirección(es) buscadas: ' + r.ubicadas + ' ubicadas.' +
    (r.noEncontradas.length ? '\n\nNo se pudieron ubicar (escribe en la columna "Dirección para el mapa" solo calle, número y comuna, y vuelve a ejecutar):\n' + r.noEncontradas.join('\n') : ''),
    ui.ButtonSet.OK);
}
