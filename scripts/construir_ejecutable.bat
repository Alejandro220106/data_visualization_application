@echo off
rem Genera el ejecutable nativo de Windows en dist\AppGraficos\.
rem PyInstaller no compila de forma cruzada: este script solo produce el ejecutable de Windows.
setlocal
cd /d "%~dp0.."

if not exist ".venv\Scripts\python.exe" (
    echo No se encontro el entorno. Ejecuta primero scripts\instalar.bat
    exit /b 1
)
".venv\Scripts\python.exe" -m pip install -r requirements-dev.txt || exit /b 1
".venv\Scripts\python.exe" -m PyInstaller --noconfirm --clean --name AppGraficos ^
    --add-data "app.py:." ^
    --collect-all streamlit ^
    --collect-data kaleido ^
    --collect-data choreographer ^
    --collect-data plotly ^
    --copy-metadata streamlit --hidden-import kaleido ^
    lanzador.py || exit /b 1
echo.
echo Ejecutable generado en dist\AppGraficos\AppGraficos.exe
