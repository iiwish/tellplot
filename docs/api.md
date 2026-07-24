# TellPlot 公共 API

`@tellplot/editor` 使用单一 runtime/type 入口；样式使用 `@tellplot/editor/styles.css`。
以下 runtime、类型、schema 与错误语义属于 1.x 兼容合同，详细政策见
[版本、兼容与弃用政策](versioning.md)。

## Runtime Exports

| Export                  | 用途                                |
| ----------------------- | ----------------------------------- |
| `ChartEditor`           | 声明式 React 编辑器组件             |
| `validateChartConfig`   | 校验不可信公共配置                  |
| `createInitialViewSpec` | 为合法 config data 创建兼容初始视图 |
| `validateSourceData`    | 验证不可信 source                   |
| `validateViewSpec`      | 验证 source/view 不变量             |
| `parseViewSpec`         | 解析持久化 ViewSpec JSON            |
| `serializeViewSpec`     | 确定性序列化 ViewSpec               |
| `createEditorSession`   | 创建不可变命令会话                  |
| `executeCommand`        | 执行确定性编辑命令                  |
| `undoSession`           | 撤销一个会话动作                    |
| `redoSession`           | 重做一个会话动作                    |

## ChartEditor

| Prop                | 类型                    | 说明                         |
| ------------------- | ----------------------- | ---------------------------- |
| `config`            | `ChartConfig`           | 必填的声明式图表配置         |
| `view`              | `ViewSpec`              | 受控可编辑视图               |
| `defaultView`       | `ViewSpec`              | 非受控初始视图               |
| `onViewChange`      | `(view, event) => void` | 成功命令产生的新视图         |
| `onCommand`         | `(event) => void`       | 成功命令事件                 |
| `onCommandRejected` | `(error) => void`       | 结构化命令错误               |
| `onConfigRejected`  | `(issues) => void`      | 配置或 config/view 冲突      |
| `onSelectionChange` | `(selection) => void`   | 稳定 node/source ID 选择状态 |

组件 ref 为 `ChartEditorHandle`：

- `focus()`：把焦点移入编辑器。
- `getView()`：读取当前有效 `ViewSpec`。
- `exportImage(options)`：导出 SVG 或 PNG。

## ChartConfig

`ChartConfig` 是判别联合：

- `type: 'waterfall'` + waterfall source + `WaterfallChartAppearance`。
- `type: 'bar' | 'column'` + categorical source + `CategoricalChartAppearance`。

通用字段为 `data`、`locale`、`height`、`appearance` 和 `editor`。分类 appearance 的 colors 不包含
waterfall-only 的 start、subtotal 和 end。

`appearance.labels.value` 与 `appearance.labels.group` 支持字符串显示策略简写，也支持对象式标签配置。
对象配置提供 `display`、`placement`、`offset`、`color`、`fontSize`、`fontWeight`、`background`、
`backgroundColor` 和 `backgroundOpacity`。配置保持纯数据，不接受 formatter 或 G2 callback。

## 数据与视图

`SourceData` 是严格判别联合：

- legacy waterfall：`schemaVersion: '1.0.0'`。
- current waterfall：`schemaVersion: '2.0.0'`、`dataKind: 'waterfall'`。
- current categorical：`schemaVersion: '2.0.0'`、`dataKind: 'categorical'`。

`ViewSpec` 保存 dataset、schema、chart type、revision、顺序、分组、折叠、固定、注释和强调。编辑器命令
创建新的 ViewSpec，不修改 `config.data`。

## ValidationResult

配置、数据、视图和初始化函数返回：

```ts
type ValidationResult<T> =
  | { readonly ok: true; readonly value: T; readonly errors: readonly [] }
  | { readonly ok: false; readonly errors: readonly ValidationIssue[] };
```

错误包含稳定 `code`、`reason`、JSON Pointer `path` 和不含业务值的 `details`。

## 命令与会话

`EditorCommand` 是封闭 discriminated union。`CommandSource` 为 `direct | outline | keyboard | host`。
支持移动、分组、取消分组、折叠、展开、固定、注释和历史操作。

## 导出

`ExportOptions` 支持 `svg`/`png`、`pixelRatio`、`background` 和 `filename`。返回 `ExportResult` 包含
`blob`、`mimeType`、`suggestedFilename`、`width` 和 `height`。

## Internal Boundary

G2 `Chart`、`G2Spec`、projection、scene bounds、chart-family modules、screen/export runtime 和 pointer
geometry 不是公共 API。
