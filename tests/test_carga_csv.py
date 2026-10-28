from pathlib import Path

import pytest

from graficos.carga_csv import ErrorCSV, leer_csv

DATOS = Path(__file__).parent / "datos"


def test_lee_csv_de_google_forms():
    tabla, avisos = leer_csv((DATOS / "ejemplo_forms.csv").read_bytes())
    assert len(tabla) == 12
    assert "¿Qué medio de transporte usas?" in tabla.columns
    assert avisos == []


def test_acepta_utf8_con_bom():
    tabla, _ = leer_csv("﻿Pregunta\nSí\nNo\n".encode())
    assert list(tabla.columns) == ["Pregunta"]


@pytest.mark.parametrize("contenido", [b"", b"   \n"])
def test_rechaza_archivo_vacio(contenido):
    with pytest.raises(ErrorCSV, match="vacío"):
        leer_csv(contenido)


def test_rechaza_archivo_sin_respuestas():
    with pytest.raises(ErrorCSV, match="ninguna respuesta"):
        leer_csv(b"Pregunta 1,Pregunta 2\n")


def test_rechaza_codificacion_no_utf8():
    with pytest.raises(ErrorCSV, match="UTF-8"):
        leer_csv("Opinión\nSí\n".encode("latin-1"))


def test_renombra_encabezados_duplicados():
    tabla, avisos = leer_csv(b"Edad,Edad\n20,30\n")
    assert list(tabla.columns) == ["Edad", "Edad (2)"]
    assert len(avisos) == 1


def test_descarta_filas_y_columnas_vacias():
    tabla, _ = leer_csv(b"A,B\n1,\n,\n2,\n")
    assert list(tabla.columns) == ["A"]
    assert len(tabla) == 2


def test_lee_la_encuesta_del_proyecto():
    tabla, _ = leer_csv((DATOS / "encuesta_ia.csv").read_bytes())
    assert len(tabla) == 40
    assert "¿En qué recinto cursas más asignaturas presenciales?" in tabla.columns
