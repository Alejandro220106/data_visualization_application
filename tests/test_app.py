from pathlib import Path

import pytest
from streamlit.testing.v1 import AppTest

RAIZ = Path(__file__).parent.parent
CSV = (Path(__file__).parent / "datos" / "ejemplo_forms.csv").read_bytes()


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
