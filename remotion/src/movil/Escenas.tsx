// Escenas del vídeo 02 «No eres adicto al móvil». Cada escena se sincroniza con su voz
// mediante w("palabra"): el momento (s) en que se dice esa palabra dentro de la escena.
import {
  BellIcon, BellSlashIcon, ChatCircleIcon, CheckIcon, DeviceMobileIcon, DoorIcon, FlaskIcon,
  HeartIcon, LaptopIcon, PlugIcon, PowerIcon, SquaresFourIcon, TimerIcon,
} from "@phosphor-icons/react";
import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { Cierre } from "../Cierre";
import { C, Escena, FUENTE, Neon, Particulas, Tarjeta, lerp, pop, prog, useEscena } from "../serie/base";
import { LOOKS, Personaje } from "../serie/Personaje";
import { SplitFlap } from "../serie/SplitFlap";

const txt = (size: number, color: string = C.blanco, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: FUENTE, fontWeight: 900, fontSize: size, color, letterSpacing: "-0.03em", lineHeight: 1.05, ...extra,
});
const Centro: React.FC<{ top: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ top, children, style }) => (
  <div style={{ position: "absolute", left: 60, right: 60, top, display: "flex", justifyContent: "center", ...style }}>{children}</div>
);
const Pastilla: React.FC<{ color: string; tinta?: string; size?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ color, tinta = C.verdeOscuro, size = 40, children, style }) => (
  <div style={{ ...txt(size, tinta), letterSpacing: "0.04em", padding: "14px 30px", borderRadius: 999, background: color, ...style }}>{children}</div>
);

/** El móvil de la serie: carcasa oscura con pantalla encendida. */
const Movil: React.FC<{ ancho: number; brillo?: number; children?: React.ReactNode; style?: React.CSSProperties }> = ({ ancho, brillo = 1, children, style }) => (
  <div style={{ position: "absolute", width: ancho, height: ancho * 1.95, borderRadius: ancho * 0.16, background: "#0b1020",
    border: `${ancho * 0.035}px solid #334155`, boxShadow: `0 40px 90px rgba(0,0,0,.6), 0 0 ${80 * brillo}px #38bdf855`, overflow: "hidden", ...style }}>
    <div style={{ position: "absolute", inset: ancho * 0.04, borderRadius: ancho * 0.11,
      background: `linear-gradient(160deg, #1e3a8a, #0ea5e9 ${60 * brillo}%, #22c55e)`, opacity: 0.35 + 0.65 * brillo }} />
    <div style={{ position: "absolute", left: "50%", top: ancho * 0.07, width: ancho * 0.3, height: ancho * 0.07, marginLeft: -ancho * 0.15, borderRadius: 99, background: "#0b1020" }} />
    {children}
  </div>
);

