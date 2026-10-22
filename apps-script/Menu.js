/**
 * Menú de la planilla y tareas de preparación (se usan una vez o muy de vez en cuando).
 */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Programas')
    .addItem('Sincronizar ahora', 'menuSincronizar')
    .addItem('Revisar respuestas y recordatorios ahora', 'menuTareasHorarias')
    .addItem('Agregar al directorio los nombres de los programas', 'armarDirectorio')
    .addItem('Crear hoja de aseo (plantilla)', 'crearPlantillaAseo')
    .addItem('Importar personas (grupo y servicio) desde una planilla', 'importarPersonas')
    .addItem('Reparar pestaña Personas (ordenar y unir duplicados)', 'repararPersonas')
    .addSeparator()
    .addItem('Reiniciar prueba de invitaciones', 'reiniciarPruebaInvitaciones')
    .addItem('Preparar planilla (pestañas y formatos)', 'prepararPlanilla')
    .addItem('Activar tareas automáticas', 'instalarTareas')
    .addItem('Ver dirección de la API', 'verUrlApi')
    .addToUi();
}

function menuTareasHorarias() {
  tareasHorarias();
  SpreadsheetApp.getActive().toast('Respuestas y recordatorios revisados. Mira la pestaña Registro.', 'Programas', 6);
}

