/*
 * Núcleo de los gráficos: registro de tipos, reglas de compatibilidad y piezas comunes de Chart.js.
 * Cada familia de gráficos (barras, circulares, líneas, clases, pictograma) se registra aquí.
 */
(function (raiz) {
  "use strict";

  const { TIPOS } = raiz.Graficadora.tipos;
  const { formatearPorcentaje, formatearNumero } = raiz.Graficadora.estadisticas;
  const { TEMAS, colorTextoSobre } = raiz.Graficadora.tema;

  const MODOS = Object.freeze({ PORCENTAJE: "porcentaje", CANTIDAD: "cantidad" });
  // Con etiquetas más largas que esto, las barras horizontales se leen mejor.
  const LARGO_ETIQUETA_HORIZONTAL = 16;
  // Más sectores que esto vuelven ilegible un gráfico circular.
  const MAX_SECTORES = 7;
  // Un gráfico de araña necesita al menos tres ejes para formar un polígono.
  const MIN_EJES_ARANA = 3;
  const MAX_EJES_ARANA = 12;
  // Los sectores más pequeños que esto no llevan etiqueta para no amontonarse.
  const PORCENTAJE_MINIMO_ETIQUETA = 5;

  const REGISTRO = new Map();
  const TIPOS_GRAFICO = {};
  const NOMBRES_GRAFICO = {};

  /** Agrega un tipo de gráfico con sus reglas, notas y configuración. */
  function registrarGrafico(definicion) {
    REGISTRO.set(definicion.id, definicion);
    TIPOS_GRAFICO[definicion.clave] = definicion.id;
    NOMBRES_GRAFICO[definicion.id] = definicion.nombre;
  }

  function definiciones() {
    return [...REGISTRO.values()].sort((a, b) => a.orden - b.orden);
  }

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
    if (tipo === TIPOS.CRONOLOGICA) return false;
    const masLarga = Math.max(...categorias.map((c) => String(c).length));
    return masLarga > LARGO_ETIQUETA_HORIZONTAL || (anchoDisponible < 640 && categorias.length > 4);
  }

  /** Tipo de gráfico que se sugiere cuando el usuario no eligió uno. */
  function graficoSugerido(tipo, categorias, anchoDisponible = 1024, comparar = false) {
    // Series del curso: la cronológica se lee mejor en líneas y la cuantitativa en histograma.
    if (tipo === TIPOS.CRONOLOGICA && REGISTRO.has("lineas")) return "lineas";
    if (tipo === TIPOS.NUMERICA && !comparar && REGISTRO.has("histograma")) return "histograma";
    return decidirHorizontal(tipo, categorias, anchoDisponible) ? "barras-horizontales" : "barras-verticales";
  }

  /**
   * Indica qué tipos de gráfico admite la pregunta y, si no, por qué.
   * Así la interfaz nunca ofrece un gráfico engañoso.
   */
  function evaluarGraficos({ tipo, categorias, comparar = false, grupos = 2 }) {
    return definiciones().map((definicion) => {
      const razon =
        comparar && !definicion.configurarComparacion
          ? definicion.razonComparar ?? "No está disponible para comparar recintos."
          : definicion.razonNoDisponible?.({ tipo, categorias, comparar, grupos }) ?? null;
      return { tipoGrafico: definicion.id, nombre: definicion.nombre, disponible: !razon, razon };
    });
  }

  /** El gráfico elegido si está disponible; si no, el sugerido. */
  function resolverGrafico(elegido, evaluacion, sugerido) {
    const opcion = evaluacion.find((e) => e.tipoGrafico === elegido);
    return opcion?.disponible ? elegido : sugerido;
  }

  /** «Nota» que explica por qué se usó el tipo de gráfico, como en un informe. */
  function notaDelGrafico(tipoGrafico, contexto) {
    return REGISTRO.get(tipoGrafico)?.nota({ comparar: false, ...contexto }) ?? "";
  }

  /** Frase que explica cómo leer el tipo de gráfico mostrado. */
  function comoLeerGrafico(tipoGrafico, contexto) {
    return REGISTRO.get(tipoGrafico)?.comoLeer({ comparar: false, ...contexto }) ?? "";
  }

  function completarContexto(contexto, sugerido) {
    return {
      modo: MODOS.CANTIDAD,
      grupo: null,
      anchoDisponible: 1024,
      ...contexto,
      tema: contexto.tema ?? TEMAS.oscuro,
      tipoGrafico: contexto.tipoGrafico ?? sugerido,
    };
  }

  /** Configuración de Chart.js para una pregunta (todos los recintos o uno). */
  function configurarGrafico(contexto) {
    const categorias = contexto.resumen.frecuencias.map((f) => f.categoria);
    const completo = completarContexto(contexto, graficoSugerido(contexto.tipo, categorias, contexto.anchoDisponible));
    return REGISTRO.get(completo.tipoGrafico).configurar(completo);
  }

  /** Configuración de Chart.js para comparar recintos, en porcentaje dentro de cada recinto. */
  function configurarComparacion(contexto) {
    const sugerido = graficoSugerido(contexto.tipo, contexto.comparacion.categorias, contexto.anchoDisponible, true);
    const completo = completarContexto(contexto, sugerido);
    return REGISTRO.get(completo.tipoGrafico).configurarComparacion(completo);
  }

  /** Altura del lienzo según el tipo de gráfico y la cantidad de categorías. */
  function alturaSugerida(tipoGrafico, cantidadCategorias, grupos = 1, anchoDisponible = 1024) {
    return REGISTRO.get(tipoGrafico)?.altura?.({ cantidadCategorias, grupos, anchoDisponible }) ?? 420;
  }

  /** Los gráficos que Chart.js no trae (como el pictograma) se dibujan con su propia función. */
  function tieneDibujoPropio(tipoGrafico) {
    return typeof REGISTRO.get(tipoGrafico)?.dibujar === "function";
  }

  function dibujarGrafico(lienzo, contexto) {
    const categorias = contexto.resumen.frecuencias.map((f) => f.categoria);
    const completo = completarContexto(contexto, graficoSugerido(contexto.tipo, categorias, contexto.anchoDisponible));
    return REGISTRO.get(completo.tipoGrafico).dibujar(lienzo, completo);
  }

  // Piezas comunes para las familias de gráficos

  function tituloEjeValor(modo) {
    return modo === MODOS.PORCENTAJE ? "Porcentaje de respuestas válidas (%)" : "Cantidad de personas";
  }

  function maxCaracteres(anchoDisponible) {
    return anchoDisponible < 640 ? 38 : 80;
  }

  function conTransparencia(hexadecimal, opacidad) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hexadecimal.slice(i, i + 2), 16));
    return `rgba(${r}, ${g}, ${b}, ${opacidad})`;
  }

  /** Colores de sectores o filas: secuenciales si la escala tiene orden, cualitativos si no. */
  function coloresCategorias(tema, tipo, cantidad) {
    if (tipo === TIPOS.ESCALA) {
      if (cantidad === 1) return [tema.escala[5]];
      return Array.from({ length: cantidad }, (_, i) =>
        tema.escala[Math.round(1 + (i * (tema.escala.length - 2)) / (cantidad - 1))],
      );
    }
    return Array.from({ length: cantidad }, (_, i) => tema.categorias[i % tema.categorias.length]);
  }

  function valorSegunModo(f, modo) {
    return modo === MODOS.PORCENTAJE ? Number(f.porcentaje.toFixed(1)) : f.cantidad;
  }

  function etiquetaSegunModo(f, modo) {
    return modo === MODOS.PORCENTAJE
      ? `${formatearPorcentaje(f.porcentaje)} (${f.cantidad})`
      : `${f.cantidad} (${formatearPorcentaje(f.porcentaje)})`;
  }

  function detallePersonas(f, prefijo = "") {
    return `${prefijo}${f.cantidad} ${f.cantidad === 1 ? "persona" : "personas"} · ${formatearPorcentaje(f.porcentaje)}`;
  }

  function etiquetasCategorias(categorias, horizontal) {
    return categorias.map((c) => partirTexto(c, horizontal ? 26 : 14));
  }

  function subtituloSimple(resumen, grupo) {
    const alcance = grupo ? `Recinto: ${grupo}` : "Todos los recintos";
    return `n = ${formatearNumero(resumen.personas)} respuestas válidas de ${formatearNumero(resumen.total)} participantes · ${alcance}`;
  }

  function subtituloComparacion(comparacion) {
    const tamanos = comparacion.grupos
      .map((g) => `${g.nombre}: n = ${formatearNumero(g.resumen.personas)}`)
      .join(" · ");
    return `Porcentaje dentro de cada recinto · ${tamanos}`;
  }

  /** Una serie por recinto, en porcentaje dentro de cada recinto, con su color. */
  function seriesComparacion(comparacion, tema) {
    return comparacion.grupos.map((grupo, i) => ({
      label: `${grupo.nombre} (n = ${formatearNumero(grupo.resumen.personas)})`,
      data: grupo.resumen.frecuencias.map((f) => Number(f.porcentaje.toFixed(1))),
      detalles: grupo.resumen.frecuencias.map((f) => detallePersonas(f, `${grupo.nombre}: `)),
      etiquetas: grupo.resumen.frecuencias.map((f) => formatearPorcentaje(f.porcentaje)),
      color: tema.grupos[i % tema.grupos.length],
    }));
  }

  /** Dibuja el valor junto a cada barra, sector o punto (también queda en el PNG descargado). */
  const PLUGIN_ETIQUETAS = {
    id: "etiquetasValor",
    afterDatasetsDraw(chart, _argumentos, opciones) {
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
          if (!texto) return;
          ctx.fillStyle = dataset.colorEtiquetas?.[j] ?? opciones.color;
          if (tipo === "pie" || tipo === "doughnut") {
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
            ctx.fillText(texto, elemento.x, elemento.y - (tipo === "line" ? 8 : 4));
          }
        });
      });
      // Texto en el centro de un anillo (por ejemplo, el número de respuestas válidas).
      const arco = tipo === "doughnut" ? chart.getDatasetMeta(0).data[0] : null;
      if (opciones.centro && arco) {
        ctx.fillStyle = opciones.color;
        ctx.font = `700 ${chart.width < 480 ? 14 : 16}px system-ui, -apple-system, "Segoe UI", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = opciones.centroBase ?? "middle";
        ctx.fillText(opciones.centro, arco.x, arco.y - (opciones.centroBase === "bottom" ? 6 : 0));
      }
      ctx.restore();
    },
  };

  /** Fondo del lienzo: igual a la tarjeta en pantalla y blanco en la imagen para informes. */
  const PLUGIN_FONDO = {
    id: "fondo",
    beforeDraw(chart, _argumentos, opciones) {
      const { ctx, width, height } = chart;
      ctx.save();
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = opciones.color;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    },
  };

  function animacion() {
    const reducirMovimiento = raiz.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    return reducirMovimiento ? false : { duration: 250 };
  }

  /** Opciones compartidas por todos los gráficos: encabezado, leyenda, tooltip, colores y fondo. */
  function opcionesComunes({ tema, titulo, subtitulo, maxCaracteres: maximo, leyenda = false, posicionLeyenda = "top" }) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: animacion(),
      color: tema.texto,
      plugins: {
        title: {
          display: true,
          text: partirTexto(titulo, maximo),
          color: tema.texto,
          align: "start",
          font: { size: 16, weight: "700" },
          padding: { bottom: 4 },
        },
        subtitle: {
          display: true,
          text: partirTexto(subtitulo, maximo + 20),
          color: tema.secundario,
          align: "start",
          font: { size: 13 },
          padding: { bottom: 14 },
        },
        legend: {
          display: leyenda,
          position: posicionLeyenda,
          align: posicionLeyenda === "top" ? "start" : "center",
          labels: { color: tema.texto, boxWidth: 14, padding: 12 },
        },
        tooltip: { callbacks: { label: (contexto) => contexto.dataset.detalles?.[contexto.dataIndex] ?? "" } },
        etiquetasValor: { color: tema.texto },
        fondo: { color: tema.fondo },
      },
    };
  }

  /** Ejes de valor y de categorías con los colores del tema. */
  function ejes({ tema, horizontal = false, modo, tituloValor = tituloEjeValor(modo), tituloCategorias = null }) {
    const ejeValor = {
      beginAtZero: true,
      grace: "12%",
      title: { display: true, text: tituloValor, color: tema.secundario, font: { weight: "600" } },
      ticks: {
        color: tema.secundario,
        precision: 0,
        callback: (valor) => (modo === MODOS.PORCENTAJE ? `${valor} %` : valor),
      },
      grid: { color: tema.rejilla },
      border: { color: tema.rejilla },
    };
    const ejeCategorias = {
      title: { display: Boolean(tituloCategorias), text: tituloCategorias ?? "", color: tema.secundario, font: { weight: "600" } },
      ticks: { color: tema.texto, autoSkip: false, font: { size: 12 } },
      grid: { display: false },
      border: { color: tema.rejilla },
    };
    return horizontal ? { x: ejeValor, y: ejeCategorias } : { x: ejeCategorias, y: ejeValor };
  }

  function opcionesBarras({ tema, titulo, subtitulo, horizontal, modo, leyenda, maxCaracteres: maximo }) {
    const comunes = opcionesComunes({ tema, titulo, subtitulo, maxCaracteres: maximo, leyenda });
    return {
      ...comunes,
      indexAxis: horizontal ? "y" : "x",
      layout: { padding: { top: 8, right: horizontal ? 84 : 12, bottom: 4, left: 4 } },
      scales: ejes({ tema, horizontal, modo }),
    };
  }

  // Barras verticales y horizontales

  function configurarBarras(c, horizontal) {
    const categorias = c.resumen.frecuencias.map((f) => f.categoria);
    return {
      type: "bar",
      data: {
        labels: etiquetasCategorias(categorias, horizontal),
        datasets: [
          {
            label: tituloEjeValor(c.modo),
            data: c.resumen.frecuencias.map((f) => valorSegunModo(f, c.modo)),
            backgroundColor: c.tema.principal,
            borderRadius: 4,
            maxBarThickness: 64,
            etiquetas: c.resumen.frecuencias.map((f) => etiquetaSegunModo(f, c.modo)),
            detalles: c.resumen.frecuencias.map((f) => detallePersonas(f)),
          },
        ],
      },
      options: opcionesBarras({
        tema: c.tema,
        titulo: c.pregunta,
        subtitulo: subtituloSimple(c.resumen, c.grupo),
        horizontal,
        modo: c.modo,
        leyenda: false,
        maxCaracteres: maxCaracteres(c.anchoDisponible),
      }),
      plugins: [PLUGIN_ETIQUETAS, PLUGIN_FONDO],
    };
  }

  function configurarBarrasComparacion(c, horizontal) {
    return {
      type: "bar",
      data: {
        labels: etiquetasCategorias(c.comparacion.categorias, horizontal),
        datasets: seriesComparacion(c.comparacion, c.tema).map(({ color, ...serie }) => ({
          ...serie,
          backgroundColor: color,
          borderRadius: 4,
          maxBarThickness: 48,
        })),
      },
      options: opcionesBarras({
        tema: c.tema,
        titulo: c.pregunta,
        subtitulo: subtituloComparacion(c.comparacion),
        horizontal,
        modo: MODOS.PORCENTAJE,
        leyenda: true,
        maxCaracteres: maxCaracteres(c.anchoDisponible),
      }),
      plugins: [PLUGIN_ETIQUETAS, PLUGIN_FONDO],
    };
  }

  function notaBarras(orientacion, { tipo, comparar }) {
    if (orientacion === "verticales") {
      if (comparar) return "Se usaron barras verticales agrupadas para comparar los recintos en cada categoría.";
      if (tipo === TIPOS.ESCALA) return "Se usaron barras verticales ordenadas porque muestran la distribución de la escala de menor a mayor.";
      if (tipo === TIPOS.NUMERICA) return "Se usaron barras verticales para mostrar cuántas respuestas caen en cada clase.";
      if (tipo === TIPOS.CRONOLOGICA) return "Se usaron barras verticales para comparar la cantidad de respuestas de cada día.";
      return "Se usaron barras verticales para comparar la cantidad de respuestas entre categorías.";
    }
    if (comparar) return "Se usaron barras horizontales agrupadas para comparar los recintos y leer etiquetas largas.";
    if (tipo === TIPOS.ESCALA) return "Se usaron barras horizontales ordenadas porque muestran la escala de menor a mayor con etiquetas legibles.";
    return "Se usaron barras horizontales porque permiten ordenar las categorías como un ranking y leer etiquetas largas.";
  }

  function comoLeerBarras(medida, { tipo, comparar }) {
    if (comparar) return `En cada categoría, cada color es un recinto y ${medida} de la barra es el porcentaje de ese recinto.`;
    if (tipo === TIPOS.MULTIRESPUESTA) return `${medida[0].toUpperCase()}${medida.slice(1)} de cada barra indica cuántas personas eligieron esa opción.`;
    if (tipo === TIPOS.CRONOLOGICA) return `${medida[0].toUpperCase()}${medida.slice(1)} de cada barra indica cuántas respuestas llegaron ese día.`;
    return "Cada barra indica la cantidad de personas y el porcentaje que representa dentro de las respuestas válidas.";
  }

  registrarGrafico({
    id: "barras-verticales",
    clave: "BARRAS_VERTICALES",
    nombre: "Barras verticales",
    orden: 10,
    nota: (contexto) => notaBarras("verticales", contexto),
    comoLeer: (contexto) => comoLeerBarras("la altura", contexto),
    configurar: (c) => configurarBarras(c, false),
    configurarComparacion: (c) => configurarBarrasComparacion(c, false),
    altura: () => 420,
  });

  registrarGrafico({
    id: "barras-horizontales",
    clave: "BARRAS_HORIZONTALES",
    nombre: "Barras horizontales",
    orden: 20,
    nota: (contexto) => notaBarras("horizontales", contexto),
    comoLeer: (contexto) => comoLeerBarras("la longitud", contexto),
    configurar: (c) => configurarBarras(c, true),
    configurarComparacion: (c) => configurarBarrasComparacion(c, true),
    altura: ({ cantidadCategorias, grupos }) => Math.max(320, 120 + cantidadCategorias * grupos * 34),
  });

  // Circular

  /** Motivo por el que un gráfico de sectores (circular, anillo o semicírculo) no conviene. */
  function razonSectores({ tipo, categorias }) {
    if (tipo === TIPOS.MULTIRESPUESTA) {
      return "En selección múltiple los porcentajes suman más de 100 %, así que un gráfico de sectores sería engañoso.";
    }
    if (tipo === TIPOS.NUMERICA) return "Las clases de una variable numérica se leen mejor en un histograma o en barras.";
    if (tipo === TIPOS.CRONOLOGICA) return "Una serie cronológica se lee mejor en líneas o barras, en orden de fechas.";
    if (categorias.length > MAX_SECTORES) {
      return `Tiene ${categorias.length} categorías; con más de ${MAX_SECTORES} los sectores no se distinguen bien.`;
    }
    return null;
  }

  /** Gráfico de sectores; «forma» permite el anillo y el semicírculo. */
  function configurarSectores(c, forma = {}) {
    const categorias = c.resumen.frecuencias.map((f) => f.categoria);
    const colores = coloresCategorias(c.tema, c.tipo, categorias.length);
    const enPorcentaje = c.modo === MODOS.PORCENTAJE;
    const angosto = c.anchoDisponible < 640;
    const comunes = opcionesComunes({
      tema: c.tema,
      titulo: c.pregunta,
      subtitulo: `${subtituloSimple(c.resumen, c.grupo)} · total = 100 %`,
      maxCaracteres: maxCaracteres(c.anchoDisponible),
      leyenda: true,
      posicionLeyenda: forma.leyendaAbajo || angosto ? "bottom" : "right",
    });
    comunes.plugins.etiquetasValor = { color: c.tema.texto, centro: forma.centro ?? null, centroBase: forma.centroBase };
    return {
      type: forma.tipo ?? "pie",
      data: {
        labels: categorias,
        datasets: [
          {
            label: "Respuestas válidas",
            data: c.resumen.frecuencias.map((f) => f.cantidad),
            backgroundColor: colores,
            borderColor: c.tema.fondo,
            borderWidth: 2,
            etiquetas: c.resumen.frecuencias.map((f) =>
              f.porcentaje >= PORCENTAJE_MINIMO_ETIQUETA
                ? enPorcentaje
                  ? formatearPorcentaje(f.porcentaje)
                  : `${f.cantidad} (${formatearPorcentaje(f.porcentaje)})`
                : null,
            ),
            colorEtiquetas: colores.map(colorTextoSobre),
            detalles: c.resumen.frecuencias.map((f) => detallePersonas(f)),
          },
        ],
      },
      options: {
        ...comunes,
        layout: { padding: 8 },
        ...(forma.opciones ?? {}),
      },
      plugins: [PLUGIN_ETIQUETAS, PLUGIN_FONDO],
    };
  }

  registrarGrafico({
    id: "circular",
    clave: "CIRCULAR",
    nombre: "Circular",
    orden: 40,
    razonNoDisponible: razonSectores,
    razonComparar: "Un gráfico circular muestra un solo total; para comparar recintos usa barras, anillos concéntricos o araña.",
    nota: () => "Se usó un gráfico circular para mostrar la proporción de cada respuesta respecto al total de respuestas válidas (total = 100 %).",
    comoLeer: () => "Cada sector representa la proporción de personas que dio esa respuesta; todos los sectores juntos suman el 100 % de las respuestas válidas.",
    configurar: (c) => configurarSectores(c),
    altura: ({ cantidadCategorias, anchoDisponible }) =>
      anchoDisponible < 640 ? 380 + Math.ceil(cantidadCategorias / 2) * 24 : 440,
  });

  // Araña (radar)

  /** Máximo del eje radial con margen para las etiquetas de valor. */
  function maximoRadial(valores, modo) {
    const maximo = Math.max(0, ...valores);
    if (modo === MODOS.PORCENTAJE) return Math.min(100, Math.max(10, Math.ceil((maximo * 1.15) / 10) * 10));
    return Math.max(maximo + 1, Math.ceil(maximo * 1.15));
  }

  function opcionesArana({ tema, titulo, subtitulo, modo, leyenda, anchoDisponible, maximo }) {
    return {
      ...opcionesComunes({ tema, titulo, subtitulo, maxCaracteres: maxCaracteres(anchoDisponible), leyenda }),
      layout: { padding: 8 },
      scales: {
        r: {
          beginAtZero: true,
          suggestedMax: maximo,
          angleLines: { color: tema.rejilla },
          grid: { color: tema.rejilla },
          pointLabels: { color: tema.texto, font: { size: anchoDisponible < 480 ? 11 : 12 } },
          ticks: {
            color: tema.secundario,
            precision: 0,
            // Pocas marcas para que los anillos no tapen el polígono.
            maxTicksLimit: 6,
            backdropColor: conTransparencia(tema.fondo, 0.8),
            callback: (valor) => (modo === MODOS.PORCENTAJE ? `${valor} %` : valor),
          },
        },
      },
    };
  }

  registrarGrafico({
    id: "arana",
    clave: "ARANA",
    nombre: "Araña (radar)",
    orden: 90,
    razonNoDisponible: ({ tipo, categorias }) => {
      if (tipo === TIPOS.NUMERICA) return "Las clases de una variable numérica se leen mejor en un histograma o en barras.";
      if (tipo === TIPOS.CRONOLOGICA) return "Una serie cronológica se lee mejor en líneas, en orden de fechas.";
      if (categorias.length < MIN_EJES_ARANA) return `Necesita al menos ${MIN_EJES_ARANA} categorías para formar los ejes.`;
      if (categorias.length > MAX_EJES_ARANA) {
        return `Tiene ${categorias.length} categorías; con más de ${MAX_EJES_ARANA} los ejes no se leen bien.`;
      }
      return null;
    },
    nota: ({ comparar }) =>
      comparar
        ? "Se usó un gráfico de araña (radar) para comparar el perfil de los recintos en todas las categorías a la vez."
        : "Se usó un gráfico de araña (radar) para ver el perfil de respuestas en varias categorías a la vez.",
    comoLeer: ({ comparar }) =>
      comparar
        ? "Cada recinto es un polígono de color: cuanto más lejos del centro está su punto en un eje, mayor es el porcentaje de ese recinto en esa respuesta."
        : "Cada eje es una respuesta posible: cuanto más lejos del centro está el punto, más personas la eligieron.",
    configurar: (c) => {
      const datos = c.resumen.frecuencias.map((f) => valorSegunModo(f, c.modo));
      return {
        type: "radar",
        data: {
          labels: etiquetasCategorias(c.resumen.frecuencias.map((f) => f.categoria), false),
          datasets: [
            {
              label: tituloEjeValor(c.modo),
              data: datos,
              borderColor: c.tema.principal,
              backgroundColor: conTransparencia(c.tema.principal, 0.2),
              pointBackgroundColor: c.tema.principal,
              borderWidth: 2,
              pointRadius: 3,
              etiquetas: c.resumen.frecuencias.map((f) =>
                c.modo === MODOS.PORCENTAJE ? formatearPorcentaje(f.porcentaje) : String(f.cantidad),
              ),
              detalles: c.resumen.frecuencias.map((f) => detallePersonas(f)),
            },
          ],
        },
        options: opcionesArana({
          tema: c.tema,
          titulo: c.pregunta,
          subtitulo: `${subtituloSimple(c.resumen, c.grupo)} · Distancia al centro: ${tituloEjeValor(c.modo).toLowerCase()}`,
          modo: c.modo,
          leyenda: false,
          anchoDisponible: c.anchoDisponible,
          maximo: maximoRadial(datos, c.modo),
        }),
        plugins: [PLUGIN_ETIQUETAS, PLUGIN_FONDO],
      };
    },
    configurarComparacion: (c) => {
      const series = seriesComparacion(c.comparacion, c.tema);
      return {
        type: "radar",
        data: {
          labels: etiquetasCategorias(c.comparacion.categorias, false),
          // Sin etiquetas de valor: con dos polígonos se superpondrían; los valores están en la tabla.
          datasets: series.map(({ color, etiquetas, ...serie }) => ({
            ...serie,
            borderColor: color,
            backgroundColor: conTransparencia(color, 0.15),
            pointBackgroundColor: color,
            borderWidth: 2,
            pointRadius: 3,
          })),
        },
        options: opcionesArana({
          tema: c.tema,
          titulo: c.pregunta,
          subtitulo: `${subtituloComparacion(c.comparacion)} · Distancia al centro: porcentaje (%)`,
          modo: MODOS.PORCENTAJE,
          leyenda: true,
          anchoDisponible: c.anchoDisponible,
          maximo: maximoRadial(series.flatMap((s) => s.data), MODOS.PORCENTAJE),
        }),
        plugins: [PLUGIN_FONDO],
      };
    },
    altura: ({ anchoDisponible }) => (anchoDisponible < 640 ? 420 : 500),
  });

  raiz.Graficadora.grafico = {
    MODOS,
    TIPOS_GRAFICO,
    NOMBRES_GRAFICO,
    registrarGrafico,
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
    tieneDibujoPropio,
    dibujarGrafico,
    // Piezas para registrar otras familias de gráficos.
    piezas: {
      MAX_SECTORES,
      PORCENTAJE_MINIMO_ETIQUETA,
      PLUGIN_ETIQUETAS,
      PLUGIN_FONDO,
      tituloEjeValor,
      maxCaracteres,
      conTransparencia,
      coloresCategorias,
      valorSegunModo,
      etiquetaSegunModo,
      detallePersonas,
      etiquetasCategorias,
      subtituloSimple,
      subtituloComparacion,
      seriesComparacion,
      opcionesComunes,
      opcionesBarras,
      ejes,
      razonSectores,
      configurarSectores,
      configurarBarras,
      configurarBarrasComparacion,
      notaBarras,
      comoLeerBarras,
    },
  };
})(globalThis);
