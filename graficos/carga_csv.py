"""Lectura y validación de los CSV exportados desde Google Sheets."""

import io

import pandas as pd


class ErrorCSV(Exception):
    """Error con un mensaje apto para mostrar al usuario."""


def leer_csv(contenido: bytes) -> tuple[pd.DataFrame, list[str]]:
    """Lee el CSV y devuelve el DataFrame limpio junto con avisos para el usuario.

    Lanza ErrorCSV si el archivo no se puede usar.
    """
    if not contenido or not contenido.strip():
        raise ErrorCSV("El archivo está vacío.")

    try:
        texto = contenido.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise ErrorCSV(
            "El archivo no está en UTF-8. Descárgalo de nuevo desde Google Sheets "
            "con Archivo → Descargar → Valores separados por comas (.csv)."
        ) from error

    try:
        tabla = pd.read_csv(io.StringIO(texto), dtype=str, keep_default_na=False)
    except pd.errors.EmptyDataError as error:
        raise ErrorCSV("El archivo no tiene encabezados ni datos.") from error
    except pd.errors.ParserError as error:
        raise ErrorCSV(
            "El archivo no tiene un formato CSV válido. Revisa que no lo hayas "
            "modificado manualmente."
        ) from error

    avisos: list[str] = []
    tabla.columns = _renombrar_duplicados(_encabezados_originales(texto), avisos)

    tabla = tabla.apply(lambda columna: columna.str.strip()).replace("", pd.NA)
    tabla = tabla.dropna(how="all").dropna(axis="columns", how="all")

    if tabla.empty:
        raise ErrorCSV("El archivo tiene encabezados, pero ninguna respuesta.")

    return tabla.reset_index(drop=True), avisos


def _encabezados_originales(texto: str) -> list[str]:
    """Lee la fila de encabezados sin que pandas renombre los duplicados."""
    encabezados = pd.read_csv(io.StringIO(texto), header=None, nrows=1, dtype=str)
    return [str(valor).strip() if pd.notna(valor) else "" for valor in encabezados.iloc[0]]


def _renombrar_duplicados(encabezados: list[str], avisos: list[str]) -> list[str]:
    """Agrega un sufijo a los encabezados vacíos o repetidos y lo informa."""
    vistos: dict[str, int] = {}
    resultado = []
    for posicion, nombre in enumerate(encabezados, start=1):
        if not nombre:
            nombre = f"Columna {posicion}"
        if nombre in vistos:
            vistos[nombre] += 1
            nuevo = f"{nombre} ({vistos[nombre]})"
            avisos.append(f"La columna «{nombre}» estaba repetida y se renombró como «{nuevo}».")
            nombre = nuevo
        else:
            vistos[nombre] = 1
        resultado.append(nombre)
    return resultado
