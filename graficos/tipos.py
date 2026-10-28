"""Detección del tipo de respuesta de cada columna del formulario."""

from enum import Enum

import pandas as pd

# Máximo de categorías distintas para tratar un texto como opción única.
MAX_CATEGORIAS = 20
# Si la proporción de valores únicos supera este umbral, son respuestas abiertas.
PROPORCION_TEXTO_LIBRE = 0.8
# Una escala tiene enteros con, como mucho, esta cantidad de valores distintos.
MAX_VALORES_ESCALA = 11
# Rango de una escala lineal de Google Forms (de 0 o 1 hasta 10 como máximo).
RANGO_ESCALA = (0, 10)
# Proporción mínima de valores convertibles a número para tratar la columna como numérica.
PROPORCION_NUMERICA = 0.9
# Separador que usa Google Forms para las casillas de verificación.
SEPARADOR_MULTIPLE = ", "
# Proporción mínima de celdas con varias opciones para considerar la columna multirespuesta.
PROPORCION_MULTIPLE = 0.2


class TipoColumna(Enum):
    CATEGORICA = "categórica"
    MULTIRESPUESTA = "multirespuesta"
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
        en_rango = RANGO_ESCALA[0] <= numeros.min() and numeros.max() <= RANGO_ESCALA[1]
        if es_entera and en_rango and numeros.nunique() <= MAX_VALORES_ESCALA:
            return TipoColumna.ESCALA
        return TipoColumna.NUMERICA

    if _es_multirespuesta(valores):
        return TipoColumna.MULTIRESPUESTA

    unicos = valores.nunique()
    if unicos <= MAX_CATEGORIAS and unicos / len(valores) < PROPORCION_TEXTO_LIBRE:
        return TipoColumna.CATEGORICA
    # Con pocas respuestas la proporción no basta: si todas son distintas, es texto libre.
    if unicos <= MAX_CATEGORIAS and unicos < len(valores) <= MAX_CATEGORIAS:
        return TipoColumna.CATEGORICA
    return TipoColumna.TEXTO_LIBRE


def expandir_respuestas(serie: pd.Series) -> pd.Series:
    """Separa las celdas con varias opciones para contar cada opción por separado."""
    return (
        serie.dropna()
        .str.split(SEPARADOR_MULTIPLE)
        .explode()
        .str.strip()
        .replace("", pd.NA)
        .dropna()
    )


def _es_multirespuesta(valores: pd.Series) -> bool:
    """Hay celdas con varias opciones y esas opciones se repiten entre filas."""
    if valores.str.contains(SEPARADOR_MULTIPLE, regex=False).mean() < PROPORCION_MULTIPLE:
        return False
    opciones = expandir_respuestas(valores)
    return opciones.nunique() <= MAX_CATEGORIAS and opciones.nunique() < valores.nunique()
