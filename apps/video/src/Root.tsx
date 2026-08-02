import { Composition } from 'remotion';

import { LaunchCover, LaunchVideo } from './LaunchVideo';
import { FPS, LANDSCAPE_SIZE, TOTAL_FRAMES } from './timeline';

function LandscapeVideo(): React.JSX.Element {
  return <LaunchVideo />;
}

export function RemotionRoot(): React.JSX.Element {
  return (
    <>
      <Composition
        id="TellPlotLaunch16x9"
        component={LandscapeVideo}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={LANDSCAPE_SIZE.width}
        height={LANDSCAPE_SIZE.height}
      />
      <Composition
        id="TellPlotLaunchCover"
        component={LaunchCover}
        durationInFrames={1}
        fps={FPS}
        width={LANDSCAPE_SIZE.width}
        height={LANDSCAPE_SIZE.height}
      />
    </>
  );
}
