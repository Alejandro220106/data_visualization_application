/* Configuración de los gráficos de barras de Chart.js. */
(function (raiz) {
  "use strict";

  const { TIPOS } = raiz.Graficadora.tipos;
  const { formatearPorcentaje, formatearNumero } = raiz.Graficadora.estadisticas;

  const COLOR_PRINCIPAL = "#2563eb";
  // Paleta apta para daltonismo (Okabe-Ito) para distinguir recintos.
  const COLORES_GRUPOS = ["#2563eb", "#d55e00", "#009e73", "#cc79a7", "#e69f00", "#56b4e9"];
  const COLOR_TEXTO = "#1f2937";
  const COLOR_SECUNDARIO = "#4b5563";
  const COLOR_REJILLA = "#e5e7eb";
  // Con etiquetas más largas que esto, las barras horizontales se leen mejor.
  const LARGO_ETIQUETA_HORIZONTAL = 16;
  const MODOS = Object.freeze({ PORCENTAJE: "porcentaje", CANTIDAD: "cantidad" });

  /** Parte un texto en líneas de hasta «maximo» caracteres sin cortar palabras. */
  function partirTexto(texto, maximo) {
    const lineas = [];
    let actual = "";
    for (const palabra of String(texto).split(/\s+/)) {
      if (actual && (actual + " " + palabra).length > maximo) {
        lineas.push(actual);
        actual = palabra;
      } else {
        actual = actual ? `${actual} ${palabra}` : palabra;
      }
    }
    if (actual) lineas.push(actual);
    return lineas;
  }

  /** Barras horizontales para selección múltiple, etiquetas largas o pantallas angostas. */
  function decidirHorizontal(tipo, categorias, anchoDisponible = 1024) {
    if (tipo === TIPOS.MULTIRESPUESTA) return true;
    if (tipo === TIPOS.ESCALA && categorias.every((c) => /^\d+$/.test(c))) return false;
    const masLarga = Math.max(...categorias.map((c) => String(c).length));
    return masLarga > LARGO_ETIQUETA_HORIZONTAL || (anchoDisponible < 640 && categorias.length > 4);
  }

  function tituloEjeValor(modo) {
    return modo === MODOS.PORCENTAJE ? "Porcentaje de respuestas válidas (%)" : "Cantidad de personas";
  }

  /** Dibuja el valor de cada barra junto a ella (también queda en el PNG descargado). */
  const PLUGIN_ETIQUETAS = {
    id: "etiquetasValor",
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const horizontal = chart.options.indexAxis === "y";
      ctx.save();
      ctx.font = `600 ${chart.width < 480 ? 11 : 12}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      ctx.fillStyle = COLOR_TEXTO;
      chart.data.datasets.forEach((dataset, i) => {
        const meta = chart.getDatasetMeta(i);
        if (meta.hidden || !dataset.etiquetas) return;
        meta.data.forEach((barra, j) => {
          const texto = dataset.etiquetas[j];
          if (!texto) return;
          if (horizontal) {
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(texto, barra.x + 6, barra.y);
          } else {
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.fillText(texto, barra.x, barra.y - 4);
          }
        });
      });
      ctx.restore();
    },
  };

  /** Fondo blanco para que la imagen descargada no sea transparente. */
  const PLUGIN_FONDO = {
    id: "fondoBlanco",
    beforeDraw(chart) {
      const { ctx, width, height } = chart;
      ctx.save();
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    },
  };

  function opcionesBase({ titulo, subtitulo, horizontal, modo, leyenda, maxCaracteres }) {
    const ejeValor = {
      beginAtZero: true,
      grace: "12%",
      title: { display: true, text: tituloEjeValor(modo), color: COLOR_SECUNDARIO, font: { weight: "600" } },
      ticks: {
        color: COLOR_SECUNDARIO,
        precision: 0,
        callback: (valor) => (modo === MODOS.PORCENTAJE ? `${valor} %` : valor),
      },
      grid: { color: COLOR_REJILLA },
    };
    const ejeCategorias = {
      ticks: { color: COLOR_TEXTO, autoSkip: false, font: { size: 12 } },
      grid: { display: false },
    };
    return {
      indexAxis: horizontal ? "y" : "x",
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      layout: { padding: { top: 8, right: horizontal ? 84 : 12, bottom: 4, left: 4 } },
      scales: horizontal ? { x: ejeValor, y: ejeCategorias } : { x: ejeCategorias, y: ejeValor },
      plugins: {
        title: {
          display: true,
          text: partirTexto(titulo, maxCaracteres),
          color: COLOR_TEXTO,
          align: "start",
          font: { size: 16, weight: "700" },
          padding: { bottom: 4 },
        },
        subtitle: {
          display: true,
          text: subtitulo,
          color: COLOR_SECUNDARIO,
          align: "start",
          font: { size: 13 },
          padding: { bottom: 14 },
        },
        legend: { display: leyenda, position: "top", align: "start", labels: { color: COLOR_TEXTO, boxWidth: 14 } },
        tooltip: { callbacks: { label: (contexto) => contexto.dataset.detalles[contexto.dataIndex] } },
      },
    };
  }

  function etiquetasCategorias(categorias, horizontal) {
    return categorias.map((c) => partirTexto(c, horizontal ? 26 : 14));
  }

  /** Gráfico de barras de una pregunta (todos los recintos o uno). */
  function configurarGrafico({ pregunta, tipo, resumen, modo = MODOS.CANTIDAD, grupo = null, anchoDisponible = 1024 }) {
    const categorias = resumen.frecuencias.map((f) => f.categoria);
    const horizontal = decidirHorizontal(tipo, categorias, anchoDisponible);
    const enPorcentaje = modo === MODOS.PORCENTAJE;
    const alcance = grupo ? `Recinto: ${grupo}` : "Todos los recintos";
    const subtitulo = `n = ${formatearNumero(resumen.personas)} respuestas válidas de ${formatearNumero(resumen.total)} participantes · ${alcance}`;

    return {
      type: "bar",
      data: {
        labels: etiquetasCategorias(categorias, horizontal),
        datasets: [
          {
            label: tituloEjeValor(modo),
            data: resumen.frecuencias.map((f) => (enPorcentaje ? Number(f.porcentaje.toFixed(1)) : f.cantidad)),
            backgroundColor: COLOR_PRINCIPAL,
            borderRadius: 4,
            maxBarThickness: 64,
            etiquetas: resumen.frecuencias.map((f) =>
              enPorcentaje
                ? `${formatearPorcentaje(f.porcentaje)} (${f.cantidad})`
                : `${f.cantidad} (${formatearPorcentaje(f.porcentaje)})`,
            ),
            detalles: resumen.frecuencias.map(
              (f) => `${f.cantidad} ${f.cantidad === 1 ? "persona" : "personas"} · ${formatearPorcentaje(f.porcentaje)}`,
            ),
          },
        ],
      },
      options: opcionesBase({
        titulo: pregunta,
        subtitulo,
        horizontal,
        modo,
        leyenda: false,
        maxCaracteres: anchoDisponible < 640 ? 38 : 80,
      }),
      plugins: [PLUGIN_ETIQUETAS, PLUGIN_FONDO],
    };
  }

  /** Barras agrupadas por recinto, en porcentaje dentro de cada recinto. */
  function configurarComparacion({ pregunta, tipo, comparacion, anchoDisponible = 1024 }) {
    const horizontal = decidirHorizontal(tipo, comparacion.categorias, anchoDisponible);
    const tamanos = comparacion.grupos
      .map((g) => `${g.nombre}: n = ${formatearNumero(g.resumen.personas)}`)
      .join(" · ");

    return {
      type: "bar",
      data: {
        labels: etiquetasCategorias(comparacion.categorias, horizontal),
        datasets: comparacion.grupos.map((grupo, i) => ({
          label: `${grupo.nombre} (n = ${formatearNumero(grupo.resumen.personas)})`,
          data: grupo.resumen.frecuencias.map((f) => Number(f.porcentaje.toFixed(1))),
          backgroundColor: COLORES_GRUPOS[i % COLORES_GRUPOS.length],
          borderRadius: 4,
          maxBarThickness: 48,
          etiquetas: grupo.resumen.frecuencias.map((f) => formatearPorcentaje(f.porcentaje)),
          detalles: grupo.resumen.frecuencias.map(
            (f) => `${grupo.nombre}: ${f.cantidad} ${f.cantidad === 1 ? "persona" : "personas"} · ${formatearPorcentaje(f.porcentaje)}`,
          ),
        })),
      },
      options: opcionesBase({
        titulo: pregunta,
        subtitulo: `Porcentaje dentro de cada recinto · ${tamanos}`,
        horizontal,
        modo: MODOS.PORCENTAJE,
        leyenda: true,
        maxCaracteres: anchoDisponible < 640 ? 38 : 80,
      }),
      plugins: [PLUGIN_ETIQUETAS, PLUGIN_FONDO],
    };
  }

  /** Altura del lienzo según la cantidad de barras, para que no se amontonen. */
  function alturaSugerida(cantidadCategorias, horizontal, grupos = 1) {
    if (!horizontal) return 420;
    return Math.max(320, 120 + cantidadCategorias * grupos * 34);
  }

  raiz.Graficadora.grafico = {
    MODOS,
    partirTexto,
    decidirHorizontal,
    configurarGrafico,
    configurarComparacion,
    alturaSugerida,
  };
})(globalThis);
