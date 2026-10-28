import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import "../js/csv.js";
import "../js/tipos.js";
import "../js/estadisticas.js";

const G = globalThis.Graficadora;
const { describirPregunta, resumir, compararGrupos, detectarColumnaGrupo, filtrarPorGrupo } =
  G.estadisticas;
const { TIPOS } = G.tipos;

const encuesta = G.csv.leerCSV(
  readFileSync(new URL("../datos/encuesta_ia.csv", import.meta.url), "utf8"),
);
const RECINTO = "¿En qué recinto cursas más asignaturas presenciales?";

function analizar(valores) {
  return resumir(valores, describirPregunta(valores));
}

test("ordena las categorías de mayor a menor con desempate alfabético", () => {
  const { frecuencias } = analizar(["B", "A", "B", "C", "A", "B"]);
  assert.deepEqual(frecuencias.map((f) => f.categoria), ["B", "A", "C"]);
});

test("los porcentajes se calculan sobre respuestas válidas, sin omisiones ni «No aplica»", () => {
  const resumen = analizar(["Siempre", "Nunca", "Siempre", "No aplica", null]);
  assert.equal(resumen.personas, 3);
  assert.equal(resumen.omitidas, 1);
  assert.equal(resumen.noAplica, 1);
  const siempre = resumen.frecuencias.find((f) => f.categoria === "Siempre");
  assert.equal(Math.round(siempre.porcentaje * 10) / 10, 66.7);
});

test("las escalas muestran todos sus niveles en orden, incluso sin respuestas", () => {
  const { frecuencias } = analizar(["A veces", "Siempre", "Siempre"]);
  assert.deepEqual(frecuencias.map((f) => f.categoria), [
    "Nunca", "Casi nunca", "A veces", "Casi siempre", "Siempre",
  ]);
  assert.equal(frecuencias[0].cantidad, 0);
});

test("selección múltiple: porcentaje sobre personas, puede sumar más de 100 %", () => {
  const resumen = analizar(["Programar, Resumir", "Programar", "Resumir, Redactar", null]);
  assert.equal(resumen.personas, 3);
  assert.equal(resumen.selecciones, 5);
  const suma = resumen.frecuencias.reduce((total, f) => total + f.porcentaje, 0);
  assert.ok(suma > 100);
});

test("medidas descriptivas de una escala numérica", () => {
  const { descriptivas } = analizar(["1", "2", "4", "5"]);
  assert.equal(descriptivas.media, 3);
  assert.equal(descriptivas.mediana, 3);
});

test("mediana de una escala de texto", () => {
  assert.equal(analizar(["Nunca", "A veces", "Siempre"]).descriptivas.medianaNivel, "A veces");
});

test("variable numérica continua se agrupa en intervalos", () => {
  const edades = ["18", "19", "20", "22", "25", "30", "31", "40"];
  const descripcion = describirPregunta(edades);
  assert.equal(descripcion.tipo, TIPOS.NUMERICA);
  const { frecuencias } = resumir(edades, descripcion);
  assert.equal(frecuencias.reduce((t, f) => t + f.cantidad, 0), 8);
});

test("detecta la columna del recinto y filtra por recinto", () => {
  assert.equal(detectarColumnaGrupo(encuesta.columnas), RECINTO);
  const lourdes = filtrarPorGrupo(encuesta.filas, RECINTO, "Lourdes");
  assert.ok(lourdes.length > 0 && lourdes.every((f) => f[RECINTO] === "Lourdes"));
});

test("la comparación usa las mismas categorías en ambos recintos", () => {
  const columna = "Verifico las respuestas que recibo";
  const descripcion = describirPregunta(encuesta.filas.map((f) => f[columna]));
  const { categorias, grupos } = compararGrupos(encuesta.filas, columna, RECINTO, descripcion);
  assert.deepEqual(grupos.map((g) => g.nombre), ["EcoCampus", "Lourdes"]);
  for (const grupo of grupos) {
    assert.deepEqual(grupo.resumen.frecuencias.map((f) => f.categoria), categorias);
  }
  const total = grupos.reduce((t, g) => t + g.resumen.total, 0);
  assert.equal(total, encuesta.filas.length);
});
