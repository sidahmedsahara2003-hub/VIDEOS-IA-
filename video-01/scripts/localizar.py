"""Localiza en la grabación dónde se dice cada línea del guion (sin transcripción).
Compara cada línea dicha por Kokoro con la grabación (DTW de subsecuencia sobre MFCC
normalizados) y lista las coincidencias, de la mejor a la peor."""
import re, sys, json
import numpy as np, soundfile as sf, librosa
from kokoro_onnx import Kokoro
C = "/root/.cache/hyperframes/tts"
k = Kokoro(f"{C}/models/kokoro-v1.0.onnx", f"{C}/voices/voices-v1.0.bin")
y, sr = sf.read(sys.argv[1]); y = y.astype(np.float32)
HOP = 240
def feat(x):
    m = librosa.feature.mfcc(y=x, sr=sr, n_mfcc=20, hop_length=HOP, n_fft=960)[1:]
    return (m - m.mean(1, keepdims=True)) / (m.std(1, keepdims=True) + 1e-6)
Y = feat(y)
lines = [l.strip() for l in re.split(r"(?<=[.!?])\s+", open("guion.txt", encoding="utf-8").read()) if l.strip()]
out = []
for i, l in enumerate(lines):
    a, _ = k.create(l, voice="em_alex", speed=1.0, lang="es")
    X = feat(a)
    D, wp = librosa.sequence.dtw(X=X, Y=Y, subseq=True, metric="cosine")
    cost = D[-1, :] / X.shape[1]
    # mejores finales separados al menos 1,5 s
    order = np.argsort(cost); picks = []
    for e in order:
        if all(abs(e - p) * HOP / sr > 1.5 for p in picks): picks.append(e)
        if len(picks) == 3: break
    res = []
    for e in picks:
        D2, wp2 = librosa.sequence.dtw(X=X, Y=Y[:, :e + 1], subseq=True, metric="cosine")
        s = wp2[-1, 1]
        res.append((round(s * HOP / sr, 2), round(e * HOP / sr, 2), round(float(cost[e]), 3)))
    out.append({"i": i + 1, "texto": l, "candidatos": res})
    print(i + 1, res, l[:50])
json.dump(out, open("grabacion/localizar.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
