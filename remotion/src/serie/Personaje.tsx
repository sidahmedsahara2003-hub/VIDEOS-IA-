// Personaje 2D articulado de la serie (Novato / Pro): piernas, brazos, parpadeo y respiración.
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

export type Pose = "idle" | "run" | "walk" | "point" | "cheer" | "sit" | "tired" | "phone";
export type Look = {
  shirt: string; pants: string; hair: string; skin?: string; shoe?: string;
  band?: string; stripes?: boolean; hairPath?: string;
};

export const LOOKS: Record<string, Look> = {
  pro: { shirt: "#22c55e", pants: "#14532d", hair: "#1f1611", band: "#ffffff" },
  novato: {
    shirt: "#fdba74", pants: "#c2410c", hair: "#7c2d12", stripes: true,
    hairPath: "M-66 -2C-74 -40 -50 -62 -40 -58C-36 -86 0 -84 6 -70C20 -96 56 -80 52 -60C78 -60 74 -24 64 -4C50 -30 20 -44 -14 -40C-40 -36 -56 -20 -66 -2Z",
  },
  ingeniero: { shirt: "#334155", pants: "#1e293b", hair: "#0f172a", skin: "#e8b48a" },
};

type P = { h1: number; k1: number; h2: number; k2: number; s1: number; e1: number; s2: number; e2: number; bob: number; lean: number; sitY: number; tilt: number; breath: number };
const POSES: Record<Pose, (t: number, o: number) => P> = {
  idle: (t, o) => { const b = Math.sin(((t + o) * 2 * Math.PI) / 3.2); return { h1: 5, k1: 2, h2: -5, k2: 2, s1: 10 + 3 * b, e1: 14, s2: -8 - 3 * b, e2: 12, bob: 0, lean: 0, sitY: 0, tilt: 2 * b, breath: b }; },
  run: (t, o) => { const p = (t + o) * 2 * Math.PI * 2.3; return { h1: 42 * Math.sin(p), k1: 20 + 70 * Math.max(0, -Math.cos(p)), h2: -42 * Math.sin(p), k2: 20 + 70 * Math.max(0, Math.cos(p)), s1: -45 * Math.sin(p), e1: 95, s2: 45 * Math.sin(p), e2: 95, bob: -12 * Math.abs(Math.sin(p)), lean: 10, sitY: 0, tilt: 4, breath: 0 }; },
  walk: (t, o) => { const p = (t + o) * 2 * Math.PI * 1.4; return { h1: 24 * Math.sin(p), k1: 8 + 28 * Math.max(0, -Math.cos(p)), h2: -24 * Math.sin(p), k2: 8 + 28 * Math.max(0, Math.cos(p)), s1: -22 * Math.sin(p), e1: 22, s2: 22 * Math.sin(p), e2: 22, bob: -5 * Math.abs(Math.sin(p)), lean: 3, sitY: 0, tilt: 1, breath: 0 }; },
  point: (t, o) => { const b = Math.sin(((t + o) * 2 * Math.PI) / 3.2); return { h1: 8, k1: 4, h2: -6, k2: 2, s1: 100 + 3 * b, e1: 0, s2: -10, e2: 20, bob: 0, lean: 4, sitY: 0, tilt: -3, breath: b }; },
  cheer: (t, o) => { const w = Math.sin((t + o) * 2 * Math.PI * 2.2); return { h1: 6, k1: 4, h2: -6, k2: 4, s1: 165 + 10 * w, e1: 10, s2: -165 - 10 * w, e2: -10, bob: -10 * Math.abs(w), lean: -2, sitY: 0, tilt: 5 * w, breath: 0 }; },
  sit: (t, o) => { const b = Math.sin(((t + o) * 2 * Math.PI) / 4); return { h1: 88, k1: 92, h2: 82, k2: 86, s1: 25, e1: 40, s2: 15, e2: 35, bob: 0, lean: -14, sitY: 86, tilt: 14 + 2 * b, breath: b }; },
  tired: (t, o) => { const b = Math.sin((t + o) * 2 * Math.PI * 1.6); return { h1: 30, k1: 50, h2: -10, k2: 40, s1: 30, e1: 10, s2: 20, e2: 10, bob: 30, lean: 38, sitY: 0, tilt: 25 + 4 * b, breath: b * 2 }; },
  // Mirando el móvil: brazo delantero levantado hacia la cara, cabeza inclinada
  phone: (t, o) => { const b = Math.sin(((t + o) * 2 * Math.PI) / 3); return { h1: 4, k1: 2, h2: -4, k2: 2, s1: 60, e1: 95, s2: -6, e2: 14, bob: 0, lean: 4, sitY: 0, tilt: 16 + 2 * b, breath: b }; },
};
const KEYS = Object.keys(POSES.idle(0, 0)) as (keyof P)[];
const R = Math.PI / 180;
const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

