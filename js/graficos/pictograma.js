/* Pictograma: filas de figuras de personas, como en el material del curso. Se dibuja sin Chart.js. */
(function (raiz) {
  "use strict";

  const { TIPOS } = raiz.Graficadora.tipos;
  const { formatearPorcentaje, formatearNumero } = raiz.Graficadora.estadisticas;
  const { registrarGrafico, partirTexto, MODOS, piezas } = raiz.Graficadora.grafico;
  const { coloresCategorias, subtituloSimple, maxCaracteres } = piezas;

  // Máximo de figuras por fila: con más, las figuras serían demasiado pequeñas.
  const MAX_FIGURAS = 20;
  // Máximo de filas (categorías): con más, el pictograma se vuelve muy largo.
  const MAX_FILAS = 10;
  const UNIDADES = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  const MARGEN = 16;
  const ANCHO_VALOR = 104;
  const PROPORCION_FIGURA = 1.3;
  const FUENTE = 'system-ui, -apple-system, "Segoe UI", sans-serif';

  /** Personas que representa cada figura, para que ninguna fila pase de MAX_FIGURAS. */
  function unidadPictograma(maximo) {
    return UNIDADES.find((unidad) => Math.ceil(maximo / unidad) <= MAX_FIGURAS) ?? UNIDADES.at(-1);
  }

  /** Figuras completas y fracción de la última figura de una fila. */
  function figurasDeFila(cantidad, unidad) {
    return { completas: Math.floor(cantidad / unidad), fraccion: (cantidad % unidad) / unidad };
  }

  function textoUnidad(unidad) {
    return `Cada figura = ${formatearNumero(unidad)} ${unidad === 1 ? "persona" : "personas"}`;
  }

  /**
   * Geometría del pictograma para un ancho y un alto dados: encabezado, columnas,
   * tamaño de figura y posición de cada fila. No dibuja nada, así se puede probar.
   */
  function disenarPictograma({ frecuencias, ancho, alto, titulo, subtitulo }) {
    const angosto = ancho < 520;
    const maximo = Math.max(1, ...frecuencias.map((f) => f.cantidad));
    const unidad = unidadPictograma(maximo);
    const figurasMaximas = Math.max(1, Math.ceil(maximo / unidad));
    const lineasTitulo = partirTexto(titulo, maxCaracteres(ancho));
    const lineasSubtitulo = partirTexto(subtitulo, maxCaracteres(ancho) + 20);
    const altoEncabezado = MARGEN + lineasTitulo.length * 22 + lineasSubtitulo.length * 18 + 14;
    const anchoEtiqueta = angosto ? 0 : Math.min(Math.round(ancho * 0.3), 220);
    const anchoFiguras = ancho - MARGEN * 2 - anchoEtiqueta - ANCHO_VALOR - (angosto ? 0 : 12);
    const altoEtiquetaApilada = angosto ? 20 : 0;
    // El tamaño se limita por el ancho disponible y por el alto de cada fila.
    const altoPorFila = (alto - altoEncabezado - MARGEN - 24) / Math.max(1, frecuencias.length);
    const porAncho = Math.floor(anchoFiguras / figurasMaximas);
    const porAlto = Math.floor((altoPorFila - altoEtiquetaApilada - 10) / PROPORCION_FIGURA);
    const tamano = Math.max(10, Math.min(34, porAncho, porAlto));
    const altoFila = altoEtiquetaApilada + tamano * PROPORCION_FIGURA + 10;
    const xFiguras = MARGEN + anchoEtiqueta + (angosto ? 0 : 12);

    return {
      angosto,
      unidad,
      tamano,
      lineasTitulo,
      lineasSubtitulo,
      anchoEtiqueta,
      xFiguras,
      filas: frecuencias.map((f, i) => ({
        ...f,
        ...figurasDeFila(f.cantidad, unidad),
        y: altoEncabezado + i * altoFila,
        yFiguras: altoEncabezado + i * altoFila + altoEtiquetaApilada,
      })),
      yLeyenda: altoEncabezado + frecuencias.length * altoFila + 8,
    };
  }

  /** Silueta de persona: cabeza, tronco y piernas dentro de un recuadro de ancho «s». */
  function trazarPersona(ctx, x, y, s) {
    ctx.moveTo(x + s * 0.7, y + s * 0.22);
    ctx.arc(x + s * 0.5, y + s * 0.22, s * 0.2, 0, Math.PI * 2);
    ctx.roundRect(x + s * 0.18, y + s * 0.46, s * 0.64, s * 0.5, s * 0.16);
    ctx.rect(x + s * 0.25, y + s * 0.9, s * 0.2, s * 0.38);
    ctx.rect(x + s * 0.55, y + s * 0.9, s * 0.2, s * 0.38);
  }

  function dibujarFigura(ctx, x, y, s, color, vacio, fraccion = 1) {
    const alto = s * PROPORCION_FIGURA;
    ctx.beginPath();
    trazarPersona(ctx, x, y, s);
    ctx.fillStyle = vacio;
    ctx.fill();
    if (fraccion <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, s * fraccion, alto);
    ctx.clip();
    ctx.beginPath();
    trazarPersona(ctx, x, y, s);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  /** Dibuja el pictograma en el lienzo (en pantalla con el tema oscuro, en el PNG con el claro). */
  function dibujar(lienzo, c) {
    const ancho = c.anchoDisponible;
    const alto = c.alto ?? 420;
    const densidad = c.densidad ?? raiz.devicePixelRatio ?? 1;
    lienzo.width = Math.round(ancho * densidad);
    lienzo.height = Math.round(alto * densidad);
    lienzo.style.width = `${ancho}px`;
    lienzo.style.height = `${alto}px`;
    const ctx = lienzo.getContext("2d");
    ctx.setTransform(densidad, 0, 0, densidad, 0, 0);
    ctx.fillStyle = c.tema.fondo;
    ctx.fillRect(0, 0, ancho, alto);

    const subtitulo = `${subtituloSimple(c.resumen, c.grupo)} · ${textoUnidad(unidadPictograma(Math.max(1, ...c.resumen.frecuencias.map((f) => f.cantidad))))}`;
    const diseno = disenarPictograma({ frecuencias: c.resumen.frecuencias, ancho, alto, titulo: c.pregunta, subtitulo });
    const colores = coloresCategorias(c.tema, c.tipo, diseno.filas.length);

    let y = MARGEN;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillStyle = c.tema.texto;
    ctx.font = `700 16px ${FUENTE}`;
    for (const linea of diseno.lineasTitulo) {
      ctx.fillText(linea, MARGEN, y);
      y += 22;
    }
    ctx.fillStyle = c.tema.secundario;
    ctx.font = `13px ${FUENTE}`;
    for (const linea of diseno.lineasSubtitulo) {
      ctx.fillText(linea, MARGEN, y);
      y += 18;
    }

    const s = diseno.tamano;
    diseno.filas.forEach((fila, i) => {
      const centroFila = fila.yFiguras + (s * PROPORCION_FIGURA) / 2;
      ctx.fillStyle = c.tema.texto;
      ctx.font = `13px ${FUENTE}`;
      if (diseno.angosto) {
        ctx.textBaseline = "top";
        ctx.fillText(partirTexto(fila.categoria, 44)[0], MARGEN, fila.y);
      } else {
        const lineas = partirTexto(fila.categoria, Math.floor(diseno.anchoEtiqueta / 7)).slice(0, 2);
        ctx.textBaseline = "middle";
        lineas.forEach((linea, j) => ctx.fillText(linea, MARGEN, centroFila + (j - (lineas.length - 1) / 2) * 15));
      }
      for (let figura = 0; figura < fila.completas; figura++) {
        dibujarFigura(ctx, diseno.xFiguras + figura * s, fila.yFiguras, s - 2, colores[i], c.tema.vacio);
      }
      if (fila.fraccion > 0) {
        dibujarFigura(ctx, diseno.xFiguras + fila.completas * s, fila.yFiguras, s - 2, colores[i], c.tema.vacio, fila.fraccion);
      }
      const totalFiguras = fila.completas + (fila.fraccion > 0 ? 1 : 0);
      ctx.fillStyle = c.tema.texto;
      ctx.font = `600 12px ${FUENTE}`;
      ctx.textBaseline = "middle";
      const valor =
        c.modo === MODOS.PORCENTAJE
          ? `${formatearPorcentaje(fila.porcentaje)} (${fila.cantidad})`
          : `${fila.cantidad} (${formatearPorcentaje(fila.porcentaje)})`;
      ctx.fillText(valor, diseno.xFiguras + totalFiguras * s + 8, centroFila);
    });

    ctx.fillStyle = c.tema.secundario;
    ctx.font = `12px ${FUENTE}`;
    ctx.textBaseline = "top";
    ctx.fillText(textoUnidad(diseno.unidad), MARGEN, diseno.yLeyenda);
  }

  registrarGrafico({
    id: "pictograma",
    clave: "PICTOGRAMA",
    nombre: "Pictograma",
    orden: 95,
    razonNoDisponible: ({ tipo, categorias }) => {
      if (tipo === TIPOS.NUMERICA) return "Para una variable numérica usa el histograma.";
      if (categorias.length > MAX_FILAS) {
        return `Tiene ${categorias.length} categorías; con más de ${MAX_FILAS} filas el pictograma se vuelve muy largo.`;
      }
      return null;
    },
    razonComparar:
      "El pictograma cuenta personas de un solo grupo; para comparar recintos de distinto tamaño usa porcentajes en barras, líneas o anillos concéntricos.",
    nota: () =>
      "Se usó un pictograma: cada figura representa una cantidad fija de personas (indicada en el subtítulo), lo que permite comparar cantidades a simple vista.",
    comoLeer: () =>
      "Cuenta las figuras de cada fila: cada una equivale a la cantidad de personas indicada en el subtítulo, y una figura incompleta es una fracción de esa cantidad.",
    dibujar,
    altura: ({ cantidadCategorias, anchoDisponible }) =>
      110 + cantidadCategorias * (anchoDisponible < 520 ? 66 : 52),
  });

  raiz.Graficadora.pictograma = { unidadPictograma, figurasDeFila, disenarPictograma, MAX_FIGURAS };
})(globalThis);
