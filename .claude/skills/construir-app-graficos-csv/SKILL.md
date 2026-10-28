---
name: construir-app-graficos-csv
description: Construye desde cero la aplicación local en Python (Streamlit + Pandas + Plotly + SQLite) que importa CSV de respuestas de Google Forms, muestra un gráfico configurable, guarda un historial local y se distribuye en Windows, Linux y macOS. Usar cuando se pida desarrollar, ampliar o corregir esta aplicación de visualización.
---

# Rol

Actúas como ingeniero de software senior en Python. Construyes una aplicación **sencilla, confiable y fácil de ejecutar**. No agregues funciones que no estén en esta especificación; si algo es ambiguo, elige la opción más simple y documéntala en el README.

# Objetivo

Aplicación local que:

1. Importa manualmente un CSV descargado de Google Sheets (respuestas de Google Forms).
2. Permite elegir **una** columna (pregunta) y muestra **un único** gráfico interactivo.
3. Detecta el tipo de dato, sugiere el gráfico adecuado y permite cambiarlo por otro compatible.
4. Guarda un historial local persistente de archivos y análisis, recuperable y eliminable.
5. Exporta el gráfico actual como PNG.

# Decisiones cerradas (no cambiar)

| Tema | Decisión |
|---|---|
| Lenguaje | Python **3.11+** |
| Interfaz | Streamlit, ejecutada en local (`http://localhost:8501`), abierta en el navegador. No se publica en Internet. |
| Datos | Pandas, CSV importado manualmente. Sin API de Google ni credenciales. |
| Gráficos | Plotly (`plotly.express`). Exportación PNG con `kaleido`. |
| Historial | SQLite (módulo `sqlite3` de la biblioteca estándar) + copia del CSV en una carpeta del usuario. |
| Ruta de datos | Carpeta del usuario obtenida con `platformdirs.user_data_dir("AppGraficos")`, **nunca** junto al ejecutable. |
| Dispositivos | Solo escritorio, responsivo a distintos monitores y resoluciones. No optimizar para móvil. |
| Idioma | **Todo en español**: interfaz, nombres de variables y funciones, comentarios, docstrings y README. |
| Calidad | `pytest` + `ruff` (lint y formato). |
| Privacidad | Los datos no se envían a servicios externos. Desactivar la telemetría de Streamlit (`gatherUsageStats = false`). No escribir respuestas en logs. |

# Estructura del proyecto

```
data_visualization_application/
├── app.py                      # punto de entrada Streamlit (solo UI)
├── graficos/
│   ├── __init__.py
│   ├── carga_csv.py            # lectura y validación del CSV
│   ├── tipos.py                # detección del tipo de columna
│   ├── visualizacion.py        # construcción de figuras Plotly
│   ├── historial.py            # SQLite + archivos guardados
│   └── rutas.py                # rutas con platformdirs
├── lanzador.py                 # arranque para el ejecutable de PyInstaller
├── .streamlit/config.toml      # tema y gatherUsageStats = false
├── tests/
│   ├── datos/                  # CSV de ejemplo tipo Google Forms
│   ├── test_carga_csv.py
│   ├── test_tipos.py
│   ├── test_visualizacion.py
│   └── test_historial.py
├── scripts/
│   ├── instalar.bat / iniciar.bat           # Windows
│   ├── instalar.sh  / iniciar.sh            # Linux y macOS
│   └── construir_ejecutable.bat / .sh       # PyInstaller por plataforma
├── requirements.txt            # versiones fijadas (==)
├── requirements-dev.txt        # pytest, ruff, pyinstaller
├── pyproject.toml              # configuración de ruff y pytest
└── README.md
```

La lógica vive en `graficos/` y **no importa Streamlit**, para poder probarla con pytest. `app.py` solo arma la interfaz y llama a esas funciones.

# Requisitos funcionales

## 1. Carga del CSV (`carga_csv.py`)
- Un `st.file_uploader` que acepta solo `.csv`.
- Leer en UTF-8, que es como exporta Google Sheets. Si falla la decodificación, mostrar un error claro en español.
- Validar: que el archivo no esté vacío, que tenga encabezados y al menos una fila de datos, y que no haya encabezados duplicados (en ese caso, renombrarlos con un sufijo y avisar).
- Ignorar las filas y columnas completamente vacías.
- Ante cualquier error, mostrar un `st.error` comprensible; nunca un traceback.

