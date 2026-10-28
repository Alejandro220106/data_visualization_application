import sqlite3

import pytest

from graficos.historial import Historial

CSV = "Pregunta\nSí\nNo\n".encode()


@pytest.fixture
def historial(tmp_path):
    return Historial(base=tmp_path)


def guardar(historial, nombre="Encuesta", contenido=CSV):
    return historial.guardar(nombre, "respuestas.csv", contenido, "Pregunta", "Barras")


def test_guarda_y_recupera(historial):
    analisis = historial.obtener(guardar(historial))
    assert analisis.nombre == "Encuesta"
    assert analisis.columna == "Pregunta"
    assert historial.leer_contenido(analisis) == CSV


def test_persiste_al_reabrir(tmp_path):
    guardar(Historial(base=tmp_path))
    assert len(Historial(base=tmp_path).listar()) == 1


def test_lista_del_mas_reciente_al_mas_antiguo(historial):
    guardar(historial, "Primero")
    guardar(historial, "Segundo")
    assert [a.nombre for a in historial.listar()] == ["Segundo", "Primero"]


def test_busca_por_nombre(historial):
    guardar(historial, "Encuesta de transporte")
    guardar(historial, "Satisfacción")
    assert [a.nombre for a in historial.listar("transp")] == ["Encuesta de transporte"]
    assert historial.listar("100%") == []


def test_deduplica_archivos_iguales(historial, tmp_path):
    guardar(historial, "A")
    guardar(historial, "B")
    assert len(list((tmp_path / "archivos").iterdir())) == 1


def test_elimina_archivo_solo_si_no_se_usa(historial, tmp_path):
    primero = guardar(historial, "A")
    segundo = guardar(historial, "B")
    historial.eliminar(primero)
    assert len(list((tmp_path / "archivos").iterdir())) == 1
    historial.eliminar(segundo)
    assert list((tmp_path / "archivos").iterdir()) == []
    assert historial.listar() == []


def test_eliminar_inexistente_no_falla(historial):
    historial.eliminar(999)


def test_registra_version_del_esquema(historial, tmp_path):
    conexion = sqlite3.connect(tmp_path / "historial.db")
    try:
        assert conexion.execute("SELECT MAX(version) FROM version_esquema").fetchone()[0] == 1
    finally:
        conexion.close()
