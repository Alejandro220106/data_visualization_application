"""Construcción de las figuras Plotly a partir de una columna."""

from enum import Enum

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

from graficos.tipos import TipoColumna, expandir_respuestas

# El gráfico de pastel solo se ofrece con pocas categorías para que siga siendo legible.
MAX_CATEGORIAS_PASTEL = 6
COLOR_PRINCIPAL = "#2563eb"
PALETA = px.colors.qualitative.Safe


class TipoGrafico(Enum):
    BARRAS = "Barras"
    BARRAS_HORIZONTALES = "Barras horizontales"
    PASTEL = "Pastel / dona"
    HISTOGRAMA = "Histograma"
    CAJA = "Caja"


def graficos_compatibles(serie: pd.Series, tipo: TipoColumna) -> list[TipoGrafico]:
    """Gráficos que admite la columna; el primero es el sugerido."""
    if tipo is TipoColumna.CATEGORICA:
        opciones = [TipoGrafico.BARRAS, TipoGrafico.BARRAS_HORIZONTALES]
        if serie.dropna().nunique() <= MAX_CATEGORIAS_PASTEL:
            opciones.append(TipoGrafico.PASTEL)
        return opciones
    if tipo is TipoColumna.MULTIRESPUESTA:
        return [TipoGrafico.BARRAS_HORIZONTALES, TipoGrafico.BARRAS]
    if tipo is TipoColumna.ESCALA:
        return [TipoGrafico.BARRAS, TipoGrafico.HISTOGRAMA, TipoGrafico.CAJA]
    if tipo is TipoColumna.NUMERICA:
        return [TipoGrafico.HISTOGRAMA, TipoGrafico.CAJA]
    return []


def contar_respuestas(serie: pd.Series, tipo: TipoColumna) -> pd.DataFrame:
    """Tabla de frecuencias con columnas Respuesta, Cantidad y Porcentaje."""
    valores = expandir_respuestas(serie) if tipo is TipoColumna.MULTIRESPUESTA else serie.dropna()
    conteo = valores.value_counts()
    if tipo is TipoColumna.ESCALA:
        conteo = conteo.sort_index(key=lambda indice: pd.to_numeric(indice))
    tabla = conteo.rename_axis("Respuesta").reset_index(name="Cantidad")
    tabla["Porcentaje"] = (tabla["Cantidad"] / serie.notna().sum() * 100).round(1)
    return tabla


def crear_figura(serie: pd.Series, tipo: TipoColumna, grafico: TipoGrafico) -> go.Figure:
    """Crea la figura del tipo pedido; el título es el texto de la pregunta."""
    if grafico not in graficos_compatibles(serie, tipo):
        raise ValueError(f"El gráfico «{grafico.value}» no es compatible con esta columna.")

    titulo = str(serie.name)
    if grafico in (TipoGrafico.HISTOGRAMA, TipoGrafico.CAJA):
        numeros = pd.to_numeric(serie, errors="coerce").dropna().rename(titulo)
        if grafico is TipoGrafico.HISTOGRAMA:
            figura = px.histogram(numeros, x=titulo, color_discrete_sequence=[COLOR_PRINCIPAL])
            figura.update_layout(yaxis_title="Cantidad de respuestas", bargap=0.05)
        else:
            figura = px.box(
                numeros, x=titulo, points="all", color_discrete_sequence=[COLOR_PRINCIPAL]
            )
    else:
        tabla = contar_respuestas(serie, tipo)
        datos_hover = {"Porcentaje": ":.1f"}
        if grafico is TipoGrafico.PASTEL:
            figura = px.pie(
                tabla,
                names="Respuesta",
                values="Cantidad",
                hole=0.45,
                color_discrete_sequence=PALETA,
            )
            figura.update_traces(textinfo="percent+label")
        elif grafico is TipoGrafico.BARRAS_HORIZONTALES:
            figura = px.bar(
                tabla.iloc[::-1],
                x="Cantidad",
                y="Respuesta",
                orientation="h",
                text="Cantidad",
                hover_data=datos_hover,
                color_discrete_sequence=[COLOR_PRINCIPAL],
            )
            figura.update_layout(yaxis_title=None, xaxis_title="Cantidad de respuestas")
        else:
            figura = px.bar(
                tabla,
                x="Respuesta",
                y="Cantidad",
                text="Cantidad",
                hover_data=datos_hover,
                color_discrete_sequence=[COLOR_PRINCIPAL],
            )
            figura.update_layout(xaxis_title=None, yaxis_title="Cantidad de respuestas")
            if tipo is TipoColumna.ESCALA:
                figura.update_xaxes(type="category")

    figura.update_layout(
        title={"text": titulo, "x": 0, "xanchor": "left"},
        margin={"l": 20, "r": 20, "t": 60, "b": 20},
        font={"size": 14},
        template="plotly_white",
    )
    return figura
