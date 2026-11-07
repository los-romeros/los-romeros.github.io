/**
 * Configuración y permisos desde la app (acción "config").
 *
 * - Admin: todas las claves de Inicio (por secciones), los permisos de cada programa y los encargados de cada grupo.
 * - Encargado de un programa (responsable o editor asignado en Usuarios): "Pueden editar" y "Pueden confirmar" de su programa.
 *   Quien edita solo porque figura en "Pueden editar" no puede dar permisos a otros.
 * - Superintendente y auxiliar de grupo: Grupos ▸ "Pueden ver informes" de su grupo.
 * Todo se escribe en la planilla central y queda en Registro.
 */

var SECCIONES_CONFIG = [
  ['General', ['congregacion', 'mensaje', 'aviso', 'avisosPublican', 'direccion', 'comoLlegar', 'urlApp', 'diasPasados', 'diasFuturos', 'diasParaAprobar']],
  ['Reuniones', ['horaEntreSemana', 'horaFinSemana', 'duracionMin', 'conductorAtalaya', 'zoomEntreSemana', 'zoomFinSemana']],
  ['Avisos y notificaciones', ['notificacionesActivas', 'silencioDesde', 'silencioHasta', 'avisoDiaAntes', 'horaAvisoDiaAntes', 'avisoRecordarDias', 'horaRecordatorioAvisos', 'invitacionesActivas', 'soloEstosCorreos']],
  ['Informes', ['informesVen', 'informesDesde', 'informeEditableHasta', 'diasRecordatorioInforme', 'horaRecordatorioInforme', 'diasRecordatorioInformeGrupo', 'mesesActivo', 'informesFormularios']],
  ['Asistencia y formularios', ['asistenciaVen', 'asistenciaRegistran', 'congregacionNombre', 'ciudad', 'provincia', 'numeroCongregacion']],
  ['Predicación y territorios', ['zoomPredicacion', 'horaPredicacionPorDefecto', 'registroPredicacion', 'territoriosVisiblePara', 'registrosPendientesVer', 's13Ven', 's13Planilla', 's13Desde', 'carpetaTerritorios', 'archivoMapa', 'mapaVisiblePara', 'archivoNoPasar', 'noPasarVisiblePara', 'noPasarSolicitan', 'noPasarAprueban']],
  ['Datos personales y emergencias', ['fechaConfirmarDatos', 'emergenciasVen', 'datosAprueban']],
  ['Técnico (cambiar con cuidado)', ['googleClientId', 'firebaseProyecto']]
];

var CAMPOS_PROGRAMA_ADMIN = ['Responsable (correo)', 'Visible', 'Visible para', 'Estados visibles para', 'Requiere confirmación', 'Pueden editar', 'Pueden confirmar'];
var CAMPOS_PROGRAMA_ENCARGADO = ['Pueden editar', 'Pueden confirmar'];
var CAMPOS_GRUPO_ADMIN = ['Superintendente', 'Auxiliar', 'Pueden ver informes'];
var CAMPOS_GRUPO_ENCARGADO = ['Pueden ver informes'];

/** ¿Es encargado del programa? (responsable o editor asignado en Usuarios; no basta "Pueden editar") */
function encargadoPrograma_(yo, prog, usuario) {
  if (yo.rol === 'admin') return true;
  if (String(prog['Responsable (correo)']).trim().toLowerCase() === yo.correo) return true;
  if (!usuario || String(usuario['Rol']).toLowerCase() !== 'editor') return false;
  var lista = String(usuario['Programas'] || '').toLowerCase();
  return /todos/.test(lista) || lista.split(/[,;\s]+/).indexOf(String(prog['ID']).toLowerCase()) >= 0;
}

function encargadoGrupo_(yo, g) {
  return yo.rol === 'admin' || (!!yo.nombre && (norm_(g['Superintendente']) === norm_(yo.nombre) || norm_(g['Auxiliar']) === norm_(yo.nombre)));
}

function usuarioDe_(yo) {
  return leerTabla_('usuarios').filter(function (u) { return String(u['Correo']).trim().toLowerCase() === yo.correo; })[0];
}

/** Para la pantalla de inicio: { admin, permisos } */
function accesoConfig_(yo) {
  if (yo.rol === 'admin') return { admin: true, permisos: true };
  var u = usuarioDe_(yo);
  var prog = leerTabla_('programas').some(function (p) { return encargadoPrograma_(yo, p, u); });
  var grupo = leerTabla_('grupos').some(function (g) { return encargadoGrupo_(yo, g); });
  return { admin: false, permisos: prog || grupo };
}

