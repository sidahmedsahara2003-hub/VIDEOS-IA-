// Subtítulos palabra a palabra (estilo TikTok) con @remotion/captions.
import { createTikTokStyleCaptions, type Caption } from "@remotion/captions";
import React, { useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FUENTE } from "./base";

/** `cortes`: inicio (ms) de cada escena; los subtítulos nunca mezclan dos escenas en la misma línea. */
export const Subtitulos: React.FC<{ captions: Caption[]; cortes?: number[]; top?: number }> = ({ captions, cortes = [], top = 300 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  const pages = useMemo(() => {
    const limites = [...cortes, Infinity];
    const grupos: Caption[][] = limites.map(() => []);
    for (const c of captions) {
      const g = limites.findIndex((l, i) => c.startMs < (limites[i + 1] ?? Infinity) && c.startMs >= (i === 0 ? -Infinity : l));
      grupos[Math.max(0, g)].push({ ...c, text: grupos[Math.max(0, g)].length ? c.text : c.text.trimStart() });
    }
    return grupos.filter((g) => g.length).flatMap((g) => createTikTokStyleCaptions({ captions: g, combineTokensWithinMilliseconds: 700 }).pages);
  }, [captions, cortes]);
  const page = pages.find((p, i) => ms >= p.startMs && (i + 1 >= pages.length ? ms < p.startMs + p.durationMs + 400 : ms < pages[i + 1].startMs));
  if (!page) return null;
  const chars = page.text.length;
  const fs = Math.min(74, Math.floor(940 / (chars * 0.58)));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 60, right: 60, top, display: "flex", justifyContent: "center" }}>
        <div style={{ padding: "10px 26px", borderRadius: 26, background: "rgba(7,9,13,.62)", fontFamily: FUENTE, fontWeight: 900,
          fontSize: fs, lineHeight: 1.2, letterSpacing: "-0.02em", color: C.blanco, textAlign: "center",
          textShadow: "0 6px 24px rgba(0,0,0,.6)", whiteSpace: "pre-wrap" }}>
          {page.tokens.map((tk, i) => {
            const activo = ms >= tk.fromMs && ms < tk.toMs;
            const dicho = ms >= tk.fromMs;
            const u = interpolate(ms, [tk.fromMs, tk.fromMs + 160], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(2.5)) });
            return (
              <span key={i} style={{ display: "inline-block", opacity: dicho ? 1 : 0.35, position: "relative",
                color: activo ? C.verdeOscuro : C.blanco, scale: activo ? String(1.25 - 0.25 * u) : "1",
                translate: dicho ? `0px ${(1 - u) * 10}px` : "0px 10px", textShadow: activo ? "none" : undefined,
                padding: activo ? "0 0.12em" : 0, borderRadius: "0.2em", background: activo ? C.verde : "transparent" }}>
                {tk.text}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
