# Manual de administración · App Cong. Los Romeros

Para quien administra la app. Explica qué hay en cada lugar, cómo se configura y qué hacer si algo falla.
Las guías para los hermanos y los responsables están dentro de la app (`guia.html` y `guia-responsables.html`).

---

## 1. Cómo está armada

| Pieza | Qué hace | Dónde está |
|---|---|---|
| **App** | Lo que ven los hermanos en el teléfono (se instala como app). No contiene datos. | https://los-romeros.github.io · código en GitHub `los-romeros/los-romeros.github.io`, carpeta `web/` |
| **Servidor (API)** | Lee y escribe las planillas, envía invitaciones, correos y notificaciones. | Proyecto Apps Script ligado a la **planilla central**, cuenta `congrelosromeros@gmail.com` |
| **Planilla central** | La base de datos y la configuración (pestañas abajo). | Drive de la congregación: "Programas Los Romeros" |
| **Hojas de los responsables** | Cada responsable arma su programa en su propia hoja, como siempre. | Drive de cada responsable, compartidas con la cuenta de la congregación |
| **Notificaciones** | Firebase Cloud Messaging (gratis). | Proyecto Firebase `programas-los-romeros` |
| **Inicio de sesión** | Google Sign-In (cliente OAuth publicado). | Google Cloud, proyecto 444480674247 |

Todo es gratis: GitHub Pages, Apps Script, Sheets, Calendar, Gmail (≈100 correos al día) y Firebase.

### El ciclo de un programa
1. El responsable completa un mes en su hoja.
2. Cada 15 minutos el servidor lee las hojas (**sincronizar**). Un mes nuevo queda como **Borrador** y aparece en "Por aprobar" (si empieza dentro de 60 días).
3. El responsable lo **aprueba** en la app → se publica y salen las **invitaciones de calendario**.
4. Los hermanos confirman (Confirmo / No puedo) en la app o en la invitación. Si alguien no puede, se avisa al responsable.
5. Cambios posteriores en la hoja se aplican solos cuando la hoja queda quieta 25 minutos (desde el menú **Sincronizar ahora** se aplican al instante). Cambios hechos en la app se escriben en la hoja del responsable.
6. Para que un mes no aparezca todavía: **ocultar la pestaña** en la hoja del responsable.

---

## 2. Pestañas de la planilla central

| Pestaña | Para qué | ¿Se edita a mano? |
|---|---|---|
| **Inicio** | Configuración (ver sección 3). | Sí |
| **Programas** | Un programa por fila: ID, lector, URL de la hoja del responsable, correo del responsable, si requiere confirmación, quién lo ve. | Sí, con cuidado |
| **Personas** | El directorio: nombre, otras formas de escribirlo, correo, teléfono, grupo, perfiles (Anciano, Participa, Capitán, Secretario), servicio, dirección, contacto de emergencia, confirmación de datos y ubicación en el mapa. | Sí |
| **Grupos** | Superintendente y auxiliar de cada grupo. | Sí |
| **Usuarios** | Quién edita programas: Rol `admin` (todo) o `editor` + lista de programas. El correo del responsable en Programas ya da permiso de edición. | Sí |
| **Avisos** | Avisos del inicio: título, detalle, fecha del evento, fin, hora, lugar, fijo, recordar días antes, visible para. | Sí |
| **Visibilidad** | Reglas para ocultar partes de un programa a ciertos hermanos. | Sí |
| **Enlaces** | Enlaces extra del inicio. | Sí |
| **Fechas especiales** | Fechas con otra hora de reunión. | Sí |
| **Conductor de La Atalaya** | Reemplazos del conductor habitual (lo llena la app). | Normalmente no |
| **Solicitudes No pasar** | Solicitudes de los capitanes (las aprueba el admin en la app). | No |
| **Actualizaciones de datos** | Historial de "Mis datos" (aplicadas, pendientes, aprobadas). | No |
| **Dispositivos** | Teléfonos con avisos activados. | No |
| **Periodos, Asignaciones, Datos** | Estado interno de los programas. | **No tocar** |
| **Registro** | Bitácora de todo lo que pasa (errores incluidos). Lo primero que hay que mirar si algo falla. | No |