## 2. Respuestas múltiples (casillas de verificación)
Google Forms exporta las preguntas de casillas como `"Opción A, Opción B"` en una sola celda.
- Detectar la columna como **multirespuesta** cuando una proporción significativa de sus celdas contiene `", "` y los fragmentos se repiten entre filas.
- Separar por `", "`, quitar espacios y contar cada opción por separado (`str.split` + `explode`).
- Indicar en la interfaz que los porcentajes se calculan sobre el número de respuestas, por lo que pueden sumar más de 100 %.

## 3. Detección del tipo (`tipos.py`)
Devolver uno de estos tipos con una función pura `detectar_tipo(serie) -> TipoColumna`:

| Tipo | Regla | Gráfico sugerido | Alternativas |
|---|---|---|---|
| `CATEGORICA` | texto con pocas categorías únicas | Barras | Barras horizontales, Pastel/dona (solo si ≤ 6 categorías) |
| `MULTIRESPUESTA` | ver sección 2 | Barras horizontales | Barras |
| `NUMERICA` | convertible a número y con muchos valores distintos | Histograma | Caja |
| `ESCALA` | enteros con pocos valores (p. ej. 1–5, 1–10) | Barras (ordenadas por valor) | Histograma, Caja |
| `TEXTO_LIBRE` | casi todos los valores son únicos | Ninguno: mostrar el aviso "Esta pregunta tiene respuestas abiertas y no se puede graficar" | — |

Los umbrales deben ser constantes con nombre, al inicio del módulo.

## 4. Visualización (`visualizacion.py`)
- Función `crear_figura(serie, tipo, tipo_grafico) -> go.Figure`.
- Tipos permitidos: barras, barras horizontales, pastel/dona, histograma, caja. Nada más.
- Título = texto de la pregunta (encabezado de la columna), ejes en español, conteo y porcentaje en el *hover*.
- Barras de categorías ordenadas de mayor a menor; las de escala, por valor.
- Ignorar los valores vacíos y mostrar "N respuestas válidas de M".
- Paleta sobria y consistente; la figura ocupa todo el ancho (`use_container_width=True`).

## 5. Exportación PNG
- Botón "Descargar PNG" (`st.download_button`) que genera la imagen con `fig.to_image(format="png", scale=2)` mediante kaleido, en memoria y sin escribir archivos temporales.
- Si kaleido falla, mostrar un aviso y sugerir el botón de cámara de la barra de Plotly.

## 6. Historial (`historial.py`)
Al guardar un análisis se copia el CSV a `<user_data_dir>/archivos/<uuid>.csv` y se registra en `<user_data_dir>/historial.db`.

Esquema mínimo:

```sql
CREATE TABLE IF NOT EXISTS analisis (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre          TEXT    NOT NULL,
    archivo_original TEXT   NOT NULL,   -- nombre del CSV subido
    archivo_guardado TEXT   NOT NULL,   -- ruta relativa en archivos/
    hash_sha256     TEXT    NOT NULL,   -- evita guardar duplicados
    columna         TEXT    NOT NULL,
    tipo_grafico    TEXT    NOT NULL,
    creado_en       TEXT    NOT NULL    -- ISO 8601
);
CREATE TABLE IF NOT EXISTS version_esquema (version INTEGER NOT NULL);
```

- **Guardar**: el botón "Guardar en historial" pide un nombre (por defecto, el del archivo y la fecha). Si el hash ya existe, reutilizar el archivo guardado.
- **Listar**: en la barra lateral, ordenado por fecha descendente, con búsqueda por nombre.
- **Recuperar**: carga el CSV guardado, selecciona la columna y el tipo de gráfico, y regenera la figura.
- **Eliminar**: pedir confirmación. Borrar el registro y, si ningún otro análisis usa el archivo, borrar también el CSV. Hacer ambas cosas en una transacción coherente.
- Usar consultas parametrizadas (nunca formatear SQL con f-strings) y `with sqlite3.connect(...)`.
- Migraciones: comprobar `version_esquema` al iniciar, para que actualizar la app no borre el historial.

# Interfaz y diseño

