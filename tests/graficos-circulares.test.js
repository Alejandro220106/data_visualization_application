import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import "../js/csv.js";
import "../js/tipos.js";
import "../js/distribucion.js";
import "../js/estadisticas.js";
import "../js/tema.js";
import "../js/grafico.js";
import "../js/graficos/circulares.js";

const G = globalThis.Graficadora;
const { describirPregunta, resumir, compararGrupos } = G.estadisticas;
const { configurarGrafico, configurarComparacion, evaluarGraficos, TIPOS_GRAFICO } = G.grafico;
const { TIPOS } = G.tipos;

const encuesta = G.csv.leerCSV(readFileSync(new URL("../datos/encuesta_ia.csv", import.meta.url), "utf8"));
const RECINTO = "¿En qué recinto cursas más asignaturas presenciales?";

function disponible(evaluacion, id) {
  return evaluacion.find((e) => e.tipoGrafico === id);
}

function configurar(valores, tipoGrafico) {
  const descripcion = describirPregunta(valores);
  return configurarGrafico({ pregunta: "Pregunta", tipo: descripcion.tipo, resumen: resumir(valores, descripcion), tipoGrafico });
}

test("anillo y semicírculo siguen las reglas del circular", () => {
  const escala = evaluarGraficos({ tipo: TIPOS.ESCALA, categorias: ["1", "2", "3"] });
  assert.ok(disponible(escala, TIPOS_GRAFICO.ANILLO).disponible);
  assert.ok(disponible(escala, TIPOS_GRAFICO.SEMICIRCULO).disponible);
  const multiple = evaluarGraficos({ tipo: TIPOS.MULTIRESPUESTA, categorias: ["A", "B", "C"] });
  assert.match(disponible(multiple, TIPOS_GRAFICO.ANILLO).razon, /más de 100 %/);
  assert.match(disponible(multiple, TIPOS_GRAFICO.SEMICIRCULO).razon, /más de 100 %/);
});

test("los anillos concéntricos solo se ofrecen al comparar recintos", () => {
  const simple = evaluarGraficos({ tipo: TIPOS.ESCALA, categorias: ["1", "2", "3"] });
  assert.match(disponible(simple, TIPOS_GRAFICO.ANILLOS_CONCENTRICOS).razon, /Comparar recintos/);
  const comparando = evaluarGraficos({ tipo: TIPOS.ESCALA, categorias: ["1", "2", "3"], comparar: true, grupos: 2 });
  assert.ok(disponible(comparando, TIPOS_GRAFICO.ANILLOS_CONCENTRICOS).disponible);
  assert.ok(!disponible(comparando, TIPOS_GRAFICO.ANILLO).disponible);
});

test("el anillo es un doughnut con el número de respuestas válidas en el centro", () => {
  const config = configurar(["Sí", "No", "Sí", null], TIPOS_GRAFICO.ANILLO);
  assert.equal(config.type, "doughnut");
  assert.equal(config.options.cutout, "55%");
  assert.equal(config.options.plugins.etiquetasValor.centro, "n = 3");
});

test("el semicírculo dibuja medio círculo", () => {
  const config = configurar(["Sí", "No", "Sí"], TIPOS_GRAFICO.SEMICIRCULO);
  assert.equal(config.options.circumference, 180);
  assert.equal(config.options.rotation, -90);
  assert.equal(config.options.plugins.legend.position, "bottom");
});

test("los anillos concéntricos tienen un anillo por recinto que suma su propio total", () => {
  const columna = "Verifico las respuestas que recibo";
  const descripcion = describirPregunta(encuesta.filas.map((f) => f[columna]));
  const comparacion = compararGrupos(encuesta.filas, columna, RECINTO, descripcion);
  const config = configurarComparacion({
    pregunta: columna,
    tipo: descripcion.tipo,
    comparacion,
    tipoGrafico: TIPOS_GRAFICO.ANILLOS_CONCENTRICOS,
  });
  assert.equal(config.type, "doughnut");
  assert.equal(config.data.datasets.length, 2);
  config.data.datasets.forEach((dataset, i) => {
    const suma = dataset.data.reduce((t, x) => t + x, 0);
    assert.equal(suma, comparacion.grupos[i].resumen.personas);
  });
  const subtitulo = [].concat(config.options.plugins.subtitle.text).join(" ");
  assert.match(subtitulo, /Anillo exterior: EcoCampus · interior: Lourdes/);
});
