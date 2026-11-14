// Escenas del vídeo 04 «Los 66 días». Cada escena se sincroniza con su voz mediante w("palabra").
import { CalendarBlankIcon, CheckIcon, ClockIcon, FlaskIcon, MapPinIcon, ScissorsIcon, XIcon } from "@phosphor-icons/react";
import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { Cierre } from "../Cierre";
import { C, Escena, FUENTE, Neon, Particulas, lerp, pop, prog, useEscena } from "../serie/base";
import { LOOKS, Personaje } from "../serie/Personaje";
import { SplitFlap } from "../serie/SplitFlap";
import type { Sfx } from "../serie/VideoSerie";

const txt = (size: number, color: string = C.blanco, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: FUENTE, fontWeight: 900, fontSize: size, color, letterSpacing: "-0.03em", lineHeight: 1.05, ...extra,
});
const Centro: React.FC<{ top: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ top, children, style }) => (
  <div style={{ position: "absolute", left: 60, right: 60, top, display: "flex", justifyContent: "center", ...style }}>{children}</div>
);
const Pastilla: React.FC<{ color: string; tinta?: string; size?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ color, tinta = C.verdeOscuro, size = 40, children, style }) => (
  <div style={{ ...txt(size, tinta), letterSpacing: "0.04em", padding: "14px 30px", borderRadius: 999, background: color, ...style }}>{children}</div>
);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Hoja de calendario con un número grande. */
const Hoja: React.FC<{ numero: string; color?: string; ancho?: number; style?: React.CSSProperties }> = ({ numero, color = C.tinta, ancho = 420, style }) => (
  <div style={{ position: "absolute", width: ancho, height: ancho * 1.08, borderRadius: 40, background: C.blanco, overflow: "hidden",
    boxShadow: "0 40px 90px rgba(0,0,0,.55)", ...style }}>
    <div style={{ height: ancho * 0.26, background: C.rojo, display: "flex", alignItems: "center", justifyContent: "center", ...txt(ancho * 0.11, "#fff", { letterSpacing: "0.12em" }) }}>DÍAS</div>
    <div style={{ height: ancho * 0.82, display: "flex", alignItems: "center", justifyContent: "center", ...txt(ancho * 0.5, color, { letterSpacing: "-0.05em" }) }}>{numero}</div>
  </div>
);

