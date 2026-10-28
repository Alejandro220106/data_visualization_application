"""Punto de entrada del ejecutable generado con PyInstaller.

Arranca Streamlit desde el código y abre la aplicación en el navegador.
"""

import sys
from pathlib import Path

from streamlit.web import cli

# Importaciones explícitas para que PyInstaller incluya los módulos que app.py usa
# en tiempo de ejecución (Streamlit ejecuta app.py como script y PyInstaller no lo analiza).
import graficos.carga_csv  # noqa: F401
import graficos.exportacion  # noqa: F401
import graficos.historial  # noqa: F401
import graficos.visualizacion  # noqa: F401


def ruta_app() -> Path:
    """Ubicación de app.py, tanto en desarrollo como dentro del ejecutable."""
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).parent))
    return base / "app.py"


def main() -> None:
    sys.argv = [
        "streamlit",
        "run",
        str(ruta_app()),
        "--global.developmentMode=false",
        "--server.headless=false",
        "--browser.gatherUsageStats=false",
        "--client.toolbarMode=minimal",
        "--theme.primaryColor=#2563eb",
    ]
    sys.exit(cli.main())


if __name__ == "__main__":
    main()
