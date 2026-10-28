#!/usr/bin/env bash
# Crea el entorno virtual e instala las dependencias (Linux y macOS).
set -euo pipefail
cd "$(dirname "$0")/.."

if ! python3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)"; then
    echo "Se necesita Python 3.11 o superior." >&2
    exit 1
fi

python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt
echo
echo "Instalación completa. Ejecuta ./scripts/iniciar.sh para abrir la aplicación."
