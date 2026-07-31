import { describe, expect, it } from 'vitest';

import { createInitialViewSpec } from '../../src/domain/createInitialViewSpec';
import type {
  CategoricalSourceData,
  CurrentViewSpec,
  SourceData,
  ViewSpec,
} from '../../src/domain/model';
import { projectCategorical } from '../../src/charts/categorical/projection';
import { financialSourceData } from '../fixtures/financialSourceData';

const categoricalSource = {
  schemaVersion: '2.0.0',
  dataKind: 'categorical',
  datasetId: 'categorical-projection',
  currency: 'CNY',
  items: [
    { id: 'alpha', label: 'Shared label', amount: 12 },
    { id: 'beta', label: 'Shared label', amount: -4 },
    { id: 'gamma', label: 'Zero', amount: 0 },
  ],
} as const satisfies CategoricalSourceData;

function initialView(
  source: CategoricalSourceData = categoricalSource,
  chartType: 'bar' | 'column' = 'column',
): CurrentViewSpec {
  const result = createInitialViewSpec(source, { chartType });
  if (!result.ok || result.value.schemaVersion !== '2.0.0') {
    throw new Error('Expected a current categorical view');
  }
  return result.value;
}

describe('categorical projection basics', () => {
  it('projects empty, positive, negative and zero categories in stable source order', () => {
    const emptySource = {
      schemaVersion: '2.0.0',
      dataKind: 'categorical',
      datasetId: 'empty-categorical',
      items: [],
    } as const satisfies CategoricalSourceData;
    expect(projectCategorical(emptySource, initialView(emptySource))).toEqual({
      ok: true,
      value: [],
      errors: [],
    });

    const result = projectCategorical(categoricalSource, initialView());
    expect(result).toEqual({
      ok: true,
      value: [
        {
          nodeId: 'alpha',
          label: 'Shared label',
          amount: 12,
          kind: 'positive',
          sourceIds: ['alpha'],
          locked: false,
          order: 0,
        },
        {
          nodeId: 'beta',
          label: 'Shared label',
          amount: -4,
          kind: 'negative',
          sourceIds: ['beta'],
          locked: false,
          order: 1,
        },
        {
          nodeId: 'gamma',
          label: 'Zero',
          amount: 0,
          kind: 'positive',
          sourceIds: ['gamma'],
          locked: false,
          order: 2,
        },
      ],
      errors: [],
    });
  });

  it('uses one chart-neutral projection for bar and column without sharing output containers', () => {
    const column = projectCategorical(categoricalSource, initialView());
    const bar = projectCategorical(categoricalSource, initialView(categoricalSource, 'bar'));
    expect(column).toEqual(bar);
    if (!column.ok || !bar.ok) {
      throw new Error('Expected valid categorical projections');
    }
    expect(column.value).not.toBe(bar.value);
    expect(column.value[0]?.sourceIds).not.toBe(categoricalSource.items);
    expect(JSON.parse(JSON.stringify(column.value))).toEqual(column.value);
  });

  it('projects one pinned category as a locked ordinary datum', () => {
    const source = {
      schemaVersion: '2.0.0',
      dataKind: 'categorical',
      datasetId: 'single-categorical',
      items: [{ id: 'only', label: 'Only category', amount: 7 }],
    } as const satisfies CategoricalSourceData;
    const view = { ...initialView(source), pinnedItemIds: ['only'] };
    expect(projectCategorical(source, view)).toEqual({
      ok: true,
      value: [
        {
          nodeId: 'only',
          label: 'Only category',
          amount: 7,
          kind: 'positive',
          sourceIds: ['only'],
          locked: true,
          order: 0,
        },
      ],
      errors: [],
    });
  });

  it('returns canonical compatibility failures for waterfall and invalid views', () => {
    const waterfallView = createInitialViewSpec(financialSourceData);
    if (!waterfallView.ok) {
      throw new Error('Expected the waterfall fixture to be valid');
    }
    expect(projectCategorical(financialSourceData, waterfallView.value)).toEqual({
      ok: false,
      errors: [
        expect.objectContaining({
          code: 'SOURCE_CONFLICT',
          reason: 'INCOMPATIBLE_CHART_TYPE',
          path: '/chartType',
        }),
      ],
    });

    const invalidView = {
      ...initialView(),
      datasetId: 'other-dataset',
    } as ViewSpec;
    const invalid = projectCategorical(categoricalSource, invalidView);
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'SOURCE_CONFLICT',
            reason: 'DATASET_ID_MISMATCH',
            path: '/datasetId',
          }),
        ]),
      );
    }
  });

  it('does not throw or expose hostile input details', () => {
    const hostile = new Proxy(
      {},
      {
        getOwnPropertyDescriptor() {
          throw new Error('private categorical value');
        },
      },
    ) as SourceData;
    const result = projectCategorical(hostile, initialView());
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain('private categorical value');
  });
});
