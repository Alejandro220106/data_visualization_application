#!/usr/bin/env bash
# Genera el ejecutable nativo de Linux o macOS en dist/AppGraficos/.
# PyInstaller no compila de forma cruzada: ejecútalo en el sistema de destino.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -x .venv/bin/python ]; then
    echo "No se encontró el entorno. Ejecuta primero ./scripts/instalar.sh" >&2
    exit 1
fi
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m PyInstaller --noconfirm --clean --name AppGraficos \
    --add-data "app.py:." \
    --collect-all streamlit \
    --collect-all kaleido \
    --collect-all choreographer \
    --collect-data plotly \
    --copy-metadata streamlit \
    lanzador.py
echo
echo "Ejecutable generado en dist/AppGraficos/"
