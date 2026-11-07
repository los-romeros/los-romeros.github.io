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
cd .. && git add -A && git commit -m "…"
gh auth switch --user los-romeros && git -c credential.helper= -c credential.helper='!gh auth git-credential' push; gh auth switch --user aidevfelipe-commits   # publica la web (la cuenta activa da 403)
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
| `Asistencia.js` | Planilla de asistencia con S-3, S-88, S-1 por fórmulas; año de servicio sep–ago. `FORMATO_ASISTENCIA` rehace los formularios si cambia. Desde v45: `modoAsistencia_` = 'directo' (asistenciaVen + admin: registran, aprueban, ven formularios) o 'solicitud' (acomodadores y asistenciaRegistran: pestaña "Solicitudes de asistencia", se escribe al aprobar con `resolverAsistencia_`). Aviso del inicio: acomodador del Auditorio y encargados, desde la hora de inicio hasta que se registre (30 días; `reunionesAsistencia_` lee Datos con caché). Notificación a encargados con `correosEnAudiencia_(…, true)` (sin el admin). |
| `Emergencias.js` | Contactos de emergencia (app + planilla diaria). |
| `S13.js` | S-13 (registro de asignación de territorio): vueltas por territorio calculadas con el registro de predicación (`calcularVueltasS13_`), filas "Manual" del Historial se respetan; formulario por año (`paginaS13_`). Planilla propia (Inicio ▸ `s13Planilla`, por defecto `S13_URL`), dueña congrelosromeros. |
| `Ubicacion.js` | Limpieza de direcciones y geocodificación (Maps de Apps Script); "Ubicación (mapa)" = `lat,lng [~|✓] | texto`. |
| `Casas.js` | Pestaña "Casas de predicación": una fila por lugar de salida (`actualizarCasas_` tras sincronizar predicación y cada día), dueños adivinados por apellido de Familia + dirección/pin de Personas (no se tocan si hay "Revisado por"), `guardarCasa_` (solo admin: dirección para el mapa, pin ✓, dueños), `salidasDesdeCasa_` (ítems "Salida desde tu casa" en Mis asignaciones) y `avisosCasas_` (push 7 días antes a las 10 y el día anterior a las 18). Las salidas llevan `ubic` = "lat,lng" para abrir Maps. |
| `Acomodacion.js` | Generar el programa de acomodación de un mes: listas de la pestaña ACOMODADORES de la hoja del responsable (plataforma = ANCIANOS + SIERVOS; "(A)" = anciano, no cambia nada), pestaña "Condiciones" (se edita desde la app), sin choques con vmc/finsemana del día, reparto parejo con reintentos (`armarAcomodacion_`, pura y probada con fixtures). Copia el formato de la última pestaña, escribe "Mes AAAA" y llama `sincronizar_(false, 'acomodacion')`. Solo si vmc y finsemana del mes están aprobados (`reunionesDelMes_`). |
| `Reportes.js` | Reportes de informes (acción `reportes`: `s1`, `actividad`, `precursores`), activos = participó al menos una vez en `mesesActivo` (6) meses, contando la pestaña "Historial" de la planilla de informes (último mes antes de la app). "Precursores regulares" (filas "Calculado" se rehacen cada día). `recordatoriosInformeGrupos_` (push a sup/aux, `diasRecordatorioInformeGrupo` = "3,5,7,10,15+", sin contar inactivos). `traspasarInformesAntiguos` (menú): copia formularios desde 2026-09, llena Historial y precursores. `importarHistorialInformes` (menú) lee la copia privada `HISTORIAL_IMPORTAR_ID` de "Los Romeros - Registro Predicación" (subida el 2026-11-07; 163/175 nombres reconocidos, sin choques). `analisisGrupo_` (tipo `grupo`): serie 12 meses, irregulares, atención, precursores, puntualidad. `totalesS1_` también lo usa `actualizarDatosS1_`. |
| `AvisosApp.js` | Acción `avisos` (crear/quitar) para admin e Inicio ▸ `avisosPublican`; columna Avisos ▸ "Publicado por"; quitar = "Mostrar hasta" ayer. |
| `Configuracion.js` | Acción `config`: admin edita todas las claves de Inicio (por secciones, `SECCIONES_CONFIG`), permisos de programas y grupos; encargados de programa (responsable o editor de Usuarios, no "Pueden editar") cambian "Pueden editar"/"Pueden confirmar"; sup/aux cambian Grupos ▸ "Pueden ver informes". Todo queda en Registro. |
| `Menu.js` | Menú de la planilla, Inicio por defecto, importaciones. |

