/**
 * Lectores de programas.
 *
 * Cada lector recibe una hoja { name, values, display } (values = getValues(),
 * display = getDisplayValues()) y devuelve un "periodo":
 *   { periodo, reuniones: [Reunion], avisos: [texto] }
 * Reunion = { id, fecha 'AAAA-MM-DD', hora 'HH:MM'|null, titulo, nota, lugar,
 *             secciones: [{ titulo, filas: [{ texto, detalle, asignados: [Asignado] }] }] }
 * Asignado = { slot, rol, nombre, sala?, grupo?, externo? }
 *
 * Son funciones puras (sin servicios de Google) para poder probarlas fuera de Apps Script.
 */

var MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function norm_(s) {
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

function texto_(v) {
  if (v == null) return '';
  if (typeof v === 'object' && !(v instanceof Date)) return '';
  return String(v).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

function pad2_(n) { return (n < 10 ? '0' : '') + n; }

/** Devuelve 'AAAA-MM-DD' si la celda es una fecha real, si no null. */
function fecha_(v) {
  if (v && v.$d) return v.$d;
  if (v instanceof Date && !isNaN(v)) {
    if (v.getFullYear() < 1901) return null;
    return v.getFullYear() + '-' + pad2_(v.getMonth() + 1) + '-' + pad2_(v.getDate());
  }
  return null;
}

/** Devuelve 'HH:MM' si la celda (o su texto mostrado) es una hora, si no null. */
function hora_(v, shown) {
  var s = texto_(shown);
  var m = /^(\d{1,2})[:.](\d{2})(?::\d{2})?\s*(am|pm|a\. ?m\.|p\. ?m\.)?$/i.exec(s);
  if (m) {
    var h = +m[1];
    if (m[3] && /p/i.test(m[3]) && h < 12) h += 12;
    return pad2_(h) + ':' + m[2];
  }
  if (v && v.$t) return v.$t;
  if (v instanceof Date && v.getFullYear() < 1901) return pad2_(v.getHours()) + ':' + pad2_(v.getMinutes());
  return null;
}

function sumarDias_(iso, n) {
  var p = iso.split('-');
  var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
  return d.getUTCFullYear() + '-' + pad2_(d.getUTCMonth() + 1) + '-' + pad2_(d.getUTCDate());
}

function diaSemana_(iso) {
  var p = iso.split('-');
  return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); // 0 = domingo
}

function celda_(sheet, r, c) {
  var row = sheet.values[r];
  return row ? row[c] : '';
}

function mostrado_(sheet, r, c) {
  var row = sheet.display && sheet.display[r];
  return row ? row[c] : texto_(celda_(sheet, r, c));
}

function nuevaReunion_(fecha, extra) {
  var r = { id: fecha, fecha: fecha, hora: null, titulo: '', nota: '', lugar: '', secciones: [] };
  for (var k in extra) r[k] = extra[k];
  return r;
}

function totalAsignados_(reunion) {
  var n = 0;
  reunion.secciones.forEach(function (s) { s.filas.forEach(function (f) { n += f.asignados.length; }); });
  return n;
}

/* ------------------------------------------------------------------ */
/* Reunión Vida y Ministerio Cristianos (entre semana)                  */
/* ------------------------------------------------------------------ */

var VMC_SECCIONES = [
  { re: /tesoros de la biblia/, titulo: 'Tesoros de la Biblia' },
  { re: /seamos mejores maestros/, titulo: 'Seamos mejores maestros' },
  { re: /nuestra vida cristiana/, titulo: 'Nuestra vida cristiana' }
];

// Texto que indica que esa semana no hay reunión normal (se muestra como aviso, no como nombre)
var EVENTO_ESPECIAL_RE = /asamblea|conmemoraci|superintendente de circuito|sin reuni/i;

function parseVMC(sheet) {
  var out = { periodo: sheet.name, reuniones: [], avisos: [] };
  var reunion = null, seccion = null, salas = null, parte = 0;

  function etiqueta(t) { return /:\s*$/.test(t); }

  function asignarEtiqueta(r, c, t) {
    var n = norm_(t);
    var rol = /^presidente/.test(n) ? ['presidente', 'Presidente']
      : /^lector/.test(n) ? ['lector', 'Lector']
      : /^oracion final/.test(n) ? ['oracion', 'Oración final'] : null;
    if (!rol || !reunion) return false;
    var nombre = '';
    for (var c2 = c + 1; c2 < (sheet.values[r] || []).length && !nombre; c2++) nombre = texto_(celda_(sheet, r, c2));
    if (EVENTO_ESPECIAL_RE.test(nombre)) { reunion.nota = nombre; nombre = ''; }
    if (rol[0] === 'presidente') {
      reunion.secciones[0].filas.push({ texto: 'Presidente', detalle: '', asignados: nombre ? [{ slot: 'presidente', rol: 'Presidente', nombre: nombre }] : [] });
    } else {
      var fin = reunion.secciones[reunion.secciones.length - 1];
      fin.filas.push({ texto: rol[1], detalle: '', asignados: nombre ? [{ slot: rol[0], rol: rol[1], nombre: nombre }] : [] });
    }
    return true;
  }

  for (var r = 0; r < sheet.values.length; r++) {
    var row = sheet.values[r] || [];
    var f = fecha_(row[0]);
    if (f) {
      reunion = nuevaReunion_(f, { titulo: 'Vida y Ministerio Cristianos' });
      reunion.secciones.push({ titulo: '', filas: [] });
      out.reuniones.push(reunion);
      seccion = null; salas = null; parte = 0;
      continue;
    }
    if (!reunion) continue;

    var textos = row.map(texto_);
    var unido = norm_(textos.join(' '));
    if (/^programa reunion vida y ministerio|^congregacion /.test(norm_(textos[0] || textos[1]))) {
      // Encabezado de página: lo que sigue sin fecha es plantilla vacía hasta la próxima fecha.
      reunion = null;
      continue;
    }

    var sec = VMC_SECCIONES.filter(function (s) { return s.re.test(unido); })[0];
    if (sec && !/\(\d+ ?mins?\.?\)/.test(unido)) {
      seccion = { titulo: sec.titulo, filas: [] };
      reunion.secciones.push(seccion);
      salas = null;
      continue;
    }

    // Fila de encabezado de salas: "Sala principal" / "Sala auxiliar / Consejero: X"
    if (/sala (principal|auxiliar)/.test(unido) && !/\(\d+ ?mins?\.?\)/.test(unido)) {
      salas = [];
      textos.forEach(function (t, c) {
        var n = norm_(t);
        if (/sala principal/.test(n)) salas.push({ col: c, sala: 'Sala principal' });
        else if (/sala auxiliar/.test(n)) {
          salas.push({ col: c, sala: 'Sala auxiliar' });
          var m = /consejero:?\s*(.+)$/i.exec(t);
          if (m && texto_(m[1])) {
            (seccion || reunion.secciones[0]).filas.push({
              texto: 'Consejero sala auxiliar', detalle: '',
              asignados: [{ slot: 'consejero-aux', rol: 'Consejero sala auxiliar', nombre: texto_(m[1]) }]
            });
          }
        }
      });
      if (!salas.length) salas = null;
      continue;
    }

    // Parte del programa: texto en B con duración "(N mins.)"
    var tParte = textos[1] || '';
    if (/\(\d+ ?mins?\.?\)/i.test(tParte)) {
      parte++;
      var fila = { texto: tParte, detalle: '', asignados: [] };
      var nombres = [];
      for (var c = 3; c < textos.length; c++) {
        if (!textos[c]) continue;
        if (etiqueta(textos[c])) break; // LECTOR: y lo que sigue pertenece a otra asignación
        if (EVENTO_ESPECIAL_RE.test(textos[c])) { reunion.nota = textos[c]; continue; }
        nombres.push({ col: c, nombre: textos[c] });
      }
      nombres.forEach(function (n, i) {
        var sala = null, rol = i === 0 ? 'Titular' : 'Ayudante';
        if (salas) {
          var s = salas.filter(function (x) { return x.col <= n.col; }).pop() || salas[0];
          sala = s.sala;
          rol = n.col === s.col ? 'Titular' : 'Ayudante';
        } else if (nombres.length === 1) {
          rol = 'Asignado';
        }
        fila.asignados.push({
          slot: 'p' + parte + '-' + (sala ? norm_(sala).replace(/\W+/g, '') : 'sp') + '-' + norm_(rol),
          rol: rol, nombre: n.nombre, sala: sala || undefined
        });
      });
      (seccion || reunion.secciones[0]).filas.push(fila);
    }

    // Etiquetas (PRESIDENTE:, LECTOR:, ORACIÓN FINAL:) en cualquier columna
    textos.forEach(function (t, c) { if (etiqueta(t)) asignarEtiqueta(r, c, t); });
  }

  out.reuniones = out.reuniones.filter(function (re) {
    re.secciones = re.secciones.filter(function (s) { return s.filas.length; });
    if (!totalAsignados_(re)) {
      re.secciones = [];
      re.nota = re.nota || 'Sin asignaciones esta semana';
    }
    return true;
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Acomodación, micrófonos, plataforma, audio y video                   */
/* ------------------------------------------------------------------ */

function parseAcomodacion(sheet) {
  var out = { periodo: sheet.name, reuniones: [], avisos: [] };
  var hdr = -1, grupos = [];
  for (var r = 0; r < sheet.values.length && hdr < 0; r++) {
    var t = (sheet.values[r] || []).map(function (v) { return norm_(texto_(v)); });
    if (t.indexOf('fecha') >= 0 && t.some(function (x) { return /acomod/.test(x); })) {
      hdr = r;
      t.forEach(function (x, c) {
        if (/acomod/.test(x)) grupos.push({ col: c, tipo: 'etiquetado', titulo: 'Acomodación', slot: 'acomodacion' });
        else if (/audio/.test(x)) grupos.push({ col: c, tipo: 'etiquetado', titulo: 'Audio y video', slot: 'av' });
        else if (/microfono/.test(x)) grupos.push({ col: c, tipo: 'filas', titulo: /plataforma/.test(x) ? 'Micrófonos y plataforma' : 'Micrófonos', slot: 'microfono' });
        else if (/plataforma/.test(x)) grupos.push({ col: c, tipo: 'unico', titulo: 'Plataforma', slot: 'plataforma' });
      });
    }
  }
  if (hdr < 0) { out.avisos.push('No encontré la fila de títulos (Día, Fecha, Acomodación…).'); return out; }
  var colFecha = (sheet.values[hdr] || []).map(function (v) { return norm_(texto_(v)); }).indexOf('fecha');

  for (r = hdr + 1; r < sheet.values.length; r++) {
    var f = fecha_(celda_(sheet, r, colFecha));
    if (!f) continue;
    var reunion = nuevaReunion_(f, { titulo: 'Reunión' });
    var filas = [r, r + 1];
    // Texto especial en lugar de asignaciones (asamblea, conmemoración, etc.)
    var etiquetaAcomod = texto_(celda_(sheet, r, grupos[0].col));
    if (etiquetaAcomod && !/^(hall|auditorio)$/i.test(etiquetaAcomod)) {
      reunion.nota = etiquetaAcomod;
      out.reuniones.push(reunion);
      continue;
    }
    var vacia = true;
    grupos.forEach(function (g) {
      var sec = { titulo: g.titulo, filas: [] };
      if (g.tipo === 'etiquetado') {
        filas.forEach(function (rr) {
          var lab = texto_(celda_(sheet, rr, g.col)), nom = texto_(celda_(sheet, rr, g.col + 1));
          if (!lab && !nom) return;
          var asign = nom ? [{ slot: g.slot + '-' + norm_(lab || 'x').replace(/\W+/g, ''), rol: g.titulo + (lab ? ' · ' + lab : ''), nombre: nom }] : [];
          sec.filas.push({ texto: lab, detalle: '', asignados: asign });
        });
      } else if (g.tipo === 'filas') {
        filas.forEach(function (rr, i) {
          var nom = texto_(celda_(sheet, rr, g.col));
          if (nom) sec.filas.push({ texto: '', detalle: '', asignados: [{ slot: g.slot + '-' + (i + 1), rol: g.titulo, nombre: nom }] });
        });
      } else {
        var nom = texto_(celda_(sheet, r, g.col)) || texto_(celda_(sheet, r + 1, g.col));
        if (nom) sec.filas.push({ texto: '', detalle: '', asignados: [{ slot: g.slot, rol: g.titulo, nombre: nom }] });
      }
      if (sec.filas.some(function (x) { return x.asignados.length; })) vacia = false;
      if (sec.filas.length) reunion.secciones.push(sec);
    });
    if (vacia) reunion.nota = reunion.nota || 'Sin asignaciones';
    out.reuniones.push(reunion);
    r++; // cada reunión ocupa dos filas
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Reunión pública (fin de semana) + oradores que salen                 */
/* ------------------------------------------------------------------ */

var CONGREGACION_LOCAL_RE = /romeros/i;

function separarDiscursante_(t) {
  // "Nombre Apellido - Congregación X, Ciudad +56 9 1234 5678"
  var sinFono = t.replace(/\(?\+?\d[\d\s\-()]{7,}\)?/g, '').replace(/\s+/g, ' ').trim();
  var partes = sinFono.split(/\s+-\s+/);
  return { nombre: texto_(partes[0]), origen: texto_(partes.slice(1).join(' - ')), texto: sinFono };
}

function fechaTextoCorta_(t, anioBase, mesBase) {
  // "03 oct / 19:15" o "03-10-2025"
  var n = norm_(t);
  var m = /(\d{1,2})[\s\-\/]+([a-z]{3})/.exec(n);
  var d, mes, anio = anioBase;
  if (m) {
    d = +m[1]; mes = MESES_CORTOS.indexOf(m[2]) + 1;
    if (mes <= 0) return null;
  } else {
    m = /(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{2,4})/.exec(n);
    if (!m) return null;
    d = +m[1]; mes = +m[2]; anio = +m[3] < 100 ? 2000 + +m[3] : +m[3];
  }
  if (mesBase && mes < mesBase - 6) anio++;
  var h = /(\d{1,2}:\d{2})/.exec(n);
  return { fecha: anio + '-' + pad2_(mes) + '-' + pad2_(d), hora: h ? hora_(null, h[1]) : null };
}

function parseFinSemana(sheet) {
  var out = { periodo: sheet.name, reuniones: [], avisos: [] };
  var reunion = null, salidas = null, base = null;

  function fila(texto, detalle, asignados) {
    reunion.secciones[0].filas.push({ texto: texto, detalle: detalle || '', asignados: asignados || [] });
  }

  for (var r = 0; r < sheet.values.length; r++) {
    var a = celda_(sheet, r, 0), b = texto_(celda_(sheet, r, 1));
    var f = fecha_(a);
    var la = norm_(texto_(a));

    if (f && !salidas) {
      base = base || f;
      reunion = nuevaReunion_(f, { titulo: 'Reunión pública' });
      reunion.secciones.push({ titulo: '', filas: [] });
      out.reuniones.push(reunion);
      continue;
    }
    if (/^visitan/.test(la)) {
      // Oradores de la congregación que salen a discursar
      var destino = texto_(a).replace(/^visitan\s*/i, '');
      salidas = { congregacion: separarDiscursante_(destino).texto.replace(/\s*-\s*contacto.*$/i, '').replace(/^congregaci[oó]n\s*/i, ''), direccion: '', items: [] };
      reunion = null;
      continue;
    }
    if (salidas) {
      if (/^direccion/.test(la)) { salidas.direccion = b; continue; }
      if (/^fecha/.test(la) || !b) continue;
      var fh = fecha_(a) ? { fecha: fecha_(a), hora: null } : fechaTextoCorta_(texto_(a), +(base || '2000').slice(0, 4), base ? +base.slice(5, 7) : 0);
      if (!fh) continue;
      var d = separarDiscursante_(b);
      salidas.items.push({ fecha: fh.fecha, hora: fh.hora, nombre: d.nombre, discurso: d.origen });
      continue;
    }
    if (!reunion) continue;
    if (/^(presidente|discurso|discursante|hospitalidad|articulo|tema|lector|oracion)/.test(la)) reunion.valida = true;

    if (/^presidente/.test(la)) fila('Presidente y oración de inicio', '', b ? [{ slot: 'presidente', rol: 'Presidente y oración de inicio', nombre: b }] : []);
    else if (/^discurso publico/.test(la)) reunion.discurso = b;
    else if (/^discursante/.test(la)) {
      if (!b) continue;
      if (!reunion.discurso && /asamblea|conmemoraci/i.test(b)) { reunion.nota = b; continue; }
      var ds = separarDiscursante_(b);
      var local = CONGREGACION_LOCAL_RE.test(ds.origen);
      fila('Discurso público', reunion.discurso || '', [{ slot: 'discursante', rol: 'Discursante', nombre: ds.nombre, externo: !local, origen: ds.origen }]);
    }
    else if (/^hospitalidad/.test(la)) {
      var g = /(\d+)/.exec(b);
      fila('Hospitalidad', '', g ? [{ slot: 'hospitalidad', rol: 'Hospitalidad', nombre: 'Grupo ' + g[1], grupo: +g[1] }] : []);
    }
    else if (/^articulo atalaya/.test(la)) reunion.articulo = b;
    else if (/^tema/.test(la)) reunion.tema = b;
    else if (/^lector/.test(la)) fila('Lector de La Atalaya', [reunion.articulo, reunion.tema].filter(Boolean).join(' — '), b ? [{ slot: 'lector', rol: 'Lector de La Atalaya', nombre: b }] : []);
    else if (/^oracion final/.test(la)) fila('Oración final', '(en ausencia del discursante)', b ? [{ slot: 'oracion', rol: 'Oración final', nombre: b }] : []);
  }

  // Una fecha sin etiquetas debajo (p. ej. pestaña "Próximas programaciones") no es una reunión.
  out.reuniones = out.reuniones.filter(function (re) { return re.valida; });
  out.reuniones.forEach(function (re) {
    delete re.valida;
    if (!totalAsignados_(re)) {
      re.secciones = [];
      re.nota = re.nota || 'Sin asignaciones';
    }
    delete re.discurso; delete re.articulo; delete re.tema;
  });

  if (salidas) {
    salidas.items.forEach(function (it, i) {
      var re = nuevaReunion_(it.fecha, {
        id: it.fecha + '-salida-' + (i + 1), tipo: 'salida', hora: it.hora,
        titulo: 'Discurso en ' + salidas.congregacion, lugar: salidas.direccion
      });
      re.secciones.push({ titulo: '', filas: [{ texto: 'Discurso', detalle: it.discurso, asignados: it.nombre ? [{ slot: 'orador', rol: 'Orador (sale a discursar)', nombre: it.nombre }] : [] }] });
      out.reuniones.push(re);
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Predicación (reuniones para el servicio del campo)                   */
/* ------------------------------------------------------------------ */

function parsePredicacion(sheet) {
  var out = { periodo: sheet.name, reuniones: [], avisos: [] };
  var hdr = -1, col = {};
  for (var r = 0; r < sheet.values.length && hdr < 0; r++) {
    var t = (sheet.values[r] || []).map(function (v) { return norm_(texto_(v)); });
    if (t.indexOf('fecha') >= 0 && (t.indexOf('encargado') >= 0 || t.indexOf('capitan') >= 0)) {
      hdr = r;
      t.forEach(function (x, c) {
        if (x === 'fecha') col.fecha = c;
        else if (x === 'hora') col.hora = c;
        else if (x === 'lugar') col.lugar = c;
        else if (x === 'familia') col.familia = c;
        else if (x === 'encargado' || x === 'capitan') col.encargado = c;
        else if (x === 'territorio') col.territorio = c;
        else if (x === 'grupos' || x === 'grupo') col.grupos = c;
      });
    }
  }
  if (hdr < 0) { out.avisos.push('No encontré la fila de títulos (Fecha, Hora, Lugar, Encargado…).'); return out; }

  var fechaActual = null, horaTexto = '', n = 0, notaPendiente = '';
  for (r = hdr + 1; r < sheet.values.length; r++) {
    var v = function (k) { return col[k] == null ? '' : celda_(sheet, r, col[k]); };
    var f = fecha_(v('fecha'));
    var primera = texto_(celda_(sheet, r, 0));
    var encargado = texto_(v('encargado'));
    if (f) { fechaActual = f; horaTexto = ''; n = 0; }
    if (!f && !encargado && primera.length > 3 && !texto_(v('lugar'))) {
      notaPendiente = primera; // fila de aviso (p. ej. "Inicio campaña…")
      continue;
    }
    if (!fechaActual || !encargado) continue;

    var hv = v('hora'), h = hora_(hv, col.hora == null ? '' : mostrado_(sheet, r, col.hora));
    var ht = texto_(hv);
    if (!h && ht) horaTexto = ht;      // "ARREGLO POR GRUPOS" (celda combinada hacia abajo)
    else if (h) horaTexto = '';
    n++;
    var grupos = texto_(v('grupos'));
    var territorio = texto_(v('territorio'));
    var re = nuevaReunion_(fechaActual, {
      id: fechaActual + '-' + n, tipo: 'salida', hora: h,
      titulo: horaTexto || 'Salida al servicio',
      lugar: texto_(v('lugar')),
      nota: notaPendiente
    });
    notaPendiente = '';
    var familia = texto_(v('familia'));
    var detalle = [
      /^(-|calle)?$/i.test(familia) ? '' : /^sal[oó]n$/i.test(familia) ? 'Salón del Reino' : 'Familia ' + familia,
      territorio ? 'Territorio ' + territorio : '',
      grupos ? (/^\d+(\.0)?$/.test(grupos) ? 'Grupo ' + parseInt(grupos, 10) : 'Grupos: ' + grupos) : ''
    ].filter(Boolean).join(' · ');
    re.secciones.push({ titulo: '', filas: [{ texto: 'Encargado', detalle: detalle, asignados: [{ slot: 'encargado', rol: 'Encargado de la salida', nombre: encargado }] }] });
    out.reuniones.push(re);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Aseo (plantilla: Fecha | Grupo | Encargado | Auxiliar)               */
/* ------------------------------------------------------------------ */

function parseAseo(sheet) {
  var out = { periodo: sheet.name, reuniones: [], avisos: [] };
  var hdr = -1, col = {};
  for (var r = 0; r < sheet.values.length && hdr < 0; r++) {
    var t = (sheet.values[r] || []).map(function (v) { return norm_(texto_(v)); });
    if (t.indexOf('fecha') >= 0 && t.some(function (x) { return /^grupo/.test(x); })) {
      hdr = r;
      t.forEach(function (x, c) {
        if (x === 'fecha') col.fecha = c;
        else if (/^grupo/.test(x)) col.grupo = c;
        else if (/encargado|superintendente/.test(x)) col.sup = c;
        else if (/auxiliar/.test(x)) col.aux = c;
      });
    }
  }
  if (hdr < 0) { out.avisos.push('No encontré la fila de títulos (Fecha, Grupo…).'); return out; }
  for (r = hdr + 1; r < sheet.values.length; r++) {
    var f = fecha_(celda_(sheet, r, col.fecha));
    if (!f) continue;
    var g = /(\d+)/.exec(texto_(celda_(sheet, r, col.grupo)));
    var re = nuevaReunion_(f, { titulo: 'Aseo después de la reunión' });
    var filas = [];
    if (g) filas.push({ texto: 'Grupo a cargo', detalle: 'Auditorio, salas, baños, pisos y jardín', asignados: [{ slot: 'grupo', rol: 'Aseo', nombre: 'Grupo ' + g[1], grupo: +g[1] }] });
    var sup = col.sup == null ? '' : texto_(celda_(sheet, r, col.sup));
    var aux = col.aux == null ? '' : texto_(celda_(sheet, r, col.aux));
    if (sup) filas.push({ texto: 'Encargado', detalle: '', asignados: [{ slot: 'encargado', rol: 'Encargado de aseo', nombre: sup }] });
    if (aux) filas.push({ texto: 'Auxiliar', detalle: '', asignados: [{ slot: 'auxiliar', rol: 'Auxiliar de aseo', nombre: aux }] });
    re.secciones.push({ titulo: '', filas: filas });
    out.reuniones.push(re);
  }
  return out;
}

var LECTORES = {
  vmc: parseVMC,
  acomodacion: parseAcomodacion,
  finsemana: parseFinSemana,
  predicacion: parsePredicacion,
  aseo: parseAseo
};
