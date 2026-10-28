"""Detección del tipo de respuesta de cada columna del formulario."""

from enum import Enum

import pandas as pd

# Máximo de categorías distintas para tratar un texto como opción única.
MAX_CATEGORIAS = 20
# Si la proporción de valores únicos supera este umbral, son respuestas abiertas.
PROPORCION_TEXTO_LIBRE = 0.8
# Una escala tiene enteros con, como mucho, esta cantidad de valores distintos.
MAX_VALORES_ESCALA = 11
# Proporción mínima de valores convertibles a número para tratar la columna como numérica.
PROPORCION_NUMERICA = 0.9


class TipoColumna(Enum):
    CATEGORICA = "categórica"
    NUMERICA = "numérica"
    ESCALA = "escala"
    TEXTO_LIBRE = "texto libre"


def detectar_tipo(serie: pd.Series) -> TipoColumna:
    """Clasifica una columna según sus respuestas no vacías."""
    valores = serie.dropna()
    if valores.empty:
        return TipoColumna.TEXTO_LIBRE

    numeros = pd.to_numeric(valores, errors="coerce")
    if numeros.notna().mean() >= PROPORCION_NUMERICA:
        numeros = numeros.dropna()
        es_entera = (numeros == numeros.round()).all()
        if es_entera and numeros.nunique() <= MAX_VALORES_ESCALA:
            return TipoColumna.ESCALA
        return TipoColumna.NUMERICA

    unicos = valores.nunique()
    if unicos <= MAX_CATEGORIAS and unicos / len(valores) < PROPORCION_TEXTO_LIBRE:
        return TipoColumna.CATEGORICA
    if unicos <= 6:
        return TipoColumna.CATEGORICA
    return TipoColumna.TEXTO_LIBRE