// ───────────────────────────── 1 · GANCHO ─────────────────────────────
// El «21» ya está en pantalla en el fotograma 1 (sin fundido) y se tacha con «mintieron».
export const Gancho: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const tM = w("mintieron");
  const sacude = t > w("días") ? Math.sin(t * 60) * 10 * (1 - prog(t, w("días"), 0.4)) : 0;
  return (
    <AbsoluteFill>
      <Centro top={430}><div style={{ ...txt(96), scale: String(lerp(0.92, 1, pop(t, 0, 0.3))) }}>TE <span style={{ color: C.rojo }}>MINTIERON</span></div></Centro>
      <Hoja numero="21" ancho={460} style={{ left: 310, top: 640, rotate: `${-4 + sacude * 0.3}deg`, translate: `${sacude}px 0px` }} />
      <Neon x={300} y={1000} ancho={500} u={prog(t, w("días"), 0.25)} giro={-18} />
      <Centro top={1220}><Pastilla color={C.rojo} tinta="#fff" size={52} style={{ scale: String(pop(t, tM + 0.15)) }}>¿21 DÍAS? FALSO</Pastilla></Centro>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 2 · ORIGEN ─────────────────────────────
export const Origen: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  return (
    <AbsoluteFill>
      <Centro top={430}><SplitFlap casillas={4} ancho={150} alto={220} tam={170} hueco={12}
        pasos={[{ t: 0, texto: "    ", color: C.blanco }, { t: w("sesenta") - 0.3, texto: "1960", color: C.amarillo }]} /></Centro>
      <Centro top={690}><div style={{ display: "flex", alignItems: "center", gap: 18, ...txt(54), opacity: prog(t, w("cirujano") - 0.1, 0.3) }}>
        <ScissorsIcon size={64} weight="fill" color={C.amarillo} />UN CIRUJANO PLÁSTICO</div></Centro>
      <Centro top={780}><div style={{ ...txt(30, C.gris, { letterSpacing: "0.02em" }), opacity: prog(t, w("cirujano"), 0.3) }}>Maxwell Maltz · «Psycho-Cybernetics»</div></Centro>
      <Personaje look={LOOKS.ingeniero} x={330} y={1480} escala={0.66} desfase={0.3} poses={[[0, "idle"], [w("pacientes"), "point"]]} animo={[[0, 0.3]]} />
      {/* Espejo: el paciente se acostumbra a su nueva cara */}
      <div style={{ position: "absolute", left: 600, top: 1000, width: 300, height: 400, borderRadius: 150, border: "14px solid #cbd5e1",
        background: "linear-gradient(160deg,#93c5fd55,#1e293b)", opacity: prog(t, w("pacientes") - 0.1, 0.3), scale: String(pop(t, w("pacientes") - 0.1)) }}>
        <div style={{ position: "absolute", left: 95, top: 110, width: 110, height: 130, borderRadius: 55, background: "#f2c79a", opacity: 0.85 }} />
      </div>
      <Centro top={1560}><Pastilla color={C.amarillo} size={46} style={{ scale: String(pop(t, w("semanas") - 0.1)) }}>MÍNIMO ≈ 21 DÍAS</Pastilla></Centro>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 3 · EL ESTUDIO ─────────────────────────────
export const Estudio: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const t96 = w("96");
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 70, top: 440, display: "flex", alignItems: "center", gap: 20, opacity: prog(t, 0.1, 0.3) }}>
        <FlaskIcon size={80} weight="fill" color="#93c5fd" />
        <div>
          <div style={txt(52)}>LA CIENCIA LO MIDIÓ</div>
          <div style={txt(28, C.gris, { letterSpacing: 0 })}>University College London · Lally y otros, 2010</div>
        </div>
      </div>
      <Centro top={620}><SplitFlap casillas={2} ancho={190} alto={280} tam={220} hueco={14} brillo={t > t96 + 0.4}
        pasos={[{ t: 0, texto: "  ", color: C.blanco }, { t: t96 - 0.2, texto: "96", color: C.verde }]} /></Centro>
      <Centro top={930}><div style={{ ...txt(60), opacity: prog(t, w("personas"), 0.3) }}>PERSONAS</div></Centro>
      {/* 96 puntos: cada persona repitiendo su hábito */}
      <div style={{ position: "absolute", left: 150, top: 1040, width: 780, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 14 }}>
        {new Array(96).fill(0).map((_, i) => (
          <div key={i} style={{ height: 50, borderRadius: 25, background: C.verde, opacity: 0.25 + 0.75 * prog(t, w("hábito") + (i % 12) * 0.03 + Math.floor(i / 12) * 0.05, 0.25),
            scale: String(pop(t, w("personas") + i * 0.008, 0.3)) }} />
        ))}
      </div>
      <Centro top={1560}><Pastilla color={C.blanco} tinta={C.tinta} size={46} style={{ scale: String(pop(t, w("12") - 0.05)), display: "flex", gap: 14, alignItems: "center" }}>
        <CalendarBlankIcon size={44} weight="fill" />12 SEMANAS</Pastilla></Centro>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 4 · 66 DÍAS ─────────────────────────────
