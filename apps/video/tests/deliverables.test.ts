import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { COVER_DELIVERABLE, SUBTITLE_DELIVERABLE, VIDEO_DELIVERABLES } from '../src/deliverables';

const outputDirectory = fileURLToPath(new URL('../out/', import.meta.url));
const subtitlePath = fileURLToPath(
  new URL(`../public/subtitles/${SUBTITLE_DELIVERABLE}`, import.meta.url),
);

function metadata(path: string, key: string): string {
  return execFileSync('mdls', ['-raw', '-name', key, path], { encoding: 'utf8' }).trim();
}

describe('launch video deliverables', () => {
  it('ships one native 4K landscape master', () => {
    expect(VIDEO_DELIVERABLES).toEqual([
      {
        file: 'tellplot-launch-4k.mp4',
        width: 3840,
        height: 2160,
        durationSeconds: 63.6,
      },
    ]);
  });

  it.each(VIDEO_DELIVERABLES)('$file matches the approved media contract', deliverable => {
    const path = `${outputDirectory}${deliverable.file}`;
    expect(existsSync(path)).toBe(true);
    expect(statSync(path).size).toBeGreaterThan(1_000_000);
    expect(Number(metadata(path, 'kMDItemPixelWidth'))).toBe(deliverable.width);
    expect(Number(metadata(path, 'kMDItemPixelHeight'))).toBe(deliverable.height);
    expect(Number(metadata(path, 'kMDItemDurationSeconds'))).toBeCloseTo(
      deliverable.durationSeconds,
      0,
    );
    expect(metadata(path, 'kMDItemCodecs')).toContain('H.264');
    expect(metadata(path, 'kMDItemCodecs')).toContain('MPEG-4 AAC');
  });

  it('includes the redesigned 4K cover', () => {
    const path = `${outputDirectory}${COVER_DELIVERABLE.file}`;
    expect(existsSync(path)).toBe(true);
    expect(Number(metadata(path, 'kMDItemPixelWidth'))).toBe(COVER_DELIVERABLE.width);
    expect(Number(metadata(path, 'kMDItemPixelHeight'))).toBe(COVER_DELIVERABLE.height);
  });

  it('keeps the standalone Simplified Chinese subtitle track', () => {
    expect(existsSync(subtitlePath)).toBe(true);
    expect(statSync(subtitlePath).size).toBeGreaterThan(500);
  });
});
