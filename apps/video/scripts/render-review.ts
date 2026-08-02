import { spawnSync } from 'node:child_process';
import { readdirSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const videoDirectory = fileURLToPath(new URL('../', import.meta.url));
const remotion = `${videoDirectory}node_modules/.bin/remotion`;
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outputDirectory = `${videoDirectory}out/`;
const reviewFrames = {
  TellPlotLaunch16x9: [
    30, 117, 135, 285, 306, 321, 342, 363, 390, 405, 420, 435, 500, 690, 930, 1040, 1100, 1230,
    1305, 1390, 1530, 1630, 1750, 1870,
  ],
} as const;

for (const file of readdirSync(outputDirectory)) {
  if (/^review-(?:landscape|portrait)-\d+\.png$/.test(file)) {
    unlinkSync(`${outputDirectory}${file}`);
  }
}

for (const [composition, frames] of Object.entries(reviewFrames)) {
  for (const frame of frames) {
    const result = spawnSync(
      remotion,
      [
        'still',
        'src/index.ts',
        composition,
        `out/review-landscape-${String(frame).padStart(4, '0')}.png`,
        `--frame=${frame}`,
        '--scale=2',
        `--browser-executable=${chrome}`,
      ],
      { cwd: videoDirectory, encoding: 'utf8', stdio: 'inherit' },
    );
    if (result.status !== 0) {
      throw new Error(`Failed to render ${composition} frame ${frame}.`);
    }
  }
}
