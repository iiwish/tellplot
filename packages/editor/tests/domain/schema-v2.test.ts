import { describe, expect, it } from 'vitest';

import {
  createEditorSession,
  createInitialViewSpec,
  parseViewSpec,
  serializeViewSpec,
  validateSourceData,
  validateViewSpec,
  type CategoricalSourceData,
  type InitialViewSpecOptions,
  type ValidationResult,
  type ViewSpec,
  type WaterfallSourceData,
} from '../../src';
import { financialSourceData } from '../fixtures/financialSourceData';
import { projectWaterfall } from '../../src/charts/waterfall/projection';

type UnknownRecord = Record<string, unknown>;

const categoricalSourceData = {
  schemaVersion: '2.0.0',
  dataKind: 'categorical',
  datasetId: 'categorical-fixture',
  currency: 'CNY',
  items: [
    { id: 'alpha', label: 'Alpha', amount: 12 },
    { id: 'beta', label: 'Beta', amount: -4 },
    { id: 'gamma', label: 'Gamma', amount: 0 },
  ],
} as const satisfies CategoricalSourceData;

const emptyCategoricalSourceData = {
  schemaVersion: '2.0.0',
  dataKind: 'categorical',
  datasetId: 'empty-categorical-fixture',
  items: [],
} as const satisfies CategoricalSourceData;

const currentWaterfallSourceData = {
  ...financialSourceData,
  schemaVersion: '2.0.0',
  dataKind: 'waterfall',
} as const satisfies WaterfallSourceData;

function expectIssue<T>(
  result: ValidationResult<T>,
  expected: { readonly code: string; readonly reason: string; readonly path: string },
): void {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error('Expected validation failure');
  }
  expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining(expected)]));
}

function initialView(
  sourceData: CategoricalSourceData | WaterfallSourceData = categoricalSourceData,
  options?: InitialViewSpecOptions,
): ViewSpec {
  const result = createInitialViewSpec(sourceData, options);
  if (!result.ok) {
    throw new Error('Expected a valid initial view');
  }
  return result.value;
}

describe('schema 2.0.0 source data', () => {
  it('accepts categorical and current waterfall variants without cloning', () => {
    expect(validateSourceData(categoricalSourceData)).toEqual({
      ok: true,
      value: categoricalSourceData,
      errors: [],
    });
    expect(validateSourceData(emptyCategoricalSourceData)).toEqual({
      ok: true,
      value: emptyCategoricalSourceData,
      errors: [],
    });
    expect(validateSourceData(currentWaterfallSourceData)).toEqual({
      ok: true,
      value: currentWaterfallSourceData,
      errors: [],
    });
    expect(validateSourceData(financialSourceData)).toEqual({
      ok: true,
      value: financialSourceData,
      errors: [],
    });
  });

  it('uses schemaVersion and dataKind as a closed discriminator pair', () => {
    const missingKind = structuredClone(categoricalSourceData) as unknown as UnknownRecord;
    delete missingKind['dataKind'];
    expectIssue(validateSourceData(missingKind), {
      code: 'INVALID_SOURCE_DATA',
      reason: 'INVALID_DATA_KIND',
      path: '/dataKind',
    });

    const categoricalItemKind = structuredClone(categoricalSourceData) as unknown as UnknownRecord;
    const items = categoricalItemKind['items'] as UnknownRecord[];
    const firstItem = items[0];
    if (firstItem === undefined) {
      throw new Error('Expected categorical fixture item');
    }
    firstItem['kind'] = 'contribution';
    expectIssue(validateSourceData(categoricalItemKind), {
      code: 'INVALID_SOURCE_DATA',
      reason: 'UNKNOWN_FIELD',
      path: '/items/0/kind',
    });

    expectIssue(validateSourceData({ ...currentWaterfallSourceData, items: [] }), {
      code: 'INVALID_SOURCE_DATA',
      reason: 'INVALID_ANCHOR',
      path: '/items',
    });
  });
});

