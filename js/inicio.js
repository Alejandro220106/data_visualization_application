/*
 * Pantalla de inicio: una cortina de garaje cubre la herramienta hasta que se pulsa la flecha.
 * También se abre con el teclado (flechas, Inicio de página, espacio), la rueda del ratón o
 * deslizando el dedo hacia arriba. Mientras está cerrada, el resto de la página queda inactivo.
 * Desde abajo suben unas pocas chispas, como de fogata, para darle movimiento.
 */
(function () {
  "use strict";

  const cortina = document.getElementById("cortina");
  if (!cortina) return;
  const boton = document.getElementById("abrir-cortina");
  const resto = [...document.body.children].filter((nodo) => nodo !== cortina && nodo.tagName !== "SCRIPT");
  const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Lo que dura la animación de css/estilos.css (alzar la cortina y desvanecer la caja).
  const DURACION = movimientoReducido ? 260 : 1900;
  const TECLAS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", " ", "Enter"]);
  const DESLIZAMIENTO_MINIMO = 40;

  let abierta = false;
  let inicioToque = null;

  for (const nodo of resto) nodo.inert = true;
  boton.focus({ preventScroll: true });
  const detenerChispas = iniciarChispas(document.getElementById("chispas"));

  /**
   * Chispas de fogata: pocas, pequeñas y brillantes. Nacen abajo, a lo ancho de la pantalla, suben
   * despacio meciéndose, titilan y se apagan antes de llegar a la mitad de la pantalla.
   * Devuelve una función que las detiene. Si se pide reducir el movimiento, no se dibujan.
   */
  function iniciarChispas(lienzo) {
    const contexto = lienzo?.getContext?.("2d");
    if (!contexto || movimientoReducido) return () => {};

    // Brillo de una chispa, dibujado una sola vez: núcleo casi blanco y halo anaranjado.
    const brillo = document.createElement("canvas");
    brillo.width = brillo.height = 64;
    const pincel = brillo.getContext("2d");
    const degradado = pincel.createRadialGradient(32, 32, 0, 32, 32, 32);
    degradado.addColorStop(0, "rgba(255, 244, 214, 1)");
    degradado.addColorStop(0.12, "rgba(255, 196, 110, 0.95)");
    degradado.addColorStop(0.35, "rgba(232, 120, 40, 0.45)");
    degradado.addColorStop(1, "rgba(200, 70, 20, 0)");
    pincel.fillStyle = degradado;
    pincel.fillRect(0, 0, 64, 64);

    let ancho = 0;
    let alto = 0;
    let chispas = [];
    let cuadro = 0;
    let anterior = performance.now();
    const azar = (minimo, maximo) => minimo + Math.random() * (maximo - minimo);

    function nueva(alInicio = false) {
      const duracion = azar(3.5, 8);
      // Una de cada ocho es grande y desenfocada, como si estuviera más cerca: da profundidad.
      const cercana = Math.random() < 0.125;
      return {
        cercana,
        // Nacen repartidas a lo ancho de toda la pantalla.
        x: ancho * azar(0.02, 0.98),
        y: alto * azar(0.96, 1.04),
        subida: azar(22, 60),
        deriva: azar(-6, 10),
        vaiven: azar(6, 22),
        frecuencia: azar(0.6, 1.6),
        fase: azar(0, Math.PI * 2),
        tamano: cercana ? azar(3.5, 5.5) : azar(1.4, 3),
        duracion,
        // Al empezar, algunas ya van a mitad de camino para que no salgan todas juntas.
        vida: alInicio ? azar(0, duracion) : 0,
      };
    }

    function ajustar() {
      const densidad = Math.min(window.devicePixelRatio || 1, 2);
      ancho = lienzo.clientWidth;
      alto = lienzo.clientHeight;
      lienzo.width = Math.round(ancho * densidad);
      lienzo.height = Math.round(alto * densidad);
      contexto.setTransform(densidad, 0, 0, densidad, 0, 0);
      // Pocas chispas, en proporción al ancho: unas 14 en computadora y 7 en teléfono.
      const cantidad = Math.round(Math.min(18, Math.max(6, ancho / 90)));
      chispas = Array.from({ length: cantidad }, () => {
        const chispa = nueva(true);
        chispa.y -= chispa.subida * chispa.vida;
        return chispa;
      });
    }

    function dibujar(ahora) {
      const paso = Math.min((ahora - anterior) / 1000, 0.05);
      anterior = ahora;
      const segundos = ahora / 1000;
      contexto.clearRect(0, 0, ancho, alto);
      contexto.globalCompositeOperation = "lighter";
      for (let i = 0; i < chispas.length; i += 1) {
        let c = chispas[i];
        c.vida += paso;
        c.y -= c.subida * paso;
        c.x += (c.deriva + Math.sin(segundos * c.frecuencia + c.fase) * c.vaiven) * paso;
        if (c.vida >= c.duracion || c.y < alto * 0.4) {
          c = chispas[i] = nueva();
          continue;
        }
        const avance = c.vida / c.duracion;
        // Aparece rápido, se apaga despacio y titila como brasa.
        const entrada = Math.min(1, avance / 0.12);
        const salida = Math.min(1, (1 - avance) / 0.5);
        const titileo = 0.75 + 0.25 * Math.sin(segundos * 9 + c.fase * 3);
        contexto.globalAlpha = Math.max(0, entrada * salida * titileo * (c.cercana ? 0.35 : 1));
        const lado = c.tamano * 11 * (0.75 + 0.25 * salida);
        contexto.drawImage(brillo, c.x - lado / 2, c.y - lado / 2, lado, lado);
      }
      contexto.globalAlpha = 1;
      cuadro = requestAnimationFrame(dibujar);
    }

    ajustar();
    window.addEventListener("resize", ajustar);
    cuadro = requestAnimationFrame(dibujar);
    return () => {
      cancelAnimationFrame(cuadro);
      window.removeEventListener("resize", ajustar);
    };
  }

  /** Alza la cortina. Si se abrió con el teclado, el foco queda visible en el primer botón. */
  function abrir(porTeclado = false) {
    if (abierta) return;
    abierta = true;
    cortina.classList.add("cortina--abriendo");
    // La página se activa en cuanto empieza a verse.
    for (const nodo of resto) nodo.inert = false;
    document.body.classList.remove("con-cortina");
    document.removeEventListener("keydown", alPulsarTecla);
    cortina.removeEventListener("wheel", alGirarRueda);
    setTimeout(() => {
      detenerChispas();
      cortina.hidden = true;
      document.getElementById("cargar-ejemplo")?.focus({ preventScroll: true, focusVisible: porTeclado });
    }, DURACION);
  }

  function alPulsarTecla(evento) {
    if (!TECLAS.has(evento.key)) return;
    evento.preventDefault();
    abrir(true);
  }

  function alGirarRueda(evento) {
    if (Math.abs(evento.deltaY) > 4) abrir();
  }

  // detail = 0 cuando el «clic» viene del teclado (Enter o espacio sobre el botón).
  boton.addEventListener("click", (evento) => abrir(evento.detail === 0));
  document.addEventListener("keydown", alPulsarTecla);
  cortina.addEventListener("wheel", alGirarRueda, { passive: true });
  cortina.addEventListener(
    "touchstart",
    (evento) => {
      inicioToque = evento.touches[0].clientY;
    },
    { passive: true },
  );
  cortina.addEventListener(
    "touchmove",
    (evento) => {
      if (inicioToque !== null && inicioToque - evento.touches[0].clientY > DESLIZAMIENTO_MINIMO) abrir();
    },
    { passive: true },
  );
})();