### Planillas que crea la app (en el Drive de la congregación)
| Planilla | Contenido | Compartida con |
|---|---|---|
| Informes de predicación | Informes mensuales enviados en la app | — (los superintendentes los ven en la app) |
| Asistencia a las reuniones | Registro + formularios **S-3, S-88 y S-1** listos para imprimir | Secretario (editor) |
| Contactos de emergencia | Lista para imprimir, se actualiza cada día | Ancianos y secretario (solo ver) |
| S-13 Registro de asignación de territorio | "Historial" (una fila por vuelta) + un formulario **S-13** por año de servicio, se completa solo cada día | Felipe y el responsable de predicación (editor) |
| TERRITORIOS LOS ROMEROS ▸ Mapas por territorio | `General.jpg` y `Territorio N.jpg` | — |

Planillas externas que la app lee: "Registro Predicación (Respuestas)" (registro de capitanes), "Listado no pasar - AAAA", formularios antiguos de informes.

---

## 3. Claves de la pestaña Inicio

Las claves nuevas aparecen al ejecutar **Programas ▸ Preparar planilla**. Si una clave no está, se usa el valor por defecto.

### General
| Clave | Por defecto | Qué hace |
|---|---|---|
| `congregacion` | Congregación Los Romeros · Concón | Nombre arriba en la app |
| `mensaje` | Bienvenidos… | Texto de bienvenida |
| `aviso` | (vacío) | Aviso destacado fijo |
| `direccion` | Jardín Poniente 795, Concón | Dirección del Salón |
| `comoLlegar` | enlace JW Hub | Botón "Cómo llegar" |
| `urlApp` | (vacío) | Dirección de la app en los correos |
| `zoomEntreSemana`, `zoomFinSemana`, `zoomPredicacion` | | Enlaces de Zoom |

### Programas y reuniones
| Clave | Por defecto | Qué hace |
|---|---|---|
| `horaEntreSemana` / `horaFinSemana` | 19:30 / 18:30 | Hora por defecto de las reuniones |
| `duracionMin` | 105 | Duración de los eventos de calendario |
| `diasPasados` / `diasFuturos` | 7 / 120 | Rango que muestra la app |
| `diasParaAprobar` | 60 | Cuándo un mes aparece en "Por aprobar" |
| `conductorAtalaya` | Roberto Canales | Conductor habitual (no recibe invitación cada semana) |
| `horaPredicacionPorDefecto` | 10:30 | Hora asumida para salidas sin hora |

### Correos, invitaciones y notificaciones
| Clave | Qué hace |
|---|---|
| `correosActivos`, `invitacionesActivas`, `notificacionesActivas` | Sí/No: interruptores generales |
| `soloEstosCorreos` | **Modo prueba**: si tiene correos, solo ellos reciben correos, invitaciones y avisos. Vacío = todos |
| `remitente` | Nombre del remitente de los correos |
| `firebaseProyecto` | ID del proyecto Firebase |
| `silencioDesde` / `silencioHasta` | 22 / 8 · horas sin notificaciones |
| `avisoDiaAntes`, `horaAvisoDiaAntes` | Recordatorio la tarde anterior (18:00) |
| `resumenSemanal` | Correo de los lunes |
| `avisoRecordarDias`, `horaRecordatorioAvisos` | 7 días / 10:00 · recordatorio de los avisos con fecha |

### Informes, asistencia y datos personales
| Clave | Por defecto | Qué hace |
|---|---|---|
| `informesDesde` | 2026-10 | Primer mes que la app pide |
| `informeEditableHasta` | 20 | Día límite para corregir |
| `diasRecordatorioInforme`, `horaRecordatorioInforme` | 1,5,10 / 10 | Recordatorios del informe |
| `informesFormularios` | | URLs de formularios antiguos que aún se usan |
| `asistenciaRegistran` | anciano, secretario | Quién registra asistencia (además, acomodación de ese día) |
| `asistenciaVen` | secretario | Quién ve el S-88 y la planilla |
| `congregacionNombre`, `ciudad`, `provincia`, `numeroCongregacion` | | Encabezado de S-1 y S-3 |
| `fechaConfirmarDatos` | 01-09 | Fecha anual desde la que todos deben confirmar sus datos |
| `emergenciasVen` | anciano, secretario | Quién ve todos los contactos de emergencia (superintendente y auxiliar ven su grupo) |

