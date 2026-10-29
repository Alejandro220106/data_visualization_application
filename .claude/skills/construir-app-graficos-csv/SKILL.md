---
name: construir-app-graficos-csv
description: Desarrolla, amplía o corrige la herramienta graficadora web (HTML, CSS y JavaScript con Chart.js) del proyecto ITI-624 sobre uso y dependencia académica percibida de la IA generativa en la UTN, Sede San Carlos. Usar cuando se pida modificar esta aplicación de visualización de CSV de Google Forms.
---

# Rol

Actúas como ingeniero de software senior. Mantienes una herramienta **sencilla, confiable y accesible** que cumple el alcance de la sección 2.4 del Avance I del proyecto. No agregues funciones fuera de ese alcance; si algo es ambiguo, elige la opción más simple y documéntala en el README.

# Alcance (Avance I, sección 2.4)

- Aplicación **web** de uso académico, accesible desde un navegador en **computadora o teléfono**, sin instalar programas.
- Construida con **HTML, CSS y JavaScript**, usando un **componente de gráficos** (Chart.js 4.4.7, incluido en `vendor/`).
- Importa un **CSV depurado** exportado desde Google Forms, permite **seleccionar la variable** y genera **gráficos de barras** para frecuencias y **comparaciones entre recintos** (EcoCampus y Lourdes).
- Muestra las **escalas mediante barras ordenadas**.
- Cada gráfico identifica **la variable, las categorías, la unidad de medida y el número de respuestas válidas**.
- Incluye **filtros por recinto** y una opción para **descargar el gráfico**.
- Identifica las preguntas de **selección múltiple**: sus porcentajes se calculan sobre las personas que respondieron esa pregunta.
- **Los valores faltantes no se transforman en ceros.** Las respuestas «No aplica» se excluyen de los porcentajes válidos y se informan por separado (sección 1.5).
- Sin ponderaciones por matrícula: los datos describen a los participantes.
- Factor innovador: **filtros, gráficos y explicaciones de lectura en una misma interfaz**.
- Solo se cargan datos **sin identificadores personales**; la herramienta advierte si los detecta.

# Tipos de gráfico (pedido del equipo)

Solo 5 tipos, los de los ejemplos del equipo: **barras verticales**, **barras horizontales**, **circular**, **líneas** y **araña (radar)**. No agregues otros. «Automático» sugiere barras (líneas para la serie cronológica). Reglas:

- **Circular**: opción única o escala con hasta 7 categorías, sin comparar. Nunca en selección múltiple.
- **Líneas**: solo datos con orden (escalas, numéricas, serie cronológica).
- **Araña**: entre 3 y 12 categorías.
- Los no disponibles se deshabilitan con su motivo; cada gráfico lleva pie de figura con «Fuente» y «Nota».
- No cambies el estilo visual (tema oscuro) sin que el equipo lo pida.

# Contenidos del curso que la herramienta aplica

- Distribución de frecuencias por clases (Sturges, amplitud redondeada hacia arriba, límites reales, punto medio, acumuladas «menos de» y «más de»), en `js/distribucion.js`.
- Medidas de posición (media, mediana con posición (n + 1)/2, moda que puede no existir o ser doble) y de variabilidad (rango, desviación estándar muestral).
- Series estadísticas: cualitativa, cuantitativa, geográfica (recinto) y cronológica (marca temporal).
- Las pruebas usan los ejemplos resueltos del curso (COSEVI, moda, mediana, media ponderada): no los cambies sin revisar el material.

# Decisiones técnicas (no cambiar)

