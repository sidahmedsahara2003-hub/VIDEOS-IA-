# Cómo rehacer el vídeo «No te falta disciplina, te falta un plan»

Short vertical (1080×1920, 30 fps, unos 55 s) hecho con HyperFrames, con la voz del
autor transformada. Todo se genera con scripts.

## Archivos

| Archivo | Qué es |
|---|---|
| `grabacion/mi-voz-3.m4a` | La grabación definitiva (la más limpia: 40 dB de señal/ruido) |
| `scripts/montar_voz.py` | Corta las tomas buenas, quita titubeos y silencios, saca el tiempo de cada palabra y transforma la voz → `voz.wav`, `palabras.json`, `guion.txt` |
| `scripts/transformar.py` | Cambia el tono y el timbre de la voz (vocoder WORLD) y le da acabado de locutor |
| `scripts/transcribir.py` | Transcribe una grabación entera con Parakeet (para ver qué se dice y dónde) |
| `scripts/generar.mjs` + `scripts/runtime.js` | Escriben la composición HyperFrames (`proyecto/`) y la lista de efectos |
| `scripts/mezcla.py` | Música + efectos + voz → `proyecto/assets/mezcla.wav` a −14 LUFS |
| `sonidos/` | Efectos (Pixabay, licencia libre) |
| `GUION-PARA-GRABAR.md` | El texto para grabar, con consejos |

## Requisitos (una vez)

```bash
pip install kokoro-onnx soundfile librosa pyworld "setuptools<81" sherpa-onnx
```

```bash
npm install --prefix scripts
```

Modelo de reconocimiento de voz Parakeet (se descarga de GitHub, unos 490 MB):

```bash
curl -L -o parakeet.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8.tar.bz2 && tar xjf parakeet.tar.bz2
```

## Rehacerlo todo (desde la carpeta `video-01`)

```bash
MODELO=/ruta/a/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8 python3 scripts/montar_voz.py
```

```bash
node scripts/generar.mjs && python3 scripts/mezcla.py
```

```bash
cd proyecto && npx hyperframes check && npx hyperframes render -q delivery -o ../video-FINAL.mp4
```

Sin subtítulos (y después vuelve a generar la versión con subtítulos):

```bash
node scripts/generar.mjs --sin-subtitulos && (cd proyecto && npx hyperframes render -q delivery -o ../video-SIN-SUBTITULOS.mp4) && node scripts/generar.mjs
```

## Si cambias algo

- **Otra grabación:** ponla en `grabacion/`, transcríbela con `scripts/transcribir.py` para ver
  los tiempos de cada toma y actualiza la lista `TOMAS` de `scripts/montar_voz.py`
  (inicio, fin, pausa y el texto que se dice).
- **Cuánto cambia la voz:** `TONO` y `TIMBRE` al principio de `scripts/montar_voz.py`.
  0,86 y 0,93 es la versión «media»; más cerca de 1 = más parecida a la voz original.
- **Animaciones:** están atadas a palabras con `P("palabra", n)` en `scripts/generar.mjs`.
  Si una palabra deja de decirse, el generador avisa con su nombre.
- **El render tarda unos 35 minutos** por los desenfoques del fondo y el efecto cristal.
