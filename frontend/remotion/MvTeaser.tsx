import { AbsoluteFill, Sequence } from "remotion";
import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";

import type { MvTeaserProps } from "./types";
import { Opening } from "./Opening";
import { Closing } from "./Closing";
import { SceneClip } from "./SceneClip";

const FPS = 30;
const OPENING_DURATION = 2 * FPS;
const CLOSING_DURATION = 2 * FPS;
const SCENE_DURATION = 8 * FPS;
const TRANSITION_FRAMES = 15; // 0.5s overlap

export const MvTeaser: React.FC<MvTeaserProps> = ({
  clips,
  bgmUrl,
  opening,
  closing,
}) => {
  const elements: React.ReactNode[] = [];

  // Opening
  elements.push(
    <TransitionSeries.Sequence key="opening" durationInFrames={OPENING_DURATION}>
      <Opening title={opening.title} imageUrl={opening.imageUrl} />
    </TransitionSeries.Sequence>,
  );

  // Scenes with fade transitions between them
  clips.forEach((clip, i) => {
    const useSlide = clip.transition === "slide";
    elements.push(
      <TransitionSeries.Transition
        key={`tr-${i}`}
        presentation={useSlide ? slide({ direction: "from-right" }) : fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
      />,
    );

    elements.push(
      <TransitionSeries.Sequence key={`scene-${i}`} durationInFrames={SCENE_DURATION}>
        <SceneClip src={clip.src} />
      </TransitionSeries.Sequence>,
    );
  });

  // Transition to closing
  elements.push(
    <TransitionSeries.Transition
      key="tr-closing"
      presentation={fade()}
      timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
    />,
  );

  // Closing
  elements.push(
    <TransitionSeries.Sequence key="closing" durationInFrames={CLOSING_DURATION}>
      <Closing title={closing.title} imageUrl={closing.imageUrl} />
    </TransitionSeries.Sequence>,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <TransitionSeries>{elements}</TransitionSeries>

      {/* BGM audio track */}
      {bgmUrl && (
        <Sequence from={0} layout="none">
          <Audio src={bgmUrl} volume={0.8} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
