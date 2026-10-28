import pandas as pd
import pytest

from graficos.tipos import TipoColumna
from graficos.visualizacion import (
    TipoGrafico,
    contar_respuestas,
    crear_figura,
    graficos_compatibles,
)


def serie(nombre, *valores):
    return pd.Series(valores, name=nombre, dtype="object")


def test_pastel_solo_con_pocas_categorias():
    pocas = serie("P", "A", "B", "A")
    muchas = serie("P", *[f"Opción {n}" for n in range(8)] * 2)
    assert TipoGrafico.PASTEL in graficos_compatibles(pocas, TipoColumna.CATEGORICA)
    assert TipoGrafico.PASTEL not in graficos_compatibles(muchas, TipoColumna.CATEGORICA)


def test_texto_libre_no_tiene_graficos():
    assert graficos_compatibles(serie("P", "x"), TipoColumna.TEXTO_LIBRE) == []


def test_barras_ordenadas_de_mayor_a_menor():
    tabla = contar_respuestas(serie("P", "A", "B", "B", None), TipoColumna.CATEGORICA)
    assert tabla["Respuesta"].tolist() == ["B", "A"]
    assert tabla["Porcentaje"].tolist() == [66.7, 33.3]


def test_escala_ordenada_por_valor():
    tabla = contar_respuestas(serie("P", "5", "1", "5", "3"), TipoColumna.ESCALA)
    assert tabla["Respuesta"].tolist() == ["1", "3", "5"]


def test_multirespuesta_cuenta_cada_opcion():
    tabla = contar_respuestas(serie("P", "A, B", "A"), TipoColumna.MULTIRESPUESTA)
    assert dict(zip(tabla["Respuesta"], tabla["Cantidad"], strict=True)) == {"A": 2, "B": 1}


@pytest.mark.parametrize(
    ("tipo", "grafico", "traza"),
    [
        (TipoColumna.CATEGORICA, TipoGrafico.BARRAS, "bar"),
        (TipoColumna.CATEGORICA, TipoGrafico.PASTEL, "pie"),
        (TipoColumna.ESCALA, TipoGrafico.HISTOGRAMA, "histogram"),
        (TipoColumna.ESCALA, TipoGrafico.CAJA, "box"),
    ],
)
def test_crea_la_traza_correcta(tipo, grafico, traza):
    figura = crear_figura(serie("Pregunta", "1", "2", "2", "3"), tipo, grafico)
    assert figura.data[0].type == traza
    assert figura.layout.title.text == "Pregunta"


def test_rechaza_grafico_incompatible():
    with pytest.raises(ValueError):
        crear_figura(serie("P", "1.5", "2.5"), TipoColumna.NUMERICA, TipoGrafico.PASTEL)
