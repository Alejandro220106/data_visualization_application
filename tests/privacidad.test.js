import assert from "node:assert/strict";
import { test } from "node:test";

import "../js/tipos.js";
import "../js/privacidad.js";

const { columnasIdentificadoras } = globalThis.Graficadora.privacidad;

test("detecta encabezados de identificadores personales", () => {
  const columnas = ["Dirección de correo electrónico", "Nombre completo", "Cédula", "Carrera"];
  assert.deepEqual(columnasIdentificadoras(columnas), [
    "Dirección de correo electrónico",
    "Nombre completo",
    "Cédula",
  ]);
});

test("no confunde preguntas del formulario con identificadores", () => {
  const columnas = [
    "¿En qué recinto cursas más asignaturas presenciales?",
    "Nivel académico",
    "Reviso o modifico el contenido antes de utilizarlo",
  ];
  assert.deepEqual(columnasIdentificadoras(columnas), []);
});
