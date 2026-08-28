import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workbenchSource = readFileSync(
  new URL('../src/ExampleWorkbench.tsx', import.meta.url),
  'utf8',
);
const showcaseSource = readFileSync(new URL('../src/ShowcaseChart.tsx', import.meta.url), 'utf8');

describe('schema 3 playground compile guards', () => {
  it('routes comparison data before the legacy waterfall fallback', () => {
    expect(workbenchSource).toContain("sourceData.schemaVersion === '3.0.0'");
    expect(workbenchSource).toContain('legend: true');
    expect(showcaseSource).toContain("sourceData.schemaVersion === '1.0.0'");
    expect(showcaseSource).toContain("sourceData.dataKind === 'waterfall'");
  });

  it('keeps comparison examples on public entrypoints without a private projector', () => {
    expect(workbenchSource).toContain("from 'tellplot'");
    expect(workbenchSource).not.toContain('projectCategoricalComparison');
    expect(workbenchSource).not.toContain('@tellplot/');
  });
});
