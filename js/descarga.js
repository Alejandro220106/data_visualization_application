/* Descarga del gráfico actual como imagen PNG. */
(function (raiz) {
  "use strict";

  const { normalizar } = raiz.Graficadora.tipos;
  const LARGO_MAXIMO_NOMBRE = 60;

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

  /** Genera el PNG desde el lienzo del gráfico y lo descarga con el navegador. */
  function descargarLienzo(lienzo, nombre) {
    return new Promise((resolver, rechazar) => {
      lienzo.toBlob((blob) => {
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

  raiz.Graficadora.descarga = { nombreArchivo, descargarLienzo };
})(globalThis);
