// Guarda la app para abrirla sin conexión (los datos se guardan aparte, en localStorage)
// y muestra las notificaciones que llegan por Firebase Cloud Messaging.
var VERSION = 'v34';
var FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
importScripts('config.js');
if (self.APP_CONFIG && self.APP_CONFIG.firebase) {
  try {
    importScripts(FIREBASE_SDK + 'firebase-app-compat.js', FIREBASE_SDK + 'firebase-messaging-compat.js');
    firebase.initializeApp(self.APP_CONFIG.firebase);
    firebase.messaging().onBackgroundMessage(function (m) {
      var d = m.data || {};
      return self.registration.showNotification(d.titulo || 'Programas', {
        body: d.cuerpo || '', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
        tag: d.tag || undefined, renotify: !!d.tag, data: { url: d.url || './' }
      });
    });
  } catch (e) { /* sin notificaciones */ }
}

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var destino = new URL((e.notification.data && e.notification.data.url) || './', self.location.href).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (lista) {
    for (var i = 0; i < lista.length; i++) {
      if ('focus' in lista[i]) { lista[i].navigate(destino); return lista[i].focus(); }
    }
    return self.clients.openWindow(destino);
  }));
});
var ARCHIVOS = ['./', 'index.html', 'styles.css', 'app.js', 'config.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(ARCHIVOS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  var propio = url.origin === location.origin;
  var fuente = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || (url.hostname === 'cdnjs.cloudflare.com' && url.pathname.indexOf('/pdf.js/') >= 0);
  if (!propio && !fuente) return; // la API siempre va a la red
  // Red primero (para recibir actualizaciones), caché si no hay conexión.
  e.respondWith(fetch(e.request).then(function (r) {
    if (r && (r.ok || r.type === 'opaque')) {
      var copia = r.clone();
      caches.open(VERSION).then(function (c) { c.put(e.request, copia); });
    }
    return r;
  }).catch(function () {
    return caches.match(e.request).then(function (r) { return r || caches.match('index.html'); });
  }));
});
