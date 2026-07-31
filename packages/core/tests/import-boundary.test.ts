import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import * as core from '../src/index';

describe('@tellplot/core boundary', () => {
  it('exports framework-neutral domain and editor-store contracts', () => {
    expect(Object.keys(core)).toEqual(
      expect.arrayContaining([
        'createEditorSession',
        'createEditorStore',
        'createInitialViewSpec',
        'executeCommand',
        'projectCategorical',
        'projectWaterfall',
        'validateChartConfig',
        'viewSpecsEqual',
      ]),
    );
    for (const internalName of [
      'readChartCategoryElementPointer',
      'readChartElementBounds',
      'readChartPointerPoint',
      'readChartTargetCoordinate',
    ]) {
      expect(core).not.toHaveProperty(internalName);
    }
  });

  it('does not import DOM or host UI frameworks', () => {
    const entry = readFileSync(fileURLToPath(new URL('../src/index.ts', import.meta.url)), 'utf8');
    expect(entry).not.toMatch(/\b(?:window|document|HTMLElement)\b/u);
    expect(entry).not.toContain("from 'react'");
    expect(entry).not.toContain("from 'vue'");
    expect(entry).not.toContain('@antv/g2');
    expect(entry).not.toContain('./interactions/chartPointer');
  });
});
