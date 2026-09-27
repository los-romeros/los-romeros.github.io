/**
 * Menú de la planilla y tareas de preparación (se usan una vez o muy de vez en cuando).
 */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Programas')
    .addItem('Sincronizar ahora', 'menuSincronizar')
    .addItem('Agregar al directorio los nombres de los programas', 'armarDirectorio')
    .addItem('Crear hoja de aseo (plantilla)', 'crearPlantillaAseo')
    .addSeparator()
    .addItem('Preparar planilla (pestañas y formatos)', 'prepararPlanilla')
    .addItem('Activar tareas automáticas', 'instalarTareas')
    .addItem('Ver dirección de la API', 'verUrlApi')
    .addToUi();
}

function menuSincronizar() {
  var n = sincronizar();
  SpreadsheetApp.getActive().toast(n ? n + ' periodo(s) nuevos o modificados.' : 'Sin cambios.', 'Sincronización', 5);
}

var INICIO_POR_DEFECTO = [
  ['congregacion', 'Congregación Los Romeros · Concón', 'Nombre que aparece arriba en la app'],
  ['mensaje', 'Bienvenidos. Aquí encontrarás los programas y asignaciones de la congregación.', 'Texto de bienvenida de la pantalla de inicio'],
  ['aviso', '', 'Aviso destacado (opcional). Déjalo vacío para no mostrar nada'],
  ['direccion', 'Jardín Poniente 795, Concón', 'Dirección del Salón del Reino'],
  ['horaEntreSemana', '19:30', 'Hora por defecto de la reunión de entre semana'],
  ['horaFinSemana', '18:30', 'Hora por defecto de la reunión del fin de semana'],
  ['duracionMin', '105', 'Duración de los eventos de reunión en el calendario (minutos)'],
  ['diasPasados', '7', 'Días hacia atrás que muestra la app'],
  ['diasFuturos', '120', 'Días hacia adelante que muestra la app'],
  ['urlApp', '', 'Dirección de la app publicada (se usa en los correos)'],
  ['remitente', 'Programas Los Romeros', 'Nombre que aparece como remitente de los correos'],
  ['correosActivos', 'No', 'Sí = se envían correos automáticos. Déjalo en No mientras se prueba'],
  ['googleClientId', '', 'ID de cliente de Google para el acceso con privilegios (fase 3)']
];

var PROGRAMAS_POR_DEFECTO = [
  ['vmc', 'Reunión de entre semana', 'vmc', '', '', 'Sí', 'Sí', 1, 'libro', 'Vida y Ministerio Cristianos'],
  ['finsemana', 'Reunión del fin de semana', 'finsemana', '', '', 'Sí', 'Sí', 2, 'atril', 'Reunión pública, La Atalaya, hospitalidad y oradores que salen'],
  ['acomodacion', 'Acomodación y audio/video', 'acomodacion', '', '', 'Sí', 'Sí', 3, 'audio', 'Acomodadores, micrófonos, plataforma, audio y video'],
  ['predicacion', 'Predicación', 'predicacion', '', '', 'No', 'Sí', 4, 'mapa', 'Reuniones para el servicio del campo'],
  ['aseo', 'Aseo', 'aseo', '', '', 'No', 'Sí', 5, 'escoba', 'Limpieza del Salón después de cada reunión']
];

