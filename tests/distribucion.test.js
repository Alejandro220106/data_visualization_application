import assert from "node:assert/strict";
import { test } from "node:test";

import "../js/distribucion.js";

const { clasesSturges, crearClases, tabularFrecuencias, distribuirFrecuencias, indiceDeClase } =
  globalThis.Graficadora.distribucion;

// Calificaciones de la Prueba Teórica del COSEVI, San Carlos (Trabajo académico clase 4).
const COSEVI = [
  57, 84, 68, 57, 73, 64, 29, 65, 65, 54, 70, 87, 47, 80, 59, 60, 63, 36, 99, 50, 62, 82, 62, 85, 51,
  76, 77, 37, 80, 70, 70, 57, 42, 59, 61, 62, 73, 72, 70, 59, 55, 61, 65, 66, 76, 94, 51, 64, 80, 82,
];

test("la regla de Sturges da 7 clases para 40 a 50 datos", () => {
  assert.equal(clasesSturges(40), 7);
  assert.equal(clasesSturges(50), 7);
  assert.equal(clasesSturges(1), 1);
});

test("arma las 7 clases del COSEVI con amplitud que cubre el máximo", () => {
  const { k, rango, amplitud, clases } = crearClases(COSEVI, 7);
  assert.equal(k, 7);
  assert.equal(rango, 70);
  assert.equal(amplitud, 11);
  assert.deepEqual(
    clases.map((c) => c.etiqueta),
    ["29–39", "40–50", "51–61", "62–72", "73–83", "84–94", "95–105"],
  );
});

test("calcula límites reales y puntos medios", () => {
  const [primera, segunda] = crearClases(COSEVI, 7).clases;
  assert.equal(primera.limiteRealInferior, 28.5);
  assert.equal(primera.limiteRealSuperior, 39.5);
  assert.equal(primera.puntoMedio, 34);
  assert.equal(segunda.puntoMedio, 45);
});

test("cuenta frecuencias y acumuladas «menos de» y «más de» como en la tabla del curso", () => {
  const { filas } = distribuirFrecuencias(COSEVI, 7);
  assert.deepEqual(filas.map((f) => f.frecuencia), [3, 3, 13, 16, 10, 4, 1]);
  assert.deepEqual(filas.map((f) => f.acumuladaMenos), [3, 6, 19, 35, 45, 49, 50]);
  assert.deepEqual(filas.map((f) => f.acumuladaMas), [50, 47, 44, 31, 15, 5, 1]);
  assert.equal(filas[2].relativa, 13 / 50);
  assert.equal(filas.at(-1).relativaMenos, 1);
});

test("trabaja con decimales sin errores de redondeo", () => {
  const promedios = [1, 1.33, 2.67, 3, 3.33, 4.67, 5, 2.33, 3.67, 4];
  const { clases, filas, decimales } = distribuirFrecuencias(promedios);
  assert.equal(decimales, 2);
  assert.equal(filas.reduce((total, f) => total + f.frecuencia, 0), promedios.length);
  assert.equal(clases[0].limiteRealInferior, 0.995);
  assert.match(clases[0].etiqueta, /^1,00–/);
});

test("una submuestra se cuenta sobre las clases de todos los datos", () => {
  const distribucion = crearClases(COSEVI, 7);
  const filas = tabularFrecuencias([29, 99, 60], distribucion);
  assert.deepEqual(filas.map((f) => f.frecuencia), [1, 0, 1, 0, 0, 0, 1]);
  assert.equal(indiceDeClase(200, distribucion), 6);
});

test("datos todos iguales forman clases válidas", () => {
  const { filas } = distribuirFrecuencias([5, 5, 5], 3);
  assert.equal(filas[0].frecuencia, 3);
});
