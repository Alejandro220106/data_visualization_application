/* Configuración de los gráficos de Chart.js: barras, circular y araña (radar). */
(function (raiz) {
  "use strict";

  const { TIPOS } = raiz.Graficadora.tipos;
  const { formatearPorcentaje, formatearNumero } = raiz.Graficadora.estadisticas;

  const TIPOS_GRAFICO = Object.freeze({
    BARRAS_VERTICALES: "barras-verticales",
    BARRAS_HORIZONTALES: "barras-horizontales",
    CIRCULAR: "circular",
    ARANA: "arana",
  });

  const NOMBRES_GRAFICO = Object.freeze({
    [TIPOS_GRAFICO.BARRAS_VERTICALES]: "Barras verticales",
    [TIPOS_GRAFICO.BARRAS_HORIZONTALES]: "Barras horizontales",
    [TIPOS_GRAFICO.CIRCULAR]: "Circular",
    [TIPOS_GRAFICO.ARANA]: "Araña (radar)",
  });

  const COLOR_PRINCIPAL = "#2563eb";
  // Paleta apta para daltonismo (Okabe-Ito) para distinguir recintos.
  const COLORES_GRUPOS = ["#2563eb", "#d55e00", "#009e73", "#cc79a7", "#e69f00", "#56b4e9"];
  // Paleta cualitativa (Okabe-Ito) para los sectores de categorías sin orden.
  const COLORES_CATEGORIAS = ["#0072b2", "#e69f00", "#009e73", "#d55e00", "#cc79a7", "#56b4e9", "#f0e442"];
  // Paleta secuencial para escalas: el tono se oscurece con el nivel.
  const COLORES_ESCALA = ["#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e3a8a"];
  const COLOR_TEXTO = "#1f2937";
  const COLOR_SECUNDARIO = "#4b5563";
  const COLOR_REJILLA = "#e5e7eb";
  // Con etiquetas más largas que esto, las barras horizontales se leen mejor.
  const LARGO_ETIQUETA_HORIZONTAL = 16;
  // Más sectores que esto vuelven ilegible un gráfico circular.
  const MAX_SECTORES = 7;
  // Un gráfico de araña necesita al menos tres ejes para formar un polígono.
  const MIN_EJES_ARANA = 3;
  const MAX_EJES_ARANA = 12;
  // Los sectores más pequeños que esto no llevan etiqueta para no amontonarse.
  const PORCENTAJE_MINIMO_ETIQUETA = 5;
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

  /** Tipo de gráfico que se sugiere cuando el usuario no eligió uno. */
  function graficoSugerido(tipo, categorias, anchoDisponible = 1024) {
    return decidirHorizontal(tipo, categorias, anchoDisponible)
      ? TIPOS_GRAFICO.BARRAS_HORIZONTALES
      : TIPOS_GRAFICO.BARRAS_VERTICALES;
  }

  /**
   * Indica qué tipos de gráfico admite la pregunta y, si no, por qué.
   * Así la interfaz nunca ofrece un gráfico engañoso.
   */
  function evaluarGraficos({ tipo, categorias, comparar = false }) {
    const razonCircular = comparar
      ? "Un gráfico circular muestra un solo total; para comparar recintos usa barras o araña."
      : tipo === TIPOS.MULTIRESPUESTA
        ? "En selección múltiple los porcentajes suman más de 100 %, así que un gráfico circular sería engañoso."
        : tipo === TIPOS.NUMERICA
          ? "Los intervalos de una variable numérica se leen mejor en barras."
          : categorias.length > MAX_SECTORES
            ? `Tiene ${categorias.length} categorías; con más de ${MAX_SECTORES} los sectores no se distinguen bien.`
            : null;
    const razonArana =
      tipo === TIPOS.NUMERICA
        ? "Los intervalos de una variable numérica se leen mejor en barras."
        : categorias.length < MIN_EJES_ARANA
          ? `Necesita al menos ${MIN_EJES_ARANA} categorías para formar los ejes.`
          : categorias.length > MAX_EJES_ARANA
            ? `Tiene ${categorias.length} categorías; con más de ${MAX_EJES_ARANA} los ejes no se leen bien.`
            : null;
    const razones = {
      [TIPOS_GRAFICO.BARRAS_VERTICALES]: null,
      [TIPOS_GRAFICO.BARRAS_HORIZONTALES]: null,
      [TIPOS_GRAFICO.CIRCULAR]: razonCircular,
      [TIPOS_GRAFICO.ARANA]: razonArana,
    };
    return Object.values(TIPOS_GRAFICO).map((tipoGrafico) => ({
      tipoGrafico,
      nombre: NOMBRES_GRAFICO[tipoGrafico],
      disponible: razones[tipoGrafico] === null,
      razon: razones[tipoGrafico],
    }));
  }

  /** El gráfico elegido si está disponible; si no, el sugerido. */
  function resolverGrafico(elegido, evaluacion, sugerido) {
    const opcion = evaluacion.find((e) => e.tipoGrafico === elegido);
    return opcion?.disponible ? elegido : sugerido;
  }

  /** «Nota» que explica por qué se usó el tipo de gráfico, como en un informe. */
  function notaDelGrafico(tipoGrafico, { tipo, comparar = false }) {
    switch (tipoGrafico) {
      case TIPOS_GRAFICO.BARRAS_VERTICALES:
        if (comparar) return "Se usaron barras verticales agrupadas para comparar los recintos en cada categoría.";
        if (tipo === TIPOS.ESCALA) return "Se usaron barras verticales ordenadas porque muestran la distribución de la escala de menor a mayor.";
        if (tipo === TIPOS.NUMERICA) return "Se usaron barras verticales para mostrar cuántas respuestas caen en cada intervalo.";
        return "Se usaron barras verticales para comparar la cantidad de respuestas entre categorías.";
      case TIPOS_GRAFICO.BARRAS_HORIZONTALES:
        if (comparar) return "Se usaron barras horizontales agrupadas para comparar los recintos y leer etiquetas largas.";
        if (tipo === TIPOS.ESCALA) return "Se usaron barras horizontales ordenadas porque muestran la escala de menor a mayor con etiquetas legibles.";
        return "Se usaron barras horizontales porque permiten ordenar las categorías como un ranking y leer etiquetas largas.";
      case TIPOS_GRAFICO.CIRCULAR:
        return "Se usó un gráfico circular para mostrar la proporción de cada respuesta respecto al total de respuestas válidas (total = 100 %).";
      case TIPOS_GRAFICO.ARANA:
        return comparar
          ? "Se usó un gráfico de araña (radar) para comparar el perfil de los recintos en todas las categorías a la vez."
          : "Se usó un gráfico de araña (radar) para ver el perfil de respuestas en varias categorías a la vez.";
      default:
        return "";
    }
  }

  /** Frase que explica cómo leer el tipo de gráfico mostrado. */
  function comoLeerGrafico(tipoGrafico, { tipo, comparar = false }) {
    const medida = tipoGrafico === TIPOS_GRAFICO.BARRAS_HORIZONTALES ? "la longitud" : "la altura";
    switch (tipoGrafico) {
      case TIPOS_GRAFICO.CIRCULAR:
        return "Cada sector representa la proporción de personas que dio esa respuesta; todos los sectores juntos suman el 100 % de las respuestas válidas.";
      case TIPOS_GRAFICO.ARANA:
        return comparar
          ? "Cada recinto es un polígono de color: cuanto más lejos del centro está su punto en un eje, mayor es el porcentaje de ese recinto en esa respuesta."
          : "Cada eje es una respuesta posible: cuanto más lejos del centro está el punto, más personas la eligieron.";
      default:
        if (comparar) return `En cada categoría, cada color es un recinto y ${medida} de la barra es el porcentaje de ese recinto.`;
        if (tipo === TIPOS.MULTIRESPUESTA) return `${medida[0].toUpperCase()}${medida.slice(1)} de cada barra indica cuántas personas eligieron esa opción.`;
        return "Cada barra indica la cantidad de personas y el porcentaje que representa dentro de las respuestas válidas.";
    }
  }

  function tituloEjeValor(modo) {
    return modo === MODOS.PORCENTAJE ? "Porcentaje de respuestas válidas (%)" : "Cantidad de personas";
  }

  /** Negro o blanco, el que contraste más con el color de fondo. */
  function colorTextoSobre(hexadecimal) {
    const canales = [1, 3, 5].map((i) => parseInt(hexadecimal.slice(i, i + 2), 16) / 255);
    const lineal = canales.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    const luminancia = 0.2126 * lineal[0] + 0.7152 * lineal[1] + 0.0722 * lineal[2];
    const contrasteBlanco = 1.05 / (luminancia + 0.05);
    const contrasteNegro = (luminancia + 0.05) / 0.05;
    return contrasteBlanco >= contrasteNegro ? "#ffffff" : "#111827";
  }

  /** Colores de los sectores: secuenciales si la escala tiene orden, cualitativos si no. */
  function coloresSectores(tipo, cantidad) {
    if (tipo === TIPOS.ESCALA) {
      if (cantidad === 1) return [COLORES_ESCALA[5]];
      return Array.from({ length: cantidad }, (_, i) =>
        COLORES_ESCALA[Math.round(1 + (i * (COLORES_ESCALA.length - 2)) / (cantidad - 1))],
      );
    }
    return Array.from({ length: cantidad }, (_, i) => COLORES_CATEGORIAS[i % COLORES_CATEGORIAS.length]);
  }

  function conTransparencia(hexadecimal, opacidad) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hexadecimal.slice(i, i + 2), 16));
    return `rgba(${r}, ${g}, ${b}, ${opacidad})`;
  }

  /** Dibuja el valor junto a cada barra, sector o punto (también queda en el PNG descargado). */
  const PLUGIN_ETIQUETAS = {
    id: "etiquetasValor",
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      const tipo = chart.config.type;
      const horizontal = chart.options.indexAxis === "y";
      ctx.save();
      ctx.font = `600 ${chart.width < 480 ? 11 : 12}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      chart.data.datasets.forEach((dataset, i) => {
        const meta = chart.getDatasetMeta(i);
        if (meta.hidden || !dataset.etiquetas) return;
        meta.data.forEach((elemento, j) => {
          const texto = dataset.etiquetas[j];
          if (!texto || (typeof elemento.hidden === "boolean" && elemento.hidden)) return;
          ctx.fillStyle = dataset.colorEtiquetas?.[j] ?? COLOR_TEXTO;
          if (tipo === "pie") {
            const { x, y } = elemento.tooltipPosition();
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(texto, x, y);
          } else if (tipo === "radar") {
            // La etiqueta se aleja del centro en la dirección del punto.
            const escala = chart.scales.r;
            const dx = elemento.x - escala.xCenter;
            const dy = elemento.y - escala.yCenter;
            const distancia = Math.hypot(dx, dy) || 1;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(texto, elemento.x + (dx / distancia) * 18, elemento.y + (dy / distancia) * 14);
          } else if (horizontal) {
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(texto, elemento.x + 6, elemento.y);
          } else {
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.fillText(texto, elemento.x, elemento.y - 4);
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

  function encabezado(titulo, subtitulo, maxCaracteres) {
    return {
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
        text: partirTexto(subtitulo, maxCaracteres + 20),
        color: COLOR_SECUNDARIO,
        align: "start",
        font: { size: 13 },
        padding: { bottom: 14 },
      },
    };
  }

  function opcionesBarras({ titulo, subtitulo, horizontal, modo, leyenda, maxCaracteres }) {
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
        ...encabezado(titulo, subtitulo, maxCaracteres),
        legend: { display: leyenda, position: "top", align: "start", labels: { color: COLOR_TEXTO, boxWidth: 14 } },
        tooltip: { callbacks: { label: (contexto) => contexto.dataset.detalles[contexto.dataIndex] } },
      },
    };
  }

  /** Máximo del eje radial con margen para las etiquetas de valor. */
  function maximoRadial(valores, modo) {
    const maximo = Math.max(0, ...valores);
    if (modo === MODOS.PORCENTAJE) return Math.min(100, Math.max(10, Math.ceil((maximo * 1.15) / 10) * 10));
    return Math.max(maximo + 1, Math.ceil(maximo * 1.15));
  }

  function opcionesArana({ titulo, subtitulo, modo, leyenda, maxCaracteres, maximo, anchoDisponible }) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      layout: { padding: { top: 8, right: 8, bottom: 8, left: 8 } },
      scales: {
        r: {
          beginAtZero: true,
          suggestedMax: maximo,
          angleLines: { color: COLOR_REJILLA },
          grid: { color: COLOR_REJILLA },
          pointLabels: { color: COLOR_TEXTO, font: { size: anchoDisponible < 480 ? 11 : 12 } },
          ticks: {
            color: COLOR_SECUNDARIO,
            precision: 0,
            // Pocas marcas para que los anillos no tapen el polígono.
            maxTicksLimit: 6,
            backdropColor: "rgba(255, 255, 255, 0.8)",
            callback: (valor) => (modo === MODOS.PORCENTAJE ? `${valor} %` : valor),
          },
        },
      },
      plugins: {
        ...encabezado(titulo, subtitulo, maxCaracteres),
        legend: { display: leyenda, position: "top", align: "start", labels: { color: COLOR_TEXTO, boxWidth: 14 } },
        tooltip: { callbacks: { label: (contexto) => contexto.dataset.detalles[contexto.dataIndex] } },
      },
    };
  }

  function etiquetasCategorias(categorias, horizontal) {
    return categorias.map((c) => partirTexto(c, horizontal ? 26 : 14));
  }

  function detallePersonas(f, prefijo = "") {
    return `${prefijo}${f.cantidad} ${f.cantidad === 1 ? "persona" : "personas"} · ${formatearPorcentaje(f.porcentaje)}`;
  }

  /** Gráfico de una pregunta (todos los recintos o uno) en el tipo indicado. */
  function configurarGrafico({
    pregunta,
    tipo,
    resumen,
    modo = MODOS.CANTIDAD,
    grupo = null,
    anchoDisponible = 1024,
    tipoGrafico = null,
  }) {
    const categorias = resumen.frecuencias.map((f) => f.categoria);
    const elegido = tipoGrafico ?? graficoSugerido(tipo, categorias, anchoDisponible);
    const enPorcentaje = modo === MODOS.PORCENTAJE;
    const alcance = grupo ? `Recinto: ${grupo}` : "Todos los recintos";
    const base = `n = ${formatearNumero(resumen.personas)} respuestas válidas de ${formatearNumero(resumen.total)} participantes · ${alcance}`;
    const maxCaracteres = anchoDisponible < 640 ? 38 : 80;
    const valor = (f) => (enPorcentaje ? Number(f.porcentaje.toFixed(1)) : f.cantidad);
    const etiqueta = (f) =>
      enPorcentaje
        ? `${formatearPorcentaje(f.porcentaje)} (${f.cantidad})`
        : `${f.cantidad} (${formatearPorcentaje(f.porcentaje)})`;

    if (elegido === TIPOS_GRAFICO.CIRCULAR) {
      const colores = coloresSectores(tipo, categorias.length);
      return {
        type: "pie",
        data: {
          labels: categorias,
          datasets: [
            {
              label: "Respuestas válidas",
              data: resumen.frecuencias.map((f) => f.cantidad),
              backgroundColor: colores,
              borderColor: "#ffffff",
              borderWidth: 2,
              etiquetas: resumen.frecuencias.map((f) =>
                f.porcentaje >= PORCENTAJE_MINIMO_ETIQUETA
                  ? enPorcentaje
                    ? formatearPorcentaje(f.porcentaje)
                    : `${f.cantidad} (${formatearPorcentaje(f.porcentaje)})`
                  : null,
              ),
              colorEtiquetas: colores.map(colorTextoSobre),
              detalles: resumen.frecuencias.map((f) => detallePersonas(f)),
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 250 },
          layout: { padding: 8 },
          plugins: {
            ...encabezado(pregunta, `${base} · total = 100 %`, maxCaracteres),
            legend: {
              display: true,
              position: anchoDisponible < 640 ? "bottom" : "right",
              labels: { color: COLOR_TEXTO, boxWidth: 14, padding: 12 },
            },
            tooltip: { callbacks: { label: (contexto) => contexto.dataset.detalles[contexto.dataIndex] } },
          },
        },
        plugins: [PLUGIN_ETIQUETAS, PLUGIN_FONDO],
      };
    }

    if (elegido === TIPOS_GRAFICO.ARANA) {
      const datos = resumen.frecuencias.map(valor);
      return {
        type: "radar",
        data: {
          labels: etiquetasCategorias(categorias, false),
          datasets: [
            {
              label: tituloEjeValor(modo),
              data: datos,
              borderColor: COLOR_PRINCIPAL,
              backgroundColor: conTransparencia(COLOR_PRINCIPAL, 0.2),
              pointBackgroundColor: COLOR_PRINCIPAL,
              borderWidth: 2,
              pointRadius: 3,
              etiquetas: resumen.frecuencias.map((f) => (enPorcentaje ? formatearPorcentaje(f.porcentaje) : String(f.cantidad))),
              detalles: resumen.frecuencias.map((f) => detallePersonas(f)),
            },
          ],
        },
        options: opcionesArana({
          titulo: pregunta,
          subtitulo: `${base} · Distancia al centro: ${tituloEjeValor(modo).toLowerCase()}`,
          modo,
          leyenda: false,
          maxCaracteres,
          maximo: maximoRadial(datos, modo),
          anchoDisponible,
        }),
        plugins: [PLUGIN_ETIQUETAS, PLUGIN_FONDO],
      };
    }

    const horizontal = elegido === TIPOS_GRAFICO.BARRAS_HORIZONTALES;
    return {
      type: "bar",
      data: {
        labels: etiquetasCategorias(categorias, horizontal),
        datasets: [
          {
            label: tituloEjeValor(modo),
            data: resumen.frecuencias.map(valor),
            backgroundColor: COLOR_PRINCIPAL,
            borderRadius: 4,
            maxBarThickness: 64,
            etiquetas: resumen.frecuencias.map(etiqueta),
            detalles: resumen.frecuencias.map((f) => detallePersonas(f)),
          },
        ],
      },
      options: opcionesBarras({ titulo: pregunta, subtitulo: base, horizontal, modo, leyenda: false, maxCaracteres }),
      plugins: [PLUGIN_ETIQUETAS, PLUGIN_FONDO],
    };
  }

  /** Comparación entre recintos, en porcentaje dentro de cada recinto. */
  function configurarComparacion({ pregunta, tipo, comparacion, anchoDisponible = 1024, tipoGrafico = null }) {
    const elegido = tipoGrafico ?? graficoSugerido(tipo, comparacion.categorias, anchoDisponible);
    const tamanos = comparacion.grupos
      .map((g) => `${g.nombre}: n = ${formatearNumero(g.resumen.personas)}`)
      .join(" · ");
    const subtitulo = `Porcentaje dentro de cada recinto · ${tamanos}`;
    const maxCaracteres = anchoDisponible < 640 ? 38 : 80;
    const serie = (grupo, i) => ({
      label: `${grupo.nombre} (n = ${formatearNumero(grupo.resumen.personas)})`,
      data: grupo.resumen.frecuencias.map((f) => Number(f.porcentaje.toFixed(1))),
      detalles: grupo.resumen.frecuencias.map((f) => detallePersonas(f, `${grupo.nombre}: `)),
      color: COLORES_GRUPOS[i % COLORES_GRUPOS.length],
    });

    if (elegido === TIPOS_GRAFICO.ARANA) {
      const series = comparacion.grupos.map(serie);
      return {
        type: "radar",
        data: {
          labels: etiquetasCategorias(comparacion.categorias, false),
          // Sin etiquetas de valor: con dos polígonos se superpondrían; los valores están en la tabla.
          datasets: series.map(({ color, ...resto }) => ({
            ...resto,
            borderColor: color,
            backgroundColor: conTransparencia(color, 0.15),
            pointBackgroundColor: color,
            borderWidth: 2,
            pointRadius: 3,
          })),
        },
        options: opcionesArana({
          titulo: pregunta,
          subtitulo: `${subtitulo} · Distancia al centro: porcentaje (%)`,
          modo: MODOS.PORCENTAJE,
          leyenda: true,
          maxCaracteres,
          maximo: maximoRadial(series.flatMap((s) => s.data), MODOS.PORCENTAJE),
          anchoDisponible,
        }),
        plugins: [PLUGIN_FONDO],
      };
    }

    const horizontal = elegido === TIPOS_GRAFICO.BARRAS_HORIZONTALES;
    return {
      type: "bar",
      data: {
        labels: etiquetasCategorias(comparacion.categorias, horizontal),
        datasets: comparacion.grupos.map((grupo, i) => {
          const { color, ...resto } = serie(grupo, i);
          return {
            ...resto,
            backgroundColor: color,
            borderRadius: 4,
            maxBarThickness: 48,
            etiquetas: grupo.resumen.frecuencias.map((f) => formatearPorcentaje(f.porcentaje)),
          };
        }),
      },
      options: opcionesBarras({
        titulo: pregunta,
        subtitulo,
        horizontal,
        modo: MODOS.PORCENTAJE,
        leyenda: true,
        maxCaracteres,
      }),
      plugins: [PLUGIN_ETIQUETAS, PLUGIN_FONDO],
    };
  }

  /** Altura del lienzo según el tipo de gráfico y la cantidad de categorías. */
  function alturaSugerida(tipoGrafico, cantidadCategorias, grupos = 1, anchoDisponible = 1024) {
    const angosto = anchoDisponible < 640;
    switch (tipoGrafico) {
      case TIPOS_GRAFICO.BARRAS_HORIZONTALES:
        return Math.max(320, 120 + cantidadCategorias * grupos * 34);
      case TIPOS_GRAFICO.CIRCULAR:
        // En pantallas angostas la leyenda va debajo y necesita espacio.
        return angosto ? 380 + Math.ceil(cantidadCategorias / 2) * 24 : 440;
      case TIPOS_GRAFICO.ARANA:
        return angosto ? 420 : 500;
      default:
        return 420;
    }
  }

  raiz.Graficadora.grafico = {
    MODOS,
    TIPOS_GRAFICO,
    NOMBRES_GRAFICO,
    partirTexto,
    decidirHorizontal,
    graficoSugerido,
    evaluarGraficos,
    resolverGrafico,
    notaDelGrafico,
    comoLeerGrafico,
    colorTextoSobre,
    configurarGrafico,
    configurarComparacion,
    alturaSugerida,
  };
})(globalThis);
