import { describe, expect, it } from 'vitest';

import type { SourceData, ViewSpec } from '../../src/domain/model';
import { validateViewSpec } from '../../src/domain/validation';
import { projectWaterfall } from '../../src/charts/waterfall/projection';
import type {
  WaterfallProjection,
  WaterfallProjectionResult,
} from '../../src/charts/waterfall/types';

const GROUP_ID = 'drivers';

function expectProjection(result: WaterfallProjectionResult): WaterfallProjection {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('Expected a valid grouped waterfall projection');
  }

  return result.value;
}

function createTwoChildSource(
  datasetId: string,
  startAmount: number,
  amounts: readonly [number, number],
): SourceData {
  return {
    schemaVersion: '1.0.0',
    datasetId,
    items: [
      { id: 'start', label: 'Start', amount: startAmount, kind: 'start' },
      { id: 'first', label: 'First', amount: amounts[0], kind: 'contribution' },
      { id: 'second', label: 'Second', amount: amounts[1], kind: 'contribution' },
      {
        id: 'end',
        label: 'End',
        amount: startAmount + amounts[0] + amounts[1],
        kind: 'end',
      },
    ],
  };
}

interface GroupedViewOptions {
  readonly childIds?: readonly string[];
  readonly rootOrder?: readonly string[];
  readonly collapsed?: boolean;
  readonly pinnedItemIds?: readonly string[];
}

function createGroupedView(sourceData: SourceData, options: GroupedViewOptions = {}): ViewSpec {
  const childIds = options.childIds ?? ['first', 'second'];

  return {
    schemaVersion: '1.0.0',
    datasetId: sourceData.datasetId,
    chartType: 'waterfall',
    revision: 0,
    rootOrder: options.rootOrder ?? [GROUP_ID],
    groups: {
      [GROUP_ID]: {
        id: GROUP_ID,
        label: 'Drivers',
        childIds,
      },
    },
    collapsedGroupIds: options.collapsed === true ? [GROUP_ID] : [],
    pinnedItemIds: options.pinnedItemIds ?? [],
    annotations: {},
    emphasis: {},
  };
}

