// Escenas del vídeo 05 «El premio pegado». Cada escena se sincroniza con su voz mediante w("palabra").
import { BarbellIcon, BicycleIcon, BookOpenIcon, BrainIcon, CoffeeIcon, CouchIcon, GiftIcon, HeadphonesIcon, LockIcon, LockOpenIcon,
  PersonSimpleWalkIcon, StudentIcon, TelevisionIcon } from "@phosphor-icons/react";
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
const Circulo: React.FC<{ I: Icono; color: string; tam?: number; style?: React.CSSProperties }> = ({ I, color, tam = 260, style }) => (
  <div style={{ position: "absolute", width: tam, height: tam, borderRadius: tam / 2, background: color, display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 30px 70px rgba(0,0,0,.5)", ...style }}><I size={tam * 0.56} weight="fill" color={C.verdeOscuro} /></div>
);

// ───────────────────────────── 1 · GANCHO ─────────────────────────────
// Desde el fotograma 1: mancuerna + tele = ?
export const Gancho: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const junta = prog(t, w("serie") - 0.1, 0.5);
  return (
    <AbsoluteFill>
      <Centro top={420}><div style={txt(88)}>GYM <span style={{ color: C.verde }}>+</span> SERIE <span style={{ color: C.amarillo }}>= ?</span></div></Centro>
      <Circulo I={BarbellIcon} color={C.verde} style={{ left: 120 + 130 * junta, top: 760 }} />
      <Circulo I={TelevisionIcon} color={C.amarillo} style={{ left: 700 - 130 * junta, top: 760 }} />
      <Centro top={1150}><Pastilla color={C.blanco} tinta={C.tinta} size={52} style={{ scale: String(pop(t, w("truco") - 0.05)) }}>UN TRUCO</Pastilla></Centro>
      <Particulas x={540} y={890} t={t} t0={w("serie") + 0.4} n={18} radio={300} />
    </AbsoluteFill>
  );
};

// ───────────────────────────── 2 · EL PROBLEMA (balanza) ─────────────────────────────
export const Problema: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const inclina = interpolate(t, [w("sofá") - 0.1, w("ahora")], [0, 1], { ...clamp, easing: (u) => 1 - Math.pow(1 - u, 3) });
  const ang = -14 * inclina;
  return (
    <AbsoluteFill>
      <Centro top={440}><div style={{ ...txt(64), opacity: prog(t, w("premio") - 0.1, 0.3) }}>EL PREMIO LLEGA <span style={{ color: C.rojo }}>TARDE</span></div></Centro>
      <div style={{ position: "absolute", left: 140, top: 900, width: 800, height: 20, borderRadius: 10, background: "#cbd5e1", rotate: `${ang}deg` }}>
        <div style={{ position: "absolute", left: -40, top: -260, display: "flex", flexDirection: "column", alignItems: "center", rotate: `${-ang}deg` }}>
          <BarbellIcon size={160} weight="fill" color={C.verde} /><div style={txt(36, C.gris)}>EN MESES</div>
        </div>
        <div style={{ position: "absolute", right: -40, top: -260, display: "flex", flexDirection: "column", alignItems: "center", rotate: `${-ang}deg`, opacity: prog(t, w("sofá") - 0.2, 0.3) }}>
          <CouchIcon size={190} weight="fill" color={C.amarillo} /><div style={txt(36, C.amarillo)}>AHORA</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 510, top: 910, width: 0, height: 0, borderLeft: "60px solid transparent", borderRight: "60px solid transparent", borderBottom: "120px solid #64748b", translate: "-30px 0px" }} />
      <Centro top={1250}><Pastilla color={C.amarillo} size={48} style={{ scale: String(pop(t, w("ahora") - 0.05)) }}>EL SOFÁ PAGA YA</Pastilla></Centro>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 3 · CEREBRO ─────────────────────────────
export const Cerebro: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const corre = prog(t, w("elige") - 0.1, 1.2);
  return (
    <AbsoluteFill>
      <Centro top={460}><div style={{ display: "flex", alignItems: "center", gap: 24, ...txt(70) }}>
        <BrainIcon size={110} weight="fill" color="#f472b6" style={{ scale: String(1 + 0.06 * Math.sin(t * 8)) }} />TU CEREBRO</div></Centro>
      <Centro top={640}><div style={{ ...txt(56, C.gris), opacity: prog(t, w("elige") - 0.1, 0.3) }}>siempre elige lo que paga <span style={{ color: C.amarillo }}>ya</span></div></Centro>
      <div style={{ position: "absolute", left: 760, top: 1180 }}><CouchIcon size={240} weight="fill" color={C.amarillo} /></div>
      <Personaje look={LOOKS.novato} x={220 + 470 * corre} y={1500} escala={0.7} desfase={0.3} poses={[[0, "idle"], [w("elige"), "run"], [w("ahora"), "sit"]]} animo={[[0, 0.2], [w("ahora"), 0.8]]} />
    </AbsoluteFill>
  );
};

