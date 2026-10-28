@echo off
rem Crea el entorno virtual e instala las dependencias (Windows).
setlocal
cd /d "%~dp0.."

rem Prefiere versiones con ruedas precompiladas de todas las dependencias.
set "PYTHON="
for %%v in (3.13 3.12 3.11 3.14) do (
    if not defined PYTHON py -%%v -c "" >nul 2>nul && set "PYTHON=py -%%v"
)
if not defined PYTHON (
    python -c "import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)" >nul 2>nul && set "PYTHON=python"
)
if not defined PYTHON (
    echo Se necesita Python 3.11 o superior. Descargalo desde https://www.python.org/downloads/
    exit /b 1
)

echo Usando %PYTHON%
%PYTHON% -m venv .venv || goto :error
".venv\Scripts\python.exe" -m pip install --upgrade pip || goto :error
".venv\Scripts\python.exe" -m pip install -r requirements.txt || goto :error
echo.
echo Instalacion completa. Ejecuta scripts\iniciar.bat para abrir la aplicacion.
exit /b 0

:error
echo La instalacion fallo. Revisa los mensajes anteriores.
exit /b 1
