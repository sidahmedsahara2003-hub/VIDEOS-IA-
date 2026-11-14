#!/usr/bin/env bash
# Monta un vídeo de la serie de principio a fin.
# Uso: herramientas/montar.sh video-03 apilar Apilar
#   1) voz natural (Chatterbox es-ES + edición) → <video>/voz-natural/
#   2) tiempos de cada palabra (Parakeet)      → remotion/public/<carpeta>/
#   3) render con y sin subtítulos (Remotion)
#   4) volumen final −14 LUFS                  → <video>/video-FINAL.mp4 y video-SIN-SUBTITULOS.mp4
set -euo pipefail
VIDEO=$1; CARPETA=$2; COMP=$3
RAIZ=$(cd "$(dirname "$0")/.." && pwd)
PY_VOZ=${PY_VOZ:-/root/venv-voz/bin/python}
MODELO=${MODELO:-$(ls -d /root/.cache/modelos/sherpa-onnx-nemo-parakeet* | head -1)}
NAVEGADOR=${NAVEGADOR:-/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell}
cd "$RAIZ"
[ "${SIN_VOZ:-0}" = 1 ] || "$PY_VOZ" herramientas/voz_natural.py "$VIDEO/voz-natural" "$VIDEO/guion.json"
MODELO=$MODELO VOZ=natural python3 herramientas/voz_escenas.py "$VIDEO" "$CARPETA"
cd remotion
npx remotion render "$COMP" "out/$CARPETA.mp4" --browser-executable="$NAVEGADOR" --concurrency=3 --log=error
npx remotion render "${COMP}SinSubtitulos" "out/$CARPETA-sin.mp4" --browser-executable="$NAVEGADOR" --concurrency=3 --log=error
cd "$RAIZ/$VIDEO"
python3 ../video-02/scripts/finalizar.py "../remotion/out/$CARPETA.mp4" video-FINAL.mp4
python3 ../video-02/scripts/finalizar.py "../remotion/out/$CARPETA-sin.mp4" video-SIN-SUBTITULOS.mp4
echo "LISTO $VIDEO"
