/* Aviso cuando el CSV parece contener identificadores personales. */
(function (raiz) {
  "use strict";

  const { normalizar } = raiz.Graficadora.tipos;

  // El formulario del proyecto no pide estos datos; si aparecen, el CSV no está depurado.
  const PALABRAS_IDENTIFICADORAS = [
    "nombre",
    "apellido",
    "correo",
    "email",
    "e-mail",
    "cedula",
    "carne",
    "carnet",
    "telefono",
    "celular",
    "direccion de correo",
  ];

  /** Columnas cuyo encabezado sugiere un dato que identifica a una persona. */
  function columnasIdentificadoras(columnas) {
    return columnas.filter((columna) => {
      const texto = normalizar(columna);
      return PALABRAS_IDENTIFICADORAS.some((palabra) => new RegExp(`\\b${palabra}\\b`).test(texto));
    });
  }

  raiz.Graficadora.privacidad = { columnasIdentificadoras };
})(globalThis);
