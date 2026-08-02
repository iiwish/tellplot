import { describe, expect, it } from 'vitest';

import {
  AUDIO_DURATION_SECONDS,
  CAPTIONS,
  FPS,
  LANDSCAPE_SIZE,
  SCENES,
  TOTAL_FRAMES,
} from '../src/timeline';

describe('launch video timeline', () => {
  it('covers the approved narration without overlapping captions', () => {
    expect(AUDIO_DURATION_SECONDS).toBeCloseTo(62.969042, 6);
    expect(TOTAL_FRAMES / FPS).toBeGreaterThanOrEqual(AUDIO_DURATION_SECONDS);
    expect(TOTAL_FRAMES / FPS - AUDIO_DURATION_SECONDS).toBeLessThanOrEqual(0.8);
    expect(CAPTIONS[0]?.start).toBeLessThanOrEqual(0.6);
    expect(CAPTIONS.at(-1)?.end).toBeGreaterThanOrEqual(62.9);

    for (const [index, caption] of CAPTIONS.entries()) {
      expect(caption.start).toBeGreaterThanOrEqual(0);
      expect(caption.end).toBeGreaterThan(caption.start);
      expect(caption.end).toBeLessThanOrEqual(TOTAL_FRAMES / FPS);
      expect(caption.text.trim()).not.toBe('');
      const next = CAPTIONS[index + 1];
      if (next !== undefined) {
        expect(caption.end).toBeLessThanOrEqual(next.start);
      }
    }
  });

  it('defines the logical 16:9 composition used for the 2x 4K render', () => {
    expect(LANDSCAPE_SIZE).toEqual({ width: 1920, height: 1080 });
  });

  it('places the hook, brand and core message before retention gates', () => {
    const byId = new Map(SCENES.map(scene => [scene.id, scene]));
    expect(byId.get('hook')?.start).toBeLessThan(1);
    expect(byId.get('brand')?.end).toBeLessThanOrEqual(12);
    expect(byId.get('system')?.end).toBeLessThanOrEqual(45.7);
  });
});
