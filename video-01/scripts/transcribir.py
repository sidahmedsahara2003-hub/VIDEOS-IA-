"""Transcribe una grabación con Parakeet (sherpa-onnx), con el tiempo de cada palabra.

El modelo se descarga de GitHub (k2-fsa/sherpa-onnx, release «asr-models»):
sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8. Pasa la carpeta del modelo en MODELO.

Uso: MODELO=/ruta/al/modelo python3 scripts/transcribir.py audio.wav salida.json
La salida es [{bloque, start, end, texto, palabras: [{text, start, end}]}].
El audio se corta en bloques por los silencios y se transcribe bloque a bloque.
"""
import json, os, sys
import numpy as np, soundfile as sf, librosa, sherpa_onnx

M = os.environ["MODELO"]
PAUSA_MIN = float(os.environ.get("PAUSA_MIN", "0.45"))  # silencio que separa bloques
rec = sherpa_onnx.OfflineRecognizer.from_transducer(
    encoder=f"{M}/encoder.int8.onnx", decoder=f"{M}/decoder.int8.onnx", joiner=f"{M}/joiner.int8.onnx",
    tokens=f"{M}/tokens.txt", model_type="nemo_transducer", num_threads=4)

y, sr = sf.read(sys.argv[1])
if y.ndim > 1: y = y.mean(1)
y = y.astype(np.float32)
if sr != 16000: y = librosa.resample(y, orig_sr=sr, target_sr=16000); sr = 16000

# Bloques de voz separados por silencios de más de 0,45 s
r = librosa.feature.rms(y=y, hop_length=160, frame_length=640)[0]
db = 20 * np.log10(r + 1e-9); thr = np.percentile(db, 30) + 8
t = np.arange(len(db)) * 160 / sr
segs, on, last = [], None, -9
for i, s in enumerate(db > thr):
    if s and on is None: on = t[i]
    if s: last = t[i]
    if on is not None and not s and t[i] - last > PAUSA_MIN: segs.append((on, last)); on = None
if on is not None: segs.append((on, last))
segs = [(a, b) for a, b in segs if b - a > 0.15]

out = []
for k, (a, b) in enumerate(segs):
    a0, b0 = max(0, a - 0.15), b + 0.2
    st = rec.create_stream()
    st.accept_waveform(sr, y[int(a0 * sr):int(b0 * sr)])
    rec.decode_stream(st)
    res = st.result
    # Tokens a palabras (un token que empieza por espacio abre palabra nueva)
    words = []
    for tok, ts in zip(res.tokens, res.timestamps):
        if tok.startswith(" ") or not words:
            words.append({"text": tok.strip(), "start": round(a0 + ts, 3)})
        else:
            words[-1]["text"] += tok
    for i, w in enumerate(words):
        w["end"] = words[i + 1]["start"] if i + 1 < len(words) else round(b, 3)
    out.append({"bloque": k, "start": round(a, 3), "end": round(b, 3), "texto": res.text.strip(), "palabras": words})
    print(f"[{k:2d}] {a:6.2f}-{b:6.2f}  {res.text.strip()}")
json.dump(out, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
