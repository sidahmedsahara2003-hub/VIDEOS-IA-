// Plantilla común de los vídeos de la serie (la misma estructura que el vídeo 02, «Movil»):
// voz por escenas, efectos atados a palabras, capítulos, subtítulos y música.
// Cada vídeo aporta su carpeta en public/ (timeline.json + voz/), sus escenas, capítulos y efectos.
import type { Caption } from "@remotion/captions";
import { Audio } from "@remotion/media";
import React from "react";
import { AbsoluteFill, CalculateMetadataFunction, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, Entrada, Escena, FUENTE, Fondo } from "./base";
import { Subtitulos } from "./Subtitulos";

export type Linea = { fps: number; duracion: number; voz: string; escenas: Escena[]; captions: Caption[] };
export type VideoProps = { subtitulos: boolean; linea?: Linea };
export type Sfx = [archivo: string, cuando: number | string, volumen: number][];
export type DefVideo = {
  carpeta: string;
  escenas: Record<string, React.FC<{ e: Escena }>>;
  capitulos: Record<string, string>;
  sfx: Record<string, Sfx>;
  musica?: number;
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

/** Devuelve el componente y su calculateMetadata (la duración sale de la voz). */
export const crearVideo = (def: DefVideo) => {
  const calcular: CalculateMetadataFunction<VideoProps> = async ({ props }) => {
    const linea: Linea = await fetch(staticFile(`${def.carpeta}/timeline.json`)).then((r) => r.json());
    return { durationInFrames: Math.ceil(linea.duracion * linea.fps), fps: linea.fps, props: { ...props, linea } };
  };
  const Video: React.FC<VideoProps> = ({ subtitulos, linea }) => {
    const { fps, durationInFrames } = useVideoConfig();
    if (!linea) return <AbsoluteFill style={{ background: C.fondo }} />;
    const f = (s: number) => Math.round(s * fps);
    const tramos: { texto: string; desde: number; hasta: number }[] = [];
    for (const e of linea.escenas) {
      const last = tramos[tramos.length - 1];
      if (last && last.texto === def.capitulos[e.id]) last.hasta = e.inicio + e.duracion;
      else tramos.push({ texto: def.capitulos[e.id], desde: e.inicio, hasta: e.inicio + e.duracion });
    }
    return (
      <AbsoluteFill style={{ background: C.fondo }}>
        <Fondo />
        {linea.escenas.map((e, i) => {
          const Comp = def.escenas[e.id];
          const dur = i === linea.escenas.length - 1 ? durationInFrames - f(e.inicio) : f(e.duracion);
          return (
            <Sequence key={e.id} name={e.id} from={f(e.inicio)} durationInFrames={dur}>
              {i === 0 ? <Comp e={e} /> : <Entrada><Comp e={e} /></Entrada>}
              <Audio src={staticFile(e.audio)} />
              {(def.sfx[e.id] || []).map(([archivo, cuandoX, vol], k) => (
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
        <Audio src={staticFile("movil/musica.wav")} volume={def.musica ?? 0.09} />
      </AbsoluteFill>
    );
  };
  return { Video, calcular };
};
