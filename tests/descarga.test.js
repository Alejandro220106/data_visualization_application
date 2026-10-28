import assert from "node:assert/strict";
import { test } from "node:test";

import "../js/tipos.js";
import "../js/descarga.js";

const { nombreArchivo } = globalThis.Graficadora.descarga;

test("quita tildes, signos y espacios del nombre", () => {
  assert.equal(nombreArchivo("¿En qué recinto cursas?"), "en-que-recinto-cursas.png");
});

test("incluye el recinto o la comparación", () => {
  assert.equal(nombreArchivo("Uso reciente", { grupo: "Lourdes" }), "uso-reciente-lourdes.png");
  assert.equal(nombreArchivo("Uso reciente", { comparar: true }), "uso-reciente-comparacion-recintos.png");
});

test("limita la longitud y nunca queda vacío", () => {
  assert.ok(nombreArchivo("palabra ".repeat(30)).length <= 64);
  assert.equal(nombreArchivo("¿?"), "grafico.png");
});

test("parte el pie de figura según el ancho medido", () => {
  const { partirPorAncho } = globalThis.Graficadora.descarga;
  const contextoFalso = { measureText: (texto) => ({ width: texto.length * 7 }) };
  const nota = "Nota: Se usó un gráfico circular para mostrar la proporción de cada respuesta respecto al total.";
  const lineas = partirPorAncho(contextoFalso, nota, 210);
  assert.ok(lineas.length > 1);
  assert.ok(lineas.every((linea) => linea.length * 7 <= 210 || !linea.includes(" ")));
  assert.equal(lineas.join(" "), nota);
});
