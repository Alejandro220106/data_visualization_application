import assert from "node:assert/strict";
import { test } from "node:test";

import "../js/tipos.js";

const { TIPOS, detectarTipo, separarRespuestas, expandirOpciones, esNoAplica } =
  globalThis.Graficadora.tipos;

test("separa omisiones y «No aplica» de las respuestas válidas", () => {
  const resultado = separarRespuestas(["Siempre", null, "No aplica", "n/a", "A veces"]);
  assert.deepEqual(resultado, { validas: ["Siempre", "A veces"], omitidas: 1, noAplica: 2 });
  assert.equal(esNoAplica("NO APLICA"), true);
});

test("detecta opción única", () => {
  const { tipo } = detectarTipo(["EcoCampus", "Lourdes", "EcoCampus", "Lourdes", "Lourdes"]);
  assert.equal(tipo, TIPOS.CATEGORICA);
});

test("detecta la escala de 1 a 5 con todos sus niveles en orden", () => {
  const { tipo, orden } = detectarTipo(["4", "1", "4", "3", "1"]);
  assert.equal(tipo, TIPOS.ESCALA);
  assert.deepEqual(orden, ["1", "2", "3", "4"]);
});

test("la frecuencia de 0 a 7 días es una escala", () => {
  assert.equal(detectarTipo(["0", "3", "7", "7", "2"]).tipo, TIPOS.ESCALA);
});

test("ordena la escala de frecuencia de Nunca a Siempre", () => {
  const { tipo, orden } = detectarTipo(["Siempre", "a veces", "Casi nunca", "Siempre"]);
  assert.equal(tipo, TIPOS.ESCALA);
  assert.deepEqual(orden, ["Nunca", "Casi nunca", "a veces", "Casi siempre", "Siempre"]);
});

test("ordena la escala de acuerdo", () => {
  const { orden } = detectarTipo(["De acuerdo", "En desacuerdo", "De acuerdo"]);
  assert.equal(orden[0], "Totalmente en desacuerdo");
  assert.equal(orden.at(-1), "Totalmente de acuerdo");
});

test("las edades son numéricas, no escala", () => {
  assert.equal(detectarTipo(["18", "19", "21", "21", "25"]).tipo, TIPOS.NUMERICA);
});

test("detecta selección múltiple y cuenta cada opción", () => {
  const validas = ["Programar, Resumir", "Programar", "Resumir, Redactar", "Programar, Redactar"];
  assert.equal(detectarTipo(validas).tipo, TIPOS.MULTIRESPUESTA);
  assert.equal(expandirOpciones(validas).filter((o) => o === "Programar").length, 3);
});

test("comas dentro de comentarios no son selección múltiple", () => {
  const comentarios = Array.from({ length: 25 }, (_, n) => `Bien, aunque mejoraría el tema ${n}`);
  assert.equal(detectarTipo(comentarios).tipo, TIPOS.TEXTO_LIBRE);
});

test("marcas temporales con pocas respuestas no se grafican", () => {
  const marcas = Array.from({ length: 6 }, (_, n) => `2026/10/28 9:0${n}:00`);
  assert.equal(detectarTipo(marcas).tipo, TIPOS.TEXTO_LIBRE);
});

test("sin respuestas válidas no hay gráfico", () => {
  assert.equal(detectarTipo([]).tipo, TIPOS.TEXTO_LIBRE);
});