### Territorios
| Clave | Por defecto | Qué hace |
|---|---|---|
| `registroPredicacion` | | URL de "Registro Predicación (Respuestas)" |
| `territoriosVisiblePara` | anciano, capitan | Quién ve el registro de territorios |
| `registrosPendientesVer` | Felipe Valderrama, Maximiliano Wilson | Quién ve todas las salidas sin registrar |
| `s13Planilla` | (URL del S-13) | Planilla del S-13 |
| `s13Ven` | Felipe Valderrama | Quién ve el S-13, además del responsable del programa de predicación |
| `s13Desde` | 2026 | Primer año de servicio del S-13 |
| `carpetaTerritorios`, `archivoNoPasar`, `archivoMapa` | | Dónde buscar el listado y el mapa |
| `noPasarVisiblePara`, `noPasarSolicitan`, `noPasarAprueban`, `mapaVisiblePara` | | Permisos de No pasar y mapa |

### Cómo se escribe "quién ve" (Visible para, permisos)
Separado por comas, cualquiera de: `todos`, `privilegiados` (admin y editores), `admin`, `editor`, un perfil (`anciano`, `participa`, `capitan`, `secretario`), `grupo 3`, un correo o un nombre completo. El admin siempre ve todo, salvo `registrosPendientesVer`.

---

## 4. Menú "Programas" (en la planilla central)

| Opción | Cuándo usarla |
|---|---|
| **Sincronizar ahora** | Para aplicar al instante cambios de las hojas de los responsables |
| **Ubicar direcciones en el mapa** | Después de importar direcciones, o si se corrigió "Dirección para el mapa" |
| Actualizar S-13 (territorios) | Para rehacer el S-13 al instante (también se hace solo cada día) |
| Revisar respuestas y recordatorios ahora | Para forzar la revisión de respuestas de calendario |
| Agregar al directorio los nombres de los programas | Al comenzar, para crear Personas desde los programas |
| Crear hoja de aseo (plantilla) | Para generar el programa anual de aseo |
| Importar personas… | Completar datos desde una planilla (solo llena lo vacío) |
| Reparar pestaña Personas | Ordena y une duplicados |
| Reiniciar prueba de invitaciones | Borra eventos e invitaciones de prueba |
| **Preparar planilla** | Después de cada actualización: crea pestañas, columnas y claves nuevas |
| Activar tareas automáticas | Si las tareas dejaron de correr |
| Ver dirección de la API | Muestra la URL del servidor |

### Tareas automáticas
| Tarea | Frecuencia | Qué hace |
|---|---|---|
| `sincronizar` | cada 15 min | Lee las hojas, detecta cambios, invita, avisa choques |
| `tareasHorarias` | cada hora | Respuestas de calendario, recordatorios, aviso del día anterior (18:00), resumen del lunes, recordatorio de informes y de avisos (10:00), y una vez al día: ubicar direcciones, actualizar contactos de emergencia, datos del S-1 y el S-13 |
| `notificacionesFrecuentes` | cada 10 min | Recordatorio a capitanes para registrar la salida (desde 2 h después; pausa 22–8) |

---

## 5. Quién ve qué en la app

