import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

type Props = {
  title: string;
  imageUrl: string | null;
};

export const Closing: React.FC<Props> = ({ title, imageUrl }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const textOpacity = interpolate(frame, [0, 0.5 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(
    frame,
    [durationInFrames - 0.5 * fps, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const bgOpacity = interpolate(frame, [0, 0.8 * fps], [0, 0.3], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", opacity: fadeOut }}>
      {imageUrl && (
        <Img
          src={imageUrl}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: bgOpacity,
          }}
        />
      )}

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1,
        }}
      >
        <div
          style={{
            opacity: textOpacity,
            textAlign: "center",
            maxWidth: "80%",
          }}
        >
          <div
            style={{
              color: "rgba(168, 85, 247, 0.5)",
              fontSize: 12,
              letterSpacing: "0.5em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            Debut Statement
          </div>
          <div
            style={{
              color: "#fff",
              fontSize: 32,
              fontWeight: 700,
              fontStyle: "italic",
              lineHeight: 1.5,
            }}
          >
            &ldquo;{title}&rdquo;
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 40,
            opacity: textOpacity * 0.5,
            color: "rgba(161, 161, 170, 0.6)",
            fontSize: 11,
            letterSpacing: "0.1em",
          }}
        >
          Created with Debut
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
