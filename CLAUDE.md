# CLAUDE.md · Contexto para continuar el trabajo

App gratuita de la congregación **Los Romeros (Concón, Chile)**: programas de reuniones, asignaciones con confirmación, predicación y territorios, informes, asistencia, emergencias. El usuario (Felipe Valderrama, admin) escribe en español y espera respuestas en español, claras y sin jerga técnica. Manual para humanos: `docs/MANUAL-ADMIN.md` (pestañas, claves de Inicio, menú, permisos). Este archivo es para sesiones de Claude.

## Reglas de trabajo acordadas
- **Gratis y mantenimiento cero**: solo GitHub Pages + Google Apps Script + Sheets + Calendar + Gmail + Firebase FCM. Nada de servidores pagos.
- **Datos personales nunca en Git** (repo PÚBLICO). Ignorados: `originales/`, `tools/fixtures/`, `tools/out/`, `web/dev-*.json`, `web/dev-mapa.pdf`. Al revisar datos reales, mostrar solo conteos o lo mínimo.
- Se publica directo en `main` (el usuario lo aprobó desde el inicio). Commits en español, con `Co-Authored-By`.
- Cada cambio de la web: subir `VERSION` en `web/sw.js` **y** `VERSION_APP` en `web/app.js` (deben ser iguales; se muestra en el pie como "Versión vNN").
- Probar en modo demo (`?demo`) antes de publicar; decir con honestidad qué no se pudo probar (todo lo que corre solo en Apps Script).
- No ejecutar funciones remotas del servidor desde aquí (el clasificador lo bloquea): el usuario las corre desde el menú de la planilla.

## Arquitectura
- `web/` → PWA en https://los-romeros.github.io (Actions publica `web/` en cada push a main). Vanilla JS en un solo IIFE (`app.js`), rutas por hash (`#p/<prog>`, `#mias`, `#t/<n>`, `#territorios`, `#informes`, `#asistencia`, `#emergencias`, `#eventos`, `#datos`, `#mapa`, `#nopasar/<n>`). `config.js` = apiUrl, googleClientId, firebase, vapidKey (públicos). `sw.js` = caché + FCM en segundo plano.
- `apps-script/` → servidor ligado a la planilla central (`clasp`, cuenta congrelosromeros@gmail.com). `doPost` con JSON en `text/plain` (evita CORS). Sesión: login Google (tokeninfo) → token HMAC propio de 180 días.
- Planilla central id `1K6aSB-DTyZk11eOEFmxYjPnRleJXTEkAiFTg6t0ct3k`. Definición de pestañas en `Planilla.js` (`HOJAS`), claves de Inicio en `Menu.js` (`INICIO_POR_DEFECTO`). Las columnas nuevas aparecen al ejecutar **Preparar planilla** (o `asegurarColumnas_`).
- Deployment API fijo: `AKfycbycdU7MzXKNd2xFniRK3w3CECTjyeDE73fE_cW-7OBffwLWLADeD9O7dN61ogjCM3Vn`. Nunca crear otro.
- GCP estándar 444480674247 (APIs Drive y Calendar habilitadas; OAuth publicado). Firebase `programas-los-romeros`.

## Publicar
```bash
cd apps-script && clasp push -f && clasp update-deployment AKfycbycdU7MzXKNd2xFniRK3w3CECTjyeDE73fE_cW-7OBffwLWLADeD9O7dN61ogjCM3Vn -d "descripción"
cd .. && git add -A && git commit -m "…" && git push      # publica la web
```
Verificar sintaxis antes: `for f in apps-script/*.js; do node --check $f; done; node --check web/app.js`.

