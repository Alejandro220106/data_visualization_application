import pandas as pd

from graficos.tipos import TipoColumna, detectar_tipo, expandir_respuestas


def serie(*valores):
    return pd.Series(valores, dtype="object")


def test_detecta_categorica():
    assert detectar_tipo(serie("Sí", "No", "Sí", "Sí", "No", "No")) is TipoColumna.CATEGORICA


def test_detecta_escala():
    assert detectar_tipo(serie("1", "5", "3", "4", "4", "2")) is TipoColumna.ESCALA


def test_detecta_numerica():
    valores = [str(v) for v in range(18, 40)]
    assert detectar_tipo(serie(*valores)) is TipoColumna.NUMERICA


def test_edades_con_pocos_valores_son_numericas():
    assert detectar_tipo(serie("18", "19", "21", "21", "25")) is TipoColumna.NUMERICA


def test_decimales_son_numericos():
    assert detectar_tipo(serie("1.5", "2.0", "3.25")) is TipoColumna.NUMERICA


def test_detecta_texto_libre():
    respuestas = [f"Comentario distinto número {n}" for n in range(30)]
    assert detectar_tipo(serie(*respuestas)) is TipoColumna.TEXTO_LIBRE


def test_columna_vacia_no_es_graficable():
    assert detectar_tipo(serie(None, None)) is TipoColumna.TEXTO_LIBRE


def test_ignora_vacios():
    assert detectar_tipo(serie("A", None, "B", "A", "B", "A")) is TipoColumna.CATEGORICA


def test_detecta_multirespuesta():
    columna = serie("Python, Java", "Python", "C, Python", "Java, C", "Python, Java, C")
    assert detectar_tipo(columna) is TipoColumna.MULTIRESPUESTA


def test_comas_en_texto_libre_no_son_multirespuesta():
    respuestas = [f"Bien, aunque mejoraría el tema {n}" for n in range(25)]
    assert detectar_tipo(serie(*respuestas)) is TipoColumna.TEXTO_LIBRE


def test_expande_cada_opcion():
    opciones = expandir_respuestas(serie("Python, Java", "Python", None))
    assert opciones.value_counts().to_dict() == {"Python": 2, "Java": 1}


def test_marcas_temporales_con_pocas_respuestas_no_se_grafican():
    marcas = [f"2026/10/28 9:0{n}:00" for n in range(6)]
    assert detectar_tipo(serie(*marcas)) is TipoColumna.TEXTO_LIBRE


def test_pocas_respuestas_con_repeticiones_son_categoricas():
    assert detectar_tipo(serie("A", "B", "C", "D", "A")) is TipoColumna.CATEGORICA
