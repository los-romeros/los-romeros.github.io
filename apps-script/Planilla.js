/**
 * Estructura de la planilla central y utilidades para leerla/escribirla como tablas.
 * La primera fila de cada pestaña son los títulos; el código usa esos títulos, no las columnas,
 * así que se pueden reordenar columnas sin romper nada.
 */

var HOJAS = {
  inicio: {
    nombre: 'Inicio',
    titulos: ['Clave', 'Valor', 'Descripción'],
    anchos: [180, 420, 380]
  },
  programas: {
    nombre: 'Programas',
    titulos: ['ID', 'Nombre', 'Lector', 'Hoja de origen (URL)', 'Responsable (correo)', 'Requiere confirmación', 'Visible', 'Orden', 'Ícono', 'Descripción'],
    anchos: [110, 230, 110, 320, 220, 150, 80, 60, 70, 300]
  },
  personas: {
    nombre: 'Personas',
    titulos: ['Nombre', 'Otras formas de escribirlo (separadas por ;)', 'Nombre público', 'Correo', 'Teléfono (WhatsApp)', 'Grupo', 'Notas'],
    anchos: [220, 260, 160, 240, 150, 70, 240]
  },
  grupos: {
    nombre: 'Grupos',
    titulos: ['Grupo', 'Superintendente', 'Auxiliar'],
    anchos: [80, 220, 220]
  },
  usuarios: {
    nombre: 'Usuarios',
    titulos: ['Correo', 'Nombre', 'Rol', 'Programas'],
    anchos: [260, 200, 110, 260]
  },
  enlaces: {
    nombre: 'Enlaces',
    titulos: ['Título', 'URL', 'Descripción', 'Visibilidad', 'Orden'],
    anchos: [220, 320, 300, 120, 60]
  },
  especiales: {
    nombre: 'Fechas especiales',
    titulos: ['Fecha', 'Hora', 'Nota'],
    anchos: [110, 80, 380]
  },
  periodos: {
    nombre: 'Periodos',
    titulos: ['Programa', 'Periodo', 'Estado', 'Primera fecha', 'Última fecha', 'Huella', 'Detectado', 'Actualizado', 'Aprobado por', 'Aprobado el', 'Avisos'],
    anchos: [110, 220, 100, 100, 100, 90, 140, 140, 200, 140, 380],
    sistema: true
  },
  asignaciones: {
    nombre: 'Asignaciones',
    titulos: ['Clave', 'Programa', 'Periodo', 'Fecha', 'Hora', 'Reunión', 'Parte', 'Rol', 'Nombre en programa', 'Nombre', 'Reconocido', 'Correo', 'Estado', 'Respuesta calendario', 'ID evento', 'Invitado el', 'Recordatorio el', 'Rechazo avisado el', 'Actualizado'],
    anchos: [260, 100, 160, 90, 60, 200, 260, 170, 170, 170, 90, 200, 100, 120, 160, 130, 130, 130, 130],
    sistema: true
  },
  datos: {
    nombre: 'Datos',
    titulos: ['Programa', 'Periodo', 'JSON'],
    anchos: [110, 200, 600],
    sistema: true
  },
  registro: {
    nombre: 'Registro',
    titulos: ['Fecha', 'Evento', 'Detalle'],
    anchos: [150, 200, 600],
    sistema: true
  }
};

var ESTADOS = ['Borrador', 'Pendiente', 'Confirmado', 'Rechazado', 'Sin confirmación', 'Avisar manualmente', 'Eliminada'];

function planilla_() {
  return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('PLANILLA_ID'));
}

function hoja_(clave) {
  var def = HOJAS[clave];
  var sh = planilla_().getSheetByName(def.nombre);
  if (!sh) throw new Error('Falta la pestaña "' + def.nombre + '". Usa el menú Programas ▸ Preparar planilla.');
  return sh;
}

/** Lee una pestaña como lista de objetos { titulo: valor, _fila: n }. */
function leerTabla_(clave, opciones) {
  var sh = hoja_(clave);
  var rango = sh.getDataRange();
  var valores = rango.getValues();
  var mostrados = opciones && opciones.mostrados ? rango.getDisplayValues() : null;
  var titulos = valores.shift() || [];
  if (mostrados) mostrados.shift();
  var filas = [];
  valores.forEach(function (fila, i) {
    if (fila.every(function (v) { return v === '' || v === null; })) return;
    var o = { _fila: i + 2 };
    titulos.forEach(function (t, c) {
      if (t) o[t] = mostrados ? mostrados[i][c] : fila[c];
    });
    filas.push(o);
  });
  return filas;
}

/** Escribe objetos al final de la tabla respetando el orden de los títulos. */
function agregarFilas_(clave, objetos) {
  if (!objetos.length) return;
  var sh = hoja_(clave);
  var titulos = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var filas = objetos.map(function (o) { return titulos.map(function (t) { return o[t] === undefined ? '' : o[t]; }); });
  sh.getRange(sh.getLastRow() + 1, 1, filas.length, titulos.length).setValues(filas);
}

/** Actualiza campos de una fila ya leída con leerTabla_. */
function actualizarFila_(clave, obj, cambios) {
  var sh = hoja_(clave);
  var titulos = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  for (var k in cambios) {
    var c = titulos.indexOf(k);
    if (c < 0) continue;
    sh.getRange(obj._fila, c + 1).setValue(cambios[k]);
    obj[k] = cambios[k];
  }
}

/** Reemplaza todo el contenido (menos títulos) de una tabla. */
function reescribirTabla_(clave, objetos) {
  var sh = hoja_(clave);
  var titulos = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, titulos.length).clearContent();
  if (!objetos.length) return;
  var filas = objetos.map(function (o) { return titulos.map(function (t) { return o[t] === undefined ? '' : o[t]; }); });
  sh.getRange(2, 1, filas.length, titulos.length).setValues(filas);
}

function config_() {
  var c = {};
  leerTabla_('inicio').forEach(function (f) { c[f['Clave']] = f['Valor']; });
  return c;
}

function registrar_(evento, detalle) {
  try {
    agregarFilas_('registro', [{ 'Fecha': new Date(), 'Evento': evento, 'Detalle': String(detalle || '').slice(0, 45000) }]);
  } catch (e) {
    console.error(e);
  }
}

function si_(v) {
  return /^(s[ií]|x|true|1)$/i.test(String(v).trim());
}

function hoyISO_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
