// Configuración pública de la app (nada de esto es secreto). Se usa también en el service worker.
self.APP_CONFIG = {
  // ID de cliente de Google (termina en .apps.googleusercontent.com).
  googleClientId: '444480674247-6rv3rha3bj12vbrvr8g6cia475skcada.apps.googleusercontent.com',
  // Dirección de la API (implementación web de Apps Script). Vacía = usa dev-data.json (solo pruebas locales).
  apiUrl: 'https://script.google.com/macros/s/AKfycbycdU7MzXKNd2xFniRK3w3CECTjyeDE73fE_cW-7OBffwLWLADeD9O7dN61ogjCM3Vn/exec',
  // Notificaciones (Firebase). Se completan al configurar Firebase; vacías = sin notificaciones.
  firebase: {
    apiKey: 'AIzaSyDeyBeuH9m_hZEMvD8FglI7abHVM3aF6n4',
    authDomain: 'programas-los-romeros.firebaseapp.com',
    projectId: 'programas-los-romeros',
    storageBucket: 'programas-los-romeros.firebasestorage.app',
    messagingSenderId: '444480674247',
    appId: '1:444480674247:web:62e1957595d2b7c14321e2'
  },
  avisos: true,
  vapidKey: 'BElay6wljR3tvXhO4RXP3Qvfx1YZugW_Y63TiG9biAAWT1Hu5OlsfVw_M2JgJUeXelckoWcMWnULVe4SmEhnFYA'
};
