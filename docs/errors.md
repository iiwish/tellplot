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

命令 API 返回 `CommandResult`。React 组件通过 `onCommandRejected` 报告相同的 `CommandError`。

```tsx
<ChartEditor
  config={config}
  onCommandRejected={error => {
    console.error(error.code, error.reason, error.path, error.commandId);
  }}
/>
```

常见 `CommandErrorCode` 包括 `INVALID_COMMAND`、`REVISION_CONFLICT`、`ITEM_LOCKED`、
`INVALID_DROP_TARGET`、`GROUP_TOO_SMALL` 和 `INVARIANT_VIOLATION`。拒绝是原子操作：session 和 view 保持
原有 identity，失败的命令不会写入历史。

宿主构造命令时使用 `source: 'host'`。未知 source literal 会以 `INVALID_COMMAND` 拒绝。

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
- `EXPORT_UNAVAILABLE`：当前 DOM/Canvas 环境不能完成导出。
- `EXPORT_FAILED`：G2 渲染或格式编码失败。

## 接入排查

- 图表无样式：确认应用入口导入 `@tellplot/editor/styles.css`。
- 图表配置无效：先调用 `validateChartConfig`，按 issue 的 `code` 与 `path` 修正公开配置。
- 图表显示 data/view 冲突：重新用当前 data 调用 `createInitialViewSpec`，或校验恢复的 view。
- 条形图初始化失败：只有 current categorical source 可以使用 `bar` 或 `column`。
- SSR 阶段缺少 DOM：在客户端挂载编辑器；服务端只处理纯验证与持久化函数。
- 导出不可用：确认调用发生在已挂载、支持 Canvas/SVG 的浏览器环境。
