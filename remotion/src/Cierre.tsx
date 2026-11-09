import { loadFont } from "@remotion/fonts";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  random,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// Inter en local (public/fonts): el render no depende de internet
const fontFamily = "Inter";
loadFont({ family: fontFamily, url: staticFile("fonts/inter-latin-700-normal.woff2"), weight: "700" });
loadFont({ family: fontFamily, url: staticFile("fonts/inter-latin-900-normal.woff2"), weight: "900" });

// Paleta de la serie
const VERDE = "#22c55e";
const OSCURO = "#07090d";
const TINTA = "#04130a";

export type CierreProps = {
  readonly lema: string;
  readonly despedida: string;
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const muelle = Easing.spring({ damping: 14 });

/** Cierre de la serie: el logo «0,0001 % · CADA DÍA» se construye y se despide. */
export const Cierre = ({ lema, despedida }: CierreProps) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const s = (seg: number) => seg * fps;

  // Tiempos (en segundos)
  const T_LOGO = 0.1, T_BARRAS = 0.55, T_NUM = 1.2, T_MEJOR = 2.2, T_ADIOS = 2.8;
  const barras = [70, 120, 180, 250];
  const numero = "0,0001%";
  const letras = Math.floor(interpolate(frame, [s(T_NUM), s(T_NUM + 0.6)], [0, numero.length], clamp));
  const golpe = interpolate(frame, [s(T_MEJOR), s(T_MEJOR + 0.12), s(T_MEJOR + 0.3)], [1, 1.07, 1], clamp);
  const acercamiento = interpolate(frame, [s(T_MEJOR + 0.4), durationInFrames], [1, 1.04], clamp);

  return (
    <AbsoluteFill
      style={{
        fontFamily,
        backgroundColor: OSCURO,
        backgroundImage: `radial-gradient(circle at 50% 42%, #173a26cc 0%, transparent 62%),
          linear-gradient(rgba(255,255,255,.05) 2px, transparent 2px),
          linear-gradient(90deg, rgba(255,255,255,.05) 2px, transparent 2px)`,
        backgroundSize: "100% 100%, 96px 96px, 96px 96px",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", scale: String(acercamiento) }}>
        {/* Partículas que estallan detrás del logo en «MEJOR» */}
        {new Array(56).fill(0).map((_, i) => {
          const a = random(`a${i}`) * Math.PI * 2;
          const d = 300 + random(`d${i}`) * 320;
          const p = interpolate(frame, [s(T_MEJOR), s(T_MEJOR + 0.9)], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          const colores = [VERDE, "#86efac", "#ffffff", "#facc15"];
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: 660,
                width: 18,
                height: 10,
                borderRadius: 3,
                background: colores[i % 4],
                translate: `${Math.cos(a) * d * p}px ${Math.sin(a) * d * p * 0.8}px`,
                rotate: `${p * (random(`r${i}`) * 540 - 270)}deg`,
                opacity: interpolate(frame, [s(T_MEJOR), s(T_MEJOR + 0.05), s(T_MEJOR + 0.7), s(T_MEJOR + 1)], [0, 1, 1, 0], clamp),
              }}
            />
          );
        })}

        {/* Insignia */}
        <div
          style={{
            position: "absolute",
            top: 360,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: VERDE,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            boxShadow: `0 0 0 16px ${OSCURO}, 0 0 0 28px ${VERDE}, 0 0 90px ${VERDE}55`,
            scale: String(interpolate(frame, [s(T_LOGO), s(T_LOGO + 0.6)], [0, 1], { ...clamp, easing: muelle }) * golpe),
            rotate: `${interpolate(frame, [s(T_LOGO), s(T_LOGO + 0.6)], [-120, 0], { ...clamp, easing: muelle })}deg`,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-end", gap: 18, height: 250 }}>
            {barras.map((h, i) => (
              <div
                key={i}
                style={{
                  width: 74,
                  height: h * 0.8,
                  background: TINTA,
                  borderRadius: "12px 12px 0 0",
                  transformOrigin: "50% 100%",
                  scale: `1 ${interpolate(frame, [s(T_BARRAS + i * 0.15), s(T_BARRAS + i * 0.15 + 0.35)], [0, 1], { ...clamp, easing: muelle })}`,
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 118, fontWeight: 900, color: TINTA, letterSpacing: "-0.05em", lineHeight: 1, height: 118 }}>
            {numero.slice(0, letras)}
          </div>
          <div
            style={{
              fontSize: 34,
              fontWeight: 900,
              color: TINTA,
              letterSpacing: "0.32em",
              marginLeft: "0.32em",
              opacity: interpolate(frame, [s(T_BARRAS), s(T_BARRAS + 0.3)], [0, 1], clamp),
            }}
          >
            CADA DÍA
          </div>
        </div>

        {/* MEJOR */}
        <div
          style={{
            position: "absolute",
            top: 1040,
            fontSize: 180,
            fontWeight: 900,
            color: VERDE,
            letterSpacing: "-0.04em",
            textShadow: `0 0 30px ${VERDE}88`,
            scale: String(interpolate(frame, [s(T_MEJOR - 0.05), s(T_MEJOR + 0.3)], [3, 1], { ...clamp, easing: Easing.out(Easing.exp) })),
            opacity: interpolate(frame, [s(T_MEJOR - 0.05), s(T_MEJOR + 0.15)], [0, 1], clamp),
          }}
        >
          {lema}
        </div>

        {/* Despedida */}
        <div
          style={{
            position: "absolute",
            top: 1270,
            padding: "18px 40px",
            borderRadius: 999,
            border: "4px solid rgba(255,255,255,.35)",
            color: "#fff",
            fontSize: 46,
            fontWeight: 900,
            letterSpacing: "0.06em",
            opacity: interpolate(frame, [s(T_ADIOS), s(T_ADIOS + 0.3)], [0, 1], clamp),
            translate: `0px ${interpolate(frame, [s(T_ADIOS), s(T_ADIOS + 0.3)], [24, 0], { ...clamp, easing: Easing.out(Easing.cubic) })}px`,
          }}
        >
          {despedida}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
