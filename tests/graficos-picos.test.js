import assert from "node:assert/strict";
import { test } from "node:test";

import "../js/tipos.js";
import "../js/distribucion.js";
import "../js/estadisticas.js";
import "../js/tema.js";
import "../js/grafico.js";
import "../js/graficos/picos.js";

const G = globalThis.Graficadora;
const { describirPregunta, resumir } = G.estadisticas;
const { configurarGrafico, evaluarGraficos, TIPOS_GRAFICO } = G.grafico;
const { TIPOS } = G.tipos;

test("los picos están disponibles como las barras", () => {
  for (const tipo of [TIPOS.CATEGORICA, TIPOS.MULTIRESPUESTA, TIPOS.ESCALA]) {
    const evaluacion = evaluarGraficos({ tipo, categorias: ["A", "B"] });
    assert.ok(evaluacion.find((e) => e.tipoGrafico === TIPOS_GRAFICO.PICOS).disponible, tipo);
  }
});

test("el pico conserva valores y etiquetas y oculta la barra rectangular", () => {
  const valores = ["Sí", "No", "Sí"];
  const descripcion = describirPregunta(valores);
  const config = configurarGrafico({
    pregunta: "Pregunta",
    tipo: descripcion.tipo,
    resumen: resumir(valores, descripcion),
    tipoGrafico: TIPOS_GRAFICO.PICOS,
  });
  const [dataset] = config.data.datasets;
  assert.deepEqual(dataset.data, [2, 1]);
  assert.equal(dataset.backgroundColor, "transparent");
  assert.equal(dataset.colorPico, G.tema.TEMAS.oscuro.principal);
  assert.deepEqual(config.plugins.map((p) => p.id), ["picos", "etiquetasValor", "fondo"]);
});
