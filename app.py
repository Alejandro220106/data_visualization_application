"""Interfaz Streamlit del visualizador de respuestas de Google Forms."""

import pandas as pd
import streamlit as st

from graficos.carga_csv import ErrorCSV, leer_csv
from graficos.exportacion import ErrorExportacion, exportar_png
from graficos.historial import Historial
from graficos.tipos import TipoColumna, detectar_tipo
from graficos.visualizacion import contar_respuestas, crear_figura, graficos_compatibles

st.set_page_config(page_title="Visualizador de respuestas", page_icon="📊", layout="wide")


@st.cache_data(show_spinner=False)
def cargar(contenido: bytes) -> tuple[pd.DataFrame, list[str]]:
    return leer_csv(contenido)


@st.cache_resource
def obtener_historial() -> Historial:
    return Historial()


def seleccionar_archivo(nombre: str, contenido: bytes) -> None:
    """Deja el archivo como activo y reinicia la selección de pregunta y gráfico."""
    st.session_state.archivo = {"nombre": nombre, "contenido": contenido}
    st.session_state.pop("columna", None)
    st.session_state.pop("grafico", None)


def barra_lateral() -> None:
    with st.sidebar:
        st.header("Datos")
        subido = st.file_uploader(
            "Sube el CSV de respuestas",
            type="csv",
            help="En Google Sheets: Archivo → Descargar → Valores separados por comas (.csv)",
        )
        if subido is not None and st.session_state.get("id_subida") != subido.file_id:
            st.session_state.id_subida = subido.file_id
            seleccionar_archivo(subido.name, subido.getvalue())

        st.divider()
        panel_historial()


def panel_historial() -> None:
    st.header("Historial")
    historial = obtener_historial()
    busqueda = st.text_input(
        "Buscar", placeholder="Nombre del análisis", label_visibility="collapsed"
    )
    guardados = historial.listar(busqueda)
    if not guardados:
        st.caption("No hay análisis guardados." if not busqueda else "Sin resultados.")
        return

    for analisis in guardados:
        with st.container(border=True):
            st.markdown(f"**{analisis.nombre}**")
            st.caption(f"{analisis.creado_en.replace('T', ' ')} · {analisis.tipo_grafico}")
            if st.session_state.get("confirmar_eliminar") == analisis.id:
                st.warning("¿Eliminar este análisis?")
                si, no = st.columns(2)
                if si.button("Eliminar", key=f"si_{analisis.id}", type="primary", width="stretch"):
                    historial.eliminar(analisis.id)
                    del st.session_state.confirmar_eliminar
                    st.rerun()
                if no.button("Cancelar", key=f"no_{analisis.id}", width="stretch"):
                    del st.session_state.confirmar_eliminar
                    st.rerun()
                continue
            abrir, eliminar = st.columns(2)
            if abrir.button("Abrir", key=f"abrir_{analisis.id}", width="stretch"):
                recuperar(historial, analisis)
            if eliminar.button("Eliminar", key=f"eliminar_{analisis.id}", width="stretch"):
                st.session_state.confirmar_eliminar = analisis.id
                st.rerun()


def recuperar(historial: Historial, analisis) -> None:
    """Carga el CSV guardado y restaura la pregunta y el gráfico del análisis."""
    try:
        contenido = historial.leer_contenido(analisis)
    except FileNotFoundError:
        st.error("El archivo de este análisis ya no existe en la carpeta de datos.")
        return
    seleccionar_archivo(analisis.archivo_original, contenido)
    st.session_state.columna = analisis.columna
    st.session_state.columna_graficada = analisis.columna
    st.session_state.grafico = analisis.tipo_grafico


