import { Composition } from "remotion";
import { MvTeaser } from "./MvTeaser";
import type { MvTeaserProps } from "./types";

const FPS = 30;
// Opening 2s + 4 scenes × 8s + Closing 2s = 36s
// Minus 5 transitions × 0.5s overlap = 33.5s
const TRANSITION_FRAMES = 15;
const TOTAL_FRAMES = (2 + 8 * 4 + 2) * FPS - 5 * TRANSITION_FRAMES;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MvTeaser"
      component={MvTeaser}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={
        {
          clips: [
            { src: "https://example.com/scene1.mp4", transition: "fade" },
            { src: "https://example.com/scene2.mp4", transition: "dissolve" },
            { src: "https://example.com/scene3.mp4", transition: "fade" },
            { src: "https://example.com/scene4.mp4", transition: "fade" },
          ],
          bgmUrl: null,
          opening: { title: "UNIT NAME", imageUrl: null },
          closing: { title: "We are ready to shine.", imageUrl: null },
        } satisfies MvTeaserProps
      }
    />
  );
};
