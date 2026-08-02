import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { AUDIO_DURATION_SECONDS } from '../src/timeline';

function wavDuration(path: string): number {
  const wav = readFileSync(path);
  expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
  expect(wav.toString('ascii', 8, 12)).toBe('WAVE');

  let offset = 12;
  let byteRate: number | undefined;
  let dataLength: number | undefined;
  while (offset + 8 <= wav.length) {
    const id = wav.toString('ascii', offset, offset + 4);
    const length = wav.readUInt32LE(offset + 4);
    if (id === 'fmt ') {
      byteRate = wav.readUInt32LE(offset + 16);
    }
    if (id === 'data') {
      dataLength = length;
      break;
    }
    offset += 8 + length + (length % 2);
  }
  if (byteRate === undefined || dataLength === undefined) {
    throw new Error('WAV is missing fmt or data chunk.');
  }
  return dataLength / byteRate;
}

describe('approved narration asset', () => {
  it('matches the measured source duration', () => {
    const path = fileURLToPath(new URL('../public/audio/narration.wav', import.meta.url));
    expect(wavDuration(path)).toBeCloseTo(AUDIO_DURATION_SECONDS, 6);
  });
});
