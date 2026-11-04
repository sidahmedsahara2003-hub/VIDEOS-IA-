"""Monta la voz final a partir de la grabación del usuario y saca el tiempo de cada palabra.

1. Corta las tomas buenas de grabacion/mi-voz-2.m4a (lista TOMAS, con su texto).
2. Ajusta cada corte al punto más silencioso cercano, para no cortar sílabas.
3. Dentro de cada toma, acorta los silencios de más de 0,28 s a 0,22 s y quita los de los bordes.
4. Une las tomas con pausas cortas y una pausa más larga antes del lema.
5. Transcribe cada toma con Parakeet (variable MODELO) y empareja lo reconocido con
   el texto de la toma: los subtítulos usan el texto correcto con los tiempos reales.
6. Guarda voz-limpia.wav, voz.wav (transformada, acabado de locutor), palabras.json,
   voz-frases.json y guion.txt.

Uso: MODELO=/ruta/parakeet python3 scripts/montar_voz.py
"""
import difflib, json, os, re, subprocess
import numpy as np, soundfile as sf, librosa

SRC = "grabacion/mi-voz-2.m4a"
SR = 48000
TONO, TIMBRE = 0.86, 0.93      # transformación «media» (ver scripts/transformar.py)
P_, P_FRASE, P_LEMA = 0.14, 0.22, 0.55

# (inicio, fin, pausa después, texto). La frase acaba en la toma que termina en punto.
TOMAS = [
    (4.55, 7.37, P_FRASE, "No te hace falta disciplina, te hace falta un plan."),
    (8.30, 8.89, P_, "Casi uno"),
    (9.37, 10.74, P_, "de cada tres adultos"),
    (11.25, 13.65, P_FRASE, "no se mueve lo suficiente, y no es por pereza."),
    (14.21, 17.11, P_FRASE, "La motivación sube y baja como una ola."),
    (17.81, 22.38, P_FRASE, "Tu cerebro elige el sofá porque la recompensa del deporte llega más tarde."),
    (23.06, 25.74, P_, "Y si el plan es enorme, al tercer día"),
    (26.20, 27.14, P_FRASE, "lo acabas dejando."),
    (27.86, 29.91, P_, "El método que más funciona se llama"),
    (30.65, 32.12, P_FRASE, "intención de implementación."),
    (34.39, 39.31, P_FRASE, "Es una frase donde se dice: si a tal hora, en tal sitio, entonces hago esto."),
    (39.96, 41.50, P_, "Por ejemplo: si a las siete,"),              # fuera: «só a trabajar»
    (42.78, 45.14, P_FRASE, "al salir de trabajar, voy a entrenar."),
    (66.86, 70.99, P_, "En un estudio, el 91 % de quienes lo aplican"),  # fuera: «Vale, te repito…»
    (71.50, 75.94, P_FRASE, "hacen ejercicio cada semana, frente a menos del 40 % del resto."),
    (76.33, 77.58, 0.16, "La disciplina no se tiene,"),
    (78.35, 79.07, P_FRASE, "se diseña."),
    (82.62, 86.12, P_FRASE, "Escribe en los comentarios una frase y ya tendrás tu plan."),  # fuera: «Para ello está este modelo»
    (86.22, 87.36, P_LEMA, "Sígueme para más."),
    (87.42, 92.96, 1.4, "Y recuerda: cada día podemos ser 0,0001 % mejor."),
]
# Cómo se pronuncian los números (para emparejar con lo que reconoce Parakeet)
DICHO = {"91": "noventa y uno por ciento", "40": "cuarenta por ciento", "00001": "cero coma cero cero cero uno por ciento"}

norm = lambda s: re.sub(r"[^a-zñ0-9]", "", s.lower().translate(str.maketrans("áéíóúü", "aeiouu")))

subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", SRC, "-ac", "1", "-ar", str(SR), "grabacion/fuente.wav"], check=True)
y, _ = sf.read("grabacion/fuente.wav", dtype="float32")
rms = librosa.feature.rms(y=y, hop_length=240, frame_length=960)[0]

def tranquilo(t, ventana=0.08):
    a, b = max(int((t - ventana) * SR / 240), 0), min(int((t + ventana) * SR / 240), len(rms) - 1)
    return (a + int(np.argmin(rms[a:b + 1]))) * 240 / SR

def acortar_silencios(x, umbral=-46, maximo=0.28, deja=0.22):
    r = librosa.feature.rms(y=x, hop_length=240, frame_length=960)[0]
    q = 20 * np.log10(r + 1e-9) < umbral
    out, i = [], 0
    while i < len(q):
        j = i
        while j < len(q) and q[j] == q[i]: j += 1
        seg = x[i * 240:j * 240]
        if q[i] and (j - i) * 240 / SR > maximo and i > 0 and j < len(q):
            k = int(deja * SR) // 2; seg = np.concatenate([seg[:k], seg[-k:]])
        out.append(seg); i = j
    return np.concatenate(out)

def recortar_bordes(x, umbral=-46, deja=0.03):
    """Quita el silencio del principio y del final de una toma (deja 30 ms)."""
    r = librosa.feature.rms(y=x, hop_length=240, frame_length=960)[0]
    voz = np.where(20 * np.log10(r + 1e-9) >= umbral)[0]
    if not len(voz): return x
    i0 = max(voz[0] * 240 - int(deja * SR), 0); i1 = min((voz[-1] + 1) * 240 + int(deja * SR), len(x))
    return x[i0:i1]

