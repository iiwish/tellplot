import { describe, expect, it } from 'vitest';

import { createInitialViewSpec, validateSourceData, validateViewSpec } from '../../src';
import type {
  SourceData,
  ValidationErrorCode,
  ValidationIssueReason,
  ValidationResult,
  ViewSpec,
} from '../../src';
import { anchorsOnlySourceData, financialSourceData } from '../fixtures/financialSourceData';

type UnknownRecord = Record<string, unknown>;

interface ExpectedIssue {
  readonly code: ValidationErrorCode;
  readonly reason: ValidationIssueReason;
  readonly path: string;
}

function cloneSource(): UnknownRecord {
  return structuredClone(financialSourceData) as unknown as UnknownRecord;
}

function sourceItems(source: UnknownRecord): UnknownRecord[] {
  return source['items'] as UnknownRecord[];
}

function sourceItemAt(source: UnknownRecord, index: number): UnknownRecord {
  const item = sourceItems(source).at(index);
  if (item === undefined) {
    throw new Error(`Fixture source item ${index} is missing`);
  }
  return item;
}

function swapItems(items: UnknownRecord[], firstIndex: number, secondIndex: number): void {
  const first = items.at(firstIndex);
  const second = items.at(secondIndex);
  if (first === undefined || second === undefined) {
    throw new Error('Fixture source item is missing');
  }
  items[firstIndex] = second;
  items[secondIndex] = first;
}

function initialView(): ViewSpec {
  const result = createInitialViewSpec(financialSourceData);
  if (!result.ok) {
    throw new Error('Fixture should produce an initial ViewSpec');
  }
  return result.value;
}

function cloneView(view: ViewSpec = initialView()): UnknownRecord {
  return structuredClone(view) as unknown as UnknownRecord;
}

function expectIssue<T>(result: ValidationResult<T>, expected: ExpectedIssue): void {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error('Expected validation failure');
  }
  expect(result.errors).toEqual(expect.arrayContaining([expect.objectContaining(expected)]));
}

function groupedView(): ViewSpec {
  return {
    ...initialView(),
    rootOrder: ['profit-drivers', 'tax-impact'],
    groups: {
      'profit-drivers': {
        id: 'profit-drivers',
        label: '经营驱动',
        childIds: ['revenue-growth', 'cost-pressure'],
      },
    },
    collapsedGroupIds: ['profit-drivers'],
    pinnedItemIds: ['tax-impact'],
    annotations: {
      'opening-profit': '已审计起点',
      'profit-drivers': '核心经营变化',
    },
    emphasis: {
      'profit-drivers': 'highlight',
      'tax-impact': 'muted',
    },
  };
}

