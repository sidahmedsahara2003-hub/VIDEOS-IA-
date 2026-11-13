"""Muestras de voz con Chatterbox multilingüe (MIT). Uso: python muestra_chatterbox.py salida.wav [referencia.wav]"""
import sys, time
import torch, soundfile as sf
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

torch.set_num_threads(4)
salida = sys.argv[1]
ref = sys.argv[2] if len(sys.argv) > 2 else None
texto = [
    "Te mintieron con lo de los veintiún días.",
    "Ese número salió de un cirujano de los años sesenta: sus pacientes tardaban unas tres semanas en acostumbrarse a su nueva cara.",
    "Pero cuando la ciencia lo midió, noventa y seis personas repitieron un hábito cada día durante doce semanas.",
]
t0 = time.time()
m = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
trozos = []
for frase in texto:
    w = m.generate(frase, language_id="es", audio_prompt_path=ref, exaggeration=0.6, cfg_weight=0.4)
    trozos.append(w.squeeze(0).numpy())
    trozos.append(torch.zeros(int(m.sr * 0.25)).numpy())
import numpy as np
sf.write(salida, np.concatenate(trozos), m.sr)
print("OK", salida, f"{time.time() - t0:.0f} s de cálculo")
