import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import "../js/csv.js";

const { leerCSV, ErrorCSV, detectarSeparador } = globalThis.Graficadora.csv;
const leerDatos = (nombre) => readFileSync(new URL(`../datos/${nombre}`, import.meta.url), "utf8");

test("lee la encuesta del proyecto", () => {
  const { columnas, filas, avisos } = leerCSV(leerDatos("encuesta_ia.csv"));
  assert.equal(filas.length, 40);
  assert.ok(columnas.includes("¿En qué recinto cursas más asignaturas presenciales?"));
  assert.deepEqual(avisos, []);
});

test("respeta las comas dentro de comillas", () => {
  const { filas } = leerCSV('Finalidad\n"Programar, Resumir"\n');
  assert.equal(filas[0].Finalidad, "Programar, Resumir");
});

test("las celdas vacías quedan como null y no como cero", () => {
  const { filas } = leerCSV("A,B\n1,\n2,3\n");
  assert.equal(filas[0].B, null);
});

test("acepta BOM, CRLF y punto y coma", () => {
  const { columnas, filas } = leerCSV("﻿Recinto;Días\r\nLourdes;3\r\n");
  assert.deepEqual(columnas, ["Recinto", "Días"]);
  assert.equal(filas[0]["Días"], "3");
  assert.equal(detectarSeparador("a;b;c"), ";");
});

test("rechaza archivos vacíos o sin respuestas", () => {
  assert.throws(() => leerCSV("  \n"), ErrorCSV);
  assert.throws(() => leerCSV("Pregunta 1,Pregunta 2\n"), /ninguna respuesta/);
});

test("rechaza comillas sin cerrar", () => {
  assert.throws(() => leerCSV('A\n"sin cerrar\n'), /comillas/);
});

test("renombra encabezados repetidos y descarta columnas vacías", () => {
  const { columnas, avisos } = leerCSV("Edad,Edad,Vacía\n20,30,\n");
  assert.deepEqual(columnas, ["Edad", "Edad (2)"]);
  assert.equal(avisos.length, 1);
});
