# G003 Public API Contract

## Metadata

- Version: 0.1.0
- Status: Confirmed
- Feature ID: `015-multi-series-categorical-comparison`
- Package candidate: `tellplot@2.0.0`
- Last updated: 2026-08-12
- Approval: 用户于 2026-08-12 明确批准本 breaking public API contract

## Public Entrypoints

公共 export map 不增加 subpath：

- `tellplot`
- `tellplot/core`
- `tellplot/react`
- `tellplot/vue`
- `tellplot/styles.css`

comparison domain/config/projection types 与 runtime projector 从 `tellplot` 和 `tellplot/core` 导出。
React/Vue subpath 继续只导出其已有 component/props/handle 与 common `ChartConfig`/`ViewSpec` 等类型，
不增加 framework-specific comparison model。

## New Named Exports

### Runtime

```typescript
export function projectCategoricalComparison(
  sourceData: SourceData,
  viewSpec: ViewSpec,
): CategoricalComparisonProjectionResult;
```

这是唯一新增的 core runtime export。首期不导出 migration helper、comparison appearance resolver、G2
spec factory、palette resolver、scene receipt 或 geometry adapter。

### Types

新增以下 16 个 named type exports：

1. `SeriesId`
2. `ComparisonSchemaVersion`
3. `CategoricalComparisonSeries`
4. `CategoricalComparisonValue`
5. `CategoricalComparisonSourceItem`
6. `CategoricalComparisonSourceData`
7. `CategoricalComparisonViewSpec`
8. `CategoricalComparisonDatumKind`
9. `CategoricalComparisonSeriesValue`
10. `CategoricalComparisonDatum`
11. `CategoricalComparisonProjection`
12. `CategoricalComparisonProjectionResult`
13. `CategoricalComparisonSeriesColor`
14. `CategoricalComparisonChartColors`
15. `CategoricalComparisonChartAppearance`
16. `CategoricalComparisonChartConfig`

data/view/projection 的精确字段见 `../data-model.md`。

## Comparison ChartConfig

```typescript
export interface CategoricalComparisonSeriesColor {
  readonly seriesId: SeriesId;
  readonly color: string;
}

export interface CategoricalComparisonChartColors {
  readonly series?: readonly CategoricalComparisonSeriesColor[];
  readonly group?: string;
}

export interface CategoricalComparisonChartAppearance {
  readonly title?: string;
  readonly colors?: CategoricalComparisonChartColors;
  readonly legend?: boolean;
  readonly axes?: ChartAxes;
  readonly labels?: ChartLabels;
  readonly tooltip?: boolean;
  readonly animation?: ChartAnimation;
  readonly groupRegion?: ChartGroupRegion;
  readonly numberFormat?: ChartNumberFormat;
}

export interface CategoricalComparisonChartConfig {
  readonly type: 'bar' | 'column';
  readonly data: CategoricalComparisonSourceData;
  readonly locale?: ChartLocale;
  readonly height?: number | string;
  readonly appearance?: CategoricalComparisonChartAppearance;
  readonly editor?: ChartEditorOptions;
}
```

实现可以用现有 internal `ChartAppearanceBase` / `ChartConfigBase` 表达相同字段，但 emitted declaration 必须
保持上述 readonly structural contract。

Existing concrete types 精确保留：

```typescript
export type CategoricalChartAppearance = ChartAppearanceBase<ChartColors>;
export type WaterfallChartAppearance = ChartAppearanceBase<WaterfallChartColors>;

export type CategoricalChartConfig = ChartConfigBase<
  'bar' | 'column',
  CategoricalSourceData,
  CategoricalChartAppearance
>;
```

`CategoricalChartConfig` 不宽化成 v2/v3 data union。comparison 是独立 third branch：

```typescript
export type ChartAppearance =
  CategoricalChartAppearance | WaterfallChartAppearance | CategoricalComparisonChartAppearance;

export type ChartConfig =
  WaterfallChartConfig | CategoricalChartConfig | CategoricalComparisonChartConfig;
```

`config.type === 'bar' || config.type === 'column'` 不足以访问 scalar `config.data.items[].amount`；consumer
必须继续判断 `config.data.schemaVersion`。

