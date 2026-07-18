import { describe, expect, it } from 'vitest';

import { createInitialViewSpec } from '../../src/domain/createInitialViewSpec';
import type { SourceData, SourceItem, ViewSpec } from '../../src/domain/model';
import { projectWaterfall } from '../../src/waterfall/projectWaterfall';

function sourceData(items: readonly SourceItem[], datasetId = 'anchor-tests'): SourceData {
  return {
    schemaVersion: '1.0.0',
    datasetId,
    items,
  };
}

function initialView(source: SourceData): ViewSpec {
  const result = createInitialViewSpec(source);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('Expected a valid anchor test fixture');
  }
  return result.value;
}

function projectionOf(source: SourceData, view = initialView(source)) {
  const result = projectWaterfall(source, view);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('Expected waterfall projection to succeed');
  }
  return result.value;
}

function advancePositiveUlps(value: number, count: number): number {
  const buffer = new ArrayBuffer(8);
  const dataView = new DataView(buffer);
  dataView.setFloat64(0, value, false);
  dataView.setBigUint64(0, dataView.getBigUint64(0, false) + BigInt(count), false);
  return dataView.getFloat64(0, false);
}

function advanceNegativeUlps(value: number, count: number): number {
  const buffer = new ArrayBuffer(8);
  const dataView = new DataView(buffer);
  dataView.setFloat64(0, value, false);
  dataView.setBigUint64(0, dataView.getBigUint64(0, false) + BigInt(count), false);
  return dataView.getFloat64(0, false);
}

