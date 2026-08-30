# TellPlot 2.0 Comparison Migration Contract

## Metadata

- Version: 0.1.0
- Status: Confirmed
- Feature ID: `015-multi-series-categorical-comparison`
- Last updated: 2026-08-12
- Approval: 用户于 2026-08-12 明确批准本 2.0 migration contract

## Compatibility Promise

`tellplot@2.0.0` 继续读取、验证、运行、编辑、导出和序列化：

- legacy waterfall schema `1.0.0`。
- waterfall schema `2.0.0`。
- scalar categorical schema `2.0.0`。

existing JSON/source/view 不需要迁移即可继续运行；v1/v2 validator success 继续保留 input identity，
wire round-trip 不增加 schema 3 fields。2.0 不删除 v1/v2 concrete types、commands、projectors、entrypoints
或运行时行为。

2.0 的 source-level break 来自 public union expansion。以下 consumer 需要代码迁移：

- 对 `SchemaVersion`、`SourceData`、`ViewSpec` 或 `ValidationIssueReason` 做 exhaustive narrowing。
- 把 `SourceDataItem` 当作一定具有 scalar `.amount`。
- 只按 `dataKind === 'categorical'` 判断 scalar categorical shape。
- 只按 `config.type === 'bar' | 'column'` 判断 scalar categorical config。
- 对 `ChartAppearance` union 直接访问 `colors.positive` 或 `colors.negative`。

## TypeScript Narrowing

### SourceData

```typescript
function categoricalCellCount(source: SourceData): number {
  if (source.schemaVersion === '2.0.0' && source.dataKind === 'categorical') {
    return source.items.length;
  }

  if (source.schemaVersion === '3.0.0') {
    return source.items.reduce((count, item) => count + item.values.length, 0);
  }

  return 0;
}
```

`dataKind` 保持两值 union，但 v3 也使用 `'categorical'`；schema generation 是必要 discriminator。

### ChartConfig

```typescript
function barOrColumnValueCount(config: ChartConfig): number {
  if (config.type !== 'bar' && config.type !== 'column') return 0;

  if (config.data.schemaVersion === '2.0.0') {
    return config.data.items.length;
  }

  return config.data.items.reduce((count, item) => count + item.values.length, 0);
}
```

当 nested `config.data.schemaVersion` 没有把 outer `ChartConfig` 自动收窄到 concrete member 时，先保存
`config.data` 的 narrow 结果，或使用 host-owned type guard：

```typescript
function isScalarCategoricalConfig(config: ChartConfig): config is CategoricalChartConfig {
  return (
    (config.type === 'bar' || config.type === 'column') &&
    config.data.schemaVersion === '2.0.0' &&
    config.data.dataKind === 'categorical'
  );
}

declare const config: ChartConfig;

if (isScalarCategoricalConfig(config)) {
  const positiveColor: string | undefined = config.appearance?.colors?.positive;
}
```

### Validation Reasons

consumer 对 `issue.reason` 使用 exhaustive switch 时必须增加八个 series-specific cases 和一个
projector-generation case。consumer 不应匹配 English `message` 代替 stable `code/reason/path`。

### Financial Appearance Mapper

`toFinancialChartAppearance(config: ChartConfig)` signature 保持不变。它对 comparison config 只返回共同
appearance fields 和 group semantic color，并在 v3 tooltip 省略时显式返回 `tooltip: true`；comparison series palette/legend 由 editor internal resolver
解析，不塞入 `FinancialChartPalette` 的 positive/negative semantic slots。existing generic call site 无需迁移，
但不得把该返回值误认为完整 comparison appearance。

## Constructing V3 Source

TellPlot 不提供 `migrateSourceData`、不把单个 v2 scalar source 包成不合法的 one-series v3，也不猜测
Actual/Budget、Current/Prior 等业务名称。宿主必须拥有至少两组真实业务数据并显式对齐 category ID。

