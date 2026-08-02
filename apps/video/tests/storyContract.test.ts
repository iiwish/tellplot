import { describe, expect, it } from 'vitest';

import {
  COVER_CONTRACT,
  STORY_CAPTURE_PRESENTATION,
  STORY_ACTION_SECONDS,
  STORY_CONTRACT,
  STORY_PACING_SECONDS,
  VIDEO_BRAND,
} from '../src/storyContract';
import { CAPTIONS } from '../src/timeline';

function captionStart(id: string): number {
  const caption = CAPTIONS.find(candidate => candidate.id === id);
  if (caption === undefined) {
    throw new Error(`Missing caption cue: ${id}`);
  }
  return caption.start;
}

describe('continuous product story', () => {
  it('aligns primary real actions to the spoken cues', () => {
    expect(STORY_ACTION_SECONDS.directDrag).toBe(captionStart('hook-payoff'));
    expect(STORY_ACTION_SECONDS.marqueeGroup).toBe(captionStart('group'));
    expect(STORY_ACTION_SECONDS.prototypeExpand).toBe(captionStart('prototype'));
    expect(STORY_ACTION_SECONDS.undo).toBe(captionStart('system'));
    expect(STORY_ACTION_SECONDS.viewState).toBe(captionStart('immutable'));
    expect(STORY_CONTRACT.familyProof.startSeconds).toBe(captionStart('families'));
  });

  it('keeps supporting actions ordered inside the same uninterrupted editor take', () => {
    expect(Object.values(STORY_ACTION_SECONDS)).toEqual([
      3.52, 9.22, 25.46, 28, 34.26, 35, 36, 45.68,
    ]);
    expect(STORY_ACTION_SECONDS.prototypeCollapse).toBeLessThan(captionStart('hard-part'));
    expect(STORY_ACTION_SECONDS.exportSvg).toBeLessThan(captionStart('rebuild'));
    expect(STORY_ACTION_SECONDS.viewState).toBeLessThanOrEqual(
      STORY_CONTRACT.continuousEditor.endSeconds,
    );
  });

  it('gives drag, selection, naming and creation separate readable beats', () => {
    expect(STORY_PACING_SECONDS).toEqual({
      directDragRelease: 4.9,
      marqueeRelease: 10.35,
      groupNameStart: 10.72,
      groupCreate: 11.9,
      groupNameHoldSeconds: 1,
    });
    expect(
      STORY_PACING_SECONDS.directDragRelease - STORY_ACTION_SECONDS.directDrag,
    ).toBeGreaterThan(1.2);
    expect(
      STORY_PACING_SECONDS.groupNameStart - STORY_PACING_SECONDS.marqueeRelease,
    ).toBeGreaterThan(0.3);
    expect(STORY_PACING_SECONDS.groupCreate - STORY_PACING_SECONDS.groupNameStart).toBeGreaterThan(
      1,
    );
  });

  it('frames grouping as a compact mark selection with an editor-centered dialog', () => {
    expect(STORY_CAPTURE_PRESENTATION).toEqual({
      marqueePadding: 8,
      groupDialogPlacement: 'editor-center',
      pointerTargetsGroupInput: true,
      suppressTooltipWhileSelecting: true,
    });
  });

  it('uses a restrained long-take edit instead of explanatory overlays and chart hopping', () => {
    expect(STORY_CONTRACT).toEqual({
      continuousEditor: {
        captureId: 'story-take',
        startSeconds: 0,
        endSeconds: 50.4,
      },
      editorialOverlayCount: 0,
      familyProof: {
        captureId: 'chart-families',
        mode: 'static-waterfall',
        startSeconds: 50.4,
        endSeconds: 56.86,
      },
      primaryVisualCuts: [50.4, 56.86],
    });
  });

  it('keeps the website watermark and cover message in the typed brand contract', () => {
    expect(VIDEO_BRAND).toEqual({
      watermark: 'TellPlot.com',
      coverEyebrow: 'OPEN SOURCE · BUILT ON ANT V G2',
      coverHeadline: '图表，应该可以直接编辑。',
    });
  });

  it('uses a chart-only direct-manipulation visual for the cover', () => {
    expect(COVER_CONTRACT).toEqual({
      captureId: 'chart-families',
      showStructureOutline: false,
      showGroupRegion: true,
      showDragPreview: true,
    });
  });
});
