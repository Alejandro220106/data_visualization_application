# Herramienta graficadora

Aplicación web de uso académico para visualizar los datos del proyecto **«Uso y dependencia académica percibida de la inteligencia artificial en estudiantes de la UTN, Sede Regional de San Carlos: EcoCampus y Lourdes»** (ITI-624, III cuatrimestre 2026).

Está construida con **HTML, CSS y JavaScript** y usa **Chart.js** como componente de gráficos. Se abre desde un navegador en computadora o teléfono, sin instalar ningún programa. El CSV se procesa únicamente en el navegador: no se envía a ningún servidor.

## Qué hace

- Importa el CSV depurado exportado desde Google Forms / Google Sheets (también se puede arrastrar el archivo).
- Permite seleccionar la variable (pregunta) de interés.
- Genera **gráficos de barras** de frecuencias, sugeridos automáticamente, y permite cambiar a **barras verticales u horizontales**, **circular** o **araña (radar)** cuando la pregunta lo admite.
- Muestra las **escalas con barras ordenadas** por nivel: 1–5, 0–7 días, Nunca → Siempre y Totalmente en desacuerdo → Totalmente de acuerdo.
- **Filtra por recinto** y **compara EcoCampus y Lourdes** en barras agrupadas o en araña, con porcentajes calculados dentro de cada recinto.
- Cada gráfico lleva un **pie de figura** con «Fuente» y «Nota» (por qué se usó ese tipo de gráfico), que también se incluye en el PNG descargado.
- Cada gráfico identifica la variable (título), las categorías (eje), la unidad de medida (título del eje) y el número de respuestas válidas (*n* en el subtítulo).
- Identifica las preguntas de **selección múltiple**: cuenta cada opción y calcula los porcentajes sobre las personas que respondieron, por lo que pueden sumar más de 100 %.
- Los **valores faltantes no se transforman en ceros**. Las omisiones y las respuestas **«No aplica»** se excluyen de los porcentajes válidos y se informan por separado.
- Incluye una **explicación de lectura** de cada gráfico: respuesta más frecuente, mediana o promedio, exclusiones y limitaciones del estudio.
- Muestra una tabla de frecuencias como alternativa accesible al gráfico.
- Permite **descargar el gráfico** como imagen PNG.
- Advierte si el CSV parece contener identificadores personales (nombre, correo, cédula, etc.).

## Uso

### Opción 1: abrir el archivo

Abre `index.html` con doble clic. Funciona sin servidor; solo el botón «Usar datos de ejemplo» necesita uno (ver la opción 2). Sin servidor, elige el CSV con «Elegir archivo CSV».

### Opción 2: servidor local

```bash
python -m http.server 8080
```

Luego abre `http://localhost:8080`.

### Opción 3: enlace público para la prueba con usuarios

El documento prevé entregar a los participantes un enlace a la herramienta. Como es un sitio estático, se puede publicar con **GitHub Pages**: *Settings → Pages → Deploy from a branch → main / (root)*. El enlace queda como `https://<usuario>.github.io/data_visualization_application/`.

Para que los participantes vean los datos del estudio sin importar un archivo, reemplaza `datos/encuesta_ia.csv` por el CSV depurado real (sin identificadores personales) y cambia el texto del botón en `index.html`.

## Datos de ejemplo

`datos/encuesta_ia.csv` contiene **40 respuestas sintéticas** con la misma estructura del primer formulario: elegibilidad, recinto, carrera, nivel, uso en 30 días, frecuencia en 7 días, finalidades (selección múltiple), los tres ítems de dependencia percibida (1–5) y las tres conductas de autonomía (con «No aplica»). No son datos reales.

## Cómo interpreta cada pregunta

| Tipo | Cómo se detecta | Gráfico |
|---|---|---|
| Opción única | Texto con pocas categorías repetidas | Barras de mayor a menor frecuencia |
| Selección múltiple | Celdas con opciones separadas por «, » que se repiten entre personas | Barras horizontales; % sobre personas |
| Escala | Enteros entre 0 y 10, o niveles Nunca → Siempre / Totalmente en desacuerdo → Totalmente de acuerdo | Barras en el orden de la escala, con todos sus niveles |
| Numérica | Números fuera del rango de escala (por ejemplo, edades) | Barras por intervalos (regla de Sturges) |
| Respuesta abierta | Casi todas las respuestas distintas (por ejemplo, la marca temporal) | No se grafica |

La columna de recinto se reconoce porque su encabezado contiene la palabra «recinto».

## Tipos de gráfico

El selector «Tipo de gráfico» empieza en **Automático**, que usa la sugerencia de la tabla anterior. Los tipos que no convienen para la pregunta aparecen deshabilitados y la herramienta explica por qué:

| Tipo | Cuándo se ofrece | Por qué no en otros casos |
|---|---|---|
| Barras verticales | Siempre | — |
| Barras horizontales | Siempre | — |
| Circular | Opción única o escala con hasta 7 categorías, sin comparar recintos | En selección múltiple los porcentajes suman más de 100 %; al comparar habría dos totales; con muchas categorías los sectores no se distinguen |
| Araña (radar) | Entre 3 y 12 categorías, también al comparar recintos | Con menos de 3 categorías no se forman los ejes; los intervalos numéricos se leen mejor en barras |

Si eliges un tipo y cambias a una pregunta que no lo admite, se muestra el sugerido; al volver a una pregunta compatible se recupera tu elección. En el gráfico circular de una escala, el color se oscurece con el nivel para conservar el orden.

El promedio exploratorio de los tres ítems de dependencia (sección 1.5 del documento) se calcula en Google Sheets antes de exportar, solo para quienes respondieron los tres ítems. La herramienta grafica esa columna como cualquier otra variable numérica.

## Estructura

```
index.html            Página de la herramienta
css/estilos.css       Estilos (móvil primero, adaptables a computadora)
js/csv.js             Lectura y validación del CSV
js/tipos.js           Detección del tipo de pregunta, «No aplica» y escalas
js/estadisticas.js    Frecuencias, filtro, comparación por recinto y medidas descriptivas
js/lectura.js         Explicaciones de lectura
js/grafico.js         Gráficos de barras, circular y araña (Chart.js) y sus reglas
js/descarga.js        Descarga del gráfico en PNG con pie de figura
js/privacidad.js      Aviso de identificadores personales
js/app.js             Interfaz: conecta todo lo anterior
vendor/               Chart.js 4.4.7 (licencia MIT), incluido localmente
datos/                CSV de ejemplo
tests/                Pruebas con node:test
```

## Pruebas

Requieren Node.js 20 o superior y no instalan dependencias:

```bash
npm test
```

## Limitaciones

- Solo se aceptan CSV en UTF-8, que es como los exporta Google Sheets.
- Se muestra un gráfico a la vez.
- Las comparaciones entre recintos son descriptivas: no indican diferencias estadísticamente significativas.
- Los resultados describen a quienes respondieron y no se generalizan a toda la población estudiantil.
