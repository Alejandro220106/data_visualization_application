/* Interfaz: conecta la carga del CSV, los controles, el gráfico y su explicación. */
(function () {
  "use strict";

  const G = globalThis.Graficadora;
  const { leerCSV, ErrorCSV } = G.csv;
  const { TIPOS } = G.tipos;
  const E = G.estadisticas;
  const { MODOS } = G.grafico;

  // Límite de tamaño del CSV: una encuesta de este proyecto pesa unos pocos kilobytes.
  const TAMANO_MAXIMO = 5 * 1024 * 1024;
  const DATOS_EJEMPLO = "datos/encuesta_ia.csv";

  const el = {
    zonaCarga: document.getElementById("zona-carga"),
    archivo: document.getElementById("archivo"),
    cargarEjemplo: document.getElementById("cargar-ejemplo"),
    estadoArchivo: document.getElementById("estado-archivo"),
    avisos: document.getElementById("avisos"),
    seccionControles: document.getElementById("seccion-controles"),
    seccionGrafico: document.getElementById("seccion-grafico"),
    seccionLectura: document.getElementById("seccion-lectura"),
    pregunta: document.getElementById("pregunta"),
    tipoPregunta: document.getElementById("tipo-pregunta"),
    tipoGrafico: document.getElementById("tipo-grafico"),
    ayudaGrafico: document.getElementById("ayuda-grafico"),
    campoRecinto: document.getElementById("campo-recinto"),
    recinto: document.getElementById("recinto"),
    campoComparar: document.getElementById("campo-comparar"),
    comparar: document.getElementById("comparar"),
    ayudaComparar: document.getElementById("ayuda-comparar"),
    modos: document.querySelectorAll('input[name="modo"]'),
    preguntasOmitidas: document.getElementById("preguntas-omitidas"),
    contenedorLienzo: document.getElementById("contenedor-lienzo"),
    lienzo: document.getElementById("lienzo"),
    pieFuente: document.getElementById("pie-fuente"),
    pieNota: document.getElementById("pie-nota"),
    descargar: document.getElementById("descargar"),
    lectura: document.getElementById("lectura"),
    tabla: document.getElementById("tabla"),
  };

  const estado = {
    datos: null,
    columnaGrupo: null,
    grupos: [],
    preguntas: [],
    pregunta: null,
    grupo: "",
    comparar: false,
    modo: MODOS.CANTIDAD,
    // null = automático; si no, el tipo elegido (se recuerda aunque una pregunta no lo admita).
    tipoGrafico: null,
    fuente: "",
  };
  let grafico = null;
  let anchoAnterior = window.innerWidth;

  Chart.defaults.font.family = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  function crear(etiqueta, texto, clase) {
    const nodo = document.createElement(etiqueta);
    if (texto !== undefined) nodo.textContent = texto;
    if (clase) nodo.className = clase;
    return nodo;
  }

  function mostrarAvisos(mensajes, esError = false) {
    el.avisos.replaceChildren(
      ...mensajes.map((mensaje) => {
        const parrafo = crear("p", mensaje, esError ? "aviso aviso--error" : "aviso");
        if (esError) parrafo.setAttribute("role", "alert");
        return parrafo;
      }),
    );
  }

  function reiniciar() {
    estado.datos = null;
    if (grafico) grafico.destroy();
    grafico = null;
    el.estadoArchivo.textContent = "";
    for (const seccion of [el.seccionControles, el.seccionGrafico, el.seccionLectura]) seccion.hidden = true;
  }

  function manejarError(error) {
    reiniciar();
    if (error instanceof ErrorCSV) {
      mostrarAvisos([error.message], true);
    } else {
      console.error(error);
      mostrarAvisos(["No se pudo leer el archivo. Revisa que sea el CSV descargado de Google Sheets."], true);
    }
  }

  function decodificar(buffer) {
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
    } catch {
      throw new ErrorCSV(
        "El archivo no está en UTF-8. Descárgalo de nuevo desde Google Sheets con Archivo → Descargar → Valores separados por comas (.csv).",
      );
    }
  }

  async function leerArchivo(archivo) {
    if (!archivo) return;
    try {
      if (!/\.csv$/i.test(archivo.name)) throw new ErrorCSV("El archivo debe tener extensión .csv.");
      if (archivo.size > TAMANO_MAXIMO) throw new ErrorCSV("El archivo supera el límite de 5 MB.");
      cargarTexto(decodificar(await archivo.arrayBuffer()), archivo.name);
    } catch (error) {
      manejarError(error);
    } finally {
      el.archivo.value = "";
    }
  }

  async function cargarEjemplo() {
    let texto;
    try {
      const respuesta = await fetch(DATOS_EJEMPLO);
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      texto = await respuesta.text();
    } catch {
      reiniciar();
      mostrarAvisos(
        [
          "No se pudieron cargar los datos de ejemplo. Si abriste index.html con doble clic, el navegador bloquea esa lectura: usa «Elegir archivo CSV» y selecciona datos/encuesta_ia.csv.",
        ],
        true,
      );
      return;
    }
    try {
      cargarTexto(texto, "Datos de ejemplo (sintéticos)", { ejemplo: true });
    } catch (error) {
      manejarError(error);
    }
  }

  function cargarTexto(texto, nombre, { ejemplo = false } = {}) {
    const { columnas, filas, avisos } = leerCSV(texto);
    const preguntas = columnas.map((columna) => ({
      columna,
      descripcion: E.describirPregunta(filas.map((fila) => fila[columna])),
    }));
    const graficables = preguntas.filter((p) => p.descripcion.tipo !== TIPOS.TEXTO_LIBRE);
    if (graficables.length === 0) {
      throw new ErrorCSV("El archivo no tiene preguntas que se puedan graficar.");
    }

    estado.datos = { columnas, filas };
    estado.preguntas = graficables;
    estado.columnaGrupo = E.detectarColumnaGrupo(columnas);
    estado.grupos = E.gruposDisponibles(filas, estado.columnaGrupo);
    estado.grupo = "";
    estado.comparar = false;
    estado.tipoGrafico = null;
    const anio = new Date().getFullYear();
    estado.fuente = ejemplo
      ? `Fuente: datos de ejemplo sintéticos, elaborados para probar la herramienta (${anio}).`
      : `Fuente: elaboración propia con datos de la encuesta del proyecto (archivo «${nombre}», ${anio}).`;
    // Se empieza por la primera pregunta con más de una respuesta distinta.
    const variada = graficables.find((p) => new Set(filas.map((f) => f[p.columna]).filter(Boolean)).size > 1);
    estado.pregunta = (variada ?? graficables[0]).columna;

    const mensajes = [...avisos];
    const identificadores = G.privacidad.columnasIdentificadoras(columnas);
    if (identificadores.length) {
      mensajes.push(
        `El archivo parece contener datos personales (${identificadores.join(", ")}). Elimina esas columnas en Google Sheets antes de usar la herramienta.`,
      );
    }
    if (!estado.columnaGrupo) {
      mensajes.push("No se encontró una columna de recinto: el filtro y la comparación por recinto no están disponibles.");
    }
    mostrarAvisos(mensajes);

    el.estadoArchivo.textContent = `${nombre}: ${filas.length} ${filas.length === 1 ? "respuesta" : "respuestas"} y ${columnas.length} columnas.`;
    const omitidas = preguntas.filter((p) => p.descripcion.tipo === TIPOS.TEXTO_LIBRE).map((p) => `«${p.columna}»`);
    el.preguntasOmitidas.textContent = omitidas.length
      ? omitidas.length === 1
        ? `No se grafica 1 columna de respuesta abierta o sin respuestas repetidas: ${omitidas[0]}.`
        : `No se grafican ${omitidas.length} columnas de respuesta abierta o sin respuestas repetidas: ${omitidas.join(", ")}.`
      : "";
    prepararControles();
    render();
  }

  function prepararControles() {
    el.pregunta.replaceChildren(
      ...estado.preguntas.map(({ columna }) => {
        const opcion = crear("option", columna);
        opcion.value = columna;
        return opcion;
      }),
    );
    el.pregunta.value = estado.pregunta;

    const hayRecinto = Boolean(estado.columnaGrupo) && estado.grupos.length > 0;
    el.campoRecinto.hidden = !hayRecinto;
    el.campoComparar.hidden = !hayRecinto || estado.grupos.length < 2;
    const todos = crear("option", "Todos los recintos");
    todos.value = "";
    el.recinto.replaceChildren(
      todos,
      ...estado.grupos.map((grupo) => {
        const opcion = crear("option", grupo);
        opcion.value = grupo;
        return opcion;
      }),
    );
    el.recinto.value = "";
    el.comparar.checked = false;
    for (const radio of el.modos) radio.checked = radio.value === estado.modo;

    for (const seccion of [el.seccionControles, el.seccionGrafico, el.seccionLectura]) seccion.hidden = false;
  }

  function celdaNumero(texto) {
    return crear("td", texto, "numero");
  }

  function tablaSimple(pregunta, resumen, tipo) {
    const tabla = crear("table");
    tabla.append(crear("caption", `Frecuencias de «${pregunta}»`));
    const encabezado = crear("tr");
    encabezado.append(crear("th", "Respuesta"), crear("th", "Personas", "numero"), crear("th", "Porcentaje", "numero"));
    const cuerpo = crear("tbody");
    for (const f of resumen.frecuencias) {
      const fila = crear("tr");
      fila.append(crear("td", f.categoria), celdaNumero(String(f.cantidad)), celdaNumero(E.formatearPorcentaje(f.porcentaje)));
      cuerpo.append(fila);
    }
    const pie = crear("tfoot");
    const filasPie = [[tipo === TIPOS.MULTIRESPUESTA ? "Personas que respondieron" : "Respuestas válidas", resumen.personas]];
    if (tipo === TIPOS.MULTIRESPUESTA) filasPie.push(["Opciones marcadas en total", resumen.selecciones]);
    if (resumen.omitidas) filasPie.push(["Sin respuesta (excluidas)", resumen.omitidas]);
    if (resumen.noAplica) filasPie.push(["«No aplica» (excluidas)", resumen.noAplica]);
    if (resumen.invalidas) filasPie.push(["Valores no numéricos (excluidos)", resumen.invalidas]);
    for (const [etiqueta, valor] of filasPie) {
      const fila = crear("tr");
      fila.append(crear("th", etiqueta), celdaNumero(String(valor)), crear("td"));
      pie.append(fila);
    }
    const cabeza = crear("thead");
    cabeza.append(encabezado);
    tabla.append(cabeza, cuerpo, pie);
    return tabla;
  }

  function tablaComparacion(pregunta, comparacion) {
    const tabla = crear("table");
    tabla.append(crear("caption", `Porcentaje dentro de cada recinto para «${pregunta}»`));
    const encabezado = crear("tr");
    encabezado.append(crear("th", "Respuesta"));
    for (const grupo of comparacion.grupos) {
      encabezado.append(crear("th", `${grupo.nombre} (n = ${grupo.resumen.personas})`, "numero"));
    }
    const cuerpo = crear("tbody");
    comparacion.categorias.forEach((categoria, i) => {
      const fila = crear("tr");
      fila.append(crear("td", categoria));
      for (const grupo of comparacion.grupos) {
        const f = grupo.resumen.frecuencias[i];
        fila.append(celdaNumero(`${E.formatearPorcentaje(f.porcentaje)} (${f.cantidad})`));
      }
      cuerpo.append(fila);
    });
    const cabeza = crear("thead");
    cabeza.append(encabezado);
    tabla.append(cabeza, cuerpo);
    return tabla;
  }

  function actualizarControles(tipo) {
    const descripcionTipo = {
      [TIPOS.MULTIRESPUESTA]: "selección múltiple: cada persona podía marcar varias opciones",
      [TIPOS.ESCALA]: "escala: las barras siguen el orden de sus niveles",
      [TIPOS.NUMERICA]: "numérica: los valores se agrupan en intervalos",
    };
    el.tipoPregunta.textContent = `Tipo de pregunta: ${descripcionTipo[tipo] ?? tipo}.`;

    const puedeComparar = estado.grupos.length >= 2 && estado.pregunta !== estado.columnaGrupo;
    if (!puedeComparar) estado.comparar = false;
    el.comparar.checked = estado.comparar;
    el.comparar.disabled = !puedeComparar;
    el.ayudaComparar.textContent = puedeComparar
      ? "Muestra los recintos lado a lado, en porcentaje dentro de cada uno."
      : "No disponible para la pregunta del recinto.";
    el.recinto.disabled = estado.comparar;
    for (const radio of el.modos) {
      radio.disabled = estado.comparar;
      radio.checked = estado.comparar ? radio.value === MODOS.PORCENTAJE : radio.value === estado.modo;
    }
  }

  /**
   * Llena el selector de tipo de gráfico: «Automático» con la sugerencia, los tipos
   * no disponibles deshabilitados y, debajo, el motivo de cada restricción.
   */
  function actualizarSelectorGrafico(evaluacion, sugerido, mostrado) {
    const { NOMBRES_GRAFICO } = G.grafico;
    const automatico = crear("option", `Automático (${NOMBRES_GRAFICO[sugerido].toLowerCase()})`);
    automatico.value = "";
    el.tipoGrafico.replaceChildren(
      automatico,
      ...evaluacion.map(({ tipoGrafico, nombre, disponible }) => {
        const opcion = crear("option", disponible ? nombre : `${nombre} (no disponible)`);
        opcion.value = tipoGrafico;
        opcion.disabled = !disponible;
        return opcion;
      }),
    );
    const respetaEleccion = estado.tipoGrafico !== null && mostrado === estado.tipoGrafico;
    el.tipoGrafico.value = respetaEleccion ? estado.tipoGrafico : "";

    if (estado.tipoGrafico !== null && !respetaEleccion) {
      const elegido = evaluacion.find((e) => e.tipoGrafico === estado.tipoGrafico);
      el.ayudaGrafico.textContent = `«${elegido.nombre}» no está disponible para esta pregunta: ${elegido.razon} Se muestran ${NOMBRES_GRAFICO[mostrado].toLowerCase()}.`;
    } else {
      el.ayudaGrafico.textContent = evaluacion
        .filter((e) => !e.disponible)
        .map((e) => `${e.nombre}: ${e.razon}`)
        .join(" ");
    }
  }

  /** Tipo de gráfico que se dibuja para las categorías actuales. */
  function elegirGrafico(tipo, categorias, anchoDisponible) {
    const evaluacion = G.grafico.evaluarGraficos({ tipo, categorias, comparar: estado.comparar });
    const sugerido = G.grafico.graficoSugerido(tipo, categorias, anchoDisponible);
    const mostrado = G.grafico.resolverGrafico(estado.tipoGrafico, evaluacion, sugerido);
    actualizarSelectorGrafico(evaluacion, sugerido, mostrado);
    return mostrado;
  }

  function render() {
    if (!estado.datos) return;
    const { filas } = estado.datos;
    const { columna, descripcion } = estado.preguntas.find((p) => p.columna === estado.pregunta);
    const { tipo } = descripcion;
    actualizarControles(tipo);

    const anchoDisponible = el.contenedorLienzo.clientWidth || window.innerWidth;
    let configuracion;
    let frases;
    let tabla;
    let altura;
    let tipoGrafico;

    if (estado.comparar) {
      const comparacion = E.compararGrupos(filas, columna, estado.columnaGrupo, descripcion);
      tipoGrafico = elegirGrafico(tipo, comparacion.categorias, anchoDisponible);
      configuracion = G.grafico.configurarComparacion({ pregunta: columna, tipo, comparacion, anchoDisponible, tipoGrafico });
      frases = G.lectura.explicarComparacion(
        tipo,
        comparacion,
        G.grafico.comoLeerGrafico(tipoGrafico, { tipo, comparar: true }),
      );
      tabla = tablaComparacion(columna, comparacion);
      altura = G.grafico.alturaSugerida(tipoGrafico, comparacion.categorias.length, comparacion.grupos.length, anchoDisponible);
    } else {
      // Las categorías siguen el orden general para que filtrar no reordene las barras.
      const general = E.resumir(filas.map((f) => f[columna]), descripcion);
      const resumen = estado.grupo
        ? E.resumir(
            E.filtrarPorGrupo(filas, estado.columnaGrupo, estado.grupo).map((f) => f[columna]),
            descripcion,
            general.frecuencias.map((f) => f.categoria),
          )
        : general;
      const categorias = resumen.frecuencias.map((f) => f.categoria);
      tipoGrafico = elegirGrafico(tipo, categorias, anchoDisponible);
      configuracion = G.grafico.configurarGrafico({
        pregunta: columna,
        tipo,
        resumen,
        modo: estado.modo,
        grupo: estado.grupo || null,
        anchoDisponible,
        tipoGrafico,
      });
      frases = G.lectura.explicarResumen(
        tipo,
        resumen,
        estado.grupo || null,
        G.grafico.comoLeerGrafico(tipoGrafico, { tipo, comparar: false }),
      );
      tabla = tablaSimple(columna, resumen, tipo);
      altura = G.grafico.alturaSugerida(tipoGrafico, categorias.length, 1, anchoDisponible);
    }

    el.contenedorLienzo.style.height = `${altura}px`;
    if (grafico) grafico.destroy();
    grafico = new Chart(el.lienzo, configuracion);
    const nombreGrafico = G.grafico.NOMBRES_GRAFICO[tipoGrafico];
    el.lienzo.setAttribute(
      "aria-label",
      `Gráfico (${nombreGrafico.toLowerCase()}): ${columna}. ${frases[0]} La tabla de frecuencias está debajo.`,
    );
    el.pieFuente.textContent = estado.fuente;
    el.pieNota.textContent = `Nota: ${G.grafico.notaDelGrafico(tipoGrafico, { tipo, comparar: estado.comparar })}`;
    el.lectura.replaceChildren(...frases.map((frase) => crear("li", frase)));
    el.tabla.replaceChildren(tabla);
  }

  async function descargar() {
    if (!grafico) return;
    const nombre = G.descarga.nombreArchivo(estado.pregunta, {
      grupo: estado.grupo || null,
      comparar: estado.comparar,
    });
    try {
      await G.descarga.descargarLienzo(el.lienzo, nombre, {
        fuente: el.pieFuente.textContent,
        nota: el.pieNota.textContent,
      });
    } catch (error) {
      mostrarAvisos([error.message], true);
    }
  }

  // Eventos

  el.archivo.addEventListener("change", () => leerArchivo(el.archivo.files[0]));
  el.cargarEjemplo.addEventListener("click", cargarEjemplo);
  el.pregunta.addEventListener("change", () => {
    estado.pregunta = el.pregunta.value;
    render();
  });
  el.tipoGrafico.addEventListener("change", () => {
    estado.tipoGrafico = el.tipoGrafico.value || null;
    render();
  });
  el.recinto.addEventListener("change", () => {
    estado.grupo = el.recinto.value;
    render();
  });
  el.comparar.addEventListener("change", () => {
    estado.comparar = el.comparar.checked;
    render();
  });
  for (const radio of el.modos) {
    radio.addEventListener("change", () => {
      if (radio.checked) {
        estado.modo = radio.value;
        render();
      }
    });
  }
  el.descargar.addEventListener("click", descargar);

  for (const evento of ["dragenter", "dragover"]) {
    el.zonaCarga.addEventListener(evento, (e) => {
      e.preventDefault();
      el.zonaCarga.classList.add("carga--arrastrando");
    });
  }
  for (const evento of ["dragleave", "drop"]) {
    el.zonaCarga.addEventListener(evento, () => el.zonaCarga.classList.remove("carga--arrastrando"));
  }
  el.zonaCarga.addEventListener("drop", (e) => {
    e.preventDefault();
    leerArchivo(e.dataTransfer.files[0]);
  });
  // Evita que soltar un archivo fuera de la zona abra el CSV en lugar de la herramienta.
  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", (e) => e.preventDefault());

  // La orientación de las barras depende del ancho, así que se redibuja al cambiarlo.
  let espera;
  window.addEventListener("resize", () => {
    clearTimeout(espera);
    espera = setTimeout(() => {
      if (window.innerWidth !== anchoAnterior) {
        anchoAnterior = window.innerWidth;
        render();
      }
    }, 200);
  });
})();
