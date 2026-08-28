# TellPlot 2.0 包与 schema 迁移

## 包选择

所有场景安装同一个 `tellplot` 包。纯数据校验与 SSR 使用 `tellplot/core`；imperative DOM 使用根入口；
React 18/19 与 Vue 3 分别使用 `tellplot/react` 和 `tellplot/vue`。export map 与 1.x 相同，framework adapters
仍只代理同一个 imperative editor。

## Runtime 兼容

legacy v1 waterfall、current v2 waterfall 和 scalar v2 categorical 的 wire、校验、投影、持久化、编辑与导出
保持原样，不需要把现有 JSON 转成 schema `3.0.0`。`parseViewSpec` 永不跨 schema generation 迁移。

2.0 的 source break 来自 `SourceData`、`ViewSpec` 和 `ChartConfig` public union 加入 v3 variant。对公开联合做
exhaustive narrowing 的 TypeScript consumer 必须增加明确分支：

```ts id=exhaustive-before mode=expected-diagnostic:TS2322
import type { SourceData } from 'tellplot';

export function generationName(source: SourceData): string {
  if (source.schemaVersion === '1.0.0') return 'legacy-waterfall';
  if (source.schemaVersion === '2.0.0') return source.dataKind;
  const exhaustive: never = source;
  return exhaustive;
}
```

```ts id=exhaustive-after mode=standalone
import type { SourceData } from 'tellplot';

export function generationName(source: SourceData): string {
  if (source.schemaVersion === '1.0.0') return 'legacy-waterfall';
  if (source.schemaVersion === '2.0.0') return source.dataKind;
  if (source.schemaVersion === '3.0.0') return 'categorical-comparison';
  const exhaustive: never = source;
  return exhaustive;
}
```

## 路径一：创建全新 v3 view

宿主已明确提供 2 至 4 个 series 和完整 values matrix 时，可以创建新的 v3 view。该路径有意丢弃旧
category narrative state。

```ts id=fresh-comparison-view mode=standalone
import {
  createInitialViewSpec,
  type CategoricalComparisonSourceData,
  type CategoricalComparisonViewSpec,
} from 'tellplot';

export function createComparisonView(
  source: CategoricalComparisonSourceData,
): CategoricalComparisonViewSpec {
  const created = createInitialViewSpec(source, { chartType: 'column' });
  if (!created.ok || created.value.schemaVersion !== '3.0.0') {
    throw new Error('Comparison view validation failed');
  }
  return created.value;
}
```

## 路径二：显式保留 category narrative

只有 old scalar source/view、target comparison config 都通过公共 validator，dataset ID、chart type 与 category
ID set 完全兼容时，才可保留 root order、groups、collapse、pin、annotations 和 emphasis。source order 可以不同。
以下函数是 host-side reference，不是 TellPlot runtime export，也不猜测 series label 或业务映射。成功结果使用
revision `0` 和独立 arrays/records；任何 mismatch 都只返回统一失败结果，不产生 partial view。

```ts id=preserve-comparison-view mode=compose-runtime:preserve-comparison
import {
  validateChartConfig,
  validateSourceData,
  validateViewSpec,
  viewMatchesChartConfig,
  type CategoricalComparisonChartConfig,
  type CategoricalComparisonSourceData,
  type CategoricalComparisonViewSpec,
  type CategoricalSourceData,
  type ViewSpec,
} from 'tellplot';

type PreserveNarrativeResult =
  | { readonly ok: true; readonly value: CategoricalComparisonViewSpec }
  | { readonly ok: false; readonly reason: 'INCOMPATIBLE_NARRATIVE' };

function sameCategoryIdSet(
  oldSource: CategoricalSourceData,
  targetSource: CategoricalComparisonSourceData,
): boolean {
  if (oldSource.items.length !== targetSource.items.length) return false;
  const targetIds = new Set(targetSource.items.map(item => item.id));
  return oldSource.items.every(item => targetIds.has(item.id));
}

export function preserveCategoricalNarrative(
  oldSource: CategoricalSourceData,
  oldView: ViewSpec,
  targetConfig: CategoricalComparisonChartConfig,
): PreserveNarrativeResult {
  const oldSourceValidation = validateSourceData(oldSource);
  const targetValidation = validateChartConfig(targetConfig);
  if (
    !oldSourceValidation.ok ||
    !targetValidation.ok ||
    oldSourceValidation.value.schemaVersion !== '2.0.0' ||
    oldSourceValidation.value.dataKind !== 'categorical'
  ) {
    return { ok: false, reason: 'INCOMPATIBLE_NARRATIVE' };
  }
  const validatedOldSource = oldSourceValidation.value;
  const oldValidation = validateViewSpec(oldView, validatedOldSource);
  if (!oldValidation.ok) {
    return { ok: false, reason: 'INCOMPATIBLE_NARRATIVE' };
  }
  const currentView = oldValidation.value;
  if (
    currentView.schemaVersion !== '2.0.0' ||
    (currentView.chartType !== 'bar' && currentView.chartType !== 'column') ||
    currentView.datasetId !== targetConfig.data.datasetId ||
    currentView.chartType !== targetConfig.type ||
    !sameCategoryIdSet(validatedOldSource, targetConfig.data)
  ) {
    return { ok: false, reason: 'INCOMPATIBLE_NARRATIVE' };
  }

  const candidate: CategoricalComparisonViewSpec = {
    schemaVersion: '3.0.0',
    datasetId: currentView.datasetId,
    chartType: currentView.chartType,
    revision: 0,
    rootOrder: [...currentView.rootOrder],
    groups: Object.fromEntries(
      Object.entries(currentView.groups).map(([id, group]) => [
        id,
        { ...group, childIds: [...group.childIds] },
      ]),
    ),
    collapsedGroupIds: [...currentView.collapsedGroupIds],
    pinnedItemIds: [...currentView.pinnedItemIds],
    annotations: { ...currentView.annotations },
    emphasis: { ...currentView.emphasis },
  };

  const migrated = validateViewSpec(candidate, targetConfig.data);
  return migrated.ok && viewMatchesChartConfig(migrated.value, targetConfig)
    ? { ok: true, value: candidate }
    : { ok: false, reason: 'INCOMPATIBLE_NARRATIVE' };
}
```

