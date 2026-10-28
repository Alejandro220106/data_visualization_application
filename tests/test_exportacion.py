from unittest.mock import MagicMock

import plotly.graph_objects as go
import pytest

from graficos.exportacion import ErrorExportacion, exportar_png

FIRMA_PNG = b"\x89PNG\r\n\x1a\n"


def test_exporta_png():
    figura = go.Figure(go.Bar(x=["A", "B"], y=[1, 2]))
    try:
        imagen = exportar_png(figura)
    except ErrorExportacion:
        pytest.skip("Kaleido no encontró un navegador en este equipo")
    assert imagen.startswith(FIRMA_PNG)


def test_error_de_kaleido_tiene_mensaje_claro():
    figura = MagicMock()
    figura.to_image.side_effect = RuntimeError("Chrome not found")
    with pytest.raises(ErrorExportacion, match="Chrome"):
        exportar_png(figura)
