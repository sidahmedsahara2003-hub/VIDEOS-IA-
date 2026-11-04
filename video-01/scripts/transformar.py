"""Transforma una voz para que no se reconozca, pero suene natural.

Usa el vocoder WORLD: separa la voz en tono (f0), timbre (envolvente espectral)
y aire (aperiodicidad). Cambia el tono y desplaza el timbre por separado, y la
vuelve a sintetizar. Después la limpia y le da acabado de locutor con ffmpeg.

Uso: python3 scripts/transformar.py entrada.wav salida.wav TONO TIMBRE
  TONO   multiplica la altura de la voz (0.88 = más grave, 1.1 = más aguda)
  TIMBRE desplaza el timbre (0.94 = garganta «más grande», 1.06 = «más pequeña»)
"""
import subprocess, sys
import numpy as np, soundfile as sf, pyworld as pw

src, dst, tono, timbre = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
x, sr = sf.read(src)
if x.ndim > 1: x = x.mean(1)
x = x.astype(np.float64)

f0, t = pw.harvest(x, sr, f0_floor=60, f0_ceil=500, frame_period=5.0)
sp = pw.cheaptrick(x, f0, t, sr)
ap = pw.d4c(x, f0, t, sr)

# Tono: multiplica f0 y suaviza un poco las variaciones bruscas
f0n = f0 * tono

# Timbre: estira o encoge el eje de frecuencias de la envolvente
bins = sp.shape[1]
src_idx = np.clip(np.arange(bins) * timbre, 0, bins - 1)
sp_n = np.empty_like(sp)
for i in range(sp.shape[0]):
    sp_n[i] = np.interp(src_idx, np.arange(bins), sp[i])

y = pw.synthesize(f0n, sp_n, ap, sr, frame_period=5.0)
tmp = dst + ".tmp.wav"
sf.write(tmp, (y / (np.max(np.abs(y)) + 1e-9) * 0.9).astype(np.float32), sr)

# Acabado de locutor: quitar ruido, cuerpo, claridad, de-esser, compresión y volumen
cadena = ("highpass=f=75,afftdn=nf=-25,"
          "equalizer=f=150:t=q:w=1:g=2.5,equalizer=f=350:t=q:w=1.2:g=-3,"
          "equalizer=f=3000:t=q:w=1.4:g=3,equalizer=f=10000:t=q:w=1:g=2,"
          "deesser=i=0.4,"
          "acompressor=threshold=-22dB:ratio=3.5:attack=4:release=90:makeup=3,"
          "loudnorm=I=-14:TP=-1.5:LRA=7")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-af", cadena, "-ar", "48000", dst], check=True)
import os; os.remove(tmp)
print("OK", dst)
