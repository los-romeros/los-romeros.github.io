/**
 * Inicio de sesión con Google y sesiones de larga duración.
 *
 * 1. La app obtiene un "ID token" de Google (botón Entrar con Google) y lo manda a accion=entrar.
 * 2. Aquí se verifica con Google, se busca a la persona por su correo y se entrega un token de
 *    sesión propio (firmado con HMAC), válido por DIAS_SESION, para no pedir login a cada rato.
 */

var DIAS_SESION = 180;

function secretoSesion_() {
  var props = PropertiesService.getScriptProperties();
  var s = props.getProperty('SECRETO_SESION');
  if (!s) {
    s = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('SECRETO_SESION', s);
  }
  return s;
}

function firmar_(texto) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(texto, secretoSesion_())).replace(/=+$/, '');
}

function crearSesion_(correo) {
  var payload = Utilities.base64EncodeWebSafe(JSON.stringify({ e: correo, x: Date.now() + DIAS_SESION * 864e5 })).replace(/=+$/, '');
  return payload + '.' + firmar_(payload);
}

/** Devuelve el correo de la sesión o null si el token no es válido o venció. */
function leerSesion_(token) {
  if (!token || String(token).indexOf('.') < 0) return null;
  var partes = String(token).split('.');
  if (firmar_(partes[0]) !== partes[1]) return null;
  try {
    var p = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(partes[0])).getDataAsString());
    return p.x > Date.now() ? String(p.e).toLowerCase() : null;
  } catch (e) {
    return null;
  }
}

/** Verifica el ID token de Google y devuelve el correo, o lanza un error legible. */
function verificarGoogle_(idToken, cfg) {
  var r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('No se pudo verificar la cuenta de Google. Intenta de nuevo.');
  var t = JSON.parse(r.getContentText());
  if (String(cfg.googleClientId || '').trim() && t.aud !== String(cfg.googleClientId).trim()) throw new Error('Credencial de Google no corresponde a esta app.');
  if (String(t.email_verified) !== 'true') throw new Error('La cuenta de Google no tiene el correo verificado.');
  return String(t.email).toLowerCase();
}

/**
 * Quién es el usuario: persona del directorio + permisos.
 * rol: 'admin' | 'editor' | 'lector' | '' (sin privilegios)
 * editables: IDs de programas que puede editar y aprobar.
 */
function perfil_(correo) {
  correo = String(correo || '').toLowerCase();
  var persona = leerTabla_('personas').filter(function (p) { return String(p['Correo']).trim().toLowerCase() === correo; })[0];
  var usuario = leerTabla_('usuarios').filter(function (u) { return String(u['Correo']).trim().toLowerCase() === correo; })[0];
  var programas = leerTabla_('programas');
  var rol = usuario ? String(usuario['Rol'] || 'lector').toLowerCase() : '';
  var listaUsuario = usuario ? String(usuario['Programas'] || '').toLowerCase() : '';
  var editables = [];
  programas.forEach(function (p) {
    var esResponsable = String(p['Responsable (correo)']).trim().toLowerCase() === correo;
    var asignado = rol === 'admin' || (rol === 'editor' && (/todos/.test(listaUsuario) || listaUsuario.split(/[,;\s]+/).indexOf(p['ID']) >= 0));
    if (esResponsable || asignado) editables.push(p['ID']);
  });
  if (!rol && editables.length) rol = 'editor';
  return {
    correo: correo,
    registrado: !!(persona || usuario),
    nombre: persona ? persona['Nombre'] : usuario ? usuario['Nombre'] || correo : correo,
    grupo: persona ? +persona['Grupo'] || null : null,
    perfiles: persona ? perfilesDe_(persona) : [],
    apodo: persona ? String(persona['Cómo le dicen'] || '') : '',
    rol: rol,
    privilegiado: !!rol,
    editables: editables
  };
}

/**
 * ¿El usuario pertenece a la audiencia indicada? Texto separado por comas con:
 * todos, privilegiados, admin, editor, lector, un perfil (anciano, participa…), "grupo N" o un correo.
 * Vacío = todos. El admin lo ve todo.
 */
function enAudiencia_(texto, yo) {
  var partes = String(texto || '').split(/[,;]+/).map(norm_).filter(Boolean);
  if (!partes.length || yo.rol === 'admin') return true;
  return partes.some(function (x) {
    if (x === 'todos') return true;
    if (x === 'privilegiados') return yo.privilegiado;
    if (x === yo.rol) return true;
    if (/^grupo \d+$/.test(x)) return yo.grupo === +x.replace(/\D/g, '');
    if (x.indexOf('@') > 0) return x === yo.correo;
    if (yo.nombre && x === norm_(yo.nombre)) return true; // una persona por su nombre
    return yo.perfiles.indexOf(x) >= 0 || yo.perfiles.indexOf(x.replace(/s$/, '')) >= 0;
  });
}

/** Perfiles marcados con casilla en Personas (y la antigua columna de texto "Perfil", si existe). */
function perfilesDe_(persona) {
  var out = String(persona['Perfil'] || '').split(/[,;]+/).map(norm_).filter(Boolean);
  PERFILES.forEach(function (p) { if (persona[p.columna] === true || si_(persona[p.columna])) out.push(p.id); });
  return out.filter(function (x, i, a) { return a.indexOf(x) === i; });
}
