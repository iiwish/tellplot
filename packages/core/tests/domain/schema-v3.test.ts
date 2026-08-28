import { describe, expect, it } from 'vitest';

import {
  cloneViewSpec,
  createEditorSession,
  createInitialViewSpec,
  evaluateGroupSelection,
  executeCommand,
  parseViewSpec,
  projectCategorical,
  projectWaterfall,
  redoSession,
  serializeViewSpec,
  undoSession,
  validateSourceData,
  validateViewSpec,
  type CategoricalComparisonSourceData,
  type CategoricalComparisonViewSpec,
  type CategoricalSourceData,
  type ComparisonSchemaVersion,
  type CurrentViewSpec,
  type EditorSession,
  type LegacyWaterfallSourceData,
  type PinItemCommand,
  type ValidationResult,
} from '../../src';

type UnknownRecord = Record<string, unknown>;

const comparisonSchemaVersion: ComparisonSchemaVersion = '3.0.0';

const comparisonSource = {
  schemaVersion: comparisonSchemaVersion,
  dataKind: 'categorical',
  datasetId: 'comparison-fixture',
  currency: 'CNY',
  series: [
    { id: 'actual', label: 'Actual', metadata: { ordinal: 0 } },
    { id: 'budget', label: 'Budget', metadata: { ordinal: 1 } },
  ],
  items: [
    {
      id: 'revenue',
      label: 'Revenue',
      sourceRef: 'ledger:revenue',
      metadata: { visible: true },
      values: [
        { seriesId: 'actual', amount: 120, metadata: { audited: true } },
        { seriesId: 'budget', amount: 100, sourceRef: 'plan:revenue' },
      ],
    },
    {
      id: 'cost',
      label: 'Cost',
      values: [
        { seriesId: 'actual', amount: -80 },
        { seriesId: 'budget', amount: -75 },
      ],
    },
  ],
} as const satisfies CategoricalComparisonSourceData;

const emptyComparisonSource = {
  ...comparisonSource,
  datasetId: 'empty-comparison-fixture',
  items: [],
} as const satisfies CategoricalComparisonSourceData;

const scalarSource = {
  schemaVersion: '2.0.0',
  dataKind: 'categorical',
  datasetId: comparisonSource.datasetId,
  items: [
    { id: 'revenue', label: 'Revenue', amount: 120 },
    { id: 'cost', label: 'Cost', amount: -80 },
  ],
} as const satisfies CategoricalSourceData;

const fourSeriesSource = {
  schemaVersion: '3.0.0',
  dataKind: 'categorical',
  datasetId: 'four-series-fixture',
  series: [
    { id: 'actual', label: 'Actual' },
    { id: 'budget', label: 'Budget' },
    { id: 'prior', label: 'Prior' },
    { id: 'forecast', label: 'Forecast' },
  ],
  items: [
    {
      id: 'revenue',
      label: 'Revenue',
      values: [
        { seriesId: 'actual', amount: 1 },
        { seriesId: 'budget', amount: 2 },
        { seriesId: 'prior', amount: 3 },
        { seriesId: 'forecast', amount: 4 },
      ],
    },
  ],
} as const satisfies CategoricalComparisonSourceData;

function expectIssue<T>(
  result: ValidationResult<T>,
  expected: {
    readonly code: string;
    readonly reason: string;
    readonly path: string;
    readonly message?: string;
    readonly details?: Readonly<Record<string, string | number | boolean | null>>;
  },
): void {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error('Expected validation failure');
  }
  expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining(expected)]));
}

function initialView(
  source: CategoricalComparisonSourceData = comparisonSource,
): CategoricalComparisonViewSpec {
  const result = createInitialViewSpec(source);
  if (!result.ok || result.value.schemaVersion !== '3.0.0') {
    throw new Error('Expected a valid comparison view');
  }
  return result.value;
}

function scalarView(): CurrentViewSpec {
  const result = createInitialViewSpec(scalarSource);
  if (!result.ok || result.value.schemaVersion !== '2.0.0') {
    throw new Error('Expected a valid scalar categorical view');
  }
  return result.value;
}