## Herramientas locales (tools/)
`xlsx2json.py` + `run-parsers.js` (probar lectores con `originales/`), `build-dev-data.js [AAAA-MM-DD]` (genera `web/dev-data.json` para `?demo`, incluye choques), `pdf2jpg.swift` (PDF → JPG por página, para mapas). Servidor local: `python3 -m http.server 8765` en `web/` y el navegador integrado en `http://localhost:8765/?demo`. El Chrome headless no ejecuta workers de pdf.js; usar el navegador integrado. Si el servidor de vista previa falla con `PermissionError` (no puede leer Documentos), copiar `web/` al scratchpad y lanzarlo con `python3 -I -c "import os,sys,runpy; os.chdir('<copia>'); sys.argv=['http.server','8766']; runpy.run_module('http.server', run_name='__main__')"` (configuración temporal en `.claude/launch.json`, no se sube).
Acceso a Drive desde aquí: script con el token de clasp (`~/.clasprc.json`); solo lee archivos creados por esa app o exportables (la planilla central sí se puede exportar a xlsx para revisar).

## Decisiones y detalles a recordar
- Nombres: "Edgar Naeter" sin Meruane = Edgar Naeter Q. Conductor habitual de La Atalaya: Roberto Canales (no se le invita cada semana).
- Mapa: página 1 general, luego un territorio por página; 10, 11 y 12 comparten página. Imágenes en Drive (privadas), no en GitHub.
- Informes se piden desde octubre 2026. Año de servicio 2027 = sep 2026–ago 2027.
- Registros pendientes de todos: solo Felipe Valderrama y Maximiliano Wilson.
- Correos: desde 2026-10-28 la app no envía correos propios (se quitaron MailApp, `correosActivos`, `remitente`, `resumenSemanal`); solo los de Calendar (invitación y cancelación). Rechazos, recordatorio de confirmar (2 días), choques y programa por revisar van como push.
- Notificaciones: aviso del día anterior 18:00; registro de salida: aviso en app a 1 h, push desde 2 h cada 10 min.
- Choques: no comparar predicación, aseo ni hospitalidad.
- Programas ▸ "Pueden editar": nombres/perfiles/grupo/correos que también editan ese programa (se pidió para Aseo). "Pueden confirmar" (`yo.confirmables`, programa `confirmable`): ven estados, cambian solo el estado (`cambiarEstado_`) y ven "Avisar por WhatsApp"; en la app el editor no muestra nombre ni sugerencias (se pidió para Santiago Acevedo en vmc). `correosEnAudiencia_` reconoce nombres desde v44. El editor de un asignado de grupo (aseo, hospitalidad) muestra una lista de grupos.
- Apps Script comparte un solo espacio global: antes de crear una función, revisar que el nombre no exista en otro archivo (`grep -ho "^function [A-Za-z0-9_]*" apps-script/*.js | sort | uniq -d`).
- S-13: el papel (docx "S-13_S 2023 a 2026") se cargó como filas Manual desde sep-2025. El 2026-10-27 Maximiliano Wilson revisó el Historial: todo lo completado quedó fijo ("Manual (revisado)/(corregido)") y lo en curso como "Inicio manual". Criterio de cierre (ajustado a su revisión: coincide 11/22 exactas vs 3 con el anterior): todas las manzanas, o salida con ≥2/3 de manzanas repetidas y ≥50 % cubierto. Columna oculta "Control" detecta filas automáticas editadas. `alEditarS13` (onEdit instalado por `asegurarTareas_`) + `revisarS13Editado_` en `sincronizar_` rehacen el S-13 5 min después de editar. Lo ven Felipe (`s13Ven`) y el responsable de predicación. Desde v48: "Última fecha en que se completó" toma también las vueltas asignadas antes del año que terminaron ya dentro de él (antes salía la anterior: T2 18/03 en vez de 05/09/2026), y entre dos vueltas fijas no se inventan vueltas automáticas con menos de la mitad de las manzanas (eran salidas sueltas: T8 07/09/2025, T15 30/07/2025, T20 31/01/2026).

- 2026-11-07 (v49): Configuración (admin, `#config`) y Permisos (encargados, `#permisos`); Informes con pestañas Quién falta / Actividad / Precursores / S-1; acceso de Daniel Gaete a todos (`informesVen`) y de Felipe González al grupo 2 (Grupos ▸ "Pueden ver informes", sembrado una vez por `sembrarPermisosInformes_` al Preparar planilla); recordatorios a sup/aux. v50: tuerca en la cabecera (no baldosa), "Ver análisis de mi grupo" arriba en Informes, avisos publicados desde la app por Felipe González y Hermes Moraga, importador del historial.

