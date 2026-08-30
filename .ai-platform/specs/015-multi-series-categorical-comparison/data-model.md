# G003 多序列分类比较数据模型

## Metadata

- Version: 0.1.0
- Status: Confirmed
- Feature ID: `015-multi-series-categorical-comparison`
- Goal ID: `G003`
- Last updated: 2026-08-12
- Compatibility target: legacy schema `1.0.0`、current schema `2.0.0` 与 comparison schema `3.0.0`
- Approval: 用户于 2026-08-12 明确批准本精确 public type 与 wire contract

## Design Decisions

- schema `3.0.0` 只表示多序列 categorical comparison；不修改 schema `1.0.0` 或 `2.0.0` 的 closed
  wire shape。
- category 是唯一叙事叶子，series 是 source-owned comparison dimension；series value 不成为
  `ViewNodeId`，也不进入 `ViewSpec`、command、selection 或 history。
- v3 source 使用 2 至 4 series 的 dense matrix。每个 category 必须显式、唯一且按声明顺序覆盖全部
  series；missing 不等于 `0`。
- v3 source 不定义 scalar `amount`。普通 category 和 collapsed group 都只具有逐 series 数值，不产生
  category/group total。
- 现有 v2 scalar categorical source、datum 和 projector 保持独立精确合同；v3 使用独立命名类型与
  `projectCategoricalComparison`。
- bar 与 column 仍是同一 categorical family 的两种 layout，不增加新的 chart type 或 data kind。

## Public Type Model

### Version And Identifier

```typescript
export type LegacySchemaVersion = '1.0.0';
export type CurrentSchemaVersion = '2.0.0';
export type ComparisonSchemaVersion = '3.0.0';

export type SchemaVersion = LegacySchemaVersion | CurrentSchemaVersion | ComparisonSchemaVersion;

export type SeriesId = BrandedId<'SeriesId'>;
```

`LegacySchemaVersion` 与 `CurrentSchemaVersion` 的名称和 literal 含义保持不变。`SeriesId` 是公开的
branded string，但不加入 `ViewNodeId`。category ID 与 series ID 可以具有相同 string value；两者通过
字段上下文和 TypeScript brand 隔离，validator 不执行跨 namespace 冲突检查。

### Comparison Source

```typescript
export interface CategoricalComparisonSeries {
  readonly id: SeriesId;
  readonly label: string;
  readonly metadata?: Readonly<Record<string, MetadataValue>>;
}

export interface CategoricalComparisonValue {
  readonly seriesId: SeriesId;
  readonly amount: number;
  readonly sourceRef?: string;
  readonly metadata?: Readonly<Record<string, MetadataValue>>;
}

export interface CategoricalComparisonSourceItem {
  readonly id: SourceItemId;
  readonly label: string;
  readonly sourceRef?: string;
  readonly metadata?: Readonly<Record<string, MetadataValue>>;
  readonly values: readonly CategoricalComparisonValue[];
}

export interface CategoricalComparisonSourceData {
  readonly schemaVersion: ComparisonSchemaVersion;
  readonly dataKind: 'categorical';
  readonly datasetId: DatasetId;
  readonly currency?: string;
  readonly series: readonly CategoricalComparisonSeries[];
  readonly items: readonly CategoricalComparisonSourceItem[];
}
```

闭合字段集合为：

| Object        | Allowed own enumerable data fields                                      |
| ------------- | ----------------------------------------------------------------------- |
| v3 source     | `schemaVersion`、`dataKind`、`datasetId`、`currency`、`series`、`items` |
| series        | `id`、`label`、`metadata`                                               |
| category item | `id`、`label`、`sourceRef`、`metadata`、`values`                        |
| value         | `seriesId`、`amount`、`sourceRef`、`metadata`                           |

category item 明确不接受 scalar `amount`。series/value 不允许额外 `kind`、color、display order、formatter
或 G2 option。颜色和 legend 属于 `ChartConfig.appearance`，不属于 source 事实。

### Existing Union Delta

以下 existing concrete types 精确保留：

- `WaterfallSourceItem`、`CategoricalSourceItem`、`SourceItem`、`SourceItemKind`。
- `LegacyWaterfallSourceData`、`WaterfallSourceData`、`CategoricalSourceData`。
- `LegacyWaterfallViewSpec`、`CurrentViewSpec`。
- `ChartType = 'waterfall' | 'bar' | 'column'`。
- `SourceDataKind = 'waterfall' | 'categorical'`。

只扩展 public unions：

```typescript
export type SourceDataItem =
  WaterfallSourceItem | CategoricalSourceItem | CategoricalComparisonSourceItem;

export type SourceData =
  | LegacyWaterfallSourceData
  | WaterfallSourceData
  | CategoricalSourceData
  | CategoricalComparisonSourceData;
```

因此 `SourceDataItem.amount` 不再是整个 union 的公共字段。`dataKind === 'categorical'` 也不足以判断
scalar item；consumer 必须继续用 `schemaVersion` 区分 v2 与 v3。

## Source Invariants

### Series Registry