| Sección | Quién |
|---|---|
| Programas, mis asignaciones, avisos, eventos, mis datos, informe | Todos los registrados |
| Estados (confirmado/pendiente) de un programa | Responsables y "Estados visibles para" |
| Por aprobar, reasignar, choques, sugerencias, avisar por WhatsApp | Responsable del programa / editores / admin |
| Territorio N y No pasar (mapa y listado) | Todos |
| Registro de territorio (manzanas, historial, próxima salida) | Ancianos y capitanes |
| Informes de grupo | Superintendente y auxiliar (su grupo), secretario y admin (todos) |
| Asistencia (S-88) | Secretario y admin |
| S-13 (botón en Registro de territorios) | Felipe y el responsable del programa de predicación |
| Emergencias | Ancianos y secretario (todos), superintendente y auxiliar (su grupo) |
| Aprobar datos personales y solicitudes No pasar | Admin |

---

## 6. Tareas frecuentes

- **Activar a todos**: dejar vacío `soloEstosCorreos` y en `Sí` los interruptores de correos, invitaciones y notificaciones.
- **Nuevo hermano**: que entre a la app y elija su nombre ("Mis datos"). Si su teléfono coincide, queda registrado solo; si no, aparece en "Requiere tu atención".
- **Nombre que la app no reconoce**: agregarlo en Personas ▸ "Otras formas de escribirlo".
- **Nuevo responsable**: compartir su hoja con `congrelosromeros@gmail.com` (editor), agregar la fila en Programas con su correo.
- **Cambiar un mapa**: reemplazar la imagen en "Mapas por territorio" con el mismo nombre. Si cambia el PDF completo, pedir que se regeneren las imágenes (`tools/pdf2jpg.swift`).
- **S-13**: en la pestaña "Historial" se puede corregir o agregar cualquier fila; lo escrito a mano siempre se respeta (queda como "Manual"). Una fila sin fecha de término es una vuelta en curso: la app solo le completa el término ("Inicio manual"). Las pestañas S-13 se rehacen solas unos 5 a 20 minutos después de editar (y cada día). Criterio automático (el de quien lleva el S-13): una vuelta termina cuando se trabajaron todas las manzanas, o cuando una salida vuelve a trabajar sobre todo manzanas ya hechas (2 de cada 3) y ya se cubrió al menos la mitad del territorio; ahí comienza la vuelta siguiente. No borrar la columna oculta "Control".
- **Aviso con cuenta regresiva**: llenar "Fecha del evento" (y hora). "Fijo" = no se puede quitar.

## 7. Si algo falla

1. Mirar la pestaña **Registro** de la planilla central (los errores quedan ahí).
2. ¿Nadie recibe nada? Revisar interruptores en Inicio y `soloEstosCorreos`.
3. ¿Los cambios no aparecen? **Sincronizar ahora** y cerrar/abrir la app (al final del inicio se ve la versión, p. ej. v40).
4. ¿Un responsable no ve su programa? Revisar que su hoja esté compartida y que la pestaña no esté oculta.
5. ¿Error de permisos al usar el menú? Volver a autorizar (el menú lo pide) y, si es por APIs, habilitarlas en Google Cloud (proyecto 444480674247: Drive, Calendar).
6. ¿Las tareas no corren? **Activar tareas automáticas**.

## 8. Recuperación desde cero

1. El código está en GitHub (`los-romeros/los-romeros.github.io`): `web/` se publica solo al hacer push; `apps-script/` se sube con `clasp push` y `clasp update-deployment AKfycbycdU7MzXKNd2xFniRK3w3CECTjyeDE73fE_cW-7OBffwLWLADeD9O7dN61ogjCM3Vn` (no crear implementaciones nuevas: cambiaría la dirección de la API).
2. Si se perdiera el proyecto Apps Script: crear uno nuevo ligado a la planilla central, subir el código con clasp, implementar como aplicación web (ejecutar como yo, acceso: cualquiera), poner la nueva URL en `web/config.js`, autorizar, **Preparar planilla** y **Activar tareas automáticas**. Las planillas creadas por la app (informes, asistencia, emergencias) se reconectan solas si se guardan sus IDs en Propiedades del script (`INFORMES_ID`, `ASISTENCIA_ID`, `EMERGENCIAS_ID`); si no, se crean de nuevo vacías.
3. Si se perdiera la planilla central: recuperar desde la papelera o el historial de versiones de Drive.
