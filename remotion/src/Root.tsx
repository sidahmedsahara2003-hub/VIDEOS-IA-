import { Composition } from "remotion";
import { Cierre } from "./Cierre";

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
    </>
  );
};
