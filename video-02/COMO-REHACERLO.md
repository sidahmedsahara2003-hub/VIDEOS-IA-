# Cómo rehacer el vídeo 02 «No eres adicto al móvil» (Remotion)

Short vertical (1080×1920, 30 fps, unos 50 s) hecho con **Remotion**. El proyecto Remotion
de la serie está en `remotion/`; este vídeo es la composición `Movil` (y `MovilSinSubtitulos`).

## Archivos

| Archivo | Qué es |
|---|---|
| `video-02/guion.json` | El guion por escenas y cómo se muestran los números («noventa y seis» → «96») |
| `video-02/scripts/voz_escenas.py` | Genera un audio por escena y los subtítulos palabra a palabra → `remotion/public/movil/` |
| `video-02/scripts/finalizar.py` | Deja el audio del vídeo renderizado a −14 LUFS |
| `remotion/src/movil/Escenas.tsx` | Las 10 escenas, sincronizadas con la voz mediante `w("palabra")` |
| `remotion/src/movil/Movil.tsx` | La composición: escenas, audio, efectos, capítulos, subtítulos y música |
| `remotion/src/serie/` | Piezas reutilizables de la serie: fondo, personaje, panel split-flap, subtítulos |
| `remotion/src/Cierre.tsx` | El cierre con el logo (también se renderiza suelto como `Cierre`) |

## Rehacerlo (desde la raíz del repositorio)

Voz (provisional con Kokoro; con ElevenLabs: `VOZ=elevenlabs ELEVENLABS_VOICE=<id>`):

```bash
cd video-02 && MODELO=/ruta/a/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8 python3 scripts/voz_escenas.py
```

Render (unos 4 minutos cada versión):

```bash
cd remotion && npx remotion render Movil out/movil.mp4 && npx remotion render MovilSinSubtitulos out/movil-sin.mp4
```

Volumen final:

```bash
cd video-02 && python3 scripts/finalizar.py ../remotion/out/movil.mp4 video-FINAL.mp4 && python3 scripts/finalizar.py ../remotion/out/movil-sin.mp4 video-SIN-SUBTITULOS.mp4
```

Para ver y retocar el vídeo en directo: `cd remotion && npx remotion studio`.

## Notas

- La duración del vídeo sale sola de la voz (`calculateMetadata` lee `public/movil/timeline.json`).
  Si cambias la voz o una frase, las escenas se recolocan sin tocar el código.
- El navegador de render de Remotion se descarga de `remotion.media` (permitido en el entorno).
  En este entorno hace falta `NODE_USE_ENV_PROXY=1` la primera vez para que Node use el proxy.
- Las fuentes, efectos y música están dentro de `remotion/public/`: el render no depende de internet.
- Efectos de sonido: biblioteca de Remotion (`remotion.media`) y Pixabay (ver `video-01/sonidos`).