| Tema | Decisión |
|---|---|
| Lenguajes | HTML, CSS y JavaScript sin framework ni paso de compilación |
| Gráficos | Chart.js 4.4.7 local (`vendor/`), sin CDN |
| Scripts | Scripts clásicos que registran módulos en `globalThis.Graficadora`, para que `index.html` funcione con doble clic (`file://`) y en Node |
| Datos | El CSV se procesa solo en el navegador; nada se envía a servidores |
| Seguridad | Todo texto del CSV se inserta con `textContent`, nunca con `innerHTML` |
| Diseño | Tema oscuro, móvil primero; controles táctiles de al menos 44 px; contraste AA verificado en `tests/tema.test.js` |
| Colores | Siempre desde `js/tema.js`: tema oscuro en pantalla y claro en el PNG (que se vuelve a dibujar aparte a 1000 px y densidad 2) |
| Caché | Los recursos locales llevan `?v=AAAAMMDD` en `index.html`; cámbialo en cada publicación |
| Idioma | Todo en español: interfaz, código, comentarios y README |
| Pruebas | `node:test` (`npm test`), sin dependencias |

# Estructura

```
index.html, css/estilos.css
js/csv.js           lectura y validación del CSV
js/tipos.js         tipos de pregunta, «No aplica», escalas ordinales, fechas
js/distribucion.js  distribución de frecuencias por clases (esquema del curso)
js/estadisticas.js  frecuencias, filtro, comparación, medidas de posición y variabilidad
js/tema.js          paletas oscura y clara
js/lectura.js       explicaciones de lectura
js/grafico.js       núcleo: registro de tipos, reglas, piezas comunes, barras, circular y araña
js/graficos/*.js    familias: circulares, líneas, picos, clases, pictograma
js/descarga.js      PNG con pie de figura
js/privacidad.js    aviso de identificadores
js/app.js           interfaz
datos/              CSV sintético con la estructura del formulario
tests/              pruebas por módulo
```

La lógica (`csv`, `tipos`, `distribucion`, `estadisticas`, `tema`, `lectura`, `grafico` y las familias) no toca el DOM salvo el dibujo del pictograma, y se prueba en Node. `app.js` solo conecta la interfaz.

# Reglas estadísticas

- Porcentajes sobre **respuestas válidas** (sin omisiones ni «No aplica»).
- Selección múltiple: porcentaje sobre **personas**, no sobre opciones marcadas; explicar que puede sumar más de 100 %.
- Comparación entre recintos: porcentaje **dentro de cada recinto**, con el *n* de cada uno, y las mismas categorías en el mismo orden para ambos.
- El tipo y el orden de las categorías se calculan con **todos** los datos, para que filtrar no cambie la interpretación.
- Recordar siempre que los resultados describen a quienes respondieron y no se generalizan.

# Control de versiones

Haz **un commit por cada integración pequeña**; nunca acumules varias piezas en un solo commit. Cada commit debe dejar el repositorio funcionando (`npm test` pasa).

- El código y su prueba van en el mismo commit; no mezcles en ese commit cambios ajenos.
- Mensajes en español, en imperativo y breves.
- Trabaja en una rama por funcionalidad y fusiónala en `main` al terminarla.
- **Sin firmas de IA**: no añadas `Co-Authored-By`, "Generated with Claude Code" ni ninguna otra atribución a Claude o a otra IA en commits, PRs, issues, código ni documentación.

# Criterios de aceptación

- [ ] `index.html` funciona con doble clic y servido por HTTP, en computadora y en teléfono (375 px sin desplazamiento horizontal).
- [ ] Con `datos/Uso académico de IA en EcoCampus y Lourdes — ITI-624.csv` (real) y `tests/datos/encuesta_ia.csv` (sintético), cada pregunta graficable muestra barras con variable, categorías, unidad y *n*.
- [ ] Las escalas aparecen ordenadas por nivel; la selección múltiple, en barras horizontales con nota de más de 100 %.
- [ ] El filtro por recinto y la comparación EcoCampus–Lourdes funcionan y explican sus porcentajes.
- [ ] Omisiones y «No aplica» se informan aparte y nunca se cuentan como cero.
- [ ] El PNG descargado tiene fondo blanco y nombre descriptivo.
- [ ] `npm test` pasa.
