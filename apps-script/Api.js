/**
 * API que consume la app web (GitHub Pages). Todo requiere sesión, salvo ping.
 *
 * POST (cuerpo JSON enviado como text/plain para evitar CORS):
 *   { accion: 'entrar', credential }           -> { token, usuario }
 *   { accion: 'datos', token }                 -> programas, resumen personal y (si corresponde) estados
 *   { accion: 'responder', token, clave, respuesta: 'Confirmado'|'Rechazado' }
 *   { accion: 'estado', token, clave, estado }                 (con privilegios)
 *   { accion: 'asignar', token, clave, nombre }                (con privilegios)
 *   { accion: 'aprobar', token, programa, periodo }            (con privilegios)
 */

var CACHE_BASE = 'base-v2';
var ESTADOS_EDITABLES = ['Pendiente', 'Confirmado', 'Rechazado', 'Sin confirmación', 'Avisar manualmente'];

function doGet(e) {
  var accion = (e && e.parameter && e.parameter.accion) || '';
  if (accion === 'ping') return json_({ ok: true, hora: new Date().toISOString() });
  return json_({ ok: false, error: 'Inicia sesión en la app para ver los programas.' });
}

function doPost(e) {
  var p;
  try {
    p = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'Solicitud inválida' });
  }
  try {
    var cfg = config_();
    if (p.accion === 'entrar') {
      var correo = verificarGoogle_(p.credential, cfg);
      var perfil = perfil_(correo);
      if (!perfil.registrado) {
        return json_({ ok: false, codigo: 'no-registrado', error: 'Tu correo (' + correo + ') no está en el directorio de la congregación. Pídele al administrador que lo agregue.' });
      }
      return json_({ ok: true, token: crearSesion_(correo), usuario: perfil });
    }

    var correoSesion = leerSesion_(p.token);
    if (!correoSesion) return json_({ ok: false, codigo: 'sesion', error: 'Tu sesión terminó. Vuelve a entrar.' });
    var yo = perfil_(correoSesion);
    if (!yo.registrado) return json_({ ok: false, codigo: 'sesion', error: 'Tu correo ya no está en el directorio.' });

    switch (p.accion) {
      case 'datos': return json_(datosUsuario_(yo, cfg));
      case 'responder': return json_(conBloqueo_(function () { return responder_(yo, p, cfg); }));
      case 'estado': return json_(conBloqueo_(function () { return cambiarEstado_(yo, p); }));
      case 'asignar': return json_(conBloqueo_(function () { return reasignar_(yo, p); }));
      case 'aprobar': return json_(conBloqueo_(function () { return aprobar_(yo, p); }));
      case 'registrar': return json_(registrarPredicacion_(yo, p, cfg));
      case 'dispositivo': return json_(conBloqueo_(function () { return registrarDispositivo_(yo, p); }));
      case 'territorios': return json_(resumenTerritorios_(yo, cfg));
      case 'informe': return json_(conBloqueo_(function () { return guardarInforme_(yo, p, cfg); }));
      case 'informes': return json_(informesGrupos_(yo, p, cfg));
      default: return json_({ ok: false, error: 'Acción desconocida' });
    }
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: err.message || 'Error interno' });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function conBloqueo_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var r = fn();
    limpiarCache_();
    return r;
  } finally {
    lock.releaseLock();
  }
}

/* ------------------------------------------------------------------ */
/* Datos base (iguales para todos) con caché                            */
/* ------------------------------------------------------------------ */

function limpiarCache_() {
  CacheService.getScriptCache().remove(CACHE_BASE + ':n');
}

