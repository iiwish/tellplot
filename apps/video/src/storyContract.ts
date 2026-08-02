export const STORY_ACTION_SECONDS = Object.freeze({
  directDrag: 3.52,
  marqueeGroup: 9.22,
  prototypeExpand: 25.46,
  prototypeCollapse: 28,
  undo: 34.26,
  redo: 35,
  exportSvg: 36,
  viewState: 45.68,
} as const);

export const STORY_PACING_SECONDS = Object.freeze({
  directDragRelease: 4.9,
  marqueeRelease: 10.35,
  groupNameStart: 10.72,
  groupCreate: 11.9,
  groupNameHoldSeconds: 1,
} as const);

export const STORY_CAPTURE_PRESENTATION = Object.freeze({
  marqueePadding: 8,
  groupDialogPlacement: 'editor-center',
  pointerTargetsGroupInput: true,
  suppressTooltipWhileSelecting: true,
} as const);

export const VIDEO_BRAND = Object.freeze({
  watermark: 'TellPlot.com',
  coverEyebrow: 'OPEN SOURCE · BUILT ON ANT V G2',
  coverHeadline: '图表，应该可以直接编辑。',
} as const);

export const COVER_CONTRACT = Object.freeze({
  captureId: 'chart-families',
  showStructureOutline: false,
  showGroupRegion: true,
  showDragPreview: true,
} as const);

export const STORY_CONTRACT = Object.freeze({
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
} as const);
