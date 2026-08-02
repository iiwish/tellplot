import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
} from 'remotion';

import { CAPTURE_ASSETS } from './captures';
import { COVER_CONTRACT, STORY_CONTRACT, VIDEO_BRAND } from './storyContract';
import { captionAt } from './timeline';

const FPS = 30;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

function frames(seconds: number): number {
  return Math.round(seconds * FPS);
}

function Logo({ label = 'TellPlot' }: { readonly label?: string }): React.JSX.Element {
  return (
    <div className="video-logo">
      <span className="video-logo__mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <strong>{label}</strong>
    </div>
  );
}

function StoryTake(): React.JSX.Element {
  const capture = CAPTURE_ASSETS[STORY_CONTRACT.continuousEditor.captureId];
  return (
    <div className="video-media" data-capture={capture.id}>
      <OffthreadVideo
        className="video-media__asset"
        muted
        src={staticFile(`captures/${capture.file}`)}
        startFrom={frames(capture.trimStartSeconds)}
      />
    </div>
  );
}

function FamilyProof(): React.JSX.Element {
  const frame = useCurrentFrame();
  const story = CAPTURE_ASSETS[STORY_CONTRACT.continuousEditor.captureId];
  const family = CAPTURE_ASSETS[STORY_CONTRACT.familyProof.captureId];
  const reveal = interpolate(frame, [0, 10], [0, 1], {
    easing: EASE_OUT,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div className="video-media video-media--family-proof">
      <Img className="video-media__asset" src={staticFile(`captures/${story.endStill}`)} />
      <Img
        className="video-media__asset video-media__asset--family"
        src={staticFile(`captures/${family.startStill}`)}
        style={{ opacity: reveal }}
      />
    </div>
  );
}

function ProductStory(): React.JSX.Element {
  const editor = STORY_CONTRACT.continuousEditor;
  const family = STORY_CONTRACT.familyProof;
  return (
    <>
      <Sequence
        from={frames(editor.startSeconds)}
        durationInFrames={frames(editor.endSeconds - editor.startSeconds)}
      >
        <StoryTake />
      </Sequence>
      <Sequence
        from={frames(family.startSeconds)}
        durationInFrames={frames(family.endSeconds - family.startSeconds)}
      >
        <FamilyProof />
      </Sequence>
    </>
  );
}

function WebsiteWatermark(): React.JSX.Element {
  return (
    <div className="video-watermark" aria-hidden="true">
      <Logo label={VIDEO_BRAND.watermark} />
    </div>
  );
}

function FinalInvitation(): React.JSX.Element {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 10], [0, 1], {
    easing: EASE_OUT,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const translate = interpolate(enter, [0, 1], [28, 0]);
  return (
    <AbsoluteFill className="video-future">
      <div className="video-future__wash" />
      <div
        className="video-future__content"
        style={{ transform: `translate3d(0, ${translate}px, 0)` }}
      >
        <Logo />
        <p>THE NEXT EDITABLE CHART</p>
        <h1>
          更多图表，
          <br />
          应该怎样被直接编辑？
        </h1>
        <div className="video-future__links">
          <strong>tellplot.com</strong>
          <span>github.com/iiwish/tellplot</span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function CaptionLayer({ seconds }: { readonly seconds: number }): React.JSX.Element | null {
  const caption = captionAt(seconds);
  if (caption === undefined) {
    return null;
  }
  return (
    <div
      className={`video-caption${seconds >= STORY_CONTRACT.familyProof.endSeconds ? ' video-caption--dark' : ''}`}
      key={caption.id}
    >
      {caption.text.split('\n').map(line => (
        <span key={line}>{line}</span>
      ))}
    </div>
  );
}

export function LaunchVideo(): React.JSX.Element {
  const frame = useCurrentFrame();
  const seconds = frame / FPS;
  return (
    <div className="video-root">
      <Audio src={staticFile('audio/narration.wav')} volume={0.88} />
      <ProductStory />
      <Sequence from={frames(STORY_CONTRACT.familyProof.endSeconds)}>
        <FinalInvitation />
      </Sequence>
      <CaptionLayer seconds={seconds} />
      <WebsiteWatermark />
    </div>
  );
}

export function LaunchCover(): React.JSX.Element {
  const capture = CAPTURE_ASSETS[COVER_CONTRACT.captureId];
  return (
    <div className="video-poster">
      <header className="video-poster__header">
        <Logo />
        <strong>{VIDEO_BRAND.watermark}</strong>
      </header>
      <h1 className="video-poster__headline">{VIDEO_BRAND.coverHeadline}</h1>
      <div className="video-poster__chart">
        <Img
          className="video-poster__chart-media"
          src={staticFile(`captures/${capture.startStill}`)}
        />
        <div className="video-poster__drop-indicator" aria-hidden="true" />
        <div className="video-poster__drag-preview" aria-hidden="true">
          <span>价格提升</span>
        </div>
        <div className="video-poster__cursor" aria-hidden="true" />
      </div>
    </div>
  );
}