describe('waterfall absolute anchors', () => {
  it('projects a single subtotal as an absolute anchor', () => {
    const source = sourceData([
      { id: 'start', label: 'Opening', amount: 100, kind: 'start' },
      { id: 'growth', label: 'Growth', amount: 20, kind: 'contribution' },
      { id: 'subtotal', label: 'Operating result', amount: 120, kind: 'subtotal' },
      { id: 'tax', label: 'Tax', amount: -10, kind: 'contribution' },
      { id: 'end', label: 'Closing', amount: 110, kind: 'end' },
    ]);

    expect(projectionOf(source)).toEqual([
      {
        nodeId: 'start',
        label: 'Opening',
        start: 0,
        end: 100,
        amount: 100,
        kind: 'start',
        sourceIds: ['start'],
        groupPath: [],
        depth: 0,
        locked: true,
        order: 0,
      },
      {
        nodeId: 'growth',
        label: 'Growth',
        start: 100,
        end: 120,
        amount: 20,
        kind: 'positive',
        sourceIds: ['growth'],
        groupPath: [],
        depth: 1,
        locked: false,
        order: 1,
      },
      {
        nodeId: 'subtotal',
        label: 'Operating result',
        start: 0,
        end: 120,
        amount: 120,
        kind: 'subtotal',
        sourceIds: ['subtotal'],
        groupPath: [],
        depth: 0,
        locked: true,
        order: 2,
      },
      {
        nodeId: 'tax',
        label: 'Tax',
        start: 120,
        end: 110,
        amount: -10,
        kind: 'negative',
        sourceIds: ['tax'],
        groupPath: [],
        depth: 1,
        locked: false,
        order: 3,
      },
      {
        nodeId: 'end',
        label: 'Closing',
        start: 0,
        end: 110,
        amount: 110,
        kind: 'end',
        sourceIds: ['end'],
        groupPath: [],
        depth: 0,
        locked: true,
        order: 4,
      },
    ]);
  });

  it('supports multiple and consecutive subtotals, including empty segments', () => {
    const source = sourceData([
      { id: 'start', label: 'Opening', amount: 10, kind: 'start' },
      { id: 'increase', label: 'Increase', amount: 2, kind: 'contribution' },
      { id: 'subtotal-a', label: 'Subtotal A', amount: 12, kind: 'subtotal' },
      { id: 'subtotal-empty', label: 'Empty segment', amount: 12, kind: 'subtotal' },
      { id: 'decrease', label: 'Decrease', amount: -2, kind: 'contribution' },
      { id: 'subtotal-b', label: 'Subtotal B', amount: 10, kind: 'subtotal' },
      { id: 'end', label: 'Closing', amount: 10, kind: 'end' },
    ]);

    const projection = projectionOf(source);

    expect(projection.map(datum => datum.nodeId)).toEqual([
      'start',
      'increase',
      'subtotal-a',
      'subtotal-empty',
      'decrease',
      'subtotal-b',
      'end',
    ]);
    expect(
      projection
        .filter(datum => datum.kind === 'subtotal')
        .map(datum => ({ start: datum.start, end: datum.end, amount: datum.amount })),
    ).toEqual([
      { start: 0, end: 12, amount: 12 },
      { start: 0, end: 12, amount: 12 },
      { start: 0, end: 10, amount: 10 },
    ]);
    expect(projection.find(datum => datum.nodeId === 'decrease')).toMatchObject({
      start: 12,
      end: 10,
    });
  });

  it('accepts 0.1 + 0.2 within 8 ULP and resets accumulation to the declared subtotal', () => {
    const source = sourceData([
      { id: 'start', label: 'Opening', amount: 0, kind: 'start' },
      { id: 'first', label: 'First', amount: 0.1, kind: 'contribution' },
      { id: 'second', label: 'Second', amount: 0.2, kind: 'contribution' },
      { id: 'subtotal', label: 'Declared subtotal', amount: 0.3, kind: 'subtotal' },
      { id: 'after', label: 'After subtotal', amount: 0.1, kind: 'contribution' },
      { id: 'end', label: 'Closing', amount: 0.4, kind: 'end' },
    ]);

    const projection = projectionOf(source);

    expect(projection.find(datum => datum.nodeId === 'subtotal')).toMatchObject({
      start: 0,
      end: 0.3,
      amount: 0.3,
    });
    expect(projection.find(datum => datum.nodeId === 'after')).toMatchObject({
      start: 0.3,
      end: 0.4,
    });
    expect(projection.at(-1)).toMatchObject({ nodeId: 'end', end: 0.4 });
  });

  it('uses compensated summation for large cancellation without exceeding the safe range', () => {
    const source = sourceData([
      { id: 'start', label: 'Opening', amount: 0, kind: 'start' },
      {
        id: 'large-positive',
        label: 'Large positive',
        amount: 9_000_000_000_000_000,
        kind: 'contribution',
      },
      { id: 'small', label: 'Small retained amount', amount: 0.5, kind: 'contribution' },
      {
        id: 'large-negative',
        label: 'Large negative',
        amount: -9_000_000_000_000_000,
        kind: 'contribution',
      },
      { id: 'end', label: 'Closing', amount: 0.5, kind: 'end' },
    ]);

    const projection = projectionOf(source);

    expect(projection.at(-2)).toMatchObject({ nodeId: 'large-negative', end: 0.5 });
    expect(projection.at(-1)).toMatchObject({ nodeId: 'end', end: 0.5 });
  });

  it('accepts exactly 8 ULP of anchor representation error and rejects more than 8 ULP', () => {
    const withinTolerance = advancePositiveUlps(1, 8);
    const outsideTolerance = advancePositiveUlps(1, 9);
    const sourceWithinTolerance = sourceData(
      [
        { id: 'start', label: 'Opening', amount: 0, kind: 'start' },
        { id: 'change', label: 'Change', amount: 1, kind: 'contribution' },
        { id: 'end', label: 'Closing', amount: withinTolerance, kind: 'end' },
      ],
      'ulp-within',
    );
    const sourceOutsideTolerance = sourceData(
      [
        { id: 'start', label: 'Opening', amount: 0, kind: 'start' },
        { id: 'change', label: 'Change', amount: 1, kind: 'contribution' },
        { id: 'end', label: 'Closing', amount: outsideTolerance, kind: 'end' },
      ],
      'ulp-outside',
    );

    expect(projectWaterfall(sourceWithinTolerance, initialView(sourceWithinTolerance)).ok).toBe(
      true,
    );

    const rejected = projectWaterfall(sourceOutsideTolerance, initialView(sourceOutsideTolerance));
    expect(rejected).toEqual({
      ok: false,
      errors: [
        {
          code: 'INVALID_SOURCE_DATA',
          reason: 'INVALID_ANCHOR',
          message: 'Source anchors are invalid.',
          path: '/items/2/amount',
          details: { anchor: 'end', sourceIndex: 2 },
        },
      ],
    });
    expect(rejected).not.toHaveProperty('value');
  });

  it('applies the same ULP boundary to negative anchors', () => {
    const withinTolerance = advanceNegativeUlps(-1, 8);
    const outsideTolerance = advanceNegativeUlps(-1, 9);
    const createNegativeSource = (amount: number, datasetId: string): SourceData =>
      sourceData(
        [
          { id: 'start', label: 'Opening', amount: 0, kind: 'start' },
          { id: 'change', label: 'Change', amount: -1, kind: 'contribution' },
          { id: 'end', label: 'Closing', amount, kind: 'end' },
        ],
        datasetId,
      );
    const accepted = createNegativeSource(withinTolerance, 'negative-ulp-within');
    const rejected = createNegativeSource(outsideTolerance, 'negative-ulp-outside');

    expect(projectWaterfall(accepted, initialView(accepted)).ok).toBe(true);
    expect(projectWaterfall(rejected, initialView(rejected))).toMatchObject({
      ok: false,
      errors: [{ reason: 'INVALID_ANCHOR', details: { anchor: 'end', sourceIndex: 2 } }],
    });
  });
});