describe('validateSourceData', () => {
  it('accepts the financial fixture, duplicate labels and the anchors-only empty state', () => {
    const duplicateLabel = cloneSource();
    sourceItemAt(duplicateLabel, 2)['label'] = sourceItemAt(duplicateLabel, 1)['label'];
    sourceItemAt(duplicateLabel, 1)['amount'] = -0;
    sourceItemAt(duplicateLabel, 2)['amount'] = 0.125;

    expect(validateSourceData(financialSourceData)).toEqual({
      ok: true,
      value: financialSourceData,
      errors: [],
    });
    expect(validateSourceData(duplicateLabel).ok).toBe(true);
    expect(validateSourceData(anchorsOnlySourceData).ok).toBe(true);

    const nullPrototypeSource = Object.assign(Object.create(null) as UnknownRecord, cloneSource());
    expect(validateSourceData(nullPrototypeSource).ok).toBe(true);
  });

  const invalidCases: readonly {
    readonly name: string;
    readonly input: () => unknown;
    readonly expected: ExpectedIssue;
  }[] = [
    {
      name: 'non-object source',
      input: () => null,
      expected: { code: 'INVALID_SOURCE_DATA', reason: 'EXPECTED_OBJECT', path: '/' },
    },
    {
      name: 'non-plain source object',
      input: () => new Date(0),
      expected: { code: 'INVALID_SOURCE_DATA', reason: 'EXPECTED_OBJECT', path: '/' },
    },
    {
      name: 'non-string schema',
      input: () => ({ ...cloneSource(), schemaVersion: 1 }),
      expected: {
        code: 'INVALID_SOURCE_DATA',
        reason: 'INVALID_TYPE',
        path: '/schemaVersion',
      },
    },
    {
      name: 'unsupported schema',
      input: () => ({ ...cloneSource(), schemaVersion: '4.0.0' }),
      expected: {
        code: 'UNSUPPORTED_SCHEMA_VERSION',
        reason: 'UNSUPPORTED_SCHEMA_VERSION',
        path: '/schemaVersion',
      },
    },
    {
      name: 'blank dataset id',
      input: () => ({ ...cloneSource(), datasetId: '   ' }),
      expected: { code: 'INVALID_SOURCE_DATA', reason: 'EMPTY_ID', path: '/datasetId' },
    },
    {
      name: 'non-string dataset id',
      input: () => ({ ...cloneSource(), datasetId: 42 }),
      expected: { code: 'INVALID_SOURCE_DATA', reason: 'INVALID_TYPE', path: '/datasetId' },
    },
    {
      name: 'invalid currency',
      input: () => ({ ...cloneSource(), currency: 123 }),
      expected: { code: 'INVALID_SOURCE_DATA', reason: 'INVALID_TYPE', path: '/currency' },
    },
    {
      name: 'non-array items',
      input: () => ({ ...cloneSource(), items: {} }),
      expected: { code: 'INVALID_SOURCE_DATA', reason: 'INVALID_TYPE', path: '/items' },
    },
    {
      name: 'sparse items array',
      input: () => {
        const source = cloneSource();
        delete sourceItems(source)[1];
        return source;
      },
      expected: {
        code: 'INVALID_SOURCE_DATA',
        reason: 'INVALID_TYPE',
        path: '/items/1',
      },
    },
    {
      name: 'non-object item',
      input: () => ({ ...cloneSource(), items: [null] }),
      expected: { code: 'INVALID_SOURCE_DATA', reason: 'EXPECTED_OBJECT', path: '/items/0' },
    },
    {
      name: 'blank item id',
      input: () => {
        const source = cloneSource();
        sourceItemAt(source, 1)['id'] = ' ';
        return source;
      },
      expected: { code: 'INVALID_SOURCE_DATA', reason: 'EMPTY_ID', path: '/items/1/id' },
    },
    {
      name: 'non-string item id',
      input: () => {
        const source = cloneSource();
        sourceItemAt(source, 1)['id'] = 42;
        return source;
      },
      expected: {
        code: 'INVALID_SOURCE_DATA',
        reason: 'INVALID_TYPE',
        path: '/items/1/id',
      },
    },
    {
      name: 'duplicate item id',
      input: () => {
        const source = cloneSource();
        sourceItemAt(source, 2)['id'] = 'revenue-growth';
        return source;
      },
      expected: {
        code: 'INVALID_SOURCE_DATA',
        reason: 'DUPLICATE_SOURCE_ITEM_ID',
        path: '/items/2/id',
      },
    },
    {
      name: 'blank label',
      input: () => {
        const source = cloneSource();
        sourceItemAt(source, 1)['label'] = '\t';
        return source;
      },
      expected: { code: 'INVALID_SOURCE_DATA', reason: 'EMPTY_LABEL', path: '/items/1/label' },
    },
    {
      name: 'non-string label',
      input: () => {
        const source = cloneSource();
        sourceItemAt(source, 1)['label'] = 42;
        return source;
      },
      expected: {
        code: 'INVALID_SOURCE_DATA',
        reason: 'INVALID_TYPE',
        path: '/items/1/label',
      },
    },
    {
      name: 'non-number amount',
      input: () => {
        const source = cloneSource();
        sourceItemAt(source, 1)['amount'] = '320';
        return source;
      },
      expected: {
        code: 'INVALID_SOURCE_DATA',
        reason: 'INVALID_TYPE',
        path: '/items/1/amount',
      },
    },
    {
      name: 'NaN amount',
      input: () => {
        const source = cloneSource();
        sourceItemAt(source, 1)['amount'] = Number.NaN;
        return source;
      },
      expected: {
        code: 'INVALID_SOURCE_DATA',
        reason: 'NON_FINITE_AMOUNT',
        path: '/items/1/amount',
      },
    },
    {
      name: 'infinite amount',
      input: () => {
        const source = cloneSource();
        sourceItemAt(source, 1)['amount'] = Number.POSITIVE_INFINITY;
        return source;
      },
      expected: {
        code: 'INVALID_SOURCE_DATA',
        reason: 'NON_FINITE_AMOUNT',
        path: '/items/1/amount',
      },
    },
    {
      name: 'unsafe amount',
      input: () => {
        const source = cloneSource();
        sourceItemAt(source, 1)['amount'] = Number.MAX_SAFE_INTEGER + 1;
        return source;
      },
      expected: {
        code: 'INVALID_SOURCE_DATA',
        reason: 'UNSAFE_AMOUNT',
        path: '/items/1/amount',
      },
    },
    {
      name: 'invalid item kind',
      input: () => {
        const source = cloneSource();
        sourceItemAt(source, 1)['kind'] = 'adjustment';
        return source;
      },
      expected: {
        code: 'INVALID_SOURCE_DATA',
        reason: 'INVALID_SOURCE_ITEM_KIND',
        path: '/items/1/kind',
      },
    },
    {
      name: 'invalid source ref',
      input: () => {
        const source = cloneSource();
        sourceItemAt(source, 1)['sourceRef'] = 42;
        return source;
      },
      expected: {
        code: 'INVALID_SOURCE_DATA',
        reason: 'INVALID_TYPE',
        path: '/items/1/sourceRef',
      },
    },
    {
      name: 'metadata is not a plain record',
      input: () => {
        const source = cloneSource();
        sourceItemAt(source, 1)['metadata'] = [];
        return source;
      },
      expected: {
        code: 'INVALID_SOURCE_DATA',
        reason: 'EXPECTED_OBJECT',
        path: '/items/1/metadata',
      },
    },
    {
      name: 'metadata contains nested data',
      input: () => {
        const source = cloneSource();
        sourceItemAt(source, 1)['metadata'] = { nested: {} };
        return source;
      },
      expected: {
        code: 'INVALID_SOURCE_DATA',
        reason: 'INVALID_METADATA_VALUE',
        path: '/items/1/metadata/nested',
      },
    },
    {
      name: 'metadata contains non-finite number',
      input: () => {
        const source = cloneSource();
        sourceItemAt(source, 1)['metadata'] = { score: Number.NEGATIVE_INFINITY };
        return source;
      },
      expected: {
        code: 'INVALID_SOURCE_DATA',
        reason: 'INVALID_METADATA_VALUE',
        path: '/items/1/metadata/score',
      },
    },
    {
      name: 'missing start anchor',
      input: () => {
        const source = cloneSource();
        sourceItemAt(source, 0)['kind'] = 'contribution';
        return source;
      },
      expected: { code: 'INVALID_SOURCE_DATA', reason: 'INVALID_ANCHOR', path: '/items' },
    },
    {
      name: 'duplicate end anchor',
      input: () => {
        const source = cloneSource();
        sourceItemAt(source, 4)['kind'] = 'end';
        return source;
      },
      expected: { code: 'INVALID_SOURCE_DATA', reason: 'INVALID_ANCHOR', path: '/items' },
    },
    {
      name: 'start anchor is not first',
      input: () => {
        const source = cloneSource();
        const items = sourceItems(source);
        swapItems(items, 0, 1);
        return source;
      },
      expected: { code: 'INVALID_SOURCE_DATA', reason: 'INVALID_ANCHOR', path: '/items/1' },
    },
    {
      name: 'end anchor is not last',
      input: () => {
        const source = cloneSource();
        const items = sourceItems(source);
        swapItems(items, 4, 5);
        return source;
      },
      expected: { code: 'INVALID_SOURCE_DATA', reason: 'INVALID_ANCHOR', path: '/items/4' },
    },
  ];

  for (const testCase of invalidCases) {
    it(`rejects ${testCase.name}`, () => {
      expectIssue(validateSourceData(testCase.input()), testCase.expected);
    });
  }

  it('rejects a huge sparse array without expanding attacker-controlled length', () => {
    const source = cloneSource();
    const items: unknown[] = [];
    items.length = 100_000;
    source['items'] = items;

    const result = validateSourceData(source);

    expectIssue(result, {
      code: 'INVALID_SOURCE_DATA',
      reason: 'INVALID_TYPE',
      path: '/items/0',
    });
    if (result.ok) {
      throw new Error('Expected sparse-array rejection');
    }
    expect(result.errors.length).toBe(1);
  });

  it('returns deterministic privacy-safe issues', () => {
    const source = cloneSource();
    sourceItemAt(source, 1)['amount'] = Number.NaN;
    const first = validateSourceData(source);
    const second = validateSourceData(source);

    expect(second).toEqual(first);
    expect(JSON.stringify(first)).not.toContain('收入增长');
    expect(JSON.stringify(first)).not.toContain('ledger:revenue');
    expect(JSON.stringify(first)).not.toContain('320.5');
  });

  it('rejects accessors without executing or exposing their thrown value', () => {
    const source = cloneSource();
    Object.defineProperty(sourceItemAt(source, 1), 'amount', {
      enumerable: true,
      get(): never {
        throw new Error('sensitive getter text');
      },
    });

    let result: ValidationResult<SourceData> | undefined;
    expect(() => {
      result = validateSourceData(source);
    }).not.toThrow();
    if (result === undefined) {
      throw new Error('Source validation did not return a result');
    }
    expectIssue(result, {
      code: 'INVALID_SOURCE_DATA',
      reason: 'NON_PLAIN_DATA',
      path: '/items/1/amount',
    });
    expect(JSON.stringify(result)).not.toContain('sensitive getter text');
  });

  it('rejects unknown, symbol and accessor metadata fields as non-schema data', () => {
    const unknownField = cloneSource();
    unknownField['callback'] = () => undefined;
    expectIssue(validateSourceData(unknownField), {
      code: 'INVALID_SOURCE_DATA',
      reason: 'UNKNOWN_FIELD',
      path: '/callback',
    });

    const unknownItemField = cloneSource();
    sourceItemAt(unknownItemField, 1)['extra'] = new Map();
    expectIssue(validateSourceData(unknownItemField), {
      code: 'INVALID_SOURCE_DATA',
      reason: 'UNKNOWN_FIELD',
      path: '/items/1/extra',
    });

    const symbolField = cloneSource();
    Object.defineProperty(symbolField, Symbol('private'), { value: 'hidden', enumerable: true });
    expectIssue(validateSourceData(symbolField), {
      code: 'INVALID_SOURCE_DATA',
      reason: 'NON_PLAIN_DATA',
      path: '/',
    });

    const metadataAccessor = cloneSource();
    const metadata: UnknownRecord = {};
    Object.defineProperty(metadata, 'score', {
      enumerable: true,
      get(): never {
        throw new Error('metadata getter text');
      },
    });
    sourceItemAt(metadataAccessor, 1)['metadata'] = metadata;
    const result = validateSourceData(metadataAccessor);
    expectIssue(result, {
      code: 'INVALID_SOURCE_DATA',
      reason: 'NON_PLAIN_DATA',
      path: '/items/1/metadata/score',
    });
    expect(JSON.stringify(result)).not.toContain('metadata getter text');
  });

  it('rejects hostile array keys and descriptors without reading their values', () => {
    const symbolItems = cloneSource();
    Object.defineProperty(sourceItems(symbolItems), Symbol('private'), {
      value: 'hidden',
      enumerable: true,
    });
    expectIssue(validateSourceData(symbolItems), {
      code: 'INVALID_SOURCE_DATA',
      reason: 'NON_PLAIN_DATA',
      path: '/items',
    });

    const namedItems = cloneSource();
    Object.defineProperty(sourceItems(namedItems), 'extra', {
      value: 'hidden',
      enumerable: true,
    });
    expectIssue(validateSourceData(namedItems), {
      code: 'INVALID_SOURCE_DATA',
      reason: 'UNKNOWN_FIELD',
      path: '/items/extra',
    });

    const hiddenIndex = cloneSource();
    const hiddenItems = sourceItems(hiddenIndex);
    Object.defineProperty(hiddenItems, '1', {
      value: hiddenItems[1],
      enumerable: false,
      configurable: true,
      writable: true,
    });
    expectIssue(validateSourceData(hiddenIndex), {
      code: 'INVALID_SOURCE_DATA',
      reason: 'NON_PLAIN_DATA',
      path: '/items/1',
    });

    const nestedSymbol = cloneSource();
    Object.defineProperty(sourceItemAt(nestedSymbol, 1), Symbol('private'), {
      value: 'hidden',
      enumerable: true,
    });
    expectIssue(validateSourceData(nestedSymbol), {
      code: 'INVALID_SOURCE_DATA',
      reason: 'NON_PLAIN_DATA',
      path: '/items/1',
    });
  });

  it('turns hostile reflective input into a privacy-safe structured issue', () => {
    const hostile = new Proxy(
      {},
      {
        getPrototypeOf(): never {
          throw new Error('hostile proxy text');
        },
      },
    );

    let result: ValidationResult<SourceData> | undefined;
    expect(() => {
      result = validateSourceData(hostile);
    }).not.toThrow();
    if (result === undefined) {
      throw new Error('Source validation did not return a result');
    }
    expectIssue(result, {
      code: 'INVALID_SOURCE_DATA',
      reason: 'UNREADABLE_INPUT',
      path: '/',
    });
    expect(JSON.stringify(result)).not.toContain('hostile proxy text');
  });
});