```typescript
const comparisonSource: CategoricalComparisonSourceData = {
  schemaVersion: '3.0.0',
  dataKind: 'categorical',
  datasetId: 'forecast-2026',
  currency: 'CNY',
  series: [
    { id: 'actual', label: 'Actual' },
    { id: 'budget', label: 'Budget' },
  ],
  items: [
    {
      id: 'north',
      label: 'North',
      values: [
        { seriesId: 'actual', amount: 120 },
        { seriesId: 'budget', amount: 135 },
      ],
    },
  ],
};
```

每个 category 的 values 必须按 top-level series 顺序完整覆盖。宿主对缺失业务值做显式业务决策；TellPlot
不把 absent value 解释为 `0`。

## View Migration Paths

### Reset Narrative

宿主构造并验证 v3 source 后调用：

```typescript
const initial = createInitialViewSpec(comparisonSource, { chartType: 'column' });
```

该路径创建 revision `0` 的 source-order view，明确丢弃旧排序、group、pin、annotation、emphasis 与 history。

### Preserve Narrative

TellPlot 首期不导出 `migrateViewSpec`。宿主可以使用文档化的 deterministic host-side conversion，但必须
满足全部 preconditions：

1. old view 是 schema 2 `bar | column`，且已经对 old scalar source 完整 validation。
2. target config 是使用有效 schema 3 source 的 `CategoricalComparisonChartConfig`。
3. old/new dataset ID 完全相同。
4. old view chart type 与 target config type 完全相同。
5. old/new category ID sets 完全相同；source order 可以不同。

下面是 host-side reference function。它不成为 TellPlot runtime export；host 可以改用自己的 error type，但
必须保留同一 validation、precondition 与 clone 顺序。成功时创建独立 containers，不复用 mutable
arrays/records：

```typescript
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

function preserveCategoricalNarrative(
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

只有 `result.ok === true` 才能使用 `result.value`。precondition 不满足或 validation 失败时，迁移原子失败；
不得删除未知节点、重排、猜测 ID、保留 old revision 或产生 partial view。reference-only
`INCOMPATIBLE_NARRATIVE` 不是 TellPlot public error reason。

## Session And Controlled Host

- schema 2 -> 3 必须创建新 session，清空 undo/redo 与 processed action IDs。
- uncontrolled host 使用 v3 initial/default view；old session 不跨 generation 复用。
- controlled DOM update 必须在一次 `editor.update` 中同时提供 v3 config 与 compatible v3 view。
- React 必须在同一次 render、Vue 必须在同一次 reactive flush 提交 config/view；intermediate incompatible
  update 会被原子拒绝。
- `parseViewSpec` 永不跨 schema generation 迁移。serialized v2 view 与 v3 source 始终返回
  `SCHEMA_VERSION_MISMATCH`。
- selection 只在明确的 same-generation source semantic update 中按 contract 保留；v2 -> v3 generation
  change 清空 selection。

## Packaging And Release

- implementation 完成后本地 `packages/tellplot/package.json` candidate version 为 `2.0.0`。
- private `@tellplot/*` workspace layer versions 保持 `0.0.0`，不独立发布。
- public export map 与 subpath 不改变。
- G003 不执行 npm publish、tag、push、PR、GitHub Release 或 production promotion；这些动作需要独立批准。

## Executable Documentation

实现阶段必须用 isolated TypeScript fixtures 验证：

- unchanged v1/v2 concrete sources/views/configs 继续编译和运行。
- union exhaustive consumer 按本文新增 v3 branch 后编译。
- v2 scalar categorical 原样运行，不迁移。
- v3 source construction、reset view 与 preserve-narrative sample 通过 typecheck/validation。
- dataset、chart type 或 category ID set mismatch 的 preserve path 原子失败。
- `parseViewSpec` 不执行 implicit migration。

## Approval Gate

本文固定 2.0 的 runtime compatibility、source migration 与 host-owned view conversion，并已于
2026-08-12 获得用户明确 breaking approval；TDR-025、technical plan 与 work graph 也已获批。G003 仍不创建
migration helper；当前 T135 不修改 package version，后续 package/runtime 工作由 T136-T140 的串行依赖控制。
