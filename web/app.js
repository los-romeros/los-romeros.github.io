(function () {
  'use strict';

  var CLAVE_DATOS = 'programas-datos-v1';
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var COLOR_SECCION = {
    'tesoros de la biblia': 'var(--tesoros)',
    'seamos mejores maestros': 'var(--maestros)',
    'nuestra vida cristiana': 'var(--vida)'
  };

  var ICONOS = {
    libro: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 7h7M9 10.5h5"/>',
    atril: '<path d="M12 2a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M19 10a7 7 0 0 1-14 0M12 17v5M8 22h8"/>',
    audio: '<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="3" y="14" width="4" height="7" rx="1.5"/><rect x="17" y="14" width="4" height="7" rx="1.5"/>',
    mapa: '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    escoba: '<path d="M19 3 11 11"/><path d="M8.5 10.5 13.5 15.5 10 21H3.5L5 14z"/><path d="M6.5 17.5 5 21M9 18l-1 3"/>',
    grupo: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
    calendario: '<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>'
  };

  function svg(nombre, extra) {
    var p = ICONOS[nombre] || ICONOS.calendario;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '>' + p + '</svg>';
  }
  var SVG_CHEVRON = '<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
  var SVG_ATRAS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>';
  var SVG_LUPA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  var SVG_PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>';
  var SVG_AVISO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5v.01"/></svg>';

  var estado = { datos: null, sinConexion: false, busqueda: '', verAnteriores: false };
  var app = document.getElementById('app');
  var eventoInstalar = null;

  /* ---------- utilidades ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }
  function partes(iso) { var p = iso.split('-'); return { a: +p[0], m: +p[1], d: +p[2] }; }
  function diaSemana(iso) { var p = partes(iso); return new Date(Date.UTC(p.a, p.m - 1, p.d)).getUTCDay(); }
  function hoyISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fechaLarga(iso) {
    var p = partes(iso);
    return DIAS[diaSemana(iso)] + ' ' + p.d + ' de ' + MESES[p.m - 1];
  }
  function fechaCorta(iso) {
    var p = partes(iso);
    return DIAS_CORTOS[diaSemana(iso)].toLowerCase() + ' ' + p.d + ' ' + MESES_CORTOS[p.m - 1];
  }
  function leerCache() {
    try { return JSON.parse(localStorage.getItem(CLAVE_DATOS) || 'null'); } catch (e) { return null; }
  }
  function guardarCache(d) {
    try { localStorage.setItem(CLAVE_DATOS, JSON.stringify(d)); } catch (e) { /* sin almacenamiento */ }
  }

  /* ---------- datos ---------- */
  function cargar() {
    var cache = leerCache();
    if (cache && !/[?&]demo\b/.test(location.search)) { estado.datos = cache; render(); }
    var cfg = window.APP_CONFIG || {};
    var demo = /[?&]demo\b/.test(location.search); // vista previa local con dev-data.json
    var url = cfg.apiUrl && !demo ? cfg.apiUrl + (cfg.apiUrl.indexOf('?') < 0 ? '?' : '&') + 'accion=publico' : 'dev-data.json';
    fetch(url, { cache: 'no-store', redirect: 'follow' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) throw new Error('respuesta inválida');
        estado.datos = d;
        estado.sinConexion = false;
        guardarCache(d);
        render();
      })
      .catch(function () {
        estado.sinConexion = true;
        render();
      });
  }

  /* ---------- vistas ---------- */
  function render() {
    var ruta = location.hash.replace(/^#\/?/, '');
    if (!estado.datos) {
      app.innerHTML = estado.sinConexion
        ? '<p class="cargando">No se pudieron cargar los programas. Revisa tu conexión e intenta de nuevo.</p>'
        : '<p class="cargando">Cargando programas…</p>';
      return;
    }
    var m = /^p\/([\w-]+)/.exec(ruta);
    var prog = m && estado.datos.programas.filter(function (p) { return p.id === m[1]; })[0];
    if (prog) renderPrograma(prog); else renderInicio();
  }

  function proximaDe(prog, hoy) {
    return prog.reuniones.filter(function (r) { return r.fecha >= hoy; })[0];
  }

  function renderInicio() {
    var d = estado.datos, hoy = hoyISO();
    document.title = 'Programas · ' + (d.inicio.congregacion || 'Congregación');
    var h = '';
    h += '<header class="cabecera"><span class="eyebrow">Programas y asignaciones</span>' +
      '<h1>' + esc(d.inicio.congregacion || 'Congregación') + '</h1>' +
      '<div class="hoy">Hoy es ' + esc(fechaLarga(hoy)) + '</div></header>';
    if (estado.sinConexion) h += '<div class="estado-red">Sin conexión. Estás viendo los últimos datos guardados.</div>';
    if (d.inicio.aviso) h += '<div class="aviso" role="note">' + SVG_AVISO + '<div>' + esc(d.inicio.aviso) + '</div></div>';
    if (d.inicio.mensaje || d.inicio.direccion) {
      h += '<section>' + (d.inicio.mensaje ? '<p class="mensaje">' + esc(d.inicio.mensaje) + '</p>' : '') +
        (d.inicio.direccion ? '<p class="mensaje-dir">Salón del Reino: ' + esc(d.inicio.direccion) + '</p>' : '') + '</section>';
    }
    h += '<section class="bloque"><h2>Programas</h2><div class="botones">';
    d.programas.forEach(function (p) {
      var prox = proximaDe(p, hoy);
      var sub = prox ? 'Próxima: ' + fechaCorta(prox.fecha) + (prox.hora ? ' · ' + prox.hora : '') : (p.reuniones.length ? 'Sin fechas próximas' : 'Aún sin programa publicado');
      h += '<a class="boton-programa" href="#p/' + esc(p.id) + '">' +
        '<span class="icono">' + svg(p.icono) + '</span>' +
        '<span><div class="nombre">' + esc(p.nombre) + '</div><div class="proxima">' + esc(sub) + '</div></span>' +
        SVG_CHEVRON + '</a>';
    });
    h += '</div></section>';
    if (d.enlaces && d.enlaces.length) {
      h += '<section class="bloque"><h2>Enlaces</h2><div class="enlaces">';
      d.enlaces.forEach(function (l) {
        h += '<a href="' + esc(l.url) + '" target="_blank" rel="noopener"><span><div class="t">' + esc(l.titulo) + '</div>' +
          (l.descripcion ? '<div class="d">' + esc(l.descripcion) + '</div>' : '') + '</span>' + SVG_CHEVRON + '</a>';
      });
      h += '</div></section>';
    }
    h += instalarHTML();
    h += '<p class="pie">Actualizado ' + esc(new Date(d.generado).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })) + '</p>';
    app.innerHTML = h;
    var b = document.getElementById('btn-instalar');
    if (b) b.addEventListener('click', function () {
      eventoInstalar.prompt();
      eventoInstalar.userChoice.finally(function () { eventoInstalar = null; render(); });
    });
  }

  function instalarHTML() {
    var instalada = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (instalada) return '';
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var h = '<section class="instalar"><strong>Tenla a mano como una app</strong>';
    if (eventoInstalar) {
      h += '<p>Agrega el ícono a la pantalla de inicio de tu teléfono.</p><button class="btn" id="btn-instalar" type="button">Instalar</button>';
    } else if (ios) {
      h += '<p>En Safari toca el botón Compartir y luego «Agregar a inicio».</p>';
    } else {
      h += '<p>En el menú del navegador (⋮) elige «Instalar aplicación» o «Agregar a la pantalla principal».</p>';
    }
    return h + '</section>';
  }

  function renderPrograma(prog) {
    var hoy = hoyISO();
    document.title = prog.nombre + ' · Programas';
    var q = norm(estado.busqueda);

    // Agrupa por fecha (predicación tiene varias salidas por día)
    var dias = [];
    prog.reuniones.forEach(function (r) {
      var ult = dias[dias.length - 1];
      if (ult && ult.fecha === r.fecha) ult.reuniones.push(r);
      else dias.push({ fecha: r.fecha, reuniones: [r] });
    });
    if (q) {
      dias = dias.map(function (d) {
        return { fecha: d.fecha, reuniones: d.reuniones.filter(function (r) { return reunionTiene(r, q); }) };
      }).filter(function (d) { return d.reuniones.length; });
    }
    var anteriores = dias.filter(function (d) { return d.fecha < hoy; });
    var visibles = estado.verAnteriores || q ? dias : dias.filter(function (d) { return d.fecha >= hoy; });
    var proxima = dias.filter(function (d) { return d.fecha >= hoy; })[0];

    var h = '<div class="barra"><div class="barra-top">' +
      '<button class="volver" type="button" id="volver">' + SVG_ATRAS + 'Inicio</button>' +
      '<h1>' + esc(prog.nombre) + '</h1></div>' +
      '<label class="buscar">' + SVG_LUPA +
      '<input id="buscar" type="search" placeholder="Buscar un nombre" autocomplete="off" value="' + esc(estado.busqueda) + '" aria-label="Buscar un nombre"></label></div>';

    if (estado.sinConexion) h += '<div class="estado-red">Sin conexión. Estás viendo los últimos datos guardados.</div>';
    if (anteriores.length && !estado.verAnteriores && !q) {
      h += '<button class="btn btn-sec" type="button" id="anteriores">Ver fechas anteriores (' + anteriores.length + ')</button>';
    }
    if (!visibles.length) {
      h += '<p class="vacio">' + (q ? 'No hay asignaciones para «' + esc(estado.busqueda) + '».' : 'Aún no hay un programa publicado con fechas próximas.') + '</p>';
    }
    var mesActual = '';
    visibles.forEach(function (d) {
      var p = partes(d.fecha);
      var mes = MESES[p.m - 1] + ' ' + p.a;
      if (mes !== mesActual) { h += '<h2 class="mes">' + esc(mes) + '</h2>'; mesActual = mes; }
      var clase = 'dia' + (d.fecha < hoy ? ' pasado' : '') + (proxima && d.fecha === proxima.fecha ? ' proximo' : '');
      h += '<article class="' + clase + '" id="d-' + d.fecha + '">' +
        '<div class="fecha"><span class="ds">' + DIAS_CORTOS[diaSemana(d.fecha)] + '</span><span class="dn">' + p.d + '</span>' +
        '<span class="ms">' + MESES_CORTOS[p.m - 1] + '</span>' +
        (d.fecha === hoy ? '<span class="tag">Hoy</span>' : proxima && d.fecha === proxima.fecha ? '<span class="tag">Próxima</span>' : '') +
        '</div><div class="reuniones">' + d.reuniones.map(function (r) { return reunionHTML(r, q); }).join('') + '</div></article>';
    });
    app.innerHTML = h;

    document.getElementById('volver').addEventListener('click', function () {
      estado.busqueda = ''; estado.verAnteriores = false;
      if (history.length > 1 && /#p\//.test(location.hash)) history.back(); else location.hash = '';
    });
    var input = document.getElementById('buscar');
    input.addEventListener('input', function () {
      estado.busqueda = input.value;
      var pos = input.selectionStart;
      renderPrograma(prog);
      var nuevo = document.getElementById('buscar');
      nuevo.focus();
      try { nuevo.setSelectionRange(pos, pos); } catch (e) { /* no aplica */ }
    });
    var ant = document.getElementById('anteriores');
    if (ant) ant.addEventListener('click', function () { estado.verAnteriores = true; renderPrograma(prog); });
  }

  function reunionTiene(r, q) {
    return r.secciones.some(function (s) {
      return s.filas.some(function (f) {
        return f.asignados.some(function (a) { return norm(a.nombre).indexOf(q) >= 0; });
      });
    });
  }

  function reunionHTML(r, q) {
    var h = '<div class="reunion"><div class="reunion-cab"><span class="t">' + esc(r.titulo || '') + '</span>' +
      (r.hora ? '<span class="h">' + esc(r.hora) + ' h</span>' : '') + '</div>';
    if (r.lugar) h += '<div class="lugar">' + SVG_PIN + '<span>' + esc(r.lugar) + '</span></div>';
    if (r.nota) h += '<div class="nota">' + esc(r.nota) + '</div>';
    r.secciones.forEach(function (s) {
      var color = COLOR_SECCION[norm(s.titulo)];
      h += '<div class="seccion"' + (color ? ' style="--sec:' + color + '"' : '') + '>';
      if (s.titulo) h += '<div class="seccion-t">' + esc(s.titulo) + '</div>';
      s.filas.forEach(function (f) {
        var soloNombres = !f.texto && !f.detalle;
        h += '<div class="fila' + (soloNombres ? ' solo-nombres' : '') + '">';
        if (!soloNombres) {
          h += '<div class="izq">' + (f.texto ? '<div class="txt">' + esc(f.texto) + '</div>' : '') +
            (f.detalle ? '<div class="det">' + esc(f.detalle) + '</div>' : '') + '</div>';
        }
        h += '<div class="nombres">' + (f.asignados.length ? f.asignados.map(function (a) { return personaHTML(a, q, f); }).join('') : '<span class="sin-nombre">—</span>') + '</div></div>';
      });
      h += '</div>';
    });
    return h + '</div>';
  }

  function personaHTML(a, q, fila) {
    var extra = [];
    if (a.rol === 'Ayudante') extra.push('ayudante');
    if (a.sala === 'Sala auxiliar') extra.push('sala auxiliar');
    var marcado = q && norm(a.nombre).indexOf(q) >= 0;
    return '<span class="persona' + (marcado ? ' resaltado' : '') + '">' + esc(a.nombre) +
      (extra.length ? '<small>' + esc(extra.join(' · ')) + '</small>' : '') + '</span>';
  }

  /* ---------- arranque ---------- */
  window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); eventoInstalar = e; render(); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') cargar(); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () { /* sin modo offline */ });
  }
  cargar();
})();
