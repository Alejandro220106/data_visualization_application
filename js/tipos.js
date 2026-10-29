/* Detección del tipo de respuesta de cada pregunta del formulario. */
(function (raiz) {
  "use strict";

  const TIPOS = Object.freeze({
    CATEGORICA: "categórica",
    MULTIRESPUESTA: "selección múltiple",
    ESCALA: "escala",
    NUMERICA: "numérica",
    CRONOLOGICA: "cronológica",
    TEXTO_LIBRE: "respuesta abierta",
  });

  // Proporción mínima de fechas reconocibles para tratar la columna como serie cronológica.
  const PROPORCION_FECHAS = 0.9;

  // Máximo de categorías distintas para tratar un texto como opción única.
  const MAX_CATEGORIAS = 20;
  // Si la proporción de valores únicos supera este umbral, son respuestas abiertas.
  const PROPORCION_TEXTO_LIBRE = 0.8;
  // Una escala numérica tiene enteros entre 0 y 10 (escala lineal de Google Forms).
  const RANGO_ESCALA = [0, 10];
  // Proporción mínima de valores convertibles a número para tratar la columna como numérica.
  const PROPORCION_NUMERICA = 0.9;
  // Separador que usa Google Forms para las casillas de verificación.
  const SEPARADOR_MULTIPLE = ", ";
  // Proporción mínima de celdas con varias opciones para considerar la pregunta de selección múltiple.
  const PROPORCION_MULTIPLE = 0.2;
  // Respuestas que se excluyen de los porcentajes válidos y se informan por separado.
  const RESPUESTAS_NO_APLICA = ["no aplica", "n/a", "na"];

  // Escalas de texto del formulario, ordenadas de menor a mayor.
  const ESCALAS_ORDINALES = [
    ["Nunca", "Casi nunca", "A veces", "Casi siempre", "Siempre"],
    [
      "Totalmente en desacuerdo",
      "En desacuerdo",
      "Ni de acuerdo ni en desacuerdo",
      "De acuerdo",
      "Totalmente de acuerdo",
    ],
  ];

  /**
   * Fecha de calendario («AAAA-MM-DD») de una marca temporal de Google Forms.
   * Acepta «2026/10/28 9:01:12» y el formato latino «28/10/2026 9:01».
   */
  function aFecha(valor) {
    const texto = String(valor ?? "").trim();
    let anio;
    let mes;
    let dia;
    let partes = texto.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\D|$)/);
    if (partes) [, anio, mes, dia] = partes.map(Number);
    else if ((partes = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\D|$)/))) [, dia, mes, anio] = partes.map(Number);
    else return null;
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));
    if (fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return null;
    return fecha.toISOString().slice(0, 10);
  }

  /** Minúsculas y sin tildes, para comparar etiquetas escritas de forma distinta. */
  function normalizar(texto) {
    return String(texto).normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
  }

  function esNoAplica(valor) {
    return valor !== null && RESPUESTAS_NO_APLICA.includes(normalizar(valor));
  }

  /** Separa las respuestas válidas de las omisiones y de «No aplica». */
  function separarRespuestas(valores) {
    const validas = [];
    let omitidas = 0;
    let noAplica = 0;
    for (const valor of valores) {
      if (valor === null || valor === undefined || valor === "") omitidas++;
      else if (esNoAplica(valor)) noAplica++;
      else validas.push(valor);
    }
    return { validas, omitidas, noAplica };
  }

  function aNumero(valor) {
    const numero = Number(String(valor).replace(",", "."));
    return Number.isFinite(numero) ? numero : null;
  }

  /** Separa las celdas con varias opciones para contar cada opción por separado. */
  function expandirOpciones(validas) {
    return validas.flatMap((valor) =>
      String(valor)
        .split(SEPARADOR_MULTIPLE)
        .map((opcion) => opcion.trim())
        .filter(Boolean),
    );
  }

  function buscarEscalaOrdinal(unicos) {
    const normalizados = unicos.map(normalizar);
    for (const escala of ESCALAS_ORDINALES) {
      const niveles = escala.map(normalizar);
      if (normalizados.every((valor) => niveles.includes(valor))) {
        // Se conservan las etiquetas tal como aparecen en los datos cuando existen.
        return escala.map((nivel) => unicos.find((valor) => normalizar(valor) === normalizar(nivel)) ?? nivel);
      }
    }
    return null;
  }

  function esMultirespuesta(validas, unicos) {
    const conVarias = validas.filter((valor) => String(valor).includes(SEPARADOR_MULTIPLE)).length;
    if (conVarias / validas.length < PROPORCION_MULTIPLE) return false;
    // Las opciones de unas casillas se repiten entre personas; los comentarios libres no.
    const elegidas = expandirOpciones(validas);
    const opciones = new Set(elegidas);
    return opciones.size <= MAX_CATEGORIAS && elegidas.length > opciones.size;
  }

  /**
   * Clasifica una pregunta a partir de sus respuestas válidas.
   * Devuelve { tipo, orden } donde «orden» es la lista de niveles de una escala.
   */
  function detectarTipo(validas) {
    if (validas.length === 0) return { tipo: TIPOS.TEXTO_LIBRE, orden: null };
    const unicos = [...new Set(validas)];

    const numeros = validas.map(aNumero).filter((numero) => numero !== null);
    if (numeros.length / validas.length >= PROPORCION_NUMERICA) {
      const minimo = Math.min(...numeros);
      const maximo = Math.max(...numeros);
      const enteros = numeros.every(Number.isInteger);
      if (enteros && minimo >= RANGO_ESCALA[0] && maximo <= RANGO_ESCALA[1]) {
        const orden = [];
        for (let nivel = minimo; nivel <= maximo; nivel++) orden.push(String(nivel));
        return { tipo: TIPOS.ESCALA, orden };
      }
      return { tipo: TIPOS.NUMERICA, orden: null };
    }

    const fechas = validas.filter((valor) => aFecha(valor) !== null).length;
    if (fechas / validas.length >= PROPORCION_FECHAS) return { tipo: TIPOS.CRONOLOGICA, orden: null };

    const ordinal = buscarEscalaOrdinal(unicos);
    if (ordinal) return { tipo: TIPOS.ESCALA, orden: ordinal };

    if (esMultirespuesta(validas, unicos)) return { tipo: TIPOS.MULTIRESPUESTA, orden: null };

    if (unicos.length <= MAX_CATEGORIAS) {
      const proporcion = unicos.length / validas.length;
      // Con pocas respuestas la proporción no basta: si todas son distintas, es texto libre.
      if (proporcion < PROPORCION_TEXTO_LIBRE || (unicos.length < validas.length && validas.length <= MAX_CATEGORIAS)) {
        return { tipo: TIPOS.CATEGORICA, orden: null };
      }
    }
    return { tipo: TIPOS.TEXTO_LIBRE, orden: null };
  }

  raiz.Graficadora = raiz.Graficadora || {};
  raiz.Graficadora.tipos = {
    TIPOS,
    normalizar,
    esNoAplica,
    separarRespuestas,
    expandirOpciones,
    detectarTipo,
    aNumero,
    aFecha,
  };
})(globalThis);
