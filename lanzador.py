"""Punto de entrada del ejecutable generado con PyInstaller.

Arranca Streamlit desde el código y abre la aplicación en el navegador.
"""

import socket
import sys
import threading
import time
import webbrowser
from pathlib import Path

from streamlit.web import cli

# Importaciones explícitas para que PyInstaller incluya los módulos que app.py usa
# en tiempo de ejecución (Streamlit ejecuta app.py como script y PyInstaller no lo analiza).
import graficos.carga_csv  # noqa: F401
import graficos.exportacion  # noqa: F401
import graficos.historial  # noqa: F401
import graficos.visualizacion  # noqa: F401

PUERTO = 8501
URL = f"http://localhost:{PUERTO}"


def ruta_app() -> Path:
    """Ubicación de app.py, tanto en desarrollo como dentro del ejecutable."""
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).parent))
    return base / "app.py"


def abrir_navegador_cuando_este_listo(espera_maxima: float = 60) -> None:
    """Abre el navegador en cuanto el servidor acepta conexiones."""
    limite = time.monotonic() + espera_maxima
    while time.monotonic() < limite:
        try:
            with socket.create_connection(("localhost", PUERTO), timeout=1):
                webbrowser.open(URL)
                return
        except OSError:
            time.sleep(0.5)


def main() -> None:
    # En modo headless Streamlit no pregunta por un email en la consola;
    # por eso el navegador se abre desde aquí.
    threading.Thread(target=abrir_navegador_cuando_este_listo, daemon=True).start()
    sys.argv = [
        "streamlit",
        "run",
        str(ruta_app()),
        "--global.developmentMode=false",
        "--server.headless=true",
        f"--server.port={PUERTO}",
        "--browser.gatherUsageStats=false",
        "--client.toolbarMode=minimal",
        "--theme.primaryColor=#2563eb",
    ]
    sys.exit(cli.main())


if __name__ == "__main__":
    main()
