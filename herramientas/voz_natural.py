"""Voz natural con Chatterbox (MIT) + edición para que suene a grabación real y no a IA.

Uso:
  /root/venv-voz/bin/python herramientas/voz_natural.py salida.wav texto.txt [referencia.wav]

texto.txt: una frase por línea. La referencia (10–15 s de voz limpia) fija el timbre;
sin ella se usa la voz por defecto de Chatterbox.

Qué hace para quitar el «sonido IA»:
  1. Genera frase a frase con más expresividad (exaggeration) y menos rigidez (cfg_weight).
  2. Pausas variables según la puntuación (nunca todas iguales).
  3. Respiraciones suaves y un fondo de sala casi inaudible: el silencio digital absoluto delata a la IA.
  4. Cadena de micrófono: calidez, menos brillo metálico, un poco de sala y compresión suave.
"""
import random, subprocess, sys, tempfile, os
import numpy as np, soundfile as sf, torch
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

SALIDA, TEXTO = sys.argv[1], sys.argv[2]
REF = sys.argv[3] if len(sys.argv) > 3 else None
EXAG = float(os.environ.get("EXAG", "0.7"))
CFG = float(os.environ.get("CFG", "0.3"))
random.seed(7); np.random.seed(7); torch.manual_seed(7)
torch.set_num_threads(os.cpu_count() or 4)

frases = [l.strip() for l in open(TEXTO, encoding="utf-8") if l.strip()]
m = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
SR = m.sr

def recortar(x, umbral=0.012):
    """Quita el silencio del principio y del final, dejando 40 ms de margen."""
    idx = np.where(np.abs(x) > umbral)[0]
    if not len(idx): return x
    a, b = max(0, idx[0] - int(0.04 * SR)), min(len(x), idx[-1] + int(0.04 * SR))
    return x[a:b]

def pausa(frase):
    fin = frase.rstrip()[-1]
    base = {"?": 0.42, "…": 0.55, ":": 0.28, ",": 0.2}.get(fin, 0.36)
    return base + random.uniform(-0.06, 0.12)

def respiracion(dur=0.28, nivel=0.012):
    """Inhalación corta y suave: ruido filtrado con envolvente."""
    n = int(dur * SR); ruido = np.random.randn(n)
    # filtro paso banda simple (media móvil doble) para que suene a aire, no a siseo
    k = np.ones(9) / 9; r = np.convolve(np.convolve(ruido, k, "same"), k, "same") - np.convolve(ruido, np.ones(60) / 60, "same")
    env = np.sin(np.linspace(0, np.pi, n)) ** 1.6
    return (r / (np.abs(r).max() + 1e-9)) * env * nivel

piezas = []
for i, f in enumerate(frases):
    w = m.generate(f, language_id="es", audio_prompt_path=REF, exaggeration=EXAG, cfg_weight=CFG)
    x = recortar(w.squeeze(0).numpy().astype(np.float32))
    if i > 0 and (pausa(frases[i - 1]) > 0.38 or random.random() < 0.35):
        piezas.append(respiracion(random.uniform(0.22, 0.32)))
        piezas.append(np.zeros(int(0.05 * SR), np.float32))
    piezas.append(x)
    piezas.append(np.zeros(int(pausa(f) * SR), np.float32))
    print(f"  {i + 1}/{len(frases)} {f[:50]}", flush=True)

voz = np.concatenate(piezas)
# Fondo de sala muy bajo (~ -60 dBFS) para que no haya silencio digital
ruido = np.cumsum(np.random.randn(len(voz))) ; ruido -= np.convolve(ruido, np.ones(400) / 400, "same")
voz = voz + ruido / (np.abs(ruido).max() + 1e-9) * 0.001

tmp = tempfile.mktemp(suffix=".wav"); sf.write(tmp, voz, SR)
MICRO = ("highpass=f=70,"
         "equalizer=f=180:t=q:w=1:g=1.5,"        # calidez
         "equalizer=f=420:t=q:w=1.4:g=-2,"       # menos caja
         "equalizer=f=2800:t=q:w=1.2:g=1.5,"     # presencia
         "equalizer=f=7500:t=q:w=1.6:g=-2.5,"    # menos brillo metálico de la IA
         "lowpass=f=11500,"
         "deesser=i=0.3,"
         "aecho=0.85:0.9:17|29|43:0.10|0.07|0.04,"  # un poco de sala
         "acompressor=threshold=-20dB:ratio=2:attack=8:release=140:makeup=2,"
         "loudnorm=I=-16:TP=-1.5:LRA=11")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-af", MICRO, "-ar", "48000", "-ac", "1", SALIDA], check=True)
os.remove(tmp)
print("OK", SALIDA, f"{len(voz) / SR:.1f} s")
