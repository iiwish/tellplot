# TellPlot 错误处理

TellPlot 在公共边界使用稳定错误码和路径，不把原始数据值、标签、金额、G2 instance 或底层异常文本放入
普通错误详情。

## 数据与视图验证

`validateChartConfig`、`validateSourceData`、`validateViewSpec`、`createInitialViewSpec` 和
`parseViewSpec` 返回 `ValidationResult<T>`，不会用异常表示普通输入错误。

```ts
const result = validateSourceData(untrustedInput);

if (!result.ok) {
  for (const issue of result.errors) {
    console.error(issue.code, issue.reason, issue.path);
  }
}
```

常见 `ValidationErrorCode`：

- `INVALID_CHART_CONFIG`：公共图表配置字段、类型或范围不合法。
- `INVALID_SOURCE_DATA`：source schema、字段或数值不合法。
- `INVALID_VIEW_SPEC`：view schema、顺序、分组或引用不合法。
- `INVALID_SESSION_OPTIONS`：history 等会话选项不合法。
- `UNSUPPORTED_SCHEMA_VERSION`：schema generation 不受支持。
- `SOURCE_CONFLICT`：dataset、schema 或 chart type 与 source 不兼容。

`path` 使用 JSON Pointer 形式。`details` 只包含安全的结构信息，不应被当作用户原始内容。

## 命令拒绝

命令 API 返回 `CommandResult`。imperative/React 使用 `onCommandRejected`，Vue 使用
`command-rejected`，三者报告相同的 `CommandError`。

```tsx
import { ChartEditor } from 'tellplot/react';

<ChartEditor
  config={config}
  onCommandRejected={error => {
    console.error(error.code, error.reason, error.path, error.commandId);
  }}
/>;
```

常见 `CommandErrorCode` 包括 `INVALID_COMMAND`、`REVISION_CONFLICT`、`ITEM_LOCKED`、
`INVALID_DROP_TARGET`、`GROUP_TOO_SMALL` 和 `INVARIANT_VIOLATION`。拒绝是原子操作：session 和 view 保持
原有 identity，失败的命令不会写入历史。

宿主构造命令时使用 `source: 'host'`。未知 source literal 会以 `INVALID_COMMAND` 拒绝。

## Editor 生命周期错误

`createEditor` 和 imperative instance 使用 `TellPlotEditorError` 报告稳定的宿主生命周期错误。初始化失败会先
释放已经创建的 store、DOM、G2 和监听器，不会保留 container ownership，也不会暴露底层异常文本。

- `CONTAINER_UNAVAILABLE`：传入值不是可用的 `HTMLElement`。
- `CONTAINER_OWNED`：容器已经挂载一个 live TellPlot editor。
- `EDITOR_INITIALIZATION_FAILED`：配置读取或初始渲染期间发生不可恢复的宿主错误。
- `EDITOR_RENDER_FAILED`：update 后 DOM 界面渲染失败；当前状态显示稳定错误，后续 update 可以重试。
- `EDITOR_DESTROYED`：销毁后调用需要 live view 的实例方法。
- `VIEW_UNAVAILABLE`：当前没有合法 ViewSpec。

非法但可读取的 config/view 属于校验结果：编辑器进入 invalid 状态并调用 `onConfigRejected`，不会抛出
生命周期异常。无法安全读取的 options、未知 options 字段或非法 callback 类型在创建时抛出
`EDITOR_INITIALIZATION_FAILED`；同类 update 以 `EDITOR_RENDER_FAILED` 原子拒绝，并保留之前的状态和
callbacks。

销毁后的精确行为：`destroy` 可重复调用，`update`/`focus` 为 no-op，`dispatch`/`undo`/`redo` 返回 `null`，
`getView` 抛出 `EDITOR_DESTROYED`，`exportImage` 以 `EXPORT_UNAVAILABLE` 和 `/export` 拒绝。这样宿主可以安全
执行重复 cleanup，但不应继续读取已卸载实例。

## 图表渲染错误

G2 初始化或异步渲染失败时，编辑器显示可访问的稳定错误状态，并通过 `onRenderError` 报告
`{ code: 'CHART_RENDER_ERROR', path: '/chart' }`。React 使用同名 prop；Vue 使用 `render-error` 事件。
错误不会包含 G2 exception、原始标签、金额或数据内容。后续重试或有效更新成功后，错误界面消失，callback/
event 收到 `null`。失败期间直接操作保持禁用，避免用旧 scene bounds 修改新视图。

## 导出错误

`exportImage` 失败时抛出 `TellPlotExportError`；对应公共接口名为 `ExportError`。

```ts
try {
  await editorRef.current?.exportImage({ format: 'png', pixelRatio: 2 });
} catch (error) {
  if (error instanceof Error && error.name === 'TellPlotExportError' && 'code' in error) {
    console.error(error.code);
  }
}
```

导出错误码：

- `INVALID_EXPORT_OPTIONS`：格式、像素比、背景色或文件名无效。
- `EXPORT_UNAVAILABLE`：当前 DOM/Canvas 环境不能完成导出，或 editor 已在导出期间销毁。
- `EXPORT_FAILED`：G2 渲染或格式编码失败。

## 接入排查

- 图表无样式：确认应用入口导入所用包的 `styles.css` subpath。
- 图表配置无效：先调用 `validateChartConfig`，按 issue 的 `code` 与 `path` 修正公开配置。
- 图表显示 data/view 冲突：重新用当前 data 调用 `createInitialViewSpec`，或校验恢复的 view。
- 条形图初始化失败：只有 current categorical source 可以使用 `bar` 或 `column`。
- SSR 阶段缺少 DOM：在客户端挂载编辑器；服务端只处理纯验证与持久化函数。
- 导出不可用：确认调用发生在已挂载、支持 Canvas/SVG 的浏览器环境。
