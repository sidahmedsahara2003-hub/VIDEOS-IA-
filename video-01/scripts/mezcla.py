"""Mezcla final: voz + efectos + música de fondo, a -14 LUFS.

1. Genera musica.wav: una base suave y alegre (112 BPM) hecha por código,
   determinista, que dura todo el vídeo (nunca hay silencio total).
2. Coloca cada efecto de sonido.json (escrito por generar.mjs) en su momento.
3. Mezcla con ffmpeg (la música se agacha cuando habla la voz) y normaliza
   a -14 LUFS en dos pasadas.

Uso: python3 scripts/mezcla.py   -> proyecto/assets/mezcla.wav
"""
import json, os, re, shutil, subprocess
import numpy as np, soundfile as sf

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SFX_SRC = "/root/.claude/skills/media-use/audio/assets/sfx"
SFX_DIR = os.path.join(BASE, "sonidos")          # copia local de los efectos (Pixabay)
OUT = os.path.join(BASE, "proyecto/assets/mezcla.wav")
SR = 48000
cfg = json.load(open(os.path.join(BASE, "sonido.json"), encoding="utf-8"))
D = cfg["D"]

# ---------- 1. Música ----------
def musica(dur, bpm=112, seed=7):
    rng = np.random.default_rng(seed)
    n = int(dur * SR)
    t = np.arange(n) / SR
    beat = 60 / bpm
    bar = 4 * beat
    out = np.zeros(n)
    hz = lambda m: 440 * 2 ** ((m - 69) / 12)
    # I - V - vi - IV en Do mayor
    chords = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]
    nbars = int(np.ceil(dur / bar))
    for b in range(nbars):
        ch = chords[b % 4]
        s0 = int(b * bar * SR); s1 = min(n, int((b + 1) * bar * SR))
        tt = t[s0:s1] - b * bar
        env = np.minimum(1, tt / 0.25) * np.minimum(1, (bar - tt) / 0.3)
        pad = sum(np.sin(2 * np.pi * hz(m) * tt) + 0.3 * np.sin(2 * np.pi * hz(m) * 2.003 * tt) for m in ch)
        out[s0:s1] += 0.06 * pad * env
        bass = np.sin(2 * np.pi * hz(ch[0] - 24) * tt)
        out[s0:s1] += 0.12 * bass * env
        # Arpegio en corcheas
        for k in range(8):
            m = ch[k % 3] + (12 if k % 4 == 3 else 0)
            a0 = s0 + int(k * beat / 2 * SR)
            L = min(int(0.4 * SR), n - a0)
            if L <= 0: continue
            ta = np.arange(L) / SR
            out[a0:a0 + L] += 0.05 * np.sin(2 * np.pi * hz(m + 12) * ta) * np.exp(-ta * 9)
    # Bombo suave en cada tiempo y platillo en los contratiempos
    for i in range(int(dur / beat) + 1):
        k0 = int(i * beat * SR)
        L = min(int(0.25 * SR), n - k0)
        if L > 0:
            tk = np.arange(L) / SR
            f = 50 + 70 * np.exp(-tk * 30)
            out[k0:k0 + L] += 0.22 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tk * 14)
        h0 = int((i + 0.5) * beat * SR)
        L = min(int(0.06 * SR), n - h0)
        if L > 0:
            noise = rng.standard_normal(L)
            noise = np.diff(noise, prepend=0)  # filtro paso alto sencillo
            out[h0:h0 + L] += 0.025 * noise * np.exp(-np.arange(L) / SR * 60)
    fade = np.minimum(1, t / 0.3) * np.minimum(1, (dur - t) / 1.2)
    out *= np.clip(fade, 0, 1)
    return (out / np.max(np.abs(out)) * 0.8).astype(np.float32)

mus_path = os.path.join(BASE, "musica.wav")
sf.write(mus_path, musica(D), SR)

# ---------- 2 y 3. Efectos y mezcla ----------
os.makedirs(SFX_DIR, exist_ok=True)
for name in {s["name"] for s in cfg["sfx"]}:
    dst = os.path.join(SFX_DIR, f"{name}.mp3")
    if not os.path.exists(dst):
        shutil.copy(os.path.join(SFX_SRC, f"{name}.mp3"), dst)
shutil.copy(os.path.join(SFX_SRC, "CREDITS.md"), os.path.join(SFX_DIR, "CREDITOS-pixabay.md"))

inputs = ["-i", os.path.join(BASE, "voz.wav"), "-i", mus_path]
parts = [
    f"[0:a]aresample={SR},aformat=channel_layouts=stereo,apad=whole_dur={D}[voz]",
    "[voz]asplit=2[vozA][vozB]",
    # Música muy baja (unos -24 dB) y se agacha un poco más cuando habla la voz
    f"[1:a]aresample={SR},aformat=channel_layouts=stereo,volume=0.10[mus0]",
    "[mus0][vozB]sidechaincompress=threshold=0.03:ratio=4:attack=20:release=300[mus]",
]
labels = ["[vozA]", "[mus]"]
for i, s in enumerate(cfg["sfx"]):
    inputs += ["-i", os.path.join(SFX_DIR, f"{s['name']}.mp3")]
    ms = int(round(s["t"] * 1000))
    parts.append(f"[{i + 2}:a]aresample={SR},aformat=channel_layouts=stereo,volume={s['vol'] * 0.6:.3f},adelay={ms}|{ms}[s{i}]")
    labels.append(f"[s{i}]")
parts.append(f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0:duration=first,atrim=0:{D}[mix]")
fc = ";".join(parts)

def run(extra, out):
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *inputs, "-filter_complex", fc + extra, "-map", "[out]", *out]
    return subprocess.run(cmd, check=True, capture_output=True, text=True)

# Pasada 1: medir
r1 = subprocess.run(["ffmpeg", "-y", "-hide_banner", *inputs, "-filter_complex",
                     fc + ";[mix]loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json[out]", "-map", "[out]", "-f", "null", "-"],
                    check=True, capture_output=True, text=True)
m = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r1.stderr).group(0))
# Pasada 2: aplicar
run(f";[mix]loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
    f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true[out]",
    ["-ar", str(SR), "-c:a", "pcm_s16le", OUT])
print(f"OK · {len(cfg['sfx'])} efectos · {OUT}")
