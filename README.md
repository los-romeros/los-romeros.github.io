# Programas Los Romeros

App gratuita para publicar los programas de la congregación y seguir las confirmaciones de las asignaciones.

## Piezas

| Carpeta | Qué es | Dónde vive |
|---|---|---|
| `web/` | App instalable que ve la congregación (sin datos personales en el código) | GitHub Pages |
| `apps-script/` | Lectores de programas, sincronización, API, menú de la planilla | Proyecto Apps Script ligado a la planilla central (cuenta de la congregación) |
| `tools/` | Pruebas locales de los lectores con los Excel de `originales/` | Solo en este computador |
| `originales/` | Excel de ejemplo de cada responsable. **Contiene datos personales: nunca se sube** | Solo en este computador |

## Cómo funciona

1. Cada responsable sigue trabajando en su propia hoja de Google Sheets, compartida con la cuenta de la congregación (solo lectura basta).
2. Cada 15 minutos la planilla central lee esas hojas (`sincronizar`) y registra los periodos nuevos como **Borrador**.
3. Al pasar un periodo a **Aprobado**, sus asignaciones quedan publicadas en la app.
4. La app pide los datos a la API (`doGet?accion=publico`), que entrega nombres abreviados, sin correos ni teléfonos.

## Pruebas locales

```bash
python3 tools/xlsx2json.py          # exporta originales/*.xlsx a tools/fixtures
node tools/run-parsers.js           # muestra lo que entiende cada lector
node tools/names.js                 # borrador del directorio de personas
node tools/build-dev-data.js        # genera web/dev-data.json para ver la app local
python3 -m http.server 8766 --directory web
```

## Publicar cambios

```bash
cd apps-script && clasp push        # código del servidor
git push                            # app web (GitHub Pages)
```

## Identificadores

- API (implementación fija, no cambiar): `AKfycbycdU7MzXKNd2xFniRK3w3CECTjyeDE73fE_cW-7OBffwLWLADeD9O7dN61ogjCM3Vn`
  Para publicar una versión nueva de la API sin cambiar la dirección:
  `clasp push && clasp update-deployment AKfycbycdU7MzXKNd2xFniRK3w3CECTjyeDE73fE_cW-7OBffwLWLADeD9O7dN61ogjCM3Vn`