## Appearance Semantics

### Default Palette

v3 series 按 source ordinal 使用固定 palette：

| Series index | Default color | Contrast against white | Minimum pairwise CIEDE2000 |
| ------------ | ------------- | ---------------------- | -------------------------- |
| 0            | `#0072B2`     | 5.19:1                 | 38.40                      |
| 1            | `#D55E00`     | 3.87:1                 | 37.02                      |
| 2            | `#009E73`     | 3.42:1                 | 38.40                      |
| 3            | `#CC79A7`     | 3.06:1                 | 37.02                      |

表中的 pairwise 列给出该颜色与其余 palette 的最小 CIEDE2000 距离。默认 expanded group semantic color
继续是 `#A46812`。series 颜色只表示 series identity，不表示 positive/negative/group。

### Series Overrides

- `appearance.colors.series` 缺省或 `[]` 时全部使用 ordinal defaults。
- array 可以部分或完整覆盖 2 至 4 个 series；未列出的 series 继续使用其 source index default。
- entry 按 `seriesId` 解析。entry array order 不改变 marks、legend、Tooltip 或 source series order，也不作为
  第二套排序状态。
- array 使 duplicate ID 在 JSON/JavaScript validation 前仍然可观察；同一 series 最多出现一次。
- unknown ID、duplicate ID、non-plain entry 或 invalid color 使整个 config validation 原子失败且不返回
  partial value；live editor 按 existing contract 进入 stable invalid state，而不是保留前一个 ordinary config。
- color 接受现有 case-insensitive hex contract：`#RGB`、`#RGBA`、`#RRGGBB` 或 `#RRGGBBAA`。
- custom colors 不执行自动对比度修正、去重或规范化；相同 color value 可以配置给不同 series，series
  仍必须通过 label 与顺序识别。screen/SVG/PNG 使用相同 literal color。
- v3 `appearance.colors` 只接受 `series` 与 `group`；`positive`、`negative`、`start`、`subtotal`、`end`
  是 unknown fields。
- v2 categorical 的 `appearance.colors` 继续只接受 `positive | negative | group`；v2 不接受 `series`
  或 `legend`。

### Legend And Tooltip

- v3 `appearance.legend` 缺省为 `true`；`false` 同时隐藏 screen、SVG 和 PNG legend。
- legend 只读，禁止 filter、highlight、hide、select、reorder 或 host callback。
- v3 `appearance.tooltip` 缺省为 `true`，启用 category-shared Tooltip；`false` 关闭。
- v1/v2 tooltip default 保持 `false`，不存在 default behavior change。
- Tooltip 内容由 TellPlot 安全构造，不接受 formatter callback 或 G2 options。

### Labels And Group Appearance

`axes`、`labels`、`animation`、`groupRegion` 与 `numberFormat` 精确复用 existing public types 和校验范围。
`appearance.colors.group` 用于 expanded group region/label 等 group semantic surface，不覆盖 collapsed group
内各 series interval 的 series colors。

## Existing Runtime Signatures

以下函数名和参数列表保持，返回 alias 因 public union 扩展而包含 v3：

```typescript
export function validateSourceData(input: unknown): ValidationResult<SourceData>;

export function validateViewSpec(
  input: unknown,
  sourceData: SourceData,
): ValidationResult<ViewSpec>;

export function validateChartConfig(input: unknown): ValidationResult<ChartConfig>;

export function createInitialViewSpec(
  sourceData: SourceData,
  options?: InitialViewSpecOptions,
): ValidationResult<ViewSpec>;

export function parseViewSpec(
  serialized: string,
  sourceData: SourceData,
): ValidationResult<ViewSpec>;

export function serializeViewSpec(viewSpec: ViewSpec): string;
export function sourceDataKind(sourceData: SourceData): SourceDataKind;
export function viewMatchesChartConfig(view: unknown, config: ChartConfig): boolean;
```

`createEditorSession`、`executeCommand`、history、store、persistence、policy、selection 和 move/group helpers 的
函数名与参数结构不增加 comparison-specific overload。它们通过扩展后的 common aliases 接收 v3，并继续
只操作 category/group narrative state。

