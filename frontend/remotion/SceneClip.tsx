import { AbsoluteFill } from "remotion";
import { Video } from "@remotion/media";

type Props = {
  src: string;
};

export const SceneClip: React.FC<Props> = ({ src }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Video
        src={src}
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </AbsoluteFill>
  );
};
