import pandas as pd

from graficos.tipos import TipoColumna, detectar_tipo


def serie(*valores):
    return pd.Series(valores, dtype="object")


def test_detecta_categorica():
    assert detectar_tipo(serie("Sí", "No", "Sí", "Sí", "No", "No")) is TipoColumna.CATEGORICA


def test_detecta_escala():
    assert detectar_tipo(serie("1", "5", "3", "4", "4", "2")) is TipoColumna.ESCALA


def test_detecta_numerica():
    valores = [str(v) for v in range(18, 40)]
    assert detectar_tipo(serie(*valores)) is TipoColumna.NUMERICA


def test_decimales_son_numericos():
    assert detectar_tipo(serie("1.5", "2.0", "3.25")) is TipoColumna.NUMERICA


def test_detecta_texto_libre():
    respuestas = [f"Comentario distinto número {n}" for n in range(30)]
    assert detectar_tipo(serie(*respuestas)) is TipoColumna.TEXTO_LIBRE


def test_columna_vacia_no_es_graficable():
    assert detectar_tipo(serie(None, None)) is TipoColumna.TEXTO_LIBRE


def test_ignora_vacios():
    assert detectar_tipo(serie("A", None, "B", "A", "B", "A")) is TipoColumna.CATEGORICA
