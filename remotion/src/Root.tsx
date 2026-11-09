import { Composition } from "remotion";
import { Cierre } from "./Cierre";
import { Movil, calcularMovil } from "./movil/Movil";

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
    </>
  );
};
