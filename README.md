# Herramienta graficadora

Aplicación web de uso académico para visualizar los datos del proyecto **«Uso y dependencia académica percibida de la inteligencia artificial en estudiantes de la UTN, Sede Regional de San Carlos: EcoCampus y Lourdes»** (ITI-624, III cuatrimestre 2026).

Está construida con **HTML, CSS y JavaScript** y usa **Chart.js** como componente de gráficos. Se abre desde un navegador en computadora o teléfono, sin instalar ningún programa. El CSV se procesa únicamente en el navegador: no se envía a ningún servidor. La interfaz usa un **tema oscuro**.

## Qué hace

- Importa el CSV depurado exportado desde Google Forms / Google Sheets (también se puede arrastrar el archivo).
- Permite seleccionar la variable (pregunta) de interés e indica su tipo y su **serie estadística** (cualitativa, cuantitativa, geográfica o cronológica).
- Genera **gráficos de barras** de frecuencias, sugeridos automáticamente, y permite cambiar a **5 tipos de gráfico**: barras verticales, barras horizontales, circular, líneas y araña cuando la pregunta los admite.
- Muestra las **escalas con barras ordenadas** por nivel: 1–5, 0–7 días, Nunca → Siempre y Totalmente en desacuerdo → Totalmente de acuerdo.
- **Filtra por recinto** y **compara EcoCampus y Lourdes** (barras agrupadas, líneas o araña), con porcentajes calculados dentro de cada recinto.
- Cada gráfico identifica la variable (título), las categorías (eje), la unidad de medida (título del eje) y el número de respuestas válidas (*n* en el subtítulo del PNG; en pantalla está en la tarjeta «Respuestas válidas»).
- Identifica las preguntas de **selección múltiple**: cuenta cada opción y calcula los porcentajes sobre las personas que respondieron, por lo que pueden sumar más de 100 %.
- Los **valores faltantes no se transforman en ceros**. Las omisiones y las respuestas **«No aplica»** se excluyen de los porcentajes válidos y se informan por separado.
- Calcula las **medidas de posición y variabilidad** del curso: media, mediana (con su posición (n + 1)/2), moda (incluido cuando no existe o hay dos), rango y desviación estándar.
- Para variables numéricas arma la **distribución de frecuencias por clases** con el esquema del curso: límites indicados y reales, punto medio, frecuencia absoluta y relativa, y acumuladas «menos de» y «más de».
- Grafica la **marca temporal** de Google Forms como serie cronológica (respuestas por día).
- Incluye una **explicación de lectura** de cada gráfico. El PNG descargado lleva además un **pie de figura** con «Fuente» y «Nota: Se usó … porque …» (en pantalla no se muestra, para dejarle el espacio al gráfico).
- Muestra una tabla de frecuencias como alternativa accesible al gráfico.
- Permite **descargar el gráfico** como PNG con **fondo blanco**, a 2000 px de ancho, con su pie de figura, listo para el informe.
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

El botón «Usar datos del estudio» carga la encuesta real desde `datos/`, así los participantes ven los resultados sin importar un archivo.

Al publicar una nueva versión, cambia el sufijo `?v=20261028` de los archivos en `index.html` (por ejemplo, por la fecha del cambio). Así los navegadores no mezclan archivos viejos guardados en caché con los nuevos.

## Datos del estudio

`datos/` contiene las respuestas reales descargadas de Google Forms, sin identificadores personales:

- `Uso académico de IA en EcoCampus y Lourdes — ITI-624.csv`: encuesta inicial (54 respuestas).
- `Evaluación de la herramienta graficadora — ITI-624.csv`: evaluación de la herramienta (50 respuestas).

La descarga de Google Forms separa las casillas con «;» y numera la escala de acuerdo («4 De acuerdo»); la app reconoce ambos formatos y también el de la hoja de cálculo. «No pude evaluarlo» se excluye igual que «No aplica».

Las 40 respuestas sintéticas que usan las pruebas están en `tests/datos/`.

## Cómo interpreta cada pregunta

