import { describe, expect, it } from 'vitest';

import {
  createInitialViewSpec,
  projectCategoricalComparison,
  validateSourceData,
  type CategoricalComparisonSourceData,
  type CategoricalComparisonViewSpec,
  type CategoricalSourceData,
  type CurrentViewSpec,
  type SourceData,
} from '../../src';

const comparisonSource = {
  schemaVersion: '3.0.0',
  dataKind: 'categorical',
  datasetId: 'comparison-projection',
  series: [
    { id: 'actual', label: 'Actual' },
    { id: 'budget', label: 'Budget' },
    { id: 'forecast', label: 'Forecast' },
  ],
  items: [
    {
      id: 'north',
      label: 'North',
      values: [
        { seriesId: 'actual', amount: 10 },
        { seriesId: 'budget', amount: 20 },
        { seriesId: 'forecast', amount: -5 },
      ],
    },
    {
      id: 'south',
      label: 'South',
      values: [
        { seriesId: 'actual', amount: -4 },
        { seriesId: 'budget', amount: 3 },
        { seriesId: 'forecast', amount: 7 },
      ],
    },
    {
      id: 'zero',
      label: 'Zero',
      values: [
        { seriesId: 'actual', amount: -0 },
        { seriesId: 'budget', amount: 0 },
        { seriesId: 'forecast', amount: -0 },
      ],
    },
    {
      id: 'tail',
      label: 'Tail',
      values: [
        { seriesId: 'actual', amount: 1 },
        { seriesId: 'budget', amount: 2 },
        { seriesId: 'forecast', amount: 3 },
      ],
    },
  ],
} as const satisfies CategoricalComparisonSourceData;

function initialView(
  source: CategoricalComparisonSourceData = comparisonSource,
): CategoricalComparisonViewSpec {
  const result = createInitialViewSpec(source);
  if (!result.ok || result.value.schemaVersion !== '3.0.0') {
    throw new Error('Expected a comparison view');
  }
  return result.value;
}

function recursiveView(
  collapsedGroupIds: readonly ('inner' | 'outer')[],
): CategoricalComparisonViewSpec {
  return {
    ...initialView(),
    rootOrder: ['outer', 'tail'],
    groups: {
      inner: { id: 'inner', label: 'Inner', childIds: ['north', 'south'] },
      outer: { id: 'outer', label: 'Outer', childIds: ['inner', 'zero'] },
    },
    collapsedGroupIds,
    pinnedItemIds: ['south'],
  };
}

