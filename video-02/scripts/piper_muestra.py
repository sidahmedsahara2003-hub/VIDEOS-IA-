"""Voz Piper (open source, gratis) ejecutada directamente con onnxruntime.

El texto se pasa a fonemas con espeak-ng (el mismo que usa Piper) y se convierte en los
identificadores del modelo (.onnx.json). Modelos: k2-fsa/sherpa-onnx, release «tts-models».

Uso: python3 scripts/piper_muestra.py CARPETA_MODELO salida.wav "texto" [hablante] [velocidad]
  velocidad > 1 = más rápido (Piper usa length_scale = 1 / velocidad)
"""
import json, os, sys
import numpy as np, onnxruntime as ort, soundfile as sf
import espeakng_loader
from phonemizer.backend.espeak.wrapper import EspeakWrapper
from phonemizer import phonemize

EspeakWrapper.set_library(espeakng_loader.get_library_path())
os.environ.setdefault("ESPEAK_DATA_PATH", espeakng_loader.get_data_path())

d, out, texto = sys.argv[1], sys.argv[2], sys.argv[3]
sid = int(sys.argv[4]) if len(sys.argv) > 4 else 0
vel = float(sys.argv[5]) if len(sys.argv) > 5 else 1.0
onnx = [f for f in os.listdir(d) if f.endswith(".onnx")][0]
cfg = json.load(open(f"{d}/{onnx}.json", encoding="utf-8"))
idmap = cfg["phoneme_id_map"]
voz = cfg.get("espeak", {}).get("voice", "es")
inf = cfg.get("inference", {})

fon = phonemize(texto, language=voz, backend="espeak", preserve_punctuation=True, with_stress=True,
                punctuation_marks=';:,.!?¡¿—…"«»“”()', njobs=1)
ids = list(idmap["^"])
for ch in fon:
    if ch in idmap:
        ids += idmap[ch] + idmap["_"]
ids += idmap["$"]

ses = ort.InferenceSession(f"{d}/{onnx}", providers=["CPUExecutionProvider"])
entradas = {
    "input": np.array([ids], dtype=np.int64),
    "input_lengths": np.array([len(ids)], dtype=np.int64),
    "scales": np.array([inf.get("noise_scale", 0.667), inf.get("length_scale", 1.0) / vel, inf.get("noise_w", 0.8)], dtype=np.float32),
}
if cfg.get("num_speakers", 1) > 1 and "sid" in [i.name for i in ses.get_inputs()]:
    entradas["sid"] = np.array([sid], dtype=np.int64)
audio = ses.run(None, entradas)[0].squeeze()
sf.write(out, audio.astype(np.float32), cfg["audio"]["sample_rate"])
print("OK", out, f"{len(audio) / cfg['audio']['sample_rate']:.2f} s")