## Archivos del servidor (apps-script/)
| Archivo | Contenido |
|---|---|
| `Parsers.js` | Lectores de las hojas de cada responsable (`LECTORES`: vmc, acomodacion, finsemana, predicacion, aseo). Cada asignado lleva `celda` para escribir de vuelta. Fechas escritas como texto en VMC (`fechaTexto_`). |
| `Nombres.js` | Reconocer nombres con tolerancia (tokens, iniciales, distancia ≤2). |
| `Planilla.js` | `HOJAS`, `leerTabla_`, `actualizarFila_`, `reescribirTabla_` (escribe y luego limpia; FALSE de casillas = vacío), `config_`, `registrar_`. |
| `Sincronizar.js` | `sincronizar_` (cada 15 min; espera 25 min en periodos aprobados salvo `sincronizar(true)` desde el menú), asignaciones, conductor de La Atalaya (`agregarConductor_`). |
| `Api.js` | `doPost` (acciones), `construirBase_` (caché 10 min), `datosUsuario_`, reasignar con escritura en la hoja de origen, avisos (`avisoDeFila_`, `fechasDeTexto_`, `recordatoriosAvisos_`). |
| `Sesion.js` | Sesiones, `perfil_`, `enAudiencia_` (todos, privilegiados, rol, perfil, grupo N, correo, nombre). |
| `Calendario.js` | Invitaciones, `nombreAsignacion_`, `tareasHorarias` (cada hora), `asegurarTareas_`. |
| `Notificaciones.js` | FCM v1, silencio nocturno, `probarAviso_`, recordatorios de registro (cada 10 min). |
| `Choques.js` | Choques (solo acomodación/AV vs vmc/finsemana) y sugerencias de reemplazo por participación. |
| `Territorios.js` | Registro de predicación (planilla de capitanes), resumen por territorio, pendientes de todos. |
| `Documentos.js` | No pasar (listado y solicitudes), mapas (imágenes en "Mapas por territorio"). |
| `Informes.js` | Informe mensual (planilla propia), recordatorios, `informesDesde`. Mes guardado como texto (`mesTexto_`). |
| `Datos.js` | "Mis datos": registro por teléfono, apodo, dirección, emergencia, confirmación anual (`fechaConfirmarDatos`), pin del mapa. |
| `Asistencia.js` | Planilla de asistencia con S-3, S-88, S-1 por fórmulas; año de servicio sep–ago. `FORMATO_ASISTENCIA` rehace los formularios si cambia. |
| `Emergencias.js` | Contactos de emergencia (app + planilla diaria). |
| `S13.js` | S-13 (registro de asignación de territorio): vueltas por territorio calculadas con el registro de predicación (`calcularVueltasS13_`), filas "Manual" del Historial se respetan; formulario por año (`paginaS13_`). Planilla propia (Inicio ▸ `s13Planilla`, por defecto `S13_URL`), dueña congrelosromeros. |
| `Ubicacion.js` | Limpieza de direcciones y geocodificación (Maps de Apps Script); "Ubicación (mapa)" = `lat,lng [~|✓] | texto`. |
| `Menu.js` | Menú de la planilla, Inicio por defecto, importaciones. |

## Herramientas locales (tools/)
`xlsx2json.py` + `run-parsers.js` (probar lectores con `originales/`), `build-dev-data.js [AAAA-MM-DD]` (genera `web/dev-data.json` para `?demo`, incluye choques), `pdf2jpg.swift` (PDF → JPG por página, para mapas). Servidor local: `python3 -m http.server 8765` en `web/` y el navegador integrado en `http://localhost:8765/?demo`. El Chrome headless no ejecuta workers de pdf.js; usar el navegador integrado.
Acceso a Drive desde aquí: script con el token de clasp (`~/.clasprc.json`); solo lee archivos creados por esa app o exportables (la planilla central sí se puede exportar a xlsx para revisar).

## Decisiones y detalles a recordar
- Nombres: "Edgar Naeter" sin Meruane = Edgar Naeter Q. Conductor habitual de La Atalaya: Roberto Canales (no se le invita cada semana).
- Mapa: página 1 general, luego un territorio por página; 10, 11 y 12 comparten página. Imágenes en Drive (privadas), no en GitHub.
- Informes se piden desde octubre 2026. Año de servicio 2027 = sep 2026–ago 2027.
- Registros pendientes de todos: solo Felipe Valderrama y Maximiliano Wilson.
- Notificaciones: aviso del día anterior 18:00; registro de salida: aviso en app a 1 h, push desde 2 h cada 10 min.
- Choques: no comparar predicación, aseo ni hospitalidad.
- S-13: el papel (docx "S-13_S 2023 a 2026") se cargó como filas Manual desde sep-2025. El 2026-10-27 Maximiliano Wilson revisó el Historial: todo lo completado quedó fijo ("Manual (revisado)/(corregido)") y lo en curso como "Inicio manual". Criterio de cierre (ajustado a su revisión: coincide 11/22 exactas vs 3 con el anterior): todas las manzanas, o salida con ≥2/3 de manzanas repetidas y ≥50 % cubierto. Columna oculta "Control" detecta filas automáticas editadas. `alEditarS13` (onEdit instalado por `asegurarTareas_`) + `revisarS13Editado_` en `sincronizar_` rehacen el S-13 5 min después de editar. Lo ven Felipe (`s13Ven`) y el responsable de predicación.

