import assert from "node:assert/strict";
import { test } from "node:test";

import "../js/tema.js";

const { TEMAS, contraste, colorTextoSobre } = globalThis.Graficadora.tema;

test("calcula la razón de contraste de WCAG", () => {
  assert.equal(Math.round(contraste("#ffffff", "#000000")), 21);
  assert.equal(contraste("#2563eb", "#2563eb"), 1);
});

for (const tema of Object.values(TEMAS)) {
  test(`tema ${tema.nombre}: el texto cumple AA y las series se ven contra el fondo`, () => {
    assert.ok(contraste(tema.texto, tema.fondo) >= 4.5);
    assert.ok(contraste(tema.secundario, tema.fondo) >= 4.5);
    assert.ok(contraste(tema.principal, tema.fondo) >= 3);
    for (const color of tema.grupos.slice(0, 2)) assert.ok(contraste(color, tema.fondo) >= 3, color);
  });
}

test("en el tema oscuro los niveles de escala usados contrastan con el fondo", () => {
  const { escala, fondo } = TEMAS.oscuro;
  for (const color of escala.slice(1)) assert.ok(contraste(color, fondo) >= 3, color);
});

test("elige texto negro sobre colores claros y blanco sobre oscuros", () => {
  assert.equal(colorTextoSobre("#dbeafe"), "#111827");
  assert.equal(colorTextoSobre("#1e3a8a"), "#ffffff");
});