// ───────────────────────────── 1 · GANCHO ─────────────────────────────
export const Gancho: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const caida = interpolate(t, [0, 0.45], [-420, 0], { extrapolateRight: "clamp", easing: (u) => 1 - Math.pow(1 - u, 3) * Math.cos(u * 4) });
  const tAnzuelo = w("diseñado");
  const linea = prog(t, tAnzuelo, 0.45);
  const tira = prog(t, w("engancharte"), 0.5);
  const iconos = [C.rojo, C.amarillo, C.morado, "#38bdf8", C.verde, "#f472b6", C.naranja, "#a3e635", "#f43f5e"];
  return (
    <AbsoluteFill>
      <Centro top={430}>
        <div style={{ display: "flex", gap: 22, ...txt(92) }}>
          <span>NO ERES</span><span style={{ color: C.rojo, position: "relative" }}>ADICTO</span>
        </div>
      </Centro>
      <Neon x={575} y={478} ancho={380} u={prog(t, w("está"), 0.25)} />
      <Movil ancho={270} brillo={0.6 + 0.4 * Math.sin(t * 6) ** 2} style={{ left: 405, top: 570 + caida, rotate: `${(1 - prog(t, 0.2, 0.5)) * -10}deg` }}>
        <div style={{ position: "absolute", left: 26, right: 26, top: 120, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
          {iconos.map((c, i) => <div key={i} style={{ height: 56, borderRadius: 16, background: c, scale: String(pop(t, 0.3 + i * 0.04, 0.3)) }} />)}
        </div>
        <div style={{ position: "absolute", left: 14, right: 14, top: 36, padding: "10px 12px", borderRadius: 16, background: "rgba(255,255,255,.92)",
          ...txt(22, C.tinta, { letterSpacing: 0, lineHeight: 1.15 }), opacity: prog(t, tAnzuelo, 0.25), translate: `0px ${(1 - prog(t, tAnzuelo, 0.3)) * -60}px` }}>
          Diseñado para<br /><span style={{ color: C.rojo }}>engancharte</span>
        </div>
      </Movil>
      {/* Hilo y anzuelo que bajan del móvil y atrapan al Novato */}
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0 }}>
        <line x1={540} y1={1095 + caida} x2={540} y2={lerp(1095, 1170 - 60 * tira, linea)} stroke="#e2e8f0" strokeWidth={5} />
        {linea > 0.05 ? <path d={`M540 ${lerp(1095, 1170 - 60 * tira, linea)} v40 a26 26 0 1 1 -40 -6`} stroke="#e2e8f0" strokeWidth={9} fill="none" strokeLinecap="round" /> : null}
      </svg>
      <Personaje look={LOOKS.novato} x={540} y={1490 - 60 * tira} escala={0.72} desfase={0.4}
        poses={[[0, "phone"], [w("engancharte"), "tired"]]} animo={[[0, 0.3], [tAnzuelo, -0.6], [w("engancharte"), -1]]} movil />
    </AbsoluteFill>
  );
};

// ───────────────────────────── 2 · 96 VECES ─────────────────────────────
export const Veces: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const t96 = w("96");
  return (
    <AbsoluteFill>
      <Centro top={470}><SplitFlap casillas={2} ancho={210} alto={310} tam={250} hueco={14} brillo={t > t96 + 0.5}
        pasos={[{ t: 0, texto: "  ", color: C.blanco }, { t: t96 - 0.15, texto: "96", color: C.verde }]} /></Centro>
      <Centro top={815}><div style={{ ...txt(76), opacity: prog(t, w("veces"), 0.3), translate: `0px ${(1 - prog(t, w("veces"))) * 30}px` }}>VECES AL DÍA</div></Centro>
      <Centro top={910}><div style={{ ...txt(30, C.gris, { letterSpacing: "0.04em" }), opacity: prog(t, w("día"), 0.3) }}>Estudio Asurion · 2019</div></Centro>
      {/* Cada vez que mira el móvil, sale un «+1» */}
      {new Array(9).fill(0).map((_, i) => {
        const t0 = w("miramos") + i * 0.3;
        if (t < t0) return null;
        const u = prog(t, t0, 0.8);
        return <div key={i} style={{ position: "absolute", left: 610 + (i % 3) * 40, top: 1110 - u * 140, ...txt(44, C.verde), opacity: 1 - u }}>+1</div>;
      })}
      <Personaje look={LOOKS.novato} x={540} y={1490} escala={0.72} desfase={1.1} poses={[[0, "phone"]]} animo={[[0, 0.2]]} movil />
    </AbsoluteFill>
  );
};

