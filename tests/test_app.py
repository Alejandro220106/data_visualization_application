from pathlib import Path

import pytest
import streamlit as st
from streamlit.testing.v1 import AppTest

from graficos.historial import Historial
from graficos.rutas import VARIABLE_CARPETA

RAIZ = Path(__file__).parent.parent
CSV = (Path(__file__).parent / "datos" / "ejemplo_forms.csv").read_bytes()


@pytest.fixture(autouse=True)
def carpeta_temporal(tmp_path, monkeypatch):
    """Evita que las pruebas escriban en la carpeta de datos real del usuario."""
    monkeypatch.setenv(VARIABLE_CARPETA, str(tmp_path))
    st.cache_resource.clear()
    return tmp_path


@pytest.fixture
def app():
    prueba = AppTest.from_file(str(RAIZ / "app.py"), default_timeout=30)
    # AppTest no admite subir archivos: se simula dejando el archivo activo en la sesión.
    prueba.session_state.archivo = {"nombre": "ejemplo_forms.csv", "contenido": CSV}
    return prueba.run()


def test_sin_archivo_muestra_estado_vacio():
    prueba = AppTest.from_file(str(RAIZ / "app.py"), default_timeout=30).run()
    assert "Sube un CSV" in prueba.info[0].value


def test_preselecciona_la_primera_pregunta_graficable(app):
    assert not app.exception
    assert app.selectbox(key="columna").value == "¿Qué medio de transporte usas?"
    assert app.selectbox(key="grafico").value == "Barras"


def test_multirespuesta_sugiere_barras_horizontales(app):
    app.selectbox(key="columna").set_value("¿Qué lenguajes conoces?").run()
    assert app.selectbox(key="grafico").value == "Barras horizontales"
    assert any("más de 100" in texto.value for texto in app.caption)


def test_texto_libre_no_se_grafica(app):
    app.selectbox(key="columna").set_value("Comentarios").run()
    assert "respuestas abiertas" in app.info[0].value


def test_cambiar_tipo_de_grafico(app):
    app.selectbox(key="columna").set_value("Edad").run()
    assert app.selectbox(key="grafico").options == ["Histograma", "Caja"]
    app.selectbox(key="grafico").set_value("Caja").run()
    assert not app.exception


def test_csv_invalido_muestra_error():
    prueba = AppTest.from_file(str(RAIZ / "app.py"), default_timeout=30)
    prueba.session_state.archivo = {"nombre": "vacio.csv", "contenido": b"A,B\n"}
    prueba.run()
    assert "ninguna respuesta" in prueba.error[0].value


def test_guardar_en_historial(app, carpeta_temporal):
    next(boton for boton in app.button if boton.label == "Guardar").click().run()
    guardados = Historial(base=carpeta_temporal).listar()
    assert len(guardados) == 1
    assert guardados[0].columna == "¿Qué medio de transporte usas?"
    assert guardados[0].tipo_grafico == "Barras"


def test_recuperar_y_eliminar_desde_el_historial(carpeta_temporal):
    Historial(base=carpeta_temporal).guardar("Edades", "ejemplo_forms.csv", CSV, "Edad", "Caja")
    app = AppTest.from_file(str(RAIZ / "app.py"), default_timeout=30).run()
    app.button(key="abrir_1").click().run()
    assert app.selectbox(key="columna").value == "Edad"
    assert app.selectbox(key="grafico").value == "Caja"

    app.button(key="eliminar_1").click().run()
    app.button(key="si_1").click().run()
    assert Historial(base=carpeta_temporal).listar() == []
