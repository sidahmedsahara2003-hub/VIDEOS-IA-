"""Voz natural con Chatterbox (MIT) + edición para que suene a grabación real y no a IA.

Uso:
  /root/venv-voz/bin/python herramientas/voz_natural.py salida.wav texto.txt [referencia.wav]
  /root/venv-voz/bin/python herramientas/voz_natural.py carpeta_salida/ video-04/guion.json   (un .wav por escena)

texto.txt: una frase por línea. Con un guion.json se genera un audio por escena (<id>.wav).
Modelo (MODELO_VOZ): «es-es» = Chatterbox afinado para español de España, con la z castellana [por defecto];
«multi» = Chatterbox multilingüe general. La referencia (10–15 s de voz limpia) fija el timbre;
sin ella se usa la voz por defecto de Chatterbox.

Qué hace para quitar el «sonido IA»:
  1. Genera frase a frase con más expresividad (exaggeration) y menos rigidez (cfg_weight).
  2. Pausas variables según la puntuación (nunca todas iguales).
  3. Respiraciones suaves y un fondo de sala casi inaudible: el silencio digital absoluto delata a la IA.
  4. Cadena de voz (skill voice-audio-engineer) sin eco ni recorte de agudos, para que se oigan z, s y f.
  5. Control de pronunciación: cada frase se pasa por un reconocedor de fonemas (wav2vec2) y se compara
     con el castellano esperado (espeak, con z = θ). Si se come sílabas o sesea, se repite (hasta INTENTOS)
     y se queda la mejor. Desactivar con CONTROL=0.
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
CONTROL = os.environ.get("CONTROL", "1") == "1"
INTENTOS = int(os.environ.get("INTENTOS", "6"))

import json, re
from pathlib import Path
if TEXTO.endswith(".json"):
    G = json.load(open(TEXTO, encoding="utf-8"))
    TRABAJOS = [(e["id"], [f for f in re.split(r"(?<=[.!?…:])\s+", e["texto"]) if f.strip()]) for e in G["escenas"]]
else:
    TRABAJOS = [(None, [l.strip() for l in open(TEXTO, encoding="utf-8") if l.strip()])]

MODELO_VOZ = os.environ.get("MODELO_VOZ", "es-es")
if MODELO_VOZ == "es-es":
    # Paquete V3 de Resemble para español de España (MIT). Se monta con los archivos comunes del modelo base.
    import glob
    base = Path(glob.glob(os.path.expanduser("~/.cache/huggingface/hub/models--ResembleAI--chatterbox/snapshots/*"))[0])
    es = Path(os.path.expanduser("~/.cache/modelos/chatterbox-es-es"))
    loc = Path(os.path.expanduser("~/.cache/modelos/chatterbox-es-local")); loc.mkdir(parents=True, exist_ok=True)
    for n, src in {"ve.pt": base / "ve.pt", "conds.pt": base / "conds.pt", "Cangjie5_TC.json": base / "Cangjie5_TC.json",
                   "grapheme_mtl_merged_expanded_v1.json": es / "grapheme_mtl_merged_expanded_v1.json",
                   "t3_mtl23ls_v2.safetensors": es / "t3_es_es.safetensors"}.items():
        if not (loc / n).exists(): os.symlink(src.resolve(), loc / n)
    if not (loc / "s3gen.pt").exists():  # el decodificador V3 no trae dos tablas fijas del tokenizador: se copian del base
        b = torch.load(base / "s3gen.pt", map_location="cpu", weights_only=True)
        v3 = torch.load(es / "s3gen_v3.pt", map_location="cpu", weights_only=True)
        for k in b:
            if k not in v3: v3[k] = b[k]
        torch.save(v3, loc / "s3gen.pt")
    m = ChatterboxMultilingualTTS.from_local(loc, device="cpu")
else:
    m = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
SR = m.sr

if CONTROL:
    import difflib, librosa, espeakng_loader
    os.environ.setdefault("PHONEMIZER_ESPEAK_LIBRARY", espeakng_loader.get_library_path())
    os.environ.setdefault("ESPEAK_DATA_PATH", espeakng_loader.get_data_path())
    from phonemizer import phonemize
    from transformers import Wav2Vec2Processor, Wav2Vec2ForCTC
    _N = "facebook/wav2vec2-lv-60-espeak-cv-ft"
    _proc = Wav2Vec2Processor.from_pretrained(_N); _asr = Wav2Vec2ForCTC.from_pretrained(_N).eval()
    _limpio = lambda t: [c for c in t if c.isalpha() or c in "ɾθðβɣɲʎʝ"]

    def nota(x, frase):
        """0–1: parecido entre lo pronunciado y el castellano esperado, con peso extra a la θ."""
        y = librosa.resample(x, orig_sr=SR, target_sr=16000)
        with torch.no_grad():
            ids = _asr(_proc(y, sampling_rate=16000, return_tensors="pt").input_values).logits.argmax(-1)
        oido = _limpio(_proc.batch_decode(ids)[0])
        esperado = _limpio(phonemize(frase, language="es", backend="espeak", strip=True))
        parecido = difflib.SequenceMatcher(a=esperado, b=oido, autojunk=False).ratio()
        th = esperado.count("θ")
        zeta = min(1.0, (oido.count("θ") + max(0, oido.count("f") - esperado.count("f"))) / th) if th else 1.0
        zeta = 0.0 if th and oido.count("θ") == 0 and zeta < 0.5 else zeta
        return 0.7 * parecido + 0.3 * zeta, parecido, zeta

def recortar(x, umbral=0.004):
    """Quita el silencio del principio y del final, con margen amplio para no comerse sílabas finales."""
    idx = np.where(np.abs(x) > umbral)[0]
    if not len(idx): return x
    a, b = max(0, idx[0] - int(0.06 * SR)), min(len(x), idx[-1] + int(0.12 * SR))
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

def sintetizar(frases):
    piezas = []
    for i, f in enumerate(frases):
        mejor = None
        for k in range(INTENTOS if CONTROL else 1):
            torch.manual_seed(7 + 101 * i + k)
            w = m.generate(f, language_id="es", audio_prompt_path=REF, exaggeration=EXAG, cfg_weight=CFG)
            x = recortar(w.squeeze(0).numpy().astype(np.float32))
            if not CONTROL: mejor = (1, x); break
            n, par, zeta = nota(x, f)
            print(f"     intento {k + 1}: nota {n:.2f} (parecido {par:.2f}, z {zeta:.2f})", flush=True)
            if mejor is None or n > mejor[0]: mejor = (n, x)
            if par >= 0.82 and zeta >= 0.99: break
        x = mejor[1]
        if i > 0 and (pausa(frases[i - 1]) > 0.38 or random.random() < 0.35):
            piezas.append(respiracion(random.uniform(0.22, 0.32)))
            piezas.append(np.zeros(int(0.05 * SR), np.float32))
        piezas.append(x)
        piezas.append(np.zeros(int(pausa(f) * SR), np.float32))
        print(f"  {i + 1}/{len(frases)} {f[:50]}", flush=True)


    return piezas

def acabar(piezas, salida):
    voz = np.concatenate(piezas)
    # Fondo de sala muy bajo (~ -60 dBFS) para que no haya silencio digital
    ruido = np.cumsum(np.random.randn(len(voz))) ; ruido -= np.convolve(ruido, np.ones(400) / 400, "same")
    voz = voz + ruido / (np.abs(ruido).max() + 1e-9) * 0.001

    tmp = tempfile.mktemp(suffix=".wav"); sf.write(tmp, voz, SR)
    # Cadena de voz (skill voice-audio-engineer): HPF → de-esser → compresor 3:1 → presencia → límite → −14 LUFS (YouTube).
    # Sin eco ni recorte de agudos: así se oyen la z, la s y la f.
    MICRO = ("highpass=f=85,"
             "equalizer=f=200:t=q:w=1:g=1,"          # un poco de cuerpo
             "equalizer=f=450:t=q:w=1.4:g=-2,"       # menos sonido de caja
             "deesser=i=0.15:m=0.5:f=0.5,"           # suave: solo las eses duras
             "acompressor=threshold=-20dB:ratio=3:attack=10:release=100:makeup=2,"
             "equalizer=f=3000:t=q:w=1:g=2.5,"       # presencia: se entienden las palabras
             "highshelf=f=6000:g=2,"                 # fricativas (z, s, f, c) más claras
             "loudnorm=I=-14:TP=-1:LRA=9")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-af", MICRO, "-ar", "48000", "-ac", "1", salida], check=True)
    os.remove(tmp)

    print("OK", salida, f"{len(voz) / SR:.1f} s", flush=True)

for ident, frases in TRABAJOS:
    destino = SALIDA if ident is None else os.path.join(SALIDA, f"{ident}.wav")
    if ident is not None:
        os.makedirs(SALIDA, exist_ok=True); print(f"== {ident}", flush=True)
    acabar(sintetizar(frases), destino)
