/* Distribución de frecuencias por clases, con el esquema de tabla del curso. */
(function (raiz) {
  "use strict";

  // Decimales máximos que se consideran para la unidad de medida de los datos.
  const MAX_DECIMALES = 3;

  function contarDecimales(numero) {
    const texto = String(numero);
    if (texto.includes("e")) return MAX_DECIMALES;
    const punto = texto.indexOf(".");
    return punto === -1 ? 0 : Math.min(MAX_DECIMALES, texto.length - punto - 1);
  }

  /**
   * Cantidad de clases según la regla de Sturges: k = 1 + 3,322 · log10(n), redondeado hacia arriba.
   * Se usa la forma exacta 1 + log2(n): con 3,322 las potencias de 2 (como n = 8) ganarían una clase de más.
   */
  function clasesSturges(n) {
    return Math.max(1, Math.ceil(1 + Math.log2(Math.max(1, n)) - 1e-9));
  }

  function formatearLimite(valor, decimales) {
    return valor.toLocaleString("es-CR", {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
      useGrouping: false,
    });
  }

  /**
   * Define las k clases a partir de todos los datos. Se trabaja en unidades enteras
   * de medida (por ejemplo, centésimas) para evitar errores de redondeo.
   * La amplitud se redondea hacia arriba para que el valor máximo quede dentro.
   */
  function crearClases(numeros, k = clasesSturges(numeros.length)) {
    const decimales = Math.max(0, ...numeros.map(contarDecimales));
    const factor = 10 ** decimales;
    const enteros = numeros.map((x) => Math.round(x * factor));
    const minimo = Math.min(...enteros);
    const maximo = Math.max(...enteros);
    const amplitud = Math.max(1, Math.ceil((maximo - minimo + 1) / k));
    const aValor = (unidades) => unidades / factor;

    const clases = Array.from({ length: k }, (_, i) => {
      const inferior = minimo + i * amplitud;
      const superior = inferior + amplitud - 1;
      return {
        limiteInferior: aValor(inferior),
        limiteSuperior: aValor(superior),
        // Los límites reales están media unidad de medida por fuera de los indicados.
        limiteRealInferior: (2 * inferior - 1) / (2 * factor),
        limiteRealSuperior: (2 * superior + 1) / (2 * factor),
        puntoMedio: (inferior + superior) / (2 * factor),
        etiqueta: `${formatearLimite(aValor(inferior), decimales)}–${formatearLimite(aValor(superior), decimales)}`,
      };
    });

    return {
      k,
      decimales,
      minimo: aValor(minimo),
      maximo: aValor(maximo),
      rango: aValor(maximo - minimo),
      amplitud: aValor(amplitud),
      unidades: { factor, minimo, amplitud },
      clases,
    };
  }

  /** Posición de la clase que contiene al número (los extremos se acotan a la primera o la última). */
  function indiceDeClase(numero, distribucion) {
    const { factor, minimo, amplitud } = distribucion.unidades;
    const indice = Math.floor((Math.round(numero * factor) - minimo) / amplitud);
    return Math.min(distribucion.k - 1, Math.max(0, indice));
  }

  /**
   * Tabla de frecuencias de unos números sobre clases ya definidas: absoluta,
   * relativa y acumuladas «menos de» y «más de» (absolutas y relativas).
   */
  function tabularFrecuencias(numeros, distribucion) {
    const n = numeros.length;
    const frecuencias = new Array(distribucion.k).fill(0);
    for (const numero of numeros) frecuencias[indiceDeClase(numero, distribucion)]++;
    let acumulada = 0;
    return distribucion.clases.map((clase, i) => {
      const frecuencia = frecuencias[i];
      const acumuladaMas = n - acumulada;
      acumulada += frecuencia;
      return {
        ...clase,
        frecuencia,
        relativa: n ? frecuencia / n : 0,
        acumuladaMenos: acumulada,
        relativaMenos: n ? acumulada / n : 0,
        acumuladaMas,
        relativaMas: n ? acumuladaMas / n : 0,
      };
    });
  }

  /**
   * Mediana de datos agrupados: Me = Li + ((n/2 − F) / f) · c, donde Li es el límite real
   * inferior de la clase que contiene la posición n/2, F la acumulada anterior, f su
   * frecuencia y c la amplitud. Es el punto donde se cruzan las dos ojivas.
   */
  function medianaAgrupada(filas) {
    const n = filas.at(-1)?.acumuladaMenos ?? 0;
    if (!n) return null;
    const indice = filas.findIndex((fila) => fila.acumuladaMenos >= n / 2);
    const clase = filas[indice];
    const anterior = indice > 0 ? filas[indice - 1].acumuladaMenos : 0;
    const amplitud = clase.limiteRealSuperior - clase.limiteRealInferior;
    return clase.limiteRealInferior + ((n / 2 - anterior) / clase.frecuencia) * amplitud;
  }

  /** Clases y tabla completa en un solo paso. */
  function distribuirFrecuencias(numeros, k) {
    const distribucion = crearClases(numeros, k);
    return { ...distribucion, filas: tabularFrecuencias(numeros, distribucion) };
  }

  raiz.Graficadora = raiz.Graficadora || {};
  raiz.Graficadora.distribucion = {
    clasesSturges,
    crearClases,
    indiceDeClase,
    tabularFrecuencias,
    distribuirFrecuencias,
    medianaAgrupada,
  };
})(globalThis);
