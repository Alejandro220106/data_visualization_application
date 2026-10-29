import assert from "node:assert/strict";
import { test } from "node:test";

import "../js/tipos.js";
import "../js/distribucion.js";
import "../js/estadisticas.js";
import "../js/tema.js";
import "../js/grafico.js";
import "../js/graficos/pictograma.js";

const G = globalThis.Graficadora;
const { unidadPictograma, figurasDeFila, disenarPictograma, MAX_FIGURAS } = G.pictograma;
const { evaluarGraficos, tieneDibujoPropio, TIPOS_GRAFICO } = G.grafico;
const { TIPOS } = G.tipos;

test("cada figura vale lo necesario para que ninguna fila pase de 20 figuras", () => {
  assert.equal(unidadPictograma(12), 1);
  assert.equal(unidadPictograma(20), 1);
  assert.equal(unidadPictograma(21), 2);
  assert.equal(unidadPictograma(73), 5);
  assert.ok(Math.ceil(1234 / unidadPictograma(1234)) <= MAX_FIGURAS);
});

test("la última figura de una fila puede quedar incompleta", () => {
  assert.deepEqual(figurasDeFila(7, 2), { completas: 3, fraccion: 0.5 });
  assert.deepEqual(figurasDeFila(10, 5), { completas: 2, fraccion: 0 });
});

test("las figuras caben en el ancho disponible, también en un teléfono", () => {
  const frecuencias = [
    { categoria: "EcoCampus", cantidad: 20, porcentaje: 57.1 },
    { categoria: "Lourdes", cantidad: 15, porcentaje: 42.9 },
  ];
  for (const ancho of [375, 1000]) {
    const diseno = disenarPictograma({ frecuencias, ancho, alto: 300, titulo: "Recinto", subtitulo: "n = 35" });
    const borde = diseno.xFiguras + diseno.filas[0].completas * diseno.tamano;
    assert.ok(borde + 104 <= ancho, `ancho ${ancho}`);
    assert.ok(diseno.filas[1].y > diseno.filas[0].y);
  }
});

test("el pictograma se dibuja con su propia función y no se ofrece para comparar ni para numéricas", () => {
  assert.equal(tieneDibujoPropio(TIPOS_GRAFICO.PICTOGRAMA), true);
  const comparando = evaluarGraficos({ tipo: TIPOS.CATEGORICA, categorias: ["A", "B"], comparar: true });
  assert.ok(!comparando.find((e) => e.tipoGrafico === TIPOS_GRAFICO.PICTOGRAMA).disponible);
  const numerica = evaluarGraficos({ tipo: TIPOS.NUMERICA, categorias: ["1–5", "6–10"] });
  assert.match(numerica.find((e) => e.tipoGrafico === TIPOS_GRAFICO.PICTOGRAMA).razon, /histograma/);
  const muchas = evaluarGraficos({ tipo: TIPOS.CATEGORICA, categorias: "ABCDEFGHIJK".split("") });
  assert.ok(!muchas.find((e) => e.tipoGrafico === TIPOS_GRAFICO.PICTOGRAMA).disponible);
});
