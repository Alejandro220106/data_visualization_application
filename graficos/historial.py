"""Historial local de análisis: metadatos en SQLite y copias de los CSV en disco."""

import hashlib
import sqlite3
import uuid
from collections.abc import Iterator
from contextlib import closing, contextmanager
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from graficos import rutas

ESQUEMA_V1 = """
CREATE TABLE IF NOT EXISTS analisis (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre           TEXT    NOT NULL,
    archivo_original TEXT    NOT NULL,
    archivo_guardado TEXT    NOT NULL,
    hash_sha256      TEXT    NOT NULL,
    columna          TEXT    NOT NULL,
    tipo_grafico     TEXT    NOT NULL,
    creado_en        TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_analisis_hash ON analisis (hash_sha256);
"""


@dataclass(frozen=True)
class Analisis:
    id: int
    nombre: str
    archivo_original: str
    archivo_guardado: str
    hash_sha256: str
    columna: str
    tipo_grafico: str
    creado_en: str


class Historial:
    """Guarda, lista, recupera y elimina análisis anteriores."""

    def __init__(self, base: Path | None = None):
        self._ruta_db = rutas.ruta_base_datos(base)
        self._carpeta = rutas.carpeta_archivos(base)
        self._migrar()

    def guardar(
        self, nombre: str, archivo_original: str, contenido: bytes, columna: str, tipo_grafico: str
    ) -> int:
        """Registra un análisis; si el CSV ya estaba guardado, reutiliza su copia."""
        huella = hashlib.sha256(contenido).hexdigest()
        with self._transaccion() as conexion:
            fila = conexion.execute(
                "SELECT archivo_guardado FROM analisis WHERE hash_sha256 = ? LIMIT 1", (huella,)
            ).fetchone()
            if fila and (self._carpeta / fila["archivo_guardado"]).exists():
                archivo_guardado = fila["archivo_guardado"]
            else:
                archivo_guardado = f"{uuid.uuid4().hex}.csv"
                (self._carpeta / archivo_guardado).write_bytes(contenido)
            cursor = conexion.execute(
                """INSERT INTO analisis (nombre, archivo_original, archivo_guardado, hash_sha256,
                                         columna, tipo_grafico, creado_en)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    nombre.strip() or archivo_original,
                    archivo_original,
                    archivo_guardado,
                    huella,
                    columna,
                    tipo_grafico,
                    datetime.now().isoformat(timespec="seconds"),
                ),
            )
            return cursor.lastrowid

    def listar(self, busqueda: str = "") -> list[Analisis]:
        """Análisis ordenados del más reciente al más antiguo, filtrados por nombre."""
        with self._transaccion() as conexion:
            filas = conexion.execute(
                r"""SELECT * FROM analisis WHERE nombre LIKE ? ESCAPE '\'
                    ORDER BY creado_en DESC, id DESC""",
                (f"%{_escapar_like(busqueda.strip())}%",),
            ).fetchall()
        return [Analisis(**dict(fila)) for fila in filas]

    def obtener(self, id_analisis: int) -> Analisis | None:
        with self._transaccion() as conexion:
            fila = conexion.execute(
                "SELECT * FROM analisis WHERE id = ?", (id_analisis,)
            ).fetchone()
        return Analisis(**dict(fila)) if fila else None

    def leer_contenido(self, analisis: Analisis) -> bytes:
        """Contenido del CSV guardado; FileNotFoundError si la copia se borró a mano."""
        return (self._carpeta / analisis.archivo_guardado).read_bytes()

    def eliminar(self, id_analisis: int) -> None:
        """Borra el análisis y su CSV si ningún otro análisis lo usa."""
        with self._transaccion() as conexion:
            fila = conexion.execute(
                "SELECT archivo_guardado FROM analisis WHERE id = ?", (id_analisis,)
            ).fetchone()
            if fila is None:
                return
            conexion.execute("DELETE FROM analisis WHERE id = ?", (id_analisis,))
            en_uso = conexion.execute(
                "SELECT 1 FROM analisis WHERE archivo_guardado = ? LIMIT 1",
                (fila["archivo_guardado"],),
            ).fetchone()
        # El archivo se borra solo después de confirmar la transacción.
        if not en_uso:
            (self._carpeta / fila["archivo_guardado"]).unlink(missing_ok=True)

    @contextmanager
    def _transaccion(self) -> Iterator[sqlite3.Connection]:
        """Abre una conexión, confirma o revierte al salir y siempre la cierra."""
        with closing(sqlite3.connect(self._ruta_db)) as conexion, conexion:
            conexion.row_factory = sqlite3.Row
            yield conexion

    def _migrar(self) -> None:
        with self._transaccion() as conexion:
            conexion.execute(
                "CREATE TABLE IF NOT EXISTS version_esquema (version INTEGER NOT NULL)"
            )
            version = conexion.execute("SELECT MAX(version) FROM version_esquema").fetchone()[0]
            if (version or 0) < 1:
                conexion.executescript(ESQUEMA_V1)
                conexion.execute("INSERT INTO version_esquema (version) VALUES (1)")
            # Las migraciones futuras se agregan aquí: if version < 2: ...


def _escapar_like(texto: str) -> str:
    return texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
