"""Rutas de datos del usuario, independientes de dónde se ejecute la app."""

import os
from pathlib import Path

from platformdirs import user_data_dir

NOMBRE_APP = "AppGraficos"
# Permite usar otra carpeta de datos (pruebas o instalaciones portables).
VARIABLE_CARPETA = "APP_GRAFICOS_DATOS"


def carpeta_datos(base: Path | None = None) -> Path:
    """Devuelve la carpeta de datos del usuario y la crea si no existe."""
    if base is not None:
        carpeta = base
    elif os.environ.get(VARIABLE_CARPETA):
        carpeta = Path(os.environ[VARIABLE_CARPETA])
    else:
        carpeta = Path(user_data_dir(NOMBRE_APP, appauthor=False))
    carpeta.mkdir(parents=True, exist_ok=True)
    return carpeta


def carpeta_archivos(base: Path | None = None) -> Path:
    """Carpeta donde se guardan las copias de los CSV del historial."""
    carpeta = carpeta_datos(base) / "archivos"
    carpeta.mkdir(parents=True, exist_ok=True)
    return carpeta


def ruta_base_datos(base: Path | None = None) -> Path:
    """Ruta del archivo SQLite del historial."""
    return carpeta_datos(base) / "historial.db"