function menuSincronizar() {
  var n = sincronizar(true);
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
  ['googleClientId', '', 'ID de cliente de Google (termina en .apps.googleusercontent.com)'],
  ['invitacionesActivas', 'No', 'Sí = se envían invitaciones de Google Calendar a los asignados con correo'],
  ['soloEstosCorreos', '', 'Modo prueba: si escribes correos aquí (separados por coma), solo ellos reciben invitaciones y correos'],
  ['notificacionesActivas', 'No', 'Sí = se envían notificaciones a los teléfonos que activaron los avisos'],
  ['firebaseProyecto', '', 'ID del proyecto de Firebase (se ve en Configuración del proyecto de Firebase)'],
  ['silencioDesde', '22', 'Hora desde la que no se envían notificaciones'],
  ['silencioHasta', '8', 'Hora hasta la que no se envían notificaciones'],
  ['avisoDiaAntes', 'Sí', 'Sí = correo la tarde anterior a cada asignación'],
  ['horaAvisoDiaAntes', '18', 'Hora (0-23) del aviso del día anterior'],
  ['resumenSemanal', 'Sí', 'Sí = cada lunes, correo con las asignaciones de la semana'],
  ['diasParaAprobar', '60', 'Un programa aparece en "Por aprobar" cuando empieza dentro de estos días'],
  ['comoLlegar', 'https://hub.jw.org/meetings/goto/entry-point/meetings?scope_kind=location&scope_id=bd526297-dfc2-5cc3-bc45-47ab953040c9&eventId=137ea843-c7f9-41b7-a363-25762f26f397', 'Enlace del botón "Cómo llegar" (vacío = Google Maps con la dirección)'],
  ['registroPredicacion', '', 'URL de la planilla "Registro Predicación (Respuestas)" (la que recibe el formulario de los capitanes)'],
  ['horaPredicacionPorDefecto', '10:30', 'Hora que se asume para salidas sin hora (p. ej. arreglo por grupos), para el aviso de registro'],
  ['informesFormularios', '', 'URLs de planillas de respuestas de formularios de informe que aún se usan (separadas por coma), p. ej. la del grupo 4'],
  ['diasRecordatorioInforme', '1,5,10', 'Días del mes en que se recuerda (notificación) a quien no ha enviado el informe'],
  ['horaRecordatorioInforme', '10', 'Hora (0-23) de ese recordatorio'],
  ['informesDesde', '2026-10', 'Primer mes cuyo informe se pide en la app (AAAA-MM). Los meses anteriores no se piden ni se recuerdan'],
  ['informeEditableHasta', '20', 'Día del mes hasta el que se puede corregir el informe del mes anterior'],
  ['carpetaTerritorios', 'TERRITORIOS LOS ROMEROS', 'Carpeta de Drive donde están el listado No pasar y el mapa'],
  ['archivoNoPasar', 'Listado no pasar', 'Inicio del nombre del listado No pasar (se usa el del año más reciente)'],
  ['archivoMapa', 'Territorio Los Romeros', 'Inicio del nombre del PDF del mapa (se usa el más reciente)'],
  ['noPasarVisiblePara', 'todos', 'Quiénes ven el listado No pasar'],
  ['noPasarSolicitan', 'capitan, anciano', 'Quiénes pueden solicitar agregar una dirección al listado No pasar'],
  ['noPasarAprueban', 'admin', 'Quiénes aprueban las solicitudes de No pasar (reciben el aviso)'],
  ['mapaVisiblePara', 'todos', 'Quiénes ven el mapa del territorio'],
  ['territoriosVisiblePara', 'anciano, capitan', 'Quiénes ven el resumen de territorios en la app'],
  ['zoomPredicacion', '', 'Enlace de Zoom de la predicación (se abre al tocar "Predicación por Zoom")'],
  ['zoomEntreSemana', '', 'Enlace de Zoom de la reunión de entre semana'],
  ['zoomFinSemana', '', 'Enlace de Zoom de la reunión del fin de semana (vacío = el mismo de entre semana)']
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
  if (hoja_('visibilidad').getLastRow() < 2) {
    hoja_('visibilidad').getRange(2, 1, 1, 4).setValues([['finsemana', 'Discursos que salen', 'anciano',
      'Elemento: "Discursos que salen", el nombre de una parte o rol (p. ej. "Hospitalidad"), o el título de una sección. Visible para: todos, anciano, participa, privilegiados, grupo 3 o correos, separados por coma.']]);
  }
  var progs = leerTabla_('programas');
  progs.forEach(function (p) {
    var cambios = {};
    if (!p['Visible para']) cambios['Visible para'] = p['ID'] === 'acomodacion' ? 'anciano, participa' : 'todos';
    if (!p['Estados visibles para']) cambios['Estados visibles para'] = p['ID'] === 'vmc' ? 'anciano' : 'privilegiados';
    if (Object.keys(cambios).length) actualizarFila_('programas', p, cambios);
  });
  if (hoja_('grupos').getLastRow() < 2) {
    hoja_('grupos').getRange(2, 1, 9, 1).setValues([[1], [2], [3], [4], [5], [6], [7], [8], [9]]);
  }

  // Columnas que deben quedar como texto (fechas ISO, horas, periodos tipo "sept 26")
  textoPlano_('inicio', ['Valor']);
  textoPlano_('periodos', ['Periodo', 'Primera fecha', 'Última fecha']);
  textoPlano_('asignaciones', ['Clave', 'Periodo', 'Fecha', 'Hora']);
  textoPlano_('datos', ['Periodo', 'JSON']);
  textoPlano_('especiales', ['Hora']);
  textoPlano_('personas', ['Teléfono (WhatsApp)']);

  // Listas desplegables
  lista_('programas', 'Requiere confirmación', ['Sí', 'No']);
  lista_('programas', 'Visible', ['Sí', 'No']);
  lista_('programas', 'Lector', Object.keys(LECTORES));
  lista_('usuarios', 'Rol', ['admin', 'editor']);
  lista_('avisos', 'Ícono', ['megafono', 'grupo', 'calendario', 'libro']);
  // Perfiles como casillas, y listas para "Visible para" (permiten escribir otras combinaciones)
  PERFILES.forEach(function (p) {
    var r = columna_('personas', p.columna);
    if (r) { r.insertCheckboxes(); hoja_('personas').getRange(1, r.getColumn()).setNote(p.descripcion); }
  });
  migrarPerfiles_();
  lista_('personas', 'Servicio', ['Publicador', 'Precursor Auxiliar', 'Precursor Regular']);
  [['programas', 'Visible para'], ['programas', 'Estados visibles para'], ['avisos', 'Visible para'], ['visibilidad', 'Visible para']].forEach(function (x) {
    var r = columna_(x[0], x[1]);
    if (r) r.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(OPCIONES_VISIBLE, true).setAllowInvalid(true)
      .setHelpText('Elige de la lista, o escribe otra combinación separada por coma (también "grupo 3" o correos).').build());
  });
  var vis = columna_('enlaces', 'Visibilidad');
  if (vis) vis.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['público'].concat(OPCIONES_VISIBLE), true).setAllowInvalid(true).build());
  hoja_('avisos').getRange('D2:D200').setNumberFormat('d/m/yyyy');
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
  asegurarTareas_();
  calendario_();
  SpreadsheetApp.getActive().toast('Tareas automáticas activas (cada 15 minutos y cada hora).', 'Programas', 5);
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

