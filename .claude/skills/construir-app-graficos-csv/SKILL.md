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

# Tipos de gráfico (ampliación pedida por el equipo)

Además de las barras del documento, el usuario puede elegir **barras verticales u horizontales**, **circular** y **araña (radar)**. «Automático» usa la sugerencia (barras). Reglas que evitan gráficos engañosos (`evaluarGraficos` en `js/grafico.js`):

- **Circular**: solo opción única o escala con hasta 7 categorías y sin comparar recintos. Nunca en selección múltiple (los porcentajes suman más de 100 %).
- **Araña**: entre 3 y 12 categorías; sirve para comparar el perfil de los recintos. No para intervalos numéricos.
- Los tipos no disponibles se muestran deshabilitados con su motivo.
- Cada gráfico lleva un pie de figura con «Fuente» y «Nota: Se usó … porque …», también en el PNG descargado.

# Decisiones técnicas (no cambiar)

| Tema | Decisión |
|---|---|
| Lenguajes | HTML, CSS y JavaScript sin framework ni paso de compilación |
| Gráficos | Chart.js 4.4.7 local (`vendor/`), sin CDN |
| Scripts | Scripts clásicos que registran módulos en `globalThis.Graficadora`, para que `index.html` funcione con doble clic (`file://`) y en Node |
| Datos | El CSV se procesa solo en el navegador; nada se envía a servidores |
| Seguridad | Todo texto del CSV se inserta con `textContent`, nunca con `innerHTML` |
| Diseño | Móvil primero; controles táctiles de al menos 44 px; contraste AA |
| Idioma | Todo en español: interfaz, código, comentarios y README |
| Pruebas | `node:test` (`npm test`), sin dependencias |

# Estructura

```
index.html, css/estilos.css
js/csv.js           lectura y validación del CSV
js/tipos.js         tipos de pregunta, «No aplica», escalas ordinales
js/estadisticas.js  frecuencias, filtro, comparación, medidas descriptivas
js/lectura.js       explicaciones de lectura
js/grafico.js       configuración de Chart.js (barras, circular, araña) y reglas de compatibilidad
js/descarga.js      PNG con pie de figura
js/privacidad.js    aviso de identificadores
js/app.js           interfaz
datos/              CSV sintético con la estructura del formulario
tests/              pruebas por módulo
```

La lógica (`csv`, `tipos`, `estadisticas`, `lectura`, `grafico`) no toca el DOM y se prueba en Node. `app.js` solo conecta la interfaz.

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
- [ ] Con `datos/encuesta_ia.csv`, cada pregunta graficable muestra barras con variable, categorías, unidad y *n*.
- [ ] Las escalas aparecen ordenadas por nivel; la selección múltiple, en barras horizontales con nota de más de 100 %.
- [ ] El filtro por recinto y la comparación EcoCampus–Lourdes funcionan y explican sus porcentajes.
- [ ] Omisiones y «No aplica» se informan aparte y nunca se cuentan como cero.
- [ ] El PNG descargado tiene fondo blanco y nombre descriptivo.
- [ ] `npm test` pasa.
