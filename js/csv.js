/* Lectura y validación del CSV exportado desde Google Forms / Google Sheets. */
(function (raiz) {
  "use strict";

  class ErrorCSV extends Error {}

  /** Elige entre coma y punto y coma según cuál aparece más en la fila de encabezados. */
  function detectarSeparador(texto) {
    const primeraLinea = texto.split(/\r?\n/, 1)[0];
    const contar = (caracter) => primeraLinea.split(caracter).length - 1;
    return contar(";") > contar(",") ? ";" : ",";
  }

  /** Divide el texto en filas y campos respetando las comillas (RFC 4180). */
  function dividirFilas(texto, separador) {
    const filas = [];
    let fila = [];
    let campo = "";
    let entreComillas = false;

    for (let i = 0; i < texto.length; i++) {
      const caracter = texto[i];
      if (entreComillas) {
        if (caracter === '"' && texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else if (caracter === '"') {
          entreComillas = false;
        } else {
          campo += caracter;
        }
      } else if (caracter === '"') {
        entreComillas = true;
      } else if (caracter === separador) {
        fila.push(campo);
        campo = "";
      } else if (caracter === "\n" || caracter === "\r") {
        if (caracter === "\r" && texto[i + 1] === "\n") i++;
        fila.push(campo);
        filas.push(fila);
        fila = [];
        campo = "";
      } else {
        campo += caracter;
      }
    }
    if (entreComillas) {
      throw new ErrorCSV("El archivo tiene comillas sin cerrar. Descárgalo de nuevo desde Google Sheets.");
    }
    if (campo !== "" || fila.length > 0) {
      fila.push(campo);
      filas.push(fila);
    }
    return filas;
  }

  /** Agrega un sufijo a los encabezados vacíos o repetidos y devuelve avisos. */
  function normalizarEncabezados(encabezados) {
    const vistos = new Map();
    const avisos = [];
    const nombres = encabezados.map((original, posicion) => {
      let nombre = original.trim() || `Columna ${posicion + 1}`;
      if (vistos.has(nombre)) {
        const repeticion = vistos.get(nombre) + 1;
        vistos.set(nombre, repeticion);
        const nuevo = `${nombre} (${repeticion})`;
        avisos.push(`La columna «${nombre}» estaba repetida y se renombró como «${nuevo}».`);
        nombre = nuevo;
      } else {
        vistos.set(nombre, 1);
      }
      return nombre;
    });
    return { nombres, avisos };
  }

  /**
   * Convierte el texto del CSV en { columnas, filas, avisos }.
   * Cada fila es un objeto { columna: valor }; las celdas vacías quedan como null
   * (nunca como cero) y se descartan las filas y columnas completamente vacías.
   */
  function leerCSV(texto) {
    const limpio = (texto || "").replace(/^﻿/, "");
    if (!limpio.trim()) throw new ErrorCSV("El archivo está vacío.");

    const separador = detectarSeparador(limpio);
    const [encabezados, ...registros] = dividirFilas(limpio, separador);
    const { nombres, avisos } = normalizarEncabezados(encabezados);

    let filas = registros
      .map((registro) => {
        const fila = {};
        nombres.forEach((nombre, i) => {
          const valor = (registro[i] ?? "").trim();
          fila[nombre] = valor === "" ? null : valor;
        });
        return fila;
      })
      .filter((fila) => Object.values(fila).some((valor) => valor !== null));

    if (filas.length === 0) {
      throw new ErrorCSV("El archivo tiene encabezados, pero ninguna respuesta.");
    }

    const columnas = nombres.filter((nombre) => filas.some((fila) => fila[nombre] !== null));
    filas = filas.map((fila) => Object.fromEntries(columnas.map((c) => [c, fila[c]])));
    return { columnas, filas, avisos };
  }

  raiz.Graficadora = raiz.Graficadora || {};
  raiz.Graficadora.csv = { ErrorCSV, leerCSV, detectarSeparador };
})(globalThis);