function configuracion_(yo, p, cfg) {
  var admin = yo.rol === 'admin';
  var u = usuarioDe_(yo);
  var op = String(p.op || 'leer');

  if (op === 'clave') {
    if (!admin) throw new Error('Solo el administrador cambia la configuración.');
    var clave = String(p.clave || '');
    var valor = String(p.valor == null ? '' : p.valor).slice(0, 2000);
    var filas = leerTabla_('inicio');
    var fila = filas.filter(function (f) { return f['Clave'] === clave; })[0];
    var def = INICIO_POR_DEFECTO.filter(function (f) { return f[0] === clave; })[0];
    if (!fila && !def) throw new Error('Esa clave no existe.');
    if (fila) {
      var antes = String(fila['Valor']);
      actualizarFila_('inicio', fila, { 'Valor': valor });
      registrar_('Configuración cambiada en la app', yo.nombre + ': ' + clave + ' = "' + valor.slice(0, 200) + '" (antes "' + antes.slice(0, 200) + '")');
    } else {
      agregarFilas_('inicio', [{ 'Clave': clave, 'Valor': valor, 'Descripción': def[2] }]);
      registrar_('Configuración cambiada en la app', yo.nombre + ': ' + clave + ' = "' + valor.slice(0, 200) + '" (clave nueva)');
    }
    return { ok: true };
  }

  if (op === 'programa') {
    var prog = leerTabla_('programas').filter(function (x) { return x['ID'] === p.id; })[0];
    if (!prog) throw new Error('No encontré ese programa.');
    if (!encargadoPrograma_(yo, prog, u)) throw new Error('No eres encargado de este programa.');
    var campos = admin ? CAMPOS_PROGRAMA_ADMIN : CAMPOS_PROGRAMA_ENCARGADO;
    if (campos.indexOf(p.campo) < 0) throw new Error('No puedes cambiar ese dato.');
    asegurarColumnas_('programas');
    var v = texto_(p.valor || '').slice(0, 1000);
    var antesP = String(prog[p.campo] || '');
    actualizarFila_('programas', prog, (function () { var o = {}; o[p.campo] = v; return o; })());
    registrar_('Permisos cambiados en la app', yo.nombre + ' · ' + prog['Nombre'] + ' ▸ ' + p.campo + ' = "' + v + '" (antes "' + antesP + '")');
    return { ok: true };
  }

  if (op === 'grupo') {
    var g = leerTabla_('grupos').filter(function (x) { return +x['Grupo'] === +p.grupo; })[0];
    if (!g) throw new Error('No encontré ese grupo.');
    if (!encargadoGrupo_(yo, g)) throw new Error('Solo el superintendente o el auxiliar del grupo cambian sus permisos.');
    var camposG = admin ? CAMPOS_GRUPO_ADMIN : CAMPOS_GRUPO_ENCARGADO;
    if (camposG.indexOf(p.campo) < 0) throw new Error('No puedes cambiar ese dato.');
    asegurarColumnas_('grupos');
    var vg = texto_(p.valor || '').slice(0, 1000);
    var antesG = String(g[p.campo] || '');
    actualizarFila_('grupos', g, (function () { var o = {}; o[p.campo] = vg; return o; })());
    registrar_('Permisos cambiados en la app', yo.nombre + ' · Grupo ' + g['Grupo'] + ' ▸ ' + p.campo + ' = "' + vg + '" (antes "' + antesG + '")');
    return { ok: true };
  }

  // Leer
  var out = { ok: true, admin: admin };
  if (admin) {
    var valores = {}, descr = {};
    leerTabla_('inicio').forEach(function (f) { valores[f['Clave']] = String(f['Valor'] == null ? '' : f['Valor']); descr[f['Clave']] = String(f['Descripción'] || ''); });
    INICIO_POR_DEFECTO.forEach(function (f) { if (!(f[0] in valores)) { valores[f[0]] = String(f[1]); descr[f[0]] = f[2] + ' (aún no está en la planilla: se agrega al guardar)'; } });
    var usadas = {};
    out.secciones = SECCIONES_CONFIG.map(function (s) {
      return { titulo: s[0], claves: s[1].filter(function (k) { return k in valores; }).map(function (k) { usadas[k] = true; return { clave: k, valor: valores[k], descripcion: descr[k] }; }) };
    });
    var otras = Object.keys(valores).filter(function (k) { return k && !usadas[k]; });
    if (otras.length) out.secciones.push({ titulo: 'Otras', claves: otras.map(function (k) { return { clave: k, valor: valores[k], descripcion: descr[k] }; }) });
    out.urlPlanilla = planilla_().getUrl();
  }
  out.programas = leerTabla_('programas').filter(function (x) { return x['ID'] && encargadoPrograma_(yo, x, u); }).map(function (x) {
    var o = { id: x['ID'], nombre: x['Nombre'], campos: {} };
    (admin ? CAMPOS_PROGRAMA_ADMIN : CAMPOS_PROGRAMA_ENCARGADO).forEach(function (c) { o.campos[c] = String(x[c] == null ? '' : x[c]); });
    return o;
  });
  out.grupos = leerTabla_('grupos').filter(function (g) { return +g['Grupo'] && encargadoGrupo_(yo, g); }).map(function (g) {
    var o = { grupo: +g['Grupo'], superintendente: String(g['Superintendente'] || ''), auxiliar: String(g['Auxiliar'] || ''), campos: {} };
    (admin ? CAMPOS_GRUPO_ADMIN : CAMPOS_GRUPO_ENCARGADO).forEach(function (c) { o.campos[c] = String(g[c] == null ? '' : g[c]); });
    return o;
  });
  out.personas = leerTabla_('personas').map(function (x) { return x['Nombre']; }).filter(Boolean).sort(function (a, b) { return a.localeCompare(b, 'es'); });
  out.perfiles = PERFILES.map(function (x) { return x.id; }).concat(['todos', 'privilegiados', 'admin', 'editor']);
  return out;
}