| Tipo | Serie estadística | Cómo se detecta | Gráfico sugerido |
|---|---|---|---|
| Opción única | Cualitativa | Texto con pocas categorías repetidas | Barras de mayor a menor frecuencia |
| Selección múltiple | Cualitativa | Celdas con opciones separadas por «, » que se repiten entre personas | Barras horizontales; % sobre personas |
| Escala | Cualitativa ordinal o cuantitativa discreta | Enteros entre 0 y 10, o niveles Nunca → Siempre / Totalmente en desacuerdo → Totalmente de acuerdo | Barras en el orden de la escala, con todos sus niveles |
| Numérica | Cuantitativa | Números fuera del rango de escala (por ejemplo, edades o promedios) | Barras por clases |
| Fecha (marca temporal) | Cronológica | Fechas como «2026/10/28 9:01» o «28/10/2026» | Líneas de respuestas por día |
| Recinto | Geográfica | Encabezado con la palabra «recinto» | Barras |
| Respuesta abierta | — | Casi todas las respuestas distintas | No se grafica |
| Respuesta única | — | Todas las personas respondieron lo mismo (por ejemplo, el consentimiento) | No se ofrece en la lista |

El promedio exploratorio de los tres ítems de dependencia (sección 1.5 del documento) se calcula en Google Sheets antes de exportar, solo para quienes respondieron los tres ítems. La herramienta lo grafica como variable numérica, con su distribución por clases.

## Tipos de gráfico

El selector «Tipo de gráfico» empieza en **Automático**. Los tipos que no convienen para la pregunta aparecen deshabilitados y un desplegable explica por qué. Si eliges un tipo y cambias a una pregunta que no lo admite, se muestra el sugerido; al volver a una pregunta compatible se recupera tu elección.

| Tipo | Cuándo se ofrece |
|---|---|
| Barras verticales y horizontales | Siempre |
| Circular | Opción única, escala o recinto con hasta 7 categorías, sin comparar. Nunca en selección múltiple |
| Líneas | Datos con orden: escalas, variables numéricas y serie cronológica |
| Araña (radar) | Entre 3 y 12 categorías; también para comparar recintos |

## Distribución de frecuencias por clases

Para variables numéricas se usa el esquema de la clase 4:

- **k** (número de clases) por la regla de Sturges: k = 1 + 3,322 · log₁₀(n).
- **Amplitud**: (rango + 1 unidad) / k, redondeada hacia arriba para que el valor máximo quede dentro.
- **Límites reales**: media unidad de medida por fuera de los límites indicados (por ejemplo, 28,5–39,5 para la clase 29–39).
- **Punto medio** (xi), **fi**, **fr** y acumuladas **«menos de»** y **«más de»**.

## Tema oscuro y exportación

La interfaz usa un tema oscuro con contraste verificado (texto ≥ 4,5:1 y series ≥ 3:1). El azul es el color que predomina; lo acompañan su complementario en el círculo cromático, el **naranja**, y el **ámbar** (complementario dividido), usados poco y solo para señalar lo importante: la barra más frecuente (la moda) y su tarjeta de medida, el recinto Lourdes al comparar, la opción elegida en las listas, las marcas de los títulos y las viñetas de la lectura. El naranja es un tono oscuro y apagado, para que no resulte chillón. Azul y naranja también se distinguen con daltonismo. El PNG descargado se vuelve a dibujar aparte con un tema claro y fondo blanco, porque se lee mejor impreso o en una presentación, como las figuras del material del curso.

## Distribución de la pantalla

El gráfico es el protagonista y la página usa casi todo el ancho de la pantalla. En computadora (desde 1100 px de ancho), los datos, la pregunta y el recinto quedan en un panel lateral fijo y el gráfico ocupa el resto: su tarjeta llena el alto de la ventana y sus letras y barras crecen con el ancho (hasta 1,45 veces). Sobre el gráfico, una barra reúne lo que cambia cómo se ve: «Cantidad | Porcentaje», «Comparar recintos» y «Descargar PNG». Debajo, las medidas y la explicación de lectura van lado a lado. Desde 1280 px todo el texto y los controles crecen en proporción. En tableta y teléfono las secciones van una debajo de otra.

Los textos de ayuda se redujeron al mínimo: el tipo de pregunta y su serie estadística se muestran como etiquetas (el detalle aparece al pasar el cursor), y el motivo de cada tipo de gráfico deshabilitado aparece al pasar el puntero sobre él. Las preguntas abiertas simplemente no aparecen en la lista. Las tarjetas entran con una animación breve, que se desactiva si el sistema pide reducir el movimiento. El PNG descargado no cambia: se dibuja siempre a 1000 px.

### Pantalla de inicio

