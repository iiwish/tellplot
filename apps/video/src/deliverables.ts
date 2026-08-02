export interface VideoDeliverable {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly durationSeconds: number;
}

export const VIDEO_DELIVERABLES: readonly VideoDeliverable[] = Object.freeze([
  {
    file: 'tellplot-launch-4k.mp4',
    width: 3840,
    height: 2160,
    durationSeconds: 63.6,
  },
]);

export const COVER_DELIVERABLE = Object.freeze({
  file: 'tellplot-launch-cover-4k.png',
  width: 3840,
  height: 2160,
});

export const SUBTITLE_DELIVERABLE = 'tellplot-launch.zh-CN.srt';