/** Pasa los perfiles escritos como texto en la antigua columna "Perfil" a las casillas nuevas. */
function migrarPerfiles_() {
  var sh = hoja_('personas');
  var titulos = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var cPerfil = titulos.indexOf('Perfil');
  if (cPerfil < 0) return;
  leerTabla_('personas').forEach(function (p) {
    var texto = norm_(p['Perfil']);
    if (!texto) return;
    var cambios = {};
    PERFILES.forEach(function (f) { if (texto.indexOf(f.id) >= 0) cambios[f.columna] = true; });
    actualizarFila_('personas', p, cambios);
  });
}

/**
 * Completa el directorio con una planilla de importación (columnas: Nombre | Formato original | Grupo | Servicio | Nombrado | Último mes informado).
 * Agrega a quienes faltan y completa Grupo, Servicio y la casilla Anciano solo donde están vacíos (no sobrescribe).
 */
function importarPersonas() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Importar personas', 'Pega el enlace de la planilla de importación:', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var origen = SpreadsheetApp.openByUrl(r.getResponseText().trim()).getSheets()[0].getDataRange().getValues();
  var tit = origen.shift().map(norm_);
  var c = function (t) { return tit.indexOf(norm_(t)); };
  var cNom = c('Nombre'), cOrig = c('Formato original'), cGrupo = c('Grupo'), cServ = c('Servicio'), cNombrado = c('Nombrado'), cMes = c('Último mes informado'),
    cTel = c('Teléfono'), cSec = c('Secretario');

  var dir = directorio_();
  var filas = leerTabla_('personas');
  var porNombre = {};
  filas.forEach(function (f) { porNombre[f['Nombre']] = f; });
  var nuevos = 0, completados = 0, distintos = [];
  origen.forEach(function (o) {
    var nombre = texto_(o[cNom]);
    if (!nombre) return;
    var p = reconocer_(nombre, dir) || (cOrig >= 0 ? reconocer_(nombreFormulario_(o[cOrig]), dir) : null) ||
      dir.personas.filter(function (x) { return mismaPersona_(x.nombre, nombre); })[0] || null;
    var grupo = o[cGrupo], servicio = texto_(o[cServ]), anciano = /anciano/i.test(o[cNombrado]), siervo = /siervo/i.test(o[cNombrado]);
    if (p && porNombre[p.nombre]) {
      var f = porNombre[p.nombre], cambio = false;
      if (!f['Grupo'] && grupo) { f['Grupo'] = grupo; cambio = true; }
      else if (f['Grupo'] && grupo && +f['Grupo'] !== +grupo) distintos.push(p.nombre + ' (planilla: ' + f['Grupo'] + ', registro: ' + grupo + ')');
      // Precursor regular es una condición estable: se marca aunque la celda ya tenga otro servicio
      if (servicio && (!f['Servicio'] || (/regular/i.test(servicio) && f['Servicio'] !== servicio))) { f['Servicio'] = servicio; cambio = true; }
      if (anciano && f['Anciano'] !== true) { f['Anciano'] = true; cambio = true; }
      if (siervo && !/siervo/i.test(f['Notas'])) { f['Notas'] = (f['Notas'] ? f['Notas'] + ' · ' : '') + 'Siervo ministerial'; cambio = true; }
      if (cTel >= 0 && o[cTel] && !f['Teléfono (WhatsApp)']) { f['Teléfono (WhatsApp)'] = String(o[cTel]); cambio = true; }
      if (cSec >= 0 && si_(o[cSec]) && f['Secretario'] !== true) { f['Secretario'] = true; cambio = true; }
      if (cambio) completados++;
    } else {
      var nuevo = {
        'Nombre': nombre, 'Nombre público': nombrePublico_(nombre), 'Grupo': grupo || '', 'Servicio': servicio,
        'Teléfono (WhatsApp)': cTel >= 0 && o[cTel] ? String(o[cTel]) : '',
        'Anciano': anciano, 'Participa': false, 'Capitán': false, 'Secretario': false,
        'Notas': (siervo ? 'Siervo ministerial · ' : '') + 'Agregado desde el registro de informes' + (cMes >= 0 && o[cMes] ? ' (último: ' + o[cMes] + ')' : '')
      };
      filas.push(nuevo);
      porNombre[nombre] = nuevo;
      dir.personas.push({ id: nombre, nombre: nombre, alias: [] });
      dir.indice = indicePersonas_(dir.personas);
      nuevos++;
    }
  });
  var sh = hoja_('personas');
  textoPlano_('personas', ['Teléfono (WhatsApp)']);
  var titulos = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  filas = filas.filter(function (f) { return texto_(f['Nombre']); })
    .sort(function (a, b) { return String(a['Nombre']).localeCompare(String(b['Nombre']), 'es'); });
  var datos = filas.map(function (o) { return titulos.map(function (t) { return o[t] === undefined ? '' : o[t]; }); });
  sh.getRange(2, 1, datos.length, titulos.length).setValues(datos);
  if (sh.getMaxRows() > datos.length + 1) sh.getRange(datos.length + 2, 1, sh.getMaxRows() - datos.length - 1, titulos.length).clearContent();
  limpiarCache_();
  registrar_('Personas importadas', nuevos + ' nuevas, ' + completados + ' completadas');
  ui.alert('Listo', nuevos + ' persona(s) agregadas y ' + completados + ' completadas (grupo, servicio o anciano).' +
    (distintos.length ? '\n\nEstas tienen un grupo distinto al del registro y NO se cambiaron:\n' + distintos.join('\n') : ''), ui.ButtonSet.OK);
}