function baseCacheada_() {
  var cache = CacheService.getScriptCache();
  var n = cache.get(CACHE_BASE + ':n');
  if (n) {
    var claves = [];
    for (var i = 0; i < +n; i++) claves.push(CACHE_BASE + ':' + i);
    var partes = cache.getAll(claves), txt = '';
    for (i = 0; i < +n; i++) txt += partes[CACHE_BASE + ':' + i] || '';
    try { return JSON.parse(txt); } catch (e) { /* se regenera */ }
  }
  var base = construirBase_();
  var s = JSON.stringify(base), trozos = {}, k = 0;
  for (var j = 0; j < s.length; j += 90000) trozos[CACHE_BASE + ':' + (k++)] = s.slice(j, j + 90000);
  trozos[CACHE_BASE + ':n'] = String(k);
  try { cache.putAll(trozos, 600); } catch (e) { /* demasiado grande: sin caché */ }
  return base;
}

/** Programas con reuniones (aprobadas y borradores), nombres completos y clave por asignado. */
function construirBase_() {
  var cfg = config_();
  var hoy = hoyISO_();
  var desde = sumarDias_(hoy, -(+cfg.diasPasados || 7));
  var hasta = sumarDias_(hoy, +cfg.diasFuturos || 120);

  var periodos = {};
  leerTabla_('periodos').forEach(function (p) { periodos[p['Programa'] + '|' + p['Periodo']] = p; });
  // Superintendente y auxiliar de cada grupo (se muestran junto a hospitalidad y aseo)
  var grupos = {};
  leerTabla_('grupos').forEach(function (g) {
    var t = [g['Superintendente'], g['Auxiliar']].filter(Boolean).join(' · ');
    if (t) grupos[+g['Grupo']] = t;
  });
  var nombres = {};
  leerTabla_('asignaciones').forEach(function (a) { if (a['Estado'] !== 'Eliminada') nombres[a['Clave']] = a['Nombre']; });

  var porPrograma = {}, borradores = {};
  leerTabla_('datos').forEach(function (d) {
    var per = periodos[d['Programa'] + '|' + d['Periodo']];
    if (!per) return;
    var borrador = per['Estado'] !== 'Aprobado';
    var res = JSON.parse(d['JSON']);
    if (borrador && per['Primera fecha'] > sumarDias_(hoy, +cfg.diasParaAprobar || 60)) return; // aún muy lejano
    if (borrador) {
      (borradores[d['Programa']] = borradores[d['Programa']] || []).push({
        periodo: d['Periodo'], desde: per['Primera fecha'], hasta: per['Última fecha'], avisos: per['Avisos'] || ''
      });
    }
    var lista = porPrograma[d['Programa']] = porPrograma[d['Programa']] || [];
    res.reuniones.forEach(function (r) {
      if (!borrador && (r.fecha < desde || r.fecha > hasta)) return;
      lista.push({
        fecha: r.fecha, hora: r.hora, titulo: r.titulo, nota: r.nota, lugar: r.lugar, tipo: r.tipo || '',
        borrador: borrador, periodo: d['Periodo'],
        secciones: r.secciones.map(function (s) {
          return {
            titulo: s.titulo,
            filas: s.filas.map(function (f) {
              return {
                texto: f.texto, detalle: f.detalle,
                asignados: f.asignados.map(function (a) {
                  var clave = d['Programa'] + '|' + r.id + '|' + a.slot;
                  return {
                    clave: a.externo ? '' : clave,
                    rol: a.rol,
                    nombre: a.externo ? a.nombre : nombres[clave] || a.nombre,
                    sala: a.sala || '',
                    grupo: a.grupo || null,
                    sub: a.grupo ? grupos[a.grupo] || '' : a.externo ? a.origen || '' : ''
                  };
                })
              };
            })
          };
        })
      });
    });
  });

  var programas = leerTabla_('programas')
    .filter(function (p) { return p['ID'] && si_(p['Visible']); })
    .sort(function (a, b) { return (+a['Orden'] || 99) - (+b['Orden'] || 99); })
    .map(function (p) {
      var orden = function (r) { return r.fecha + (p['ID'] !== 'predicacion' && r.tipo === 'salida' ? '1' : '0') + (r.hora || ''); };
      var reuniones = (porPrograma[p['ID']] || []).sort(function (a, b) { return orden(a).localeCompare(orden(b)); });
      return {
        id: p['ID'], nombre: p['Nombre'], icono: p['Ícono'], descripcion: p['Descripción'],
        confirmacion: si_(p['Requiere confirmación']),
        visiblePara: p['Visible para'] || '', estadosPara: p['Estados visibles para'] || 'privilegiados',
        reuniones: reuniones, borradores: borradores[p['ID']] || []
      };
    });

  var enlaces = leerTabla_('enlaces')
    .filter(function (l) { return l['URL']; })
    .sort(function (a, b) { return (+a['Orden'] || 99) - (+b['Orden'] || 99); })
    .map(function (l) {
      var v = String(l['Visibilidad'] || '');
      return { titulo: l['Título'], url: l['URL'], descripcion: l['Descripción'], privilegiado: !/^(p[uú]blico|todos)?$/i.test(v.trim()), visiblePara: /^p[uú]blico$/i.test(v.trim()) ? 'todos' : /privilegiad/i.test(v) ? 'privilegiados' : v };
    });

  var avisos = leerTabla_('avisos', { opcional: true })
    .filter(function (a) {
      if (!a['Título']) return false;
      var h = a['Mostrar hasta'];
      return !(h instanceof Date) || Utilities.formatDate(h, Session.getScriptTimeZone(), 'yyyy-MM-dd') >= hoy;
    })
    .sort(function (a, b) { return (+a['Orden'] || 99) - (+b['Orden'] || 99); })
    .map(function (a) { return { titulo: a['Título'], detalle: a['Detalle'], icono: a['Ícono'] || 'megafono', visiblePara: a['Visible para'] || '' }; });
  if (cfg.aviso) avisos.unshift({ titulo: cfg.aviso, detalle: '', icono: 'megafono' });

  var reglas = leerTabla_('visibilidad', { opcional: true })
    .filter(function (v) { return v['Programa'] && v['Elemento']; })
    .map(function (v) { return { programa: v['Programa'], elemento: norm_(v['Elemento']), visiblePara: v['Visible para'] }; });

  return {
    generado: new Date().toISOString(),
    reglas: reglas,
    inicio: {
      congregacion: cfg.congregacion || '', mensaje: cfg.mensaje || '', direccion: cfg.direccion || '', comoLlegar: cfg.comoLlegar || '',
      avisos: avisos,
      zoom: { vmc: cfg.zoomEntreSemana || '', finsemana: cfg.zoomFinSemana || cfg.zoomEntreSemana || '', predicacion: cfg.zoomPredicacion || '' }
    },
    programas: programas,
    enlaces: enlaces
  };
}