// ───────────────────────────── 3 · TRAGAPERRAS ─────────────────────────────
const SIMBOLOS = [
  { I: HeartIcon, c: "#f43f5e" }, { I: ChatCircleIcon, c: "#3b82f6" }, { I: BellIcon, c: C.amarillo },
  { I: HeartIcon, c: "#f43f5e" }, { I: ChatCircleIcon, c: "#3b82f6" }, { I: BellIcon, c: C.amarillo },
];
const Rodillo: React.FC<{ t: number; arranca: number; para: number; final: number; vuelve: number }> = ({ t, arranca, para, final, vuelve }) => {
  const H = 230;
  const girando = (t >= arranca && t < para) || t >= vuelve;
  let pos: number;
  if (t < arranca) pos = 0;
  else if (t < para) pos = (t - arranca) * 14;
  else if (t < vuelve) {
    const base = Math.ceil((para - arranca) * 14 / SIMBOLOS.length) * SIMBOLOS.length + final;
    pos = lerp((para - arranca) * 14, base, prog(t, para, 0.35));
  } else pos = (t - vuelve) * 14 + 100;
  return (
    <div style={{ width: 200, height: H, borderRadius: 22, background: "#fff", overflow: "hidden", position: "relative", boxShadow: "inset 0 10px 20px rgba(0,0,0,.25)" }}>
      {[-1, 0, 1].map((k) => {
        const idx = Math.floor(pos) + k;
        const s = SIMBOLOS[((idx % SIMBOLOS.length) + SIMBOLOS.length) % SIMBOLOS.length];
        const y = (k - (pos - Math.floor(pos))) * H;
        return (
          <div key={k} style={{ position: "absolute", left: 0, right: 0, top: y, height: H, display: "flex", alignItems: "center", justifyContent: "center",
            filter: girando ? "blur(6px)" : undefined }}>
            <s.I size={140} weight="fill" color={s.c} />
          </div>
        );
      })}
    </div>
  );
};
export const Tragaperras: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const ta = w("notificación"), tv = w("vuelves");
  const palanca = Math.max(1 - Math.abs(t - ta - 0.2) / 0.25, 1 - Math.abs(t - tv - 0.15) / 0.25, 0);
  return (
    <AbsoluteFill>
      <Centro top={440}><Pastilla color={C.amarillo} size={44} style={{ scale: String(pop(t, 0.1)) }}>¿QUÉ PREMIO TOCA?</Pastilla></Centro>
      <div style={{ position: "absolute", left: 120, top: 580, width: 760, height: 560, borderRadius: 48, background: "linear-gradient(180deg,#dc2626,#7f1d1d)",
        border: "12px solid #facc15", boxShadow: "0 40px 90px rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", gap: 22,
        scale: String(pop(t, 0, 0.5)) }}>
        <Rodillo t={t} arranca={ta} para={w("nunca")} final={0} vuelve={tv} />
        <Rodillo t={t} arranca={ta + 0.05} para={w("premio")} final={1} vuelve={tv + 0.05} />
        <Rodillo t={t} arranca={ta + 0.1} para={w("toca")} final={2} vuelve={tv + 0.1} />
      </div>
      {/* Palanca */}
      <div style={{ position: "absolute", left: 890, top: 640, width: 18, height: 260, borderRadius: 9, background: "#cbd5e1", transformOrigin: "50% 100%", rotate: `x ${palanca * 70}deg` }} />
      <div style={{ position: "absolute", left: 870, top: 600 + palanca * 150, width: 58, height: 58, borderRadius: "50%", background: C.rojo, boxShadow: "inset -8px -8px 0 #991b1b" }} />
      <Centro top={1200}><div style={{ ...txt(64), opacity: prog(t, w("vuelves"), 0.25) }}>…y por eso <span style={{ color: C.rojo }}>VUELVES</span></div></Centro>
      {/* Notificaciones que caen */}
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: "absolute", left: 150 + i * 260, top: lerp(380, 1330, prog(t, ta + i * 0.15, 1.2)) , opacity: t > ta + i * 0.15 ? 1 - prog(t, ta + 0.9 + i * 0.15, 0.3) : 0,
          width: 84, height: 84, borderRadius: 24, background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BellIcon size={52} weight="fill" color={C.amarillo} />
        </div>
      ))}
    </AbsoluteFill>
  );
};

