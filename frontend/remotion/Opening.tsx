import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

type Props = {
  title: string;
  imageUrl: string | null;
};

export const Opening: React.FC<Props> = ({ title, imageUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgOpacity = interpolate(frame, [0, 1 * fps], [0, 0.4], {
    extrapolateRight: "clamp",
  });

  const titleOpacity = interpolate(frame, [0.3 * fps, 1.2 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  const titleY = interpolate(frame, [0.3 * fps, 1.2 * fps], [30, 0], {
    extrapolateRight: "clamp",
  });

  const subtitleOpacity = interpolate(frame, [0.8 * fps, 1.5 * fps], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
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
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: "rgba(168, 85, 247, 0.6)",
              fontSize: 16,
              letterSpacing: "0.5em",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Official Debut
          </div>
          <div
            style={{
              color: "#fff",
              fontSize: 72,
              fontWeight: 900,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 60,
            opacity: subtitleOpacity,
            color: "rgba(168, 85, 247, 0.4)",
            fontSize: 12,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
          }}
        >
          MV Teaser
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
