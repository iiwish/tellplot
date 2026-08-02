import type { CaptureId } from './captureContract';

export interface CaptureAsset {
  readonly id: CaptureId;
  readonly file: string;
  readonly startStill: string;
  readonly endStill: string;
  readonly trimStartSeconds: number;
  readonly actionStartOffsetSeconds: number;
  readonly actionDurationSeconds: number;
}

export const CAPTURE_ASSETS: Readonly<Record<CaptureId, CaptureAsset>> = Object.freeze({
  'story-take': {
    id: 'story-take',
    file: 'story-take.webm',
    startStill: 'story-take-start.png',
    endStill: 'story-take-end.png',
    trimStartSeconds: 1.795,
    actionStartOffsetSeconds: 0.652,
    actionDurationSeconds: 50.513,
  },
  'waterfall-direct': {
    id: 'waterfall-direct',
    file: 'waterfall-direct.webm',
    startStill: 'waterfall-direct-start.png',
    endStill: 'waterfall-direct-end.png',
    trimStartSeconds: 1.688,
    actionStartOffsetSeconds: 0.652,
    actionDurationSeconds: 4.531,
  },
  'waterfall-group': {
    id: 'waterfall-group',
    file: 'waterfall-group.webm',
    startStill: 'waterfall-group-start.png',
    endStill: 'waterfall-group-end.png',
    trimStartSeconds: 1.688,
    actionStartOffsetSeconds: 0.651,
    actionDurationSeconds: 7.395,
  },
  'outline-history': {
    id: 'outline-history',
    file: 'outline-history.webm',
    startStill: 'outline-history-start.png',
    endStill: 'outline-history-end.png',
    trimStartSeconds: 1.676,
    actionStartOffsetSeconds: 0.651,
    actionDurationSeconds: 5.671,
  },
  'state-model': {
    id: 'state-model',
    file: 'state-model.webm',
    startStill: 'state-model-start.png',
    endStill: 'state-model-end.png',
    trimStartSeconds: 1.669,
    actionStartOffsetSeconds: 0.651,
    actionDurationSeconds: 3.654,
  },
  'export-svg': {
    id: 'export-svg',
    file: 'export-svg.webm',
    startStill: 'export-svg-start.png',
    endStill: 'export-svg-end.png',
    trimStartSeconds: 1.672,
    actionStartOffsetSeconds: 0.652,
    actionDurationSeconds: 3.337,
  },
  'chart-families': {
    id: 'chart-families',
    file: 'chart-families.webm',
    startStill: 'chart-families-start.png',
    endStill: 'chart-families-end.png',
    trimStartSeconds: 1.672,
    actionStartOffsetSeconds: 0.651,
    actionDurationSeconds: 4.996,
  },
});
