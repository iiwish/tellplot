# Imperative Editor Contract

## Create

```ts
const editor = createEditor(container, options);
```

`container` 必须是可用的 `HTMLElement` 且不得已被另一个 live TellPlot instance 占用。模块 import 不访问
DOM；只有 `createEditor` 创建 DOM/G2 资源。

## Options

```ts
interface EditorOptions {
  readonly config: ChartConfig;
  readonly view?: ViewSpec;
  readonly defaultView?: ViewSpec;
  readonly onViewChange?: (view: ViewSpec, event: CommandEvent) => void;
  readonly onCommand?: (event: CommandEvent) => void;
  readonly onCommandRejected?: (error: CommandError) => void;
  readonly onConfigRejected?: (issues: readonly ValidationIssue[]) => void;
  readonly onSelectionChange?: (selection: SelectionState | null) => void;
  readonly onRenderError?: (issue: ChartRenderIssue | null) => void;
}
```

`view` 和 `defaultView` 互斥。Callbacks 可通过 `update` 替换，不因 identity 改变而重建 editor。
`onRenderError` 在 G2 渲染失败时收到稳定的 `CHART_RENDER_ERROR`，恢复成功后收到 `null`；回调不包含
宿主数据、原生异常文本或 G2 内部对象。

## Instance

```ts
interface EditorInstance {
  update(update: EditorUpdate): void;
  dispatch(command: EditorCommand): CommandResult | null;
  undo(action?: SessionActionMeta): CommandResult | null;
  redo(action?: SessionActionMeta): CommandResult | null;
  focus(): void;
  getView(): ViewSpec;
  exportImage(options: ExportOptions): Promise<ExportResult>;
  destroy(): void;
}
```

- `update` 原子应用 config/view/defaultView/callbacks。
- `dispatch`、`undo`、`redo` 在 read-only、invalid 或 destroyed 状态返回 `null`。
- `getView` 在没有合法 view 或 destroyed 后抛出稳定 `TellPlotEditorError`，不返回内部可变引用。
- `destroy` 幂等，释放 G2、DOM、animation、pointer、media query 和 host listener。

## Adapter Mapping

- React `view/onViewChange` 和 Vue `view/update:view` 映射同一 controlled contract。
- Adapter ref/expose 只代理 `focus/getView/exportImage`；不暴露 runtime internals。
- React 直接映射 `onRenderError`；Vue 通过 `render-error` 发送相同的 issue 或恢复信号 `null`。
- Adapter unmount 必须调用 `destroy`，update 不得重建 container 或 editor instance。