## Financial Appearance Compatibility

以下 existing types 与 resolver 精确不变：

- `FinancialChartAppearance`
- `ResolvedFinancialChartAppearance`
- `FinancialChartPalette`
- `resolveFinancialChartAppearance`
- `DEFAULT_FINANCIAL_CHART_PALETTE`
- `DEFAULT_FINANCIAL_CHART_NUMBER_FORMAT`

`FinancialChartAppearance.palette` 的 start/positive/negative/subtotal/group/end 语义无法无损表达 series
palette 或 legend。现有 mapper 签名保持不变：

```typescript
export function toFinancialChartAppearance(config: ChartConfig): FinancialChartAppearance;
```

对 v3 comparison config，该 mapper 只映射它的 title、axes、labels、tooltip、animation、group region、number
format 与 `colors.group` 等共同语义；当 v3 `appearance.tooltip` 省略时 mapper 显式物化 `tooltip: true`，
而 v1/v2 继续保持省略并由 existing resolver 得到 `false`。返回类型按定义不包含 series colors/legend。editor 内部 comparison
resolver 另外解析完整 series colors、legend 与 v3 tooltip default；该 resolver 及 resolved type不导出。

## Preserved Public Contracts

以下表面不新增 variant 或 wire command：

- `EditorCommand`、所有 command/payload、`CommandSource`、`CommandErrorCode/Reason`。
- `ChartType` 与 `SourceDataKind` literal unions。
- v1/v2 concrete source/view/config/appearance types。
- waterfall projection types/functions。
- v2 `CategoricalDatum*`、`CategoricalProjection*`、`projectCategorical`。
- `FinancialChartAppearance`、resolved appearance APIs 与 `toFinancialChartAppearance` signature。
- `ValidationErrorCode`。
- DOM `EditorOptions`/`EditorInstance`、export options/result/error。
- React props/handle 与 Vue props/emits/expose 字段。
- package export map、ESM/CJS/types/styles entrypoints。

## Intentional TypeScript Breaks

`tellplot@2.0.0` 明确包含以下 source-level changes：

| Surface                 | 2.0 impact                                                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `SchemaVersion`         | exhaustive switch 增加 `'3.0.0'`                                                                         |
| `SourceData`            | 增加 comparison variant；categorical 需按 schema 再 narrow                                               |
| `SourceDataItem`        | union 不再保证 scalar `.amount`                                                                          |
| `ViewSpec`              | 增加 `CategoricalComparisonViewSpec`                                                                     |
| `ChartConfig`           | bar/column 增加 v3 branch；仅按 `type` 不足以访问 scalar data                                            |
| `ChartAppearance`       | comparison member 没有 positive/negative；对 union 直接访问这些字段的 consumer 需按 config schema narrow |
| `ValidationIssueReason` | 增加 series-specific 与 projector-generation reasons                                                     |

具体 v1/v2 concrete type fixtures 继续编译；wire/runtime/persistence 不要求迁移。`ChartAppearance` declaration
增加 comparison member不是 discriminated exhaustive union，但直接访问只存在于旧 member 的
`appearance.colors.positive/negative` 会需要 source migration；优先从已按 `config.data.schemaVersion`
narrow 的 concrete config 读取 appearance。

## Internal Boundary

下列能力保持 private，不从任何 public subpath 导出：

- flattened comparison mark datum、collision-safe mark/label key encoder。
- G2 interval/point/text/range spec、dodge transform、scale/legend/Tooltip interaction options。
- series palette resolver、internal resolved comparison appearance。
- scene mark receipt、category geometry union、zero-band fallback、drag ghost adapter。
- chart runtime handle、G2 Chart instance、raw `G2Spec`、host formatter/callback 或 plugin registry。

## Approval Gate

本文已与 `../data-model.md`、`validation.md`、`editor-api.md` 和 `migration.md` 一起于 2026-08-12 获得
用户明确 breaking approval；TDR-025、technical plan 与 T135-T141 work graph 也已于同日获批。当前仅
T135 按 execution packet 建立 schema 3 与精确 public type 基础，后续 runtime 任务由串行依赖阻塞。
