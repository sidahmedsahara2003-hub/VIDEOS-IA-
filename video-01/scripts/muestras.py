"""Muestras de voz para elegir: mismas 3 frases con distintas voces."""
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
C = "/root/.cache/hyperframes/tts"
k = Kokoro(f"{C}/models/kokoro-v1.0.onnx", f"{C}/voices/voices-v1.0.bin")
v = np.load(f"{C}/voices/voices-v1.0.bin")
TXT = ["Diez minutos de deporte pueden cambiar tu día entero.",
       "Y casi uno de cada tres adultos no se mueve lo suficiente.",
       "Moverte te hace dormir mejor, tener más energía y estar de mejor humor."]
OPC = {
  "A-alex": ("em_alex", 0.95),
  "B-santa": ("em_santa", 0.95),
  "C-mezcla": (0.5 * v["em_alex"] + 0.5 * v["em_santa"], 0.95),
  "D-alex-rapido": ("em_alex", 1.05),
}
def recorta(x, thr=0.01, pad=0.03, sr=24000):
    i = np.where(np.abs(x) > thr)[0]; return x[max(i[0]-int(pad*sr),0):i[-1]+int(pad*sr)]
for name, (voice, sp) in OPC.items():
    parts = []
    for t in TXT:
        a, sr = k.create(t, voice=voice, speed=sp, lang="es")
        parts += [recorta(a), np.zeros(int(0.19 * sr), dtype=a.dtype)]
    sf.write(f"muestras/{name}-raw.wav", np.concatenate(parts), sr)
