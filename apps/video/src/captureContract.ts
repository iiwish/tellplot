export const REQUIRED_CAPTURE_IDS = [
  'story-take',
  'waterfall-direct',
  'waterfall-group',
  'outline-history',
  'state-model',
  'export-svg',
  'chart-families',
] as const;

export type CaptureId = (typeof REQUIRED_CAPTURE_IDS)[number];

export interface CaptureRecord {
  readonly id: CaptureId;
  readonly file: string;
  readonly startStill: string;
  readonly endStill: string;
  readonly durationSeconds: number;
  readonly trimStartSeconds: number;
  readonly actionStartOffsetSeconds: number;
  readonly assertions: readonly string[];
}

export interface CaptureManifest {
  readonly schemaVersion: 4;
  readonly source: 'tellplot-production-build';
  readonly createdAt: string;
  readonly pointer: {
    readonly mode: 'page-event-overlay';
    readonly version: 1;
    readonly clickFeedbackMs: 160;
  };
  readonly viewport: {
    readonly width: 3840;
    readonly height: 2160;
  };
  readonly logicalViewport: {
    readonly width: 1920;
    readonly height: 1080;
  };
  readonly contentScale: 2;
  readonly deviceScaleFactor: 1;
  readonly recordSize: {
    readonly width: 3840;
    readonly height: 2160;
  };
  readonly captures: readonly CaptureRecord[];
}
