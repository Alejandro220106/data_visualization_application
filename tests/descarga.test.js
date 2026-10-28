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
