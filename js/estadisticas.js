/* Frecuencias, porcentajes y medidas descriptivas de una pregunta. */
(function (raiz) {
  "use strict";

  const { TIPOS, normalizar, separarRespuestas, expandirOpciones, detectarTipo, aNumero, aFecha } =
    raiz.Graficadora.tipos;
  const { crearClases, indiceDeClase, tabularFrecuencias } = raiz.Graficadora.distribucion;

  const ORDENAR_TEXTO = new Intl.Collator("es", { sensitivity: "base" });
  // Si el período abarca hasta estos días, también se muestran los días sin respuestas.
  const MAX_DIAS_CONTINUOS = 62;
  const MS_POR_DIA = 86400000;

  /** «2026-10-13» → «13/10/2026». */
  function formatearFecha(iso) {
    const [anio, mes, dia] = iso.split("-");
    return `${dia}/${mes}/${anio}`;
  }

  /** Días del período en orden cronológico, incluidos los días sin respuestas si el período es corto. */
  function diasDelPeriodo(fechasIso) {
    const unicas = [...new Set(fechasIso)].sort();
    const inicio = Date.parse(`${unicas[0]}T00:00:00Z`);
    const dias = Math.round((Date.parse(`${unicas.at(-1)}T00:00:00Z`) - inicio) / MS_POR_DIA) + 1;
    if (dias > MAX_DIAS_CONTINUOS) return unicas;
    return Array.from({ length: dias }, (_, i) => new Date(inicio + i * MS_POR_DIA).toISOString().slice(0, 10));
  }

  /** Columna que identifica el recinto declarado por cada participante. */
  function detectarColumnaGrupo(columnas) {
    return columnas.find((columna) => normalizar(columna).includes("recinto")) ?? null;
  }

  /** Filas del grupo elegido; sin grupo devuelve todas. */
  function filtrarPorGrupo(filas, columnaGrupo, grupo) {
    if (!columnaGrupo || !grupo) return filas;
    return filas.filter((fila) => fila[columnaGrupo] === grupo);
  }

  function gruposDisponibles(filas, columnaGrupo) {
    if (!columnaGrupo) return [];
    const valores = filas.map((fila) => fila[columnaGrupo]).filter((valor) => valor !== null);
    return [...new Set(valores)].sort(ORDENAR_TEXTO.compare);
  }

  /**
   * Describe la pregunta con todas sus respuestas: tipo, niveles y clases.
   * Se calcula una sola vez para que filtros y comparaciones usen el mismo criterio.
   */
  function describirPregunta(valores) {
    const { validas } = separarRespuestas(valores);
    const { tipo, orden } = detectarTipo(validas);
    const descripcion = { tipo, orden, distribucion: null };
    if (tipo === TIPOS.NUMERICA) {
      descripcion.distribucion = crearClases(validas.map(aNumero).filter((n) => n !== null));
    }
    if (tipo === TIPOS.CRONOLOGICA) {
      descripcion.orden = diasDelPeriodo(validas.map(aFecha).filter(Boolean)).map(formatearFecha);
    }
    return descripcion;
  }

  function mediana(ordenados) {
    const medio = Math.floor(ordenados.length / 2);
    return ordenados.length % 2 ? ordenados[medio] : (ordenados[medio - 1] + ordenados[medio]) / 2;
  }

  /**
   * Moda según el curso: el valor con mayor frecuencia. Puede no existir
   * (ningún valor se repite, o todos se repiten igual) o haber más de una.
   */
  function calcularModa(valores) {
    const conteo = new Map();
    for (const valor of valores) conteo.set(valor, (conteo.get(valor) ?? 0) + 1);
    if (conteo.size === 0) return { modas: [], sinModa: true, motivo: "no hay datos" };
    const maximo = Math.max(...conteo.values());
    if (maximo === 1 && valores.length > 1) {
      return { modas: [], sinModa: true, motivo: "ningún valor se repite" };
    }
    const modas = [...conteo.keys()].filter((valor) => conteo.get(valor) === maximo);
    if (modas.length === conteo.size && conteo.size > 1) {
      return { modas: [], sinModa: true, motivo: "todos los valores tienen la misma frecuencia" };
    }
    return { modas, sinModa: false, frecuencia: maximo };
  }

  /** Medidas de posición (media, mediana, moda) y de variabilidad (rango, desviación estándar). */
  function medidasNumericas(numeros) {
    const ordenados = [...numeros].sort((a, b) => a - b);
    const n = ordenados.length;
    const media = ordenados.reduce((suma, x) => suma + x, 0) / n;
    const moda = calcularModa(ordenados);
    // Desviación estándar muestral: divide entre n − 1.
    const desviacion =
      n > 1 ? Math.sqrt(ordenados.reduce((suma, x) => suma + (x - media) ** 2, 0) / (n - 1)) : null;
    return {
      n,
      media,
      mediana: mediana(ordenados),
      posicionMediana: (n + 1) / 2,
      modas: moda.modas,
      sinModa: moda.sinModa,
      motivoSinModa: moda.motivo ?? null,
      minimo: ordenados[0],
      maximo: ordenados.at(-1),
      rango: ordenados.at(-1) - ordenados[0],
      desviacion,
    };
  }

  function medidasDescriptivas(validas, elementos, descripcion) {
    if (validas.length === 0) return null;
    const numerica = descripcion.tipo === TIPOS.NUMERICA || /^\d+$/.test(descripcion.orden?.[0] ?? "");
    if (numerica) {
      return medidasNumericas(validas.map(aNumero).filter((n) => n !== null));
    }
    const moda = calcularModa(elementos);
    const datosModa = { modas: moda.modas, sinModa: moda.sinModa, motivoSinModa: moda.motivo ?? null };
    if (descripcion.tipo === TIPOS.ESCALA) {
      // Mediana de una escala de texto: se calcula sobre la posición de cada nivel.
      const niveles = descripcion.orden.map(normalizar);
      const posiciones = validas.map((v) => niveles.indexOf(normalizar(v))).sort((a, b) => a - b);
      const medio = Math.floor(posiciones.length / 2);
      const bajo = posiciones.length % 2 ? posiciones[medio] : posiciones[medio - 1];
      const alto = posiciones[medio];
      // Con cantidad par de respuestas la mediana puede quedar entre dos niveles.
      const medianaNiveles = bajo === alto ? [descripcion.orden[bajo]] : [descripcion.orden[bajo], descripcion.orden[alto]];
      return { medianaNiveles, ...datosModa };
    }
    return datosModa;
  }

  /**
   * Frecuencias de una pregunta. Los porcentajes se calculan sobre las personas
   * con respuesta válida; en selección múltiple pueden sumar más de 100 %.
   */
  function resumir(valores, descripcion, categoriasFijas = null) {
    const { validas: respuestas, omitidas, noAplica } = separarRespuestas(valores);
    let validas = respuestas;
    let invalidas = 0;
    let elementos;
    let clases = null;

    if (descripcion.tipo === TIPOS.NUMERICA) {
      validas = respuestas.filter((v) => aNumero(v) !== null);
      invalidas = respuestas.length - validas.length;
      const numeros = validas.map(aNumero);
      const { distribucion } = descripcion;
      elementos = numeros.map((x) => distribucion.clases[indiceDeClase(x, distribucion)].etiqueta);
      // Tabla completa del curso: límites, puntos medios y frecuencias acumuladas.
      clases = tabularFrecuencias(numeros, distribucion);
    } else if (descripcion.tipo === TIPOS.CRONOLOGICA) {
      validas = respuestas.filter((v) => aFecha(v) !== null);
      invalidas = respuestas.length - validas.length;
      elementos = validas.map((v) => formatearFecha(aFecha(v)));
    } else if (descripcion.tipo === TIPOS.MULTIRESPUESTA) {
      elementos = expandirOpciones(validas);
    } else if (descripcion.tipo === TIPOS.ESCALA) {
      // Las etiquetas se igualan con los niveles de la escala aunque cambien tildes o mayúsculas.
      const niveles = descripcion.orden;
      elementos = validas.map((v) => niveles.find((n) => normalizar(n) === normalizar(v)) ?? v);
    } else {
      elementos = validas;
    }

    const conteo = new Map();
    for (const elemento of elementos) conteo.set(elemento, (conteo.get(elemento) ?? 0) + 1);

    let categorias = categoriasFijas;
    if (!categorias) {
      if (descripcion.tipo === TIPOS.ESCALA || descripcion.tipo === TIPOS.CRONOLOGICA) categorias = descripcion.orden;
      else if (descripcion.tipo === TIPOS.NUMERICA) categorias = descripcion.distribucion.clases.map((c) => c.etiqueta);
      else {
        categorias = [...conteo.keys()].sort(
          (a, b) => conteo.get(b) - conteo.get(a) || ORDENAR_TEXTO.compare(a, b),
        );
      }
    }

    const personas = validas.length;
    return {
      total: valores.length,
      personas,
      omitidas,
      noAplica,
      invalidas,
      selecciones: descripcion.tipo === TIPOS.MULTIRESPUESTA ? elementos.length : null,
      frecuencias: categorias.map((categoria) => {
        const cantidad = conteo.get(categoria) ?? 0;
        return { categoria, cantidad, porcentaje: personas ? (cantidad / personas) * 100 : 0 };
      }),
      clases,
      descriptivas: medidasDescriptivas(validas, elementos, descripcion),
    };
  }

  /** Resumen de cada recinto con las mismas categorías y en el mismo orden. */
  function compararGrupos(filas, columna, columnaGrupo, descripcion) {
    const conGrupo = filas.filter((fila) => fila[columnaGrupo] !== null);
    const general = resumir(conGrupo.map((fila) => fila[columna]), descripcion);
    const categorias = general.frecuencias.map((f) => f.categoria);
    const grupos = gruposDisponibles(conGrupo, columnaGrupo).map((nombre) => ({
      nombre,
      resumen: resumir(
        filtrarPorGrupo(conGrupo, columnaGrupo, nombre).map((fila) => fila[columna]),
        descripcion,
        categorias,
      ),
    }));
    return { categorias, grupos, sinGrupo: filas.length - conGrupo.length };
  }

  /** Porcentaje con una cifra decimal y coma decimal. */
  function formatearPorcentaje(valor) {
    return `${valor.toLocaleString("es-CR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} %`;
  }

  function formatearNumero(valor) {
    return valor.toLocaleString("es-CR", { maximumFractionDigits: 2 });
  }

  raiz.Graficadora.estadisticas = {
    detectarColumnaGrupo,
    filtrarPorGrupo,
    gruposDisponibles,
    describirPregunta,
    resumir,
    compararGrupos,
    calcularModa,
    medidasNumericas,
    formatearPorcentaje,
    formatearNumero,
  };
})(globalThis);