## Estado actual (2026-10-27)
- Web **v42** (pie de la app), API **@45**. Todo publicado y en `main`; el árbol de trabajo queda limpio al cerrar cada sesión.
- En producción con los hermanos: login, programas, confirmaciones, Mis datos (registro, dirección, emergencia, pin, confirmación anual), informes, territorios, asistencia, emergencias, avisos/eventos.
- Pasos que el usuario debe correr en la planilla tras actualizaciones: **Preparar planilla** (columnas/claves nuevas) y, para direcciones, **Ubicar direcciones en el mapa** (aún no confirmó resultado del geocodificador).
- Sin verificar en producción (solo demo): que se instale el disparador `alEditarS13` y rehaga el S-13 tras editar; formularios S-1/S-3/S-88 generados por script, geocodificador, planilla de emergencias, recordatorio push de avisos.

## Historial resumido (para entender por qué las cosas son como son)
1. Base: lectores de las hojas de cada responsable → Borrador → aprobación → invitaciones de Calendar; confirmación y reasignación con escritura en la hoja de origen; login Google obligatorio; diseño crema/pizarra con baldosas.
2. Perfiles (anciano, participa, capitán, secretario) y "visible para"; Zoom; cómo llegar; hospitalidad con superintendente y auxiliar.
3. Capitanes: registro de lo trabajado (planilla del formulario existente), avisos push; territorios; No pasar con solicitudes; mapa.
4. Informes mensuales (desde oct-2026) con recordatorios y vista por grupo con WhatsApp "Recordar".
5. "Mis datos" para registrar correo/teléfono/nombre; importaciones desde "Los Romeros - Registro Predicación.xlsx" (teléfonos, dirección, emergencia).
6. Choques y sugerencias de reemplazo; mis asignaciones; filtros de predicación; conductor de La Atalaya; bosquejos jw.org (docid = 1000000 + n − 1).
7. Mapas: PDF de 37 MB → JPG por territorio en Drive; vista "Territorio N y No pasar" con registro, manzanas sugeridas y próximas salidas.
8. Asistencia (S-1/S-3/S-88), emergencias, confirmación anual de datos con fecha fija, pin en mapa, avisos con cuenta regresiva/calendario/quitar/recordatorio y listado de eventos.
9. Documentación: este archivo y `docs/MANUAL-ADMIN.md` (enlazado en la app solo para admin).

## Análisis entregados al usuario (para no repetirlos)
- **Servidor pagado**: no recomendado por ahora (USD 5–25/mes + mantenimiento). Límite real a vigilar: tiempo diario de triggers en cuenta gratuita (~90 min/día); si aparecen errores de tiempo excedido en Registro, bajar `sincronizar` a cada 30 min en `asegurarTareas_`.
- **Reutilizar en otras apps**: casi todo es reutilizable (PWA + Apps Script + Sheets, login, FCM, Calendar, escritura segura, modo demo, versión visible, WhatsApp, mapas, PDF→JPG, formularios imprimibles).

## Ideas pendientes (el usuario las pidió "a futuro")
- **Skill "app-gratuita-google" + repositorio plantilla** (propuesto el 2026-10-25, esperando su respuesta): skill con el método, reglas y problemas resueltos (OAuth "acceso bloqueado", APIs Drive/Calendar en GCP, CORS con text/plain, update-deployment, FALSE en casillas, caché del SW); repo plantilla vacío con login, push, modo demo y planilla base. Crear la skill con la skill `skill-creator`.
- **Generar automáticamente el programa del mes siguiente** (analizado, no desarrollado): pestañas "Habilitados · [programa]", "Reglas · [programa]" y "No disponibles"; elegir por quien lleva más tiempo sin el rol; escribir en una pestaña nueva de la hoja del responsable solo en celdas vacías. Orden sugerido: acomodación → predicación (con territorio sugerido) → fin de semana → VMC.
- **Respaldo automático semanal** de las planillas (requiere scope `drive` completo y reautorizar). El usuario lo dejó para después.
