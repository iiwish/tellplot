import { describe, expect, it } from 'vitest';

import {
  createExpandedGroupRegionLabelMark,
  createExpandedGroupRegionMark,
  projectExpandedGroupRegions,
} from '../../src/charts/groupRegions';
import type { CategoricalProjection } from '../../src/charts/categorical/types';
import { resolveFinancialChartAppearance } from '../../src/config/chartAppearance';
import type { ViewSpec } from '../../src/domain/model';

const projection = [
  {
    nodeId: 'a',
    label: 'A',
    amount: 1,
    kind: 'positive',
    sourceIds: ['a'],
    locked: false,
    order: 0,
  },
  {
    nodeId: 'inner',
    label: 'Inner',
    amount: 5,
    kind: 'group',
    sourceIds: ['b', 'c'],
    locked: false,
    order: 1,
  },
  {
    nodeId: 'd',
    label: 'D',
    amount: 4,
    kind: 'positive',
    sourceIds: ['d'],
    locked: false,
    order: 2,
  },
] as const satisfies CategoricalProjection;

const viewSpec: ViewSpec = {
  schemaVersion: '2.0.0',
  datasetId: 'group-regions',
  chartType: 'column',
  revision: 0,
  rootOrder: ['outer'],
  groups: {
    inner: { id: 'inner', label: 'Inner', childIds: ['b', 'c'] },
    outer: { id: 'outer', label: 'Outer', childIds: ['a', 'inner', 'd'] },
  },
  collapsedGroupIds: ['inner'],
  pinnedItemIds: [],
  annotations: {},
  emphasis: {},
};

