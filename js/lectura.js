/* Explicaciones en lenguaje sencillo para leer cada gráfico. */
(function (raiz) {
  "use strict";

  const { TIPOS } = raiz.Graficadora.tipos;
  const { formatearPorcentaje, formatearNumero } = raiz.Graficadora.estadisticas;

  // Por debajo de esta cantidad de respuestas se advierte que la comparación es frágil.
  const MINIMO_COMPARACION = 5;

  const LIMITACION =
    "Los resultados describen a quienes respondieron el formulario; no se generalizan a toda la población estudiantil.";

  function plural(cantidad, singular, pluralTexto) {
    return `${formatearNumero(cantidad)} ${cantidad === 1 ? singular : pluralTexto}`;
  }

  /** «A veces» o «entre «A veces» y «Casi siempre»» sin comillas duplicadas. */
  function formatearMediana(niveles) {
    return niveles.length === 1 ? `en «${niveles[0]}»` : `entre «${niveles[0]}» y «${niveles[1]}»`;
  }

  /** Categorías con la mayor cantidad (puede haber empate). */
  function masFrecuentes(frecuencias) {
    const maximo = Math.max(...frecuencias.map((f) => f.cantidad));
    return maximo > 0 ? frecuencias.filter((f) => f.cantidad === maximo) : [];
  }

  function fraseMasFrecuente(resumen, tipo) {
    const primeras = masFrecuentes(resumen.frecuencias);
    if (primeras.length === 0) return null;
    const sujeto = tipo === TIPOS.MULTIRESPUESTA ? "opción más elegida" : "respuesta más frecuente";
    if (primeras.length > 1) {
      const nombres = primeras.map((f) => `«${f.categoria}»`).join(", ");
      return `Empataron como ${sujeto} ${nombres}, con ${plural(primeras[0].cantidad, "persona", "personas")} cada una (${formatearPorcentaje(primeras[0].porcentaje)}).`;
    }
    const [primera] = primeras;
    return `La ${sujeto} fue «${primera.categoria}»: ${plural(primera.cantidad, "persona", "personas")} de ${formatearNumero(resumen.personas)} (${formatearPorcentaje(primera.porcentaje)}).`;
  }

  function fraseDescriptiva(resumen, tipo) {
    const d = resumen.descriptivas;
    if (!d) return null;
    if (d.medianaNiveles) return `La mediana se ubica ${formatearMediana(d.medianaNiveles)}.`;
    // Las preguntas categóricas solo tienen moda, que ya se describe como la respuesta más frecuente.
    if (d.media === undefined) return null;
    const rango = `de ${formatearNumero(d.minimo)} a ${formatearNumero(d.maximo)}`;
    if (tipo === TIPOS.NUMERICA) {
      return `Los valores van ${rango}; el promedio es ${formatearNumero(d.media)} y la mediana ${formatearNumero(d.mediana)}. Las barras agrupan los valores en intervalos.`;
    }
    return `El promedio es ${formatearNumero(d.media)} y la mediana ${formatearNumero(d.mediana)}; las respuestas van ${rango}.`;
  }

  function fraseExclusiones(resumen) {
    const partes = [];
    if (resumen.omitidas) partes.push(`${plural(resumen.omitidas, "persona que no respondió", "personas que no respondieron")} esta pregunta`);
    if (resumen.noAplica) partes.push(`${plural(resumen.noAplica, "respuesta", "respuestas")} «No aplica»`);
    if (resumen.invalidas) partes.push(`${plural(resumen.invalidas, "valor no numérico", "valores no numéricos")}`);
    if (partes.length === 0) return null;
    return `No se incluyen en los porcentajes: ${partes.join("; ")}. Las omisiones no se cuentan como cero.`;
  }

  const LECTURA_BARRAS =
    "Cada barra indica la cantidad de personas y el porcentaje que representa dentro de las respuestas válidas.";

  /**
   * Explicación de un gráfico simple (todos o un recinto).
   * «comoLeer» describe el tipo de gráfico mostrado (barras, circular o araña).
   */
  function explicarResumen(tipo, resumen, grupo = null, comoLeer = LECTURA_BARRAS) {
    const donde = grupo ? ` de ${grupo}` : "";
    const frases = [
      `Se muestran ${plural(resumen.personas, "respuesta válida", "respuestas válidas")} de ${plural(resumen.total, "participante", "participantes")}${donde}.`,
      fraseMasFrecuente(resumen, tipo),
      fraseDescriptiva(resumen, tipo),
    ];
    if (tipo === TIPOS.MULTIRESPUESTA) {
      frases.push(
        `Cada persona podía marcar varias opciones (en total se marcaron ${formatearNumero(resumen.selecciones)}), por eso los porcentajes se calculan sobre las personas y pueden sumar más de 100 %.`,
      );
    }
    frases.push(comoLeer, fraseExclusiones(resumen), LIMITACION);
    return frases.filter(Boolean);
  }

  /** Explicación de la comparación entre recintos. */
  function explicarComparacion(tipo, comparacion, comoLeer = null) {
    const frases = [];
    if (comoLeer) frases.push(comoLeer);
    for (const { nombre, resumen } of comparacion.grupos) {
      const primeras = masFrecuentes(resumen.frecuencias);
      const encabezado = `${nombre} (${plural(resumen.personas, "respuesta válida", "respuestas válidas")})`;
      if (primeras.length === 0) {
        frases.push(`${encabezado}: sin respuestas válidas para esta pregunta.`);
        continue;
      }
      const lider = primeras.map((f) => `«${f.categoria}»`).join(" y ");
      let frase = `${encabezado}: lo más frecuente fue ${lider} (${formatearPorcentaje(primeras[0].porcentaje)}).`;
      const d = resumen.descriptivas;
      if (d?.medianaNiveles) frase += ` La mediana se ubica ${formatearMediana(d.medianaNiveles)}.`;
      else if (d && d.media !== undefined) frase += ` Promedio: ${formatearNumero(d.media)}; mediana: ${formatearNumero(d.mediana)}.`;
      frases.push(frase);
    }
    frases.push(
      "Los porcentajes se calculan dentro de cada recinto, porque los grupos tienen distinto número de respuestas. La comparación es descriptiva y no indica diferencias estadísticamente significativas.",
    );
    const pequenos = comparacion.grupos.filter((g) => g.resumen.personas < MINIMO_COMPARACION);
    for (const grupo of pequenos) {
      frases.push(`${grupo.nombre} tiene pocas respuestas válidas (${formatearNumero(grupo.resumen.personas)}); interpreta la comparación con cautela.`);
    }
    if (tipo === TIPOS.MULTIRESPUESTA) {
      frases.push("En selección múltiple cada persona podía marcar varias opciones, por lo que los porcentajes de cada recinto pueden sumar más de 100 %.");
    }
    if (comparacion.sinGrupo) {
      frases.push(`${plural(comparacion.sinGrupo, "participante no indicó", "participantes no indicaron")} recinto y no se incluyen en la comparación.`);
    }
    frases.push(LIMITACION);
    return frases;
  }

  raiz.Graficadora.lectura = { explicarResumen, explicarComparacion, MINIMO_COMPARACION };
})(globalThis);
