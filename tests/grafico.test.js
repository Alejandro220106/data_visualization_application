import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import "../js/csv.js";
import "../js/tipos.js";
import "../js/estadisticas.js";
import "../js/grafico.js";

const G = globalThis.Graficadora;
const { describirPregunta, resumir, compararGrupos } = G.estadisticas;
const {
  configurarGrafico,
  configurarComparacion,
  partirTexto,
  decidirHorizontal,
  evaluarGraficos,
  resolverGrafico,
  notaDelGrafico,
  colorTextoSobre,
  MODOS,
  TIPOS_GRAFICO,
} = G.grafico;
const { TIPOS } = G.tipos;

const encuesta = G.csv.leerCSV(
  readFileSync(new URL("../datos/encuesta_ia.csv", import.meta.url), "utf8"),
);
const RECINTO = "¿En qué recinto cursas más asignaturas presenciales?";
const subtitulo = (config) => [].concat(config.options.plugins.subtitle.text).join(" ");

function configurar(valores, opciones = {}) {
  const descripcion = describirPregunta(valores);
  return configurarGrafico({
    pregunta: "Pregunta",
    tipo: descripcion.tipo,
    resumen: resumir(valores, descripcion),
    ...opciones,
  });
}

function comparar(columna, tipoGrafico) {
  const descripcion = describirPregunta(encuesta.filas.map((f) => f[columna]));
  const comparacion = compararGrupos(encuesta.filas, columna, RECINTO, descripcion);
  return configurarComparacion({ pregunta: columna, tipo: descripcion.tipo, comparacion, tipoGrafico });
}

function disponibles(evaluacion) {
  return evaluacion.filter((e) => e.disponible).map((e) => e.tipoGrafico);
}

test("identifica variable, unidad de medida y número de respuestas válidas", () => {
  const config = configurar(["Sí", "No", "Sí", null]);
  assert.deepEqual(config.options.plugins.title.text, ["Pregunta"]);
  assert.match(subtitulo(config), /n = 3 respuestas válidas de 4 participantes/);
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
  assert.match(subtitulo(config), /Recinto: Lourdes/);
});

test("sugiere barras horizontales para selección múltiple y etiquetas largas", () => {
  assert.equal(decidirHorizontal(TIPOS.MULTIRESPUESTA, ["A"]), true);
  assert.equal(decidirHorizontal(TIPOS.ESCALA, ["1", "2", "3"]), false);
  assert.equal(decidirHorizontal(TIPOS.CATEGORICA, ["Ingeniería Agronómica y forestal"]), true);
});

test("parte los títulos largos sin cortar palabras", () => {
  const lineas = partirTexto("Necesito recurrir a estas herramientas para empezar una tarea académica", 30);
  assert.ok(lineas.every((linea) => linea.length <= 30));
  assert.equal(lineas.join(" "), "Necesito recurrir a estas herramientas para empezar una tarea académica");
});

test("el usuario puede elegir barras verticales u horizontales", () => {
  const verticales = configurar(["Sí", "No", "Sí"], { tipoGrafico: TIPOS_GRAFICO.BARRAS_VERTICALES });
  const horizontales = configurar(["Sí", "No", "Sí"], { tipoGrafico: TIPOS_GRAFICO.BARRAS_HORIZONTALES });
  assert.equal(verticales.options.indexAxis, "x");
  assert.equal(horizontales.options.indexAxis, "y");
  assert.equal(horizontales.options.scales.x.title.text, "Cantidad de personas");
});

test("todos los tipos están disponibles para una escala de 1 a 5", () => {
  const evaluacion = evaluarGraficos({ tipo: TIPOS.ESCALA, categorias: ["1", "2", "3", "4", "5"] });
  assert.deepEqual(disponibles(evaluacion), Object.values(TIPOS_GRAFICO));
});

test("el circular no se ofrece en selección múltiple, comparación ni con muchas categorías", () => {
  const categorias = ["A", "B", "C"];
  const multiple = evaluarGraficos({ tipo: TIPOS.MULTIRESPUESTA, categorias });
  assert.ok(!disponibles(multiple).includes(TIPOS_GRAFICO.CIRCULAR));
  assert.match(multiple.find((e) => e.tipoGrafico === TIPOS_GRAFICO.CIRCULAR).razon, /más de 100 %/);

  const comparando = evaluarGraficos({ tipo: TIPOS.CATEGORICA, categorias, comparar: true });
  assert.ok(!disponibles(comparando).includes(TIPOS_GRAFICO.CIRCULAR));
  assert.ok(disponibles(comparando).includes(TIPOS_GRAFICO.ARANA));

  const muchas = evaluarGraficos({ tipo: TIPOS.CATEGORICA, categorias: "ABCDEFGH".split("") });
  assert.ok(!disponibles(muchas).includes(TIPOS_GRAFICO.CIRCULAR));
});

test("la araña necesita al menos tres categorías y no se usa con intervalos numéricos", () => {
  const dos = evaluarGraficos({ tipo: TIPOS.CATEGORICA, categorias: ["Sí", "No"] });
  assert.match(dos.find((e) => e.tipoGrafico === TIPOS_GRAFICO.ARANA).razon, /al menos 3/);
  const numerica = evaluarGraficos({ tipo: TIPOS.NUMERICA, categorias: ["18–20", "21–23", "24–26"] });
  assert.deepEqual(disponibles(numerica), [TIPOS_GRAFICO.BARRAS_VERTICALES, TIPOS_GRAFICO.BARRAS_HORIZONTALES]);
});

