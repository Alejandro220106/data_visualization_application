/* Gráfico de líneas para datos con orden: escalas, variables numéricas y serie cronológica. */
(function (raiz) {
  "use strict";

  const { TIPOS } = raiz.Graficadora.tipos;
  const { formatearPorcentaje } = raiz.Graficadora.estadisticas;
  const { registrarGrafico, MODOS, piezas } = raiz.Graficadora.grafico;
  const {
    PLUGIN_ETIQUETAS,
    PLUGIN_FONDO,
    tituloEjeValor,
    maxCaracteres,
    conTransparencia,
    valorSegunModo,
    detallePersonas,
    etiquetasCategorias,
    subtituloSimple,
    subtituloComparacion,
    seriesComparacion,
    opcionesComunes,
    ejes,
  } = piezas;

  // Con más puntos que esto, las etiquetas de valor se amontonan y se omiten.
  const MAX_PUNTOS_CON_ETIQUETA = 12;

  /** Las líneas unen categorías en orden: solo tienen sentido si la pregunta tiene orden. */
  function razonLineas({ tipo, categorias, comparar }) {
    if (tipo === TIPOS.CATEGORICA || tipo === TIPOS.MULTIRESPUESTA) {
      return "Las líneas unen categorías en orden, y esta pregunta no tiene un orden natural; usa barras.";
    }
    if (categorias.length < 2) return "Necesita al menos 2 categorías para trazar una línea.";
    return null;
  }

  function opcionesLineas({ c, subtitulo, modo, leyenda, cantidadCategorias }) {
    const opciones = {
      ...opcionesComunes({
        tema: c.tema,
        titulo: c.pregunta,
        subtitulo,
        maxCaracteres: maxCaracteres(c.anchoDisponible),
        leyenda,
      }),
      layout: { padding: { top: 8, right: 16, bottom: 4, left: 4 } },
      scales: ejes({
        tema: c.tema,
        modo,
        tituloCategorias: c.tipo === TIPOS.CRONOLOGICA ? "Fecha de respuesta" : null,
      }),
    };
    // En una serie larga se muestran solo algunas fechas para que no se encimen.
    opciones.scales.x.ticks.autoSkip = cantidadCategorias > MAX_PUNTOS_CON_ETIQUETA;
    opciones.scales.x.ticks.maxRotation = 45;
    return opciones;
  }

  function configurarLinea(c, area) {
    const categorias = c.resumen.frecuencias.map((f) => f.categoria);
    const color = c.tema.principal;
    const conEtiquetas = categorias.length <= MAX_PUNTOS_CON_ETIQUETA;
    return {
      type: "line",
      data: {
        labels: etiquetasCategorias(categorias, false),
        datasets: [
          {
            label: tituloEjeValor(c.modo),
            data: c.resumen.frecuencias.map((f) => valorSegunModo(f, c.modo)),
            borderColor: color,
            backgroundColor: area ? conTransparencia(color, 0.25) : color,
            fill: area ? "origin" : false,
            tension: 0,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: color,
            etiquetas: conEtiquetas
              ? c.resumen.frecuencias.map((f) =>
                  c.modo === MODOS.PORCENTAJE ? formatearPorcentaje(f.porcentaje) : String(f.cantidad),
                )
              : null,
            detalles: c.resumen.frecuencias.map((f) => detallePersonas(f)),
          },
        ],
      },
      options: opcionesLineas({
        c,
        subtitulo: subtituloSimple(c.resumen, c.grupo),
        modo: c.modo,
        leyenda: false,
        cantidadCategorias: categorias.length,
      }),
      plugins: [PLUGIN_ETIQUETAS, PLUGIN_FONDO],
    };
  }

  function configurarLineaComparacion(c, area) {
    return {
      type: "line",
      data: {
        labels: etiquetasCategorias(c.comparacion.categorias, false),
        // Sin etiquetas de valor: con varias líneas se encimarían; los valores están en la tabla.
        datasets: seriesComparacion(c.comparacion, c.tema).map(({ color, etiquetas, ...serie }) => ({
          ...serie,
          borderColor: color,
          backgroundColor: area ? conTransparencia(color, 0.18) : color,
          fill: area ? "origin" : false,
          tension: 0,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: color,
        })),
      },
      options: opcionesLineas({
        c,
        subtitulo: subtituloComparacion(c.comparacion),
        modo: MODOS.PORCENTAJE,
        leyenda: true,
        cantidadCategorias: c.comparacion.categorias.length,
      }),
      plugins: [PLUGIN_FONDO],
    };
  }

  function notaLineas(area, { tipo, comparar }) {
    const grafico = area ? "un gráfico de áreas" : "un gráfico de líneas";
    if (comparar) {
      return area
        ? "Se usaron áreas superpuestas, una por recinto, para comparar cómo se reparten las respuestas a lo largo de los niveles."
        : "Se usaron líneas, una por recinto, para comparar cómo se reparten las respuestas a lo largo de los niveles.";
    }
    if (tipo === TIPOS.CRONOLOGICA) {
      return `Se usó ${grafico} porque muestra cómo cambió la cantidad de respuestas a lo largo del tiempo (serie cronológica).`;
    }
    return `Se usó ${grafico} para seguir cómo se reparten las respuestas a lo largo de los niveles ordenados de la escala.`;
  }

  function comoLeerLineas(area, { tipo, comparar }) {
    if (comparar) {
      return "Cada línea es un recinto: la altura de cada punto es el porcentaje de ese recinto en ese nivel.";
    }
    if (tipo === TIPOS.CRONOLOGICA) {
      return "Cada punto es un día y su altura indica cuántas respuestas llegaron; la línea muestra si la participación subió o bajó.";
    }
    return area
      ? "La altura del área en cada nivel indica cuántas personas lo eligieron; la forma muestra dónde se concentran las respuestas."
      : "Cada punto indica cuántas personas eligieron ese nivel; la línea los une en orden para ver dónde se concentran las respuestas.";
  }

  const alturaLineas = ({ anchoDisponible }) => (anchoDisponible < 640 ? 380 : 420);

  registrarGrafico({
    id: "lineas",
    clave: "LINEAS",
    nombre: "Líneas",
    orden: 70,
    razonNoDisponible: razonLineas,
    nota: (contexto) => notaLineas(false, contexto),
    comoLeer: (contexto) => comoLeerLineas(false, contexto),
    configurar: (c) => configurarLinea(c, false),
    configurarComparacion: (c) => configurarLineaComparacion(c, false),
    altura: alturaLineas,
  });
})(globalThis);