describe('projectWaterfall groups', () => {
  it('omits an expanded group datum and emits its children strictly in childIds order', () => {
    const sourceData: SourceData = {
      schemaVersion: '1.0.0',
      datasetId: 'expanded-order',
      items: [
        { id: 'start', label: 'Start', amount: 100, kind: 'start' },
        { id: 'first', label: 'First', amount: 10, kind: 'contribution' },
        { id: 'second', label: 'Second', amount: -4, kind: 'contribution' },
        { id: 'third', label: 'Third', amount: 3, kind: 'contribution' },
        { id: 'end', label: 'End', amount: 109, kind: 'end' },
      ],
    };
    const viewSpec = createGroupedView(sourceData, {
      childIds: ['second', 'first'],
      rootOrder: [GROUP_ID, 'third'],
    });

    const projection = expectProjection(projectWaterfall(sourceData, viewSpec));

    expect(projection.map(datum => datum.nodeId)).toEqual([
      'start',
      'second',
      'first',
      'third',
      'end',
    ]);
    expect(projection.some(datum => datum.nodeId === GROUP_ID)).toBe(false);
    expect(projection.slice(1, 4).map(datum => [datum.start, datum.end])).toEqual([
      [100, 96],
      [96, 106],
      [106, 109],
    ]);
  });

  const collapsedCases = [
    { name: 'positive', amounts: [8, -3] as const, total: 5 },
    { name: 'negative', amounts: [-8, 3] as const, total: -5 },
    { name: 'zero', amounts: [3, -3] as const, total: 0 },
  ] as const;

  it.each(collapsedCases)(
    'emits one complete collapsed group datum for a $name aggregate',
    ({ name, amounts, total }) => {
      const sourceData = createTwoChildSource(`collapsed-${name}`, 10, amounts);
      const viewSpec = createGroupedView(sourceData, { collapsed: true });

      const projection = expectProjection(projectWaterfall(sourceData, viewSpec));

      expect(projection).toHaveLength(3);
      expect(projection[1]).toEqual({
        nodeId: GROUP_ID,
        label: 'Drivers',
        start: 10,
        end: 10 + total,
        amount: total,
        kind: 'group',
        sourceIds: ['first', 'second'],
        groupPath: [GROUP_ID],
        depth: 1,
        locked: false,
        order: 1,
      });
    },
  );

  it('feeds identical children into the accumulator for collapsed and expanded views', () => {
    const sourceData = createTwoChildSource('collapsed-expanded-parity', 25, [10, -3]);
    const expanded = expectProjection(
      projectWaterfall(sourceData, createGroupedView(sourceData, { collapsed: false })),
    );
    const collapsed = expectProjection(
      projectWaterfall(sourceData, createGroupedView(sourceData, { collapsed: true })),
    );

    expect(expanded.map(datum => datum.nodeId)).toEqual(['start', 'first', 'second', 'end']);
    expect(collapsed.map(datum => datum.nodeId)).toEqual(['start', GROUP_ID, 'end']);
    expect(expanded[2]?.end).toBe(32);
    expect(collapsed[1]?.end).toBe(32);
    expect(collapsed.at(-1)).toMatchObject({ nodeId: 'end', end: 32, amount: 32 });
    expect(expanded.at(-1)).toMatchObject({ nodeId: 'end', end: 32, amount: 32 });
  });

  it('emits a collapsed group in its source subtotal segment position', () => {
    const sourceData = {
      schemaVersion: '1.0.0',
      datasetId: 'segmented-group',
      items: [
        { id: 'start', label: 'Start', amount: 100, kind: 'start' },
        { id: 'before-a', label: 'Before A', amount: 10, kind: 'contribution' },
        { id: 'before-b', label: 'Before B', amount: 5, kind: 'contribution' },
        { id: 'subtotal', label: 'Subtotal', amount: 115, kind: 'subtotal' },
        { id: 'first', label: 'After A', amount: -20, kind: 'contribution' },
        { id: 'second', label: 'After B', amount: 5, kind: 'contribution' },
        { id: 'end', label: 'End', amount: 100, kind: 'end' },
      ],
    } as const satisfies SourceData;
    const viewSpec = createGroupedView(sourceData, {
      rootOrder: ['before-a', 'before-b', GROUP_ID],
      collapsed: true,
    });

    const projection = expectProjection(projectWaterfall(sourceData, viewSpec));

    expect(projection.map(datum => datum.nodeId)).toEqual([
      'start',
      'before-a',
      'before-b',
      'subtotal',
      GROUP_ID,
      'end',
    ]);
    expect(projection[3]).toMatchObject({
      nodeId: 'subtotal',
      kind: 'subtotal',
      start: 0,
      end: 115,
      locked: true,
    });
    expect(projection[4]).toMatchObject({
      nodeId: GROUP_ID,
      start: 115,
      end: 100,
      amount: -15,
      order: 4,
    });
  });

  it('locks only pinned expanded children and locks a collapsed group when any child is pinned', () => {
    const sourceData = createTwoChildSource('pinned-child', 0, [4, 6]);
    const expanded = expectProjection(
      projectWaterfall(sourceData, createGroupedView(sourceData, { pinnedItemIds: ['second'] })),
    );
    const collapsed = expectProjection(
      projectWaterfall(
        sourceData,
        createGroupedView(sourceData, { collapsed: true, pinnedItemIds: ['second'] }),
      ),
    );

    expect(expanded.map(datum => [datum.nodeId, datum.locked])).toEqual([
      ['start', true],
      ['first', false],
      ['second', true],
      ['end', true],
    ]);
    expect(collapsed.map(datum => [datum.nodeId, datum.locked])).toEqual([
      ['start', true],
      [GROUP_ID, true],
      ['end', true],
    ]);
  });

  it('copies collapsed and expanded sourceIds instead of aliasing group childIds', () => {
    const sourceData = createTwoChildSource('group-source-id-copy', 0, [2, 3]);
    const childIds = ['first', 'second'];
    const expandedView = createGroupedView(sourceData, { childIds });
    const collapsedView = createGroupedView(sourceData, { childIds, collapsed: true });

    const expanded = expectProjection(projectWaterfall(sourceData, expandedView));
    const collapsed = expectProjection(projectWaterfall(sourceData, collapsedView));

    expect(expanded[1]?.sourceIds).toEqual(['first']);
    expect(expanded[2]?.sourceIds).toEqual(['second']);
    expect(expanded[1]?.sourceIds).not.toBe(childIds);
    expect(expanded[2]?.sourceIds).not.toBe(childIds);
    expect(expanded[1]?.sourceIds).not.toBe(expanded[2]?.sourceIds);
    expect(collapsed[1]?.sourceIds).toEqual(childIds);
    expect(collapsed[1]?.sourceIds).not.toBe(childIds);
  });

  it('returns the original validation failure for an invalid group/view structure', () => {
    const sourceData = createTwoChildSource('invalid-group-view', 0, [2, 3]);
    const invalidView = createGroupedView(sourceData, {
      childIds: ['first'],
      rootOrder: [GROUP_ID, 'second'],
      collapsed: true,
    });
    const validationResult = validateViewSpec(invalidView, sourceData);

    expect(validationResult.ok).toBe(false);
    expect(projectWaterfall(sourceData, invalidView)).toEqual(validationResult);
  });
});
