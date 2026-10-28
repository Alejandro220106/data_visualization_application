@echo off
rem Abre la aplicacion en el navegador (Windows).
setlocal
cd /d "%~dp0.."

if not exist ".venv\Scripts\python.exe" (
    echo No se encontro el entorno. Ejecuta primero scripts\instalar.bat
    exit /b 1
)
".venv\Scripts\python.exe" -m streamlit run app.py