describe('projectCategoricalComparison', () => {
  it('projects category-major values in declared series order and canonicalizes signed zero', () => {
    const result = projectCategoricalComparison(comparisonSource, initialView());

    expect(result).toEqual({
      ok: true,
      value: [
        {
          nodeId: 'north',
          label: 'North',
          values: [
            { seriesId: 'actual', label: 'Actual', amount: 10 },
            { seriesId: 'budget', label: 'Budget', amount: 20 },
            { seriesId: 'forecast', label: 'Forecast', amount: -5 },
          ],
          kind: 'category',
          sourceIds: ['north'],
          locked: false,
          order: 0,
        },
        {
          nodeId: 'south',
          label: 'South',
          values: [
            { seriesId: 'actual', label: 'Actual', amount: -4 },
            { seriesId: 'budget', label: 'Budget', amount: 3 },
            { seriesId: 'forecast', label: 'Forecast', amount: 7 },
          ],
          kind: 'category',
          sourceIds: ['south'],
          locked: false,
          order: 1,
        },
        {
          nodeId: 'zero',
          label: 'Zero',
          values: [
            { seriesId: 'actual', label: 'Actual', amount: 0 },
            { seriesId: 'budget', label: 'Budget', amount: 0 },
            { seriesId: 'forecast', label: 'Forecast', amount: 0 },
          ],
          kind: 'category',
          sourceIds: ['zero'],
          locked: false,
          order: 2,
        },
        {
          nodeId: 'tail',
          label: 'Tail',
          values: [
            { seriesId: 'actual', label: 'Actual', amount: 1 },
            { seriesId: 'budget', label: 'Budget', amount: 2 },
            { seriesId: 'forecast', label: 'Forecast', amount: 3 },
          ],
          kind: 'category',
          sourceIds: ['tail'],
          locked: false,
          order: 3,
        },
      ],
      errors: [],
    });
    if (!result.ok) {
      throw new Error('Expected a comparison projection');
    }
    expect(result.value[2]?.values.every(value => Object.is(value.amount, 0))).toBe(true);
    expect(result.value).not.toBe(comparisonSource.items);
    expect(Object.is(comparisonSource.items[2]?.values[0]?.amount, -0)).toBe(true);
    expect(Object.is(comparisonSource.items[2]?.values[2]?.amount, -0)).toBe(true);
  });

  it('projects empty sources and expanded or collapsed recursive groups deterministically', () => {
    const emptySource = {
      ...comparisonSource,
      datasetId: 'empty-comparison-projection',
      items: [],
    } as const satisfies CategoricalComparisonSourceData;
    expect(projectCategoricalComparison(emptySource, initialView(emptySource))).toEqual({
      ok: true,
      value: [],
      errors: [],
    });

    expect(projectCategoricalComparison(comparisonSource, recursiveView(['inner']))).toEqual({
      ok: true,
      value: [
        {
          nodeId: 'inner',
          label: 'Inner',
          values: [
            { seriesId: 'actual', label: 'Actual', amount: 6 },
            { seriesId: 'budget', label: 'Budget', amount: 23 },
            { seriesId: 'forecast', label: 'Forecast', amount: 2 },
          ],
          kind: 'group',
          sourceIds: ['north', 'south'],
          locked: true,
          order: 0,
        },
        {
          nodeId: 'zero',
          label: 'Zero',
          values: [
            { seriesId: 'actual', label: 'Actual', amount: 0 },
            { seriesId: 'budget', label: 'Budget', amount: 0 },
            { seriesId: 'forecast', label: 'Forecast', amount: 0 },
          ],
          kind: 'category',
          sourceIds: ['zero'],
          locked: false,
          order: 1,
        },
        {
          nodeId: 'tail',
          label: 'Tail',
          values: [
            { seriesId: 'actual', label: 'Actual', amount: 1 },
            { seriesId: 'budget', label: 'Budget', amount: 2 },
            { seriesId: 'forecast', label: 'Forecast', amount: 3 },
          ],
          kind: 'category',
          sourceIds: ['tail'],
          locked: false,
          order: 2,
        },
      ],
      errors: [],
    });

    const first = projectCategoricalComparison(comparisonSource, recursiveView(['outer']));
    const second = projectCategoricalComparison(comparisonSource, recursiveView(['outer']));
    expect(first).toEqual(second);
    expect(first).toEqual({
      ok: true,
      value: [
        {
          nodeId: 'outer',
          label: 'Outer',
          values: [
            { seriesId: 'actual', label: 'Actual', amount: 6 },
            { seriesId: 'budget', label: 'Budget', amount: 23 },
            { seriesId: 'forecast', label: 'Forecast', amount: 2 },
          ],
          kind: 'group',
          sourceIds: ['north', 'south', 'zero'],
          locked: true,
          order: 0,
        },
        {
          nodeId: 'tail',
          label: 'Tail',
          values: [
            { seriesId: 'actual', label: 'Actual', amount: 1 },
            { seriesId: 'budget', label: 'Budget', amount: 2 },
            { seriesId: 'forecast', label: 'Forecast', amount: 3 },
          ],
          kind: 'category',
          sourceIds: ['tail'],
          locked: false,
          order: 1,
        },
      ],
      errors: [],
    });
  });

  it('uses one independent compensated accumulator per series', () => {
    const source = {
      schemaVersion: '3.0.0',
      dataKind: 'categorical',
      datasetId: 'comparison-compensation',
      series: [
        { id: 'first', label: 'First' },
        { id: 'second', label: 'Second' },
      ],
      items: [
        {
          id: 'large-positive',
          label: 'Large positive',
          values: [
            { seriesId: 'first', amount: 1_000_000_000_000_000 },
            { seriesId: 'second', amount: -1_000_000_000_000_000 },
          ],
        },
        {
          id: 'small',
          label: 'Small',
          values: [
            { seriesId: 'first', amount: 0.1 },
            { seriesId: 'second', amount: 0.2 },
          ],
        },
        {
          id: 'large-negative',
          label: 'Large negative',
          values: [
            { seriesId: 'first', amount: -1_000_000_000_000_000 },
            { seriesId: 'second', amount: 1_000_000_000_000_000 },
          ],
        },
      ],
    } as const satisfies CategoricalComparisonSourceData;
    const view: CategoricalComparisonViewSpec = {
      ...initialView(source),
      rootOrder: ['all'],
      groups: {
        all: {
          id: 'all',
          label: 'All',
          childIds: ['large-positive', 'small', 'large-negative'],
        },
      },
      collapsedGroupIds: ['all'],
    };

    const result = projectCategoricalComparison(source, view);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0]?.values.map(value => value.amount)).toEqual([0.1, 0.2]);
      expect(result.value[0]).not.toHaveProperty('amount');
    }
  });

  it('fails atomically at the triggering source value when one series becomes unsafe', () => {
    const source = {
      schemaVersion: '3.0.0',
      dataKind: 'categorical',
      datasetId: 'comparison-overflow',
      series: [
        { id: 'safe', label: 'Safe' },
        { id: 'unsafe', label: 'Unsafe' },
      ],
      items: [
        {
          id: 'maximum',
          label: 'Maximum',
          values: [
            { seriesId: 'safe', amount: 1 },
            { seriesId: 'unsafe', amount: Number.MAX_SAFE_INTEGER },
          ],
        },
        {
          id: 'overflow',
          label: 'Overflow',
          values: [
            { seriesId: 'safe', amount: 2 },
            { seriesId: 'unsafe', amount: 1 },
          ],
        },
        {
          id: 'tail',
          label: 'Tail',
          values: [
            { seriesId: 'safe', amount: 3 },
            { seriesId: 'unsafe', amount: 4 },
          ],
        },
      ],
    } as const satisfies CategoricalComparisonSourceData;
    const view: CategoricalComparisonViewSpec = {
      ...initialView(source),
      rootOrder: ['unsafe-group', 'tail'],
      groups: {
        'unsafe-group': {
          id: 'unsafe-group',
          label: 'Unsafe group',
          childIds: ['maximum', 'overflow'],
        },
      },
      collapsedGroupIds: ['unsafe-group'],
    };

    const result = projectCategoricalComparison(source, view);
    expect(result).toEqual({
      ok: false,
      errors: [
        expect.objectContaining({
          code: 'INVALID_SOURCE_DATA',
          reason: 'UNSAFE_AMOUNT',
          path: '/items/1/values/1/amount',
          details: { operation: 'groupAggregate', sourceIndex: 1, seriesIndex: 1 },
        }),
      ],
    });
    expect(result).not.toHaveProperty('value');
    expect(JSON.stringify(result)).not.toContain('Maximum');
    expect(JSON.stringify(result)).not.toContain(String(Number.MAX_SAFE_INTEGER));
  });

  it('preserves validation precedence across v2/v3 source-view pairings', () => {
    const scalarSource = {
      schemaVersion: '2.0.0',
      dataKind: 'categorical',
      datasetId: comparisonSource.datasetId,
      items: comparisonSource.items.map(item => ({
        id: item.id,
        label: item.label,
        amount: item.values[0]?.amount ?? 0,
      })),
    } as const satisfies CategoricalSourceData;
    const scalarViewResult = createInitialViewSpec(scalarSource);
    if (!scalarViewResult.ok || scalarViewResult.value.schemaVersion !== '2.0.0') {
      throw new Error('Expected a scalar categorical view');
    }
    const scalarView: CurrentViewSpec = scalarViewResult.value;
    const comparisonView = initialView();

    expect(projectCategoricalComparison(comparisonSource, comparisonView).ok).toBe(true);
    expect(projectCategoricalComparison(scalarSource, scalarView)).toMatchObject({
      ok: false,
      errors: [
        expect.objectContaining({
          code: 'SOURCE_CONFLICT',
          reason: 'INCOMPATIBLE_PROJECTOR_GENERATION',
          path: '/schemaVersion',
        }),
      ],
    });
    expect(projectCategoricalComparison(scalarSource, comparisonView)).toMatchObject({
      ok: false,
      errors: [
        expect.objectContaining({
          code: 'SOURCE_CONFLICT',
          reason: 'SCHEMA_VERSION_MISMATCH',
          path: '/schemaVersion',
        }),
      ],
    });
    expect(projectCategoricalComparison(comparisonSource, scalarView)).toMatchObject({
      ok: false,
      errors: [
        expect.objectContaining({
          code: 'SOURCE_CONFLICT',
          reason: 'SCHEMA_VERSION_MISMATCH',
          path: '/schemaVersion',
        }),
      ],
    });

    const invalidSource = {
      ...comparisonSource,
      series: [comparisonSource.series[0]],
    } as unknown as SourceData;
    const invalidResult = projectCategoricalComparison(invalidSource, comparisonView);
    expect(invalidResult.ok).toBe(false);
    if (!invalidResult.ok) {
      expect(invalidResult.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'INVALID_SOURCE_DATA',
            reason: 'INVALID_SERIES_COUNT',
            path: '/series',
          }),
        ]),
      );
    }
  });

  it('projects only descriptor-snapshotted source values when root reads disagree with validation', () => {
    const poisonedItems = comparisonSource.items.map((item, itemIndex) => ({
      ...item,
      values: item.values.map((value, seriesIndex) => ({
        ...value,
        amount: itemIndex === 0 && seriesIndex === 0 ? Number.NaN : value.amount,
      })),
    }));
    const rootProxy = new Proxy(comparisonSource, {
      get(target, property) {
        if (property === 'items') {
          return poisonedItems;
        }
        return Reflect.get(target, property);
      },
    }) as CategoricalComparisonSourceData;

    const result = projectCategoricalComparison(rootProxy, initialView());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0]?.values[0]?.amount).toBe(10);
      expect(
        result.value.every(datum => datum.values.every(value => Number.isFinite(value.amount))),
      ).toBe(true);
    }
  });

  it('projects only descriptor-validated values from nested source proxies', () => {
    const firstItem = comparisonSource.items[0];
    let valuesReadCount = 0;
    const nestedProxy = new Proxy(firstItem, {
      get(target, property, receiver) {
        if (property === 'values') {
          valuesReadCount += 1;
          if (valuesReadCount === 1) {
            return target.values;
          }
          return target.values.map((value, index) => ({
            ...value,
            amount: index === 0 ? Number.POSITIVE_INFINITY : value.amount,
          }));
        }
        return Reflect.get(target, property, receiver);
      },
    });
    const nestedSource = {
      ...comparisonSource,
      items: [nestedProxy, ...comparisonSource.items.slice(1)],
    } as CategoricalComparisonSourceData;
    const view = initialView();

    const result = projectCategoricalComparison(nestedSource, view);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0]?.values[0]?.amount).toBe(10);
      expect(
        result.value.every(datum => datum.values.every(value => Number.isFinite(value.amount))),
      ).toBe(true);
    }
  });

  it('projects only a descriptor-snapshotted view when ordinary reads are hostile', () => {
    const validView = recursiveView(['outer']);
    const viewProxy = new Proxy(validView, {
      get(target, property) {
        if (property === 'rootOrder') {
          return ['missing'];
        }
        if (property === 'groups') {
          return {};
        }
        if (property === 'pinnedItemIds') {
          return ['missing'];
        }
        return Reflect.get(target, property);
      },
    }) as CategoricalComparisonViewSpec;

    const result = projectCategoricalComparison(comparisonSource, viewProxy);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.map(datum => datum.nodeId)).toEqual(['outer', 'tail']);
      expect(result.value[0]?.locked).toBe(true);
      expect(
        result.value.every(datum => datum.values.every(value => Number.isFinite(value.amount))),
      ).toBe(true);
    }
  });

  it('fails closed when snapshotted source descriptors are invalid', () => {
    const firstValue = comparisonSource.items[0].values[0];
    const descriptorProxy = new Proxy(firstValue, {
      getOwnPropertyDescriptor(target, property) {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, property);
        if (property === 'amount' && descriptor !== undefined && 'value' in descriptor) {
          return { ...descriptor, value: Number.NaN };
        }
        return descriptor;
      },
    });
    const source = {
      ...comparisonSource,
      items: [
        {
          ...comparisonSource.items[0],
          values: [descriptorProxy, ...comparisonSource.items[0].values.slice(1)],
        },
        ...comparisonSource.items.slice(1),
      ],
    } as CategoricalComparisonSourceData;

    const result = projectCategoricalComparison(source, initialView());

    expect(result).toMatchObject({
      ok: false,
      errors: [
        expect.objectContaining({
          code: 'INVALID_SOURCE_DATA',
          reason: 'NON_FINITE_AMOUNT',
          path: '/items/0/values/0/amount',
        }),
      ],
    });
    expect(result).not.toHaveProperty('value');
  });

  it('does not throw or expose hostile source or view details', () => {
    const hostile = new Proxy(
      {},
      {
        getOwnPropertyDescriptor() {
          throw new Error('private comparison value');
        },
      },
    ) as SourceData;

    const result = projectCategoricalComparison(hostile, initialView());
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain('private comparison value');

    const hostileView = new Proxy(initialView(), {
      getOwnPropertyDescriptor() {
        throw new Error('private comparison view');
      },
    });
    const viewResult = projectCategoricalComparison(comparisonSource, hostileView);
    expect(viewResult.ok).toBe(false);
    expect(JSON.stringify(viewResult)).not.toContain('private comparison view');
  });

  it('contains stateful descriptor traps reached after the compatibility pass', () => {
    const validView = initialView();
    let throwLateSourceTrap = false;
    const statefulSource = new Proxy(comparisonSource, {
      getOwnPropertyDescriptor(target, property) {
        if (throwLateSourceTrap) {
          throw new Error('private late source trap');
        }
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
    }) as CategoricalComparisonSourceData;
    const statefulView = new Proxy(validView, {
      getOwnPropertyDescriptor(target, property) {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, property);
        if (property === 'emphasis') {
          throwLateSourceTrap = true;
        }
        return descriptor;
      },
    }) as CategoricalComparisonViewSpec;

    let sourceResult: ReturnType<typeof projectCategoricalComparison> | undefined;
    expect(() => {
      sourceResult = projectCategoricalComparison(statefulSource, statefulView);
    }).not.toThrow();
    expect(sourceResult).toMatchObject({
      ok: false,
      errors: [
        expect.objectContaining({
          reason: 'UNREADABLE_INPUT',
          path: '/',
        }),
      ],
    });
    expect(JSON.stringify(sourceResult)).not.toContain('private late source trap');
  });

  it('classifies snapshot-only source reflection traps as unreadable source data', () => {
    const validView = initialView();
    let afterCompatibility = false;
    const statefulSource = new Proxy(comparisonSource, {
      ownKeys(target) {
        return Reflect.ownKeys(target);
      },
      getOwnPropertyDescriptor(target, property) {
        if (afterCompatibility) {
          throw new Error('private snapshot source trap');
        }
        return Reflect.getOwnPropertyDescriptor(target, property);
      },
    }) as CategoricalComparisonSourceData;
    const phaseView = new Proxy(validView, {
      ownKeys(target) {
        afterCompatibility = true;
        return Reflect.ownKeys(target);
      },
    }) as CategoricalComparisonViewSpec;

    const result = projectCategoricalComparison(statefulSource, phaseView);

    expect(result).toMatchObject({
      ok: false,
      errors: [
        expect.objectContaining({
          code: 'INVALID_SOURCE_DATA',
          reason: 'UNREADABLE_INPUT',
          path: '/',
        }),
      ],
    });
    expect(JSON.stringify(result)).not.toContain('private snapshot source trap');
  });

  it('covers comparison validation failures for malformed matrix records', () => {
    const malformedCases: readonly SourceData[] = [
      { ...comparisonSource, series: undefined } as unknown as SourceData,
      { ...comparisonSource, series: [null, comparisonSource.series[1]] } as unknown as SourceData,
      {
        ...comparisonSource,
        series: [{ id: 1, label: 'Actual' }, comparisonSource.series[1]],
      } as unknown as SourceData,
      {
        ...comparisonSource,
        series: [{ id: '', label: 'Actual' }, comparisonSource.series[1]],
      } as SourceData,
      {
        ...comparisonSource,
        series: [{ id: 'actual', label: 1 }, comparisonSource.series[1]],
      } as unknown as SourceData,
      {
        ...comparisonSource,
        series: [{ id: 'actual', label: '' }, comparisonSource.series[1]],
      } as SourceData,
      { ...comparisonSource, items: [null, ...comparisonSource.items.slice(1)] } as SourceData,
      {
        ...comparisonSource,
        items: [{ ...comparisonSource.items[0], id: 1 }, comparisonSource.items[1]],
      } as unknown as SourceData,
      {
        ...comparisonSource,
        items: [{ ...comparisonSource.items[0], id: '' }, comparisonSource.items[1]],
      } as SourceData,
      {
        ...comparisonSource,
        items: [comparisonSource.items[0], { ...comparisonSource.items[1], id: 'north' }],
      } as SourceData,
      {
        ...comparisonSource,
        items: [{ ...comparisonSource.items[0], label: 1 }, comparisonSource.items[1]],
      } as unknown as SourceData,
      {
        ...comparisonSource,
        items: [{ ...comparisonSource.items[0], label: '' }, comparisonSource.items[1]],
      } as SourceData,
      {
        ...comparisonSource,
        items: [{ ...comparisonSource.items[0], sourceRef: 1 }, comparisonSource.items[1]],
      } as unknown as SourceData,
      {
        ...comparisonSource,
        items: [
          {
            ...comparisonSource.items[0],
            values: [null, ...comparisonSource.items[0].values.slice(1)],
          },
          comparisonSource.items[1],
        ],
      } as SourceData,
      {
        ...comparisonSource,
        items: [
          {
            ...comparisonSource.items[0],
            values: [
              { ...comparisonSource.items[0].values[0], seriesId: 1 },
              ...comparisonSource.items[0].values.slice(1),
            ],
          },
          comparisonSource.items[1],
        ],
      } as unknown as SourceData,
      {
        ...comparisonSource,
        items: [
          {
            ...comparisonSource.items[0],
            values: [
              { ...comparisonSource.items[0].values[0], seriesId: '' },
              ...comparisonSource.items[0].values.slice(1),
            ],
          },
          comparisonSource.items[1],
        ],
      } as SourceData,
      {
        ...comparisonSource,
        items: [
          {
            ...comparisonSource.items[0],
            values: [
              { ...comparisonSource.items[0].values[0], amount: Number.MAX_SAFE_INTEGER + 1 },
              ...comparisonSource.items[0].values.slice(1),
            ],
          },
          comparisonSource.items[1],
        ],
      } as SourceData,
      {
        ...comparisonSource,
        items: [
          {
            ...comparisonSource.items[0],
            values: [
              { ...comparisonSource.items[0].values[0], sourceRef: 1 },
              ...comparisonSource.items[0].values.slice(1),
            ],
          },
          comparisonSource.items[1],
        ],
      } as unknown as SourceData,
    ];

    for (const source of malformedCases) {
      expect(validateSourceData(source).ok).toBe(false);
    }
  });
});