- `series` 是 dense array，长度为 2 至 4。
- series ID 必须是 trim 后非空的 string，并按原始 string value 唯一；validator 不 trim 或改写输入。
- series label 必须 trim 后非空。唯一性比较 key 为
  `label.trim().normalize('NFC')`，大小写敏感；validator 不把规范化结果写回 source。
- series array order 是 marks、legend、Tooltip、Inspector、摘要、导出和默认 palette ordinal 的唯一顺序。
- series metadata 只接受 `string | boolean | null | finite number`；不接受 array、object value、`NaN`
  或 infinity。

### Category Matrix

- `items` 是 dense array，可以为空；source order 是 initial view 的 category order。
- category ID 必须 trim 后非空并按原始 string value 唯一；category label 必须 trim 后非空，允许重复。
- 每个 `values` 是 dense array，长度与 series registry 一致。
- 每个 value 的 `seriesId` 必须匹配一个 declared series；同一 category 不允许 duplicate、unknown 或
  missing series reference。
- `values[index].seriesId` 必须等于 `series[index].id`。完整覆盖但顺序不同仍是 invalid source。
- `amount` 必须是 finite number 且 `Math.abs(amount) <= Number.MAX_SAFE_INTEGER`；`0` 和 `-0` 都是
  合法的显式零，并在 v3 业务语义上等价。validator 保留调用方输入，因此成功结果仍可包含 `-0`；
  projector、formatter 与 fingerprint canonicalizer 不把负零作为独立业务值。
- `sourceRef` 如果存在必须是 string；空 string 延续既有 schema 语义并保持合法。
- category/value metadata 使用与 series metadata 相同的 primitive 和 closed-data 规则。
- validation success 保留调用方输入 identity，不 clone、freeze、normalize 或 upgrade。

## ViewSpec

```typescript
export interface CategoricalComparisonViewSpec {
  readonly schemaVersion: ComparisonSchemaVersion;
  readonly datasetId: DatasetId;
  readonly chartType: 'bar' | 'column';
  readonly revision: number;
  readonly rootOrder: readonly ViewNodeId[];
  readonly groups: Readonly<Record<GroupId, ViewGroup>>;
  readonly collapsedGroupIds: readonly GroupId[];
  readonly pinnedItemIds: readonly SourceItemId[];
  readonly annotations: Readonly<Record<ViewNodeId, Annotation>>;
  readonly emphasis: Readonly<Record<ViewNodeId, Emphasis>>;
}

export type ViewSpec = LegacyWaterfallViewSpec | CurrentViewSpec | CategoricalComparisonViewSpec;
```

v3 ViewSpec 的 closed fields 与既有 narrative view 相同。规则为：

- `rootOrder`、group `childIds`、pin、annotation 和 emphasis 只引用 category/group node。
- series ID 即使与 category ID string 相同，也不会因存在于 top-level `series` 而成为合法 tree reference。
- 每个 category 恰好在规范化叙事森林中出现一次；group 规则、revision、annotation 长度和 emphasis
  规则沿用现有 categorical contract。
- 只有 category 可以 pin；包含 pinned descendant 的 group 继续被视为 locked，但没有 group pin 字段。
- series order、series color 与 legend state 不持久化到 ViewSpec。

## Initial View

现有函数签名不变，返回 union 扩展后的 `ViewSpec`：

```typescript
export function createInitialViewSpec(
  sourceData: SourceData,
  options?: InitialViewSpecOptions,
): ValidationResult<ViewSpec>;
```

对 `CategoricalComparisonSourceData`：

- 未指定 `options.chartType` 时确定性地使用 `column`。
- 只接受显式 `bar | column`；`waterfall` 返回
  `SOURCE_CONFLICT / INCOMPATIBLE_CHART_TYPE /chartType`。
- `rootOrder` 是全部 category item ID 的 source order。
- 输出 `CategoricalComparisonViewSpec`，revision 为 `0`，groups/collapse/pin/annotation/emphasis 为空。

## Comparison Projection

```typescript
export type CategoricalComparisonDatumKind = 'category' | 'group';

export interface CategoricalComparisonSeriesValue {
  readonly seriesId: SeriesId;
  readonly label: string;
  readonly amount: number;
}

export interface CategoricalComparisonDatum {
  readonly nodeId: ViewNodeId;
  readonly label: string;
  readonly values: readonly CategoricalComparisonSeriesValue[];
  readonly kind: CategoricalComparisonDatumKind;
  readonly sourceIds: readonly SourceItemId[];
  readonly locked: boolean;
  readonly order: number;
}

export type CategoricalComparisonProjection = readonly CategoricalComparisonDatum[];

export type CategoricalComparisonProjectionResult =
  ValidationResult<CategoricalComparisonProjection>;

export function projectCategoricalComparison(
  sourceData: SourceData,
  viewSpec: ViewSpec,
): CategoricalComparisonProjectionResult;
```

Projection rules：

1. projector 先执行完整 source validation，再执行 source/view compatibility 与 narrative invariant validation；
   失败原样返回该层 issues，不返回部分数据。只有 source 与 view 构成彼此兼容的有效 pair 后，projector
   generation 才参与判定。