export const Resultado: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w, frame } = useEscena(e);
  const t66 = w("66");
  const n = Math.round(interpolate(t, [w("tardaron"), t66], [0, 66], { ...clamp, easing: (u) => 1 - Math.pow(1 - u, 2) }));
  const anillo = n / 66;
  const golpe = interpolate(t, [t66, t66 + 0.12, t66 + 0.4], [1, 1.12, 1], clamp);
  return (
    <AbsoluteFill>
      <Centro top={430}><div style={{ ...txt(44, C.gris, { letterSpacing: "0.1em" }) }}>DE MEDIA</div></Centro>
      <svg width={760} height={760} style={{ position: "absolute", left: 160, top: 540 }}>
        <circle cx={380} cy={380} r={330} stroke="rgba(255,255,255,.1)" strokeWidth={36} fill="none" />
        <circle cx={380} cy={380} r={330} stroke={C.verde} strokeWidth={36} fill="none" strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 330} strokeDashoffset={2 * Math.PI * 330 * (1 - anillo)} transform="rotate(-90 380 380)"
          style={{ filter: `drop-shadow(0 0 ${t > t66 ? 30 : 8}px ${C.verde})` }} />
      </svg>
      <div style={{ position: "absolute", left: 160, top: 540, width: 760, height: 760, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", scale: String(golpe) }}>
        <div style={txt(300, t >= t66 ? C.verde : C.blanco, { letterSpacing: "-0.06em" })}>{n}</div>
        <div style={txt(70)}>DÍAS</div>
      </div>
      <Particulas x={540} y={920} t={t} t0={t66} n={26} radio={420} />
      <Centro top={1380}><div style={{ ...txt(56, C.verde), opacity: prog(t, w("automático") - 0.1, 0.3) }}>HASTA QUE SALE SOLO</div></Centro>
      <div style={{ display: "none" }}>{frame}</div>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 5 · RANGO 18–254 ─────────────────────────────
export const Rango: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const b18 = prog(t, w("18"), 0.5), b254 = prog(t, w("254"), 1.1);
  const zoom = interpolate(t, [w("254"), w("254") + 1.2], [1, 0.82], clamp);
  return (
    <AbsoluteFill style={{ scale: String(zoom) }}>
      <Centro top={430}><div style={txt(60)}>CADA UNO, SU RITMO</div></Centro>
      <div style={{ position: "absolute", left: 120, bottom: 470, width: 300, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div style={{ ...txt(110, C.verde), opacity: b18 }}>18</div>
        <div style={{ width: 220, height: 120 * b18, borderRadius: "26px 26px 8px 8px", background: C.verde }} />
        <div style={txt(36, C.gris)}>EL MÁS RÁPIDO</div>
      </div>
      <div style={{ position: "absolute", left: 640, bottom: 470, width: 300, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div style={{ ...txt(110, C.naranja), opacity: prog(t, w("254") - 0.1, 0.3) }}>254</div>
        <div style={{ width: 220, height: 720 * b254, borderRadius: "26px 26px 8px 8px", background: `linear-gradient(${C.naranja}, #c2410c)` }} />
        <div style={txt(36, C.gris)}>EL MÁS LENTO</div>
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 6 · DÍA 22 ─────────────────────────────
export const Porque: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const dibujo = prog(t, 0.05, 1.6);
  const pts = new Array(67).fill(0).map((_, d) => [110 + d * 12.6, 1330 - 620 * (1 - Math.exp(-d / 22))] as const);
  const camino = pts.slice(0, Math.max(2, Math.round(dibujo * pts.length))).map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const p22 = pts[22];
  return (
    <AbsoluteFill>
      <Centro top={430}><div style={txt(56)}>LO AUTOMÁTICO SUBE <span style={{ color: C.amarillo }}>DESPACIO</span></div></Centro>
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        <line x1={110} y1={1330} x2={980} y2={1330} stroke="rgba(255,255,255,.25)" strokeWidth={4} />
        <line x1={110} y1={1330} x2={110} y2={640} stroke="rgba(255,255,255,.25)" strokeWidth={4} />
        <path d={camino} stroke={C.verde} strokeWidth={12} fill="none" strokeLinecap="round" />
        <g opacity={prog(t, w("22") - 0.1, 0.3)}>
          <line x1={p22[0]} y1={p22[1]} x2={p22[0]} y2={1330} stroke={C.amarillo} strokeWidth={5} strokeDasharray="14 10" />
          <circle cx={p22[0]} cy={p22[1]} r={26} fill={C.amarillo} />
        </g>
      </svg>
      <div style={{ position: "absolute", left: 300, top: 1380, ...txt(44, C.amarillo), opacity: prog(t, w("22"), 0.3) }}>DÍA 22: AÚN CUESTA</div>
      <div style={{ position: "absolute", left: 980 - 330, top: 600, ...txt(36, C.gris), opacity: prog(t, 0.6, 0.3) }}>AUTOMÁTICO ↑</div>
      <Centro top={1500}><Pastilla color={C.rojo} tinta="#fff" size={44} style={{ scale: String(pop(t, w("fallado") - 0.1)) }}>NO HAS FALLADO</Pastilla></Centro>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 7 · EL MÉTODO ─────────────────────────────
export const Metodo: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const titulo = "LA REGLA DE LOS 66 DÍAS";
  const letras = Math.floor(interpolate(t, [w("regla") - 0.1, w("días") + 0.2], [0, titulo.length], clamp));
  const filas = [
    { I: ClockIcon, texto: "MISMA HORA", t0: w("hora") },
    { I: MapPinIcon, texto: "MISMO SITIO", t0: w("sitio") },
    { I: CalendarBlankIcon, texto: "CUENTA HASTA 66", t0: w("cuentas") },
  ];
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 70, top: 450, width: 940, height: 1000, borderRadius: 18, border: "3px solid rgba(191,219,254,.6)",
        backgroundColor: "#0b3a82", backgroundImage: "linear-gradient(rgba(191,219,254,.2) 2px, transparent 2px), linear-gradient(90deg, rgba(191,219,254,.2) 2px, transparent 2px), linear-gradient(rgba(191,219,254,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(191,219,254,.08) 1px, transparent 1px)",
        backgroundSize: "200px 200px, 200px 200px, 40px 40px, 40px 40px", scale: String(pop(t, 0, 0.5)) }}>
        <div style={{ position: "absolute", left: 44, top: 40, ...txt(34, "#bfdbfe", { letterSpacing: "0.12em" }), opacity: prog(t, w("método"), 0.3) }}>MÉTODO Nº 3</div>
        <div style={{ position: "absolute", left: 44, right: 44, top: 110, ...txt(92, C.blanco, { letterSpacing: "-0.02em" }) }}>{titulo.slice(0, letras)}</div>
        {filas.map((f, i) => {
          const u = pop(t, f.t0 - 0.1, 0.4);
          return (
            <div key={i} style={{ position: "absolute", left: 44, top: 470 + i * 160, display: "flex", alignItems: "center", gap: 28,
              opacity: Math.min(1, u * 1.5), translate: `${(1 - Math.min(1, u)) * 80}px 0px` }}>
              <div style={{ width: 120, height: 120, borderRadius: 34, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <f.I size={72} weight="fill" color="#15803d" />
              </div>
              <div style={txt(64)}>{f.texto}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 8 · FALLAR UN DÍA ─────────────────────────────
export const Fallar: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const tFallo = w("fallar"), tSigue = w("sigues");
  const DIAS = 14, FALLO = 7;
  return (
    <AbsoluteFill>
      <Centro top={430}><div style={txt(58)}>¿FALLAS UN DÍA?</div></Centro>
      <div style={{ position: "absolute", left: 90, top: 640, width: 900, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 22 }}>
        {new Array(DIAS).fill(0).map((_, i) => {
          const antes = i < FALLO, esFallo = i === FALLO;
          const t0 = antes ? 0.1 + i * 0.12 : esFallo ? tFallo : tSigue + (i - FALLO - 1) * 0.12;
          const u = pop(t, t0, 0.35);
          return (
            <div key={i} style={{ height: 110, borderRadius: 26, display: "flex", alignItems: "center", justifyContent: "center", scale: String(u),
              background: esFallo ? C.rojo : C.verde, boxShadow: esFallo ? `0 0 30px ${C.rojo}88` : undefined }}>
              {esFallo ? <XIcon size={64} weight="bold" color="#fff" /> : <CheckIcon size={64} weight="bold" color={C.verdeOscuro} />}
            </div>
          );
        })}
      </div>
      <Centro top={1000}><div style={{ ...txt(64, C.blanco, { textAlign: "center" }), opacity: prog(t, w("estropeó") - 0.1, 0.3) }}>NO LO ESTROPEA</div></Centro>
      <Centro top={1130}><div style={{ ...txt(64, C.verde, { textAlign: "center" }), opacity: prog(t, w("cero") - 0.1, 0.3) }}>NO EMPIEZAS DE CERO</div></Centro>
      <Personaje look={LOOKS.novato} x={540} y={1640} escala={0.6} desfase={0.2} poses={[[0, "walk"], [tFallo, "tired"], [tSigue, "run"]]} animo={[[0, 0.4], [tFallo, -0.6], [tSigue, 0.9]]} />
    </AbsoluteFill>
  );
};

// ───────────────────────────── 9 · DÍA 1 DE 66 ─────────────────────────────
export const Frase: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  return (
    <AbsoluteFill>
      <Centro top={470}><div style={{ ...txt(64), opacity: prog(t, 0, 0.25) }}>HOY ES TU</div></Centro>
      <Centro top={620}><SplitFlap casillas={6} ancho={140} alto={210} tam={160} hueco={10} brillo
        pasos={[{ t: 0, texto: "      ", color: C.blanco }, { t: w("uno") - 0.25, texto: "DÍA  1", color: C.verde }]} /></Centro>
      <Centro top={900}><div style={{ ...txt(90, C.gris), opacity: prog(t, w("66") - 0.1, 0.3) }}>DE 66</div></Centro>
      <Particulas x={540} y={760} t={t} t0={w("uno")} n={20} radio={360} />
      <Personaje look={LOOKS.pro} x={540} y={1500} escala={0.72} desfase={0.6} poses={[[0, "idle"], [w("uno"), "cheer"]]} animo={[[0, 0.5], [w("uno"), 1]]} />
    </AbsoluteFill>
  );
};

// ───────────────────────────── 10 · CIERRE ─────────────────────────────
export const CierreEscena: React.FC<{ e: Escena }> = ({ e }) => {
  const { w } = useEscena(e);
  const tc = w("cada");
  return (
    <AbsoluteFill style={{ translate: "0px 40px" }}>
      <Cierre lema="MEJOR" despedida="NOS VEMOS MAÑANA" sinFondo
        tiempos={{ logo: tc - 0.15, barras: [tc, w("día"), w("00001") - 0.2, w("mejor") - 0.3], numero: w("00001") - 0.05, mejor: w("mejor"), adios: w("nos") }} />
    </AbsoluteFill>
  );
};

export const ESCENAS: Record<string, React.FC<{ e: Escena }>> = {
  gancho: Gancho, origen: Origen, estudio: Estudio, resultado: Resultado, rango: Rango,
  porque: Porque, metodo: Metodo, fallar: Fallar, frase: Frase, cierre: CierreEscena,
};
export const CAPITULOS: Record<string, string> = {
  gancho: "1/5 · EL MITO", origen: "1/5 · EL MITO", estudio: "2/5 · LA CIENCIA", resultado: "2/5 · LA CIENCIA", rango: "2/5 · LA CIENCIA",
  porque: "3/5 · POR QUÉ CUESTA", metodo: "4/5 · EL MÉTODO", fallar: "4/5 · EL MÉTODO", frase: "5/5 · RECUERDA", cierre: "5/5 · RECUERDA",
};
export const SFX: Record<string, Sfx> = {
  gancho: [["impact-bass-1.mp3", 0.05, 0.6], ["record-scratch.wav", "días", 0.3]],
  origen: [["whoosh.wav", 0, 0.5], ["typing.mp3", "sesenta", 0.35], ["pop.mp3", "semanas", 0.4]],
  estudio: [["whoosh.wav", 0, 0.5], ["typing.mp3", "96", 0.35], ["pop.mp3", "12", 0.4]],
  resultado: [["whoosh.wav", 0, 0.5], ["impact-bass-1.mp3", "66", 0.7], ["sparkle.mp3", "66", 0.35]],
  rango: [["whoosh.wav", 0, 0.5], ["pop.mp3", "18", 0.4], ["whip.wav", "254", 0.45]],
  porque: [["whoosh.wav", 0, 0.5], ["ding.wav", "22", 0.3], ["switch.wav", "fallado", 0.4]],
  metodo: [["page-turn.wav", 0, 0.5], ["typing.mp3", "regla", 0.35], ["mouse-click.wav", "hora", 0.6], ["mouse-click.wav", "sitio", 0.6], ["mouse-click.wav", "cuentas", 0.6]],
  fallar: [["whoosh.wav", 0, 0.5], ["record-scratch.wav", "fallar", 0.3], ["ding.wav", "sigues", 0.35]],
  frase: [["whoosh.wav", 0, 0.5], ["impact-bass-1.mp3", "uno", 0.6], ["sparkle.mp3", "uno", 0.4]],
  cierre: [["whoosh.wav", 0, 0.5], ["impact-bass-1.mp3", "mejor", 0.8], ["sparkle.mp3", "mejor", 0.4], ["ding.wav", "nos", 0.3]],
};
