import { describe, expect, it } from 'vitest';

import type { SourceData, ViewSpec } from '../../src/domain/model';
import { projectWaterfall } from '../../src/waterfall/projectWaterfall';
import type {
  WaterfallProjection,
  WaterfallProjectionResult,
} from '../../src/waterfall/waterfallTypes';

function expectProjection(result: WaterfallProjectionResult): WaterfallProjection {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('Expected a valid waterfall projection');
  }

  return result.value;
}

function createView(sourceData: SourceData, rootOrder: readonly string[]): ViewSpec {
  return {
    schemaVersion: '1.0.0',
    datasetId: sourceData.datasetId,
    chartType: 'waterfall',
    revision: 0,
    rootOrder,
    groups: {},
    collapsedGroupIds: [],
    pinnedItemIds: [],
    annotations: {},
    emphasis: {},
  };
}

describe('projectWaterfall basic projection', () => {
  it('projects complete start, positive, negative, zero and end data from a negative base', () => {
    const sourceData = {
      schemaVersion: '1.0.0',
      datasetId: 'negative-base',
      items: [
        { id: 'opening', label: 'Opening', amount: -100, kind: 'start' },
        { id: 'growth', label: 'Growth', amount: 30, kind: 'contribution' },
        { id: 'cost', label: 'Cost', amount: -20, kind: 'contribution' },
        { id: 'neutral', label: 'Neutral', amount: 0, kind: 'contribution' },
        { id: 'closing', label: 'Closing', amount: -90, kind: 'end' },
      ],
    } as const satisfies SourceData;
    const viewSpec = createView(sourceData, ['growth', 'cost', 'neutral']);

    const projection = expectProjection(projectWaterfall(sourceData, viewSpec));

    expect(projection).toEqual([
      {
        nodeId: 'opening',
        label: 'Opening',
        start: 0,
        end: -100,
        amount: -100,
        kind: 'start',
        sourceIds: ['opening'],
        groupPath: [],
        depth: 0,
        locked: true,
        order: 0,
      },
      {
        nodeId: 'growth',
        label: 'Growth',
        start: -100,
        end: -70,
        amount: 30,
        kind: 'positive',
        sourceIds: ['growth'],
        groupPath: [],
        depth: 1,
        locked: false,
        order: 1,
      },
      {
        nodeId: 'cost',
        label: 'Cost',
        start: -70,
        end: -90,
        amount: -20,
        kind: 'negative',
        sourceIds: ['cost'],
        groupPath: [],
        depth: 1,
        locked: false,
        order: 2,
      },
      {
        nodeId: 'neutral',
        label: 'Neutral',
        start: -90,
        end: -90,
        amount: 0,
        kind: 'positive',
        sourceIds: ['neutral'],
        groupPath: [],
        depth: 1,
        locked: false,
        order: 3,
      },
      {
        nodeId: 'closing',
        label: 'Closing',
        start: 0,
        end: -90,
        amount: -90,
        kind: 'end',
        sourceIds: ['closing'],
        groupPath: [],
        depth: 0,
        locked: true,
        order: 4,
      },
    ]);
  });

  it('projects an anchors-only source without inventing contribution data', () => {
    const sourceData = {
      schemaVersion: '1.0.0',
      datasetId: 'anchors-only-negative',
      items: [
        { id: 'opening', label: 'Opening', amount: -250, kind: 'start' },
        { id: 'closing', label: 'Closing', amount: -250, kind: 'end' },
      ],
    } as const satisfies SourceData;

    const projection = expectProjection(projectWaterfall(sourceData, createView(sourceData, [])));

    expect(projection).toEqual([
      {
        nodeId: 'opening',
        label: 'Opening',
        start: 0,
        end: -250,
        amount: -250,
        kind: 'start',
        sourceIds: ['opening'],
        groupPath: [],
        depth: 0,
        locked: true,
        order: 0,
      },
      {
        nodeId: 'closing',
        label: 'Closing',
        start: 0,
        end: -250,
        amount: -250,
        kind: 'end',
        sourceIds: ['closing'],
        groupPath: [],
        depth: 0,
        locked: true,
        order: 1,
      },
    ]);
  });

  it('assigns every order from the final output index', () => {
    const sourceData = {
      schemaVersion: '1.0.0',
      datasetId: 'output-order',
      items: [
        { id: 'start', label: 'Start', amount: 10, kind: 'start' },
        { id: 'a', label: 'A', amount: 2, kind: 'contribution' },
        { id: 'b', label: 'B', amount: -3, kind: 'contribution' },
        { id: 'end', label: 'End', amount: 9, kind: 'end' },
      ],
    } as const satisfies SourceData;

    const projection = expectProjection(
      projectWaterfall(sourceData, createView(sourceData, ['b', 'a'])),
    );

    expect(projection.map(datum => datum.nodeId)).toEqual(['start', 'b', 'a', 'end']);
    projection.forEach((datum, index) => {
      expect(datum.order).toBe(index);
    });
  });

  it('uses IDs rather than duplicate labels to preserve source traceability', () => {
    const sourceData = {
      schemaVersion: '1.0.0',
      datasetId: 'duplicate-labels',
      items: [
        { id: 'start-id', label: 'Same label', amount: 0, kind: 'start' },
        { id: 'first-id', label: 'Same label', amount: 4, kind: 'contribution' },
        { id: 'second-id', label: 'Same label', amount: -1, kind: 'contribution' },
        { id: 'end-id', label: 'Same label', amount: 3, kind: 'end' },
      ],
    } as const satisfies SourceData;
    const viewSpec = createView(sourceData, ['second-id', 'first-id']);

    const projection = expectProjection(projectWaterfall(sourceData, viewSpec));

    expect(projection.map(datum => datum.label)).toEqual([
      'Same label',
      'Same label',
      'Same label',
      'Same label',
    ]);
    expect(projection.map(datum => [datum.nodeId, datum.sourceIds])).toEqual([
      ['start-id', ['start-id']],
      ['second-id', ['second-id']],
      ['first-id', ['first-id']],
      ['end-id', ['end-id']],
    ]);
  });

  it('treats prototype-like contribution IDs as source nodes rather than inherited groups', () => {
    const sourceData = {
      schemaVersion: '1.0.0',
      datasetId: 'prototype-like-ids',
      items: [
        { id: 'start', label: 'Start', amount: 0, kind: 'start' },
        { id: 'constructor', label: 'Constructor', amount: 1, kind: 'contribution' },
        { id: 'toString', label: 'To string', amount: 2, kind: 'contribution' },
        { id: '__proto__', label: 'Proto', amount: 3, kind: 'contribution' },
        { id: 'end', label: 'End', amount: 6, kind: 'end' },
      ],
    } as const satisfies SourceData;
    const viewSpec = createView(sourceData, ['constructor', 'toString', '__proto__']);

    const projection = expectProjection(projectWaterfall(sourceData, viewSpec));

    expect(projection.map(datum => datum.nodeId)).toEqual([
      'start',
      'constructor',
      'toString',
      '__proto__',
      'end',
    ]);
    expect(projection.at(-1)?.end).toBe(6);
  });

  it('does not mutate inputs or alias projection and source ID arrays', () => {
    const sourceData: SourceData = {
      schemaVersion: '1.0.0',
      datasetId: 'immutable-projection',
      items: [
        { id: 'start', label: 'Start', amount: 5, kind: 'start' },
        { id: 'a', label: 'A', amount: 2, kind: 'contribution' },
        { id: 'b', label: 'B', amount: -1, kind: 'contribution' },
        { id: 'end', label: 'End', amount: 6, kind: 'end' },
      ],
    };
    const viewSpec = createView(sourceData, ['a', 'b']);
    const sourceSnapshot = structuredClone(sourceData);
    const viewSnapshot = structuredClone(viewSpec);

    const projection = expectProjection(projectWaterfall(sourceData, viewSpec));

    expect(sourceData).toEqual(sourceSnapshot);
    expect(viewSpec).toEqual(viewSnapshot);
    expect(projection).not.toBe(sourceData.items);
    expect(projection).not.toBe(viewSpec.rootOrder);

    const sourceIdArrays = projection.map(datum => datum.sourceIds);
    expect(new Set(sourceIdArrays).size).toBe(sourceIdArrays.length);
    for (const sourceIds of sourceIdArrays) {
      expect(sourceIds).not.toBe(viewSpec.rootOrder);
      expect(sourceIds).not.toBe(sourceData.items);
    }
  });
});
