/**
 * Reconocimiento de nombres: une "Héctor Riquelme", "Hector Riquelme", "Edgar Naeter Q."
 * o "Hermes Moraga S." con la persona correcta del directorio. Funciones puras.
 */

var PARTICULAS_ = { de: 1, del: 1, la: 1, las: 1, los: 1, y: 1 };

function tokens_(nombre) {
  return norm_(nombre).replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
}

/** "Felipe Valderrama" -> "Felipe V." · "Mireya de Beltrán" -> "Mireya de B." */
function nombrePublico_(nombre) {
  var t = texto_(nombre).split(' ').filter(Boolean);
  if (t.length < 2) return t.join(' ');
  var apellidoIdx = 1;
  while (apellidoIdx < t.length - 1 && PARTICULAS_[norm_(t[apellidoIdx])]) apellidoIdx++;
  var medio = t.slice(1, apellidoIdx).join(' ');
  if (!medio && t.length >= 3) {
    // "Jean Carlos Arriaga" -> "Jean Carlos A." (se puede corregir a mano en el directorio)
    return t.slice(0, t.length - 1).join(' ') + ' ' + t[t.length - 1].charAt(0).toUpperCase() + '.';
  }
  return t[0] + (medio ? ' ' + medio : '') + ' ' + t[apellidoIdx].charAt(0).toUpperCase() + '.';
}

/**
 * Busca a la persona. `personas` = [{ id, nombre, alias: ['...'] }].
 * Devuelve { persona, exacto } o null si no hay un candidato único.
 */
function buscarPersona_(nombre, personas, indice) {
  var n = tokens_(nombre).join(' ');
  if (!n) return null;
  indice = indice || indicePersonas_(personas);
  if (indice.exactos[n] && indice.exactos[n].length === 1) return { persona: indice.exactos[n][0], exacto: true };

  var buscados = tokens_(nombre).filter(function (t) { return !PARTICULAS_[t]; });
  var candidatos = personas.filter(function (p) {
    return indice.variantes[p.id].some(function (tp) { return coincide_(buscados, tp); });
  });
  return candidatos.length === 1 ? { persona: candidatos[0], exacto: false } : null;
}

function indicePersonas_(personas) {
  var exactos = {}, variantes = {};
  personas.forEach(function (p) {
    var todos = [p.nombre].concat(p.alias || []).filter(Boolean);
    variantes[p.id] = todos.map(function (x) { return tokens_(x).filter(function (t) { return !PARTICULAS_[t]; }); });
    todos.forEach(function (x) {
      var k = tokens_(x).join(' ');
      (exactos[k] = exactos[k] || []).push(p);
    });
  });
  return { exactos: exactos, variantes: variantes };
}

/** Todas las palabras buscadas deben estar en la persona (una inicial "S" calza con "Schmidt"). */
function coincide_(buscados, persona) {
  if (buscados.length < 2) return false;
  var usados = {};
  return buscados.every(function (b) {
    for (var i = 0; i < persona.length; i++) {
      if (usados[i]) continue;
      if (persona[i] === b || (b.length === 1 && persona[i].charAt(0) === b)) { usados[i] = 1; return true; }
    }
    return false;
  });
}

/**
 * Arma un directorio inicial a partir de los nombres encontrados en los programas,
 * agrupando variantes de la misma persona. Devuelve [{ nombre, alias[] }].
 */
function agruparNombres_(nombres) {
  // 1) Mismo nombre salvo tildes/mayúsculas.
  var porClave = {};
  nombres.forEach(function (nom) {
    nom = texto_(nom);
    if (!nom || /^grupo \d+/i.test(nom)) return;
    var t = tokens_(nom).filter(function (x) { return !PARTICULAS_[x]; });
    var k = t.join(' ');
    var g = porClave[k] = porClave[k] || { clave: k, t: t, nombres: {}, dudoso: false };
    g.nombres[nom] = (g.nombres[nom] || 0) + 1;
  });
  // 2) Un nombre más corto ("Hermes Moraga") se une a uno más largo ("Hermes Moraga S.")
  //    solo si hay un único candidato; si hay varios, queda marcado como dudoso.
  var claves = Object.keys(porClave).sort(function (a, b) { return porClave[a].t.length - porClave[b].t.length; });
  claves.forEach(function (k) {
    var g = porClave[k];
    var mayores = claves.filter(function (o) { return o !== k && porClave[o] && porClave[o].t.length > g.t.length && coincide_(g.t, porClave[o].t); });
    if (mayores.length === 1) {
      var destino = porClave[mayores[0]];
      for (var n in g.nombres) destino.nombres[n] = (destino.nombres[n] || 0) + g.nombres[n];
      delete porClave[k];
    } else if (mayores.length > 1) {
      g.dudoso = true;
    }
  });
  var grupos = Object.keys(porClave).map(function (k) { return porClave[k]; });
  return grupos.map(function (g) {
    var lista = Object.keys(g.nombres).sort(function (a, b) {
      // Preferimos la forma más completa (con tildes) y más usada.
      var ta = a.split(' ').length, tb = b.split(' ').length;
      var ca = (a.match(/[áéíóúñ]/gi) || []).length, cb = (b.match(/[áéíóúñ]/gi) || []).length;
      return (/\.$/.test(a) - /\.$/.test(b)) || (tb - ta) || (cb - ca) || (g.nombres[b] - g.nombres[a]);
    });
    return { nombre: lista[0], alias: lista.slice(1), dudoso: g.dudoso };
  }).sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
}
