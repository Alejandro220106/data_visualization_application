/* Gráficos de la distribución de frecuencias por clases: histograma, polígono de frecuencias y ojivas. */
(function (raiz) {
  "use strict";

  const { TIPOS } = raiz.Graficadora.tipos;
  const { formatearPorcentaje, formatearNumero } = raiz.Graficadora.estadisticas;
  const { medianaAgrupada } = raiz.Graficadora.distribucion;
  const { registrarGrafico, MODOS, piezas } = raiz.Graficadora.grafico;
  const { PLUGIN_ETIQUETAS, PLUGIN_FONDO, tituloEjeValor, maxCaracteres, conTransparencia, subtituloSimple, opcionesComunes, ejes } =
    piezas;

  const RAZON_NO_NUMERICA = "Es para variables numéricas agrupadas en clases, como edades o promedios.";
  const RAZON_COMPARAR = "Muestra la distribución de un solo grupo; para comparar recintos usa barras, líneas o áreas.";

  function formatear(valor, decimales) {
    return valor.toLocaleString("es-CR", { maximumFractionDigits: decimales, useGrouping: false });
  }

  function subtituloClases(c) {
    const { k, amplitud, decimales } = c.resumen.distribucion;
    return `${subtituloSimple(c.resumen, c.grupo)} · k = ${k} clases de amplitud ${formatear(amplitud, decimales)}`;
  }

  function valorClase(fila, modo) {
    return modo === MODOS.PORCENTAJE ? Number((fila.relativa * 100).toFixed(1)) : fila.frecuencia;
  }

  function textoValor(fila, modo) {
    return modo === MODOS.PORCENTAJE ? formatearPorcentaje(fila.relativa * 100) : String(fila.frecuencia);
  }

  /** Eje x numérico con marcas exactamente en los valores dados (puntos medios o límites reales). */
  function ejeLineal(c, titulo, marcas) {
    const decimales = c.resumen.distribucion.decimales + 1;
    return {
      type: "linear",
      title: { display: true, text: titulo, color: c.tema.secundario, font: { weight: "600" } },
      ticks: { color: c.tema.texto, autoSkip: false, maxRotation: 45, callback: (valor) => formatear(valor, decimales) },
      afterBuildTicks: (eje) => {
        eje.ticks = marcas.map((valor) => ({ value: valor }));
      },
      grid: { color: c.tema.rejilla },
      border: { color: c.tema.rejilla },
    };
  }

  function ejeFrecuencia(c, titulo) {
    return ejes({ tema: c.tema, modo: c.modo, tituloValor: titulo }).y;
  }

  // Histograma: barras contiguas, una por clase.
  function configurarHistograma(c) {
    const filas = c.resumen.clases;
    const decimales = c.resumen.distribucion.decimales + 1;
    const opciones = opcionesComunes({
      tema: c.tema,
      titulo: c.pregunta,
      subtitulo: subtituloClases(c),
      maxCaracteres: maxCaracteres(c.anchoDisponible),
    });
    return {
      type: "bar",
      data: {
        labels: filas.map((fila) => fila.etiqueta),
        datasets: [
          {
            label: c.modo === MODOS.PORCENTAJE ? "Frecuencia relativa (%)" : "Frecuencia absoluta (fi)",
            data: filas.map((fila) => valorClase(fila, c.modo)),
            backgroundColor: c.tema.principal,
            // El borde del color del fondo separa las barras sin dejar espacio entre ellas.
            borderColor: c.tema.fondo,
            borderWidth: 1,
            barPercentage: 1,
            categoryPercentage: 1,
            etiquetas: filas.map((fila) => (fila.frecuencia ? textoValor(fila, c.modo) : null)),
            detalles: filas.map(
              (fila) =>
                `Límites reales ${formatear(fila.limiteRealInferior, decimales)}–${formatear(fila.limiteRealSuperior, decimales)}: fi = ${fila.frecuencia} · ${formatearPorcentaje(fila.relativa * 100)}`,
            ),
          },
        ],
      },
      options: {
        ...opciones,
        layout: { padding: { top: 8, right: 12, bottom: 4, left: 4 } },
        scales: ejes({
          tema: c.tema,
          modo: c.modo,
          tituloValor: c.modo === MODOS.PORCENTAJE ? "Frecuencia relativa (%)" : "Frecuencia absoluta (fi)",
          tituloCategorias: "Clases (límites indicados)",
        }),
      },
      plugins: [PLUGIN_ETIQUETAS, PLUGIN_FONDO],
    };
  }

  // Polígono de frecuencias: une los puntos medios y baja a cero una clase antes y una después.
  function configurarPoligono(c) {
    const filas = c.resumen.clases;
    const { amplitud } = c.resumen.distribucion;
    const primero = filas[0].puntoMedio - amplitud;
    const ultimo = filas.at(-1).puntoMedio + amplitud;
    const puntos = [
      { x: primero, y: 0 },
      ...filas.map((fila) => ({ x: fila.puntoMedio, y: valorClase(fila, c.modo) })),
      { x: ultimo, y: 0 },
    ];
    const color = c.tema.principal;
    const tituloValor = c.modo === MODOS.PORCENTAJE ? "Frecuencia relativa (%)" : "Frecuencia absoluta (fi)";
    return {
      type: "line",
      data: {
        datasets: [
          {
            label: tituloValor,
            data: puntos,
            borderColor: color,
            backgroundColor: conTransparencia(color, 0.18),
            fill: "origin",
            tension: 0,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: color,
            etiquetas: [null, ...filas.map((fila) => (fila.frecuencia ? textoValor(fila, c.modo) : null)), null],
            detalles: [
              "Extremo: frecuencia 0",
              ...filas.map((fila) => `xi = ${formatearNumero(fila.puntoMedio)} (clase ${fila.etiqueta}): fi = ${fila.frecuencia}`),
              "Extremo: frecuencia 0",
            ],
          },
        ],
      },
      options: {
        ...opcionesComunes({ tema: c.tema, titulo: c.pregunta, subtitulo: subtituloClases(c), maxCaracteres: maxCaracteres(c.anchoDisponible) }),
        layout: { padding: { top: 8, right: 16, bottom: 4, left: 4 } },
        scales: {
          x: ejeLineal(c, "Punto medio de clase (xi)", puntos.map((p) => p.x)),
          y: ejeFrecuencia(c, tituloValor),
        },
      },
      plugins: [PLUGIN_ETIQUETAS, PLUGIN_FONDO],
    };
  }

  // Ojivas «menos de» (sube) y «más de» (baja), sobre los límites reales.
  function configurarOjivas(c) {
    const filas = c.resumen.clases;
    const n = filas.at(-1).acumuladaMenos;
    const relativa = c.modo === MODOS.PORCENTAJE;
    const valor = (absoluta) => (relativa ? Number(((absoluta / n) * 100).toFixed(1)) : absoluta);
    const menos = [
      { x: filas[0].limiteRealInferior, y: 0 },
      ...filas.map((fila) => ({ x: fila.limiteRealSuperior, y: valor(fila.acumuladaMenos) })),
    ];
    const mas = [
      ...filas.map((fila) => ({ x: fila.limiteRealInferior, y: valor(fila.acumuladaMas) })),
      { x: filas.at(-1).limiteRealSuperior, y: 0 },
    ];
    const [colorMenos, colorMas] = c.tema.grupos;
    const serie = (etiqueta, datos, color) => ({
      label: etiqueta,
      data: datos,
      borderColor: color,
      backgroundColor: color,
      fill: false,
      tension: 0,
      borderWidth: 2,
      pointRadius: 4,
      pointBackgroundColor: color,
      detalles: datos.map((p) => `${etiqueta}: ${formatearNumero(p.x)} → ${relativa ? formatearPorcentaje(p.y) : `${p.y} personas`}`),
    });
    const tituloValor = relativa ? "Frecuencia acumulada relativa (%)" : "Frecuencia acumulada (personas)";
    const marcas = [...new Set([...menos, ...mas].map((p) => p.x))].sort((a, b) => a - b);
    return {
      type: "line",
      data: { datasets: [serie("Ojiva «menos de»", menos, colorMenos), serie("Ojiva «más de»", mas, colorMas)] },
      options: {
        ...opcionesComunes({
          tema: c.tema,
          titulo: c.pregunta,
          subtitulo: subtituloClases(c),
          maxCaracteres: maxCaracteres(c.anchoDisponible),
          leyenda: true,
        }),
        layout: { padding: { top: 8, right: 16, bottom: 4, left: 4 } },
        scales: { x: ejeLineal(c, "Límites reales de clase", marcas), y: ejeFrecuencia(c, tituloValor) },
      },
      plugins: [PLUGIN_FONDO],
    };
  }

  const razonClases = ({ tipo }) => (tipo === TIPOS.NUMERICA ? null : RAZON_NO_NUMERICA);
  const alturaClases = ({ anchoDisponible }) => (anchoDisponible < 640 ? 380 : 440);

  registrarGrafico({
    id: "histograma",
    clave: "HISTOGRAMA",
    nombre: "Histograma",
    orden: 80,
    razonNoDisponible: razonClases,
    razonComparar: RAZON_COMPARAR,
    nota: () =>
      "Se usó un histograma porque la variable es numérica: las barras contiguas muestran cuántas respuestas caen en cada clase de la distribución de frecuencias.",
    comoLeer: () =>
      "Cada barra es una clase (sus límites indicados están en el eje) y su altura es la frecuencia; las barras van juntas porque las clases son continuas.",
    configurar: configurarHistograma,
    altura: alturaClases,
  });

  registrarGrafico({
    id: "poligono",
    clave: "POLIGONO",
    nombre: "Polígono de frecuencias",
    orden: 82,
    razonNoDisponible: razonClases,
    razonComparar: RAZON_COMPARAR,
    nota: () =>
      "Se usó un polígono de frecuencias, que une los puntos medios de las clases para mostrar la forma de la distribución.",
    comoLeer: () =>
      "Cada punto está sobre el punto medio (xi) de una clase y su altura es la frecuencia; la línea baja a cero en los extremos para cerrar la figura.",
    configurar: configurarPoligono,
    altura: alturaClases,
  });

  registrarGrafico({
    id: "ojivas",
    clave: "OJIVAS",
    nombre: "Ojivas «menos de» y «más de»",
    orden: 84,
    razonNoDisponible: razonClases,
    razonComparar: RAZON_COMPARAR,
    nota: () =>
      "Se usaron las ojivas «menos de» y «más de», que muestran las frecuencias acumuladas de la distribución; se cruzan en la mediana.",
    comoLeer: ({ resumen }) => {
      const mediana = resumen?.clases ? medianaAgrupada(resumen.clases) : null;
      const cruce = mediana === null ? "" : ` Se cruzan en x ≈ ${formatearNumero(mediana)}, que estima la mediana de los datos agrupados.`;
      return `La ojiva «menos de» sube: indica cuántas respuestas están por debajo de cada límite real. La «más de» baja: cuántas están por encima.${cruce}`;
    },
    configurar: configurarOjivas,
    altura: alturaClases,
  });
})(globalThis);
