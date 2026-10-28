/* Frecuencias, porcentajes y medidas descriptivas de una pregunta. */
(function (raiz) {
  "use strict";

  const { TIPOS, normalizar, separarRespuestas, expandirOpciones, detectarTipo, aNumero } =
    raiz.Graficadora.tipos;

  const ORDENAR_TEXTO = new Intl.Collator("es", { sensitivity: "base" });

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

  /** Intervalos para variables numéricas continuas (regla de Sturges). */
  function calcularIntervalos(numeros) {
    const minimo = Math.min(...numeros);
    const maximo = Math.max(...numeros);
    const cantidad = Math.max(1, Math.ceil(Math.log2(numeros.length)) + 1);
    const enteros = numeros.every(Number.isInteger);
    const ancho = enteros
      ? Math.max(1, Math.ceil((maximo - minimo + 1) / cantidad))
      : (maximo - minimo) / cantidad || 1;
    const intervalos = [];
    for (let inicio = minimo; inicio <= maximo; inicio += ancho) {
      const fin = enteros ? inicio + ancho - 1 : inicio + ancho;
      const etiqueta = enteros
        ? inicio === fin
          ? String(inicio)
          : `${inicio}–${fin}`
        : `${inicio.toFixed(1)}–${fin.toFixed(1)}`;
      intervalos.push({ inicio, fin, etiqueta });
      if (intervalos.length > 50) break;
    }
    return intervalos;
  }

  function ubicarEnIntervalo(numero, intervalos) {
    const ultimo = intervalos.length - 1;
    const encontrado = intervalos.find((intervalo, i) =>
      i === ultimo ? numero >= intervalo.inicio && numero <= intervalo.fin : numero >= intervalo.inicio && numero < intervalo.fin + (Number.isInteger(intervalo.fin) ? 1 : 0),
    );
    return (encontrado ?? intervalos[ultimo]).etiqueta;
  }

  /**
   * Describe la pregunta con todas sus respuestas: tipo, niveles e intervalos.
   * Se calcula una sola vez para que filtros y comparaciones usen el mismo criterio.
   */
  function describirPregunta(valores) {
    const { validas } = separarRespuestas(valores);
    const { tipo, orden } = detectarTipo(validas);
    const descripcion = { tipo, orden, intervalos: null };
    if (tipo === TIPOS.NUMERICA) {
      descripcion.intervalos = calcularIntervalos(validas.map(aNumero).filter((n) => n !== null));
    }
    return descripcion;
  }

  function mediana(ordenados) {
    const medio = Math.floor(ordenados.length / 2);
    return ordenados.length % 2 ? ordenados[medio] : (ordenados[medio - 1] + ordenados[medio]) / 2;
  }

  function medidasDescriptivas(validas, descripcion) {
    if (validas.length === 0) return null;
    const numerica = descripcion.tipo === TIPOS.NUMERICA || /^\d+$/.test(descripcion.orden?.[0] ?? "");
    if (numerica) {
      const numeros = validas.map(aNumero).filter((n) => n !== null).sort((a, b) => a - b);
      const media = numeros.reduce((suma, n) => suma + n, 0) / numeros.length;
      return {
        media,
        mediana: mediana(numeros),
        minimo: numeros[0],
        maximo: numeros.at(-1),
      };
    }
    if (descripcion.tipo === TIPOS.ESCALA) {
      // Mediana de una escala de texto: se calcula sobre la posición de cada nivel.
      const niveles = descripcion.orden.map(normalizar);
      const posiciones = validas.map((v) => niveles.indexOf(normalizar(v))).sort((a, b) => a - b);
      const medio = Math.floor(posiciones.length / 2);
      const bajo = posiciones.length % 2 ? posiciones[medio] : posiciones[medio - 1];
      const alto = posiciones[medio];
      // Con cantidad par de respuestas la mediana puede quedar entre dos niveles.
      const medianaNiveles = bajo === alto ? [descripcion.orden[bajo]] : [descripcion.orden[bajo], descripcion.orden[alto]];
      return { medianaNiveles };
    }
    return null;
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

    if (descripcion.tipo === TIPOS.NUMERICA) {
      validas = respuestas.filter((v) => aNumero(v) !== null);
      invalidas = respuestas.length - validas.length;
      elementos = validas.map((v) => ubicarEnIntervalo(aNumero(v), descripcion.intervalos));
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
      if (descripcion.tipo === TIPOS.ESCALA) categorias = descripcion.orden;
      else if (descripcion.tipo === TIPOS.NUMERICA) categorias = descripcion.intervalos.map((i) => i.etiqueta);
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
      descriptivas: medidasDescriptivas(validas, descripcion),
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
    calcularIntervalos,
    formatearPorcentaje,
    formatearNumero,
  };
})(globalThis);
