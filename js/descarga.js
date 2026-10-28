/* Descarga del gráfico actual como imagen PNG, con su pie de figura. */
(function (raiz) {
  "use strict";

  const { normalizar } = raiz.Graficadora.tipos;
  const LARGO_MAXIMO_NOMBRE = 60;
  // Medidas del pie de figura en píxeles CSS; se multiplican por la densidad del lienzo.
  const MARGEN_PIE = 16;
  const ALTO_LINEA_PIE = 18;
  const TAMANO_LETRA_PIE = 12;
  const FUENTE_PIE = 'system-ui, -apple-system, "Segoe UI", sans-serif';

  /** Nombre de archivo seguro y descriptivo, sin tildes ni símbolos. */
  function nombreArchivo(pregunta, { grupo = null, comparar = false } = {}) {
    const partes = [pregunta];
    if (comparar) partes.push("comparacion recintos");
    else if (grupo) partes.push(grupo);
    const base = normalizar(partes.join(" "))
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, LARGO_MAXIMO_NOMBRE)
      .replace(/-+$/, "");
    return `${base || "grafico"}.png`;
  }

  /** Parte un texto en líneas que caben en «anchoMaximo» según la medición del contexto. */
  function partirPorAncho(contexto, texto, anchoMaximo) {
    const lineas = [];
    let actual = "";
    for (const palabra of String(texto).split(/\s+/)) {
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (actual && contexto.measureText(prueba).width > anchoMaximo) {
        lineas.push(actual);
        actual = palabra;
      } else {
        actual = prueba;
      }
    }
    if (actual) lineas.push(actual);
    return lineas;
  }

  /**
   * Crea un lienzo nuevo con el gráfico y, debajo, el pie de figura
   * («Fuente: …» en cursiva y «Nota: …»), listo para pegar en un informe.
   */
  function componerConPie(lienzo, { fuente = "", nota = "" } = {}) {
    const escala = lienzo.width / (lienzo.clientWidth || lienzo.width);
    const margen = MARGEN_PIE * escala;
    const altoLinea = ALTO_LINEA_PIE * escala;
    const anchoTexto = lienzo.width - margen * 2;
    const medidor = document.createElement("canvas").getContext("2d");
    const estilos = [
      { texto: fuente, letra: `italic ${TAMANO_LETRA_PIE * escala}px ${FUENTE_PIE}` },
      { texto: nota, letra: `${TAMANO_LETRA_PIE * escala}px ${FUENTE_PIE}` },
    ].filter((parte) => parte.texto);
    const bloques = estilos.map((parte) => {
      medidor.font = parte.letra;
      return { ...parte, lineas: partirPorAncho(medidor, parte.texto, anchoTexto) };
    });
    const lineasTotales = bloques.reduce((total, bloque) => total + bloque.lineas.length, 0);
    const altoPie = lineasTotales ? margen + lineasTotales * altoLinea + margen / 2 : 0;

    const salida = document.createElement("canvas");
    salida.width = lienzo.width;
    salida.height = Math.ceil(lienzo.height + altoPie);
    const contexto = salida.getContext("2d");
    contexto.fillStyle = "#ffffff";
    contexto.fillRect(0, 0, salida.width, salida.height);
    contexto.drawImage(lienzo, 0, 0);
    contexto.fillStyle = "#1f2937";
    contexto.textBaseline = "top";
    let y = lienzo.height + margen / 2;
    for (const bloque of bloques) {
      contexto.font = bloque.letra;
      for (const linea of bloque.lineas) {
        contexto.fillText(linea, margen, y);
        y += altoLinea;
      }
    }
    return salida;
  }

  /** Genera el PNG (gráfico + pie de figura) y lo descarga con el navegador. */
  function descargarLienzo(lienzo, nombre, pie = {}) {
    const imagen = componerConPie(lienzo, pie);
    return new Promise((resolver, rechazar) => {
      imagen.toBlob((blob) => {
        if (!blob) {
          rechazar(new Error("No se pudo generar la imagen del gráfico."));
          return;
        }
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = nombre;
        document.body.append(enlace);
        enlace.click();
        enlace.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolver();
      }, "image/png");
    });
  }

  raiz.Graficadora.descarga = { nombreArchivo, partirPorAncho, componerConPie, descargarLienzo };
})(globalThis);