// ───────────────────────────── 4 · EL MÉTODO ─────────────────────────────
export const Metodo: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  return (
    <AbsoluteFill>
      <Centro top={450}><div style={{ ...txt(40, "#bfdbfe", { letterSpacing: "0.14em" }), opacity: prog(t, 0, 0.3) }}>MÉTODO Nº 4</div></Centro>
      <Centro top={560}><SplitFlap casillas={6} ancho={140} alto={210} tam={160} hueco={10} pasos={[{ t: 0, texto: "      ", color: C.blanco }, { t: w("premio") - 0.2, texto: "PREMIO", color: C.amarillo }]} brillo /></Centro>
      <Centro top={800}><SplitFlap casillas={6} ancho={140} alto={210} tam={160} hueco={10} pasos={[{ t: 0, texto: "      ", color: C.blanco }, { t: w("pegado") - 0.2, texto: "PEGADO", color: C.blanco }]} /></Centro>
      <Tarjeta style={{ left: 90, top: 1120, width: 900, height: 300, flexDirection: "column", gap: 12, scale: String(pop(t, w("capricho") - 0.1)) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, ...txt(54, C.tinta) }}><GiftIcon size={70} weight="fill" color="#15803d" />UN CAPRICHO…</div>
        <div style={{ ...txt(46, C.tinta, { letterSpacing: 0 }), opacity: prog(t, w("mientras") - 0.1, 0.3) }}>SOLO mientras haces <span style={{ color: "#15803d" }}>lo que cuesta</span></div>
      </Tarjeta>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 5 · EL ESTUDIO (candado) ─────────────────────────────
export const Estudio: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const abre = prog(t, w("gimnasio") - 0.1, 0.4);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 70, top: 440, opacity: prog(t, 0.05, 0.3) }}>
        <div style={txt(52)}>UN ESTUDIO</div>
        <div style={txt(28, C.gris, { letterSpacing: 0 })}>Universidad de Pensilvania · Milkman y otros, 2014</div>
      </div>
      <Circulo I={HeadphonesIcon} color="#38bdf8" tam={320} style={{ left: 380, top: 700, scale: String(pop(t, w("audiolibros") - 0.2)) }} />
      <div style={{ position: "absolute", left: 470, top: 1080, scale: String(pop(t, w("solo") - 0.1)) }}>
        {abre > 0.5 ? <LockOpenIcon size={150} weight="fill" color={C.verde} /> : <LockIcon size={150} weight="fill" color={C.rojo} />}
      </div>
      <Centro top={1290}><div style={{ ...txt(56), opacity: prog(t, w("audiolibros"), 0.3) }}>AUDIOLIBROS…</div></Centro>
      <Centro top={1390}><Pastilla color={C.verde} size={48} style={{ scale: String(pop(t, w("gimnasio") - 0.05)) }}>SOLO EN EL GIMNASIO</Pastilla></Centro>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 6 · RESULTADO ─────────────────────────────
