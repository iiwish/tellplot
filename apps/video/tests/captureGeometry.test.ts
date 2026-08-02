import { describe, expect, it } from 'vitest';

import { marqueeAroundMarks } from '../src/captureGeometry';

describe('production capture geometry', () => {
  it('wraps only the selected marks instead of extending to the chart baseline', () => {
    const marquee = marqueeAroundMarks(
      [
        { minX: 240, maxX: 310, minY: 170, maxY: 420 },
        { minX: 330, maxX: 400, minY: 120, maxY: 260 },
      ],
      8,
    );

    expect(marquee).toEqual({
      from: { x: 232, y: 112 },
      to: { x: 408, y: 428 },
    });
  });
});