- `st.set_page_config(layout="wide", page_title="Visualizador de respuestas")`.
- **Barra lateral**: carga del archivo e historial (buscar, recuperar, eliminar).
- **Área principal**: encabezado con el nombre del archivo y el número de respuestas; fila de controles (`st.columns`) con el selector de pregunta y el selector de tipo de gráfico (solo los compatibles, con el sugerido preseleccionado); el gráfico a todo el ancho; y debajo los botones Descargar PNG y Guardar en historial.
- Estados visibles: vacío ("Sube un CSV para empezar"), cargando (`st.spinner`), error (`st.error`) y columna no graficable (`st.info`).
- Nada de anchos fijos en píxeles; el diseño debe verse bien de 1280×720 a 2560×1440.
- Usar `st.session_state` para mantener la selección entre interacciones y `st.cache_data` para el parseo del CSV.

# Distribución multiplataforma

1. **Proyecto portable** (vía principal):
   - `instalar.*` crea un `.venv` e instala `requirements.txt`.
   - `iniciar.*` activa el entorno y ejecuta `streamlit run app.py`.
   - Los scripts `.sh` deben ser ejecutables (`chmod +x`) y usar `python3`.
2. **Ejecutables nativos** (opcional, documentado):
   - `lanzador.py` arranca Streamlit desde el código (`streamlit.web.cli`) y abre el navegador.
   - `construir_ejecutable.*` ejecuta PyInstaller con los `--collect-data`/`--copy-metadata` que necesitan streamlit y plotly.
   - El README debe dejar claro que **PyInstaller no compila de forma cruzada**: el `.exe` se genera en Windows, el binario de Linux en Linux y el `.app` en macOS, y cada uno se prueba en su sistema.

# Pruebas y calidad

- `pytest` cubre como mínimo: CSV válido, vacío, sin filas y con encabezados duplicados; la detección de cada `TipoColumna`; la separación de multirespuesta; que `crear_figura` devuelva el tipo de traza correcto; y guardar, listar, recuperar, eliminar y deduplicar en el historial (usando `tmp_path` para la base de datos, nunca la carpeta real del usuario).
- Incluir en `tests/datos/` un CSV de ejemplo con el formato de Google Forms: columna "Marca temporal", una pregunta de opción única, una de casillas, una escala 1–5, una numérica y una de texto libre.
- `ruff check .` y `ruff format --check .` deben pasar sin errores.

# Orden de trabajo

1. Estructura, `pyproject.toml`, requirements y `rutas.py`.
2. `carga_csv.py` y `tipos.py` con sus pruebas.
3. `visualizacion.py` con sus pruebas.
4. `historial.py` con sus pruebas.
5. `app.py` (interfaz) y `.streamlit/config.toml`.
6. Scripts de instalación, inicio y construcción, y `lanzador.py`.
7. README: requisitos, instalación por sistema, uso, dónde se guardan los datos, cómo construir los ejecutables y limitaciones.
8. Verificación final: `pytest`, `ruff`, y arrancar la app con el CSV de ejemplo para comprobar cada tipo de gráfico, el PNG y el historial.

# Control de versiones

Haz **un commit por cada integración pequeña**; nunca acumules varias piezas en un solo commit. Cada commit debe dejar el repositorio funcionando (las pruebas existentes pasan).

- Un commit por pieza: estructura y configuración, `rutas.py`, `carga_csv.py` + su prueba, `tipos.py` + su prueba, multirespuesta, `visualizacion.py`, exportación PNG, `historial.py`, cada parte de la interfaz, cada script de plataforma, `lanzador.py`, README.
- El código y su prueba van en el mismo commit; no mezcles en ese commit cambios ajenos.
- Mensajes en español, en imperativo y breves (por ejemplo, `Agregar detección de columnas multirespuesta`).
- **Sin firmas de IA**: no añadas `Co-Authored-By`, "Generated with Claude Code" ni ninguna otra atribución a Claude o a otra IA en commits, PRs, issues, código ni documentación.
- Trabaja en una rama por funcionalidad (`feat/historial`, `feat/exportar-png`…) y fusiónala en `main` al terminarla.

# Criterios de aceptación

- [ ] `iniciar` abre la app en el navegador en Windows, Linux y macOS con Python 3.11+.
- [ ] Al subir el CSV de ejemplo se listan las preguntas y cada una muestra el gráfico sugerido.
- [ ] Las casillas múltiples se cuentan por opción individual.
- [ ] Solo se ofrecen tipos de gráfico compatibles con la columna.
- [ ] El PNG se descarga correctamente.
- [ ] Un análisis guardado sigue disponible después de cerrar y reabrir la app, y se puede recuperar y eliminar.
- [ ] Los errores se muestran en español, sin tracebacks.
- [ ] `pytest` y `ruff` pasan.
