from graficos import rutas


def test_variable_de_entorno_cambia_la_carpeta(tmp_path, monkeypatch):
    monkeypatch.setenv(rutas.VARIABLE_CARPETA, str(tmp_path / "datos"))
    assert rutas.ruta_base_datos() == tmp_path / "datos" / "historial.db"
    assert (tmp_path / "datos" / "archivos").is_dir() is False
    assert rutas.carpeta_archivos().is_dir()


def test_base_explicita_tiene_prioridad(tmp_path, monkeypatch):
    monkeypatch.setenv(rutas.VARIABLE_CARPETA, str(tmp_path / "otra"))
    assert rutas.carpeta_datos(tmp_path) == tmp_path