/** Crea las pestañas que falten, con títulos, anchos, formatos y listas desplegables. Es seguro repetirlo. */
function prepararPlanilla() {
  var ss = planilla_();
  PropertiesService.getScriptProperties().setProperty('PLANILLA_ID', ss.getId());
  Object.keys(HOJAS).forEach(function (clave) {
    var def = HOJAS[clave];
    var sh = ss.getSheetByName(def.nombre);
    if (!sh) sh = ss.insertSheet(def.nombre);
    var actuales = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
    def.titulos.forEach(function (t) {
      if (actuales.indexOf(t) < 0) {
        sh.getRange(1, actuales.filter(String).length + 1).setValue(t);
        actuales = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      }
    });
    var n = def.titulos.length;
    sh.getRange(1, 1, 1, n).setFontWeight('bold').setBackground(def.sistema ? '#e8eaed' : '#1a4d8f').setFontColor(def.sistema ? '#3c4043' : '#ffffff');
    sh.setFrozenRows(1);
    (def.anchos || []).forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
    if (def.sistema) sh.setTabColor('#9aa0a6');
  });

  var hojaDefecto = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1') || ss.getSheetByName('Hoja1');
  if (hojaDefecto && hojaDefecto.getLastRow() === 0) ss.deleteSheet(hojaDefecto);

  // Contenido inicial
  if (hoja_('inicio').getLastRow() < 2) {
    hoja_('inicio').getRange(2, 1, INICIO_POR_DEFECTO.length, 3).setValues(INICIO_POR_DEFECTO);
  } else {
    var claves = leerTabla_('inicio').map(function (f) { return f['Clave']; });
    var faltan = INICIO_POR_DEFECTO.filter(function (f) { return claves.indexOf(f[0]) < 0; });
    faltan.forEach(function (f) { agregarFilas_('inicio', [{ 'Clave': f[0], 'Valor': f[1], 'Descripción': f[2] }]); });
  }
  if (hoja_('programas').getLastRow() < 2) {
    hoja_('programas').getRange(2, 1, PROGRAMAS_POR_DEFECTO.length, PROGRAMAS_POR_DEFECTO[0].length).setValues(PROGRAMAS_POR_DEFECTO);
  }
  if (hoja_('grupos').getLastRow() < 2) {
    hoja_('grupos').getRange(2, 1, 9, 1).setValues([[1], [2], [3], [4], [5], [6], [7], [8], [9]]);
  }

  // Columnas que deben quedar como texto (fechas ISO, horas, periodos tipo "sept 26")
  textoPlano_('inicio', ['Valor']);
  textoPlano_('periodos', ['Periodo', 'Primera fecha', 'Última fecha']);
  textoPlano_('asignaciones', ['Clave', 'Periodo', 'Fecha', 'Hora']);
  textoPlano_('datos', ['Periodo', 'JSON']);
  textoPlano_('especiales', ['Hora']);

  // Listas desplegables
  lista_('programas', 'Requiere confirmación', ['Sí', 'No']);
  lista_('programas', 'Visible', ['Sí', 'No']);
  lista_('programas', 'Lector', Object.keys(LECTORES));
  lista_('usuarios', 'Rol', ['admin', 'editor']);
  lista_('enlaces', 'Visibilidad', ['público', 'privilegiado']);
  lista_('periodos', 'Estado', ['Borrador', 'Aprobado']);
  lista_('asignaciones', 'Estado', ESTADOS);

  hoja_('datos').getRange('C:C').setWrap(false);
  hoja_('inicio').getRange('B:C').setWrap(true);
  ss.setActiveSheet(hoja_('inicio'));
  SpreadsheetApp.getActive().toast('Planilla lista.', 'Programas', 5);
}

function columna_(clave, titulo) {
  var sh = hoja_(clave);
  var c = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].indexOf(titulo);
  return c < 0 ? null : sh.getRange(2, c + 1, sh.getMaxRows() - 1, 1);
}

function textoPlano_(clave, titulos) {
  titulos.forEach(function (t) { var r = columna_(clave, t); if (r) r.setNumberFormat('@'); });
}

function lista_(clave, titulo, valores) {
  var r = columna_(clave, titulo);
  if (r) r.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(valores, true).setAllowInvalid(false).build());
}