describe('waterfall anchor and numeric failures', () => {
  it.each([
    {
      name: 'subtotal',
      source: sourceData(
        [
          { id: 'start', label: 'Opening secret', amount: 5, kind: 'start' },
          {
            id: 'contribution',
            label: 'Contribution secret',
            amount: 2,
            kind: 'contribution',
            sourceRef: 'private-ledger-reference',
          },
          {
            id: 'subtotal',
            label: 'Subtotal secret',
            amount: 123_456.789,
            kind: 'subtotal',
          },
          { id: 'end', label: 'Closing', amount: 7, kind: 'end' },
        ],
        'invalid-subtotal',
      ),
      sourceIndex: 2,
      privateAmount: '123456.789',
      privateLabel: 'Subtotal secret',
    },
    {
      name: 'end',
      source: sourceData(
        [
          { id: 'start', label: 'Opening secret', amount: 5, kind: 'start' },
          {
            id: 'contribution',
            label: 'Contribution secret',
            amount: 2,
            kind: 'contribution',
            sourceRef: 'private-ledger-reference',
          },
          { id: 'end', label: 'Closing secret', amount: 987_654.321, kind: 'end' },
        ],
        'invalid-end',
      ),
      sourceIndex: 2,
      privateAmount: '987654.321',
      privateLabel: 'Closing secret',
    },
  ])('rejects a mismatched $name anchor without leaking financial values', testCase => {
    const result = projectWaterfall(testCase.source, initialView(testCase.source));

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: 'INVALID_SOURCE_DATA',
          reason: 'INVALID_ANCHOR',
          message: 'Source anchors are invalid.',
          path: `/items/${testCase.sourceIndex}/amount`,
          details: { anchor: testCase.name, sourceIndex: testCase.sourceIndex },
        },
      ],
    });
    expect(result).not.toHaveProperty('value');

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(testCase.privateAmount);
    expect(serialized).not.toContain(testCase.privateLabel);
    expect(serialized).not.toContain('private-ledger-reference');
  });

  it('rejects an unsafe current accumulation with a structured, value-free error', () => {
    const source = sourceData(
      [
        {
          id: 'start',
          label: 'Private opening',
          amount: Number.MAX_SAFE_INTEGER,
          kind: 'start',
        },
        { id: 'overflow', label: 'Private overflow', amount: 1, kind: 'contribution' },
        {
          id: 'end',
          label: 'Private closing',
          amount: Number.MAX_SAFE_INTEGER,
          kind: 'end',
        },
      ],
      'unsafe-current',
    );

    const result = projectWaterfall(source, initialView(source));

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: 'INVALID_SOURCE_DATA',
          reason: 'UNSAFE_AMOUNT',
          message: 'Amount exceeds the supported numeric range.',
          path: '/items/1/amount',
          details: { operation: 'accumulate', sourceIndex: 1 },
        },
      ],
    });
    expect(result).not.toHaveProperty('value');
    expect(JSON.stringify(result)).not.toContain('Private');
  });

  it('rejects an unsafe collapsed-group aggregate before returning projection data', () => {
    const source = sourceData(
      [
        { id: 'start', label: 'Opening', amount: 0, kind: 'start' },
        {
          id: 'large',
          label: 'Private large amount',
          amount: Number.MAX_SAFE_INTEGER,
          kind: 'contribution',
        },
        { id: 'overflow', label: 'Private overflow', amount: 1, kind: 'contribution' },
        { id: 'end', label: 'Closing', amount: 0, kind: 'end' },
      ],
      'unsafe-group',
    );
    const view: ViewSpec = {
      ...initialView(source),
      rootOrder: ['overflow-group'],
      groups: {
        'overflow-group': {
          id: 'overflow-group',
          label: 'Private group',
          childIds: ['large', 'overflow'],
        },
      },
      collapsedGroupIds: ['overflow-group'],
    };

    const result = projectWaterfall(source, view);

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: 'INVALID_SOURCE_DATA',
          reason: 'UNSAFE_AMOUNT',
          message: 'Amount exceeds the supported numeric range.',
          path: '/items/2/amount',
          details: { operation: 'groupAggregate', sourceIndex: 2 },
        },
      ],
    });
    expect(result).not.toHaveProperty('value');
    expect(JSON.stringify(result)).not.toContain('Private');
  });
});
