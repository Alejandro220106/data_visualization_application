import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import "../js/csv.js";
import "../js/tipos.js";
import "../js/estadisticas.js";
import "../js/lectura.js";

const G = globalThis.Graficadora;
const { describirPregunta, resumir, compararGrupos } = G.estadisticas;
const { explicarResumen, explicarComparacion } = G.lectura;

const encuesta = G.csv.leerCSV(
  readFileSync(new URL("../datos/encuesta_ia.csv", import.meta.url), "utf8"),
);
const RECINTO = "¿En qué recinto cursas más asignaturas presenciales?";

function explicar(valores, grupo) {
  const descripcion = describirPregunta(valores);
  return explicarResumen(descripcion.tipo, resumir(valores, descripcion), grupo).join(" ");
}

test("indica respuestas válidas y la más frecuente", () => {
  const texto = explicar(["Sí", "Sí", "No", null]);
  assert.match(texto, /3 respuestas válidas de 4 participantes/);
  assert.match(texto, /«Sí»: 2 personas de 3/);
});

test("informa omisiones y «No aplica» sin contarlas como cero", () => {
  const texto = explicar(["Siempre", "No aplica", null, "Nunca"]);
  assert.match(texto, /1 persona que no respondió/);
  assert.match(texto, /1 respuesta «No aplica»/);
  assert.match(texto, /no se cuentan como cero/);
});

test("explica que la selección múltiple puede sumar más de 100 %", () => {
  const texto = explicar(["Programar, Resumir", "Programar", "Resumir, Redactar"]);
  assert.match(texto, /más de 100 %/);
  assert.match(texto, /se marcaron 5/);
});

test("reporta empates", () => {
  assert.match(explicar(["A", "B", "A", "B", "C"]), /Empataron/);
});

test("menciona el recinto filtrado", () => {
  assert.match(explicar(["Sí", "No", "Sí"], "Lourdes"), /participantes de Lourdes/);
});

test("siempre recuerda la limitación del estudio", () => {
  assert.match(explicar(["Sí", "No", "Sí"]), /no se generalizan/);
});

test("la comparación explica cada recinto y advierte grupos pequeños", () => {
  const columna = "Verifico las respuestas que recibo";
  const descripcion = describirPregunta(encuesta.filas.map((f) => f[columna]));
  const comparacion = compararGrupos(encuesta.filas, columna, RECINTO, descripcion);
  const texto = explicarComparacion(descripcion.tipo, comparacion).join(" ");
  assert.match(texto, /EcoCampus \(\d+ respuestas válidas\)/);
  assert.match(texto, /Lourdes \(\d+ respuestas válidas\)/);
  assert.match(texto, /dentro de cada recinto/);

  const pequena = {
    grupos: [{ nombre: "Lourdes", resumen: resumir(["Sí", "No"], describirPregunta(["Sí", "No", "Sí"])) }],
    sinGrupo: 2,
  };
  const aviso = explicarComparacion(descripcion.tipo, pequena).join(" ");
  assert.match(aviso, /pocas respuestas/);
  assert.match(aviso, /2 participantes no indicaron recinto/);
});
