// Escenas del vídeo 03 «Apilar hábitos». Cada escena se sincroniza con su voz mediante w("palabra").
import { AlarmIcon, AnchorIcon, BackpackIcon, BarbellIcon, BedIcon, BookOpenIcon, CoffeeIcon, ForkKnifeIcon, LinkIcon, ToothIcon } from "@phosphor-icons/react";
import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { Cierre } from "../Cierre";
import { C, Escena, FUENTE, Particulas, Tarjeta, pop, prog, useEscena } from "../serie/base";
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
type Icono = typeof CoffeeIcon;

/** Bloque de hábito: icono + texto, como una pieza que se apila. */
const Bloque: React.FC<{ I: Icono; texto: string; color: string; style?: React.CSSProperties }> = ({ I, texto, color, style }) => (
  <div style={{ position: "absolute", height: 150, borderRadius: 30, background: color, display: "flex", alignItems: "center", gap: 24, padding: "0 34px",
    boxShadow: "0 24px 50px rgba(0,0,0,.45)", ...style }}>
    <I size={84} weight="fill" color={C.verdeOscuro} /><div style={txt(52, C.verdeOscuro)}>{texto}</div>
  </div>
);

// ───────────────────────────── 1 · GANCHO ─────────────────────────────
// Pantalla partida desde el fotograma 1: cepillo ✓ / libro ✗.
export const Gancho: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const tL = w("leer");
  return (
    <AbsoluteFill>
      <Centro top={420}><div style={txt(84)}>¿POR QUÉ <span style={{ color: C.verde }}>NUNCA</span> OLVIDAS ESTO?</div></Centro>
      <div style={{ position: "absolute", left: 70, top: 640, width: 450, height: 760, borderRadius: 44, background: "rgba(34,197,94,.14)", border: `4px solid ${C.verde}`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
        <ToothIcon size={220} weight="fill" color="#e2e8f0" />
        <div style={txt(48)}>DIENTES</div>
        <div style={{ ...txt(120, C.verde), scale: String(pop(t, w("dientes"), 0.4)) }}>✓</div>
      </div>
      <div style={{ position: "absolute", left: 560, top: 640, width: 450, height: 760, borderRadius: 44, background: "rgba(239,68,68,.12)", border: `4px solid ${C.rojo}`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30, opacity: interpolate(t, [0, 0.01], [1, 1]) }}>
        <BookOpenIcon size={220} weight="fill" color="#94a3b8" style={{ opacity: 1 - 0.4 * prog(t, tL, 0.5) }} />
        <div style={txt(48)}>LEER</div>
        <div style={{ ...txt(120, C.rojo), scale: String(pop(t, tL, 0.4)) }}>✗</div>
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 2 · AUTOMÁTICO ─────────────────────────────
export const Automatico: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const tM = w("mitad");
  const lleno = prog(t, tM, 0.8);
  return (
    <AbsoluteFill>
      <Centro top={440}><div style={txt(70)}>CASI LA <span style={{ color: C.verde }}>MITAD</span> DE TU DÍA</div></Centro>
      <svg width={700} height={700} style={{ position: "absolute", left: 190, top: 580 }}>
        <circle cx={350} cy={350} r={290} fill="rgba(255,255,255,.08)" />
        <path d={`M350 350 L350 60 A290 290 0 ${lleno > 0.5 ? 1 : 0} 1 ${350 + 290 * Math.sin(2 * Math.PI * 0.45 * lleno)} ${350 - 290 * Math.cos(2 * Math.PI * 0.45 * lleno)} Z`}
          fill={C.verde} opacity={lleno > 0 ? 1 : 0} />
      </svg>
      <Centro top={1330}><Pastilla color={C.verde} size={56} style={{ scale: String(pop(t, w("automático") - 0.1)) }}>EN AUTOMÁTICO</Pastilla></Centro>
      <Personaje look={LOOKS.novato} x={880} y={1680} escala={0.5} desfase={0.4} poses={[[0, "walk"]]} animo={[[0, 0.3]]} />
    </AbsoluteFill>
  );
};

// ───────────────────────────── 3 · DISPARADOR ─────────────────────────────
export const Disparador: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const pasos: { I: Icono; texto: string; t0: number }[] = [
    { I: AlarmIcon, texto: "TE LEVANTAS", t0: w("levantas") },
    { I: BedIcon, texto: "VAS AL BAÑO", t0: w("baño") },
    { I: ToothIcon, texto: "PASA SOLO", t0: w("solo") },
  ];
  return (
    <AbsoluteFill>
      <Centro top={440}><div style={{ ...txt(76), opacity: prog(t, 0, 0.3) }}>TIENE UN <span style={{ color: C.amarillo }}>DISPARADOR</span></div></Centro>
      {pasos.map((p, i) => {
        const u = pop(t, p.t0 - 0.1, 0.4);
        return (
          <div key={i} style={{ position: "absolute", left: 130, top: 660 + i * 270, display: "flex", alignItems: "center", gap: 40, opacity: Math.min(1, u * 1.5),
            translate: `${(1 - Math.min(1, u)) * 120}px 0px` }}>
            <div style={{ width: 190, height: 190, borderRadius: 50, background: i === 2 ? C.verde : "rgba(255,255,255,.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p.I size={110} weight="fill" color={i === 2 ? C.verdeOscuro : "#e2e8f0"} />
            </div>
            <div style={txt(64, i === 2 ? C.verde : C.blanco)}>{p.texto}</div>
          </div>
        );
      })}
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        {[0, 1].map((i) => <line key={i} x1={225} y1={850 + i * 270} x2={225} y2={850 + i * 270 + 80 * prog(t, pasos[i + 1].t0 - 0.2, 0.3)} stroke={C.amarillo} strokeWidth={10} strokeLinecap="round" />)}
      </svg>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 4 · FLOTA ─────────────────────────────
export const Flota: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const sube = prog(t, w("flotando") - 0.2, 2.2);
  const se = prog(t, w("olvida") - 0.1, 0.6);
  return (
    <AbsoluteFill>
      <Centro top={440}><div style={txt(72)}>SIN DISPARADOR…</div></Centro>
      <div style={{ position: "absolute", left: 390, top: 1100 - 420 * sube, rotate: `${Math.sin(t * 2.4) * 10}deg`, opacity: 1 - 0.85 * se, filter: `blur(${se * 8}px)` }}>
        <BookOpenIcon size={300} weight="fill" color="#cbd5e1" />
      </div>
      <Centro top={1300}><div style={{ ...txt(80, C.rojo), opacity: prog(t, w("olvida"), 0.3) }}>SE OLVIDA</div></Centro>
      <Tarjeta style={{ left: 220, top: 1440, width: 640, height: 220, flexDirection: "column", alignItems: "flex-start", padding: "26px 40px", gap: 8,
        scale: String(pop(t, w("propósitos") - 0.15)), rotate: "-3deg" }}>
        <div style={txt(34, C.tinta, { letterSpacing: "0.06em" })}>PROPÓSITOS</div>
        {["Leer más", "Ir al gym"].map((x, i) => <div key={i} style={{ ...txt(36, "#64748b", { letterSpacing: 0 }), textDecoration: "line-through" }}>☐ {x}</div>)}
      </Tarjeta>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 5 · EL MÉTODO ─────────────────────────────
export const Metodo: React.FC<{ e: Escena }> = ({ e }) => {
  const { t } = useEscena(e);
  return (
    <AbsoluteFill>
      <Centro top={470}><div style={{ ...txt(40, "#bfdbfe", { letterSpacing: "0.14em" }), opacity: prog(t, 0, 0.3) }}>MÉTODO Nº 2</div></Centro>
      <Centro top={600}><SplitFlap casillas={6} ancho={140} alto={210} tam={160} hueco={10} pasos={[{ t: 0, texto: "      ", color: C.blanco }, { t: 0.4, texto: "APILAR", color: C.verde }]} brillo /></Centro>
      <Centro top={850}><SplitFlap casillas={7} ancho={124} alto={190} tam={140} hueco={10} pasos={[{ t: 0, texto: "       ", color: C.blanco }, { t: 0.9, texto: "HÁBITOS", color: C.blanco }]} /></Centro>
      {[C.verde, C.amarillo, "#38bdf8"].map((c, i) => (
        <div key={i} style={{ position: "absolute", left: 340, top: 1450 - i * 110, width: 400, height: 96, borderRadius: 24, background: c,
          translate: `0px ${(1 - pop(t, 0.6 + i * 0.25, 0.5)) * -600}px`, opacity: prog(t, 0.6 + i * 0.25, 0.1) }} />
      ))}
    </AbsoluteFill>
  );
};

// ───────────────────────────── 6 · FÓRMULA ─────────────────────────────
export const Formula: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  return (
    <AbsoluteFill>
      <Tarjeta style={{ left: 70, top: 560, width: 940, height: 700, flexDirection: "column", gap: 40, scale: String(pop(t, 0.05, 0.5)) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <AnchorIcon size={80} weight="fill" color="#15803d" />
          <div style={txt(70, C.tinta)}>DESPUÉS DE <span style={{ color: "#94a3b8" }}>___</span></div>
        </div>
        <div style={{ ...txt(90, C.verde), opacity: prog(t, w("nuevo") - 0.4, 0.3) }}>↓</div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, opacity: prog(t, w("nuevo") - 0.2, 0.3) }}>
          <LinkIcon size={80} weight="fill" color="#15803d" />
          <div style={txt(70, C.tinta)}>HAGO <span style={{ color: C.verde }}>___</span></div>
        </div>
      </Tarjeta>
      <Centro top={1340}><div style={{ ...txt(44, C.gris), opacity: prog(t, w("haces"), 0.3) }}>lo viejo te recuerda lo nuevo</div></Centro>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 7 · EJEMPLOS (bloques que se apilan) ─────────────────────────────
export const Ejemplos: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const filas: { a: Icono; ta: string; b: Icono; tb: string; t0: number; t1: number; color: string }[] = [
    { a: CoffeeIcon, ta: "CAFÉ", b: BookOpenIcon, tb: "1 PÁGINA", t0: w("café"), t1: w("página"), color: C.verde },
    { a: ToothIcon, ta: "DIENTES", b: BarbellIcon, tb: "10 FLEXIONES", t0: w("dientes"), t1: w("flexiones"), color: C.amarillo },
    { a: ForkKnifeIcon, ta: "CENAR", b: BackpackIcon, tb: "MOCHILA", t0: w("cenar"), t1: w("mochila"), color: "#38bdf8" },
  ];
  return (
    <AbsoluteFill>
      <Centro top={440}><div style={txt(64)}>DESPUÉS DE… <span style={{ color: C.verde }}>HAGO…</span></div></Centro>
      {filas.map((f, i) => {
        const y = 1400 - i * 300, ua = pop(t, f.t0 - 0.15, 0.45), ub = pop(t, f.t1 - 0.15, 0.45);
        return (
          <React.Fragment key={i}>
            <Bloque I={f.a} texto={f.ta} color="#e2e8f0" style={{ left: 70, top: y, width: 420, translate: `0px ${(1 - Math.min(1, ua)) * -500}px`, opacity: prog(t, f.t0 - 0.15, 0.1) }} />
            <div style={{ position: "absolute", left: 500, top: y + 40, ...txt(64, f.color), opacity: prog(t, f.t1 - 0.2, 0.2) }}>→</div>
            <Bloque I={f.b} texto={f.tb} color={f.color} style={{ left: 570, top: y, width: 440, translate: `0px ${(1 - Math.min(1, ub)) * -500}px`, opacity: prog(t, f.t1 - 0.15, 0.1) }} />
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

// ───────────────────────────── 8 · BJ FOGG ─────────────────────────────
export const Fogg: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  return (
    <AbsoluteFill>
      <Tarjeta style={{ left: 120, top: 520, width: 840, height: 300, flexDirection: "column", gap: 10, scale: String(pop(t, 0.05, 0.5)) }}>
        <div style={txt(72, C.tinta)}>BJ FOGG</div>
        <div style={txt(36, "#64748b", { letterSpacing: 0 })}>Universidad de Stanford · «Tiny Habits»</div>
      </Tarjeta>
      <div style={{ position: "absolute", left: 140, top: 980, display: "flex", alignItems: "center", gap: 30, opacity: prog(t, w("viejo") - 0.1, 0.3) }}>
        <AnchorIcon size={130} weight="fill" color="#e2e8f0" /><div style={txt(60)}>HÁBITO VIEJO</div>
      </div>
      <div style={{ position: "absolute", left: 200, top: 1150, ...txt(80, C.verde), opacity: prog(t, w("recordatorio") - 0.2, 0.3) }}>= RECORDATORIO</div>
      <div style={{ position: "absolute", left: 140, top: 1320, display: "flex", alignItems: "center", gap: 30, opacity: prog(t, w("nuevo") - 0.1, 0.3) }}>
        <LinkIcon size={130} weight="fill" color={C.verde} /><div style={txt(60, C.verde)}>DEL NUEVO</div>
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 9 · FRASE ─────────────────────────────
export const Frase: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const tE = w("engancha");
  return (
    <AbsoluteFill>
      <Centro top={620}><div style={{ ...txt(110, C.blanco, { textAlign: "center" }), scale: String(interpolate(t, [tE - 0.05, tE + 0.3], [2.4, 1], clamp)), opacity: prog(t, tE - 0.05, 0.15) }}>
        ENGANCHA<br /><span style={{ color: C.verde }}>LO NUEVO</span></div></Centro>
      <Centro top={950}><div style={{ ...txt(64, C.gris), opacity: prog(t, w("haces") - 0.4, 0.3) }}>a algo que ya haces</div></Centro>
      <Particulas x={540} y={760} t={t} t0={tE} n={22} radio={380} />
      <Personaje look={LOOKS.pro} x={540} y={1520} escala={0.72} desfase={0.2} poses={[[0, "idle"], [tE, "cheer"]]} animo={[[0, 0.6], [tE, 1]]} />
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
  gancho: Gancho, automatico: Automatico, disparador: Disparador, flota: Flota, metodo: Metodo,
  formula: Formula, ejemplos: Ejemplos, fogg: Fogg, frase: Frase, cierre: CierreEscena,
};
export const CAPITULOS: Record<string, string> = {
  gancho: "1/5 · EL PROBLEMA", automatico: "1/5 · EL PROBLEMA", disparador: "2/5 · POR QUÉ PASA", flota: "2/5 · POR QUÉ PASA",
  metodo: "3/5 · EL MÉTODO", formula: "3/5 · EL MÉTODO", ejemplos: "3/5 · EL MÉTODO", fogg: "4/5 · LA PRUEBA", frase: "5/5 · RECUERDA", cierre: "5/5 · RECUERDA",
};
export const SFX: Record<string, Sfx> = {
  gancho: [["impact-bass-1.mp3", 0.05, 0.6], ["ding.wav", "dientes", 0.35], ["record-scratch.wav", "leer", 0.3]],
  automatico: [["whoosh.wav", 0, 0.5], ["pop.mp3", "mitad", 0.4]],
  disparador: [["whoosh.wav", 0, 0.5], ["mouse-click.wav", "levantas", 0.6], ["mouse-click.wav", "baño", 0.6], ["ding.wav", "solo", 0.35]],
  flota: [["whoosh.wav", 0, 0.5], ["whip.wav", "olvida", 0.4], ["page-turn.wav", "propósitos", 0.5]],
  metodo: [["page-turn.wav", 0, 0.5], ["typing.mp3", 0.4, 0.35], ["impact-bass-1.mp3", "hábitos", 0.6]],
  formula: [["whoosh.wav", 0, 0.5], ["switch.wav", "nuevo", 0.4]],
  ejemplos: [["whoosh.wav", 0, 0.5], ["pop.mp3", "café", 0.4], ["pop.mp3", "página", 0.4], ["pop.mp3", "dientes", 0.4], ["pop.mp3", "flexiones", 0.4], ["pop.mp3", "cenar", 0.4], ["pop.mp3", "mochila", 0.4]],
  fogg: [["whoosh.wav", 0, 0.5], ["ding.wav", "recordatorio", 0.35]],
  frase: [["whoosh.wav", 0, 0.5], ["impact-bass-1.mp3", "engancha", 0.6], ["sparkle.mp3", "engancha", 0.4]],
  cierre: [["whoosh.wav", 0, 0.5], ["impact-bass-1.mp3", "mejor", 0.8], ["sparkle.mp3", "mejor", 0.4], ["ding.wav", "nos", 0.3]],
};
