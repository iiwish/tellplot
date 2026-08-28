import { createInitialViewSpec, projectCategoricalComparison } from 'tellplot';
import { describe, expect, it } from 'vitest';

import { getPlaygroundChartType, getPlaygroundFixture } from '../src/fixtures';

describe('comparison playground journeys', () => {
  it.each([
    ['?fixture=comparison-actual-budget', 2, 'column'],
    ['?fixture=comparison-actual-budget-bar', 2, 'bar'],
    ['?fixture=comparison-four-series', 4, 'column'],
  ] as const)('provides a public-only %s source with %i series', (search, count, type) => {
    const source = getPlaygroundFixture(search);
    expect(source.schemaVersion).toBe('3.0.0');
    if (source.schemaVersion !== '3.0.0') throw new Error('Expected a comparison fixture.');
    expect(source.series).toHaveLength(count);
    const view = createInitialViewSpec(source, { chartType: type });
    expect(view.ok).toBe(true);
    if (!view.ok) throw new Error('Expected a comparison view.');
    const projection = projectCategoricalComparison(source, view.value);
    expect(projection.ok).toBe(true);
    expect(getPlaygroundChartType(search) ?? 'column').toBe(type);
  });

  it('keeps legal empty comparison source and registry intact', () => {
    const source = getPlaygroundFixture('?fixture=comparison-empty');
    if (source.schemaVersion !== '3.0.0') throw new Error('Expected empty comparison source.');
    expect(source.items).toEqual([]);
    expect(source.series.map(series => series.label)).toEqual(['实际', '预算']);
    const view = createInitialViewSpec(source, { chartType: 'column' });
    expect(view).toMatchObject({ ok: true, value: { rootOrder: [] } });
  });
});
