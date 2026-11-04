"""Saca el momento de cada palabra de voz.wav sin transcripción.

Para cada frase, se genera con la misma voz cada palabra por separado y se
alinea esa "plantilla" con la frase real (DTW sobre MFCC). Los límites entre
palabras de la plantilla se proyectan sobre la frase real.

Uso: python3 scripts/tiempos.py   -> palabras.json  [{i, text, start, end, frase}]
"""
import json, re
import numpy as np, soundfile as sf, librosa
from kokoro_onnx import Kokoro

SPEED = 0.95  # la misma que scripts/voz.py
CACHE = "/root/.cache/hyperframes/tts"
HOP = 120  # 5 ms a 24 kHz
k = Kokoro(f"{CACHE}/models/kokoro-v1.0.onnx", f"{CACHE}/voices/voices-v1.0.bin")
voz, sr = sf.read("voz-raw.wav", dtype="float32")  # sin procesar, a 24 kHz
frases = json.load(open("voz-frases.json", encoding="utf-8"))


def recorta(x, thr=0.01):
    idx = np.where(np.abs(x) > thr)[0]
    return x[idx[0]:idx[-1] + 1] if len(idx) else x


def mfcc(x):
    return librosa.feature.mfcc(y=x, sr=sr, n_mfcc=20, hop_length=HOP, n_fft=480)


salida = []
for f in frases:
    seg = voz[int(f["start"] * sr):int(f["end"] * sr)]
    palabras = f["texto"].split()
    plantilla, limites, t = [], [], 0
    for p in palabras:
        limpia = re.sub(r"[^\wáéíóúñü]", "", p, flags=re.I)
        a, _ = k.create(limpia, voice="em_alex", speed=SPEED, lang="es")
        a = recorta(a)
        limites.append((t, t + len(a)))
        plantilla.append(a)
        t += len(a)
    plantilla = np.concatenate(plantilla)
    A, B = mfcc(plantilla), mfcc(seg)
    _, wp = librosa.sequence.dtw(X=A, Y=B, metric="cosine")
    wp = wp[::-1]  # (frame plantilla, frame real), en orden
    def mapea(muestra):
        fr = muestra // HOP
        cand = wp[wp[:, 0] >= fr]
        return (cand[0, 1] if len(cand) else wp[-1, 1]) * HOP / sr
    for p, (a, b) in zip(palabras, limites):
        s, e = mapea(a), mapea(b)
        salida.append({"i": len(salida), "text": p, "start": round(f["start"] + s, 3),
                       "end": round(f["start"] + max(e, s + 0.05), 3), "frase": f["i"]})

# Seguridad: tiempos siempre crecientes
for a, b in zip(salida, salida[1:]):
    b["start"] = max(b["start"], a["start"] + 0.04)
json.dump(salida, open("palabras.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# Comparación con el guion, palabra a palabra
guion = open("guion.txt", encoding="utf-8").read().split()
ok = [w["text"] for w in salida] == guion
print(f"{len(salida)} palabras · coincide con el guion: {ok}")