/* ------------------------------------------------------------------ */
/* Datos para un usuario                                                */
/* ------------------------------------------------------------------ */

function datosUsuario_(yo, cfg) {
  var base = baseCacheada_();
  var hoy = hoyISO_(), fin = sumarDias_(hoy, 6);
  var asign = leerTabla_('asignaciones');
  var estados = {};
  asign.forEach(function (a) { estados[a['Clave']] = a['Estado']; });

  // Información de cada asignado (para el resumen: título, lugar, hora)
  var info = {};
  base.programas.forEach(function (p) {
    p.reuniones.forEach(function (r) {
      if (r.borrador) return;
      r.secciones.forEach(function (s) { s.filas.forEach(function (f) { f.asignados.forEach(function (a) {
        if (a.clave) info[a.clave] = { programa: p, reunion: r, fila: f, asignado: a };
      }); }); });
    });
  });

  var resumen = [];
  Object.keys(info).forEach(function (clave) {
    var x = info[clave], r = x.reunion, a = x.asignado;
    if (r.fecha < hoy || r.fecha > fin) return;
    var mio = a.grupo ? (yo.grupo && a.grupo === yo.grupo) : norm_(a.nombre) === norm_(yo.nombre);
    if (!mio) return;
    var estado = estados[clave] || '';
    resumen.push({
      clave: clave, programa: x.programa.id, programaNombre: x.programa.nombre,
      fecha: r.fecha, hora: r.hora, titulo: r.titulo, lugar: r.lugar,
      parte: x.fila.texto, detalle: x.fila.detalle, rol: a.rol, sala: a.sala, grupo: a.grupo,
      estado: estado,
      puedeResponder: !a.grupo && x.programa.confirmacion && ['Pendiente', 'Confirmado', 'Rechazado'].indexOf(estado) >= 0
    });
  });
  resumen.sort(function (a, b) { return (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || '')); });

  var programas = base.programas.filter(function (p) {
    return yo.editables.indexOf(p.id) >= 0 || enAudiencia_(p.visiblePara, yo);
  }).map(function (p) {
    var editable = yo.editables.indexOf(p.id) >= 0;
    var ocultas = (base.reglas || []).filter(function (g) { return g.programa === p.id && !editable && !enAudiencia_(g.visiblePara, yo); });
    var oculto = function (texto) { texto = norm_(texto); return ocultas.some(function (g) { return texto && texto.indexOf(g.elemento) >= 0; }); };
    var salidasOcultas = ocultas.some(function (g) { return /que salen|salida|salientes/.test(g.elemento); });
    var reuniones = p.reuniones.filter(function (r) { return (!r.borrador || editable) && !(salidasOcultas && r.tipo === 'salida'); }).map(function (r) {
      if (!ocultas.length) return r;
      var copia = JSON.parse(JSON.stringify(r));
      copia.secciones = copia.secciones.filter(function (s) { return !oculto(s.titulo); }).map(function (s) {
        s.filas = s.filas.filter(function (f) { return !oculto(f.texto) && !f.asignados.some(function (a) { return oculto(a.rol); }); });
        return s;
      }).filter(function (s) { return s.filas.length; });
      return copia;
    });
    return {
      id: p.id, nombre: p.nombre, icono: p.icono, descripcion: p.descripcion, confirmacion: p.confirmacion,
      editable: editable,
      borradores: editable ? p.borradores : [],
      verEstados: editable || enAudiencia_(p.estadosPara, yo),
      reuniones: reuniones
    };
  });
  var verEstados = {};
  programas.forEach(function (p) { if (p.verEstados) verEstados[p.id] = true; });

  var out = {
    ok: true,
    generado: base.generado,
    hoy: hoy,
    usuario: { nombre: yo.nombre, correo: yo.correo, rol: yo.rol, privilegiado: yo.privilegiado, editables: yo.editables, grupo: yo.grupo },
    inicio: (function () {
      var ini = JSON.parse(JSON.stringify(base.inicio));
      ini.avisos = (ini.avisos || []).filter(function (a) { return enAudiencia_(a.visiblePara, yo); });
      return ini;
    })(),
    resumen: resumen,
    programas: programas,
    enlaces: base.enlaces.filter(function (l) { return enAudiencia_(l.visiblePara, yo); })
  };
  // Requiere atención: asignaciones rechazadas en los programas que el usuario puede editar
  var nombresProg = {};
  base.programas.forEach(function (p) { nombresProg[p.id] = p.nombre; });
  out.alertas = asign.filter(function (a) {
    return a['Estado'] === 'Rechazado' && a['Fecha'] >= hoy && yo.editables.indexOf(a['Programa']) >= 0;
  }).map(function (a) {
    return { clave: a['Clave'], programa: a['Programa'], programaNombre: nombresProg[a['Programa']] || a['Programa'],
      fecha: a['Fecha'], hora: a['Hora'], rol: a['Rol'], parte: a['Parte'], nombre: a['Nombre'] };
  }).sort(function (a, b) { return a.fecha.localeCompare(b.fecha); });

  // Informe mensual de predicación
  try { out.informe = estadoInforme_(yo, cfg); } catch (e) { console.warn(e); out.informe = null; }

  // Registro de predicación pendiente y acceso al resumen de territorios
  try {
    out.registrosPendientes = registrosPendientes_(yo, info, cfg);
    out.territorios = { puedeVer: puedeVerTerritorios_(yo, cfg) && !!cfg.registroPredicacion };
    if (out.registrosPendientes.length || out.territorios.puedeVer) out.territorios.manzanas = manzanasPorTerritorio_(planillaRegistro_(cfg));
  } catch (e) {
    console.warn(e);
    out.registrosPendientes = [];
    out.territorios = { puedeVer: false };
  }

  if (Object.keys(verEstados).length) {
    out.estados = {};
    asign.forEach(function (a) { if (a['Estado'] !== 'Eliminada' && verEstados[a['Programa']]) out.estados[a['Clave']] = a['Estado']; });
  }
  if (yo.editables.length) {
    out.personas = leerTabla_('personas').map(function (p) { return p['Nombre']; }).filter(Boolean);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Acciones                                                             */
/* ------------------------------------------------------------------ */

function filaAsignacion_(clave) {
  var fila = leerTabla_('asignaciones').filter(function (a) { return a['Clave'] === clave && a['Estado'] !== 'Eliminada'; })[0];
  if (!fila) throw new Error('No encontré esa asignación. Actualiza la app e intenta de nuevo.');
  return fila;
}

function programaPorId_(id) {
  return leerTabla_('programas').filter(function (p) { return p['ID'] === id; })[0];
}

function puedeEditar_(yo, programaId) {
  if (yo.editables.indexOf(programaId) < 0) throw new Error('No tienes permiso para modificar este programa.');
}

function responder_(yo, p, cfg) {
  if (['Confirmado', 'Rechazado'].indexOf(p.respuesta) < 0) throw new Error('Respuesta inválida');
  var fila = filaAsignacion_(p.clave);
  if (norm_(fila['Nombre']) !== norm_(yo.nombre)) throw new Error('Esta asignación no es tuya.');
  var anterior = fila['Estado'];
  actualizarFila_('asignaciones', fila, { 'Estado': p.respuesta, 'Actualizado': new Date() });
  registrar_('Respuesta en la app', yo.nombre + ': ' + p.respuesta + ' · ' + fila['Reunión'] + ' · ' + fila['Parte']);
  if (p.respuesta === 'Rechazado' && anterior !== 'Rechazado') avisarRechazo_(fila, cfg);
  return { ok: true, estado: p.respuesta };
}

function cambiarEstado_(yo, p) {
  var fila = filaAsignacion_(p.clave);
  puedeEditar_(yo, fila['Programa']);
  if (ESTADOS_EDITABLES.indexOf(p.estado) < 0) throw new Error('Estado inválido');
  actualizarFila_('asignaciones', fila, { 'Estado': p.estado, 'Actualizado': new Date() });
  registrar_('Estado cambiado', yo.nombre + ' → ' + p.estado + ' · ' + fila['Nombre'] + ' · ' + fila['Reunión']);
  return { ok: true, estado: p.estado };
}

/** Cambia el asignado en la app y en la hoja oficial del responsable. */
function reasignar_(yo, p) {
  var nuevo = texto_(p.nombre);
  if (!nuevo) throw new Error('Escribe un nombre.');
  var fila = filaAsignacion_(p.clave);
  puedeEditar_(yo, fila['Programa']);
  var prog = programaPorId_(fila['Programa']);
  var dir = directorio_();
  var persona = reconocer_(nuevo, dir);
  var ident = /^grupo \d+$/i.test(nuevo)
    ? identificar_({ nombre: 'Grupo ' + nuevo.replace(/\D/g, ''), grupo: +nuevo.replace(/\D/g, '') }, dir)
    : { nombre: persona ? persona.nombre : nuevo, reconocido: persona ? 'Sí' : 'No', correo: persona ? persona.correo : '' };
  var nombreFinal = ident.nombre;

  // Escribir en la hoja oficial
  var aviso = '';
  var escrito = false;
  try {
    escrito = escribirEnOrigen_(prog, fila, nombreFinal);
  } catch (e) {
    aviso = 'Se cambió en la app, pero no pude escribir en la hoja oficial: ' + e.message;
  }

  if (fila['ID evento']) eliminarEvento_(fila['ID evento']);
  var a = { 'Nombre': nombreFinal, 'Reconocido': ident.reconocido, 'Correo': ident.correo, 'Respuesta calendario': '', 'Rechazo avisado el': '', 'Recordatorio el': '', 'ID evento': '', 'Invitado el': '', 'Actualizado': new Date() };
  // Si se escribió en la hoja, la próxima sincronización verá el mismo nombre y no lo revertirá.
  if (escrito) a['Nombre en programa'] = nombreFinal;
  a['Estado'] = estadoInicial_(prog, { 'Reconocido': a['Reconocido'], 'Correo': a['Correo'] });
  actualizarFila_('asignaciones', fila, a);
  registrar_('Asignado cambiado', yo.nombre + ': ' + fila['Reunión'] + ' · ' + fila['Parte'] + ' → ' + nombreFinal + (escrito ? '' : ' (solo en la app)'));
  return { ok: true, nombre: nombreFinal, estado: a['Estado'], aviso: aviso || (ident.reconocido === 'No' ? 'Ese nombre no está en el directorio; no recibirá invitaciones.' : '') };
}

/** Busca la celda de origen de la asignación y reemplaza el nombre anterior por el nuevo. */
function escribirEnOrigen_(prog, fila, nombreNuevo) {
  var dato = leerTabla_('datos').filter(function (d) { return d['Programa'] === fila['Programa'] && d['Periodo'] === fila['Periodo']; })[0];
  if (!dato) throw new Error('no encontré el periodo');
  var partes = fila['Clave'].split('|'); // programa | id reunión | slot
  var celda = null;
  JSON.parse(dato['JSON']).reuniones.forEach(function (r) {
    if (r.id !== partes[1]) return;
    r.secciones.forEach(function (s) { s.filas.forEach(function (f) { f.asignados.forEach(function (a) {
      if (a.slot === partes[2]) celda = a.celda;
    }); }); });
  });
  if (!celda) throw new Error('no encontré la celda');
  var sh = SpreadsheetApp.openByUrl(prog['Hoja de origen (URL)']).getSheetByName(fila['Periodo']);
  if (!sh) throw new Error('no encontré la pestaña "' + fila['Periodo'] + '"');
  var rango = sh.getRange(celda[0] + 1, celda[1] + 1);
  var actual = String(rango.getDisplayValue());
  var anterior = String(fila['Nombre en programa'] || '');
  var valor = anterior && actual.indexOf(anterior) >= 0 ? actual.replace(anterior, nombreNuevo) : nombreNuevo;
  rango.setValue(valor);
  return true;
}

function aprobar_(yo, p) {
  puedeEditar_(yo, p.programa);
  var per = leerTabla_('periodos').filter(function (x) { return x['Programa'] === p.programa && x['Periodo'] === p.periodo; })[0];
  if (!per) throw new Error('No encontré ese periodo.');
  actualizarFila_('periodos', per, { 'Estado': 'Aprobado', 'Aprobado por': yo.nombre, 'Aprobado el': new Date() });
  var prog = programaPorId_(p.programa);
  var asign = leerTabla_('asignaciones');
  var n = 0;
  asign.forEach(function (a) {
    if (a['Programa'] === p.programa && a['Periodo'] === p.periodo && a['Estado'] === 'Borrador') {
      a['Estado'] = estadoInicial_(prog, a);
      a['Actualizado'] = new Date();
      n++;
    }
  });
  try { procesarInvitaciones_(asign, config_()); } catch (e) { registrar_('Error en invitaciones', e.message); }
  reescribirTabla_('asignaciones', asign);
  registrar_('Programa aprobado', yo.nombre + ': ' + prog['Nombre'] + ' · ' + p.periodo);
  return { ok: true, asignaciones: n };
}

function avisarRechazo_(fila, cfg) {
  var a = {};
  for (var k in fila) a[k] = fila[k];
  avisarRechazoMemoria_(a, programaPorId_(fila['Programa']), cfg);
  if (a['Rechazo avisado el']) actualizarFila_('asignaciones', fila, { 'Rechazo avisado el': a['Rechazo avisado el'] });
}