下面的可执行 fixture 使用重排后的 target source 证明成功路径，检查每个 mutable container 都已 clone，并证明
dataset、chart type 与 category set mismatch 原子失败且不改写任一输入。

```ts id=preserve-comparison-runtime mode=compose-runtime:preserve-comparison
const oldSource = {
  schemaVersion: '2.0.0',
  dataKind: 'categorical',
  datasetId: 'regional-revenue',
  items: [
    { id: 'north', label: 'North', amount: 120 },
    { id: 'south', label: 'South', amount: 96 },
  ],
} as const satisfies CategoricalSourceData;

const oldView = {
  schemaVersion: '2.0.0',
  datasetId: 'regional-revenue',
  chartType: 'column',
  revision: 7,
  rootOrder: ['region'],
  groups: {
    region: { id: 'region', label: 'Region', childIds: ['north', 'south'] },
  },
  collapsedGroupIds: ['region'],
  pinnedItemIds: [],
  annotations: { region: 'Reviewed' },
  emphasis: { region: 'highlight' },
} as const satisfies ViewSpec;

const targetSource = {
  schemaVersion: '3.0.0',
  dataKind: 'categorical',
  datasetId: 'regional-revenue',
  series: [
    { id: 'actual', label: 'Actual' },
    { id: 'budget', label: 'Budget' },
  ],
  items: [
    {
      id: 'south',
      label: 'South',
      values: [
        { seriesId: 'actual', amount: 96 },
        { seriesId: 'budget', amount: 100 },
      ],
    },
    {
      id: 'north',
      label: 'North',
      values: [
        { seriesId: 'actual', amount: 120 },
        { seriesId: 'budget', amount: 125 },
      ],
    },
  ],
} as const satisfies CategoricalComparisonSourceData;

const targetConfig = {
  type: 'column',
  data: targetSource,
} as const satisfies CategoricalComparisonChartConfig;

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const inputReceipt = JSON.stringify({ oldSource, oldView, targetConfig });
const preserved = preserveCategoricalNarrative(oldSource, oldView, targetConfig);
assert(preserved.ok, 'compatible narrative must be preserved');
assert(preserved.value.revision === 0, 'migration starts a fresh revision');
assert(preserved.value.rootOrder !== oldView.rootOrder, 'rootOrder must be cloned');
assert(preserved.value.groups !== oldView.groups, 'groups record must be cloned');
assert(
  preserved.value.groups['region']?.childIds !== oldView.groups.region.childIds,
  'group childIds must be cloned',
);
assert(
  preserved.value.collapsedGroupIds !== oldView.collapsedGroupIds,
  'collapsedGroupIds must be cloned',
);
assert(preserved.value.pinnedItemIds !== oldView.pinnedItemIds, 'pinnedItemIds must be cloned');
assert(preserved.value.annotations !== oldView.annotations, 'annotations must be cloned');
assert(preserved.value.emphasis !== oldView.emphasis, 'emphasis must be cloned');
assert(
  JSON.stringify({ oldSource, oldView, targetConfig }) === inputReceipt,
  'successful migration must not mutate inputs',
);

const mismatches: readonly CategoricalComparisonChartConfig[] = [
  { ...targetConfig, data: { ...targetSource, datasetId: 'different-dataset' } },
  { ...targetConfig, type: 'bar' },
  {
    ...targetConfig,
    data: {
      ...targetSource,
      items: [targetSource.items[0], { ...targetSource.items[1], id: 'east' }],
    },
  },
];

for (const mismatch of mismatches) {
  const before = JSON.stringify({ oldSource, oldView, mismatch });
  const rejected = preserveCategoricalNarrative(oldSource, oldView, mismatch);
  assert(!rejected.ok, 'incompatible narrative must be rejected');
  assert(rejected.reason === 'INCOMPATIBLE_NARRATIVE', 'failure reason must stay closed');
  assert(
    JSON.stringify({ oldSource, oldView, mismatch }) === before,
    'mismatch rejection must be atomic',
  );
}
```

迁移前必须由宿主验证业务含义，不能把单个 scalar amount 自动复制为多个 series，不能猜测 Actual/Budget
名称，也不能把旧 revision/history 伪装为一次 v3 command。只有 `ok: true` 的结果可以使用；任何 precondition
或 validator failure 都原子终止迁移。

## 接入检查

1. 只从声明的 package exports 导入，不导入 `src/` 或 `dist/`。
2. UI 只引入一次 `tellplot/styles.css`。
3. 升级后运行 TypeScript strict，修复 exhaustive union 分支。
4. 分别回归 legacy v1、current v2 和 comparison v3 的校验、持久化、编辑与 image export。