/**
 * Deja la pestaña Personas ordenada y sin filas vacías, y une los duplicados que dejó la importación
 * (se conserva el nombre que ya existía y la otra forma de escribirlo pasa a "Otras formas").
 */
function repararPersonas() {
  var ui = SpreadsheetApp.getUi();
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var filas = leerTabla_('personas').filter(function (f) { return texto_(f['Nombre']); });
    var esNueva = function (f) { return /agregado desde el registro de informes/i.test(f['Notas']); };
    var unidos = [];
    var quedan = filas.filter(function (f) {
      if (!esNueva(f)) return true;
      var original = filas.filter(function (o) { return o !== f && !esNueva(o) && mismaPersona_(o['Nombre'], f['Nombre']); })[0];
      if (!original) return true;
      var alias = String(original['Otras formas de escribirlo (separadas por ;)'] || '');
      if (norm_(alias).indexOf(norm_(f['Nombre'])) < 0) original['Otras formas de escribirlo (separadas por ;)'] = (alias ? alias + '; ' : '') + f['Nombre'];
      ['Grupo', 'Servicio', 'Correo', 'Teléfono (WhatsApp)'].forEach(function (k) { if (!original[k] && f[k]) original[k] = f[k]; });
      PERFILES.forEach(function (pf) { if (f[pf.columna] === true) original[pf.columna] = true; });
      unidos.push(f['Nombre'] + ' → ' + original['Nombre']);
      return false;
    });
    quedan.sort(function (a, b) { return String(a['Nombre']).localeCompare(String(b['Nombre']), 'es'); });
    var sh = hoja_('personas');
    var titulos = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var datos = quedan.map(function (o) { return titulos.map(function (t) { return o[t] === undefined ? '' : o[t]; }); });
    // Primero se escriben los datos y después se limpian las filas sobrantes (nunca al revés)
    sh.getRange(2, 1, datos.length, titulos.length).setValues(datos);
    if (sh.getMaxRows() > datos.length + 1) sh.getRange(datos.length + 2, 1, sh.getMaxRows() - datos.length - 1, titulos.length).clearContent();
    PERFILES.forEach(function (pf) {
      var c = titulos.indexOf(pf.columna);
      if (c >= 0) sh.getRange(2, c + 1, datos.length, 1).insertCheckboxes();
    });
    // Restaurar las marcas (insertCheckboxes deja todo en FALSE)
    sh.getRange(2, 1, datos.length, titulos.length).setValues(datos);
    if (sh.getMaxRows() > datos.length + 50) sh.deleteRows(datos.length + 50, sh.getMaxRows() - datos.length - 49);
    limpiarCache_();
    registrar_('Personas reparadas', quedan.length + ' personas · unidos: ' + (unidos.join(', ') || 'ninguno'));
    ui.alert('Listo', 'Quedaron ' + quedan.length + ' personas, ordenadas desde la fila 2.' +
      (unidos.length ? '\n\nDuplicados unidos (se conservó el nombre existente):\n' + unidos.join('\n') : ''), ui.ButtonSet.OK);
  } finally {
    lock.releaseLock();
  }
}
