/* Gráficos de sectores del curso: anillo, semicírculo y anillos concéntricos. */
(function (raiz) {
  "use strict";

  const { formatearPorcentaje, formatearNumero } = raiz.Graficadora.estadisticas;
  const { colorTextoSobre } = raiz.Graficadora.tema;
  const { registrarGrafico, piezas } = raiz.Graficadora.grafico;
  const {
    PLUGIN_ETIQUETAS,
    PLUGIN_FONDO,
    razonSectores,
    configurarSectores,
    coloresCategorias,
    opcionesComunes,
    maxCaracteres,
    detallePersonas,
    subtituloComparacion,
  } = piezas;

  // Con más recintos que esto los anillos concéntricos se vuelven confusos.
  const MAX_ANILLOS = 4;
  // En los anillos concéntricos los tramos son más angostos: solo se rotulan los más grandes.
  const PORCENTAJE_MINIMO_ETIQUETA_ANILLOS = 8;

  function alturaSectores({ cantidadCategorias, anchoDisponible }) {
    return anchoDisponible < 640 ? 380 + Math.ceil(cantidadCategorias / 2) * 24 : 440;
  }

  registrarGrafico({
    id: "anillo",
    clave: "ANILLO",
    nombre: "Anillo (dona)",
    orden: 50,
    razonNoDisponible: razonSectores,
    razonComparar: "Un anillo muestra un solo total; para comparar recintos usa anillos concéntricos.",
    nota: () =>
      "Se usó un gráfico de anillo para mostrar la proporción de cada respuesta respecto al total de respuestas válidas; el centro indica cuántas son.",
    comoLeer: () =>
      "Cada tramo del anillo es la proporción de personas que dio esa respuesta; el anillo completo es el 100 % de las respuestas válidas.",
    configurar: (c) =>
      configurarSectores(c, {
        tipo: "doughnut",
        opciones: { cutout: "55%" },
        centro: `n = ${formatearNumero(c.resumen.personas)}`,
      }),
    altura: alturaSectores,
  });

  registrarGrafico({
    id: "semicirculo",
    clave: "SEMICIRCULO",
    nombre: "Semicírculo",
    orden: 55,
    razonNoDisponible: razonSectores,
    razonComparar: "Un semicírculo muestra un solo total; para comparar recintos usa anillos concéntricos.",
    nota: () =>
      "Se usó un semicírculo para mostrar la proporción de cada respuesta en medio círculo, que ocupa menos espacio; el arco completo es el 100 % de las respuestas válidas.",
    comoLeer: () =>
      "Cada tramo del arco es la proporción de personas que dio esa respuesta; el medio círculo completo es el 100 % de las respuestas válidas.",
    configurar: (c) =>
      configurarSectores(c, {
        tipo: "doughnut",
        leyendaAbajo: true,
        opciones: { rotation: -90, circumference: 180, cutout: "50%" },
        centro: `n = ${formatearNumero(c.resumen.personas)}`,
        centroBase: "bottom",
      }),
    altura: ({ cantidadCategorias, anchoDisponible }) =>
      anchoDisponible < 640 ? 300 + Math.ceil(cantidadCategorias / 2) * 24 : 360,
  });

  /** «Anillo exterior: EcoCampus · interior: Lourdes» (el primer recinto queda afuera). */
  function describirAnillos(grupos) {
    if (grupos.length === 2) return `Anillo exterior: ${grupos[0].nombre} · interior: ${grupos[1].nombre}`;
    return `Del anillo exterior al interior: ${grupos.map((g) => g.nombre).join(", ")}`;
  }

  registrarGrafico({
    id: "anillos-concentricos",
    clave: "ANILLOS_CONCENTRICOS",
    nombre: "Anillos concéntricos",
    orden: 60,
    razonNoDisponible: ({ tipo, categorias, comparar, grupos }) => {
      if (!comparar) return "Sirve para comparar recintos: activa «Comparar recintos».";
      if (grupos > MAX_ANILLOS) return `Hay ${grupos} recintos; con más de ${MAX_ANILLOS} los anillos no se distinguen.`;
      return razonSectores({ tipo, categorias });
    },
    nota: () =>
      "Se usaron anillos concéntricos para comparar cómo se reparten las respuestas en cada recinto; cada anillo suma el 100 % de su recinto.",
    comoLeer: () =>
      "Cada anillo es un recinto y suma el 100 % de sus respuestas válidas (el subtítulo indica cuál es cada uno); compara el tamaño de un mismo color entre anillos.",
    configurarComparacion: (c) => {
      const { categorias, grupos } = c.comparacion;
      const colores = coloresCategorias(c.tema, c.tipo, categorias.length);
      const comunes = opcionesComunes({
        tema: c.tema,
        titulo: c.pregunta,
        subtitulo: `${subtituloComparacion(c.comparacion)} · ${describirAnillos(grupos)}`,
        maxCaracteres: maxCaracteres(c.anchoDisponible),
        leyenda: true,
        posicionLeyenda: c.anchoDisponible < 640 ? "bottom" : "right",
      });
      return {
        type: "doughnut",
        data: {
          labels: categorias,
          datasets: grupos.map((grupo) => ({
            label: grupo.nombre,
            data: grupo.resumen.frecuencias.map((f) => f.cantidad),
            backgroundColor: colores,
            borderColor: c.tema.fondo,
            borderWidth: 2,
            etiquetas: grupo.resumen.frecuencias.map((f) =>
              f.porcentaje >= PORCENTAJE_MINIMO_ETIQUETA_ANILLOS ? formatearPorcentaje(f.porcentaje) : null,
            ),
            colorEtiquetas: colores.map(colorTextoSobre),
            detalles: grupo.resumen.frecuencias.map((f) => detallePersonas(f, `${grupo.nombre}: `)),
          })),
        },
        options: { ...comunes, cutout: "28%", layout: { padding: 8 } },
        plugins: [PLUGIN_ETIQUETAS, PLUGIN_FONDO],
      };
    },
    altura: ({ cantidadCategorias, anchoDisponible }) =>
      anchoDisponible < 640 ? 420 + Math.ceil(cantidadCategorias / 2) * 24 : 480,
  });
})(globalThis);
