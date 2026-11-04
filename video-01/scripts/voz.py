"""Genera voz.wav frase a frase con Kokoro (em_alex) y pausas de 0,25 s.
Uso: python3 scripts/voz.py [velocidad]   -> voz.wav + voz-frases.json"""
import json, re, sys
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

SPEED = float(sys.argv[1]) if len(sys.argv) > 1 else 0.9
GAP = 0.19  # + 0,03 s de cola en cada lado = 0,25 s de silencio real
CACHE = "/root/.cache/hyperframes/tts"
k = Kokoro(f"{CACHE}/models/kokoro-v1.0.onnx", f"{CACHE}/voices/voices-v1.0.bin")
texto = open("guion.txt", encoding="utf-8").read().strip()
frases = [f.strip() for f in re.split(r"(?<=[.!?])\s+", texto) if f.strip()]

def recorta(x, sr, thr=0.01, pad=0.03):
    idx = np.where(np.abs(x) > thr)[0]
    a = max(idx[0] - int(pad * sr), 0); b = min(idx[-1] + int(pad * sr), len(x))
    return x[a:b]

partes, meta, t, sr = [], [], 0.0, 24000
for i, f in enumerate(frases):
    audio, sr = k.create(f, voice="em_alex", speed=SPEED, lang="es")
    audio = recorta(audio, sr)
    d = len(audio) / sr
    meta.append({"i": i, "texto": f, "start": round(t, 3), "end": round(t + d, 3)})
    partes.append(audio); t += d
    if i < len(frases) - 1:
        partes.append(np.zeros(int(GAP * sr), dtype=audio.dtype)); t += GAP
sf.write("voz.wav", np.concatenate(partes), sr)
json.dump(meta, open("voz-frases.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{len(frases)} frases, {t:.2f} s")
