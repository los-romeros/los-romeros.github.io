/**
 * API que consume la app web (GitHub Pages).
 * GET ?accion=publico  -> datos de la vista pública (nombres abreviados, sin correos ni teléfonos).
 */

var CACHE_PUBLICO = 'publico-v1';

function doGet(e) {
  var accion = (e && e.parameter && e.parameter.accion) || 'publico';
  try {
    if (accion === 'publico') return json_(publicoCacheado_());
    if (accion === 'ping') return json_({ ok: true, hora: new Date().toISOString() });
    return json_({ ok: false, error: 'Acción desconocida' });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'Error interno' });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function publicoCacheado_() {
  var cache = CacheService.getScriptCache();
  var n = cache.get(CACHE_PUBLICO + ':n');
  if (n) {
    var partes = cache.getAll(Array.apply(null, Array(+n)).map(function (_, i) { return CACHE_PUBLICO + ':' + i; }));
    var txt = '';
    for (var i = 0; i < +n; i++) txt += partes[CACHE_PUBLICO + ':' + i] || '';
    if (txt) try { return JSON.parse(txt); } catch (e) { /* se regenera */ }
  }
  var datos = datosPublicos_();
  var s = JSON.stringify(datos), trozos = {}, tam = 90000, k = 0;
  for (var j = 0; j < s.length; j += tam) trozos[CACHE_PUBLICO + ':' + (k++)] = s.slice(j, j + tam);
  trozos[CACHE_PUBLICO + ':n'] = String(k);
  cache.putAll(trozos, 600);
  return datos;
}

function limpiarCache_() {
  var cache = CacheService.getScriptCache();
  cache.remove(CACHE_PUBLICO + ':n');
}

function datosPublicos_() {
  var cfg = config_();
  var hoy = hoyISO_();
  var desde = sumarDias_(hoy, -(+cfg.diasPasados || 7));
  var hasta = sumarDias_(hoy, +cfg.diasFuturos || 120);

  var aprobados = {};
  leerTabla_('periodos').forEach(function (p) { if (p['Estado'] === 'Aprobado') aprobados[p['Programa'] + '|' + p['Periodo']] = true; });

  var nombres = {};
  leerTabla_('asignaciones').forEach(function (a) { nombres[a['Clave']] = a['Nombre']; });

  var publicos = {};
  leerTabla_('personas').forEach(function (p) { publicos[p['Nombre']] = p['Nombre público'] || nombrePublico_(p['Nombre']); });
  var publico = function (n) { return publicos[n] || nombrePublico_(n); };

  var porPrograma = {};
  leerTabla_('datos').forEach(function (d) {
    if (!aprobados[d['Programa'] + '|' + d['Periodo']]) return;
    var res = JSON.parse(d['JSON']);
    var lista = porPrograma[d['Programa']] = porPrograma[d['Programa']] || [];
    res.reuniones.forEach(function (r) {
      if (r.fecha < desde || r.fecha > hasta) return;
      lista.push({
        fecha: r.fecha, hora: r.hora, titulo: r.titulo, nota: r.nota, lugar: r.lugar, tipo: r.tipo || '',
        secciones: r.secciones.map(function (s) {
          return {
            titulo: s.titulo,
            filas: s.filas.map(function (f) {
              return {
                texto: f.texto, detalle: f.detalle,
                asignados: f.asignados.map(function (a) {
                  var clave = d['Programa'] + '|' + r.id + '|' + a.slot;
                  var nombre = a.grupo ? a.nombre
                    : a.externo ? a.nombre + (a.origen ? ' (' + a.origen + ')' : '')
                    : publico(nombres[clave] || a.nombre);
                  return { rol: a.rol, nombre: nombre, sala: a.sala || '' };
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
      var reuniones = (porPrograma[p['ID']] || []).sort(function (a, b) {
        return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : String(a.hora || '').localeCompare(String(b.hora || ''));
      });
      return { id: p['ID'], nombre: p['Nombre'], icono: p['Ícono'], descripcion: p['Descripción'], reuniones: reuniones };
    });

  var enlaces = leerTabla_('enlaces')
    .filter(function (l) { return l['URL'] && !/privilegiad/i.test(l['Visibilidad']); })
    .sort(function (a, b) { return (+a['Orden'] || 99) - (+b['Orden'] || 99); })
    .map(function (l) { return { titulo: l['Título'], url: l['URL'], descripcion: l['Descripción'] }; });

  return {
    ok: true,
    generado: new Date().toISOString(),
    hoy: hoy,
    inicio: {
      congregacion: cfg.congregacion || '',
      mensaje: cfg.mensaje || '',
      aviso: cfg.aviso || '',
      direccion: cfg.direccion || ''
    },
    programas: programas,
    enlaces: enlaces
  };
}