describe('schema 3.0.0 comparison source', () => {
  it('accepts valid and empty dense comparison inputs without cloning', () => {
    expect(validateSourceData(comparisonSource)).toEqual({
      ok: true,
      value: comparisonSource,
      errors: [],
    });
    expect(validateSourceData(emptyComparisonSource)).toEqual({
      ok: true,
      value: emptyComparisonSource,
      errors: [],
    });
    expect(validateSourceData(fourSeriesSource)).toEqual({
      ok: true,
      value: fourSeriesSource,
      errors: [],
    });

    const sharedNamespace = {
      ...comparisonSource,
      items: [{ ...comparisonSource.items[0], id: 'actual' }],
    } as const satisfies CategoricalComparisonSourceData;
    expect(validateSourceData(sharedNamespace)).toEqual({
      ok: true,
      value: sharedNamespace,
      errors: [],
    });
  });

  it('validates the closed series registry and dense matrix with exact public issues', () => {
    expectIssue(validateSourceData({ ...comparisonSource, series: [comparisonSource.series[0]] }), {
      code: 'INVALID_SOURCE_DATA',
      reason: 'INVALID_SERIES_COUNT',
      path: '/series',
      message: 'Series count must be between two and four.',
      details: { minimum: 2, maximum: 4, actualCount: 1 },
    });

    expectIssue(
      validateSourceData({
        ...comparisonSource,
        series: [comparisonSource.series[0], { id: 'actual', label: 'Forecast' }],
      }),
      {
        code: 'INVALID_SOURCE_DATA',
        reason: 'DUPLICATE_SERIES_ID',
        path: '/series/1/id',
        message: 'Series identifiers must be unique.',
        details: { index: 1, firstIndex: 0 },
      },
    );

    expectIssue(
      validateSourceData({
        ...comparisonSource,
        series: [
          { id: 'first', label: 'e\u0301' },
          { id: 'second', label: '\u00e9' },
        ],
        items: [],
      }),
      {
        code: 'INVALID_SOURCE_DATA',
        reason: 'DUPLICATE_SERIES_LABEL',
        path: '/series/1/label',
        details: { index: 1, firstIndex: 0 },
      },
    );
    expect(
      validateSourceData({
        ...comparisonSource,
        series: [
          { id: 'first', label: 'Actual' },
          { id: 'second', label: 'actual' },
        ],
        items: [],
      }).ok,
    ).toBe(true);

    expectIssue(
      validateSourceData({
        ...comparisonSource,
        series: [comparisonSource.series[0], { id: 'budget', label: ' Actual ' }],
      }),
      {
        code: 'INVALID_SOURCE_DATA',
        reason: 'DUPLICATE_SERIES_LABEL',
        path: '/series/1/label',
        message: 'Series labels must be unique after normalization.',
        details: { index: 1, firstIndex: 0 },
      },
    );

    const unknown = structuredClone(comparisonSource) as unknown as UnknownRecord;
    const unknownItems = unknown['items'] as UnknownRecord[];
    const unknownValues = unknownItems[0]?.['values'] as UnknownRecord[];
    if (unknownValues[1] === undefined) {
      throw new Error('Expected value fixture');
    }
    unknownValues[1]['seriesId'] = 'forecast';
    expectIssue(validateSourceData(unknown), {
      code: 'INVALID_SOURCE_DATA',
      reason: 'UNKNOWN_SERIES_REFERENCE',
      path: '/items/0/values/1/seriesId',
      message: 'Reference does not match a declared series.',
      details: { itemIndex: 0, valueIndex: 1 },
    });
    expectIssue(validateSourceData(unknown), {
      code: 'INVALID_SOURCE_DATA',
      reason: 'MISSING_SERIES_VALUE',
      path: '/items/0/values',
      message: 'Category values must cover every declared series.',
      details: { itemIndex: 0, seriesIndex: 1 },
    });

    const duplicate = structuredClone(comparisonSource) as unknown as UnknownRecord;
    const duplicateItems = duplicate['items'] as UnknownRecord[];
    const duplicateValues = duplicateItems[0]?.['values'] as UnknownRecord[];
    if (duplicateValues[1] === undefined) {
      throw new Error('Expected value fixture');
    }
    duplicateValues[1]['seriesId'] = 'actual';
    expectIssue(validateSourceData(duplicate), {
      code: 'INVALID_SOURCE_DATA',
      reason: 'DUPLICATE_SERIES_VALUE',
      path: '/items/0/values/1/seriesId',
      message: 'Category values must contain each series exactly once.',
      details: { itemIndex: 0, valueIndex: 1, firstValueIndex: 0 },
    });

    const missing = structuredClone(comparisonSource) as unknown as UnknownRecord;
    const missingItems = missing['items'] as UnknownRecord[];
    const missingValues = missingItems[0]?.['values'] as UnknownRecord[];
    missingValues.pop();
    expectIssue(validateSourceData(missing), {
      code: 'INVALID_SOURCE_DATA',
      reason: 'MISSING_SERIES_VALUE',
      path: '/items/0/values',
      message: 'Category values must cover every declared series.',
      details: { itemIndex: 0, seriesIndex: 1 },
    });

    const reordered = structuredClone(comparisonSource) as unknown as UnknownRecord;
    const reorderedItems = reordered['items'] as UnknownRecord[];
    const reorderedValues = reorderedItems[0]?.['values'] as UnknownRecord[];
    reorderedValues.reverse();
    expectIssue(validateSourceData(reordered), {
      code: 'INVALID_SOURCE_DATA',
      reason: 'SERIES_VALUE_ORDER_MISMATCH',
      path: '/items/0/values/0/seriesId',
      message: 'Category values must follow declared series order.',
      details: { itemIndex: 0, valueIndex: 0, expectedSeriesIndex: 0, actualSeriesIndex: 1 },
    });

    expectIssue(validateSourceData({ ...comparisonSource, extra: true }), {
      code: 'INVALID_SOURCE_DATA',
      reason: 'UNKNOWN_FIELD',
      path: '/extra',
    });
    expectIssue(
      validateSourceData({
        ...comparisonSource,
        items: [{ ...comparisonSource.items[0], amount: 1 }],
      }),
      {
        code: 'INVALID_SOURCE_DATA',
        reason: 'UNKNOWN_FIELD',
        path: '/items/0/amount',
      },
    );
  });

  it('validates local value structure even when the registry is not reliable', () => {
    const source = structuredClone(comparisonSource) as unknown as UnknownRecord;
    source['series'] = [
      { id: 'actual', label: 'Actual' },
      { id: 'actual', label: 'Budget' },
    ];
    const items = source['items'] as UnknownRecord[];
    const values = items[0]?.['values'] as UnknownRecord[];
    if (values[0] === undefined) {
      throw new Error('Expected value fixture');
    }
    values[0]['amount'] = Number.POSITIVE_INFINITY;

    const result = validateSourceData(source);
    expectIssue(result, {
      code: 'INVALID_SOURCE_DATA',
      reason: 'DUPLICATE_SERIES_ID',
      path: '/series/1/id',
    });
    expectIssue(result, {
      code: 'INVALID_SOURCE_DATA',
      reason: 'NON_FINITE_AMOUNT',
      path: '/items/0/values/0/amount',
    });
    if (!result.ok) {
      expect(
        result.errors.some(issue =>
          [
            'UNKNOWN_SERIES_REFERENCE',
            'DUPLICATE_SERIES_VALUE',
            'MISSING_SERIES_VALUE',
            'SERIES_VALUE_ORDER_MISMATCH',
          ].includes(issue.reason),
        ),
      ).toBe(false);
    }
  });

  it('rejects sparse, accessor and hostile matrix inputs without reading business values', () => {
    const sparse = structuredClone(comparisonSource) as unknown as UnknownRecord;
    const sparseItems = sparse['items'] as UnknownRecord[];
    const sparseValues: unknown[] = [];
    sparseValues.length = 2;
    sparseValues[0] = { seriesId: 'actual', amount: 1 };
    if (sparseItems[0] === undefined) {
      throw new Error('Expected item fixture');
    }
    sparseItems[0]['values'] = sparseValues;
    expectIssue(validateSourceData(sparse), {
      code: 'INVALID_SOURCE_DATA',
      reason: 'INVALID_TYPE',
      path: '/items/0/values/1',
    });

    let getterCalls = 0;
    const accessor = structuredClone(comparisonSource) as unknown as UnknownRecord;
    const accessorItems = accessor['items'] as UnknownRecord[];
    const accessorValues = accessorItems[0]?.['values'] as UnknownRecord[];
    const firstValue = accessorValues[0];
    if (firstValue === undefined) {
      throw new Error('Expected value fixture');
    }
    Object.defineProperty(firstValue, 'amount', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 42;
      },
    });
    expectIssue(validateSourceData(accessor), {
      code: 'INVALID_SOURCE_DATA',
      reason: 'NON_PLAIN_DATA',
      path: '/items/0/values/0/amount',
    });
    expect(getterCalls).toBe(0);

    const hostile = new Proxy(comparisonSource, {
      ownKeys() {
        throw new Error('private source payload');
      },
    });
    const hostileResult = validateSourceData(hostile);
    expectIssue(hostileResult, {
      code: 'INVALID_SOURCE_DATA',
      reason: 'UNREADABLE_INPUT',
      path: '/',
    });
    expect(JSON.stringify(hostileResult)).not.toContain('private source payload');
  });

  it('preserves explicit signed-zero input identity', () => {
    const source = structuredClone(comparisonSource) as unknown as CategoricalComparisonSourceData;
    const amount = source.items[0]?.values[0];
    if (amount === undefined) {
      throw new Error('Expected value fixture');
    }
    Object.assign(amount, { amount: -0 });

    const result = validateSourceData(source);
    expect(result).toEqual({ ok: true, value: source, errors: [] });
    if (result.ok) {
      expect(Object.is(result.value.items[0]?.values[0]?.amount, -0)).toBe(true);
    }
  });
});