describe('expanded group regions', () => {
  it('projects stable visible ranges for expanded ancestors and omits collapsed groups', () => {
    expect(projectExpandedGroupRegions(viewSpec, projection)).toEqual([
      {
        regionId: 'group-region:outer',
        groupId: 'outer',
        label: 'Outer',
        depth: 1,
        startNodeId: 'a',
        endNodeId: 'd',
        valueStart: 0,
        valueEnd: 5,
        labelValue: 1,
      },
    ]);
  });

  it('projects nested expanded ranges from leaf membership in outer-to-inner order', () => {
    const expandedProjection = [
      projection[0],
      {
        nodeId: 'b',
        label: 'B',
        amount: 2,
        kind: 'positive',
        sourceIds: ['b'],
        locked: false,
        order: 1,
      },
      {
        nodeId: 'c',
        label: 'C',
        amount: 3,
        kind: 'positive',
        sourceIds: ['c'],
        locked: false,
        order: 2,
      },
      { ...projection[2], order: 3 },
    ] as const satisfies CategoricalProjection;

    expect(
      projectExpandedGroupRegions({ ...viewSpec, collapsedGroupIds: [] }, expandedProjection),
    ).toEqual([
      expect.objectContaining({
        groupId: 'outer',
        depth: 1,
        startNodeId: 'a',
        endNodeId: 'd',
        valueStart: 0,
        valueEnd: 4,
        labelValue: 1,
      }),
      expect.objectContaining({
        groupId: 'inner',
        depth: 2,
        startNodeId: 'b',
        endNodeId: 'c',
        valueStart: 0,
        valueEnd: 3,
        labelValue: 2,
      }),
    ]);
  });

  it('anchors waterfall labels to the first member upper edge instead of the region maximum', () => {
    const waterfallProjection = [
      { nodeId: 'a', sourceIds: ['a'], start: 3_200, end: 4_060 },
      { nodeId: 'b', sourceIds: ['b'], start: 4_060, end: 4_480 },
      { nodeId: 'c', sourceIds: ['c'], start: 4_480, end: 4_640 },
      { nodeId: 'd', sourceIds: ['d'], start: 4_640, end: 4_130 },
    ] as const;

    expect(
      projectExpandedGroupRegions({ ...viewSpec, collapsedGroupIds: [] }, waterfallProjection),
    ).toEqual([
      expect.objectContaining({
        groupId: 'outer',
        valueEnd: 4_640,
        labelValue: 4_060,
      }),
      expect.objectContaining({
        groupId: 'inner',
        valueEnd: 4_640,
        labelValue: 4_480,
      }),
    ]);
  });

  it('omits expanded descendants hidden by a collapsed ancestor', () => {
    const collapsedOuterProjection = [
      {
        nodeId: 'outer',
        label: 'Outer',
        amount: 10,
        kind: 'group',
        sourceIds: ['a', 'b', 'c', 'd'],
        locked: false,
        order: 0,
      },
    ] as const satisfies CategoricalProjection;

    expect(
      projectExpandedGroupRegions(
        { ...viewSpec, collapsedGroupIds: ['outer'] },
        collapsedOuterProjection,
      ),
    ).toEqual([]);
  });

  it('builds value-bounded G2 background and foreground label marks', () => {
    const regions = [
      {
        regionId: 'group-region:outer',
        groupId: 'outer',
        label: 'Outer',
        depth: 1,
        startNodeId: 'a',
        endNodeId: 'd',
        valueStart: -2,
        valueEnd: 6,
        labelValue: 2,
      },
      {
        regionId: 'group-region:inner',
        groupId: 'inner',
        label: 'Inner',
        depth: 3,
        startNodeId: 'b',
        endNodeId: 'c',
        valueStart: 1,
        valueEnd: 4,
        labelValue: 3,
      },
    ] as const;
    const mark = createExpandedGroupRegionMark({
      regions,
      categoryDomain: ['a', 'b', 'c', 'd'],
      appearance: resolveFinancialChartAppearance(
        { groupRegion: { fillOpacity: 0.06 }, palette: { group: '#664400' } },
        'Chart',
      ),
      reducedMotion: true,
      denseCanvas: false,
      transposed: true,
      activeGroupId: 'inner',
    });
    const style = mark?.style as
      { readonly fillOpacity?: (region: (typeof regions)[number]) => number } | undefined;
    const labelMark = createExpandedGroupRegionLabelMark({
      regions,
      categoryDomain: ['a', 'b', 'c', 'd'],
      appearance: resolveFinancialChartAppearance(
        { groupRegion: { fillOpacity: 0.06 }, palette: { group: '#664400' } },
        'Chart',
      ),
      reducedMotion: true,
      denseCanvas: false,
      transposed: true,
      activeGroupId: 'inner',
    });
    const labelStyle = labelMark?.style as
      | {
          readonly dx?: (region: (typeof regions)[number]) => number;
          readonly dy?: (region: (typeof regions)[number]) => number;
        }
      | undefined;

    expect(mark).toMatchObject({
      type: 'range',
      data: regions,
      coordinate: { transform: [{ type: 'transpose' }] },
      encode: {
        x: ['startNodeId', 'endNodeId'],
        y: ['valueStart', 'valueEnd'],
        key: 'regionId',
      },
      scale: { x: { domain: ['a', 'b', 'c', 'd'], padding: 0.24, reverse: true } },
      labels: [],
      tooltip: false,
      animate: false,
    });
    expect(labelMark).toMatchObject({
      type: 'text',
      data: regions,
      coordinate: { transform: [{ type: 'transpose' }] },
      encode: {
        x: 'startNodeId',
        y: 'labelValue',
        text: 'label',
        key: 'regionId',
      },
      zIndex: 10,
      style: {
        background: false,
        fill: '#664400',
        lineJoin: 'round',
        lineWidth: 1.5,
        pointerEvents: 'none',
        stroke: 'rgba(255, 255, 255, 0.94)',
        textAlign: 'center',
        textBaseline: 'bottom',
      },
      tooltip: false,
      animate: false,
    });
    expect(mark).not.toHaveProperty('axis');
    expect(labelMark).not.toHaveProperty('axis');
    expect(style?.fillOpacity?.(regions[0])).toBe(0.06);
    expect(style?.fillOpacity?.(regions[1])).toBe(0.15);
    expect(labelStyle?.dx?.(regions[0])).toBe(0);
    expect(labelStyle?.dy?.(regions[0])).toBe(-2);
    expect(labelStyle?.dx?.(regions[1])).toBe(20);
    expect(labelStyle?.dy?.(regions[1])).toBe(-26);
  });

  it('omits the renderer mark when group regions are disabled', () => {
    expect(
      createExpandedGroupRegionMark({
        regions: [
          {
            regionId: 'group-region:outer',
            groupId: 'outer',
            label: 'Outer',
            depth: 1,
            startNodeId: 'a',
            endNodeId: 'd',
            valueStart: 0,
            valueEnd: 5,
            labelValue: 1,
          },
        ],
        categoryDomain: ['a', 'd'],
        appearance: resolveFinancialChartAppearance({ groupRegion: { enabled: false } }, 'Chart'),
        reducedMotion: false,
        denseCanvas: false,
      }),
    ).toBeUndefined();
    expect(
      createExpandedGroupRegionLabelMark({
        regions: [
          {
            regionId: 'group-region:outer',
            groupId: 'outer',
            label: 'Outer',
            depth: 1,
            startNodeId: 'a',
            endNodeId: 'd',
            valueStart: 0,
            valueEnd: 5,
            labelValue: 1,
          },
        ],
        categoryDomain: ['a', 'd'],
        appearance: resolveFinancialChartAppearance({ groupRegion: { enabled: false } }, 'Chart'),
        reducedMotion: false,
        denseCanvas: false,
      }),
    ).toBeUndefined();
  });

  it('maps group label placement and visual styling without changing region geometry', () => {
    const regions = [
      {
        regionId: 'group-region:styled',
        groupId: 'styled',
        label: 'Styled',
        depth: 1,
        startNodeId: 'a',
        endNodeId: 'b',
        valueStart: 0,
        valueEnd: 5,
        labelValue: 5,
      },
    ] as const;
    const mark = createExpandedGroupRegionLabelMark({
      regions,
      categoryDomain: ['a', 'b'],
      appearance: resolveFinancialChartAppearance(
        {
          groupRegion: {
            labelStyle: {
              placement: 'inside',
              offset: 6,
              color: '#7A4B00',
              fontSize: 12,
              fontWeight: 600,
              background: true,
              backgroundColor: '#FFF8E8',
              backgroundOpacity: 0.82,
            },
          },
        },
        'Chart',
      ),
      reducedMotion: true,
      denseCanvas: false,
    });
    const dy = mark?.style?.['dy'];
    if (typeof dy !== 'function') {
      throw new Error('Expected a group label offset accessor');
    }

    expect(dy(regions[0])).toBe(6);
    expect(mark?.style).toMatchObject({
      background: true,
      backgroundFill: '#FFF8E8',
      backgroundOpacity: 0.82,
      backgroundPadding: [2, 4],
      backgroundRadius: 3,
      fill: '#7A4B00',
      fontSize: 12,
      fontWeight: 600,
      textBaseline: 'top',
    });
  });
});