Al abrir la página, una cortina tipo puerta de garaje muestra «Herramienta graficadora» y el lema «Un ITI es un ITI». Se abre con la doble flecha de abajo (dos puntas que se encienden de abajo hacia arriba), con el teclado (flechas, Enter, espacio), con la rueda del ratón o deslizando el dedo hacia arriba: la cortina baja un poco al destrabarse y sube hasta perderse en la caja superior (sin efecto 3D). Mientras está cerrada, el resto de la página queda inactivo. En la parte media inferior suben unas pocas chispas repartidas a lo ancho de la pantalla, como de fogata, con un resplandor cálido que crepita; se dibujan en un `<canvas>` y se detienen al abrir la cortina. Si el sistema pide reducir el movimiento, solo se desvanece. Está en `js/inicio.js`.

### Carga de datos

Después de la cortina, la tarjeta «Carga los datos» queda centrada en la pantalla. «Usar datos del estudio» es la opción grande y destacada, porque es la que casi siempre se usa. Debajo, separadas por «o usa tu propio archivo», están «Elegir archivo CSV» y el recuadro para arrastrar el archivo; en pantallas táctiles el recuadro no se muestra, porque ahí no se pueden arrastrar archivos. Con los datos cargados, la tarjeta se compacta en el panel con los dos botones, y se puede soltar un CSV sobre ella.

### Botones y listas

- Los botones tienen íconos, un destello al pasar el puntero, se hunden al pulsarlos y sueltan una onda desde el punto tocado. «Descargar PNG» confirma con una palomita (en teléfono dice solo «PNG»).
- «Cantidad | Porcentaje» es una pastilla que se desliza entre las dos opciones, y «Comparar recintos» es un interruptor (sigue siendo una casilla para el teclado y los lectores de pantalla).
- Las listas desplegables tienen flecha propia y cortan el texto largo con «…». En la lista abierta, cada opción es una fila con su propio borde y separada de las demás; las preguntas van numeradas y la elegida queda marcada en naranja. En Chrome, Edge, Brave y Opera recientes (que admiten `appearance: base-select`), la lista se abre con una animación, la flecha gira, las opciones entran escalonadas y la elegida queda marcada; en Firefox y Safari se usa la lista nativa del sistema. Por eso cada `<select>` de `index.html` lleva un `<button><selectedcontent>` y `js/app.js` cambia sus opciones con `ponerOpciones`, que no borra ese botón.

## Estructura

```
index.html                Página de la herramienta
css/estilos.css           Estilos (tema oscuro, móvil primero)
js/inicio.js              Pantalla de inicio (cortina que se alza)
js/csv.js                 Lectura y validación del CSV
js/tipos.js               Tipo de pregunta, «No aplica», escalas y fechas
js/distribucion.js        Distribución de frecuencias por clases (esquema del curso)
js/estadisticas.js        Frecuencias, filtro, comparación por recinto y medidas
js/tema.js                Paletas oscura (pantalla) y clara (PNG) con contraste verificado
js/lectura.js             Explicaciones de lectura
js/grafico.js             Núcleo: registro de tipos, reglas, barras, circular y araña
js/graficos/lineas.js     Líneas
js/descarga.js            PNG con pie de figura
js/privacidad.js          Aviso de identificadores personales
js/app.js                 Interfaz: conecta todo lo anterior
vendor/                   Chart.js 4.4.7 (licencia MIT), incluido localmente
datos/                    CSV de ejemplo
tests/                    Pruebas con node:test
```

Para agregar un tipo de gráfico, crea un archivo en `js/graficos/` que llame a `Graficadora.grafico.registrarGrafico({...})` con su nombre, reglas, nota, forma de lectura y configuración, y cárgalo en `index.html` después de `js/grafico.js`.

## Pruebas

Requieren Node.js 20 o superior y no instalan dependencias:

```bash
npm test
```

Las pruebas incluyen los ejemplos resueltos del curso: la tabla de 7 clases de las calificaciones del COSEVI, y los ejemplos de moda, mediana y media de «Medidas de posición y variabilidad».

## Limitaciones

- Solo se aceptan CSV en UTF-8, que es como los exporta Google Sheets.
- Se muestra un gráfico a la vez.
- Las comparaciones entre recintos son descriptivas: no indican diferencias estadísticamente significativas.
- Los resultados describen a quienes respondieron y no se generalizan a toda la población estudiantil.
