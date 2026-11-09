// Piezas comunes de la serie «0,0001 %»: paleta, tipografía, tiempos y fondo.
import { loadFont } from "@remotion/fonts";
import React from "react";
import { AbsoluteFill, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export const FUENTE = "Inter";
loadFont({ family: FUENTE, url: staticFile("fonts/inter-latin-700-normal.woff2"), weight: "700" });
loadFont({ family: FUENTE, url: staticFile("fonts/inter-latin-900-normal.woff2"), weight: "900" });

export const C = {
  fondo: "#07090d",
  tinta: "#0f172a",
  blanco: "#ffffff",
  gris: "#94a3b8",
  verde: "#22c55e",
  verdeOscuro: "#04130a",
  rojo: "#ef4444",
  naranja: "#fb923c",
  amarillo: "#facc15",
  azul: "#3b82f6",
  morado: "#a855f7",
};

export type Palabra = { text: string; t: number };
export type Escena = { id: string; texto: string; audio: string; inicio: number; duracion: number; palabras: Palabra[] };

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zñ0-9]/g, "");

/** Segundos dentro de la escena y el momento en que se dice cada palabra. */
export const useEscena = (e: Escena) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  /** Momento (s) en que se dice `palabra` por n-ésima vez en esta escena. */
  const w = (palabra: string, n = 1) => {
    const k = norm(palabra);
    let c = 0;
    for (const p of e.palabras) if (norm(p.text) === k && ++c === n) return p.t;
    throw new Error(`La palabra «${palabra}» (${n}) no está en la escena ${e.id}`);
  };
  return { t, w, fps, frame };
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
/** Progreso 0→1 entre t0 y t0+d (segundos), con una curva de entrada suave. */
export const prog = (t: number, t0: number, d = 0.4, easing = Easing.out(Easing.cubic)) =>
  interpolate(t, [t0, t0 + d], [0, 1], { ...clamp, easing });
/** Progreso con rebote (para «pop»). */
export const pop = (t: number, t0: number, d = 0.45) =>
  interpolate(t, [t0, t0 + d], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2)) });
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/** Fondo de la serie: casi negro, rejilla suave y manchas de color que derivan. */
export const Fondo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const v = (a: number, b: number, ph: number) => `${(a + b * Math.sin(t * 0.35 + ph)).toFixed(1)}%`;
  return (
    <AbsoluteFill style={{ backgroundColor: C.fondo, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          inset: "-25%",
          filter: "blur(80px)",
          opacity: 0.34,
          background: `radial-gradient(circle at ${v(22, 10, 0)} ${v(30, 8, 1)}, #15803d 0 13%, transparent 33%),
            radial-gradient(circle at ${v(78, 9, 2)} ${v(62, 10, 3)}, #6d28d9 0 11%, transparent 31%),
            radial-gradient(circle at ${v(45, 12, 4)} ${v(88, 6, 5)}, #16a34a 0 16%, transparent 36%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.055) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,.055) 2px, transparent 2px)",
          backgroundSize: "96px 96px",
          backgroundPosition: `${(-t * 12) % 96}px ${(-t * 20) % 96}px`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Entrada de cada escena: llega deslizándose con un poco de desenfoque (como un viaje de cámara). */
export const Entrada: React.FC<{ children: React.ReactNode; desde?: "derecha" | "abajo" }> = ({ children, desde = "derecha" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const u = interpolate(frame, [0, 0.38 * fps], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const d = (1 - u) * 260;
  return (
    <AbsoluteFill
      style={{
        translate: desde === "derecha" ? `${d}px 0px` : `0px ${d}px`,
        filter: u < 0.98 ? `blur(${((1 - u) * 14).toFixed(1)}px)` : undefined,
        opacity: interpolate(u, [0, 0.4], [0, 1], clamp),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Tarjeta blanca con sombra (estilo de la serie). */
export const Tarjeta: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => (
  <div
    style={{
      position: "absolute",
      background: C.blanco,
      borderRadius: 44,
      boxShadow: "0 30px 80px rgba(0,0,0,.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Línea de neón que tacha algo; se dibuja de izquierda a derecha. */
export const Neon: React.FC<{ x: number; y: number; ancho: number; u: number; color?: string; giro?: number }> = ({
  x, y, ancho, u, color = C.rojo, giro = -5,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: ancho,
      height: 12,
      borderRadius: 6,
      background: "#fff",
      transformOrigin: "0 50%",
      rotate: `${giro}deg`,
      scale: `${u} 1`,
      boxShadow: `0 0 4px #fff, 0 0 14px ${color}, 0 0 34px ${color}, 0 0 64px ${color}`,
    }}
  />
);

/** Explosión de partículas determinista (semilla fija). */
export const Particulas: React.FC<{ x: number; y: number; t: number; t0: number; n?: number; radio?: number }> = ({
  x, y, t, t0, n = 40, radio = 440,
}) => {
  if (t < t0) return null;
  const u = prog(t, t0, 0.8);
  const fuera = interpolate(t, [t0 + 0.6, t0 + 1.05], [1, 0], clamp);
  const colores = [C.verde, "#86efac", "#ffffff", C.amarillo];
  return (
    <>
      {new Array(n).fill(0).map((_, i) => {
        const r1 = Math.sin(i * 12.9898) * 43758.5453, r2 = Math.sin(i * 78.233) * 12345.678;
        const a = (r1 - Math.floor(r1)) * Math.PI * 2, d = radio * (0.45 + 0.55 * (r2 - Math.floor(r2)));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 16,
              height: 9,
              borderRadius: 3,
              background: colores[i % 4],
              translate: `${(Math.cos(a) * d * u).toFixed(1)}px ${(Math.sin(a) * d * u * 0.8 + 60 * u).toFixed(1)}px`,
              rotate: `${(u * (i * 47 % 540 - 270)).toFixed(0)}deg`,
              opacity: fuera,
            }}
          />
        );
      })}
    </>
  );
};
