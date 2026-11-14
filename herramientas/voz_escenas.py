"""Voz de cualquier vídeo de la serie: un audio por escena + subtítulos palabra a palabra para Remotion.

Uso: MODELO=/ruta/parakeet python3 herramientas/voz_escenas.py video-03 apilar
  (lee video-03/guion.json y escribe en remotion/public/apilar/)

Fuente de la voz (VOZ=…):
  kokoro      voz provisional local (em_alex)            [por defecto]
  elevenlabs  ElevenLabs (la clave la pone el proxy; ELEVENLABS_VOICE=<voice_id>)
  grabacion   grabaciones del usuario ya cortadas en grabacion/<id>.wav
  natural     voz Chatterbox ya editada por herramientas/voz_natural.py en <video>/voz-natural/<id>.wav

Escribe en remotion/public/<salida>/:
  voz/<id>.wav        audio de cada escena, limpio y a volumen de Shorts
  timeline.json       duración de cada escena + subtítulos (formato Caption de @remotion/captions)

"""
import difflib, json, os, re, subprocess, sys, urllib.request
import numpy as np, soundfile as sf, librosa

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(RAIZ, sys.argv[1])
SALIDA = sys.argv[2]
OUT = os.path.join(RAIZ, "remotion", "public", SALIDA)
VOZ = os.environ.get("VOZ", "kokoro")
SR = 48000
COLA = 0.25          # respiro al final de cada escena (s)
G = json.load(open(os.path.join(BASE, "guion.json"), encoding="utf-8"))
os.makedirs(os.path.join(OUT, "voz"), exist_ok=True)
norm = lambda s: re.sub(r"[^a-zñ0-9]", "", s.lower().translate(str.maketrans("áéíóúü", "aeiouu")))

ACABADO = ("highpass=f=75,afftdn=nf=-25,equalizer=f=150:t=q:w=1:g=2,equalizer=f=350:t=q:w=1.2:g=-2.5,"
           "equalizer=f=3000:t=q:w=1.4:g=2.5,deesser=i=0.35,"
           "acompressor=threshold=-22dB:ratio=3:attack=5:release=100:makeup=3,loudnorm=I=-16:TP=-1.5:LRA=7")

def generar(esc, crudo):
    if VOZ == "kokoro":
        from kokoro_onnx import Kokoro
        C = "/root/.cache/hyperframes/tts"
        k = Kokoro(f"{C}/models/kokoro-v1.0.onnx", f"{C}/voices/voices-v1.0.bin")
        a, sr = k.create(esc["texto"], voice="em_alex", speed=1.0, lang="es")
        sf.write(crudo, a, sr)
    elif VOZ == "elevenlabs":
        voz = os.environ["ELEVENLABS_VOICE"]
        cuerpo = json.dumps({"text": esc["texto"], "model_id": os.environ.get("ELEVENLABS_MODEL", "eleven_multilingual_v2"),
                             "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.35}}).encode()
        req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voz}", data=cuerpo, method="POST",
                                     headers={"xi-api-key": "proxy-injected", "Content-Type": "application/json", "Accept": "audio/mpeg"})
        mp3 = crudo.replace(".wav", ".mp3")
        open(mp3, "wb").write(urllib.request.urlopen(req, timeout=120).read())
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", mp3, crudo], check=True)
    elif VOZ == "natural":
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(BASE, "voz-natural", f"{esc['id']}.wav"), crudo], check=True)
    else:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(BASE, "grabacion", f"{esc['id']}.wav"), crudo], check=True)

# Reconocedor para los tiempos de cada palabra
import sherpa_onnx
M = os.environ["MODELO"]
rec = sherpa_onnx.OfflineRecognizer.from_transducer(
    encoder=f"{M}/encoder.int8.onnx", decoder=f"{M}/decoder.int8.onnx", joiner=f"{M}/joiner.int8.onnx",
    tokens=f"{M}/tokens.txt", model_type="nemo_transducer", num_threads=4)

