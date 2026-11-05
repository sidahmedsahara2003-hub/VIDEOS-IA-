"""Camufla una voz para que no se reconozca, pero suene natural.

Dos métodos:
  natural (por defecto): rubberband en alta calidad. Baja o sube el tono y mueve el timbre
           a la vez (formantes desplazados), sin el sonido «metálico» de un vocoder.
  vocoder: WORLD. Cambia tono y timbre por separado; camufla más pero suena menos natural.

Después la limpia y le da acabado de locutor con ffmpeg.

Uso: python3 scripts/transformar.py entrada.wav salida.wav TONO [TIMBRE] [natural|vocoder]
  TONO   multiplica la altura de la voz (0.90 = más grave, 1.06 = más aguda, 1 = igual)
  TIMBRE solo para «vocoder» (0.94 = garganta «más grande»)
"""
import os, subprocess, sys

src, dst, tono = sys.argv[1], sys.argv[2], float(sys.argv[3])
timbre = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
metodo = sys.argv[5] if len(sys.argv) > 5 else "natural"

# Acabado de locutor: quitar ruido, cuerpo, claridad, de-esser, compresión y volumen de Shorts
CADENA = ("highpass=f=75,afftdn=nf=-25,"
          "equalizer=f=150:t=q:w=1:g=2.5,equalizer=f=350:t=q:w=1.2:g=-3,"
          "equalizer=f=3000:t=q:w=1.4:g=2.5,equalizer=f=10000:t=q:w=1:g=1.5,"
          "deesser=i=0.35,"
          "acompressor=threshold=-22dB:ratio=3:attack=5:release=100:makeup=3,"
          "loudnorm=I=-14:TP=-1.5:LRA=7")

if metodo == "natural":
    filtro = (f"rubberband=pitch={tono}:formant=shifted:pitchq=quality:transients=mixed," if tono != 1 else "") + CADENA
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-af", filtro, "-ar", "48000", dst], check=True)
else:
    import numpy as np, soundfile as sf, pyworld as pw
    x, sr = sf.read(src)
    if x.ndim > 1: x = x.mean(1)
    x = x.astype(np.float64)
    f0, t = pw.harvest(x, sr, f0_floor=60, f0_ceil=500, frame_period=5.0)
    sp = pw.cheaptrick(x, f0, t, sr)
    ap = pw.d4c(x, f0, t, sr)
    bins = sp.shape[1]
    idx = np.clip(np.arange(bins) * timbre, 0, bins - 1)
    sp_n = np.array([np.interp(idx, np.arange(bins), fila) for fila in sp])
    y = pw.synthesize(f0 * tono, sp_n, ap, sr, frame_period=5.0)
    tmp = dst + ".tmp.wav"
    sf.write(tmp, (y / (np.max(np.abs(y)) + 1e-9) * 0.9).astype(np.float32), sr)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-af", CADENA, "-ar", "48000", dst], check=True)
    os.remove(tmp)
print("OK", dst)
