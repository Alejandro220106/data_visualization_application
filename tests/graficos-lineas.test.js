import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import "../js/csv.js";
import "../js/tipos.js";
import "../js/distribucion.js";
import "../js/estadisticas.js";
import "../js/tema.js";
import "../js/grafico.js";
import "../js/graficos/lineas.js";

const G = globalThis.Graficadora;
const { describirPregunta, resumir, compararGrupos } = G.estadisticas;
const { configurarGrafico, configurarComparacion, evaluarGraficos, graficoSugerido, TIPOS_GRAFICO } = G.grafico;
const { TIPOS } = G.tipos;

const encuesta = G.csv.leerCSV(readFileSync(new URL("./datos/encuesta_ia.csv", import.meta.url), "utf8"));
const RECINTO = "¿En qué recinto cursas más asignaturas presenciales?";

const razon = (evaluacion, id) => evaluacion.find((e) => e.tipoGrafico === id).razon;

function configurar(valores, tipoGrafico) {
  const descripcion = describirPregunta(valores);
  return configurarGrafico({ pregunta: "Pregunta", tipo: descripcion.tipo, resumen: resumir(valores, descripcion), tipoGrafico });
}

test("las líneas solo se ofrecen para datos con orden", () => {
  const nominal = evaluarGraficos({ tipo: TIPOS.CATEGORICA, categorias: ["Turismo", "Contabilidad", "TI"] });
  assert.match(razon(nominal, TIPOS_GRAFICO.LINEAS), /orden natural/);
  const escala = evaluarGraficos({ tipo: TIPOS.ESCALA, categorias: ["1", "2", "3"] });
  assert.equal(razon(escala, TIPOS_GRAFICO.LINEAS), null);
  const numerica = evaluarGraficos({ tipo: TIPOS.NUMERICA, categorias: ["1–2", "3–4"] }); // las líneas también sirven para clases numéricas
  assert.equal(razon(numerica, TIPOS_GRAFICO.LINEAS), null);
});

test("la serie cronológica sugiere líneas y rotula el eje de fechas", () => {
  assert.equal(graficoSugerido(TIPOS.CRONOLOGICA, ["13/10/2026", "14/10/2026"]), TIPOS_GRAFICO.LINEAS);
  const config = configurar(["2026/10/13 9:00", "2026/10/13 10:00", "2026/10/15 9:30"]);
  assert.equal(config.type, "line");
  assert.deepEqual(config.data.datasets[0].data, [2, 0, 1]);
  assert.equal(config.options.scales.x.title.text, "Fecha de respuesta");
});

test("la comparación traza una línea por recinto sin etiquetas que se encimen", () => {
  const columna = "Intento resolver la actividad por mi cuenta antes de consultar";
  const descripcion = describirPregunta(encuesta.filas.map((f) => f[columna]));
  const comparacion = compararGrupos(encuesta.filas, columna, RECINTO, descripcion);
  const config = configurarComparacion({ pregunta: columna, tipo: descripcion.tipo, comparacion, tipoGrafico: TIPOS_GRAFICO.LINEAS });
  assert.equal(config.data.datasets.length, 2);
  assert.ok(config.data.datasets.every((d) => !d.etiquetas));
  assert.equal(config.options.plugins.legend.display, true);
});

test("solo quedan los 5 tipos pedidos", () => {
  assert.deepEqual(Object.values(TIPOS_GRAFICO).sort(), ["arana", "barras-horizontales", "barras-verticales", "circular", "lineas"]);
});