def palabras_con_tiempo(x, texto):
    x16 = librosa.resample(x, orig_sr=SR, target_sr=16000)
    st = rec.create_stream(); st.accept_waveform(16000, x16); rec.decode_stream(st)
    asr = []
    for tok, ts in zip(st.result.tokens, st.result.timestamps):
        if tok.startswith(" ") or not asr: asr.append([tok.strip(), ts])
        else: asr[-1][0] += tok
    vis = texto.split()
    tiempos = [None] * len(vis)
    sm = difflib.SequenceMatcher(a=[norm(w) for w in vis], b=[norm(w) for w, _ in asr], autojunk=False)
    for bl in sm.get_matching_blocks():
        for k in range(bl.size): tiempos[bl.a + k] = asr[bl.b + k][1]
    conocidos = [(k, t) for k, t in enumerate(tiempos) if t is not None] or [(0, 0.05)]
    fin = len(x) / SR
    for k in range(len(tiempos)):
        if tiempos[k] is None:
            p = max([c for c in conocidos if c[0] < k], default=(-1, 0.03))
            n = min([c for c in conocidos if c[0] > k], default=(len(tiempos), fin - 0.1))
            tiempos[k] = p[1] + (n[1] - p[1]) * (k - p[0]) / (n[0] - p[0])
    return list(zip(vis, tiempos)), sum(t is not None for t in tiempos if t is not None)

escenas, captions, t0 = [], [], 0.0
for esc in G["escenas"]:
    crudo = os.path.join(OUT, "voz", f"{esc['id']}-crudo.wav")
    final = os.path.join(OUT, "voz", f"{esc['id']}.wav")
    generar(esc, crudo)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", crudo, "-af",
                    "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse"
                    + (f",atempo={os.environ.get('TEMPO', '1.1')},loudnorm=I=-14:TP=-1:LRA=9" if VOZ == "natural" else "," + ACABADO), "-ar", str(SR), "-ac", "1", final], check=True)
    os.remove(crudo)
    if os.path.exists(crudo.replace(".wav", ".mp3")): os.remove(crudo.replace(".wav", ".mp3"))
    x, _ = sf.read(final, dtype="float32")
    dur = len(x) / SR + COLA
    pals, _ = palabras_con_tiempo(x, esc["texto"])
    # Palabras en pantalla: «noventa y seis» → «96», etc.
    toks = [[w, t] for w, t in pals]
    for dicho, visto in G["en_pantalla"].items():
        d = dicho.split(); i = 0
        while i + len(d) <= len(toks):
            if [norm(w) for w, _ in toks[i:i + len(d)]] == [norm(w) for w in d]:
                cola = toks[i + len(d) - 1][0][len(d[-1]):] if toks[i + len(d) - 1][0].lower().startswith(d[-1]) else ""
                toks[i:i + len(d)] = [[visto + cola, toks[i][1]]]
            i += 1
    for k, (w, t) in enumerate(toks):
        fin_w = toks[k + 1][1] if k + 1 < len(toks) else len(x) / SR
        captions.append({"text": (" " if captions else "") + w, "startMs": round((t0 + t) * 1000),
                         "endMs": round((t0 + fin_w) * 1000), "timestampMs": round((t0 + t) * 1000), "confidence": None})
    escenas.append({"id": esc["id"], "texto": esc["texto"], "audio": f"{SALIDA}/voz/{esc['id']}.wav",
                    "inicio": round(t0, 3), "duracion": round(dur, 3),
                    "palabras": [{"text": w, "t": round(t, 3)} for w, t in toks]})
    t0 += dur
    print(f"{esc['id']:12s} {dur:5.2f} s")

json.dump({"fps": 30, "duracion": round(t0 + 0.6, 3), "voz": VOZ, "escenas": escenas, "captions": captions},
          open(os.path.join(OUT, "timeline.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"OK · {t0:.2f} s · voz {VOZ}")
