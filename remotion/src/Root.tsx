import { Composition } from "remotion";
import { Cierre } from "./Cierre";
import { Movil, calcularMovil } from "./movil/Movil";
import { CAPITULOS as CAP66, ESCENAS as ESC66, SFX as SFX66 } from "./dias66/Escenas";
import { CAPITULOS as CAPAP, ESCENAS as ESCAP, SFX as SFXAP } from "./apilar/Escenas";
import { CAPITULOS as CAPPR, ESCENAS as ESCPR, SFX as SFXPR } from "./premio/Escenas";
import { crearVideo } from "./serie/VideoSerie";

const Apilar = crearVideo({ carpeta: "apilar", escenas: ESCAP, capitulos: CAPAP, sfx: SFXAP });
const Premio = crearVideo({ carpeta: "premio", escenas: ESCPR, capitulos: CAPPR, sfx: SFXPR });
const Dias66 = crearVideo({ carpeta: "dias66", escenas: ESC66, capitulos: CAP66, sfx: SFX66 });

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Cierre"
        component={Cierre}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ lema: "MEJOR", despedida: "NOS VEMOS MAÑANA" }}
      />
      <Composition
        id="Movil"
        component={Movil}
        durationInFrames={1500}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ subtitulos: true }}
        calculateMetadata={calcularMovil}
      />
      <Composition
        id="MovilSinSubtitulos"
        component={Movil}
        durationInFrames={1500}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ subtitulos: false }}
        calculateMetadata={calcularMovil}
      />
      <Composition id="Dias66" component={Dias66.Video} durationInFrames={1500} fps={30} width={1080} height={1920}
        defaultProps={{ subtitulos: true }} calculateMetadata={Dias66.calcular} />
      <Composition id="Dias66SinSubtitulos" component={Dias66.Video} durationInFrames={1500} fps={30} width={1080} height={1920}
        defaultProps={{ subtitulos: false }} calculateMetadata={Dias66.calcular} />
      <Composition id="Apilar" component={Apilar.Video} durationInFrames={1500} fps={30} width={1080} height={1920}
        defaultProps={{ subtitulos: true }} calculateMetadata={Apilar.calcular} />
      <Composition id="ApilarSinSubtitulos" component={Apilar.Video} durationInFrames={1500} fps={30} width={1080} height={1920}
        defaultProps={{ subtitulos: false }} calculateMetadata={Apilar.calcular} />
      <Composition id="Premio" component={Premio.Video} durationInFrames={1500} fps={30} width={1080} height={1920}
        defaultProps={{ subtitulos: true }} calculateMetadata={Premio.calcular} />
      <Composition id="PremioSinSubtitulos" component={Premio.Video} durationInFrames={1500} fps={30} width={1080} height={1920}
        defaultProps={{ subtitulos: false }} calculateMetadata={Premio.calcular} />
    </>
  );
};
