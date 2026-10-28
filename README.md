# Visualizador de respuestas

Aplicación local en Python para graficar las respuestas de un formulario de Google Forms. Importas el CSV descargado de Google Sheets, eliges una pregunta y la app muestra el gráfico más adecuado, que puedes cambiar por otro compatible, exportar como PNG y guardar en un historial local.

Se ejecuta en tu equipo y se abre en el navegador (`http://localhost:8501`). No se publica en Internet y los datos no salen de tu computadora.

## Requisitos

- Python 3.11 o superior ([python.org](https://www.python.org/downloads/)).
- Google Chrome o Chromium, solo para exportar PNG (lo usa `kaleido`).
- Un monitor de escritorio. La interfaz se adapta a distintas resoluciones, pero no está pensada para teléfonos.

## Instalación y uso

| Sistema | Instalar (una sola vez) | Abrir la app |
|---|---|---|
| Windows | `scripts\instalar.bat` | `scripts\iniciar.bat` |
| Linux / macOS | `./scripts/instalar.sh` | `./scripts/iniciar.sh` |

1. En Google Sheets: **Archivo → Descargar → Valores separados por comas (.csv)**.
2. Abre la app y sube el archivo desde la barra lateral.
3. Elige la pregunta y, si quieres, otro tipo de gráfico.
4. Usa **Generar PNG** para descargar la imagen o **Guardar en historial** para recuperarla después.

## Cómo elige el gráfico

| Tipo de pregunta | Ejemplo | Gráfico sugerido | Alternativas |
|---|---|---|---|
| Opción única | Medio de transporte | Barras | Barras horizontales, pastel (hasta 6 opciones) |
| Casillas (varias opciones) | Lenguajes que conoces | Barras horizontales | Barras |
| Escala lineal (0–10) | Satisfacción 1–5 | Barras | Histograma, caja |
| Numérica | Edad | Histograma | Caja |
| Respuesta abierta | Comentarios | No se grafica | — |

En las preguntas de casillas, Google Forms guarda las opciones juntas (`"Python, Java"`). La app las separa y cuenta cada una; por eso los porcentajes pueden sumar más de 100 %.

## Dónde se guardan los datos

El historial (`historial.db`) y las copias de los CSV se guardan en la carpeta de datos del usuario, no junto al programa:

| Sistema | Carpeta |
|---|---|
| Windows | `%LOCALAPPDATA%\AppGraficos` |
| macOS | `~/Library/Application Support/AppGraficos` |
| Linux | `~/.local/share/AppGraficos` |

Para usar otra carpeta, define la variable de entorno `APP_GRAFICOS_DATOS`. Actualizar la aplicación no borra el historial.

## Ejecutables nativos (opcional)

Para distribuir la app sin que el usuario instale Python:

| Sistema | Comando | Resultado |
|---|---|---|
| Windows | `scripts\construir_ejecutable.bat` | `dist\AppGraficos\AppGraficos.exe` |
| Linux / macOS | `./scripts/construir_ejecutable.sh` | `dist/AppGraficos/AppGraficos` |

**PyInstaller no compila de forma cruzada**: el `.exe` se genera en Windows, el binario de Linux en Linux y el de macOS en macOS. Prueba cada ejecutable en su sistema antes de distribuirlo. Para entregarlo, comprime la carpeta `dist/AppGraficos/` completa.

## Desarrollo

```bash
pip install -r requirements-dev.txt
pytest
ruff check .
ruff format --check .
```

```
app.py              Interfaz Streamlit
graficos/           Lógica sin dependencia de la interfaz
  carga_csv.py      Lectura y validación del CSV
  tipos.py          Detección del tipo de pregunta
  visualizacion.py  Gráficos Plotly y tabla de frecuencias
  exportacion.py    Exportación a PNG
  historial.py      Historial en SQLite
  rutas.py          Carpeta de datos del usuario
lanzador.py         Entrada del ejecutable de PyInstaller
scripts/            Instalación, inicio y construcción por plataforma
tests/              Pruebas con pytest (incluye un CSV de ejemplo)
```

## Limitaciones

- Solo se aceptan CSV en UTF-8, que es como los exporta Google Sheets. Si abres el archivo en Excel y lo vuelves a guardar, puede cambiar la codificación o el separador.
- Se muestra un gráfico a la vez.
- Exportar PNG necesita Chrome o Chromium; si no están, usa el ícono de cámara de la barra del gráfico.