## Estado actual (2026-11-01)
- Web **v50** (pie de la app), API **@54**. Todo publicado y en `main`; el árbol de trabajo queda limpio al cerrar cada sesión.
- En producción con los hermanos: login, programas, confirmaciones, Mis datos (registro, dirección, emergencia, pin, confirmación anual), informes, territorios, asistencia, emergencias, avisos/eventos.
- **Configuración hecha y verificada el 2026-11-01**: Preparar planilla (columnas "Pueden editar"/"Pueden confirmar"; "Casas de predicación" ya con 27 casas), `asistenciaVen` = `secretario, Daniel Gaete`, vmc ▸ "Pueden confirmar" = `Santiago Acevedo`. `asistenciaRegistran` quedó en `anciano, secretario` (los ancianos ven la asistencia y la envían para aprobar; decisión de Felipe). La pestaña "Solicitudes de asistencia" aún no existe: se crea sola con la primera solicitud. Acomodación usa un Google Sheet nuevo (id `11rZ9Kq-pnS_tI-2sDpmn3j0Ttj7MAL2hLU2k6RYnpOA`), revisado: se lee igual que el anterior y la app escribe en él (condiciones de Patricio Quiroz y Roberto Canales). Felipe dice haber quitado la condición mal escrita "Patr" (no se pudo verificar: ese archivo no se puede leer desde aquí).
- Pendiente del usuario:
  - Para direcciones, **Ubicar direcciones en el mapa** (aún no confirmó resultado del geocodificador).
- Sin verificar en producción (solo demo y pruebas locales con fixtures): generar acomodación en la hoja real (copia de pestaña, título, merges), casas/dueños/avisos de dueños de casa, asistencia con aprobación (solicitud → push a encargados → aprobar), que se instale el disparador `alEditarS13` y rehaga el S-13 tras editar; formularios S-1/S-3/S-88 generados por script, geocodificador, planilla de emergencias, recordatorio push de avisos.
- **Publicar la web**: `git push` con la cuenta activa `aidevfelipe-commits` da 403. Hay que usar la cuenta `los-romeros` de `gh` (ver "Publicar"); el clasificador de permisos exige que el usuario lo autorice explícitamente en cada mensaje ("Sí, publícala").
- **Revisar archivos desde aquí**: la planilla central se exporta con `~/.claude/skills/programa-predicacion/scripts/drive.sh <id> salida.xlsx` y se lee con `/usr/local/bin/python3` (tiene openpyxl; el `python3 -I` del PATH no). Hojas de responsables no creadas por la app (p. ej. la nueva de acomodación) dan 403 con ese token y el conector de Sheets tampoco las ve: revisar lo que deja el servidor en Registro y Periodos.

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
10. 2026-11-01 (v43–v47): aseo editable por grupo y permisos por nombre ("Pueden editar", "Pueden confirmar" con estado y WhatsApp); casas de predicación (corregir mapa, dueños de casa con aviso 7 y 1 día antes); registrar predicación dentro del territorio y mapa en el formulario; generador del programa de acomodación con condiciones (explicadas en la Guía para responsables #condiciones); asistencia con aprobación (acomodadores envían, encargados `asistenciaVen` aprueban; aviso al acomodador del Auditorio desde el inicio de la reunión).

- 2026-11-05: Google falló al abrir la planilla de informes y `planillaInformes_` creó otra vacía (informes "reseteados"). API @52: `abrirGuardada_` (Planilla.js) reintenta y avisa en vez de crear otra (informes, asistencia, emergencias); `repararInformes_` vuelve a la original (`INFORMES_ORIGINAL`) y traspasa lo de la creada por error. Verificar en Registro "Planilla de informes restaurada".

## Análisis entregados al usuario (para no repetirlos)
- **Servidor pagado**: no recomendado por ahora (USD 5–25/mes + mantenimiento). Límite real a vigilar: tiempo diario de triggers en cuenta gratuita (~90 min/día); si aparecen errores de tiempo excedido en Registro, bajar `sincronizar` a cada 30 min en `asegurarTareas_`.
- **Reutilizar en otras apps**: casi todo es reutilizable (PWA + Apps Script + Sheets, login, FCM, Calendar, escritura segura, modo demo, versión visible, WhatsApp, mapas, PDF→JPG, formularios imprimibles).

## Ideas pendientes (el usuario las pidió "a futuro")
- **Skill "app-gratuita-google"**: creada el 2026-10-27 en `~/.claude/skills/app-gratuita-google/` (método, reglas, configuración inicial paso a paso, problemas resueltos, patrones y plantilla en `assets/plantilla/` que se copia con `scripts/nueva-app.sh`). Falta, si el usuario lo pide: publicar la plantilla como repositorio plantilla en GitHub y cargar la skill en claude.ai (archivo .skill).
- **Programa de predicación**: desde nov-2026 se arma con la skill privada `programa-predicacion` (`~/.claude/skills/`, fuera del repo porque tiene nombres y direcciones), que escribe la pestaña del mes en la planilla del responsable con el conector de Google Sheets. Felipe quiere llevarlo a la app más adelante, pero no todavía, porque probablemente cambiará la organización de los territorios.
- **Generar automáticamente el programa del mes siguiente**: acomodación hecha en v43 (`Acomodacion.js`). Faltan, si se pide: predicación (hoy con la skill privada), fin de semana y VMC.
- **Respaldo automático semanal** de las planillas (requiere scope `drive` completo y reautorizar). El usuario lo dejó para después.