/** Agrega a Personas los nombres que aparecen en los programas y aún no están en el directorio. */
function armarDirectorio() {
  var programas = leerTabla_('programas').filter(function (p) { return LECTORES[p['Lector']] && String(p['Hoja de origen (URL)']).indexOf('http') === 0; });
  var nombres = [];
  var desde = sumarDias_(hoyISO_(), -120);
  programas.forEach(function (prog) {
    var ss;
    try { ss = SpreadsheetApp.openByUrl(prog['Hoja de origen (URL)']); } catch (e) { return; }
    ss.getSheets().forEach(function (sh) {
      if (sh.isSheetHidden()) return;
      var rango = sh.getDataRange();
      var res = LECTORES[prog['Lector']]({ name: sh.getName(), values: rango.getValues(), display: rango.getDisplayValues() });
      res.reuniones.forEach(function (r) {
        if (r.fecha < desde) return;
        r.secciones.forEach(function (s) { s.filas.forEach(function (f) { f.asignados.forEach(function (a) {
          if (!a.externo && !a.grupo) nombres.push(a.nombre);
        }); }); });
      });
    });
  });

  var dir = directorio_();
  var nuevos = agruparNombres_(nombres).filter(function (g) {
    return !reconocer_(g.nombre, dir) && !dir.indice.exactos[tokens_(g.nombre).join(' ')];
  });
  agregarFilas_('personas', nuevos.map(function (g) {
    return {
      'Nombre': g.nombre,
      'Otras formas de escribirlo (separadas por ;)': g.alias.join('; '),
      'Nombre público': nombrePublico_(g.nombre),
      'Notas': g.dudoso ? 'Revisar: puede ser más de una persona' : ''
    };
  }));
  var sh = hoja_('personas');
  if (sh.getLastRow() > 2) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).sort(1);
  SpreadsheetApp.getActive().toast(nuevos.length + ' persona(s) agregadas. Completa sus correos.', 'Directorio', 8);
}

/** Crea (una sola vez) la tarea que sincroniza cada 15 minutos. */
function instalarTareas() {
  var existentes = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  if (existentes.indexOf('sincronizar') < 0) ScriptApp.newTrigger('sincronizar').timeBased().everyMinutes(15).create();
  SpreadsheetApp.getActive().toast('Tareas automáticas activas.', 'Programas', 5);
}

function verUrlApi() {
  var url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().alert(url ? 'Dirección de la API:\n\n' + url : 'Aún no hay una implementación web publicada.');
}

/**
 * Crea la hoja de Aseo (una pestaña por año: Fecha | Grupo | Encargado | Auxiliar) y la deja enlazada en Programas.
 * Rellena todas las reuniones del año (jueves y sábado) con los grupos rotando en orden; el responsable solo ajusta.
 */
function crearPlantillaAseo() {
  var anio = +hoyISO_().slice(0, 4);
  var ss = SpreadsheetApp.create('Aseo · Programa');
  var sh = ss.getSheets()[0];
  sh.setName(String(anio));
  llenarAnioAseo_(sh, anio, 1);
  var prog = leerTabla_('programas').filter(function (x) { return x['ID'] === 'aseo'; })[0];
  if (prog) actualizarFila_('programas', prog, { 'Hoja de origen (URL)': ss.getUrl() });
  SpreadsheetApp.getUi().alert('Hoja de aseo creada y enlazada:\n\n' + ss.getUrl() +
    '\n\nYa trae todas las reuniones de ' + anio + ' con los grupos en orden (1 al 9). Ajusta semanas de asamblea u otros cambios, y compártela con el responsable de aseo como Editor.');
}

function llenarAnioAseo_(sh, anio, grupoInicial) {
  var n = leerTabla_('grupos').length || 9;
  var filas = [], g = grupoInicial - 1;
  for (var d = new Date(anio, 0, 1); d.getFullYear() === anio; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 4 && d.getDay() !== 6) continue; // jueves y sábado
    filas.push([new Date(d), (g % n) + 1, '', '']);
    g++;
  }
  sh.getRange(1, 1, 1, 4).setValues([['Fecha', 'Grupo', 'Encargado', 'Auxiliar']])
    .setFontWeight('bold').setBackground('#1a4d8f').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.setColumnWidths(1, 4, 190);
  sh.getRange(2, 1, filas.length, 4).setValues(filas);
  sh.getRange(2, 1, filas.length, 1).setNumberFormat('dddd d "de" mmmm yyyy');
  sh.getRange('F1').setValue('Encargado y Auxiliar son opcionales: si quedan vacíos, el aviso va al superintendente del grupo (pestaña Grupos de la planilla central). Para el año siguiente, duplica la pestaña y cámbiale el nombre.');
}
