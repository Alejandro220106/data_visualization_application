"""Exportación del gráfico actual como imagen PNG."""

import plotly.graph_objects as go


class ErrorExportacion(Exception):
    """No se pudo generar la imagen (normalmente falta un navegador para kaleido)."""


def exportar_png(figura: go.Figure, escala: int = 2) -> bytes:
    """Genera el PNG en memoria, sin escribir archivos temporales propios."""
    try:
        return figura.to_image(format="png", scale=escala, width=1200, height=700)
    except Exception as error:
        raise ErrorExportacion(
            "No se pudo generar el PNG. Kaleido necesita Google Chrome o Chromium instalado. "
            "Mientras tanto, usa el ícono de cámara de la barra del gráfico."
        ) from error
