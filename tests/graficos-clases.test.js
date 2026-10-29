import assert from "node:assert/strict";
import { test } from "node:test";

import "../js/tipos.js";
import "../js/distribucion.js";
import "../js/estadisticas.js";
import "../js/tema.js";
import "../js/grafico.js";
import "../js/graficos/clases.js";

const G = globalThis.Graficadora;
const { describirPregunta, resumir } = G.estadisticas;
const { configurarGrafico, evaluarGraficos, graficoSugerido, comoLeerGrafico, TIPOS_GRAFICO, MODOS } = G.grafico;
const { TIPOS } = G.tipos;

// Calificaciones de la Prueba Teórica del COSEVI, San Carlos (Trabajo académico clase 4).
const COSEVI = [
  57, 84, 68, 57, 73, 64, 29, 65, 65, 54, 70, 87, 47, 80, 59, 60, 63, 36, 99, 50, 62, 82, 62, 85, 51,
  76, 77, 37, 80, 70, 70, 57, 42, 59, 61, 62, 73, 72, 70, 59, 55, 61, 65, 66, 76, 94, 51, 64, 80, 82,
].map(String);

const descripcion = describirPregunta(COSEVI);
const resumen = resumir(COSEVI, descripcion);

function configurar(tipoGrafico, modo) {
  return configurarGrafico({ pregunta: "Calificación COSEVI", tipo: descripcion.tipo, resumen, tipoGrafico, modo });
}

test("histograma, polígono y ojivas solo para variables numéricas y sin comparar", () => {
  const escala = evaluarGraficos({ tipo: TIPOS.ESCALA, categorias: ["1", "2", "3"] });
  assert.ok(!escala.find((e) => e.tipoGrafico === TIPOS_GRAFICO.HISTOGRAMA).disponible);
  const comparando = evaluarGraficos({ tipo: TIPOS.NUMERICA, categorias: ["a", "b"], comparar: true });
  assert.match(comparando.find((e) => e.tipoGrafico === TIPOS_GRAFICO.OJIVAS).razon, /un solo grupo/);
  assert.equal(graficoSugerido(TIPOS.NUMERICA, ["a", "b"]), TIPOS_GRAFICO.HISTOGRAMA);
});

test("el histograma tiene barras contiguas con las frecuencias de cada clase", () => {
  const config = configurar(TIPOS_GRAFICO.HISTOGRAMA);
  const [dataset] = config.data.datasets;
  assert.deepEqual(dataset.data, [3, 3, 13, 16, 10, 4, 1]);
  assert.equal(dataset.barPercentage, 1);
  assert.equal(dataset.categoryPercentage, 1);
  assert.equal(config.options.scales.x.title.text, "Clases (límites indicados)");
  assert.match([].concat(config.options.plugins.subtitle.text).join(" "), /k = 7 clases de amplitud 11/);
});

test("el polígono une los puntos medios y se cierra en cero", () => {
  const { data } = configurar(TIPOS_GRAFICO.POLIGONO).data.datasets[0];
  assert.deepEqual(data.map((p) => p.x), [23, 34, 45, 56, 67, 78, 89, 100, 111]);
  assert.equal(data[0].y, 0);
  assert.equal(data.at(-1).y, 0);
  assert.equal(data[4].y, 16);
});

test("las ojivas acumulan «menos de» y «más de» sobre los límites reales", () => {
  const [menos, mas] = configurar(TIPOS_GRAFICO.OJIVAS).data.datasets;
  assert.deepEqual(menos.data.map((p) => p.y), [0, 3, 6, 19, 35, 45, 49, 50]);
  assert.deepEqual(menos.data.map((p) => p.x).slice(0, 2), [28.5, 39.5]);
  assert.deepEqual(mas.data.map((p) => p.y), [50, 47, 44, 31, 15, 5, 1, 0]);
});

test("en porcentaje las ojivas llegan al 100 %", () => {
  const [menos] = configurar(TIPOS_GRAFICO.OJIVAS, MODOS.PORCENTAJE).data.datasets;
  assert.equal(menos.data.at(-1).y, 100);
});

test("la lectura de las ojivas indica dónde se cruzan (la mediana agrupada)", () => {
  const texto = comoLeerGrafico(TIPOS_GRAFICO.OJIVAS, { tipo: TIPOS.NUMERICA, resumen });
  assert.ok(texto.includes("x ≈ 65,63"));
});
