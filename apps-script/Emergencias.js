/**
 * Contactos de emergencia de los publicadores (desde la pestaña Personas).
 *
 * - En la app: ancianos y secretario ven a todos (Inicio ▸ emergenciasVen);
 *   el superintendente y el auxiliar de cada grupo ven solo su grupo.
 * - Planilla "Contactos de emergencia" para imprimir: se actualiza sola cada día (y al abrir la sección)
 *   y se comparte, solo para ver, con quienes ven a todos.
 */

/** 'todos', una lista de grupos, o [] si no tiene acceso. */
function alcanceEmergencias_(yo, cfg) {
  if (yo.rol === 'admin' || enAudiencia_(cfg.emergenciasVen || 'anciano, secretario', yo) && String(cfg.emergenciasVen || 'anciano, secretario').trim()) return 'todos';
  var out = [];
  leerTabla_('grupos').forEach(function (g) {
    if (norm_(g['Superintendente']) === norm_(yo.nombre) || norm_(g['Auxiliar']) === norm_(yo.nombre)) out.push(+g['Grupo']);
  });
  return out;
}

function listaEmergencias_() {
  return leerTabla_('personas').filter(function (p) { return texto_(p['Nombre']); }).map(function (p) {
    return {
      nombre: texto_(p['Nombre']), grupo: +p['Grupo'] || null,
      telefono: String(p['Teléfono (WhatsApp)'] || ''), direccion: texto_(p['Dirección']), confirmadosEl: datosConfirmadosEl_(p),
      mapa: mapaDePersona_(p), mapaContacto: limpiarDireccion_(p['Emergencia: dirección']),
      contacto: { nombre: texto_(p['Emergencia: nombre']), parentesco: texto_(p['Emergencia: parentesco']),
        direccion: texto_(p['Emergencia: dirección']), telefono: String(p['Emergencia: teléfono'] || '') }
    };
  }).sort(function (a, b) { return ((a.grupo || 99) - (b.grupo || 99)) || a.nombre.localeCompare(b.nombre, 'es'); });
}

/** Acción "emergencias". */
function emergencias_(yo, cfg) {
  var alcance = alcanceEmergencias_(yo, cfg);
  if (alcance !== 'todos' && !alcance.length) throw new Error('No tienes acceso a los contactos de emergencia.');
  var lista = listaEmergencias_().filter(function (x) { return alcance === 'todos' || alcance.indexOf(x.grupo) >= 0; });
  var url = '';
  if (alcance === 'todos') {
    try {
      var cache = CacheService.getScriptCache();
      var ss = planillaEmergencias_(cfg, !cache.get('emergencias-al-dia'));
      cache.put('emergencias-al-dia', '1', 3600);
      url = ss.getUrl();
    } catch (e) { console.warn(e); }
  }
  registrar_('Contactos de emergencia consultados', yo.nombre + (alcance === 'todos' ? '' : ' · grupo ' + alcance.join(', ')));
  return { ok: true, todos: alcance === 'todos', grupos: alcance === 'todos' ? [] : alcance, lista: lista, url: url };
}

/** Planilla para imprimir. Con `actualizar`, rehace la tabla desde Personas. */
function planillaEmergencias_(cfg, actualizar) {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('EMERGENCIAS_ID'), ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create('Contactos de emergencia');
    props.setProperty('EMERGENCIAS_ID', ss.getId());
    actualizar = true;
    registrar_('Planilla de contactos de emergencia creada', ss.getUrl());
  }
  if (actualizar) {
    var sh = ss.getSheets()[0];
    sh.setName('Contactos');
    sh.clear();
    var titulos = ['Grupo', 'Nombre', 'Teléfono', 'Dirección', 'Contacto de emergencia', 'Parentesco', 'Teléfono del contacto', 'Dirección del contacto', 'Confirmado el'];
    var filas = listaEmergencias_().map(function (x) {
      return [x.grupo || '', x.nombre, x.telefono, x.direccion, x.contacto.nombre, x.contacto.parentesco, x.contacto.telefono, x.contacto.direccion, x.confirmadosEl || 'Sin confirmar'];
    });
    sh.getRange(1, 1, 1, titulos.length).setValues([titulos]).setFontWeight('bold').setBackground('#5e8499').setFontColor('#ffffff').setWrap(true);
    sh.getRange(2, 3, Math.max(filas.length, 1), 1).setNumberFormat('@');
    sh.getRange(2, 7, Math.max(filas.length, 1), 1).setNumberFormat('@');
    if (filas.length) sh.getRange(2, 1, filas.length, titulos.length).setValues(filas).setVerticalAlignment('top').setWrap(true);
    sh.setFrozenRows(1);
    [55, 190, 110, 230, 170, 110, 120, 230, 100].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
    // Separación visual entre grupos y en rojo quien no tiene contacto de emergencia
    var reglas = [
      SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($B2<>"",$E2="")').setBackground('#f6e3df')
        .setRanges([sh.getRange(2, 1, Math.max(filas.length, 1), titulos.length)]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=ISODD($A2)').setBackground('#f3f6f8')
        .setRanges([sh.getRange(2, 1, Math.max(filas.length, 1), titulos.length)]).build()
    ];
    sh.setConditionalFormatRules(reglas);
    sh.getRange(filas.length + 3, 1).setValue('Actualizado el ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy HH:mm') +
      ' desde el directorio de la congregación. En rojo: sin contacto de emergencia.').setFontSize(9).setFontColor('#666666');
  }
  // Compartir solo para ver con quienes ven a todos (una vez por correo)
  var hechos = {};
  try { hechos = JSON.parse(props.getProperty('EMERGENCIAS_COMPARTIDA') || '{}'); } catch (e) { hechos = {}; }
  var nuevos = correosEnAudiencia_(cfg.emergenciasVen || 'anciano, secretario').filter(function (c) { return !hechos[c]; });
  nuevos.forEach(function (c) { try { ss.addViewer(c); hechos[c] = hoyISO_(); } catch (e) { console.warn(e.message); } });
  if (nuevos.length) props.setProperty('EMERGENCIAS_COMPARTIDA', JSON.stringify(hechos));
  return ss;
}
