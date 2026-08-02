import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { REQUIRED_CAPTURE_IDS, type CaptureManifest } from '../src/captureContract';
import { CAPTURE_ASSETS } from '../src/captures';

const capturesDirectory = fileURLToPath(new URL('../public/captures/', import.meta.url));

describe('real TellPlot capture manifest', () => {
  it('contains every approved real-product shot with terminal assertions', () => {
    const manifestPath = `${capturesDirectory}manifest.json`;
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as CaptureManifest;
    expect(manifest.schemaVersion).toBe(4);
    expect(manifest.source).toBe('tellplot-production-build');
    expect(manifest.pointer).toEqual({
      mode: 'page-event-overlay',
      version: 1,
      clickFeedbackMs: 160,
    });
    expect(manifest.viewport).toEqual({ width: 3840, height: 2160 });
    expect(manifest.logicalViewport).toEqual({ width: 1920, height: 1080 });
    expect(manifest.contentScale).toBe(2);
    expect(manifest.deviceScaleFactor).toBe(1);
    expect(manifest.recordSize).toEqual({ width: 3840, height: 2160 });
    expect(manifest.captures.map(capture => capture.id)).toEqual(REQUIRED_CAPTURE_IDS);

    for (const capture of manifest.captures) {
      expect(capture.assertions.length).toBeGreaterThan(0);
      expect(capture.durationSeconds).toBeGreaterThan(1);
      expect(capture.actionStartOffsetSeconds).toBeGreaterThanOrEqual(0.6);
      expect(capture.actionStartOffsetSeconds).toBeLessThanOrEqual(0.75);
      expect(existsSync(`${capturesDirectory}${capture.file}`)).toBe(true);
      expect(existsSync(`${capturesDirectory}${capture.startStill}`)).toBe(true);
      expect(existsSync(`${capturesDirectory}${capture.endStill}`)).toBe(true);
      const asset = CAPTURE_ASSETS[capture.id];
      expect(asset.file).toBe(capture.file);
      expect(asset.startStill).toBe(capture.startStill);
      expect(asset.endStill).toBe(capture.endStill);
      expect(asset.trimStartSeconds).toBe(capture.trimStartSeconds);
      expect(asset.actionStartOffsetSeconds).toBe(capture.actionStartOffsetSeconds);
      expect(asset.actionDurationSeconds).toBeCloseTo(
        capture.durationSeconds - capture.trimStartSeconds,
        3,
      );
    }
  });
});
