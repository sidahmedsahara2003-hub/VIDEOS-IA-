// Panel de aeropuerto (split-flap): cada casilla gira por el alfabeto hasta su letra.
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { C, FUENTE } from "./base";

const ALFABETO = " ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÑ0123456789%¿?<,+";
const SOLAPA = 0.045, ESCALON = 0.025;

export type Paso = { t: number; texto: string; color?: string };

function estado(pasos: Paso[], n: number, i: number, t: number) {
  let cur = " ", next = " ", p = 1, color = pasos[0].color ?? C.blanco;
  pasos.forEach((st, k) => {
    const destino = st.texto.padEnd(n, " ")[i];
    const t0 = k === 0 ? -1 : st.t + i * ESCALON;
    if (t < t0) return;
    const ib = ALFABETO.indexOf(destino);
    const vueltas = k === 0 || cur === destino ? 0 : 4 + ((i * 3 + ib) % 3);
    const ia = (ib - vueltas + ALFABETO.length) % ALFABETO.length;
    const s = Math.floor((t - t0) / SOLAPA);
    color = st.color ?? color;
    if (s >= vueltas) { cur = destino; next = destino; p = 1; return; }
    cur = ALFABETO[(ia + s) % ALFABETO.length];
    next = ALFABETO[(ia + s + 1) % ALFABETO.length];
    p = (t - t0 - s * SOLAPA) / SOLAPA;
  });
  return { cur, next, p, color };
}

const Mitad: React.FC<{ arriba: boolean; letra: string; h: number; style?: React.CSSProperties }> = ({ arriba, letra, h, style }) => (
  <div
    style={{
      position: "absolute", left: 0, width: "100%", height: "50%", overflow: "hidden", textAlign: "center",
      top: arriba ? 0 : "50%",
      borderRadius: arriba ? "12px 12px 0 0" : "0 0 12px 12px",
      background: arriba ? "linear-gradient(180deg,#2a2c33,#1d1f24)" : "linear-gradient(180deg,#191b20,#121418)",
      transformOrigin: arriba ? "50% 100%" : "50% 0",
      backfaceVisibility: "hidden",
      ...style,
    }}
  >
    <span style={{ display: "block", height: h, lineHeight: `${h}px`, marginTop: arriba ? 0 : -h / 2 }}>{letra}</span>
  </div>
);

export const SplitFlap: React.FC<{ pasos: Paso[]; casillas: number; ancho?: number; alto?: number; hueco?: number; tam?: number; brillo?: boolean }> = ({
  pasos, casillas, ancho = 84, alto = 132, hueco = 8, tam = 92, brillo,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return (
    <div style={{ display: "flex", gap: hueco, fontFamily: FUENTE, fontWeight: 900, filter: brillo ? `drop-shadow(0 0 26px ${C.verde}aa)` : undefined }}>
      {new Array(casillas).fill(0).map((_, i) => {
        const e = estado(pasos, casillas, i, t);
        return (
          <div key={i} style={{ position: "relative", width: ancho, height: alto, fontSize: tam, color: e.color, perspective: 700,
            borderRadius: 12, boxShadow: "0 18px 34px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.07)" }}>
            <Mitad arriba letra={e.p < 1 ? e.next : e.cur} h={alto} />
            <Mitad arriba={false} letra={e.cur} h={alto} />
            {e.p < 0.5 ? <Mitad arriba letra={e.cur} h={alto} style={{ rotate: `x ${(-180 * e.p).toFixed(1)}deg` }} /> : null}
            {e.p >= 0.5 && e.p < 1 ? <Mitad arriba={false} letra={e.next} h={alto} style={{ rotate: `x ${(180 * (1 - e.p)).toFixed(1)}deg` }} /> : null}
            <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 3, marginTop: -1, background: "rgba(0,0,0,.7)" }} />
          </div>
        );
      })}
    </div>
  );
};