describe('schema 2.0.0 initial views', () => {
  it('defaults categorical sources to column and preserves source order', () => {
    const view = initialView();
    expect(view).toMatchObject({
      schemaVersion: '2.0.0',
      datasetId: 'categorical-fixture',
      chartType: 'column',
      revision: 0,
      rootOrder: ['alpha', 'beta', 'gamma'],
    });
    expect(initialView(emptyCategoricalSourceData).rootOrder).toEqual([]);
  });

  it('allows explicit bar and keeps both waterfall generations on waterfall', () => {
    expect(initialView(categoricalSourceData, { chartType: 'bar' }).chartType).toBe('bar');
    expect(initialView(currentWaterfallSourceData).chartType).toBe('waterfall');

    const legacy = createInitialViewSpec(financialSourceData);
    expect(legacy.ok).toBe(true);
    if (legacy.ok) {
      expect(legacy.value.schemaVersion).toBe('1.0.0');
      expect(legacy.value.chartType).toBe('waterfall');
    }
  });

  it('rejects incompatible chart types and unsafe option objects', () => {
    expectIssue(createInitialViewSpec(categoricalSourceData, { chartType: 'waterfall' }), {
      code: 'SOURCE_CONFLICT',
      reason: 'INCOMPATIBLE_CHART_TYPE',
      path: '/chartType',
    });
    expectIssue(createInitialViewSpec(currentWaterfallSourceData, { chartType: 'column' }), {
      code: 'SOURCE_CONFLICT',
      reason: 'INCOMPATIBLE_CHART_TYPE',
      path: '/chartType',
    });

    expectIssue(
      createInitialViewSpec(categoricalSourceData, {
        chartType: 'pie',
      } as unknown as InitialViewSpecOptions),
      {
        code: 'INVALID_VIEW_SPEC',
        reason: 'INVALID_CHART_TYPE',
        path: '/chartType',
      },
    );
    expectIssue(
      createInitialViewSpec(categoricalSourceData, null as unknown as InitialViewSpecOptions),
      {
        code: 'INVALID_VIEW_SPEC',
        reason: 'NON_PLAIN_DATA',
        path: '/',
      },
    );

    const unknownOptions = { chartType: 'bar', extra: true } as InitialViewSpecOptions;
    expectIssue(createInitialViewSpec(categoricalSourceData, unknownOptions), {
      code: 'INVALID_VIEW_SPEC',
      reason: 'UNKNOWN_FIELD',
      path: '/extra',
    });

    const symbolOptions: InitialViewSpecOptions = {};
    Object.defineProperty(symbolOptions, Symbol('private'), { enumerable: true, value: true });
    expectIssue(createInitialViewSpec(categoricalSourceData, symbolOptions), {
      code: 'INVALID_VIEW_SPEC',
      reason: 'NON_PLAIN_DATA',
      path: '/',
    });

    let getterCalls = 0;
    const accessorOptions: InitialViewSpecOptions = {};
    Object.defineProperty(accessorOptions, 'chartType', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'bar';
      },
    });
    expectIssue(createInitialViewSpec(categoricalSourceData, accessorOptions), {
      code: 'INVALID_VIEW_SPEC',
      reason: 'NON_PLAIN_DATA',
      path: '/chartType',
    });
    expect(getterCalls).toBe(0);

    const missingDescriptor = new Proxy(
      {},
      {
        ownKeys: () => ['chartType'],
        getOwnPropertyDescriptor: () => undefined,
      },
    ) as InitialViewSpecOptions;
    expectIssue(createInitialViewSpec(categoricalSourceData, missingDescriptor), {
      code: 'INVALID_VIEW_SPEC',
      reason: 'NON_PLAIN_DATA',
      path: '/chartType',
    });

    const hostile = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('private option proxy');
        },
      },
    ) as InitialViewSpecOptions;
    const result = createInitialViewSpec(categoricalSourceData, hostile);
    expectIssue(result, {
      code: 'INVALID_VIEW_SPEC',
      reason: 'UNREADABLE_INPUT',
      path: '/',
    });
    expect(JSON.stringify(result)).not.toContain('private option proxy');
  });
});

describe('schema 2.0.0 view compatibility and persistence', () => {
  it('validates categorical bar and column views with shared narrative fields', () => {
    const column = initialView();
    const bar: ViewSpec = {
      ...initialView(categoricalSourceData, { chartType: 'bar' }),
      rootOrder: ['drivers', 'gamma'],
      groups: {
        drivers: { id: 'drivers', label: 'Drivers', childIds: ['alpha', 'beta'] },
      },
      pinnedItemIds: ['alpha'],
    };

    expect(validateViewSpec(column, categoricalSourceData).ok).toBe(true);
    expect(validateViewSpec(bar, categoricalSourceData)).toEqual({
      ok: true,
      value: bar,
      errors: [],
    });
  });

  it('rejects schema-generation and chart-family mismatches', () => {
    const categoricalWaterfall = { ...initialView(), chartType: 'waterfall' };
    expectIssue(validateViewSpec(categoricalWaterfall, categoricalSourceData), {
      code: 'SOURCE_CONFLICT',
      reason: 'INCOMPATIBLE_CHART_TYPE',
      path: '/chartType',
    });

    const waterfallBar = { ...initialView(currentWaterfallSourceData), chartType: 'bar' };
    expectIssue(validateViewSpec(waterfallBar, currentWaterfallSourceData), {
      code: 'SOURCE_CONFLICT',
      reason: 'INCOMPATIBLE_CHART_TYPE',
      path: '/chartType',
    });

    const legacySourceWithCurrentView = {
      ...initialView(currentWaterfallSourceData),
      datasetId: financialSourceData.datasetId,
    };
    expectIssue(validateViewSpec(legacySourceWithCurrentView, financialSourceData), {
      code: 'SOURCE_CONFLICT',
      reason: 'SCHEMA_VERSION_MISMATCH',
      path: '/schemaVersion',
    });

    expectIssue(projectWaterfall(categoricalSourceData, initialView()), {
      code: 'SOURCE_CONFLICT',
      reason: 'INCOMPATIBLE_CHART_TYPE',
      path: '/chartType',
    });
  });

  it('round-trips bar without changing schema, chart type or source identity', () => {
    const view = initialView(categoricalSourceData, { chartType: 'bar' });
    const serialized = serializeViewSpec(view);
    const parsed = parseViewSpec(serialized, categoricalSourceData);

    expect(parsed).toEqual({ ok: true, value: view, errors: [] });
    expect(serialized).toContain('"schemaVersion":"2.0.0"');
    expect(serialized).toContain('"chartType":"bar"');

    const session = createEditorSession(categoricalSourceData, { viewSpec: view });
    const clonedSession = createEditorSession(structuredClone(categoricalSourceData));
    expect(session.ok).toBe(true);
    expect(clonedSession.ok).toBe(true);
    if (session.ok && clonedSession.ok) {
      expect(session.value.sourceData).toBe(categoricalSourceData);
      expect(session.value.viewSpec).toBe(view);
      expect(session.value.sourceFingerprint).toMatch(/^fnv1a64:[0-9a-f]{16}$/);
      expect(clonedSession.value.sourceFingerprint).toBe(session.value.sourceFingerprint);
    }
  });
});
