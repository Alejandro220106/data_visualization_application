#!/usr/bin/env bash
# Abre la aplicación en el navegador (Linux y macOS).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -x .venv/bin/python ]; then
    echo "No se encontró el entorno. Ejecuta primero ./scripts/instalar.sh" >&2
    exit 1
fi
exec .venv/bin/python -m streamlit run app.py