2. expanded group 递归输出可见后代，collapsed group 输出一个 `kind: 'group'` datum。
3. 普通 category 的 `values` 按 source series 顺序复制 `seriesId`、series `label` 和 `amount`；任何满足
   `amount === 0` 的输入都输出正零。
4. collapsed group 为每个 series 建立独立 Neumaier compensated accumulator，按叙事叶子顺序聚合后代。
5. 任一 series 的 accumulator 变为 non-finite 或超出 safe range 时整个 projection 失败；path 指向触发
   failure 的 source value。合法 accumulator 的零结果统一输出正零。
6. `sourceIds` 只包含 category leaf IDs，并按叙事叶子顺序排列；不存在重复或 series ID。
7. `locked` 对普通 category 等于自身 pin 状态；对 collapsed group 等于是否包含 pinned descendant。
8. `order` 是可见 projection 的 zero-based index；同一有效输入重复调用 deep-equal。
9. projection 不包含 color、mark key、G2 encode、metadata 或计算出的跨 series total。

现有 `CategoricalDatumKind`、`CategoricalDatum`、`CategoricalProjection`、
`CategoricalProjectionResult` 和 `projectCategorical(SourceData, ViewSpec)` 的 v2 signature/return 精确不变，
不增加 overload。`projectCategorical` 接到彼此兼容的有效 v3 pair，或 `projectCategoricalComparison` 接到
彼此兼容的有效非 v3 pair 时，返回
`SOURCE_CONFLICT / INCOMPATIBLE_PROJECTOR_GENERATION /schemaVersion`，表示调用的 projector 不接受该
source/view generation；不伪造 view/source mismatch 或 chart layout 冲突。invalid source 优先返回 source
issues，source/view generation mismatch 优先返回 `SCHEMA_VERSION_MISMATCH`。四种 v2/v3 source/view pairing
均需固定 precedence 测试。

## Compatibility Matrix

| Source                          | Compatible ViewSpec        | Compatible `ChartConfig.type` | Projector                      |
| ------------------------------- | -------------------------- | ----------------------------- | ------------------------------ |
| schema 1 legacy waterfall       | schema 1 `waterfall`       | `waterfall`                   | `projectWaterfall`             |
| schema 2 waterfall              | schema 2 `waterfall`       | `waterfall`                   | `projectWaterfall`             |
| schema 2 categorical            | schema 2 `bar` or `column` | `bar` or `column`             | `projectCategorical`           |
| schema 3 categorical comparison | schema 3 `bar` or `column` | `bar` or `column`             | `projectCategoricalComparison` |

- source/view generation 不同：`SOURCE_CONFLICT / SCHEMA_VERSION_MISMATCH /schemaVersion`。
- source family 与 chart layout 不兼容：`SOURCE_CONFLICT / INCOMPATIBLE_CHART_TYPE /chartType`。
- ChartConfig 的 `type/data` 不兼容：相同 code/reason，path 为 `/type`。
- `sourceDataKind(v3)` 仍返回 `'categorical'`；不扩展 `SourceDataKind`。
- `viewMatchesChartConfig` 对任一不兼容 pairing 返回 `false`。

## Persistence And Fingerprint

- `serializeViewSpec` 保留 exact schema generation、chart type 和 narrative tree，不升级或降级。
- `parseViewSpec` 只接受与传入 source generation/dataset/family 兼容的 view，不执行 migration。
- record keys 继续稳定排序，ordered arrays 保持输入的逻辑顺序。
- v3 source fingerprint 按 source order 包含 schema、dataKind、dataset、currency、series 的
  id/label/metadata、category 的 id/label/sourceRef/metadata，以及每个 value 的
  seriesId/amount/sourceRef/metadata。
- metadata record keys 在 fingerprint canonical form 中排序；series/category/value arrays 不排序。
- v3 fingerprint canonical form 把 amount 和所有层级 numeric metadata 中的 `-0` 写为正零。因而只把
  `0` 替换为 `-0`（或反向）不会改变 fingerprint、触发 render 或重建 session；formatter 同样只显示正零。
  这项等价规则只适用于 v3，不改变 v1/v2 fingerprint、projection 或 formatting。
- fingerprint algorithm 继续是内部 deterministic consistency marker，不是公共安全 hash。
- series definition/order 或任一 source semantic field 改变时生成新 session，旧 undo/redo 与 processed
  action IDs 不跨 fingerprint 重放；仅 zero sign 的改变不属于 v3 semantic change。

## Package Boundary

本数据模型的 public types 由 `tellplot` 与 `tellplot/core` 导出。内部 private workspace package 版本保持
`0.0.0`；本地 public candidate 的 package version 为 `2.0.0`。本目标不包含 npm publish、tag、GitHub
Release 或 production promotion。

## Approval Gate

本文与 `contracts/public-api.md`、`contracts/validation.md`、`contracts/editor-api.md`、
`contracts/migration.md` 共同构成的 breaking public contract，以及 TDR-025、technical plan 与 T135-T141
work graph，均已于 2026-08-12 获得用户批准。当前仅 T135 为 `Ready` 并按其 packet 实现本数据模型基础；
T136-T141 由串行前置依赖阻塞。
