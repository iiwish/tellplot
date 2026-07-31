import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const editorRoot = resolve(process.cwd(), 'packages/editor/src');
const coreRoot = resolve(process.cwd(), 'packages/core/src');

function source(path: string): string {
  return readFileSync(resolve(editorRoot, path), 'utf8');
}

describe('internal chart architecture boundary', () => {
  it('owns projections and specs under chart-family modules', () => {
    const coreRequired = [
      'charts/waterfall/projection.ts',
      'charts/waterfall/types.ts',
      'charts/categorical/projection.ts',
      'charts/categorical/types.ts',
    ];
    const editorRequired = ['charts/waterfall/spec.ts', 'charts/categorical/spec.ts'];
    const obsolete = [
      'waterfall/projectWaterfall.ts',
      'waterfall/waterfallTypes.ts',
      'categorical/projectCategorical.ts',
      'categorical/categoricalChartSpec.ts',
      'categorical/categoricalTypes.ts',
      'export/waterfallChartSpec.ts',
    ];

    expect(coreRequired.every(path => existsSync(resolve(coreRoot, path)))).toBe(true);
    expect(editorRequired.every(path => existsSync(resolve(editorRoot, path)))).toBe(true);
    expect(obsolete.some(path => existsSync(resolve(editorRoot, path)))).toBe(false);
    expect(existsSync(resolve(coreRoot, 'interactions/chartPointer.ts'))).toBe(false);
    expect(existsSync(resolve(editorRoot, 'rendering/g2/chartPointer.ts'))).toBe(true);
  });

  it('keeps raw G2 runtime imports out of components, exports and the public entrypoint', () => {
    const boundaryFiles = [
      'editor/chartSurface.ts',
      'export/svgExport.ts',
      'export/pngExport.ts',
      'index.ts',
    ];

    for (const path of boundaryFiles) {
      expect(source(path)).not.toContain("from '@antv/g2'");
      expect(source(path)).not.toContain("import('@antv/g2')");
    }
    expect(source('index.ts')).not.toContain('rendering/g2');
    expect(source('index.ts')).not.toContain('G2Spec');
    expect(source('index.ts')).not.toContain('G2Chart');
  });
});
