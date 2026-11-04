# Cómo rehacer el vídeo «El deporte en tu día a día»

Short vertical (1080×1920, 30 fps, 47 s) hecho con HyperFrames. Todo se genera
con scripts: si cambias una frase del guion o la voz, se rehace solo.

## Archivos

| Archivo | Qué es |
|---|---|
| `guion.txt` | El texto que dice la voz (sin saltos de línea dentro de una frase) |
| `scripts/voz.py` | Genera `voz.wav` con Kokoro (voz `em_alex`, velocidad 0,95), frase a frase con pausas de 0,25 s, y la limpia |
| `scripts/tiempos.py` | Saca el momento exacto de cada palabra → `palabras.json` |
| `scripts/generar.mjs` | Escribe la composición HyperFrames (`proyecto/`) y la lista de efectos (`sonido.json`) |
| `scripts/runtime.js` | Motor de cada fotograma: cámara, personajes articulados, rejilla con paralaje |
| `scripts/mezcla.py` | Música de fondo + efectos + voz → `proyecto/assets/mezcla.wav` a −14 LUFS |
| `sonidos/` | Efectos de sonido (Pixabay, licencia libre; ver `CREDITOS-pixabay.md`) |

## Requisitos (una vez)

```bash
pip install kokoro-onnx soundfile librosa
npm install --prefix scripts
npx hyperframes skills
```

`npx hyperframes tts` descarga el modelo de Kokoro la primera vez.

## Rehacerlo todo (desde la carpeta `video-01`)

```bash
python3 scripts/voz.py
python3 scripts/tiempos.py
node scripts/generar.mjs
python3 scripts/mezcla.py
```

```bash
cd proyecto && npx hyperframes check
```

Vídeo con subtítulos:

```bash
cd proyecto && npx hyperframes render -q delivery -o ../video-FINAL.mp4
```

Vídeo sin subtítulos (vuelve a generar después la versión con subtítulos):

```bash
node scripts/generar.mjs --sin-subtitulos && (cd proyecto && npx hyperframes render -q delivery -o ../video-SIN-SUBTITULOS.mp4) && node scripts/generar.mjs
```

Prueba rápida de un tramo (por ejemplo, los primeros 9 s):

```bash
cd proyecto && npx hyperframes render --end 9 -o ../prueba.mp4
```

## Si cambias algo

- **Una frase del guion:** edita `guion.txt` y corre los cuatro scripts. Las animaciones
  están atadas a palabras con `P("palabra", n)` (n = qué vez se dice). Si quitas una palabra
  que usa una animación, `generar.mjs` avisa con el nombre de la palabra que falta.
- **La velocidad de la voz:** cambia `SPEED` en `scripts/voz.py` **y** en `scripts/tiempos.py`.
- **Colores, textos de las tarjetas o tiempos de cámara:** en `scripts/generar.mjs`
  (paleta `C` al principio; cada escena tiene su bloque).
- **Volumen de la música o de los efectos:** `volume=0.10` de la música en `scripts/mezcla.py`;
  cada efecto tiene su volumen en el bloque «EFECTOS DE SONIDO» de `generar.mjs`.

## Notas

- Los tiempos de cada palabra no salen de una transcripción con Whisper, porque la red del
  entorno bloqueaba huggingface.co. `tiempos.py` alinea cada frase con la misma voz dicha
  palabra a palabra. El margen de error es de unos 0,06 s y las 137 palabras coinciden con el guion.
- La música está generada por código en `mezcla.py`, porque las fuentes de música en línea
  estaban bloqueadas. Si prefieres otra, guárdala como `musica.wav` y quita su generación en el script.
- GSAP va dentro del proyecto (`proyecto/assets/gsap.min.js`) para que el render no dependa de internet.
