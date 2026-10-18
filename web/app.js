(function () {
  'use strict';

  var CLAVE_SESION = 'programas-sesion-v1';
  var CLAVE_DATOS = 'programas-datos-v2';
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var ESTADOS_EDITABLES = ['Pendiente', 'Confirmado', 'Rechazado', 'Sin confirmación', 'Avisar manualmente'];
  var CLASE_ESTADO = {
    'Confirmado': 'ok', 'Pendiente': 'pend', 'Rechazado': 'rech', 'Sin confirmación': 'neutro',
    'Avisar manualmente': 'manual', 'Borrador': 'neutro'
  };
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
    calendario: '<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    check: '<path d="M4 12.5 9.5 18 20 6.5"/>',
    megafono: '<path d="M3 10v4a1 1 0 0 0 1 1h2l5 4V5L6 9H4a1 1 0 0 0-1 1z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/>',
    chat: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.3z"/><path d="M9 10.5h6M9 13.5h4"/>',
    alto: '<path d="M8.5 2.5h7l5 5v7l-5 5h-7l-5-5v-7z"/><path d="M8 12h8"/>',
    plano: '<path d="m3 6.5 6-3 6 3 6-3v14l-6 3-6-3-6 3z"/><path d="M9 3.5v14M15 6.5v14"/>',
    video: '<rect x="2.5" y="6" width="13" height="12" rx="2"/><path d="m15.5 10.5 6-3.5v10l-6-3.5"/>'
  };

  function svg(nombre, extra) {
    var p = ICONOS[nombre] || ICONOS.calendario;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '>' + p + '</svg>';
  }
  var SVG_CHEVRON = '<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
  var SVG_ATRAS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>';
  var SVG_LUPA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  var SVG_PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>';

  // Costa de Concón: mar, cerros y edificios (decorativo)
  var PAISAJE = '<svg class="paisaje" viewBox="0 0 400 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true">' +
    '<path d="M0 78 C60 60 110 66 160 72 S260 58 310 50 S370 44 400 46 V120 H0z" fill="var(--cerro)"/>' +
    '<g fill="var(--edificio)"><rect x="300" y="18" width="12" height="36"/><rect x="316" y="8" width="13" height="44"/><rect x="333" y="22" width="10" height="28"/><rect x="348" y="12" width="12" height="36"/></g>' +
    '<path d="M0 88 C50 82 90 92 140 88 S240 80 300 86 S370 90 400 84 V120 H0z" fill="var(--mar)"/>' +
    '<path d="M0 98 C40 94 80 101 120 98 S200 92 250 98 S340 103 400 96" fill="none" stroke="var(--espuma)" stroke-width="2"/>' +
    '<path d="M210 120 C260 104 330 100 400 104 V120z" fill="var(--arena)"/>' +
    '<path d="M240 30 q6 -6 12 0 q6 -6 12 0M272 42 q4 -4 8 0 q4 -4 8 0" fill="none" stroke="var(--edificio)" stroke-width="1.6"/>' +
    '</svg>';

  var cfg = window.APP_CONFIG || {};
  var DEMO = /[?&]demo\b/.test(location.search);
  var estado = { datos: null, token: null, sinConexion: false, busqueda: '', verAnteriores: false, error: '', confirmarAprobar: '' };
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
  function fechaLarga(iso) { var p = partes(iso); return DIAS[diaSemana(iso)] + ' ' + p.d + ' de ' + MESES[p.m - 1]; }
  function fechaCorta(iso) { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return String(iso || ''); var p = partes(iso); return DIAS_CORTOS[diaSemana(iso)].toLowerCase() + ' ' + p.d + ' ' + MESES_CORTOS[p.m - 1]; }
  function cuando(iso, hoy) {
    if (iso === hoy) return 'Hoy';
    var p = partes(hoy), man = new Date(Date.UTC(p.a, p.m - 1, p.d + 1));
    if (iso === man.toISOString().slice(0, 10)) return 'Mañana';
    return fechaCorta(iso);
  }
  // Para Maps solo sirve "Calle Número, Comuna": se quitan depto, block, casa, referencias entre paréntesis, etc.
  function direccionMaps(texto) {
    var t = String(texto || '').replace(/\u00a0/g, ' ');
    var comuna = /re[nñ]aca/i.test(t) ? 'Reñaca' : /vi[nñ]a del mar/i.test(t) ? 'Viña del Mar' : 'Concón';
    t = t.replace(/\(.*?\)/g, ' ').replace(/#\s*/g, ' ').replace(/\s+/g, ' ').trim();
    var m = /^(.*?[A-Za-zÁÉÍÓÚÑáéíóúñ.]\s+\d+)/.exec(t);
    var base = m ? m[1] : t.replace(/^(esquina|plaza)\s+/i, '').split(/\s+-\s+|,/)[0].replace(/\s+con\s+/i, ' & ');
    base = base.replace(/^(pasaje|pje\.?|psje\.?)\s+/i, 'Pasaje ').replace(/\bpta\b\.?/i, 'Punta');
    return base.trim() + ', ' + comuna + ', Chile';
  }
  /** Enlace de WhatsApp con el mensaje ya escrito. Números chilenos: 9 1234 5678 -> 56912345678. */
  function whatsappURL(telefono, texto) {
    var n = String(telefono || '').replace(/\D/g, '');
    if (n.length === 8) n = '569' + n;
    else if (n.length === 9 && n.charAt(0) === '9') n = '56' + n;
    return 'https://wa.me/' + n + '?text=' + encodeURIComponent(texto);
  }
  function mensajeAsignacion(nombre, asignacion, fecha, hora, programa) {
    return 'Hola ' + primerNombre(nombre) + ', te escribo por el programa de la congregación (' + programa + '). ' +
      'Tienes la asignación: ' + asignacion + ', el ' + fechaLarga(fecha) + (hora ? ' a las ' + hora : '') + '. ' +
      '¿Me confirmas si puedes cumplirla? ¡Gracias!';
  }
  function mapsURL(q) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q); }
  function mayuscula(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function primerNombre(n) { return String(n || '').split(' ')[0]; }
  function leer(clave) { try { return JSON.parse(localStorage.getItem(clave) || 'null'); } catch (e) { return null; } }
  function guardar(clave, v) { try { if (v == null) localStorage.removeItem(clave); else localStorage.setItem(clave, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }

  /* ---------- servidor ---------- */
  function api(accion, datos) {
    if (DEMO) return demoApi(accion, datos || {});
    var cuerpo = Object.assign({ accion: accion, token: estado.token }, datos || {});
    return fetch(cfg.apiUrl, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(cuerpo) })
      .then(function (r) { if (!r.ok) throw new Error('red'); return r.json(); })
      .then(function (r) {
        if (!r.ok && r.codigo === 'sesion') { salir(r.error); throw new Error('sesion'); }
        return r;
      });
  }

  function cargar() {
    if (!estado.token && !DEMO) { renderLogin(); return; }
    var cache = DEMO ? null : leer(CLAVE_DATOS);
    if (cache && !estado.datos) { estado.datos = cache; render(); }
    var pedido = DEMO ? fetch('dev-data.json', { cache: 'no-store' }).then(function (r) { return r.json(); }) : api('datos');
    pedido.then(function (d) {
      if (!d || !d.ok) throw new Error(d && d.error || 'respuesta inválida');
      estado.datos = d;
      estado.sinConexion = false;
      if (!DEMO) guardar(CLAVE_DATOS, d);
      render();
      if (avisosDisponibles() && Notification.permission === 'granted' && !estado.avisoRefrescado) { estado.avisoRefrescado = true; activarAvisos(false); }
    }).catch(function (e) {
      if (e.message === 'sesion') return;
      estado.sinConexion = true;
      render();
    });
  }

  function salir(mensaje) {
    estado.token = null;
    estado.datos = null;
    estado.error = mensaje || '';
    guardar(CLAVE_SESION, null);
    guardar(CLAVE_DATOS, null);
    try { if (window.google) google.accounts.id.disableAutoSelect(); } catch (e) { /* nada */ }
    location.hash = '';
    renderLogin();
  }

  /* ---------- inicio de sesión ---------- */
  function renderLogin() {
    document.title = 'Cong. Los Romeros · Entrar';
    app.innerHTML =
      '<section class="login">' +
      '<div class="login-marca">' + svg('calendario', ' class="hero-logo"') + '<span>Cong. Los Romeros</span></div>' +
      '<h1>Programas y asignaciones de la congregación</h1>' +
      (location.hash === '#datos'
        ? '<p>Para completar o actualizar tus datos, entra con la cuenta de Google que usas en tu teléfono.</p>'
        : '<p>Entra con tu cuenta de Google para ver tus responsabilidades de la semana y todos los programas.</p>') +
      '<div id="google-btn" class="google-btn"></div>' +
      (estado.error ? '<p class="login-error" role="alert">' + esc(estado.error) + '</p>' : '') +
      '<p class="login-nota">Usa el mismo correo que entregaste a la congregación. Solo se entra una vez en cada teléfono.</p>' +
      '</section>';
    if (!cfg.googleClientId) {
      document.getElementById('google-btn').innerHTML = '<p class="login-error">Falta configurar el acceso con Google.</p>';
      return;
    }
    cargarGoogle(function () {
      google.accounts.id.initialize({ client_id: cfg.googleClientId, callback: alEntrar, auto_select: true, ux_mode: 'popup' });
      google.accounts.id.renderButton(document.getElementById('google-btn'), { theme: 'filled_blue', size: 'large', shape: 'pill', text: 'signin_with', locale: 'es', width: 280 });
    });
  }

  function cargarGoogle(listo) {
    if (window.google && google.accounts) { listo(); return; }
    var s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = listo;
    s.onerror = function () { estado.error = 'No se pudo cargar el acceso de Google. Revisa tu conexión.'; renderLogin(); };
    document.head.appendChild(s);
  }

  function alEntrar(resp) {
    estado.error = '';
    app.innerHTML = '<p class="cargando">Entrando…</p>';
    api('entrar', { credential: resp.credential }).then(function (r) {
      if (!r.ok && r.codigo === 'no-registrado' && r.token) { estado.token = r.token; renderDatos(true); return; }
      if (!r.ok) { estado.error = r.error; renderLogin(); return; }
      estado.token = r.token;
      guardar(CLAVE_SESION, r.token);
      cargar();
    }).catch(function () { estado.error = 'No se pudo conectar. Intenta de nuevo.'; renderLogin(); });
  }

  /* ---------- vistas ---------- */
  function render() {
    if (!estado.datos) {
      app.innerHTML = estado.sinConexion
        ? '<p class="cargando">No se pudieron cargar los programas. Revisa tu conexión e intenta de nuevo.</p>'
        : '<p class="cargando">Cargando programas…</p>';
      return;
    }
    var ruta = location.hash.replace(/^#\/?/, '');
    if (ruta === 'territorios' && estado.datos.territorios && estado.datos.territorios.puedeVer) { renderTerritorios(); return; }
    if (ruta === 'informes' && estado.datos.informe && estado.datos.informe.verGrupos) { renderInformes(); return; }
    var docs = estado.datos.documentos || {};
    var np = /^nopasar(?:\/(\w+))?$/.exec(ruta);
    if (np && docs.noPasar) { renderNoPasar(np[1] || ''); return; }
    if (ruta === 'mapa' && docs.mapa) { renderMapa(); return; }
    var m = /^p\/([\w-]+)/.exec(ruta);
    if (ruta === 'registrar' || ruta === 'informe') { renderInicio(); return; }
    if (ruta === 'datos') { renderDatos(false); return; }
    var prog = m && estado.datos.programas.filter(function (p) { return p.id === m[1]; })[0];
    if (prog) renderPrograma(prog); else renderInicio();
  }

  function proximaDe(prog, hoy) {
    return prog.reuniones.filter(function (r) { return !r.borrador && r.fecha >= hoy; })[0];
  }

  function renderInicio() {
    var d = estado.datos, hoy = d.hoy || hoyISO(), u = d.usuario || {};
    document.title = 'Cong. Los Romeros';

    var h = '<header class="cabecera-app">' + svg('calendario', ' class="cab-logo"') + '<span>' + esc(d.inicio.congregacion || 'Congregación') + '</span></header>' +
      '<section class="saludo"><div class="saludo-fecha">' + esc(mayuscula(fechaLarga(hoy))) + '</div>' +
      '<h1>Hola, ' + esc(u.apodo || primerNombre(u.nombre)) + '</h1><p>Tu semana de un vistazo</p></section>';
    if (estado.sinConexion) h += '<div class="estado-red">Sin conexión. Estás viendo los últimos datos guardados.</div>';

    // Requiere tu atención: asignaciones rechazadas y solicitudes de No pasar por aprobar
    var solic = (d.solicitudesNoPasar && d.solicitudesNoPasar.porAprobar) || [];
    var datosPend = d.datosPendientes || [];
    var choques = d.choques || [];
    if ((d.alertas || []).length || solic.length || datosPend.length) {
      h += '<section class="atencion" aria-label="Requiere tu atención"><h2>Requiere tu atención</h2>' +
        (d.alertas || []).map(function (a) {
          return '<div class="atencion-item"><div><div class="atencion-t">' + esc(a.nombre) + ' no puede</div>' +
            '<div class="atencion-d">' + esc(a.programaNombre) + ' · ' + esc(cuando(a.fecha, hoy)) + (a.hora ? ' · ' + esc(a.hora) : '') + ' · ' + esc(a.rol) + '</div></div>' +
            '<button type="button" class="btn" data-reasignar="' + esc(a.clave) + '" data-prog="' + esc(a.programa) + '">Reasignar</button></div>';
        }).join('') +
        solic.map(function (x) {
          return '<div class="atencion-item sol"><div><div class="atencion-t">No pasar: ' + esc(x.direccion) + '</div>' +
            '<div class="atencion-d">Territorio ' + esc(x.territorio) + (x.manzana ? ' · manzana ' + esc(x.manzana) : '') + ' · pedida por ' + esc(x.por) + (x.notas ? ' · ' + esc(x.notas) : '') + '</div></div>' +
            '<div class="sol-acc"><button type="button" class="btn ok" data-resolver="aprobar" data-fila="' + x.fila + '">Aprobar</button>' +
            '<button type="button" class="btn btn-sec" data-resolver="rechazar" data-fila="' + x.fila + '">Rechazar</button></div></div>';
        }).join('') +
        datosPend.map(function (x) {
          return '<div class="atencion-item sol"><div><div class="atencion-t">Datos de ' + esc(x.persona) + '</div>' +
            '<div class="atencion-d">' + esc(x.correo) + ' · tel. ' + esc(x.telefono) + (x.apodo ? ' · le dicen ' + esc(x.apodo) : '') +
            (x.nombreCorrecto ? ' · nombre correcto: ' + esc(x.nombreCorrecto) : '') + '<br>' + esc(x.motivo) + '</div></div>' +
            '<div class="sol-acc"><button type="button" class="btn ok" data-datos="aprobar" data-fila="' + x.fila + '">Aprobar</button>' +
            '<button type="button" class="btn btn-sec" data-datos="rechazar" data-fila="' + x.fila + '">Rechazar</button></div></div>';
        }).join('') + '</section>';
    }

    // Posibles choques (responsables): la misma persona con dos asignaciones a la misma hora
    if (choques.length) {
      h += '<details class="whatsapp choques-det"' + (estado.abrirChoques ? ' open' : '') + ' id="ch-det"><summary><span class="circulo ambar">!</span>' +
        '<span><span class="registrar-t">Posibles choques (' + choques.length + ')</span><span class="registrar-d">Misma persona con dos asignaciones a la misma hora</span></span></summary>' +
        choques.map(function (c) {
          var mias = c.items.filter(function (x) { return (u.editables || []).indexOf(x.programa) >= 0; });
          var mio = mias.filter(function (x) { return x.programa !== 'vmc' && x.programa !== 'finsemana'; })[0] || mias[0] || c.items[0];
          return '<div class="wa-item"><div class="atencion-t">' + esc(c.nombre) + '</div>' +
            '<div class="atencion-d">' + esc(mayuscula(cuando(c.fecha, hoy))) + ' · ' + c.items.map(function (x) {
              return esc(x.asignacion) + ' (' + esc(x.programaNombre) + (x.hora ? ', ' + esc(x.hora) : '') + ')';
            }).join(' y ') + '</div>' +
            '<div class="sol-acc"><button type="button" class="btn" data-reasignar="' + esc(mio.clave) + '" data-prog="' + esc(mio.programa) + '">Cambiar ' + esc(mio.asignacion) + '</button>' +
            '<button type="button" class="btn btn-sec" data-choque="' + esc(c.id) + '">Está bien así</button></div></div>';
        }).join('') + '</details>';
    }

    // Avisar por WhatsApp (responsables): asignaciones de personas sin correo
    var manual = d.avisarManual || [];
    if (manual.length) {
      h += '<details class="whatsapp"' + (estado.abrirWhatsapp ? ' open' : '') + ' id="wa-det"><summary><span class="circulo wa">' + svg('chat') + '</span>' +
        '<span><span class="registrar-t">Avisar por WhatsApp (' + manual.length + ')</span><span class="registrar-d">Asignaciones de hermanos sin correo</span></span></summary>' +
        manual.map(function (x) {
          var msj = mensajeAsignacion(x.nombre, x.asignacion, x.fecha, x.hora, x.programaNombre);
          return '<div class="wa-item"><div class="atencion-t">' + esc(x.nombre) + '</div>' +
            '<div class="atencion-d">' + esc(x.asignacion) + ' · ' + esc(cuando(x.fecha, hoy)) + (x.hora ? ' · ' + esc(x.hora) : '') + ' · ' + esc(x.programaNombre) + '</div>' +
            '<div class="sol-acc"><a class="btn wa" target="_blank" rel="noopener" href="' + esc(whatsappURL(x.telefono, msj)) + '">' + svg('chat') + (x.telefono ? 'WhatsApp' : 'WhatsApp (sin número)') + '</a>' +
            '<button type="button" class="btn btn-sec" data-marcar="Confirmado" data-clave="' + esc(x.clave) + '">Confirmó</button>' +
            '<button type="button" class="btn btn-sec" data-marcar="Rechazado" data-clave="' + esc(x.clave) + '">No puede</button></div></div>';
        }).join('') + '</details>';
    }

    // Informe mensual
    var inf = d.informe;
    if (inf && !inf.enviado) {
      h += '<button type="button" class="informe-aviso" id="abrir-informe"><span class="circulo">' + svg('libro') + '</span>' +
        '<span><span class="registrar-t">Envía tu informe de ' + esc(inf.mesNombre.split(' ')[0].toLowerCase()) + '</span>' +
        '<span class="registrar-d">Toca aquí para informar tu predicación del mes</span></span>' + SVG_CHEVRON + '</button>';
    }

    // Registro de predicación pendiente (capitanes)
    (d.registrosPendientes || []).forEach(function (g) {
      h += '<button type="button" class="registrar-aviso" data-registrar="' + esc(g.clave) + '">' +
        '<span class="circulo beige">' + svg('mapa') + '</span><span><span class="registrar-t">Registra lo trabajado</span>' +
        '<span class="registrar-d">Territorio ' + esc(g.territorios.join(' y ')) + ' · ' + esc(cuando(g.fecha, hoy)) + (g.lugar ? ' · ' + esc(g.lugar) : '') + '</span></span>' + SVG_CHEVRON + '</button>';
    });

    // Avisos (solo informativos, no se pueden tocar)
    var avisos = d.inicio.avisos || [];
    if (avisos.length) {
      h += '<section class="avisos" aria-label="Avisos">';
      avisos.forEach(function (a) {
        h += '<div class="aviso-item"><span class="circulo ' + (a.icono === 'megafono' ? 'beige' : 'teal') + '">' + svg(a.icono || 'megafono') + '</span>' +
          '<div><div class="aviso-t">' + esc(a.titulo) + '</div>' + (a.detalle ? '<div class="aviso-d">' + esc(a.detalle) + '</div>' : '') + '</div></div>';
      });
      h += '</section>';
    }

    // Activar notificaciones en este teléfono
    if (avisosDisponibles() && !avisosActivos()) {
      h += '<button type="button" class="activar-avisos" id="activar-avisos"><span class="circulo teal">' + svg('megafono') + '</span>' +
        '<span><span class="registrar-t">Activar avisos en este teléfono</span><span class="registrar-d">Te avisamos de nuevas asignaciones, el día anterior y lo que tengas pendiente.</span></span>' + SVG_CHEVRON + '</button>';
    }

    // Resumen personal
    var items = d.resumen || [];
    h += '<section class="resumen' + (items.length ? '' : ' vacio-r') + '" aria-labelledby="t-resumen">' +
      '<div class="resumen-cab"><span class="circulo teal">' + svg('calendario') + '</span>' +
      '<div><h2 id="t-resumen">Tus próximos 7 días</h2>' +
      (items.length ? '' : '<p class="resumen-vacio">No tienes asignaciones en los próximos 7 días.</p>') + '</div></div>';
    items.forEach(function (x) { h += itemResumenHTML(x, hoy); });
    h += '</section>';

    if (inf && inf.enviado) {
      h += '<div class="informe-ok">' + svg('check') + '<span>Informe de ' + esc(inf.mesNombre.split(' ')[0].toLowerCase()) + ' enviado</span>' +
        (inf.editable ? '<button type="button" class="enlace-boton" id="abrir-informe">Corregir</button>' : '') + '</div>';
    }

    // Programas por aprobar
    var porAprobar = [];
    d.programas.forEach(function (p) { (p.borradores || []).forEach(function (b) { porAprobar.push({ p: p, b: b }); }); });
    if (porAprobar.length) {
      h += '<section class="bloque"><h2>Por aprobar</h2><div class="aprobar-lista">';
      porAprobar.forEach(function (x) {
        var id = x.p.id + '|' + x.b.periodo;
        var confirmando = estado.confirmarAprobar === id;
        h += '<div class="aprobar">' +
          '<div><div class="aprobar-t">' + esc(x.p.nombre) + ' · ' + esc(x.b.periodo) + '</div>' +
          (x.b.desde ? '<div class="aprobar-d">Del ' + esc(fechaCorta(x.b.desde)) + ' al ' + esc(fechaCorta(x.b.hasta)) + '</div>' : '') +
          (x.b.avisos ? '<div class="aprobar-aviso">' + esc(x.b.avisos) + '</div>' : '') + '</div>' +
          '<div class="aprobar-acc"><a class="btn btn-sec" href="#p/' + esc(x.p.id) + '">Revisar</a>' +
          '<button class="btn" type="button" data-aprobar="' + esc(id) + '">' + (confirmando ? '¿Publicar? Sí, aprobar' : 'Aprobar') + '</button></div></div>';
      });
      h += '</div></section>';
    }

    // Programas
    var proximas = d.programas.map(function (p) { return { p: p, r: proximaDe(p, hoy) }; })
      .filter(function (x) { return x.r; })
      .sort(function (a, b) { return (a.r.fecha + (a.r.hora || '')).localeCompare(b.r.fecha + (b.r.hora || '')); });
    var destacada = proximas[0];
    h += '<section class="bloque"><h2>Programas</h2><nav class="mosaico" aria-label="Programas">';
    d.programas.forEach(function (p) {
      var prox = proximaDe(p, hoy);
      var sub = prox ? mayuscula(cuando(prox.fecha, hoy)) + (prox.hora ? ' · ' + prox.hora : '') : 'Sin fechas próximas';
      var activo = destacada && destacada.p.id === p.id;
      h += '<a class="baldosa' + (activo ? ' activa' : '') + '" href="#p/' + esc(p.id) + '">' +
        '<span class="baldosa-top"><span class="circulo">' + svg(p.icono) + '</span>' +
        (activo && prox.fecha === hoy ? '<span class="tag-hoy">Hoy</span>' : '') + SVG_CHEVRON + '</span>' +
        '<span class="baldosa-nombre">' + esc(p.nombre) + '</span>' +
        (prox && detalleBaldosa(p, prox) ? '<span class="baldosa-det">' + esc(detalleBaldosa(p, prox)) + '</span>' : '') +
        '<span class="baldosa-fecha">' + svg('calendario') + esc(sub) + '</span></a>';
    });
    if (d.documentos && d.documentos.noPasar) {
      h += '<a class="baldosa" href="#nopasar"><span class="baldosa-top"><span class="circulo beige">' + svg('alto') + '</span>' + SVG_CHEVRON + '</span>' +
        '<span class="baldosa-nombre">No pasar</span><span class="baldosa-det">Direcciones por territorio</span>' +
        '<span class="baldosa-fecha">' + svg('mapa') + 'Ver listado</span></a>';
    }
    if (d.documentos && d.documentos.mapa) {
      h += '<a class="baldosa" href="#mapa"><span class="baldosa-top"><span class="circulo">' + svg('plano') + '</span>' + SVG_CHEVRON + '</span>' +
        '<span class="baldosa-nombre">Mapa del territorio</span><span class="baldosa-det">PDF con todos los territorios</span>' +
        '<span class="baldosa-fecha">' + svg('mapa') + 'Abrir mapa</span></a>';
    }
    if (d.informe && d.informe.verGrupos) {
      h += '<a class="baldosa" href="#informes"><span class="baldosa-top"><span class="circulo">' + svg('grupo') + '</span>' + SVG_CHEVRON + '</span>' +
        '<span class="baldosa-nombre">Informes</span><span class="baldosa-det">De ' + esc(d.informe.mesNombre.split(' ')[0].toLowerCase()) + '</span>' +
        '<span class="baldosa-fecha">' + svg('calendario') + 'Quién falta</span></a>';
    }
    if (d.territorios && d.territorios.puedeVer) {
      h += '<a class="baldosa" href="#territorios"><span class="baldosa-top"><span class="circulo">' + svg('mapa') + '</span>' + SVG_CHEVRON + '</span>' +
        '<span class="baldosa-nombre">Territorios</span><span class="baldosa-det">Resumen de lo trabajado</span>' +
        '<span class="baldosa-fecha">' + svg('calendario') + 'Registrar y revisar</span></a>';
    }
    h += '</nav></section>';

    if (d.inicio.mensaje || d.inicio.direccion) {
      h += '<section class="tarjeta">' + (d.inicio.mensaje ? '<p class="mensaje">' + esc(d.inicio.mensaje) + '</p>' : '') +
        (d.inicio.direccion ? '<a class="mapa" target="_blank" rel="noopener" href="' + esc(d.inicio.comoLlegar || mapsURL('Salón del Reino ' + d.inicio.direccion)) + '">' + SVG_PIN + '<span><strong>Salón del Reino</strong><br>' + esc(d.inicio.direccion) +
          '</span><span class="mapa-ir">Cómo llegar</span></a>' : '') + '</section>';
    }
    var publicos = (d.enlaces || []).filter(function (l) { return !l.privilegiado; });
    var especiales = (d.enlaces || []).filter(function (l) { return l.privilegiado; });
    h += enlacesHTML('Enlaces', publicos) + enlacesHTML('Contenido especial', especiales);
    h += instalarHTML();
    h += '<p class="pie"><a href="#datos">Mis datos</a> · <a href="guia.html">Cómo usar la app</a>' + ((u.editables || []).length || (d.informe && d.informe.verGrupos) ? ' · <a href="guia-responsables.html">Guía para responsables</a>' : '') + '</p>';
    h += '<p class="pie">Conectado como ' + esc(u.nombre || '') + (u.rol ? ' · ' + esc(u.rol) : '') +
      ' · <button type="button" class="enlace-boton" id="salir">Salir</button><br>Actualizado ' +
      esc(new Date(d.generado).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })) + '</p>';
    h += PAISAJE;
    app.innerHTML = h;

    app.querySelectorAll('[data-responder]').forEach(function (b) {
      b.addEventListener('click', function () { responder(b.getAttribute('data-clave'), b.getAttribute('data-responder')); });
    });
    var waDet = document.getElementById('wa-det');
    if (waDet) waDet.addEventListener('toggle', function () { estado.abrirWhatsapp = waDet.open; });
    var chDet = document.getElementById('ch-det');
    if (chDet) chDet.addEventListener('toggle', function () { estado.abrirChoques = chDet.open; });
    app.querySelectorAll('[data-marcar]').forEach(function (b) {
      b.addEventListener('click', function () {
        b.disabled = true;
        api('estado', { clave: b.getAttribute('data-clave'), estado: b.getAttribute('data-marcar') }).then(function (r) {
          if (!r.ok) throw new Error(r.error);
          aviso(b.getAttribute('data-marcar') === 'Confirmado' ? 'Marcado como confirmado.' : 'Marcado como rechazado: queda para reasignar.');
          cargar();
        }).catch(function (e) { b.disabled = false; if (e.message !== 'sesion') aviso(e.message || 'No se pudo guardar.', true); });
      });
    });
    app.querySelectorAll('[data-datos]').forEach(function (b) {
      b.addEventListener('click', function () {
        b.disabled = true;
        api('resolverDatos', { fila: +b.getAttribute('data-fila'), decision: b.getAttribute('data-datos') }).then(function (r) {
          if (!r.ok) throw new Error(r.error);
          aviso(b.getAttribute('data-datos') === 'aprobar' ? 'Datos aprobados.' : 'Actualización rechazada.');
          cargar();
        }).catch(function (e) { b.disabled = false; if (e.message !== 'sesion') aviso(e.message || 'No se pudo guardar.', true); });
      });
    });
    app.querySelectorAll('[data-choque]').forEach(function (b) {
      b.addEventListener('click', function () {
        b.disabled = true;
        api('aceptarChoque', { id: b.getAttribute('data-choque') }).then(function (r) {
          if (!r.ok) throw new Error(r.error);
          d.choques = (d.choques || []).filter(function (c) { return c.id !== b.getAttribute('data-choque'); });
          render();
        }).catch(function (e) { b.disabled = false; if (e.message !== 'sesion') aviso(e.message || 'No se pudo guardar.', true); });
      });
    });
    app.querySelectorAll('[data-resolver]').forEach(function (b) {
      b.addEventListener('click', function () {
        b.disabled = true;
        api('resolverNoPasar', { fila: +b.getAttribute('data-fila'), decision: b.getAttribute('data-resolver') }).then(function (r) {
          if (!r.ok) throw new Error(r.error);
          aviso(b.getAttribute('data-resolver') === 'aprobar' ? 'Aprobada: se agregó al listado No pasar.' : 'Solicitud rechazada.');
          estado.noPasar = null;
          cargar();
        }).catch(function (e) { b.disabled = false; if (e.message !== 'sesion') aviso(e.message || 'No se pudo guardar.', true); });
      });
    });
    app.querySelectorAll('[data-reasignar]').forEach(function (b) {
      b.addEventListener('click', function () { estado.abrirClave = b.getAttribute('data-reasignar'); location.hash = 'p/' + b.getAttribute('data-prog'); });
    });
    app.querySelectorAll('[data-registrar]').forEach(function (b) {
      b.addEventListener('click', function () {
        var g = (d.registrosPendientes || []).filter(function (x) { return x.clave === b.getAttribute('data-registrar'); })[0];
        abrirRegistro(g);
      });
    });
    app.querySelectorAll('[data-cambiar]').forEach(function (b) {
      b.addEventListener('click', function () { estado.cambiando = b.getAttribute('data-cambiar'); render(); });
    });
    app.querySelectorAll('[data-aprobar]').forEach(function (b) {
      b.addEventListener('click', function () { aprobar(b.getAttribute('data-aprobar')); });
    });
    var bi2 = document.getElementById('abrir-informe');
    if (bi2) bi2.addEventListener('click', function () { abrirInforme(null); });
    var ba = document.getElementById('activar-avisos');
    if (ba) ba.addEventListener('click', function () { activarAvisos(true); });
    // Desde una notificación de informe pendiente
    if (location.hash === '#informe') {
      history.replaceState(null, '', location.pathname + location.search);
      if (d.informe && !d.informe.enviado) abrirInforme(null);
    }
    // Desde una notificación de registro pendiente
    if (location.hash === '#registrar') {
      history.replaceState(null, '', location.pathname + location.search);
      if ((d.registrosPendientes || []).length) abrirRegistro(d.registrosPendientes[0]);
    }
    var bs = document.getElementById('salir');
    if (bs) bs.addEventListener('click', function () { salir(); });
    var bi = document.getElementById('btn-instalar');
    if (bi) bi.addEventListener('click', function () {
      eventoInstalar.prompt();
      eventoInstalar.userChoice.finally(function () { eventoInstalar = null; render(); });
    });
  }

  // Línea pequeña bajo el nombre del programa: grupo de aseo, o lugar y territorio de la próxima salida
  function detalleBaldosa(p, r) {
    var asignados = [];
    r.secciones.forEach(function (s) { s.filas.forEach(function (f) { f.asignados.forEach(function (a) { asignados.push({ a: a, f: f }); }); }); });
    if (p.id === 'aseo') {
      var g = asignados.filter(function (x) { return x.a.grupo; })[0];
      return g ? g.a.nombre : '';
    }
    if (p.id === 'predicacion') {
      if (/grupo/i.test(r.titulo || '')) return 'Por grupos';
      var det = asignados[0] ? asignados[0].f.detalle || '' : '';
      var terr = /Territorio ([^·]+)/.exec(det);
      return [r.lugar, terr ? 'Terr. ' + terr[1].trim() : ''].filter(Boolean).join(' · ');
    }
    return '';
  }

  function itemResumenHTML(x, hoy) {
    var p = partes(x.fecha);
    var h = '<article class="mia"><div class="mia-fecha"><span class="ds">' + DIAS_CORTOS[diaSemana(x.fecha)] + '</span><span class="dn">' + p.d + '</span>' +
      '<span class="ms">' + MESES_CORTOS[p.m - 1] + '</span></div><div class="mia-cuerpo">' +
      '<div class="mia-prog">' + esc(x.programaNombre) + ' · ' + esc(cuando(x.fecha, hoy)) + (x.hora ? ' · ' + esc(x.hora) : '') + '</div>' +
      tituloResumen(x) +
      (x.lugar ? lugarResumen(x.lugar) : '');
    if (x.puedeResponder && (x.estado === 'Confirmado' || x.estado === 'Rechazado') && estado.cambiando !== x.clave) {
      h += '<div class="mia-acc">' + (x.estado === 'Confirmado'
        ? '<span class="estado ok">' + svg('check') + ' Confirmado</span>'
        : '<span class="estado rech">Avisaste que no puedes · el responsable fue notificado</span>') +
        '<button type="button" class="enlace-boton" data-cambiar="' + esc(x.clave) + '">Cambiar</button></div>';
    } else if (x.puedeResponder) {
      h += '<div class="mia-acc">' +
        '<button type="button" class="btn-resp si' + (x.estado === 'Confirmado' ? ' marcado' : '') + '" data-responder="Confirmado" data-clave="' + esc(x.clave) + '">' + svg('check') + 'Confirmo</button>' +
        '<button type="button" class="btn-resp no' + (x.estado === 'Rechazado' ? ' marcado' : '') + '" data-responder="Rechazado" data-clave="' + esc(x.clave) + '">No puedo</button></div>';
    }
    return h + '</div></article>';
  }

  // Título del resumen: la parte del programa cuando el rol es genérico ("Asignado", "Titular"…)
  function tituloResumen(x) {
    var generico = /^(asignado|titular|ayudante)$/i.test(x.rol);
    var corto = /^acomodaci[oó]n · /i.test(x.rol) ? 'Acomodación ' + x.rol.split(' · ')[1]
      : x.rol.indexOf(' · ') >= 0 ? x.rol.split(' · ').pop() : /^micr[oó]fonos$/i.test(x.rol) ? 'Micrófono' : x.rol;
    var principal = x.grupo ? 'Tu grupo (' + x.grupo + '): ' + x.rol : generico && x.parte ? x.parte : corto;
    var secundario = generico ? x.rol : x.parte && norm(x.rol).indexOf(norm(x.parte)) < 0 ? x.parte : '';
    if (x.sala) secundario = (secundario ? secundario + ' · ' : '') + x.sala;
    return '<div class="mia-rol">' + esc(principal) + '</div>' + (secundario ? '<div class="mia-parte">' + esc(secundario) + '</div>' : '');
  }

  function lugarResumen(lugar) {
    var z = estado.datos.inicio.zoom && estado.datos.inicio.zoom.predicacion;
    if (/zoom/i.test(lugar) && z) return '<a class="lugar lugar-link" target="_blank" rel="noopener" href="' + esc(z) + '">' + svg('video') + '<span>Entrar a Zoom</span></a>';
    if (/tel[eé]fono|cartas/i.test(lugar)) return '<div class="lugar">' + SVG_PIN + '<span>' + esc(lugar) + '</span></div>';
    return '<a class="lugar lugar-link" target="_blank" rel="noopener" href="' + esc(mapsURL(direccionMaps(lugar))) + '">' + SVG_PIN + '<span>' + esc(lugar) + '</span></a>';
  }

  function pastilla(e) {
    return '<span class="estado ' + (CLASE_ESTADO[e] || 'neutro') + '">' + esc(e) + '</span>';
  }

  function enlacesHTML(titulo, lista) {
    if (!lista.length) return '';
    var h = '<section class="bloque"><h2>' + esc(titulo) + '</h2><div class="enlaces">';
    lista.forEach(function (l) {
      h += '<a href="' + esc(l.url) + '" target="_blank" rel="noopener"><span><div class="t">' + esc(l.titulo) + '</div>' +
        (l.descripcion ? '<div class="d">' + esc(l.descripcion) + '</div>' : '') + '</span>' + SVG_CHEVRON + '</a>';
    });
    return h + '</div></section>';
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

  function responder(clave, respuesta) {
    var item = estado.datos.resumen.filter(function (x) { return x.clave === clave; })[0];
    var antes = item.estado;
    item.estado = respuesta;
    estado.cambiando = '';
    render();
    api('responder', { clave: clave, respuesta: respuesta }).then(function (r) {
      if (!r.ok) throw new Error(r.error);
      aviso(respuesta === 'Confirmado' ? 'Gracias, quedó confirmado.' : 'Listo. Se avisó al responsable del programa.');
    }).catch(function (e) {
      if (e.message === 'sesion') return;
      item.estado = antes;
      render();
      aviso(e.message && e.message !== 'red' ? e.message : 'No se pudo guardar. Revisa tu conexión.', true);
    });
  }

  function aprobar(id) {
    if (estado.confirmarAprobar !== id) { estado.confirmarAprobar = id; render(); return; }
    estado.confirmarAprobar = '';
    var p = id.split('|');
    aviso('Aprobando…');
    api('aprobar', { programa: p[0], periodo: p.slice(1).join('|') }).then(function (r) {
      if (!r.ok) throw new Error(r.error);
      aviso('Programa aprobado y publicado.');
      cargar();
    }).catch(function (e) { if (e.message !== 'sesion') aviso(e.message || 'No se pudo aprobar.', true); });
  }

  /* ---------- programa ---------- */
  function renderPrograma(prog) {
    var d = estado.datos, hoy = d.hoy || hoyISO();
    document.title = prog.nombre + ' · Cong. Los Romeros';
    var q = norm(estado.busqueda);

    var dias = [];
    prog.reuniones.forEach(function (r) {
      var ult = dias[dias.length - 1];
      if (ult && ult.fecha === r.fecha) ult.reuniones.push(r);
      else dias.push({ fecha: r.fecha, reuniones: [r] });
    });
    if (q) {
      dias = dias.map(function (x) {
        return { fecha: x.fecha, reuniones: x.reuniones.filter(function (r) { return reunionTiene(r, q); }) };
      }).filter(function (x) { return x.reuniones.length; });
    }
    var anteriores = dias.filter(function (x) { return x.fecha < hoy; });
    var visibles = estado.verAnteriores || q ? dias : dias.filter(function (x) { return x.fecha >= hoy; });
    var proxima = dias.filter(function (x) { return x.fecha >= hoy && x.reuniones.some(function (r) { return !r.borrador; }); })[0];

    var h = '<div class="barra"><div class="barra-top">' +
      '<button class="volver" type="button" id="volver">' + SVG_ATRAS + 'Inicio</button>' +
      '<h1>' + esc(prog.nombre) + '</h1></div>' +
      '<label class="buscar">' + SVG_LUPA +
      '<input id="buscar" type="search" placeholder="Buscar un nombre" autocomplete="off" value="' + esc(estado.busqueda) + '" aria-label="Buscar un nombre"></label></div>';

    var zoom = d.inicio.zoom && d.inicio.zoom[prog.id];
    if (zoom) h += '<a class="zoom" href="' + esc(zoom) + '" target="_blank" rel="noopener">' + svg('video') + '<span>Conectarse por Zoom</span>' + SVG_CHEVRON + '</a>';
    if (estado.sinConexion) h += '<div class="estado-red">Sin conexión. Estás viendo los últimos datos guardados.</div>';
    if (d.estados) {
      h += '<p class="leyenda"><span><i class="punto ok"></i> Confirmado</span><span><i class="punto pend"></i> Pendiente</span>' +
        '<span><i class="punto rech"></i> Rechazado</span><span><i class="punto manual"></i> Avisar a mano</span></p>';
    }
    if (prog.editable) h += '<p class="ayuda-editar">Toca un nombre para cambiar el asignado o su estado.</p>';
    if (anteriores.length && !estado.verAnteriores && !q) {
      h += '<button class="btn btn-sec" type="button" id="anteriores">Ver fechas anteriores (' + anteriores.length + ')</button>';
    }
    if (!visibles.length) {
      h += '<p class="vacio">' + (q ? 'No hay asignaciones para «' + esc(estado.busqueda) + '».' : 'Aún no hay un programa publicado con fechas próximas.') + '</p>';
    }
    var mesActual = '';
    visibles.forEach(function (x) {
      var p = partes(x.fecha);
      var mes = MESES[p.m - 1] + ' ' + p.a;
      if (mes !== mesActual) { h += '<h2 class="mes">' + esc(mes) + '</h2>'; mesActual = mes; }
      var clase = 'dia' + (x.fecha < hoy ? ' pasado' : '') + (proxima && x.fecha === proxima.fecha ? ' proximo' : '');
      h += '<article class="' + clase + '">' +
        '<div class="fecha"><span class="ds">' + DIAS_CORTOS[diaSemana(x.fecha)] + '</span><span class="dn">' + p.d + '</span>' +
        '<span class="ms">' + MESES_CORTOS[p.m - 1] + '</span>' +
        (x.fecha === hoy ? '<span class="tag">Hoy</span>' : proxima && x.fecha === proxima.fecha ? '<span class="tag">Próxima</span>' : '') +
        '</div><div class="reuniones">' + x.reuniones.map(function (r) { return reunionHTML(r, q, prog); }).join('') + '</div></article>';
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
    app.querySelectorAll('[data-editar]').forEach(function (b) {
      b.addEventListener('click', function () { abrirEditor(prog, b.getAttribute('data-editar')); });
    });
    if (estado.abrirClave) {
      var c = estado.abrirClave;
      estado.abrirClave = '';
      var el = app.querySelector('[data-editar="' + c.replace(/"/g, '') + '"]');
      if (el) el.scrollIntoView({ block: 'center' });
      abrirEditor(prog, c);
    }
  }

  function reunionTiene(r, q) {
    return r.secciones.some(function (s) {
      return s.filas.some(function (f) { return f.asignados.some(function (a) { return norm(a.nombre).indexOf(q) >= 0; }); });
    });
  }

  function reunionHTML(r, q, prog) {
    var h = '<div class="reunion"><div class="reunion-cab"><span class="t">' + esc(r.titulo || '') + '</span>' +
      (r.hora ? '<span class="h">' + esc(r.hora) + ' h</span>' : '') +
      (r.borrador ? '<span class="estado neutro">Borrador · ' + esc(r.periodo) + '</span>' : '') + '</div>';
    if (r.lugar) {
      var esDireccion = !/zoom|tel[eé]fono|cartas/i.test(r.lugar);
      var zoomPred = /zoom/i.test(r.lugar) && estado.datos.inicio.zoom && estado.datos.inicio.zoom.predicacion;
      if (zoomPred) h += '<a class="lugar lugar-link" target="_blank" rel="noopener" href="' + esc(zoomPred) + '">' + svg('video') + '<span>' + esc(r.lugar) + ' · Entrar</span></a>';
      else h += esDireccion
        ? '<a class="lugar lugar-link" target="_blank" rel="noopener" href="' + esc(mapsURL(direccionMaps(r.lugar))) + '">' + SVG_PIN + '<span>' + esc(r.lugar) + '</span></a>'
        : '<div class="lugar">' + SVG_PIN + '<span>' + esc(r.lugar) + '</span></div>';
    }
    if (r.nota) h += '<div class="nota">' + esc(r.nota) + '</div>';
    if (prog.id === 'predicacion' && estado.datos.documentos && estado.datos.documentos.noPasar) {
      var terrs = [];
      r.secciones.forEach(function (s) { s.filas.forEach(function (f) {
        var m = /Territorio ([^·]+)/.exec(f.detalle || '');
        if (m) terrs = terrs.concat((m[1].match(/\d+/g) || []));
      }); });
      terrs.forEach(function (t) { h += '<a class="nopasar-link" href="#nopasar/' + esc(t) + '">' + svg('alto') + 'No pasar del territorio ' + esc(t) + '</a>'; });
    }
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
        h += nombresHTML(f, q, prog) + '</div>';
      });
      h += '</div>';
    });
    return h + '</div>';
  }

  function nombresHTML(f, q, prog) {
    if (!f.asignados.length) return '<div class="nombres"><span class="sin-nombre">—</span></div>';
    var conSala = f.asignados.some(function (a) { return a.sala === 'Sala auxiliar'; });
    if (!conSala) return '<div class="nombres">' + f.asignados.map(function (a) { return personaHTML(a, q, prog); }).join('') + '</div>';
    var grupo = function (aux) {
      var lista = f.asignados.filter(function (a) { return (a.sala === 'Sala auxiliar') === aux; });
      if (!lista.length) return '';
      return '<div class="sala' + (aux ? ' aux' : '') + '"><span class="sala-t">' + (aux ? 'Sala auxiliar' : 'Sala principal') + '</span>' +
        '<div class="nombres">' + lista.map(function (a) { return personaHTML(a, q, prog); }).join('') + '</div></div>';
    };
    return '<div class="salas">' + grupo(false) + grupo(true) + '</div>';
  }

  function personaHTML(a, q, prog) {
    var d = estado.datos, yo = d.usuario && d.usuario.nombre;
    var extra = [];
    if (a.rol === 'Ayudante') extra.push('ayudante');
    var clase = 'persona' + ((q && norm(a.nombre).indexOf(q) >= 0) || (yo && norm(a.nombre) === norm(yo)) ? ' resaltado' : '');
    var est = d.estados && a.clave ? d.estados[a.clave] : '';
    var choque = prog.editable && a.clave ? choqueDe(a.clave) : null;
    if (choque) clase += ' con-choque';
    var contenido = (choque ? '<span class="aviso-choque" title="' + esc('También tiene ' + choque) + '">!</span>' : '') +
      esc(a.nombre) + (extra.length ? '<small>' + esc(extra.join(' · ')) + '</small>' : '') +
      (est && est !== 'Sin confirmación' && est !== 'Borrador' ? ' <i class="punto ' + (CLASE_ESTADO[est] || 'neutro') + '" title="' + esc(est) + '"></i>' : '');
    var enc = a.sub ? '<span class="encargados">' + esc(a.sub) + '</span>' : '';
    if (prog.editable && a.clave) {
      return '<span class="persona-bloque"><button type="button" class="' + clase + ' editable" data-editar="' + esc(a.clave) + '">' + contenido + '</button>' + enc + '</span>';
    }
    return '<span class="persona-bloque"><span class="' + clase + '">' + contenido + '</span>' + enc + '</span>';
  }

  /** Si la asignación está en un choque, describe la otra: "Video (Acomodación, 19:30)". */
  function choqueDe(clave) {
    var c = (estado.datos.choques || []).filter(function (c) { return c.items.some(function (x) { return x.clave === clave; }); })[0];
    if (!c) return null;
    return c.items.filter(function (x) { return x.clave !== clave; }).map(function (x) { return x.asignacion + ' (' + x.programaNombre + ')'; }).join(' y ');
  }

  function haceCuanto(iso, hoy) {
    if (!iso) return 'aún no la ha hecho';
    var dias = Math.round((Date.UTC(partes(hoy).a, partes(hoy).m - 1, partes(hoy).d) - Date.UTC(partes(iso).a, partes(iso).m - 1, partes(iso).d)) / 86400000);
    if (dias < 0) return 'la tiene el ' + fechaCorta(iso);
    if (dias < 7) return 'la hizo hace ' + dias + (dias === 1 ? ' día' : ' días');
    var sem = Math.round(dias / 7);
    return 'la hizo hace ' + sem + (sem === 1 ? ' semana' : ' semanas');
  }

  /* ---------- edición (con privilegios) ---------- */
  function buscarAsignado(prog, clave) {
    var out = null;
    prog.reuniones.forEach(function (r) {
      r.secciones.forEach(function (s) { s.filas.forEach(function (f) { f.asignados.forEach(function (a) {
        if (a.clave === clave) out = { r: r, f: f, a: a };
      }); }); });
    });
    return out;
  }

  function abrirEditor(prog, clave) {
    var x = buscarAsignado(prog, clave);
    if (!x) return;
    var d = estado.datos, est = (d.estados || {})[clave] || '';
    var opciones = ESTADOS_EDITABLES.map(function (e) { return '<option' + (e === est ? ' selected' : '') + '>' + esc(e) + '</option>'; }).join('');
    var cont = document.createElement('div');
    cont.className = 'editor-fondo';
    cont.innerHTML =
      '<form class="editor" role="dialog" aria-modal="true" aria-labelledby="ed-t">' +
      '<div class="editor-cab"><div id="ed-t" class="editor-t">' + esc(x.f.texto || x.a.rol) + '</div>' +
      '<div class="editor-d">' + esc(fechaLarga(x.r.fecha)) + (x.r.hora ? ' · ' + esc(x.r.hora) : '') + ' · ' + esc(x.a.rol) + '</div></div>' +
      '<label for="ed-nombre">Asignado</label>' +
      '<input id="ed-nombre" list="ed-personas" value="' + esc(x.a.nombre) + '" autocomplete="off">' +
      '<datalist id="ed-personas">' + (d.personas || []).map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' +
      (choqueDe(clave) ? '<p class="editor-choque">⚠ ' + esc(primerNombre(x.a.nombre)) + ' también tiene ' + esc(choqueDe(clave)) + ' a esa hora.</p>' : '') +
      (x.a.grupo ? '' : '<div class="sugerencias" id="ed-sug"><span class="sug-t">Buscando a quién sugerir…</span></div>') +
      (est && est !== 'Borrador' ? '<label for="ed-estado">Estado</label><select id="ed-estado">' + opciones + '</select>' : '') +
      ((d.telefonos || {})[x.a.nombre] ? '<a class="btn wa" target="_blank" rel="noopener" href="' + esc(whatsappURL(d.telefonos[x.a.nombre],
        mensajeAsignacion(x.a.nombre, x.f.texto && !/^(asignado|titular|ayudante)$/i.test(x.a.rol) ? x.a.rol : (x.f.texto || x.a.rol).replace(/^\d+\.\s*/, '').replace(/\s*\(\d+ ?mins?\.?\)/i, ''), x.r.fecha, x.r.hora, prog.nombre))) + '">' + svg('chat') + 'Escribir por WhatsApp a ' + esc(primerNombre(x.a.nombre)) + '</a>' : '') +
      '<p class="editor-nota">Si cambias el nombre, también se cambia en la hoja oficial del programa y la asignación vuelve a quedar pendiente.</p>' +
      '<p class="editor-msg" id="ed-msg" role="status"></p>' +
      '<div class="editor-acc"><button type="button" class="btn btn-sec" id="ed-cancelar">Cancelar</button><button type="submit" class="btn" id="ed-guardar">Guardar</button></div>' +
      '</form>';
    document.body.appendChild(cont);
    var cerrar = function () { cont.remove(); };
    cont.addEventListener('click', function (e) { if (e.target === cont) cerrar(); });
    document.getElementById('ed-cancelar').addEventListener('click', cerrar);
    cont.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var nombre = document.getElementById('ed-nombre').value.trim();
      var sel = document.getElementById('ed-estado');
      var nuevoEstado = sel ? sel.value : est;
      var msg = document.getElementById('ed-msg');
      var pedido;
      if (nombre && nombre !== x.a.nombre) pedido = api('asignar', { clave: clave, nombre: nombre });
      else if (nuevoEstado !== est) pedido = api('estado', { clave: clave, estado: nuevoEstado });
      else { cerrar(); return; }
      document.getElementById('ed-guardar').disabled = true;
      msg.textContent = 'Guardando…';
      pedido.then(function (r) {
        if (!r.ok) throw new Error(r.error);
        cerrar();
        aviso(r.aviso || 'Cambio guardado.', !!r.aviso);
        cargar();
      }).catch(function (err) {
        if (err.message === 'sesion') { cerrar(); return; }
        msg.textContent = err.message && err.message !== 'red' ? err.message : 'No se pudo guardar. Revisa tu conexión.';
        document.getElementById('ed-guardar').disabled = false;
      });
    });
    if (!x.a.grupo) {
      var cajaSug = document.getElementById('ed-sug');
      api('sugerencias', { clave: clave }).then(function (r) {
        if (!r.ok) throw new Error(r.error);
        if (!r.sugerencias.length) { cajaSug.innerHTML = '<span class="sug-t">Sin sugerencias: nadie más ha tenido esta asignación todavía, o todos tienen algo a esa hora.</span>'; return; }
        var hoy = d.hoy || hoyISO();
        cajaSug.innerHTML = '<span class="sug-t">Sugerencias (lleva más tiempo sin ' + esc(r.tipo ? r.tipo.toLowerCase() : 'esta asignación') + ')</span>' +
          r.sugerencias.map(function (sg) {
            return '<button type="button" class="sug" data-sug="' + esc(sg.nombre) + '"><span class="sug-n">' + esc(sg.nombre) + '</span>' +
              '<span class="sug-d">' + esc(haceCuanto(sg.ultima, hoy)) + (sg.proxima ? ' · próxima: ' + esc(fechaCorta(sg.proxima)) : '') + '</span></button>';
          }).join('');
        cajaSug.querySelectorAll('[data-sug]').forEach(function (b) {
          b.addEventListener('click', function () {
            document.getElementById('ed-nombre').value = b.getAttribute('data-sug');
            cajaSug.querySelectorAll('.sug').forEach(function (o) { o.classList.toggle('elegida', o === b); });
          });
        });
      }).catch(function (e) { if (cajaSug) cajaSug.innerHTML = e.message === 'sesion' ? '' : '<span class="sug-t">No se pudieron cargar sugerencias.</span>'; });
    }
    document.getElementById('ed-nombre').focus();
  }

  /* ---------- registro de predicación (capitanes) ---------- */
  function abrirRegistro(pend) {
    var d = estado.datos, mz = (d.territorios && d.territorios.manzanas) || {};
    var terrs = Object.keys(mz).sort(function (a, b) { return +a - +b; });
    var terr = pend && pend.territorios[0] ? pend.territorios[0] : terrs[0];
    var cont = document.createElement('div');
    cont.className = 'editor-fondo';
    cont.innerHTML =
      '<form class="editor" role="dialog" aria-modal="true" aria-labelledby="rg-t">' +
      '<div class="editor-cab"><div id="rg-t" class="editor-t">Registrar predicación</div>' +
      '<div class="editor-d">' + (pend ? esc(pend.lugar || '') : 'Lo que se trabajó del territorio') + '</div></div>' +
      '<div class="rg-fila"><div><label for="rg-fecha">Fecha</label><input id="rg-fecha" type="date" value="' + esc(pend ? pend.fecha : hoyISO()) + '" max="' + hoyISO() + '" required></div>' +
      '<div><label for="rg-terr">Territorio</label><select id="rg-terr">' + terrs.map(function (t) { return '<option' + (t === terr ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></div></div>' +
      '<label>Manzanas trabajadas</label><div class="manzanas" id="rg-mz"></div>' +
      '<label class="rg-check"><input type="checkbox" id="rg-no"> No se predicó</label>' +
      '<label for="rg-notas">Notas</label><textarea id="rg-notas" rows="3" placeholder="Opcional"></textarea>' +
      '<p class="editor-msg" id="rg-msg" role="status"></p>' +
      '<div class="editor-acc"><button type="button" class="btn btn-sec" id="rg-cancelar">Cancelar</button><button type="submit" class="btn" id="rg-guardar">Guardar</button></div></form>';
    document.body.appendChild(cont);
    var pintar = function () {
      var t = document.getElementById('rg-terr').value;
      document.getElementById('rg-mz').innerHTML = (mz[t] || []).map(function (m) {
        return '<label class="mz"><input type="checkbox" value="' + esc(m) + '"><span>' + esc(m) + '</span></label>';
      }).join('') || '<span class="sin-nombre">Sin manzanas registradas</span>';
    };
    pintar();
    document.getElementById('rg-terr').addEventListener('change', pintar);
    document.getElementById('rg-no').addEventListener('change', function (e) { document.getElementById('rg-mz').classList.toggle('apagado', e.target.checked); });
    var cerrar = function () { cont.remove(); };
    cont.addEventListener('click', function (e) { if (e.target === cont) cerrar(); });
    document.getElementById('rg-cancelar').addEventListener('click', cerrar);
    cont.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = document.getElementById('rg-msg');
      var datos = {
        fecha: document.getElementById('rg-fecha').value,
        territorio: document.getElementById('rg-terr').value,
        manzanas: Array.prototype.map.call(cont.querySelectorAll('#rg-mz input:checked'), function (i) { return i.value; }),
        noSePredico: document.getElementById('rg-no').checked,
        notas: document.getElementById('rg-notas').value
      };
      if (!datos.noSePredico && !datos.manzanas.length) { msg.textContent = 'Marca las manzanas trabajadas, o indica que no se predicó.'; return; }
      document.getElementById('rg-guardar').disabled = true;
      msg.textContent = 'Guardando…';
      api('registrar', datos).then(function (r) {
        if (!r.ok) throw new Error(r.error);
        cerrar();
        aviso('Registro guardado. ¡Gracias!');
        estado.territoriosDatos = null;
        cargar();
      }).catch(function (err) {
        if (err.message === 'sesion') { cerrar(); return; }
        msg.textContent = err.message && err.message !== 'red' ? err.message : 'No se pudo guardar. Revisa tu conexión.';
        document.getElementById('rg-guardar').disabled = false;
      });
    });
  }

  /* ---------- resumen de territorios ---------- */
  function renderTerritorios() {
    document.title = 'Territorios · Cong. Los Romeros';
    var h = '<div class="barra"><div class="barra-top"><button class="volver" type="button" id="volver">' + SVG_ATRAS + 'Inicio</button>' +
      '<h1>Territorios</h1></div>' +
      '<label class="buscar">' + SVG_LUPA + '<input id="buscar-t" type="search" inputmode="numeric" placeholder="Buscar territorio" autocomplete="off" value="' + esc(estado.buscarTerr || '') + '" aria-label="Buscar territorio"></label></div>';
    h += '<div class="filtros" role="group" aria-label="Filtrar">' + [['todos', 'Todos'], ['pendientes', 'Con pendientes del mes'], ['antiguos', 'Sin trabajar +30 días']].map(function (f) {
      return '<button type="button" class="filtro' + ((estado.filtroTerr || 'todos') === f[0] ? ' activo' : '') + '" data-filtro="' + f[0] + '">' + f[1] + '</button>';
    }).join('') + '</div>';
    h += '<button type="button" class="btn" id="registrar-nuevo">Registrar predicación</button>';
    var t = estado.territoriosDatos;
    if (!t) {
      h += '<p class="vacio">Cargando territorios…</p>';
      app.innerHTML = h;
      enlazarTerritorios();
      api('territorios').then(function (r) {
        if (!r.ok) throw new Error(r.error);
        estado.territoriosDatos = r;
        if (location.hash === '#territorios') renderTerritorios();
      }).catch(function (e) { if (e.message !== 'sesion') aviso(e.message || 'No se pudo cargar.', true); });
      return;
    }
    var hoy = t.hoy, q = String(estado.buscarTerr || '').replace(/\D/g, ''), f = estado.filtroTerr || 'todos';
    var diasDesde = function (iso) { return iso ? Math.round((Date.parse(hoy) - Date.parse(iso)) / 864e5) : null; };
    var lista = t.territorios.filter(function (x) {
      if (q && x.territorio !== q) return false;
      if (f === 'pendientes') return x.pendientesMes.length > 0;
      if (f === 'antiguos') { var dd = diasDesde(x.ultima); return dd === null || dd > 30; }
      return true;
    });
    var mesNombre = function (ym) { return MESES[+ym.slice(5, 7) - 1]; };
    if (!lista.length) h += '<p class="vacio">No hay territorios con ese filtro.</p>';
    lista.forEach(function (x) {
      var dd = diasDesde(x.ultima);
      var pct = x.manzanas.length ? Math.round(100 * x.trabajadasMes.length / x.manzanas.length) : 0;
      h += '<article class="terr">' +
        '<div class="terr-cab"><span class="terr-n">' + esc(x.territorio) + '</span><div><div class="terr-t">Territorio ' + esc(x.territorio) + '</div>' +
        '<div class="terr-u' + (dd === null || dd > 30 ? ' viejo' : '') + '">' + (x.ultima ? 'Última vez: ' + esc(fechaCorta(x.ultima)) + ' · hace ' + dd + ' día' + (dd === 1 ? '' : 's') : 'Sin registros') + '</div></div></div>' +
        '<div class="terr-barra" role="img" aria-label="' + x.trabajadasMes.length + ' de ' + x.manzanas.length + ' manzanas este mes"><span style="width:' + pct + '%"></span></div>' +
        '<div class="terr-cifra">' + x.trabajadasMes.length + ' de ' + x.manzanas.length + ' manzanas en ' + esc(mesNombre(t.mesActual)) + '</div>' +
        (x.pendientesMes.length ? '<div class="terr-l"><span>Pendientes del mes</span>' + esc(x.pendientesMes.join(', ')) + '</div>' : '<div class="terr-l ok">Completo este mes</div>') +
        (x.noTrabajadasMesAnterior.length ? '<div class="terr-l"><span>No trabajadas en ' + esc(mesNombre(t.mesAnterior)) + '</span>' + esc(x.noTrabajadasMesAnterior.join(', ')) + '</div>' : '') +
        (x.historial.length ? '<details class="terr-h"><summary>Historial (' + x.historial.length + ')</summary>' + x.historial.map(function (g) {
          return '<div class="terr-hi"><span class="f">' + esc(fechaCorta(g.fecha)) + '</span><span>' + esc(g.manzanas || '—') + (g.notas ? '<small>' + esc(g.notas) + '</small>' : '') + '</span></div>';
        }).join('') + '</details>' : '') +
        '</article>';
    });
    app.innerHTML = h;
    enlazarTerritorios();
  }

  function enlazarTerritorios() {
    document.getElementById('volver').addEventListener('click', function () { location.hash = ''; });
    app.querySelectorAll('[data-filtro]').forEach(function (b) {
      b.addEventListener('click', function () { estado.filtroTerr = b.getAttribute('data-filtro'); renderTerritorios(); });
    });
    var bq = document.getElementById('buscar-t');
    bq.addEventListener('input', function () {
      estado.buscarTerr = bq.value;
      renderTerritorios();
      var n = document.getElementById('buscar-t'); n.focus();
    });
    document.getElementById('registrar-nuevo').addEventListener('click', function () { abrirRegistro(null); });
  }

  /* ---------- Mis datos / registro ---------- */
  function renderDatos(primeraVez) {
    document.title = 'Mis datos · Cong. Los Romeros';
    app.innerHTML = '<section class="login datos-pantalla"><div class="login-marca">' + svg('calendario', ' class="hero-logo"') + '<span>Cong. Los Romeros</span></div>' +
      '<p class="cargando-datos">Cargando…</p></section>';
    api('misDatos').then(function (r) {
      if (!r.ok) throw new Error(r.error);
      var nuevo = !r.registrado;
      var h = '<section class="login datos-pantalla"><div class="login-marca">' + svg('calendario', ' class="hero-logo"') + '<span>Cong. Los Romeros</span></div>' +
        '<h1>' + (nuevo ? 'Completa tus datos' : 'Mis datos') + '</h1>' +
        '<p>' + (nuevo ? 'Es la primera vez que entras con <strong>' + esc(r.correo) + '</strong>. Confirma quién eres para quedar registrado.' : 'Revisa que tus datos estén bien. Entras con ' + esc(r.correo) + '.') + '</p>' +
        '<form class="datos-form" id="datos-form">' +
        (nuevo
          ? '<label for="dt-nombre">Busca y elige tu nombre</label><input id="dt-nombre" list="dt-lista" autocomplete="off" placeholder="Escribe tu nombre o apellido" required>' +
            '<datalist id="dt-lista">' + r.nombres.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>'
          : '<label>Tu nombre en los programas</label><div class="dt-fijo">' + esc(r.nombre) + '</div>') +
        '<label class="dt-check"><input type="checkbox" id="dt-corregir"> Mi nombre se escribe distinto</label>' +
        '<div id="dt-correcto-c" hidden><label for="dt-correcto">Nombre completo correcto</label><input id="dt-correcto" autocomplete="name" placeholder="Nombre y apellido, como quieres que aparezca"></div>' +
        '<label for="dt-apodo">¿Cómo te gusta que te llamen?</label><input id="dt-apodo" autocomplete="nickname" placeholder="Opcional, por ejemplo: Pepe" value="' + esc(r.apodo || '') + '">' +
        '<label for="dt-tel">Teléfono con WhatsApp</label><input id="dt-tel" type="tel" inputmode="tel" autocomplete="tel" placeholder="+56 9 1234 5678" value="' + esc(r.telefono || '') + '" required>' +
        '<p class="login-error" id="dt-msg" role="alert" hidden></p>' +
        '<button type="submit" class="btn" id="dt-enviar">' + (nuevo ? 'Confirmar y entrar' : 'Guardar') + '</button>' +
        (nuevo ? '<button type="button" class="enlace-boton" id="dt-salir">Entrar con otra cuenta</button>' : '<a class="enlace-boton" href="#">Volver</a>') +
        '</form></section>';
      app.innerHTML = h;
      document.getElementById('dt-corregir').addEventListener('change', function (e) { document.getElementById('dt-correcto-c').hidden = !e.target.checked; });
      var bs = document.getElementById('dt-salir');
      if (bs) bs.addEventListener('click', function () { salir(); });
      document.getElementById('datos-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = document.getElementById('dt-msg');
        var nombre = nuevo ? document.getElementById('dt-nombre').value.trim() : r.nombre;
        if (nuevo && r.nombres.indexOf(nombre) < 0) { msg.hidden = false; msg.textContent = 'Elige tu nombre tal como aparece en la lista. Si no estás, habla con un anciano.'; return; }
        var datos = {
          nombre: nombre,
          nombreCorrecto: document.getElementById('dt-corregir').checked ? document.getElementById('dt-correcto').value.trim() : '',
          apodo: document.getElementById('dt-apodo').value.trim(),
          telefono: document.getElementById('dt-tel').value.trim()
        };
        document.getElementById('dt-enviar').disabled = true;
        msg.hidden = true;
        api('actualizarDatos', datos).then(function (res) {
          if (!res.ok) throw new Error(res.error);
          if (nuevo && res.registrado) {
            guardar(CLAVE_SESION, estado.token);
            aviso('¡Listo! Ya estás registrado.');
            location.hash = '';
            cargar();
          } else if (nuevo) {
            app.innerHTML = '<section class="login"><h1>¡Gracias!</h1><p>Recibimos tus datos. Un anciano los confirmará pronto y te avisaremos para que puedas entrar.</p>' +
              '<button type="button" class="btn" id="dt-ok">Entendido</button></section>';
            document.getElementById('dt-ok').addEventListener('click', function () { salir(); });
          } else {
            aviso(res.estado === 'Pendiente' ? 'Guardado. El cambio de nombre lo revisará un anciano.' : 'Tus datos quedaron guardados.');
            location.hash = '';
            cargar();
          }
        }).catch(function (err) {
          if (err.message === 'sesion') return;
          msg.hidden = false;
          msg.textContent = err.message && err.message !== 'red' ? err.message : 'No se pudo guardar. Revisa tu conexión.';
          document.getElementById('dt-enviar').disabled = false;
        });
      });
    }).catch(function (e) {
      if (e.message === 'sesion') return;
      app.innerHTML = '<section class="login"><p class="login-error">' + esc(e.message || 'No se pudo cargar.') + '</p></section>';
    });
  }

  /* ---------- informe mensual ---------- */
  // para = { nombre, informe } cuando un superintendente ingresa el de otra persona; null = el propio
  function abrirInforme(para, mesOtro, alGuardar) {
    var d = estado.datos, inf = d.informe || {};
    var previo = para ? para.informe : inf.enviado;
    var mes = mesOtro || inf.mes;
    var mesNom = mesOtro ? (estado.informesDatos && estado.informesDatos.mesNombre) || mesOtro : inf.mesNombre;
    var servicio = (previo && previo.servicio) || (para ? 'Publicador' : inf.servicio) || 'Publicador';
    var participo = previo ? String(previo.participo || 'Sí') : 'Sí';
    var cont = document.createElement('div');
    cont.className = 'editor-fondo';
    cont.innerHTML =
      '<form class="editor" role="dialog" aria-modal="true" aria-labelledby="if-t">' +
      '<div class="editor-cab"><div id="if-t" class="editor-t">Informe de ' + esc(mesNom) + '</div>' +
      '<div class="editor-d">' + esc(para ? para.nombre : d.usuario.nombre) + '</div></div>' +
      '<label for="if-serv">Servicio</label><select id="if-serv">' + ['Publicador', 'Precursor Auxiliar', 'Precursor Regular'].map(function (x) {
        return '<option' + (x === servicio ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>' +
      '<label>¿Participó en el ministerio?</label><div class="si-no">' +
      '<label class="mz"><input type="radio" name="if-part" value="Sí"' + (/^s/i.test(participo) ? ' checked' : '') + '><span>Sí</span></label>' +
      '<label class="mz"><input type="radio" name="if-part" value="No"' + (/^n/i.test(participo) ? ' checked' : '') + '><span>No</span></label></div>' +
      '<div class="rg-fila"><div><label for="if-est">Estudios bíblicos</label><input id="if-est" type="number" min="0" max="99" inputmode="numeric" value="' + esc(previo && previo.estudios !== '' && previo.estudios != null ? previo.estudios : 0) + '"></div>' +
      '<div id="if-horas-c"><label for="if-horas">Horas</label><input id="if-horas" type="number" min="0" max="300" step="0.5" inputmode="decimal" value="' + esc(previo && previo.horas ? previo.horas : '') + '"></div></div>' +
      '<div id="if-otros-c"><label for="if-otros">Horas otros servicios</label><input id="if-otros" type="number" min="0" max="300" step="0.5" inputmode="decimal" placeholder="Ej.: LDC, Escuela de precursores" value="' + esc(previo && previo.otros ? previo.otros : '') + '"></div>' +
      '<label for="if-com" id="if-com-l">Comentarios</label><textarea id="if-com" rows="2" placeholder="Opcional">' + esc(previo ? previo.comentarios || '' : '') + '</textarea>' +
      '<p class="editor-msg" id="if-msg" role="status"></p>' +
      '<div class="editor-acc"><button type="button" class="btn btn-sec" id="if-cancelar">Cancelar</button><button type="submit" class="btn" id="if-guardar">Enviar informe</button></div></form>';
    document.body.appendChild(cont);
    var horasVisibles = function () {
      var serv = document.getElementById('if-serv').value;
      document.getElementById('if-horas-c').hidden = !/precursor/i.test(serv);
      document.getElementById('if-otros-c').hidden = serv !== 'Precursor Regular';
      var pideNota = serv === 'Precursor Regular' && +document.getElementById('if-otros').value > 0;
      document.getElementById('if-com-l').textContent = pideNota ? 'Comentarios (indica a qué corresponden las horas de otros servicios)' : 'Comentarios';
      document.getElementById('if-com').placeholder = pideNota ? 'Ej.: 20 h LDC' : 'Opcional';
    };
    horasVisibles();
    document.getElementById('if-serv').addEventListener('change', horasVisibles);
    document.getElementById('if-otros').addEventListener('input', horasVisibles);
    var cerrar = function () { cont.remove(); };
    cont.addEventListener('click', function (e) { if (e.target === cont) cerrar(); });
    document.getElementById('if-cancelar').addEventListener('click', cerrar);
    cont.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = document.getElementById('if-msg');
      var datos = {
        mes: mes, nombre: para ? para.nombre : '',
        servicio: document.getElementById('if-serv').value,
        participo: (cont.querySelector('input[name="if-part"]:checked') || {}).value || 'Sí',
        estudios: document.getElementById('if-est').value,
        horas: document.getElementById('if-horas').value,
        otros: document.getElementById('if-serv').value === 'Precursor Regular' ? document.getElementById('if-otros').value : '',
        comentarios: document.getElementById('if-com').value
      };
      if (+datos.otros > 0 && !datos.comentarios.trim()) { msg.textContent = 'Indica en comentarios a qué corresponden las horas de otros servicios (por ejemplo, LDC).'; document.getElementById('if-com').focus(); return; }
      if (/precursor/i.test(datos.servicio) && datos.participo === 'Sí' && !datos.horas) { msg.textContent = 'Indica las horas.'; return; }
      document.getElementById('if-guardar').disabled = true;
      msg.textContent = 'Enviando…';
      api('informe', datos).then(function (r) {
        if (!r.ok) throw new Error(r.error);
        cerrar();
        aviso('Informe enviado. ¡Gracias!');
        if (alGuardar) alGuardar(); else cargar();
      }).catch(function (err) {
        if (err.message === 'sesion') { cerrar(); return; }
        msg.textContent = err.message && err.message !== 'red' ? err.message : 'No se pudo enviar. Revisa tu conexión.';
        document.getElementById('if-guardar').disabled = false;
      });
    });
  }

  function renderInformes() {
    document.title = 'Informes · Cong. Los Romeros';
    var t = estado.informesDatos;
    var h = '<div class="barra"><div class="barra-top"><button class="volver" type="button" id="volver">' + SVG_ATRAS + 'Inicio</button>' +
      '<h1>Informes' + (t ? ' de ' + esc(t.mesNombre) : '') + '</h1></div></div>';
    var mesPedido = estado.informesMes || estado.datos.informe.mes;
    if (!t || t.mes !== mesPedido) {
      app.innerHTML = h + '<p class="vacio">Cargando informes…</p>';
      document.getElementById('volver').addEventListener('click', function () { location.hash = ''; });
      api('informes', { mes: mesPedido }).then(function (r) {
        if (!r.ok) throw new Error(r.error);
        estado.informesDatos = r;
        if (location.hash === '#informes') renderInformes();
      }).catch(function (e) { if (e.message !== 'sesion') aviso(e.message || 'No se pudo cargar.', true); });
      return;
    }
    var esActual = t.mes === estado.datos.informe.mes;
    h += '<div class="meses-nav"><button type="button" class="filtro" data-mes="' + esc(t.mesAnterior) + '">‹ ' + esc(MESES[+t.mesAnterior.slice(5, 7) - 1]) + '</button>' +
      (esActual ? '' : '<button type="button" class="filtro" data-mes="' + esc(estado.datos.informe.mes) + '">Volver al mes actual ›</button>') + '</div>';
    t.grupos.forEach(function (g) {
      var faltan = g.miembros.filter(function (m) { return !m.informe; });
      h += '<article class="terr"><div class="terr-cab"><span class="terr-n">' + g.grupo + '</span><div><div class="terr-t">Grupo ' + g.grupo + '</div>' +
        '<div class="terr-u' + (faltan.length ? ' viejo' : '') + '">' + g.enviados + ' de ' + g.miembros.length + ' enviaron' + (faltan.length ? ' · faltan ' + faltan.length : '') + '</div></div></div>' +
        '<div class="terr-barra"><span style="width:' + (g.miembros.length ? Math.round(100 * g.enviados / g.miembros.length) : 0) + '%"></span></div>' +
        '<div class="terr-cifra">Participaron ' + g.participaron + ' · Horas (precursores) ' + g.horas + (g.otros ? ' + ' + g.otros + ' otros servicios' : '') + ' · Estudios ' + g.estudios + '</div>' +
        '<div class="miembros">' + g.miembros.map(function (m) {
          var x = m.informe;
          return '<button type="button" class="miembro' + (x ? ' ok' : '') + '" data-miembro="' + esc(m.nombre) + '">' +
            '<span class="m-nombre">' + esc(m.nombre) + '</span>' +
            '<span class="m-det">' + (x ? esc((/^n/i.test(String(x.participo)) ? 'No participó' : 'Participó') + (x.horas ? ' · ' + x.horas + ' h' : '') + (+x.otros ? ' + ' + x.otros + ' h otros' : '') + (+x.estudios ? ' · ' + x.estudios + ' est.' : '') + (/precursor/i.test(x.servicio) ? ' · ' + x.servicio : '')) : 'Pendiente · tocar para ingresar') + '</span></button>';
        }).join('') + '</div></article>';
    });
    if (!t.grupos.length) h += '<p class="vacio">No hay personas con grupo asignado en el directorio.</p>';
    app.innerHTML = h;
    document.getElementById('volver').addEventListener('click', function () { location.hash = ''; });
    app.querySelectorAll('[data-mes]').forEach(function (b) {
      b.addEventListener('click', function () { estado.informesMes = b.getAttribute('data-mes'); renderInformes(); });
    });
    app.querySelectorAll('[data-miembro]').forEach(function (b) {
      b.addEventListener('click', function () {
        var nombre = b.getAttribute('data-miembro'), m = null;
        t.grupos.forEach(function (g) { g.miembros.forEach(function (x) { if (x.nombre === nombre) m = x; }); });
        abrirInforme(m, t.mes, function () { estado.informesDatos = null; renderInformes(); if (norm(nombre) === norm(estado.datos.usuario.nombre)) cargar(); });
      });
    });
  }

  /* ---------- No pasar ---------- */
  function renderNoPasar(sel) {
    document.title = 'No pasar · Cong. Los Romeros';
    var t = estado.noPasar;
    var h = '<div class="barra"><div class="barra-top"><button class="volver" type="button" id="volver">' + SVG_ATRAS + 'Volver</button><h1>No pasar</h1></div></div>';
    if (!t) {
      app.innerHTML = h + '<p class="vacio">Cargando listado…</p>';
      document.getElementById('volver').addEventListener('click', volverAtras);
      api('nopasar').then(function (r) {
        if (!r.ok) throw new Error(r.error);
        estado.noPasar = r;
        if (/^#nopasar/.test(location.hash)) render();
      }).catch(function (e) { if (e.message !== 'sesion') { app.innerHTML = h + '<p class="vacio">' + esc(e.message || 'No se pudo cargar.') + '</p>'; document.getElementById('volver').addEventListener('click', volverAtras); } });
      return;
    }
    h += '<p class="ayuda-editar">Casas donde los dueños pidieron que no se les visite. Respeta su petición.</p>';
    var sn = estado.datos.solicitudesNoPasar || {};
    if (sn.puedeSolicitar) h += '<button type="button" class="btn" id="solicitar-np">Solicitar agregar una dirección</button>';
    if ((sn.mias || []).length) {
      h += '<div class="tarjeta"><strong>Tus solicitudes</strong>' + sn.mias.map(function (x) {
        return '<div class="np-sol"><span>' + esc(x.direccion) + ' · territorio ' + esc(x.territorio) + '</span>' +
          '<span class="estado ' + (x.estado === 'Aprobada' ? 'ok' : x.estado === 'Rechazada' ? 'rech' : 'pend') + '">' + esc(x.estado) + '</span></div>';
      }).join('') + '</div>';
    }
    h += '<div class="filtros terr-chips" role="group" aria-label="Territorio"><a class="filtro' + (!sel ? ' activo' : '') + '" href="#nopasar">Todos</a>' +
      t.territorios.map(function (x) { return '<a class="filtro' + (sel === x.territorio ? ' activo' : '') + '" href="#nopasar/' + esc(x.territorio) + '">' + esc(x.territorio) + '</a>'; }).join('') + '</div>';
    var lista = t.territorios.filter(function (x) { return !sel || x.territorio === sel; });
    if (sel && !lista.length) h += '<p class="vacio">El territorio ' + esc(sel) + ' no tiene direcciones en el listado.</p>';
    lista.forEach(function (x) {
      h += '<article class="terr"><div class="terr-cab"><span class="terr-n">' + esc(x.territorio) + '</span><div><div class="terr-t">Territorio ' + esc(x.territorio) + '</div>' +
        '<div class="terr-u">' + x.direcciones.length + ' dirección' + (x.direcciones.length === 1 ? '' : 'es') + '</div></div></div>' +
        x.direcciones.map(function (dd) {
          return '<div class="np-item"><span class="np-mz">' + esc(dd.manzana || '—') + '</span><span>' + esc(dd.direccion) +
            (dd.fecha ? '<small>Desde ' + esc(/^\d{4}-\d{2}-\d{2}$/.test(dd.fecha) ? fechaCorta(dd.fecha) + ' ' + dd.fecha.slice(0, 4) : dd.fecha) + '</small>' : '') + '</span></div>';
        }).join('') + '</article>';
    });
    h += '<p class="pie">Fuente: ' + esc(t.archivo) + '</p>';
    app.innerHTML = h;
    document.getElementById('volver').addEventListener('click', volverAtras);
    var bs = document.getElementById('solicitar-np');
    if (bs) bs.addEventListener('click', function () { abrirSolicitudNoPasar(sel); });
  }

  function abrirSolicitudNoPasar(terrInicial) {
    var mz = (estado.datos.territorios && estado.datos.territorios.manzanas) || {};
    var terrs = Object.keys(mz).length ? Object.keys(mz).sort(function (a, b) { return +a - +b; }) : Array.apply(null, Array(21)).map(function (_, i) { return String(i + 1); });
    var cont = document.createElement('div');
    cont.className = 'editor-fondo';
    cont.innerHTML =
      '<form class="editor" role="dialog" aria-modal="true" aria-labelledby="sn-t">' +
      '<div class="editor-cab"><div id="sn-t" class="editor-t">Solicitar agregar a "No pasar"</div>' +
      '<div class="editor-d">La solicitud la revisa el administrador antes de agregarla al listado.</div></div>' +
      '<div class="rg-fila"><div><label for="sn-terr">Territorio</label><select id="sn-terr">' + terrs.map(function (t) { return '<option' + (t === terrInicial ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></div>' +
      '<div><label for="sn-mz">Manzana</label><select id="sn-mz"></select></div></div>' +
      '<label for="sn-dir">Dirección</label><input id="sn-dir" autocomplete="off" placeholder="Calle y número" required>' +
      '<label for="sn-notas">Notas</label><textarea id="sn-notas" rows="2" placeholder="Opcional: qué dijo el dueño de casa, referencias"></textarea>' +
      '<p class="editor-msg" id="sn-msg" role="status"></p>' +
      '<div class="editor-acc"><button type="button" class="btn btn-sec" id="sn-cancelar">Cancelar</button><button type="submit" class="btn" id="sn-enviar">Enviar solicitud</button></div></form>';
    document.body.appendChild(cont);
    var pintar = function () {
      var t = document.getElementById('sn-terr').value;
      document.getElementById('sn-mz').innerHTML = '<option value="">No sé</option>' + (mz[t] || []).map(function (m) { return '<option>' + esc(m) + '</option>'; }).join('');
    };
    pintar();
    document.getElementById('sn-terr').addEventListener('change', pintar);
    var cerrar = function () { cont.remove(); };
    cont.addEventListener('click', function (e) { if (e.target === cont) cerrar(); });
    document.getElementById('sn-cancelar').addEventListener('click', cerrar);
    cont.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = document.getElementById('sn-msg');
      document.getElementById('sn-enviar').disabled = true;
      msg.textContent = 'Enviando…';
      api('solicitarNoPasar', {
        territorio: document.getElementById('sn-terr').value, manzana: document.getElementById('sn-mz').value,
        direccion: document.getElementById('sn-dir').value, notas: document.getElementById('sn-notas').value
      }).then(function (r) {
        if (!r.ok) throw new Error(r.error);
        cerrar();
        aviso('Solicitud enviada. Te avisaremos cuando se revise.');
        cargar();
      }).catch(function (err) {
        if (err.message === 'sesion') { cerrar(); return; }
        msg.textContent = err.message && err.message !== 'red' ? err.message : 'No se pudo enviar. Revisa tu conexión.';
        document.getElementById('sn-enviar').disabled = false;
      });
    });
  }

  function volverAtras() {
    if (history.length > 1) history.back(); else location.hash = '';
  }

  /* ---------- Mapa del territorio ---------- */
  function renderMapa() {
    document.title = 'Mapa del territorio · Cong. Los Romeros';
    app.innerHTML = '<div class="barra"><div class="barra-top"><button class="volver" type="button" id="volver">' + SVG_ATRAS + 'Volver</button><h1>Mapa del territorio</h1></div></div>' +
      '<div class="tarjeta" id="mapa-estado"><p class="mensaje">Preparando el mapa…</p></div>';
    document.getElementById('volver').addEventListener('click', volverAtras);
    obtenerMapa().then(function (blob) {
      var url = URL.createObjectURL(blob);
      document.getElementById('mapa-estado').innerHTML =
        '<p class="mensaje">El mapa está listo. Se guarda en este teléfono para que se abra rápido la próxima vez.</p>' +
        '<a class="btn" href="' + url + '" target="_blank" rel="noopener">Abrir el mapa</a>' +
        '<a class="btn btn-sec" href="' + url + '" download="Mapa del territorio.pdf">Descargar PDF</a>';
    }).catch(function (e) {
      if (e.message === 'sesion') return;
      document.getElementById('mapa-estado').innerHTML = '<p class="mensaje">' + esc(e.message || 'No se pudo obtener el mapa.') + '</p>';
    });
  }

  /** Devuelve el PDF del mapa, desde el teléfono si no cambió o descargándolo si es nuevo. */
  function obtenerMapa() {
    var CLAVE = 'programas-mapa-version', URL_CACHE = './__mapa-territorio.pdf';
    var version = leer(CLAVE) || '';
    var desdeCache = function () {
      return ('caches' in window) ? caches.open('mapa').then(function (c) { return c.match(URL_CACHE); }).then(function (r) { return r ? r.blob() : null; }) : Promise.resolve(null);
    };
    return desdeCache().then(function (enCache) {
      return api('mapa', { version: enCache ? version : '' }).then(function (r) {
        if (!r.ok) throw new Error(r.error);
        if (r.sinCambios && enCache) return enCache;
        var bin = atob(r.pdf), bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        var blob = new Blob([bytes], { type: 'application/pdf' });
        if ('caches' in window) caches.open('mapa').then(function (c) { return c.put(URL_CACHE, new Response(blob)); }).then(function () { guardar(CLAVE, r.version); });
        return blob;
      }).catch(function (e) {
        if (enCache && e.message !== 'sesion') return enCache; // sin conexión: usar el guardado
        throw e;
      });
    });
  }

  /* ---------- notificaciones en el teléfono ---------- */
  var FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  function avisosDisponibles() {
    return !!(cfg.avisos !== false && cfg.firebase && cfg.vapidKey && 'Notification' in window && 'serviceWorker' in navigator && location.protocol === 'https:' && !DEMO);
  }
  function avisosActivos() {
    return Notification.permission === 'granted' && !!leer('programas-push');
  }
  function cargarScript(src) {
    return new Promise(function (ok, mal) {
      var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = mal; document.head.appendChild(s);
    });
  }
  /** Pide permiso (si pidePermiso) y registra el teléfono en el servidor. */
  function activarAvisos(pidePermiso) {
    if (!avisosDisponibles()) return;
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var instalada = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (pidePermiso && ios && !instalada) {
      aviso('En iPhone, primero agrega la app a la pantalla de inicio (Compartir ▸ Agregar a inicio) y ábrela desde ahí.', true);
      return;
    }
    var permiso = pidePermiso ? Notification.requestPermission() : Promise.resolve(Notification.permission);
    permiso.then(function (p) {
      if (p !== 'granted') { if (pidePermiso) aviso('No se activaron los avisos. Puedes permitirlos en la configuración del navegador.', true); throw new Error('sin permiso'); }
      return window.firebase ? null : cargarScript(FIREBASE_SDK + 'firebase-app-compat.js').then(function () { return cargarScript(FIREBASE_SDK + 'firebase-messaging-compat.js'); });
    }).then(function () {
      if (!firebase.apps.length) firebase.initializeApp(cfg.firebase);
      return navigator.serviceWorker.ready;
    }).then(function (reg) {
      return firebase.messaging().getToken({ vapidKey: cfg.vapidKey, serviceWorkerRegistration: reg });
    }).then(function (token) {
      if (!token) throw new Error('sin token');
      if (leer('programas-push') === token && !pidePermiso) return null;
      return api('dispositivo', { dispositivo: token, plataforma: navigator.userAgent.slice(0, 60) }).then(function (r) {
        if (!r.ok) throw new Error(r.error);
        guardar('programas-push', token);
        if (pidePermiso) { aviso('Listo, este teléfono recibirá los avisos.'); render(); }
      });
    }).catch(function (e) {
      if (pidePermiso && e.message !== 'sin permiso' && e.message !== 'sesion') aviso('No se pudieron activar los avisos: ' + e.message, true);
    });
  }

  /* ---------- avisos breves ---------- */
  function aviso(texto, esError) {
    var t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.className = 'toast' + (esError ? ' error' : '');
    t.textContent = texto;
    clearTimeout(aviso.t);
    aviso.t = setTimeout(function () { t.className = 'toast oculto'; }, 4000);
  }

  /* ---------- modo demo (solo local) ---------- */
  function demoApi(accion, p) {
    var d = estado.datos;
    if (accion === 'territorios') return fetch('dev-territorios.json').then(function (r) { return r.json(); });
    if (accion === 'nopasar') return fetch('dev-nopasar.json').then(function (r) { return r.json(); });
    if (accion === 'informes') return fetch('dev-informes.json').then(function (r) { return r.json(); });
    if (accion === 'sugerencias') return Promise.resolve({ ok: true, tipo: 'Micrófono', sugerencias: (d.personas || []).slice(3, 7).map(function (n, i) {
      return { nombre: n, ultima: i === 0 ? '' : '2026-0' + (9 - i) + '-1' + i, proxima: i === 3 ? '2026-11-20' : '' };
    }) });
    if (accion === 'responder' || accion === 'estado') { if (d.estados) d.estados[p.clave] = p.respuesta || p.estado; }
    if (accion === 'aprobar') d.programas.forEach(function (x) {
      if (x.id === p.programa) { x.borradores = []; x.reuniones.forEach(function (r) { r.borrador = false; }); }
    });
    return Promise.resolve({ ok: true, aviso: accion === 'asignar' ? '(demo) En la app real se escribe en la hoja oficial.' : '' });
  }

  /* ---------- arranque ---------- */
  window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); eventoInstalar = e; if (estado.datos) render(); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && (estado.token || DEMO)) cargar(); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () { /* sin modo offline */ });
  }
  estado.token = leer(CLAVE_SESION);
  cargar();
})();