def fade(x, ms=12):
    n = int(SR * ms / 1000); w = np.linspace(0, 1, n); x = x.copy()
    x[:n] *= w; x[-n:] *= w[::-1]; return x

piezas, t = [], 0.0
for a, b, pausa, texto in TOMAS:
    a, b = tranquilo(a - 0.06), tranquilo(b + 0.08)
    x = fade(recortar_bordes(acortar_silencios(y[int(a * SR):int(b * SR)])))
    piezas.append((t, x, texto))
    t += len(x) / SR + pausa
v = np.zeros(int(t * SR) + 1, np.float32)
for t0, x, _ in piezas: v[int(t0 * SR):int(t0 * SR) + len(x)] = x
sf.write("voz-limpia.wav", v, SR)

# ---------- Tiempos de cada palabra ----------
import sherpa_onnx
M = os.environ["MODELO"]
rec = sherpa_onnx.OfflineRecognizer.from_transducer(
    encoder=f"{M}/encoder.int8.onnx", decoder=f"{M}/decoder.int8.onnx", joiner=f"{M}/joiner.int8.onnx",
    tokens=f"{M}/tokens.txt", model_type="nemo_transducer", num_threads=4)

palabras, frases, fr_i, fr_ini = [], [], 0, None
aciertos = total = 0
for t0, x, texto in piezas:
    x16 = librosa.resample(x, orig_sr=SR, target_sr=16000)
    st = rec.create_stream(); st.accept_waveform(16000, x16); rec.decode_stream(st)
    asr = []
    for tok, ts in zip(st.result.tokens, st.result.timestamps):
        if tok.startswith(" ") or not asr: asr.append([tok.strip(), t0 + ts])
        else: asr[-1][0] += tok
    # «0,000» y similares: separar en palabras dichas
    asr2 = []
    for w, ts in asr:
        if re.fullmatch(r"[0-9,]+", w) and "," in w:
            for d in ["cero", "coma"] + ["cero"] * (len(w.split(",")[1])): asr2.append([d, ts])
        else: asr2.append([w, ts])
    asr = asr2
    asr_n = [norm(w) for w, _ in asr]
    vis = texto.replace(" %", "").split()
    dichas, dueno = [], []
    for k, w in enumerate(vis):
        for d in DICHO.get(norm(w), w).split():
            dichas.append(norm(d)); dueno.append(k)
    tiempos = [None] * len(dichas)
    sm = difflib.SequenceMatcher(a=dichas, b=asr_n, autojunk=False)
    for bl in sm.get_matching_blocks():
        for k in range(bl.size): tiempos[bl.a + k] = asr[bl.b + k][1]
    aciertos += sum(tt is not None for tt in tiempos); total += len(tiempos)
    fin = t0 + len(x) / SR
    conocidos = [(k, tt) for k, tt in enumerate(tiempos) if tt is not None] or [(0, t0 + 0.05)]
    for k in range(len(tiempos)):
        if tiempos[k] is None:
            prev = max([c for c in conocidos if c[0] < k], default=(-1, t0 + 0.03))
            nxt = min([c for c in conocidos if c[0] > k], default=(len(tiempos), fin - 0.1))
            tiempos[k] = prev[1] + (nxt[1] - prev[1]) * (k - prev[0]) / (nxt[0] - prev[0])
    inicio = {}
    for k, tt in zip(dueno, tiempos): inicio.setdefault(k, tt)
    if fr_ini is None: fr_ini = t0
    for k, w in enumerate(vis):
        txt = w + (" %" if norm(w) in DICHO else "")
        palabras.append({"i": len(palabras), "text": txt, "start": round(inicio[k], 3), "frase": fr_i})
    if texto.rstrip().endswith("."):
        frases.append({"i": fr_i, "texto": "", "start": round(fr_ini, 3), "end": round(fin, 3)}); fr_i += 1; fr_ini = None
for k in range(1, len(palabras)):
    palabras[k]["start"] = round(max(palabras[k]["start"], palabras[k - 1]["start"] + 0.04), 3)
for k, w in enumerate(palabras):
    nxt = palabras[k + 1]["start"] if k + 1 < len(palabras) else frases[-1]["end"]
    w["end"] = round(min(nxt, w["start"] + 0.9), 3)
for f in frases: f["texto"] = " ".join(w["text"] for w in palabras if w["frase"] == f["i"])
frases[-1]["end"] = round(len(v) / SR, 3)   # el vídeo dura lo que la voz, con la cola final
json.dump(palabras, open("palabras.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(frases, open("voz-frases.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
open("guion.txt", "w", encoding="utf-8").write(" ".join(f["texto"] for f in frases) + "\n")

subprocess.run(["python3", "scripts/transformar.py", "voz-limpia.wav", "voz.wav", str(TONO), str(TIMBRE)], check=True)
print(f"OK · {len(v) / SR:.2f} s · {len(palabras)} palabras · {len(frases)} frases · "
      f"{aciertos}/{total} palabras reconocidas por Parakeet (el resto, interpoladas)")