export const Resultado: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const b = prog(t, w("bastante") - 0.1, 0.9);
  return (
    <AbsoluteFill>
      <Centro top={440}><div style={txt(64)}>¿Y QUÉ PASÓ?</div></Centro>
      <div style={{ position: "absolute", left: 170, bottom: 620, width: 300, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ width: 220, height: 300 * b, borderRadius: "26px 26px 8px 8px", background: "#64748b" }} />
        <div style={txt(36, C.gris)}>LOS DEMÁS</div>
      </div>
      <div style={{ position: "absolute", left: 610, bottom: 620, width: 300, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ width: 220, height: 560 * b, borderRadius: "26px 26px 8px 8px", background: C.verde, boxShadow: `0 0 40px ${C.verde}88` }} />
        <div style={txt(36, C.verde)}>CON PREMIO</div>
      </div>
      <Centro top={1380}><div style={{ display: "flex", alignItems: "center", gap: 20, ...txt(50), opacity: prog(t, w("historia") - 0.3, 0.3) }}>
        <BookOpenIcon size={70} weight="fill" color="#38bdf8" />¿CÓMO SEGUÍA LA HISTORIA?</div></Centro>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 7 · EJEMPLOS ─────────────────────────────
export const Ejemplos: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const filas: { a: Icono; b: Icono; ta: string; tb: string; t0: number; color: string }[] = [
    { a: HeadphonesIcon, b: PersonSimpleWalkIcon, ta: "PÓDCAST", tb: "CAMINANDO", t0: w("caminando"), color: "#38bdf8" },
    { a: TelevisionIcon, b: BicycleIcon, ta: "TU SERIE", tb: "EN LA BICI", t0: w("bici"), color: C.amarillo },
    { a: CoffeeIcon, b: StudentIcon, ta: "TU CAFÉ", tb: "ESTUDIANDO", t0: w("estudias"), color: C.verde },
  ];
  return (
    <AbsoluteFill>
      <Centro top={440}><div style={txt(64)}>TU <span style={{ color: C.verde }}>PREMIO PEGADO</span></div></Centro>
      {filas.map((f, i) => {
        const u = pop(t, f.t0 - 0.4, 0.45);
        return (
          <div key={i} style={{ position: "absolute", left: 80, top: 620 + i * 300, width: 920, height: 240, borderRadius: 40, background: "rgba(255,255,255,.08)",
            border: `3px solid ${f.color}`, display: "flex", alignItems: "center", justifyContent: "space-around", scale: String(u) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}><f.a size={96} weight="fill" color={f.color} /><div style={txt(44)}>{f.ta}</div></div>
            <div style={txt(56, f.color)}>+</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}><f.b size={96} weight="fill" color={f.color} /><div style={txt(44)}>{f.tb}</div></div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ───────────────────────────── 8 · LA CLAVE ─────────────────────────────
export const Regla: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  return (
    <AbsoluteFill>
      <Centro top={470}><Pastilla color={C.amarillo} size={52} style={{ scale: String(pop(t, w("clave") - 0.1)) }}>LA CLAVE</Pastilla></Centro>
      <div style={{ position: "absolute", left: 300, top: 720, width: 480, height: 640, borderRadius: 30, background: "#1e293b", border: "8px solid #475569",
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <GiftIcon size={220} weight="fill" color={C.amarillo} />
        <div style={{ position: "absolute", right: 40, top: 300 }}><LockIcon size={70} weight="fill" color="#94a3b8" /></div>
      </div>
      <Centro top={1420}><div style={{ ...txt(56, C.blanco, { textAlign: "center" }), opacity: prog(t, w("fuera") - 0.2, 0.3) }}>NO EXISTE <span style={{ color: C.rojo }}>FUERA</span> DEL HÁBITO</div></Centro>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 9 · FRASE ─────────────────────────────
export const Frase: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const tR = w("regalo");
  return (
    <AbsoluteFill>
      <Centro top={500}><div style={{ ...txt(84, C.blanco, { textAlign: "center" }), opacity: prog(t, 0, 0.3) }}>LO DIFÍCIL…</div></Centro>
      <Centro top={650}><div style={{ ...txt(110, C.verde, { textAlign: "center" }), scale: String(interpolate(t, [tR - 0.1, tR + 0.25], [2.2, 1], clamp)), opacity: prog(t, tR - 0.1, 0.15) }}>CON REGALO</div></Centro>
      <div style={{ position: "absolute", left: 400, top: 900, scale: String(pop(t, tR - 0.1, 0.5)) }}><GiftIcon size={280} weight="fill" color={C.amarillo} /></div>
      <Particulas x={540} y={1040} t={t} t0={tR} n={24} radio={420} />
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
  gancho: Gancho, problema: Problema, cerebro: Cerebro, metodo: Metodo, estudio: Estudio,
  resultado: Resultado, ejemplos: Ejemplos, regla: Regla, frase: Frase, cierre: CierreEscena,
};
export const CAPITULOS: Record<string, string> = {
  gancho: "1/5 · EL TRUCO", problema: "2/5 · POR QUÉ CUESTA", cerebro: "2/5 · POR QUÉ CUESTA", metodo: "3/5 · EL MÉTODO",
  estudio: "4/5 · LA PRUEBA", resultado: "4/5 · LA PRUEBA", ejemplos: "3/5 · EL MÉTODO", regla: "3/5 · EL MÉTODO", frase: "5/5 · RECUERDA", cierre: "5/5 · RECUERDA",
};
export const SFX: Record<string, Sfx> = {
  gancho: [["impact-bass-1.mp3", 0.05, 0.6], ["pop.mp3", "truco", 0.4], ["sparkle.mp3", "serie", 0.35]],
  problema: [["whoosh.wav", 0, 0.5], ["switch.wav", "sofá", 0.4], ["impact-bass-1.mp3", "ahora", 0.5]],
  cerebro: [["whoosh.wav", 0, 0.5], ["whip.wav", "elige", 0.4]],
  metodo: [["page-turn.wav", 0, 0.5], ["typing.mp3", "premio", 0.35], ["pop.mp3", "capricho", 0.4]],
  estudio: [["whoosh.wav", 0, 0.5], ["pop.mp3", "audiolibros", 0.4], ["mouse-click.wav", "gimnasio", 0.6]],
  resultado: [["whoosh.wav", 0, 0.5], ["ding.wav", "bastante", 0.35]],
  ejemplos: [["whoosh.wav", 0, 0.5], ["pop.mp3", "caminando", 0.4], ["pop.mp3", "bici", 0.4], ["pop.mp3", "estudias", 0.4]],
  regla: [["whoosh.wav", 0, 0.5], ["impact-bass-1.mp3", "clave", 0.5]],
  frase: [["whoosh.wav", 0, 0.5], ["impact-bass-1.mp3", "regalo", 0.6], ["sparkle.mp3", "regalo", 0.4]],
  cierre: [["whoosh.wav", 0, 0.5], ["impact-bass-1.mp3", "mejor", 0.8], ["sparkle.mp3", "mejor", 0.4], ["ding.wav", "nos", 0.3]],
};
