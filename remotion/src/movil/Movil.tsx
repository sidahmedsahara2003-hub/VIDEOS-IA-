// Vídeo 02 «No eres adicto al móvil». La duración y los tiempos salen de
// public/movil/timeline.json (lo genera video-02/scripts/voz_escenas.py).
import type { Caption } from "@remotion/captions";
import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, CalculateMetadataFunction, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, Entrada, Escena, FUENTE, Fondo } from "../serie/base";
import { Subtitulos } from "../serie/Subtitulos";
import { CAPITULOS, ESCENAS } from "./Escenas";

export type Linea = { fps: number; duracion: number; voz: string; escenas: Escena[]; captions: Caption[] };
export type MovilProps = { subtitulos: boolean; linea?: Linea };

export const calcularMovil: CalculateMetadataFunction<MovilProps> = async ({ props }) => {
  const linea: Linea = await fetch(staticFile("movil/timeline.json")).then((r) => r.json());
  return { durationInFrames: Math.ceil(linea.duracion * linea.fps), fps: linea.fps, props: { ...props, linea } };
};

/** Efectos de sonido de cada escena: [archivo, segundo dentro de la escena (o palabra), volumen]. */
const SFX: Record<string, [string, number | string, number][]> = {
  gancho: [["impact-bass-1.mp3", 0.35, 0.6], ["whip.wav", "diseñado", 0.4], ["record-scratch.wav", "engancharte", 0.25]],
  veces: [["whoosh.wav", 0, 0.5], ["typing.mp3", "96", 0.35], ["ding.wav", "veces", 0.3]],
  tragaperras: [["whoosh.wav", 0, 0.5], ["snapchat-notification.wav", "notificación", 0.4], ["switch.wav", "nunca", 0.4], ["switch.wav", "premio", 0.4], ["switch.wav", "toca", 0.4], ["switch.wav", "vuelves", 0.4]],
  ingenieros: [["whoosh.wav", 0, 0.5], ["pop.mp3", "equipos", 0.4], ["pop.mp3", "ingenieros", 0.4]],
  metodo: [["page-turn.wav", 0, 0.5], ["typing.mp3", "regla", 0.35]],
  friccion: [["whoosh.wav", 0, 0.5], ["pop.mp3", "20", 0.45], ["ding.wav", "menos", 0.3]],
  checklist: [["whoosh.wav", 0, 0.5], ["mouse-click.wav", "habitación", 0.6], ["mouse-click.wav", "fuera", 0.6], ["mouse-click.wav", "inicio", 0.6]],
  estudio: [["whoosh.wav", 0, 0.5], ["pop.mp3", "estudio", 0.4], ["ding.wav", "rindieron", 0.3], ["shutter-modern.wav", "apagado", 0.4]],
  distancia: [["whoosh.wav", 0, 0.5], ["whip.wav", "voluntad", 0.4], ["impact-bass-1.mp3", "distancia", 0.6]],
  cierre: [["whoosh.wav", 0, 0.5], ["impact-bass-1.mp3", "mejor", 0.8], ["sparkle.mp3", "mejor", 0.4], ["ding.wav", "nos", 0.3]],
};
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zñ0-9]/g, "");
const cuando = (e: Escena, x: number | string) => (typeof x === "number" ? x : e.palabras.find((p) => norm(p.text) === norm(x))?.t ?? 0);

const Capitulo: React.FC<{ texto: string }> = ({ texto }) => {
  const frame = useCurrentFrame();
  const [num, nombre] = texto.split(" · ");
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 232, display: "flex", justifyContent: "center",
      opacity: interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" }) }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", height: 46, padding: "0 20px", borderRadius: 23, background: "rgba(7,9,13,.7)",
        border: "2px solid rgba(255,255,255,.18)", fontFamily: FUENTE, fontWeight: 900, fontSize: 24, letterSpacing: "0.14em", color: "#fff" }}>
        <span style={{ background: C.verde, color: C.verdeOscuro, borderRadius: 14, padding: "2px 10px", letterSpacing: "0.02em" }}>{num}</span>{nombre}
      </div>
    </div>
  );
};

export const Movil: React.FC<MovilProps> = ({ subtitulos, linea }) => {
  const { fps, durationInFrames } = useVideoConfig();
  if (!linea) return <AbsoluteFill style={{ background: C.fondo }} />;
  const f = (s: number) => Math.round(s * fps);
  // Agrupa escenas seguidas del mismo capítulo para que la etiqueta no parpadee
  const tramos: { texto: string; desde: number; hasta: number }[] = [];
  for (const e of linea.escenas) {
    const last = tramos[tramos.length - 1];
    if (last && last.texto === CAPITULOS[e.id]) last.hasta = e.inicio + e.duracion;
    else tramos.push({ texto: CAPITULOS[e.id], desde: e.inicio, hasta: e.inicio + e.duracion });
  }
  return (
    <AbsoluteFill style={{ background: C.fondo }}>
      <Fondo />
      {linea.escenas.map((e, i) => {
        const Comp = ESCENAS[e.id];
        const dur = i === linea.escenas.length - 1 ? durationInFrames - f(e.inicio) : f(e.duracion);
        return (
          <Sequence key={e.id} name={e.id} from={f(e.inicio)} durationInFrames={dur}>
            {i === 0 ? <Comp e={e} /> : <Entrada><Comp e={e} /></Entrada>}
            <Audio src={staticFile(e.audio)} />
            {(SFX[e.id] || []).map(([archivo, cuandoX, vol], k) => (
              <Sequence key={k} from={Math.max(0, f(cuando(e, cuandoX)))} layout="none">
                <Audio src={staticFile(`movil/sfx/${archivo}`)} volume={vol * 0.6} />
              </Sequence>
            ))}
          </Sequence>
        );
      })}
      {tramos.map((tr) => (
        <Sequence key={tr.texto + tr.desde} from={f(tr.desde)} durationInFrames={f(tr.hasta - tr.desde)} layout="none">
          <Capitulo texto={tr.texto} />
        </Sequence>
      ))}
      {subtitulos ? <Subtitulos captions={linea.captions} cortes={linea.escenas.map((e) => Math.round(e.inicio * 1000))} /> : null}
      <Audio src={staticFile("movil/musica.wav")} volume={0.09} />
    </AbsoluteFill>
  );
};
