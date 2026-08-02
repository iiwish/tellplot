export interface MarkBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export interface CapturePoint {
  readonly x: number;
  readonly y: number;
}

export interface CaptureMarquee {
  readonly from: CapturePoint;
  readonly to: CapturePoint;
}

export function marqueeAroundMarks(marks: readonly MarkBounds[], padding: number): CaptureMarquee {
  if (marks.length === 0 || !Number.isFinite(padding) || padding < 0) {
    throw new TypeError('Capture marquee requires marks and a non-negative finite padding.');
  }
  return {
    from: {
      x: Math.min(...marks.map(mark => mark.minX)) - padding,
      y: Math.min(...marks.map(mark => mark.minY)) - padding,
    },
    to: {
      x: Math.max(...marks.map(mark => mark.maxX)) + padding,
      y: Math.max(...marks.map(mark => mark.maxY)) + padding,
    },
  };
}
