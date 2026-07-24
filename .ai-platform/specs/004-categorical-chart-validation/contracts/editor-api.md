# `@tellplot/editor` 分类图公共 API 合同

## Metadata

- Version: 0.2.0
- Status: Confirmed
- Feature ID: `004-categorical-chart-validation`
- Package: `@tellplot/editor`
- Last updated: 2026-07-20
- Approval: 用户于 2026-07-19 明确批准分类图公共 API 合同

## Public Surface Delta

公共入口新增或扩展以下类型，不新增第二个组件包：

- `ChartType`
- `SourceDataKind`
- `WaterfallSourceData`
- `CategoricalSourceData`
- `WaterfallSourceItem`
- `CategoricalSourceItem`
- `InitialViewSpecOptions`
- 扩展后的 `SourceData`、`ViewSpec` 与 `SchemaVersion` 判别联合

现有 `SourceItem` 与 `SourceItemKind` export 保持 waterfall 含义，并分别作为 `WaterfallSourceItem` 与
`WaterfallSourceItemKind` 的兼容名称；已有 waterfall consumer 不需要改名。categorical consumer 使用新的
`CategoricalSourceItem`。

已有函数和组件保持相同名称：

- `FinancialChartEditor`
- `createInitialViewSpec`
- `createEditorSession`
- `executeCommand`
- `undoSession`
- `redoSession`
- `serializeViewSpec`
- `parseViewSpec`
- `validateSourceData`
- `validateViewSpec`

不导出 `projectWaterfall`、`projectCategorical`、G2 spec factory、chart policy、G2 chart instance、scene
bounds adapter、renderer、gesture state machine 或内部 chart registry。

## Initial View Contract

```typescript
interface InitialViewSpecOptions {
  readonly chartType?: ChartType;
}

function createInitialViewSpec(
  sourceData: SourceData,
  options?: InitialViewSpecOptions,
): ValidationResult<ViewSpec>;
```

- legacy/current waterfall source 只接受 `waterfall`；未提供 option 时默认 `waterfall`。
- categorical source 接受 `bar | column`；未提供 option 时默认 `column`。
- 显式不兼容类型返回 `SOURCE_CONFLICT / INCOMPATIBLE_CHART_TYPE`，path 为 `/chartType`。
- options 必须是 closed plain data；未知字段、accessor、symbol 或 hostile input 返回结构化 issue。
- 已有 `createInitialViewSpec(sourceData)` 调用继续对 legacy waterfall 产生当前 deep-equal 结果。

## Validation Contract

```typescript
function validateSourceData(input: unknown): ValidationResult<SourceData>;

function validateViewSpec(
  input: unknown,
  sourceData: SourceData,
): ValidationResult<ViewSpec>;
```

- validator 根据 `schemaVersion` 和 `dataKind` 选择精确 closed schema。
- legacy `1.0.0` waterfall 不接受新增 `dataKind`；current `2.0.0` source 必须包含合法 `dataKind`。
- validation success 保留调用方输入 identity，不克隆、冻结或升级。
- validation failure 累积稳定顺序 issue，不抛出预期输入异常。
- 错误 message/details 不包含 amount、label、sourceRef 或 metadata value。
- `validateViewSpec` 同时检查 dataset ID、schema generation 和 chart compatibility。

## Component Contract

`FinancialChartEditorProps` 不新增 G2、projection 或 chart callback。图表类型来自有效 `ViewSpec`：

```typescript
interface FinancialChartEditorProps {
  readonly sourceData: SourceData;
  readonly viewSpec?: ViewSpec;
  readonly defaultViewSpec?: ViewSpec;
  readonly historyLimit?: number;
  readonly locale?: 'zh-CN' | 'en-US';
  readonly readOnly?: boolean;
  readonly height?: number | string;
  readonly panels?: FinancialChartEditorPanels;
  readonly chartAppearance?: FinancialChartAppearance;
  readonly onViewSpecChange?: (next: ViewSpec, event: CommandEvent) => void;
  readonly onCommand?: (event: CommandEvent) => void;
  readonly onCommandRejected?: (error: CommandError) => void;
  readonly onSelectionChange?: (selection: SelectionState) => void;
}
```

Rules:

- source-only uncontrolled waterfall 保持当前初始化行为。
- source-only uncontrolled categorical 确定性初始化为 `column`。
- 宿主要初始化 `bar` 时，调用 `createInitialViewSpec(source, { chartType: 'bar' })` 并把结果作为
  `defaultViewSpec` 或受控 `viewSpec` 传入。