describe('schema 3.0.0 narrative foundation', () => {
  it('creates, validates and round-trips category-only comparison views', () => {
    const view = initialView();
    expect(view).toEqual({
      schemaVersion: '3.0.0',
      datasetId: 'comparison-fixture',
      chartType: 'column',
      revision: 0,
      rootOrder: ['revenue', 'cost'],
      groups: {},
      collapsedGroupIds: [],
      pinnedItemIds: [],
      annotations: {},
      emphasis: {},
    });
    expect(validateViewSpec(view, comparisonSource)).toEqual({ ok: true, value: view, errors: [] });
    expect(parseViewSpec(serializeViewSpec(view), comparisonSource)).toEqual({
      ok: true,
      value: view,
      errors: [],
    });
    expect(cloneViewSpec(view)).toEqual(view);
    expect(createInitialViewSpec(emptyComparisonSource)).toMatchObject({
      ok: true,
      value: { schemaVersion: '3.0.0', rootOrder: [] },
    });
  });

  it('supports explicit bar and rejects waterfall without changing generation', () => {
    expect(createInitialViewSpec(comparisonSource, { chartType: 'bar' })).toMatchObject({
      ok: true,
      value: { schemaVersion: '3.0.0', chartType: 'bar' },
    });
    expectIssue(createInitialViewSpec(comparisonSource, { chartType: 'waterfall' }), {
      code: 'SOURCE_CONFLICT',
      reason: 'INCOMPATIBLE_CHART_TYPE',
      path: '/chartType',
    });
  });

  it('keeps series identifiers outside narrative references', () => {
    const view = { ...initialView(), rootOrder: ['actual', 'cost'] };
    expectIssue(validateViewSpec(view, comparisonSource), {
      code: 'SOURCE_CONFLICT',
      reason: 'UNKNOWN_SOURCE_REFERENCE',
      path: '/rootOrder/0',
    });
  });

  it('supports category grouping and rejects v3 in the scalar projector', () => {
    const view: CategoricalComparisonViewSpec = {
      ...initialView(),
      rootOrder: ['drivers'],
      groups: {
        drivers: { id: 'drivers', label: 'Drivers', childIds: ['revenue', 'cost'] },
      },
    };
    expect(evaluateGroupSelection(comparisonSource, initialView(), ['revenue', 'cost'])).toEqual({
      ok: true,
      nodeIds: ['revenue', 'cost'],
      sourceIds: ['revenue', 'cost'],
      containerId: 'root',
      mode: 'same-level',
    });
    expectIssue(projectCategorical(comparisonSource, view), {
      code: 'SOURCE_CONFLICT',
      reason: 'INCOMPATIBLE_PROJECTOR_GENERATION',
      path: '/schemaVersion',
      message: 'Projector does not support this schema generation.',
    });
  });

  it('keeps scalar projector precedence across every v2/v3 source-view pairing', () => {
    const v2View = scalarView();
    const v3View = initialView();

    expect(projectCategorical(scalarSource, v2View).ok).toBe(true);
    expectIssue(projectCategorical(scalarSource, v3View), {
      code: 'SOURCE_CONFLICT',
      reason: 'SCHEMA_VERSION_MISMATCH',
      path: '/schemaVersion',
    });
    expectIssue(projectCategorical(comparisonSource, v2View), {
      code: 'SOURCE_CONFLICT',
      reason: 'SCHEMA_VERSION_MISMATCH',
      path: '/schemaVersion',
    });
    expectIssue(projectCategorical(comparisonSource, v3View), {
      code: 'SOURCE_CONFLICT',
      reason: 'INCOMPATIBLE_PROJECTOR_GENERATION',
      path: '/schemaVersion',
    });

    expectIssue(
      projectCategorical({ ...comparisonSource, series: [comparisonSource.series[0]] }, v3View),
      {
        code: 'INVALID_SOURCE_DATA',
        reason: 'INVALID_SERIES_COUNT',
        path: '/series',
      },
    );
  });

  it('preserves concrete v1/v2 signed-zero validation, projector and fingerprint behavior', () => {
    const legacyNegative = {
      schemaVersion: '1.0.0',
      datasetId: 'legacy-signed-zero',
      items: [
        { id: 'opening', label: 'Opening', amount: -0, kind: 'start' },
        { id: 'neutral', label: 'Neutral', amount: -0, kind: 'contribution' },
        { id: 'closing', label: 'Closing', amount: -0, kind: 'end' },
      ],
    } as const satisfies LegacyWaterfallSourceData;
    const legacyPositive = {
      schemaVersion: '1.0.0',
      datasetId: 'legacy-signed-zero',
      items: [
        { id: 'opening', label: 'Opening', amount: 0, kind: 'start' },
        { id: 'neutral', label: 'Neutral', amount: 0, kind: 'contribution' },
        { id: 'closing', label: 'Closing', amount: 0, kind: 'end' },
      ],
    } as const satisfies LegacyWaterfallSourceData;
    const scalarNegative = {
      schemaVersion: '2.0.0',
      dataKind: 'categorical',
      datasetId: 'scalar-signed-zero',
      items: [{ id: 'zero', label: 'Zero', amount: -0 }],
    } as const satisfies CategoricalSourceData;
    const scalarPositive = {
      schemaVersion: '2.0.0',
      dataKind: 'categorical',
      datasetId: 'scalar-signed-zero',
      items: [{ id: 'zero', label: 'Zero', amount: 0 }],
    } as const satisfies CategoricalSourceData;

    expect(validateSourceData(legacyNegative)).toEqual({
      ok: true,
      value: legacyNegative,
      errors: [],
    });
    expect(validateSourceData(scalarNegative)).toEqual({
      ok: true,
      value: scalarNegative,
      errors: [],
    });

    const legacyView = createInitialViewSpec(legacyNegative);
    const scalarNegativeView = createInitialViewSpec(scalarNegative);
    if (!legacyView.ok || !scalarNegativeView.ok) {
      throw new Error('Expected signed-zero legacy views');
    }
    const legacyProjection = projectWaterfall(legacyNegative, legacyView.value);
    const scalarProjection = projectCategorical(scalarNegative, scalarNegativeView.value);
    expect(legacyProjection.ok).toBe(true);
    expect(scalarProjection.ok).toBe(true);
    if (legacyProjection.ok && scalarProjection.ok) {
      expect(Object.is(legacyProjection.value[1]?.amount, -0)).toBe(true);
      expect(Object.is(scalarProjection.value[0]?.amount, -0)).toBe(true);
    }

    const sessions = [
      createEditorSession(legacyNegative),
      createEditorSession(legacyPositive),
      createEditorSession(scalarNegative),
      createEditorSession(scalarPositive),
    ] as const;
    expect(sessions.every(result => result.ok)).toBe(true);
    if (sessions.every(result => result.ok)) {
      expect(sessions[0].value.sourceFingerprint).toBe(sessions[1].value.sourceFingerprint);
      expect(sessions[2].value.sourceFingerprint).toBe(sessions[3].value.sourceFingerprint);
    }
  });

  it('canonicalizes v3 zero signs in source fingerprints', () => {
    const positiveZero = structuredClone(
      comparisonSource,
    ) as unknown as CategoricalComparisonSourceData;
    const negativeZero = structuredClone(
      comparisonSource,
    ) as unknown as CategoricalComparisonSourceData;
    const positiveValue = positiveZero.items[0]?.values[0];
    const negativeValue = negativeZero.items[0]?.values[0];
    if (positiveValue === undefined || negativeValue === undefined) {
      throw new Error('Expected value fixtures');
    }
    Object.assign(positiveValue, { amount: 0, metadata: { signed: 0 } });
    Object.assign(negativeValue, { amount: -0, metadata: { signed: -0 } });
    Object.assign(positiveZero.series[0], { metadata: { signed: 0 } });
    Object.assign(negativeZero.series[0], { metadata: { signed: -0 } });
    Object.assign(positiveZero.items[0], { metadata: { signed: 0 } });
    Object.assign(negativeZero.items[0], { metadata: { signed: -0 } });

    const positiveSession = createEditorSession(positiveZero);
    const negativeSession = createEditorSession(negativeZero);
    expect(positiveSession.ok).toBe(true);
    expect(negativeSession.ok).toBe(true);
    if (positiveSession.ok && negativeSession.ok) {
      expect(negativeSession.value.sourceFingerprint).toBe(positiveSession.value.sourceFingerprint);
    }
  });

  it('preserves schema 3 snapshots through command history', () => {
    const created = createEditorSession(comparisonSource);
    if (!created.ok) {
      throw new Error('Expected a comparison session');
    }
    const pin: PinItemCommand = {
      schemaVersion: '1.0.0',
      id: 'pin-revenue',
      type: 'pinItem',
      source: 'host',
      baseRevision: 0,
      payload: { itemId: 'revenue' },
    };
    const pinned = executeCommand(created.value, pin);
    expect(pinned.ok).toBe(true);
    if (!pinned.ok) {
      return;
    }
    const undone = undoSession(pinned.session, {
      id: 'undo-pin',
      source: 'keyboard',
      baseRevision: 1,
    });
    expect(undone.ok).toBe(true);
    if (!undone.ok) {
      return;
    }
    const redone = redoSession(undone.session, {
      id: 'redo-pin',
      source: 'keyboard',
      baseRevision: 2,
    });
    expect(redone.ok).toBe(true);
    const sessions: readonly EditorSession[] = [pinned.session, undone.session];
    expect(sessions.every(value => value.viewSpec.schemaVersion === '3.0.0')).toBe(true);
    if (redone.ok) {
      expect(redone.session.viewSpec).toMatchObject({
        schemaVersion: '3.0.0',
        revision: 3,
        pinnedItemIds: ['revenue'],
      });
    }
  });
});