function poseAt(poses: [number, Pose][], t: number, o: number): P {
  let i = 0;
  while (i + 1 < poses.length && t >= poses[i + 1][0]) i++;
  const cur = POSES[poses[i][1]](t, o);
  if (i === 0) return cur;
  const u = Math.min(1, Math.max(0, (t - poses[i][0]) / 0.22));
  if (u >= 1) return cur;
  const prev = POSES[poses[i - 1][1]](t, o);
  const out = {} as P;
  for (const k of KEYS) out[k] = prev[k] + (cur[k] - prev[k]) * ease(u);
  return out;
}
function track(list: [number, number][], t: number) {
  let v = list[0][1];
  for (let i = 1; i < list.length; i++)
    if (t >= list[i][0]) v = list[i - 1][1] + (list[i][1] - list[i - 1][1]) * ease(Math.min(1, (t - list[i][0]) / 0.3));
  return v;
}
function limb(x: number, y: number, a1: number, L1: number, a2: number, L2: number) {
  const kx = x + Math.sin(a1 * R) * L1, ky = y + Math.cos(a1 * R) * L1;
  const fx = kx + Math.sin(a2 * R) * L2, fy = ky + Math.cos(a2 * R) * L2;
  return { d: `M${x} ${y}L${kx.toFixed(1)} ${ky.toFixed(1)}L${fx.toFixed(1)} ${fy.toFixed(1)}`, x: fx, y: fy };
}
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(Math.max(0, Math.min(255, amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  return "#" + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, "0")).join("");
}

type Props = {
  look: Look;
  /** Pies del personaje en coordenadas de la escena (px). */
  x: number; y: number;
  escala?: number;
  poses?: [number, Pose][];
  animo?: [number, number][]; // −1 triste … 1 contento
  desfase?: number;
  movil?: boolean; // lleva un móvil en la mano delantera
  style?: React.CSSProperties;
};

export const Personaje: React.FC<Props> = ({ look, x, y, escala = 1, poses = [[0, "idle"]], animo = [[0, 0.6]], desfase = 0, movil, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const p = poseAt(poses, t, desfase);
  const { shirt, pants, skin = "#f2c79a", hair, shoe = "#f8fafc", band } = look;
  const partes = {
    legF: limb(0, -170, p.h1, 90, p.h1 - p.k1, 84),
    legB: limb(0, -170, p.h2, 90, p.h2 - p.k2, 84),
    armF: limb(0, -292, p.s1, 72, p.s1 + p.e1, 62),
    armB: limb(0, -292, p.s2, 72, p.s2 + p.e2, 62),
  };
  const ph = ((t + desfase * 1.7) % 3.1) / 0.16;
  const parpadeo = ph < 1 ? Math.sin(Math.PI * ph) : 0;
  const ry = 11 * (1 - 0.92 * parpadeo);
  const m = track(animo, t);
  const w = 420 * escala, h = 520 * escala;
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - (480 / 520) * h, width: w, height: h, ...style }}>
      <svg width={w} height={h} viewBox="-210 -480 420 520" overflow="visible">
        <ellipse cx="0" cy="6" rx="78" ry="12" fill="#000" opacity=".35" />
        <g transform={`translate(0 ${(p.bob + p.sitY).toFixed(1)}) rotate(${p.lean.toFixed(1)} 0 -170)`}>
          <path d={partes.legB.d} stroke={shade(pants, -0.25)} strokeWidth={34} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <ellipse cx={partes.legB.x} cy={partes.legB.y} rx={26} ry={14} fill={shade(shoe, -0.2)} />
          <path d={partes.armB.d} stroke={shade(shirt, -0.25)} strokeWidth={28} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx={partes.armB.x} cy={partes.armB.y} r={16} fill={shade(skin, -0.15)} />
          <path d={partes.legF.d} stroke={pants} strokeWidth={34} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <ellipse cx={partes.legF.x} cy={partes.legF.y} rx={26} ry={14} fill={shoe} />
          <g transform={`scale(1 ${(1 + 0.025 * p.breath).toFixed(3)})`} style={{ transformOrigin: "0px -170px" }}>
            <rect x={-54} y={-322} width={108} height={164} rx={48} fill={shirt} />
            {look.stripes ? <path d="M-50 -280H50M-54 -240H54M-52 -200H52" stroke={shade(shirt, 0.3)} strokeWidth={10} /> : null}
          </g>
          <g transform={`translate(0 ${(-378 - 3 * p.breath).toFixed(1)}) rotate(${p.tilt.toFixed(1)})`}>
            <rect x={-14} y={40} width={28} height={30} fill={shade(skin, -0.12)} />
            <circle r={64} fill={skin} />
            <path d={look.hairPath || "M-64 -6C-66 -60 -20 -78 10 -72C52 -66 70 -36 64 -8C46 -34 10 -44 -20 -36C-40 -30 -52 -20 -64 -6Z"} fill={hair} />
            {band ? <rect x={-66} y={-30} width={132} height={18} rx={9} fill={band} /> : null}
            <ellipse cx={-6} cy={-2} rx={8} ry={ry} fill="#0b1020" />
            <ellipse cx={32} cy={-2} rx={8} ry={ry} fill="#0b1020" />
            <circle cx={-26} cy={20} r={9} fill="#f87171" opacity={0.35} />
            <path d={`M-14 24Q6 ${(24 + m * 16).toFixed(1)} 26 24`} stroke="#0b1020" strokeWidth={7} strokeLinecap="round" fill="none" />
          </g>
          <path d={partes.armF.d} stroke={shirt} strokeWidth={28} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {movil ? (
            <g transform={`translate(${partes.armF.x.toFixed(1)} ${partes.armF.y.toFixed(1)}) rotate(-12)`}>
              <rect x={-20} y={-58} width={40} height={72} rx={8} fill="#0b1020" stroke="#475569" strokeWidth={3} />
              <rect x={-15} y={-52} width={30} height={58} rx={4} fill="#38bdf8" opacity={0.85} />
            </g>
          ) : null}
          <circle cx={partes.armF.x} cy={partes.armF.y} r={16} fill={skin} />
        </g>
      </svg>
    </div>
  );
};
