"""Interfaz Streamlit del visualizador de respuestas de Google Forms."""

import pandas as pd
import streamlit as st

from graficos.carga_csv import ErrorCSV, leer_csv
from graficos.tipos import TipoColumna, detectar_tipo
from graficos.visualizacion import contar_respuestas, crear_figura, graficos_compatibles

st.set_page_config(page_title="Visualizador de respuestas", page_icon="📊", layout="wide")


@st.cache_data(show_spinner=False)
def cargar(contenido: bytes) -> tuple[pd.DataFrame, list[str]]:
    return leer_csv(contenido)


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


barra_lateral()
area_principal()
