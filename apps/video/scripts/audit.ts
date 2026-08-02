import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  COVER_DELIVERABLE,
  SUBTITLE_DELIVERABLE,
  VIDEO_DELIVERABLES,
} from '../src/deliverables.ts';

interface ProbeStream {
  readonly codec_name?: string;
  readonly codec_type?: string;
  readonly width?: number;
  readonly height?: number;
  readonly sample_rate?: string;
  readonly channels?: number;
}

interface ProbeResult {
  readonly streams?: readonly ProbeStream[];
  readonly format?: { readonly duration?: string };
}

const videoDirectory = fileURLToPath(new URL('../', import.meta.url));
const outputDirectory = `${videoDirectory}out/`;
const pnpmStore = fileURLToPath(new URL('../../../node_modules/.pnpm/', import.meta.url));
const compositorPrefix = `@remotion+compositor-${process.platform}-${process.arch}@`;
const compositorDirectory = readdirSync(pnpmStore).find(directory =>
  directory.startsWith(compositorPrefix),
);

if (compositorDirectory === undefined) {
  throw new Error(`Cannot locate the Remotion compositor for ${process.platform}-${process.arch}.`);
}

const compositorBin = `${pnpmStore}${compositorDirectory}/node_modules/@remotion/compositor-${process.platform}-${process.arch}`;
const ffprobe = `${compositorBin}/ffprobe`;
const compositorEnvironment = {
  ...process.env,
  DYLD_LIBRARY_PATH: compositorBin,
};

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function probe(path: string): ProbeResult {
  const output = execFileSync(
    ffprobe,
    ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path],
    { encoding: 'utf8', env: compositorEnvironment },
  );
  return JSON.parse(output) as ProbeResult;
}

const videos = VIDEO_DELIVERABLES.map(deliverable => {
  const path = `${outputDirectory}${deliverable.file}`;
  const media = probe(path);
  const video = media.streams?.find(stream => stream.codec_type === 'video');
  const audio = media.streams?.find(stream => stream.codec_type === 'audio');
  const duration = Number(media.format?.duration);

  if (video?.codec_name !== 'h264' || audio?.codec_name !== 'aac') {
    throw new Error(`${deliverable.file} must contain H.264 video and AAC audio.`);
  }
  if (video.width !== deliverable.width || video.height !== deliverable.height) {
    throw new Error(`${deliverable.file} has an unexpected resolution.`);
  }
  if (Math.abs(duration - deliverable.durationSeconds) > 0.2) {
    throw new Error(`${deliverable.file} has an unexpected duration: ${duration}.`);
  }
  if (audio.sample_rate !== '48000' || audio.channels !== 2) {
    throw new Error(`${deliverable.file} must contain 48 kHz stereo audio.`);
  }
  return {
    file: deliverable.file,
    bytes: statSync(path).size,
    sha256: sha256(path),
    width: video.width,
    height: video.height,
    durationSeconds: duration,
    codecs: [video.codec_name, audio.codec_name],
    audio: { sampleRate: audio.sample_rate, channels: audio.channels },
  };
});

const reviewFrames = readdirSync(outputDirectory).filter(file =>
  /^review-landscape-\d+\.png$/.test(file),
);
const landscapeFrames = reviewFrames;
if (landscapeFrames.length < 9) {
  throw new Error('The key-frame audit requires at least 9 landscape stills.');
}
for (const frame of reviewFrames) {
  if (statSync(`${outputDirectory}${frame}`).size < 50_000) {
    throw new Error(`Review frame ${frame} is unexpectedly empty.`);
  }
  const metadata = execFileSync(
    'sips',
    ['-g', 'pixelWidth', '-g', 'pixelHeight', `${outputDirectory}${frame}`],
    { encoding: 'utf8' },
  );
  if (!metadata.includes('pixelWidth: 3840') || !metadata.includes('pixelHeight: 2160')) {
    throw new Error(`Review frame ${frame} is not 3840x2160.`);
  }
}

const coverPath = `${outputDirectory}${COVER_DELIVERABLE.file}`;
const coverMetadata = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', coverPath], {
  encoding: 'utf8',
});
if (
  !coverMetadata.includes(`pixelWidth: ${COVER_DELIVERABLE.width}`) ||
  !coverMetadata.includes(`pixelHeight: ${COVER_DELIVERABLE.height}`)
) {
  throw new Error('Cover has an unexpected resolution.');
}

const subtitlePath = `${videoDirectory}public/subtitles/${SUBTITLE_DELIVERABLE}`;
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  videos,
  cover: {
    file: COVER_DELIVERABLE.file,
    bytes: statSync(coverPath).size,
    sha256: sha256(coverPath),
    width: COVER_DELIVERABLE.width,
    height: COVER_DELIVERABLE.height,
  },
  subtitles: {
    file: SUBTITLE_DELIVERABLE,
    bytes: statSync(subtitlePath).size,
    sha256: sha256(subtitlePath),
  },
  keyFrameAudit: {
    landscapeFrames: landscapeFrames.length,
    unexpectedlyEmptyFrames: 0,
  },
};

writeFileSync(`${outputDirectory}media-audit.json`, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
