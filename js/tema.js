/* Paletas de color: tema oscuro para la interfaz y claro para las imágenes de informe. */
(function (raiz) {
  "use strict";

  const TEMAS = Object.freeze({
    oscuro: Object.freeze({
      nombre: "oscuro",
      // Igual a --color-superficie de css/estilos.css, para que el gráfico se funda con su tarjeta.
      fondo: "#111827",
      texto: "#e5e7eb",
      secundario: "#9ca3af",
      rejilla: "#374151",
      principal: "#60a5fa",
      // Azul y ámbar se distinguen también con daltonismo.
      grupos: ["#60a5fa", "#fbbf24", "#34d399", "#f472b6", "#a78bfa", "#22d3ee"],
      categorias: ["#56b4e9", "#e69f00", "#009e73", "#f0e442", "#cc79a7", "#d55e00", "#0072b2"],
      // Se usan desde la segunda entrada: los azules más oscuros no contrastan con el fondo.
      escala: ["#1e40af", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe", "#eff6ff"],
      vacio: "#374151",
    }),
    claro: Object.freeze({
      nombre: "claro",
      fondo: "#ffffff",
      texto: "#1f2937",
      secundario: "#4b5563",
      rejilla: "#e5e7eb",
      principal: "#2563eb",
      grupos: ["#2563eb", "#d55e00", "#009e73", "#cc79a7", "#e69f00", "#56b4e9"],
      categorias: ["#0072b2", "#e69f00", "#009e73", "#d55e00", "#cc79a7", "#56b4e9", "#f0e442"],
      escala: ["#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e3a8a"],
      vacio: "#e5e7eb",
    }),
  });

  /** Luminancia relativa de un color «#rrggbb» (WCAG 2). */
  function luminancia(hexadecimal) {
    const canales = [1, 3, 5].map((i) => parseInt(hexadecimal.slice(i, i + 2), 16) / 255);
    const [r, g, b] = canales.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /** Razón de contraste entre dos colores (de 1 a 21). */
  function contraste(colorA, colorB) {
    const [clara, oscura] = [luminancia(colorA), luminancia(colorB)].sort((a, b) => b - a);
    return (clara + 0.05) / (oscura + 0.05);
  }

  /** Negro o blanco, el que contraste más con el color de fondo. */
  function colorTextoSobre(hexadecimal) {
    return contraste(hexadecimal, "#ffffff") >= contraste(hexadecimal, "#111827") ? "#ffffff" : "#111827";
  }

  raiz.Graficadora = raiz.Graficadora || {};
  raiz.Graficadora.tema = { TEMAS, luminancia, contraste, colorTextoSobre };
})(globalThis);
