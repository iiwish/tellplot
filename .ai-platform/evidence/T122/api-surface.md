# T122 公共 API 表面

## Runtime Exports

```text
ChartEditor
createEditorSession
createInitialViewSpec
executeCommand
parseViewSpec
redoSession
serializeViewSpec
undoSession
validateChartConfig
validateSourceData
validateViewSpec
```

没有导出 `FinancialChartEditor`、G2Spec、G2 Chart instance、projection 或 runtime adapter。

## Primary React Contract

```ts
interface ChartEditorProps {
  config: ChartConfig;
  view?: ViewSpec;
  defaultView?: ViewSpec;
  onViewChange?: (next: ViewSpec, event: CommandEvent) => void;
  onCommand?: (event: CommandEvent) => void;
  onCommandRejected?: (error: CommandError) => void;
  onConfigRejected?: (issues: readonly ValidationIssue[]) => void;
  onSelectionChange?: (selection: SelectionState) => void;
}

interface ChartEditorHandle {
  focus(): void;
  exportImage(options: ExportOptions): Promise<ExportResult>;
  getView(): ViewSpec;
}
```

`view` 与 `defaultView` 互斥；组件首次渲染后不允许在受控和非受控模式之间切换。

## ChartConfig

```ts
type ChartConfig = WaterfallChartConfig | CategoricalChartConfig;
```

共同字段：

| Field | Purpose |
| --- | --- |
| `type` | `waterfall`、`bar` 或 `column` |
| `data` | 与 type 匹配的现有 `SourceData` |
| `locale` | `zh-CN` 或 `en-US` |
| `height` | 数字或 CSS 高度字符串 |
| `appearance` | 封闭语义外观配置 |
| `editor` | 编辑状态和 panel/layout 配置 |

waterfall 的 colors 可使用 start、positive、negative、subtotal、group、end；bar/column 只使用
positive、negative、group。坐标轴始终使用 category/value 语义，不向用户暴露内部 x/y 方向映射。

`appearance.labels.value` 和 `appearance.labels.group` 接受字符串显示策略或对象式配置。对象式配置的
公共字段为 `display`、`placement`、`offset`、`color`、`fontSize`、`fontWeight`、`background`、
`backgroundColor` 和 `backgroundOpacity`；不接受 formatter、逐项 callback、raw G2 label options 或
无法可靠作用于独立 text mark 的碰撞开关。

## State Ownership

- `ChartConfig`：宿主意图、不可变来源数据、图表家族、外观和编辑器 chrome。
- `ViewSpec`：顺序、分组、折叠、固定、注释、强调和 revision。
- G2：图形渲染、事件、场景边界和动画。
- TellPlot commands：所有直接操作、大纲、键盘和宿主编辑的唯一状态变更入口。

更换 config 时，兼容且仍能通过 source 校验的 view 会保留；data family、dataset 或 chart type
不兼容时创建新的初始 view。来源金额不会由图表编辑动作写回。

## Runtime Validation

`validateChartConfig(input)`：

- 拒绝未知字段、非法嵌套类型、非有限/越界数字、非法 hex 颜色和 source/type 冲突。
- 不读取 accessor，不执行 callback，不接受 raw G2 options。
- 返回现有 `ValidationResult<ChartConfig>`；issue 只包含稳定 code/reason/path，不携带标签、金额或 source 明细。

## Migration

beta 前普通接入映射为：

| Beta 前名称 | v1 名称 |
| --- | --- |
| `FinancialChartEditor` | `ChartEditor` |
| `sourceData` | `config.data` |
| `chartAppearance` | `config.appearance` |
| `panels` / `layout` / `readOnly` / `historyLimit` | `config.editor` |
| `viewSpec` / `defaultViewSpec` | `view` / `defaultView` |
| `onViewSpecChange` | `onViewChange` |
| `getViewSpec()` | `getView()` |

底层 `SourceData`、`ViewSpec`、commands、session 和 persistence API 保持兼容。