// ───────────────────────────── 4 · INGENIEROS ─────────────────────────────
export const Ingenieros: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const arrastre = prog(t, w("compite"), 2.2) * 120;
  return (
    <AbsoluteFill>
      <Centro top={450}><div style={{ ...txt(78), textAlign: "center" }}>
        <span style={{ color: C.naranja }}>TÚ</span> <span style={{ color: C.gris }}>vs</span> <span style={{ color: "#38bdf8" }}>EQUIPOS ENTEROS</span>
      </div></Centro>
      <div style={{ position: "absolute", left: 130 + arrastre, top: 930, opacity: prog(t, w("fuerza"), 0.3) }}>
        <Pastilla color={C.naranja} size={30}>FUERZA DE VOLUNTAD</Pastilla>
      </div>
      {/* Cuerda */}
      <div style={{ position: "absolute", left: 240 + arrastre, top: 1250, width: 760, height: 10, borderRadius: 5, background: "#a16207" }} />
      <Personaje look={LOOKS.novato} x={230 + arrastre} y={1480} escala={0.72} desfase={0.2} poses={[[0, "idle"], [w("compite"), "tired"]]} animo={[[0, 0.2], [w("compite"), -1]]} />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={{ position: "absolute", scale: String(pop(t, w("equipos") + i * 0.12, 0.35)) }}>
          <Personaje look={LOOKS.ingeniero} x={590 + i * 92 + arrastre} y={1480} escala={0.5} desfase={i * 0.7} poses={[[0, "idle"]]} animo={[[0, 0.8]]} />
          <div style={{ position: "absolute", left: 565 + i * 92 + arrastre, top: 1150 }}><LaptopIcon size={52} weight="fill" color="#94a3b8" /></div>
        </div>
      ))}
      <div style={{ position: "absolute", left: 650 + arrastre, top: 1010, opacity: prog(t, w("ingenieros"), 0.3) }}>
        <Pastilla color="#38bdf8" size={30}>INGENIEROS</Pastilla>
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 5 · EL MÉTODO ─────────────────────────────
export const Metodo: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const titulo = "LA REGLA DE LOS 20 SEGUNDOS";
  const letras = Math.floor(interpolate(t, [w("regla") - 0.1, w("segundos") + 0.3], [0, titulo.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const reloj = prog(t, w("20"), 1.2);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 70, top: 500, width: 940, height: 940, borderRadius: 18, border: "3px solid rgba(191,219,254,.6)",
        backgroundColor: "#0b3a82", backgroundImage: "linear-gradient(rgba(191,219,254,.2) 2px, transparent 2px), linear-gradient(90deg, rgba(191,219,254,.2) 2px, transparent 2px), linear-gradient(rgba(191,219,254,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(191,219,254,.08) 1px, transparent 1px)",
        backgroundSize: "200px 200px, 200px 200px, 40px 40px, 40px 40px", scale: String(pop(t, 0, 0.5)) }}>
        <div style={{ position: "absolute", left: 44, top: 40, ...txt(34, "#bfdbfe", { letterSpacing: "0.12em" }), opacity: prog(t, w("método"), 0.3) }}>MÉTODO</div>
        <div style={{ position: "absolute", left: 44, right: 44, top: 110, ...txt(84, C.blanco, { letterSpacing: "-0.02em" }) }}>{titulo.slice(0, letras)}</div>
        <svg width={420} height={420} style={{ position: "absolute", left: 260, top: 470 }}>
          <circle cx={210} cy={210} r={170} stroke="rgba(191,219,254,.3)" strokeWidth={22} fill="none" />
          <circle cx={210} cy={210} r={170} stroke={C.verde} strokeWidth={22} fill="none" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 170} strokeDashoffset={2 * Math.PI * 170 * (1 - reloj)} transform="rotate(-90 210 210)" />
        </svg>
        <div style={{ position: "absolute", left: 260, top: 470, width: 420, height: 420, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <TimerIcon size={70} weight="fill" color="#bfdbfe" />
          <div style={txt(110)}>{Math.round(reloj * 20)} s</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 6 · FRICCIÓN ─────────────────────────────
export const Friccion: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const esfuerzo = prog(t, w("cuesta"), 0.7);
  const uso = 1 - 0.72 * prog(t, w("menos"), 0.8);
  const Barra: React.FC<{ top: number; etiqueta: string; u: number; color: string; base?: number }> = ({ top, etiqueta, u, color, base = 0.25 }) => (
    <div style={{ position: "absolute", left: 90, top }}>
      <div style={{ ...txt(44), marginBottom: 18 }}>{etiqueta}</div>
      <div style={{ width: 900, height: 110, borderRadius: 26, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
        <div style={{ width: `${(base + (1 - base) * u) * 100}%`, height: "100%", borderRadius: 26, background: color, boxShadow: `0 0 30px ${color}66` }} />
      </div>
    </div>
  );
  return (
    <AbsoluteFill>
      <Centro top={460}><Pastilla color={C.naranja} size={80} style={{ scale: String(pop(t, w("20") - 0.05)) }}>+20 s</Pastilla></Centro>
      <Barra top={700} etiqueta="Esfuerzo para usarlo" u={esfuerzo} color={C.naranja} />
      <Barra top={1000} etiqueta="Veces que lo usas" u={uso} color={uso < 0.6 ? C.verde : C.rojo} base={0} />
      <Centro top={1320}><div style={{ ...txt(60, C.verde), opacity: prog(t, w("menos"), 0.3) }}>MUCHO MENOS</div></Centro>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 7 · CHECKLIST ─────────────────────────────
export const Checklist: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const filas = [
    { I: PlugIcon, texto: "Móvil cargando en otra habitación", aparece: w("cargando"), marca: w("habitación") },
    { I: BellSlashIcon, texto: "Notificaciones fuera", aparece: w("notificaciones"), marca: w("fuera", 1) },
    { I: SquaresFourIcon, texto: "Redes fuera de la pantalla de inicio", aparece: w("redes"), marca: w("inicio") },
  ];
  return (
    <AbsoluteFill>
      <Centro top={450}><div style={{ ...txt(92, C.verde), scale: String(pop(t, w("fricción") - 0.1)) }}>PONLE FRICCIÓN</div></Centro>
      <Tarjeta style={{ left: 70, top: 600, width: 940, height: 820, flexDirection: "column", gap: 36, padding: "40px 46px", alignItems: "stretch", scale: String(pop(t, 0.05, 0.5)) }}>
        {filas.map((f, i) => {
          const u = pop(t, f.aparece - 0.1, 0.4), m = pop(t, f.marca, 0.35);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 28, opacity: Math.min(1, u * 1.5), translate: `${(1 - Math.min(1, u)) * 80}px 0px` }}>
              <div style={{ width: 120, height: 120, borderRadius: 34, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                <f.I size={74} weight="fill" color="#15803d" />
              </div>
              <div style={{ ...txt(48, C.tinta, { letterSpacing: "-0.02em", lineHeight: 1.1 }), flex: 1 }}>{f.texto}</div>
              <div style={{ width: 96, height: 96, borderRadius: 26, border: `6px solid ${m > 0.1 ? C.verde : "#cbd5e1"}`, background: m > 0.1 ? C.verde : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                <CheckIcon size={64} weight="bold" color="#fff" style={{ scale: String(m) }} />
              </div>
            </div>
          );
        })}
      </Tarjeta>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 8 · EL ESTUDIO ─────────────────────────────
export const Estudio: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const Columna: React.FC<{ left: number; titulo: string; Icono: typeof DoorIcon; aparece: number; barra: number; alto: number; color: string; extra?: React.ReactNode }> = ({ left, titulo, Icono, aparece, barra, alto, color, extra }) => (
    <div style={{ position: "absolute", left, top: 760, width: 400, opacity: prog(t, aparece - 0.1, 0.3) }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ position: "relative" }}><Icono size={110} weight="fill" color="#cbd5e1" />{extra}</div>
        <div style={{ ...txt(36, C.blanco, { textAlign: "center", letterSpacing: "0.02em" }) }}>{titulo}</div>
      </div>
      <div style={{ position: "absolute", left: 110, top: 280, width: 180, height: 330, display: "flex", alignItems: "flex-end" }}>
        <div style={{ width: "100%", height: alto * prog(t, barra, 0.9), borderRadius: "22px 22px 8px 8px", background: color, boxShadow: color === C.verde ? `0 0 40px ${C.verde}88` : undefined }} />
      </div>
    </div>
  );
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 70, top: 470, display: "flex", alignItems: "center", gap: 20, opacity: prog(t, w("estudio") - 0.1, 0.3) }}>
        <FlaskIcon size={80} weight="fill" color="#93c5fd" />
        <div>
          <div style={txt(52)}>UN ESTUDIO</div>
          <div style={txt(28, C.gris, { letterSpacing: 0 })}>Universidad de Texas · Ward y otros, 2017</div>
        </div>
      </div>
      <Columna left={90} titulo="MÓVIL EN LA MESA" Icono={DeviceMobileIcon} aparece={w("mesa")} barra={w("mesa") + 0.2} alto={170} color="#64748b"
        extra={<div style={{ position: "absolute", right: -50, top: -10, opacity: prog(t, w("apagado"), 0.3) }}><Pastilla color={C.rojo} tinta="#fff" size={22} style={{ padding: "6px 14px", display: "flex", gap: 6, alignItems: "center" }}><PowerIcon size={22} weight="bold" />APAGADO</Pastilla></div>} />
      <Columna left={590} titulo="EN OTRA HABITACIÓN" Icono={DoorIcon} aparece={w("habitación")} barra={w("rindieron")} alto={320} color={C.verde} />
      <div style={{ position: "absolute", left: 600, top: 1420, ...txt(48, C.verde), opacity: prog(t, w("mejor"), 0.3) }}>RINDIERON MEJOR</div>
    </AbsoluteFill>
  );
};

// ───────────────────────────── 9 · DISTANCIA ─────────────────────────────
export const Distancia: React.FC<{ e: Escena }> = ({ e }) => {
  const { t, w } = useEscena(e);
  const aleja = prog(t, w("necesitas", 2), 1.2);
  return (
    <AbsoluteFill>
      <Centro top={460}><div style={{ ...txt(96, C.blanco, { textAlign: "center" }) }}>FUERZA DE<br />VOLUNTAD</div></Centro>
      <Neon x={170} y={560} ancho={740} u={prog(t, w("voluntad") + 0.15, 0.3)} giro={-8} />
      <Centro top={760}><div style={{ ...txt(150, C.verde, { textShadow: `0 0 30px ${C.verde}88` }), scale: String(interpolate(t, [w("distancia") - 0.05, w("distancia") + 0.3], [3, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })),
        opacity: prog(t, w("distancia") - 0.05, 0.15) }}>DISTANCIA</div></Centro>
      <Personaje look={LOOKS.novato} x={230} y={1480} escala={0.72} desfase={0.8} poses={[[0, "idle"], [w("distancia"), "cheer"]]} animo={[[0, 0], [w("distancia"), 1]]} />
      {/* El móvil se aleja */}
      <Movil ancho={130} brillo={0.7} style={{ left: lerp(380, 820, aleja), top: 1180, scale: String(1 - 0.35 * aleja) }} />
      <svg width={1080} height={1920} style={{ position: "absolute", left: 0, top: 0, opacity: aleja }}>
        <line x1={340} y1={1300} x2={lerp(360, 810, aleja)} y2={1300} stroke={C.verde} strokeWidth={8} strokeDasharray="20 16" />
      </svg>
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
  gancho: Gancho, veces: Veces, tragaperras: Tragaperras, ingenieros: Ingenieros, metodo: Metodo,
  friccion: Friccion, checklist: Checklist, estudio: Estudio, distancia: Distancia, cierre: CierreEscena,
};
export const CAPITULOS: Record<string, string> = {
  gancho: "1/5 · EL PROBLEMA", veces: "1/5 · EL PROBLEMA", tragaperras: "2/5 · POR QUÉ CUESTA", ingenieros: "2/5 · POR QUÉ CUESTA",
  metodo: "3/5 · EL MÉTODO", friccion: "3/5 · EL MÉTODO", checklist: "3/5 · EL MÉTODO", estudio: "4/5 · LA PRUEBA",
  distancia: "5/5 · RECUERDA", cierre: "5/5 · RECUERDA",
};
export { Particulas };