- `viewSpec` 与 `defaultViewSpec` 继续互斥；不兼容 source/view 显示结构化错误工作台，不初始化 G2。
- chart type 在当前 editor session 中保持不变。宿主替换受控 ViewSpec 时仍必须满足 schema generation 与
  source compatibility；本切片不把替换解释为可撤销命令。
- readOnly、selection、panels、callbacks 和 imperative handle 语义不变。

## Appearance Contract

`FinancialChartAppearance` wire shape 保持不变：

- categorical 普通 item amount `< 0` 映射 `palette.negative`，否则映射 `palette.positive`。
- categorical collapsed group 映射 `palette.group`。
- `palette.start`、`palette.subtotal`、`palette.end` 只由 waterfall 使用，但继续保留统一稳定类型。
- axis.x/axis.y 按实际视觉轴控制；bar 和 column 不交换配置字段含义。
- valueLabels、Tooltip、numberFormat 和 animation 使用现有安全解析规则。
- reduced motion 优先于 animation；导出禁用交互 Tooltip 与动画。

本切片不增加 `categoryColor`、`orientation`、raw theme、formatter callback 或 arbitrary G2 options。

## Persistence Contract

```typescript
function serializeViewSpec(viewSpec: ViewSpec): string;

function parseViewSpec(
  serialized: string,
  sourceData: SourceData,
): ValidationResult<ViewSpec>;
```

- serializer 保留输入 schema version 与 chart type，不把 `1.0.0` 自动升级为 `2.0.0`。
- parser 拒绝 schema generation、dataset ID 或 chart family 不兼容。
- bar 和 column 使用相同叙事树字段，但序列化保留具体 chart type。
- JSON 字段顺序继续确定；groups、annotations 和 emphasis record key 继续排序。
- parse/serialize 不执行 G2、DOM、formatter callback 或 host code。

## Command Contract

现有 `EditorCommand` union 和 wire schema 不变。执行结果保持：

- 成功命令只修改 `ViewSpec`，从不修改 SourceData。
- chart type 与 schema version 在成功命令、undo 和 redo 中保持不变。
- waterfall policy 保留 anchor 与 segment 约束。
- categorical policy 允许普通 item 在合法同父级位置移动，但 pinned item 与 pinned descendant 继续锁定。
- 直接操作、结构大纲、键盘和 host 继续使用同一命令语义。

内部 chart policy 不是公共 callback，宿主不能替换命令规则。

## Export Contract

`FinancialChartEditorHandle.exportImage` 和 `ExportOptions` 保持不变：

- renderer 根据当前 `ViewSpec.chartType` 选择内部投影和 G2 spec factory。
- bar、column 和 waterfall 均支持 SVG 与 PNG。
- 空 categorical source 生成合法的空图导出，保留标题、尺寸和背景，不抛出仅因零分类导致的错误。
- 活动 reorder preview、无 owner document 或 renderer failure 继续返回结构化 export error。
- SVG sanitizer、PNG pixel ratio、filename 和不触发下载的现有合同不变。
- screen/export spec 必须共享 data、encode、axis、label、palette、annotation 与 emphasis 语义。

## Accessibility Contract

- `AccessibleChartSummary` 根据 chart type 描述 waterfall、bar 或 column，但不暴露 renderer 术语。
- 分类摘要按 `ViewSpec.rootOrder` 的逻辑顺序输出；bar 的第一个节点对应最上方，column 对应最左侧。
- 金额使用与屏幕/导出相同的 locale、currency 和 numberFormat。
- Canvas 交互必须有结构大纲和键盘等价路径。
- 空分类图仍提供标题与“0 个可见分类”的可读摘要。

## Package And Compatibility

- `@antv/g2` 继续是 peer dependency 和唯一图表引擎。
- React、React DOM、G2 peer ranges 保持不变。
- 不增加新的 runtime dependency。
- ESM、CJS、`.d.ts` / `.d.cts` 和 `styles.css` export map 保持不变。
- current public entrypoint 不导出内部文件路径；内部目录移动不构成 API。

## Approval Gate

本合同已于 2026-07-19 经用户明确批准并由 T112-T116 实现。公共入口、ESM/CJS
与 declaration 继续仅暴露本文定义的数据、命令、editor 和 export 合同；chart family
projection/spec、G2 runtime、scene adapter 和 registry 保持内部且不属于公共 API。
