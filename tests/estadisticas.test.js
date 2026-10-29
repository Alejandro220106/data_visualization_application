import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import "../js/csv.js";
import "../js/tipos.js";
import "../js/distribucion.js";
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
  assert.deepEqual(analizar(["Nunca", "A veces", "Siempre"]).descriptivas.medianaNiveles, ["A veces"]);
  assert.deepEqual(analizar(["Nunca", "A veces", "Siempre", "Siempre"]).descriptivas.medianaNiveles, ["A veces", "Siempre"]);
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

// Ejemplos de las diapositivas «Medidas de posición y variabilidad» del curso.
test("moda: un valor, ninguno o dos, como en los ejemplos del curso", () => {
  const { calcularModa } = G.estadisticas;
  assert.deepEqual(calcularModa([14, 15, 17, 17, 21, 21, 21, 21, 33, 36, 40]).modas, [21]);
  const sinModa = calcularModa([152, 178, 160, 148, 165, 155, 164]);
  assert.equal(sinModa.sinModa, true);
  assert.match(sinModa.motivo, /ningún valor se repite/);
  assert.deepEqual(calcularModa([50, 55, 55, 55, 62, 73, 73, 73, 80]).modas, [55, 73]);
  assert.equal(calcularModa(["A", "A", "B", "B"]).sinModa, true);
});

test("mediana con n impar y n par, y su posición (n + 1) / 2", () => {
  const { medidasNumericas } = G.estadisticas;
  const impar = medidasNumericas([6, 8, 8, 10, 12, 19, 23]);
  assert.equal(impar.mediana, 10);
  assert.equal(impar.posicionMediana, 4);
  const par = medidasNumericas([3, 4, 4, 5, 16, 19, 25, 30]);
  assert.equal(par.mediana, 10.5);
  assert.equal(par.posicionMediana, 4.5);
});

test("media de una tabla con frecuencias (edades por número de personas)", () => {
  const tabla = [[18, 2], [20, 4], [22, 2], [25, 2], [30, 1], [36, 1]];
  const edades = tabla.flatMap(([edad, personas]) => Array(personas).fill(edad));
  const medidas = G.estadisticas.medidasNumericas(edades);
  assert.equal(medidas.n, 12);
  assert.equal(medidas.media, 23);
});

test("medidas de variabilidad: rango y desviación estándar muestral", () => {
  const medidas = G.estadisticas.medidasNumericas([2, 4, 4, 4, 5, 5, 7, 9]);
  assert.equal(medidas.rango, 7);
  assert.equal(Math.round(medidas.desviacion * 1000) / 1000, 2.138);
  assert.equal(G.estadisticas.medidasNumericas([5]).desviacion, null);
});

test("las preguntas numéricas traen la tabla de clases del curso", () => {
  const edades = ["18", "19", "20", "22", "25", "30", "31", "40"];
  const resumen = resumir(edades, describirPregunta(edades));
  assert.equal(resumen.clases.length, resumen.frecuencias.length);
  assert.equal(resumen.clases.at(-1).acumuladaMenos, 8);
  assert.deepEqual(resumen.clases.map((c) => c.frecuencia), resumen.frecuencias.map((f) => f.cantidad));
});

test("las categóricas informan su moda", () => {
  const { descriptivas } = analizar(["Sí", "Sí", "No"]);
  assert.deepEqual(descriptivas.modas, ["Sí"]);
});

test("la serie cronológica cuenta respuestas por día e incluye los días sin respuestas", () => {
  const marcas = ["2026/10/13 9:00", "2026/10/13 10:00", "2026/10/15 9:30", null];
  const resumen = analizar(marcas);
  assert.deepEqual(resumen.frecuencias.map((f) => f.categoria), ["13/10/2026", "14/10/2026", "15/10/2026"]);
  assert.deepEqual(resumen.frecuencias.map((f) => f.cantidad), [2, 0, 1]);
  assert.equal(resumen.omitidas, 1);
});