describe('validateViewSpec', () => {
  it('accepts canonical, grouped and decorated views', () => {
    expect(validateViewSpec(initialView(), financialSourceData).ok).toBe(true);
    expect(validateViewSpec(groupedView(), financialSourceData)).toEqual({
      ok: true,
      value: groupedView(),
      errors: [],
    });
  });

  const invalidCases: readonly {
    readonly name: string;
    readonly mutate: (view: UnknownRecord) => void;
    readonly expected: ExpectedIssue;
  }[] = [
    {
      name: 'unsupported schema',
      mutate: view => void (view['schemaVersion'] = '4.0.0'),
      expected: {
        code: 'UNSUPPORTED_SCHEMA_VERSION',
        reason: 'UNSUPPORTED_SCHEMA_VERSION',
        path: '/schemaVersion',
      },
    },
    {
      name: 'dataset mismatch',
      mutate: view => void (view['datasetId'] = 'another-dataset'),
      expected: {
        code: 'SOURCE_CONFLICT',
        reason: 'DATASET_ID_MISMATCH',
        path: '/datasetId',
      },
    },
    {
      name: 'blank dataset id',
      mutate: view => void (view['datasetId'] = ' '),
      expected: { code: 'INVALID_VIEW_SPEC', reason: 'EMPTY_ID', path: '/datasetId' },
    },
    {
      name: 'non-string dataset id',
      mutate: view => void (view['datasetId'] = 42),
      expected: { code: 'INVALID_VIEW_SPEC', reason: 'INVALID_TYPE', path: '/datasetId' },
    },
    {
      name: 'invalid chart type',
      mutate: view => void (view['chartType'] = 'bar'),
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'INVALID_CHART_TYPE',
        path: '/chartType',
      },
    },
    {
      name: 'invalid revision',
      mutate: view => void (view['revision'] = -1),
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'INVALID_REVISION',
        path: '/revision',
      },
    },
    {
      name: 'non-array root order',
      mutate: view => void (view['rootOrder'] = {}),
      expected: { code: 'INVALID_VIEW_SPEC', reason: 'INVALID_TYPE', path: '/rootOrder' },
    },
    {
      name: 'non-string root node',
      mutate: view => void (view['rootOrder'] = [null, 'cost-pressure', 'tax-impact']),
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'INVALID_TYPE',
        path: '/rootOrder/0',
      },
    },
    {
      name: 'sparse root order',
      mutate: view => {
        const rootOrder: unknown[] = ['revenue-growth', 'cost-pressure', 'tax-impact'];
        delete rootOrder[1];
        view['rootOrder'] = rootOrder;
      },
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'INVALID_TYPE',
        path: '/rootOrder/1',
      },
    },
    {
      name: 'unknown root source item',
      mutate: view => void (view['rootOrder'] = ['unknown', 'cost-pressure', 'tax-impact']),
      expected: {
        code: 'SOURCE_CONFLICT',
        reason: 'UNKNOWN_SOURCE_REFERENCE',
        path: '/rootOrder/0',
      },
    },
    {
      name: 'duplicate root node',
      mutate: view => void (view['rootOrder'] = ['revenue-growth', 'revenue-growth', 'tax-impact']),
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'DUPLICATE_VIEW_NODE',
        path: '/rootOrder/1',
      },
    },
    {
      name: 'anchor in root order',
      mutate: view =>
        void (view['rootOrder'] = [
          'opening-profit',
          'revenue-growth',
          'cost-pressure',
          'tax-impact',
        ]),
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'LOCKED_ANCHOR_REFERENCE',
        path: '/rootOrder/0',
      },
    },
    {
      name: 'missing contribution',
      mutate: view => void (view['rootOrder'] = ['revenue-growth', 'tax-impact']),
      expected: {
        code: 'SOURCE_CONFLICT',
        reason: 'MISSING_SOURCE_REFERENCE',
        path: '/rootOrder',
      },
    },
    {
      name: 'cross-anchor segment order',
      mutate: view => void (view['rootOrder'] = ['tax-impact', 'revenue-growth', 'cost-pressure']),
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'ANCHOR_SEGMENT_ORDER',
        path: '/rootOrder/1',
      },
    },
    {
      name: 'non-record groups',
      mutate: view => void (view['groups'] = []),
      expected: { code: 'INVALID_VIEW_SPEC', reason: 'EXPECTED_OBJECT', path: '/groups' },
    },
    {
      name: 'non-object group',
      mutate: view => {
        view['rootOrder'] = ['broken-group', 'tax-impact'];
        view['groups'] = { 'broken-group': null };
      },
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'EXPECTED_OBJECT',
        path: '/groups/broken-group',
      },
    },
    {
      name: 'blank group id',
      mutate: view => {
        view['rootOrder'] = ['group-key', 'tax-impact'];
        view['groups'] = {
          'group-key': {
            id: ' ',
            label: 'Group',
            childIds: ['revenue-growth', 'cost-pressure'],
          },
        };
      },
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'EMPTY_ID',
        path: '/groups/group-key/id',
      },
    },
    {
      name: 'non-string group id',
      mutate: view => {
        view['rootOrder'] = ['group-key', 'tax-impact'];
        view['groups'] = {
          'group-key': {
            id: 42,
            label: 'Group',
            childIds: ['revenue-growth', 'cost-pressure'],
          },
        };
      },
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'INVALID_TYPE',
        path: '/groups/group-key/id',
      },
    },
    {
      name: 'group key and id mismatch',
      mutate: view => {
        view['rootOrder'] = ['group-key', 'tax-impact'];
        view['groups'] = {
          'group-key': {
            id: 'different-id',
            label: 'Group',
            childIds: ['revenue-growth', 'cost-pressure'],
          },
        };
      },
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'GROUP_ID_MISMATCH',
        path: '/groups/group-key/id',
      },
    },
    {
      name: 'reserved root group id',
      mutate: view => {
        view['rootOrder'] = ['root', 'tax-impact'];
        view['groups'] = {
          root: {
            id: 'root',
            label: 'Group',
            childIds: ['revenue-growth', 'cost-pressure'],
          },
        };
      },
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'RESERVED_GROUP_ID',
        path: '/groups/root/id',
      },
    },
    {
      name: 'group id conflicts with source id',
      mutate: view => {
        view['rootOrder'] = ['revenue-growth', 'tax-impact'];
        view['groups'] = {
          'revenue-growth': {
            id: 'revenue-growth',
            label: 'Group',
            childIds: ['revenue-growth', 'cost-pressure'],
          },
        };
      },
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'GROUP_SOURCE_ID_CONFLICT',
        path: '/groups/revenue-growth/id',
      },
    },
    {
      name: 'blank group label',
      mutate: view => {
        Object.assign(view, cloneView(groupedView()));
        (view['groups'] as UnknownRecord)['profit-drivers'] = {
          id: 'profit-drivers',
          label: ' ',
          childIds: ['revenue-growth', 'cost-pressure'],
        };
      },
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'EMPTY_LABEL',
        path: '/groups/profit-drivers/label',
      },
    },
    {
      name: 'non-string group label',
      mutate: view => {
        Object.assign(view, cloneView(groupedView()));
        (view['groups'] as UnknownRecord)['profit-drivers'] = {
          id: 'profit-drivers',
          label: 1,
          childIds: ['revenue-growth', 'cost-pressure'],
        };
      },
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'INVALID_TYPE',
        path: '/groups/profit-drivers/label',
      },
    },
    {
      name: 'non-array group children',
      mutate: view => {
        Object.assign(view, cloneView(groupedView()));
        (view['groups'] as UnknownRecord)['profit-drivers'] = {
          id: 'profit-drivers',
          label: 'Group',
          childIds: {},
        };
      },
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'INVALID_TYPE',
        path: '/groups/profit-drivers/childIds',
      },
    },
    {
      name: 'group has fewer than two children',
      mutate: view => {
        Object.assign(view, cloneView(groupedView()));
        (view['groups'] as UnknownRecord)['profit-drivers'] = {
          id: 'profit-drivers',
          label: 'Group',
          childIds: ['revenue-growth'],
        };
      },
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'GROUP_TOO_SMALL',
        path: '/groups/profit-drivers/childIds',
      },
    },
    {
      name: 'duplicate group child',
      mutate: view => {
        Object.assign(view, cloneView(groupedView()));
        (view['groups'] as UnknownRecord)['profit-drivers'] = {
          id: 'profit-drivers',
          label: 'Group',
          childIds: ['revenue-growth', 'revenue-growth'],
        };
      },
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'DUPLICATE_GROUP_CHILD',
        path: '/groups/profit-drivers/childIds/1',
      },
    },
    {
      name: 'non-string group child',
      mutate: view => {
        Object.assign(view, cloneView(groupedView()));
        (view['groups'] as UnknownRecord)['profit-drivers'] = {
          id: 'profit-drivers',
          label: 'Group',
          childIds: [null, 'cost-pressure'],
        };
      },
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'INVALID_TYPE',
        path: '/groups/profit-drivers/childIds/0',
      },
    },
    {
      name: 'sparse group children',
      mutate: view => {
        Object.assign(view, cloneView(groupedView()));
        const childIds: unknown[] = ['revenue-growth', 'cost-pressure'];
        delete childIds[1];
        (view['groups'] as UnknownRecord)['profit-drivers'] = {
          id: 'profit-drivers',
          label: 'Group',
          childIds,
        };
      },
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'INVALID_TYPE',
        path: '/groups/profit-drivers/childIds/1',
      },
    },
    {
      name: 'unknown group child',
      mutate: view => {
        Object.assign(view, cloneView(groupedView()));
        (view['groups'] as UnknownRecord)['profit-drivers'] = {
          id: 'profit-drivers',
          label: 'Group',
          childIds: ['unknown', 'cost-pressure'],
        };
      },
      expected: {
        code: 'SOURCE_CONFLICT',
        reason: 'UNKNOWN_SOURCE_REFERENCE',
        path: '/groups/profit-drivers/childIds/0',
      },
    },
    {
      name: 'group references an anchor',
      mutate: view => {
        Object.assign(view, cloneView(groupedView()));
        (view['groups'] as UnknownRecord)['profit-drivers'] = {
          id: 'profit-drivers',
          label: 'Group',
          childIds: ['opening-profit', 'cost-pressure'],
        };
      },
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'INVALID_GROUP_CHILD',
        path: '/groups/profit-drivers/childIds/0',
      },
    },
    {
      name: 'group crosses a subtotal anchor',
      mutate: view => {
        Object.assign(view, cloneView(groupedView()));
        (view['groups'] as UnknownRecord)['profit-drivers'] = {
          id: 'profit-drivers',
          label: 'Group',
          childIds: ['revenue-growth', 'tax-impact'],
        };
      },
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'GROUP_CROSSES_ANCHOR',
        path: '/groups/profit-drivers/childIds/1',
      },
    },
    {
      name: 'contribution belongs to multiple groups',
      mutate: view => {
        view['rootOrder'] = ['group-a', 'group-b'];
        view['groups'] = {
          'group-a': {
            id: 'group-a',
            label: 'A',
            childIds: ['revenue-growth', 'cost-pressure'],
          },
          'group-b': {
            id: 'group-b',
            label: 'B',
            childIds: ['cost-pressure', 'tax-impact'],
          },
        };
      },
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'DUPLICATE_GROUP_MEMBERSHIP',
        path: '/groups/group-b/childIds/0',
      },
    },
    {
      name: 'orphan group',
      mutate: view => {
        Object.assign(view, cloneView(groupedView()));
        view['rootOrder'] = ['tax-impact'];
      },
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'ORPHAN_GROUP',
        path: '/groups/profit-drivers',
      },
    },
    {
      name: 'collapsed duplicate',
      mutate: view => {
        Object.assign(view, cloneView(groupedView()));
        view['collapsedGroupIds'] = ['profit-drivers', 'profit-drivers'];
      },
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'DUPLICATE_REFERENCE',
        path: '/collapsedGroupIds/1',
      },
    },
    {
      name: 'collapsed groups is not an array',
      mutate: view => void (view['collapsedGroupIds'] = {}),
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'INVALID_TYPE',
        path: '/collapsedGroupIds',
      },
    },
    {
      name: 'collapsed group id is not a string',
      mutate: view => void (view['collapsedGroupIds'] = [null]),
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'INVALID_TYPE',
        path: '/collapsedGroupIds/0',
      },
    },
    {
      name: 'sparse collapsed groups',
      mutate: view => {
        const groupIds: unknown[] = ['profit-drivers'];
        delete groupIds[0];
        view['collapsedGroupIds'] = groupIds;
      },
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'INVALID_TYPE',
        path: '/collapsedGroupIds/0',
      },
    },
    {
      name: 'collapsed unknown group',
      mutate: view => void (view['collapsedGroupIds'] = ['missing-group']),
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'UNKNOWN_GROUP_REFERENCE',
        path: '/collapsedGroupIds/0',
      },
    },
    {
      name: 'pinned duplicate',
      mutate: view => void (view['pinnedItemIds'] = ['tax-impact', 'tax-impact']),
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'DUPLICATE_REFERENCE',
        path: '/pinnedItemIds/1',
      },
    },
    {
      name: 'pinned items is not an array',
      mutate: view => void (view['pinnedItemIds'] = {}),
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'INVALID_TYPE',
        path: '/pinnedItemIds',
      },
    },
    {
      name: 'pinned item id is not a string',
      mutate: view => void (view['pinnedItemIds'] = [null]),
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'INVALID_TYPE',
        path: '/pinnedItemIds/0',
      },
    },
    {
      name: 'sparse pinned items',
      mutate: view => {
        const itemIds: unknown[] = ['tax-impact'];
        delete itemIds[0];
        view['pinnedItemIds'] = itemIds;
      },
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'INVALID_TYPE',
        path: '/pinnedItemIds/0',
      },
    },
    {
      name: 'pinned anchor',
      mutate: view => void (view['pinnedItemIds'] = ['operating-profit']),
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'INVALID_PIN_REFERENCE',
        path: '/pinnedItemIds/0',
      },
    },
    {
      name: 'annotation is empty after trim',
      mutate: view => void (view['annotations'] = { 'tax-impact': '   ' }),
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'INVALID_ANNOTATION',
        path: '/annotations/tax-impact',
      },
    },
    {
      name: 'annotations is not a record',
      mutate: view => void (view['annotations'] = []),
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'EXPECTED_OBJECT',
        path: '/annotations',
      },
    },
    {
      name: 'annotation exceeds 500 Unicode code points',
      mutate: view => void (view['annotations'] = { 'tax-impact': '🙂'.repeat(501) }),
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'ANNOTATION_TOO_LONG',
        path: '/annotations/tax-impact',
      },
    },
    {
      name: 'annotation references an unknown node',
      mutate: view => void (view['annotations'] = { missing: 'Note' }),
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'UNKNOWN_NODE_REFERENCE',
        path: '/annotations/missing',
      },
    },
    {
      name: 'invalid emphasis value',
      mutate: view => void (view['emphasis'] = { 'tax-impact': 'strong' }),
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'INVALID_EMPHASIS',
        path: '/emphasis/tax-impact',
      },
    },
    {
      name: 'emphasis is not a record',
      mutate: view => void (view['emphasis'] = []),
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'EXPECTED_OBJECT',
        path: '/emphasis',
      },
    },
    {
      name: 'emphasis references unknown node',
      mutate: view => void (view['emphasis'] = { missing: 'muted' }),
      expected: {
        code: 'INVALID_VIEW_SPEC',
        reason: 'UNKNOWN_NODE_REFERENCE',
        path: '/emphasis/missing',
      },
    },
  ];

  for (const testCase of invalidCases) {
    it(`rejects ${testCase.name}`, () => {
      const view = cloneView();
      testCase.mutate(view);
      expectIssue(validateViewSpec(view, financialSourceData), testCase.expected);
    });
  }

  it('rejects a non-object view and invalid source before view reconciliation', () => {
    expectIssue(validateViewSpec(null, financialSourceData), {
      code: 'INVALID_VIEW_SPEC',
      reason: 'EXPECTED_OBJECT',
      path: '/',
    });

    const invalidSource = cloneSource();
    sourceItemAt(invalidSource, 1)['amount'] = Number.NaN;
    expectIssue(validateViewSpec(initialView(), invalidSource as unknown as SourceData), {
      code: 'INVALID_SOURCE_DATA',
      reason: 'NON_FINITE_AMOUNT',
      path: '/items/1/amount',
    });

    const sparseSource = cloneSource();
    delete sourceItems(sparseSource)[1];
    expect(() =>
      validateViewSpec(initialView(), sparseSource as unknown as SourceData),
    ).not.toThrow();
    expectIssue(validateViewSpec(initialView(), sparseSource as unknown as SourceData), {
      code: 'INVALID_SOURCE_DATA',
      reason: 'INVALID_TYPE',
      path: '/items/1',
    });
  });

  it('accepts exactly 500 Unicode code points', () => {
    const view = cloneView();
    view['annotations'] = { 'tax-impact': '🙂'.repeat(500) };

    expect(validateViewSpec(view, financialSourceData).ok).toBe(true);
  });

  it('rejects view accessors and unknown fields without executing them', () => {
    const accessorView = cloneView();
    Object.defineProperty(accessorView, 'rootOrder', {
      enumerable: true,
      get(): never {
        throw new Error('view getter text');
      },
    });

    let accessorResult: ValidationResult<ViewSpec> | undefined;
    expect(() => {
      accessorResult = validateViewSpec(accessorView, financialSourceData);
    }).not.toThrow();
    if (accessorResult === undefined) {
      throw new Error('View validation did not return a result');
    }
    expectIssue(accessorResult, {
      code: 'INVALID_VIEW_SPEC',
      reason: 'NON_PLAIN_DATA',
      path: '/rootOrder',
    });
    expect(JSON.stringify(accessorResult)).not.toContain('view getter text');

    const unknownFieldView = cloneView();
    unknownFieldView['renderer'] = new Map();
    expectIssue(validateViewSpec(unknownFieldView, financialSourceData), {
      code: 'INVALID_VIEW_SPEC',
      reason: 'UNKNOWN_FIELD',
      path: '/renderer',
    });
  });
});
