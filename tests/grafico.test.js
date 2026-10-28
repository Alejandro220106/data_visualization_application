import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import "../js/csv.js";
import "../js/tipos.js";
import "../js/estadisticas.js";
import "../js/grafico.js";

const G = globalThis.Graficadora;
const { describirPregunta, resumir, compararGrupos } = G.estadisticas;
const { configurarGrafico, configurarComparacion, partirTexto, decidirHorizontal, MODOS } = G.grafico;
const { TIPOS } = G.tipos;

const encuesta = G.csv.leerCSV(
  readFileSync(new URL("../datos/encuesta_ia.csv", import.meta.url), "utf8"),
);
const RECINTO = "¿En qué recinto cursas más asignaturas presenciales?";

function configurar(valores, opciones = {}) {
  const descripcion = describirPregunta(valores);
  return configurarGrafico({
    pregunta: "Pregunta",
    tipo: descripcion.tipo,
    resumen: resumir(valores, descripcion),
    ...opciones,
  });
}

test("identifica variable, unidad de medida y número de respuestas válidas", () => {
  const config = configurar(["Sí", "No", "Sí", null]);
  assert.deepEqual(config.options.plugins.title.text, ["Pregunta"]);
  assert.match(config.options.plugins.subtitle.text, /n = 3 respuestas válidas de 4 participantes/);
  assert.equal(config.options.scales.y.title.text, "Cantidad de personas");
  assert.deepEqual(config.data.datasets[0].data, [2, 1]);
});

test("el modo porcentaje usa el porcentaje como valor y lo indica en el eje", () => {
  const config = configurar(["Sí", "No", "Sí"], { modo: MODOS.PORCENTAJE });
  assert.deepEqual(config.data.datasets[0].data, [66.7, 33.3]);
  assert.equal(config.options.scales.y.title.text, "Porcentaje de respuestas válidas (%)");
});

test("cada barra lleva su etiqueta con cantidad y porcentaje", () => {
  const config = configurar(["Sí", "No", "Sí"]);
  assert.deepEqual(config.data.datasets[0].etiquetas, ["2 (66,7 %)", "1 (33,3 %)"]);
});

test("indica el recinto filtrado en el subtítulo", () => {
  const config = configurar(["Sí", "No", "Sí"], { grupo: "Lourdes" });
  assert.match(config.options.plugins.subtitle.text, /Recinto: Lourdes/);
});

test("selección múltiple se dibuja en barras horizontales", () => {
  assert.equal(decidirHorizontal(TIPOS.MULTIRESPUESTA, ["A"]), true);
  assert.equal(decidirHorizontal(TIPOS.ESCALA, ["1", "2", "3"]), false);
  assert.equal(decidirHorizontal(TIPOS.CATEGORICA, ["Ingeniería Agronómica y forestal"]), true);
});

test("parte los títulos largos sin cortar palabras", () => {
  const lineas = partirTexto("Necesito recurrir a estas herramientas para empezar una tarea académica", 30);
  assert.ok(lineas.every((linea) => linea.length <= 30));
  assert.equal(lineas.join(" "), "Necesito recurrir a estas herramientas para empezar una tarea académica");
});

test("la comparación tiene una serie por recinto con su n en la leyenda", () => {
  const columna = "Intento resolver la actividad por mi cuenta antes de consultar";
  const descripcion = describirPregunta(encuesta.filas.map((f) => f[columna]));
  const comparacion = compararGrupos(encuesta.filas, columna, RECINTO, descripcion);
  const config = configurarComparacion({ pregunta: columna, tipo: descripcion.tipo, comparacion });
  assert.equal(config.data.datasets.length, 2);
  assert.match(config.data.datasets[0].label, /^EcoCampus \(n = \d+\)$/);
  assert.equal(config.options.plugins.legend.display, true);
  assert.match(config.options.plugins.subtitle.text, /Porcentaje dentro de cada recinto/);
  assert.notEqual(config.data.datasets[0].backgroundColor, config.data.datasets[1].backgroundColor);
});