test("si el gráfico elegido no está disponible se usa el sugerido", () => {
  const evaluacion = evaluarGraficos({ tipo: TIPOS.MULTIRESPUESTA, categorias: ["A", "B", "C"] });
  assert.equal(resolverGrafico(TIPOS_GRAFICO.CIRCULAR, evaluacion, TIPOS_GRAFICO.BARRAS_HORIZONTALES), TIPOS_GRAFICO.BARRAS_HORIZONTALES);
  assert.equal(resolverGrafico(TIPOS_GRAFICO.ARANA, evaluacion, TIPOS_GRAFICO.BARRAS_HORIZONTALES), TIPOS_GRAFICO.ARANA);
  assert.equal(resolverGrafico(null, evaluacion, TIPOS_GRAFICO.BARRAS_VERTICALES), TIPOS_GRAFICO.BARRAS_VERTICALES);
});

test("cada tipo de gráfico explica por qué se usó", () => {
  assert.match(notaDelGrafico(TIPOS_GRAFICO.CIRCULAR, { tipo: TIPOS.CATEGORICA }), /total = 100 %/);
  assert.match(notaDelGrafico(TIPOS_GRAFICO.BARRAS_HORIZONTALES, { tipo: TIPOS.MULTIRESPUESTA }), /ranking/);
  assert.match(notaDelGrafico(TIPOS_GRAFICO.BARRAS_VERTICALES, { tipo: TIPOS.ESCALA }), /de menor a mayor/);
  assert.match(notaDelGrafico(TIPOS_GRAFICO.ARANA, { tipo: TIPOS.ESCALA, comparar: true }), /recintos/);
});

test("el circular reparte el total con colores y etiquetas legibles", () => {
  const config = configurar(["EcoCampus", "Lourdes", "EcoCampus", "EcoCampus"], { tipoGrafico: TIPOS_GRAFICO.CIRCULAR });
  assert.equal(config.type, "pie");
  assert.deepEqual(config.data.labels, ["EcoCampus", "Lourdes"]);
  assert.deepEqual(config.data.datasets[0].data, [3, 1]);
  assert.equal(config.data.datasets[0].backgroundColor.length, 2);
  assert.equal(config.data.datasets[0].colorEtiquetas.length, 2);
  assert.equal(config.options.plugins.legend.display, true);
  assert.match(subtitulo(config), /total = 100 %/);
});

test("el circular de una escala usa colores que se oscurecen con el nivel", () => {
  const config = configurar(["1", "2", "3", "4", "5", "5"], { tipoGrafico: TIPOS_GRAFICO.CIRCULAR });
  const colores = config.data.datasets[0].backgroundColor;
  assert.equal(new Set(colores).size, 5);
  assert.equal(colorTextoSobre(colores[0]), "#111827");
  assert.equal(colorTextoSobre(colores.at(-1)), "#ffffff");
});

test("la araña muestra una serie con la escala radial explicada", () => {
  const config = configurar(["A", "B", "C", "A"], { tipoGrafico: TIPOS_GRAFICO.ARANA, modo: MODOS.PORCENTAJE });
  assert.equal(config.type, "radar");
  assert.deepEqual(config.data.datasets[0].data, [50, 25, 25]);
  assert.equal(config.options.scales.r.beginAtZero, true);
  assert.match(subtitulo(config), /Distancia al centro: porcentaje/);
});

test("la comparación en barras tiene una serie por recinto con su n", () => {
  const config = comparar("Intento resolver la actividad por mi cuenta antes de consultar");
  assert.equal(config.type, "bar");
  assert.equal(config.data.datasets.length, 2);
  assert.match(config.data.datasets[0].label, /^EcoCampus \(n = \d+\)$/);
  assert.equal(config.options.plugins.legend.display, true);
  assert.match(subtitulo(config), /Porcentaje dentro de cada recinto/);
  assert.notEqual(config.data.datasets[0].backgroundColor, config.data.datasets[1].backgroundColor);
});

test("la comparación en araña dibuja un polígono por recinto", () => {
  const config = comparar("Verifico las respuestas que recibo", TIPOS_GRAFICO.ARANA);
  assert.equal(config.type, "radar");
  assert.equal(config.data.datasets.length, 2);
  assert.notEqual(config.data.datasets[0].borderColor, config.data.datasets[1].borderColor);
  assert.equal(config.options.plugins.legend.display, true);
  assert.ok(config.options.scales.r.suggestedMax <= 100);
});

test("explica cómo leer cada tipo de gráfico", () => {
  const { comoLeerGrafico } = G.grafico;
  assert.match(comoLeerGrafico(TIPOS_GRAFICO.CIRCULAR, { tipo: TIPOS.CATEGORICA }), /sector/);
  assert.match(comoLeerGrafico(TIPOS_GRAFICO.ARANA, { tipo: TIPOS.ESCALA }), /eje/);
  assert.match(comoLeerGrafico(TIPOS_GRAFICO.ARANA, { tipo: TIPOS.ESCALA, comparar: true }), /polígono/);
  assert.match(comoLeerGrafico(TIPOS_GRAFICO.BARRAS_HORIZONTALES, { tipo: TIPOS.MULTIRESPUESTA }), /^La longitud/);
  assert.match(comoLeerGrafico(TIPOS_GRAFICO.BARRAS_VERTICALES, { tipo: TIPOS.CATEGORICA, comparar: true }), /cada color es un recinto/);
});