def area_principal() -> None:
    archivo = st.session_state.get("archivo")
    if archivo is None:
        st.title("Visualizador de respuestas")
        st.info("Sube un CSV desde la barra lateral para empezar.")
        return

    try:
        with st.spinner("Leyendo el archivo…"):
            tabla, avisos = cargar(archivo["contenido"])
    except ErrorCSV as error:
        st.error(str(error))
        return
    for aviso in avisos:
        st.warning(aviso)

    st.title(archivo["nombre"])
    st.caption(f"{len(tabla)} respuestas · {len(tabla.columns)} preguntas")

    if st.session_state.get("columna") not in tabla.columns:
        # Preselecciona la primera pregunta graficable para no empezar en «Marca temporal».
        graficables = [
            c for c in tabla.columns if detectar_tipo(tabla[c]) is not TipoColumna.TEXTO_LIBRE
        ]
        st.session_state.columna = graficables[0] if graficables else tabla.columns[0]

    control_pregunta, control_grafico = st.columns([3, 2])
    with control_pregunta:
        columna = st.selectbox("Pregunta", list(tabla.columns), key="columna")
    serie = tabla[columna]
    tipo = detectar_tipo(serie)
    opciones = graficos_compatibles(serie, tipo)

    if not opciones:
        st.info(
            "Esta pregunta tiene respuestas abiertas y no se puede graficar. Elige otra pregunta."
        )
        return

    # Al cambiar de pregunta se vuelve al gráfico sugerido para la nueva columna.
    nombres = [opcion.value for opcion in opciones]
    if (
        st.session_state.get("columna_graficada") != columna
        or st.session_state.get("grafico") not in nombres
    ):
        st.session_state.grafico = opciones[0].value
        st.session_state.columna_graficada = columna
    with control_grafico:
        nombre_grafico = st.selectbox(
            "Tipo de gráfico",
            nombres,
            key="grafico",
            help=f"Sugerido para una columna {tipo.value}: {opciones[0].value}",
        )
    grafico = next(opcion for opcion in opciones if opcion.value == nombre_grafico)

    figura = crear_figura(serie, tipo, grafico)
    st.plotly_chart(figura, width="stretch")

    validas = int(serie.notna().sum())
    st.caption(f"{validas} respuestas válidas de {len(serie)}")
    if tipo is TipoColumna.MULTIRESPUESTA:
        st.caption(
            "Pregunta con varias opciones por respuesta: los porcentajes se calculan sobre "
            "las personas que respondieron y pueden sumar más de 100 %."
        )

    if tipo is not TipoColumna.NUMERICA:
        with st.expander("Tabla de frecuencias"):
            st.dataframe(contar_respuestas(serie, tipo), hide_index=True, width="stretch")

    acciones(archivo, figura, columna, grafico.value)


def acciones(archivo: dict, figura, columna: str, grafico: str) -> None:
    exportar, guardar, _ = st.columns([1, 1, 3])
    clave_png = (archivo["nombre"], columna, grafico)
    with exportar:
        if st.session_state.get("png", {}).get("clave") == clave_png:
            st.download_button(
                "Descargar PNG",
                st.session_state.png["imagen"],
                file_name=f"{columna[:60]}.png",
                mime="image/png",
                icon=":material/download:",
                width="stretch",
            )
        elif st.button("Generar PNG", icon=":material/image:", width="stretch"):
            try:
                with st.spinner("Generando imagen…"):
                    imagen = exportar_png(figura)
                st.session_state.png = {"clave": clave_png, "imagen": imagen}
                st.rerun()
            except ErrorExportacion as error:
                st.warning(str(error))
    with guardar, st.popover("Guardar en historial", icon=":material/save:", width="stretch"):
        nombre = st.text_input(
            "Nombre del análisis",
            value=f"{archivo['nombre'].removesuffix('.csv')} · {columna[:40]}",
            max_chars=120,
        )
        if st.button("Guardar", type="primary"):
            obtener_historial().guardar(
                nombre, archivo["nombre"], archivo["contenido"], columna, grafico
            )
            st.toast("Análisis guardado en el historial", icon=":material/check:")


barra_lateral()
area_principal()
