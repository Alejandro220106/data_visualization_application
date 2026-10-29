/* Gráfico de picos (barras triangulares), como en las ilustraciones del curso. */
(function (raiz) {
  "use strict";

  const { registrarGrafico, piezas } = raiz.Graficadora.grafico;
  const { PLUGIN_ETIQUETAS, PLUGIN_FONDO, configurarBarras, configurarBarrasComparacion } = piezas;

  /** Dibuja un triángulo sobre cada barra: la punta marca el valor y la base queda en cero. */
  const PLUGIN_PICOS = {
    id: "picos",
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      ctx.save();
      chart.data.datasets.forEach((dataset, i) => {
        const meta = chart.getDatasetMeta(i);
        if (meta.hidden || !dataset.colorPico) return;
        ctx.fillStyle = dataset.colorPico;
        for (const barra of meta.data) {
          const { x, y, base, width } = barra.getProps(["x", "y", "base", "width"], true);
          ctx.beginPath();
          ctx.moveTo(x - width / 2, base);
          ctx.lineTo(x, y);
          ctx.lineTo(x + width / 2, base);
          ctx.closePath();
          ctx.fill();
        }
      });
      ctx.restore();
    },
  };

  /** Convierte una configuración de barras en picos: la barra queda invisible y el triángulo la reemplaza. */
  function aPicos(configuracion) {
    configuracion.data.datasets = configuracion.data.datasets.map((dataset) => ({
      ...dataset,
      colorPico: dataset.backgroundColor,
      backgroundColor: "transparent",
      borderWidth: 0,
      borderRadius: 0,
    }));
    // La leyenda toma el color del pico, porque la barra es transparente.
    configuracion.options.plugins.legend.labels.generateLabels = (chart) =>
      raiz.Chart.defaults.plugins.legend.labels.generateLabels(chart).map((item) => {
        const color = chart.data.datasets[item.datasetIndex]?.colorPico ?? item.fillStyle;
        return { ...item, fillStyle: color, strokeStyle: color };
      });
    configuracion.plugins = [PLUGIN_PICOS, PLUGIN_ETIQUETAS, PLUGIN_FONDO];
    return configuracion;
  }

  registrarGrafico({
    id: "picos",
    clave: "PICOS",
    nombre: "Picos (barras triangulares)",
    orden: 30,
    nota: ({ comparar }) =>
      comparar
        ? "Se usaron picos agrupados, una variante de las barras, para comparar los recintos; la altura de cada pico es el porcentaje."
        : "Se usaron picos, una variante visual de las barras: la altura de cada pico indica la cantidad de respuestas.",
    comoLeer: ({ comparar }) =>
      comparar
        ? "En cada categoría, cada color es un recinto: lee la altura de la punta, no el área del triángulo."
        : "Lee la altura de cada pico, no su área: la punta marca cuántas personas dieron esa respuesta.",
    configurar: (c) => aPicos(configurarBarras(c, false)),
    configurarComparacion: (c) => aPicos(configurarBarrasComparacion(c, false)),
    altura: () => 420,
  });
})(globalThis);
