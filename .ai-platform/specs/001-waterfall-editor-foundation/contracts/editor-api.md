# `@tellplot/editor` 公共 API 合同

## Metadata

- Version: 0.4.0
- Status: Confirmed
- Package: `@tellplot/editor`

## Export Surface

公共入口只导出：

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
- 公共 props、data、view、command、result、error 与 export 类型
- `FinancialChartAppearance` 及其语义配置类型
- `@tellplot/editor/styles.css`

不导出 G2 chart instance、内部 reducer、DOM components、dnd-kit adapter 或 projection cache。
`projectWaterfall` 是 package 内部的确定性 adapter input，不属于第一阶段公共 runtime surface；公共组件与导出模块复用同一实现。

## Domain Validation Contract

```typescript
function validateSourceData(input: unknown): ValidationResult<SourceData>;
function validateViewSpec(input: unknown, sourceData: SourceData): ValidationResult<ViewSpec>;
function createInitialViewSpec(sourceData: SourceData): ValidationResult<ViewSpec>;
function createEditorSession(
  sourceData: SourceData,
  options?: EditorSessionOptions,
): ValidationResult<EditorSession>;
function executeCommand(session: EditorSession, command: EditorCommand): CommandResult;
function undoSession(session: EditorSession, action: SessionActionMeta): CommandResult;
function redoSession(session: EditorSession, action: SessionActionMeta): CommandResult;
```

- validator 返回累积式结构化 issue，不为预期输入错误抛异常。
- `createInitialViewSpec` 先验证 source，成功时按 source 中 contribution 的分段顺序建立 revision 0 视图。
- 成功 validation result 保留输入 identity；所有函数只读调用方数据。
- issue 的 message/details 不包含 amount、label、sourceRef 或 metadata value。
- schema objects 拒绝未知字段、symbol key、accessor property、稀疏数组和数组附加属性；validator 不执行调用方 getter。
- hostile Proxy 等无法安全反射的输入返回通用 `UNREADABLE_INPUT`，不传播原始异常文本。
- `EditorSessionOptions` 支持 `viewSpec` 与 `historyLimit`；historyLimit 默认 100，0 表示禁用历史，非法值返回 `INVALID_SESSION_OPTIONS` validation issue。
- session factory 验证 source 与可选 view，保留 source identity，并生成确定性、非加密的 `fnv1a64:` source fingerprint；fingerprint 不包含可还原的原始字段值。
- command/session action 结果遵循 command contract；预期输入错误不抛异常，失败保持输入 session identity。

## Component Contract

```typescript
interface FinancialChartEditorProps {
  readonly sourceData: SourceData;
  readonly viewSpec?: ViewSpec;
  readonly defaultViewSpec?: ViewSpec;
  readonly historyLimit?: number;
  readonly locale?: 'zh-CN' | 'en-US';
  readonly readOnly?: boolean;
  readonly height?: number | string;
  readonly chartAppearance?: FinancialChartAppearance;
  readonly panels?: {
    readonly outline?: boolean;
    readonly inspector?: boolean;
    readonly toolbar?: boolean;
  };
  readonly onViewSpecChange?: (next: ViewSpec, event: CommandEvent) => void;
  readonly onCommand?: (event: CommandEvent) => void;
  readonly onCommandRejected?: (error: CommandError) => void;
  readonly onSelectionChange?: (selection: SelectionState) => void;
}

interface FinancialChartAppearance {
  readonly title?: string;
  readonly palette?: Partial<FinancialChartPalette>;
  readonly axis?: { readonly x?: boolean; readonly y?: boolean };
  readonly valueLabels?: 'auto' | 'always' | 'never';
  readonly tooltip?: boolean;
  readonly animation?: { readonly enabled?: boolean; readonly duration?: number };
  readonly numberFormat?: {
    readonly minimumFractionDigits?: number;
    readonly maximumFractionDigits?: number;
    readonly currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name';
  };
}

interface SelectionState {
  readonly nodeId: ViewNodeId;
  readonly nodeIds: readonly ViewNodeId[];
  readonly sourceIds: readonly SourceItemId[];
}
```

Rules:

- `viewSpec` 与 `defaultViewSpec` 不得同时提供。
- `viewSpec` 存在时为受控模式；组件不得在宿主未传回新值时永久偏离 props。
- `readOnly` 禁止写命令但保留选择、展开只读详情与导出。
- `SelectionState.nodeIds` 保留同父级直接选择，`sourceIds` 是递归展开后的叶子来源集合。
- 公共 command 类型包含 `MoveGroupCommand`；直接操作、大纲、宿主与 AI 使用同一 `executeCommand` 语义。
- `height` 默认 680px，最小 480px；组件宽度由宿主容器决定。
- `chartAppearance` 是宿主级呈现配置，不写入 `ViewSpec`；无效运行时值收敛到安全默认值。
- `chartAppearance` 不接受原始 `G2Spec`、chart instance、data transform 或编码覆盖。
- 屏幕、SVG/PNG 导出和无障碍摘要共享标题、语义颜色与数字格式；交互 Tooltip 只存在于屏幕图表。
- 动画 `duration` 收敛到 0 至 1000 毫秒；reduced motion 优先于宿主动画配置。
- 回调执行异常不得破坏内部 chart cleanup；开发环境记录不含数据值的 contextual error。

## Imperative Handle

组件使用 `ref` 暴露有限命令：

```typescript
interface FinancialChartEditorHandle {
  focus(): void;
  exportImage(options: ExportOptions): Promise<ExportResult>;
  getViewSpec(): ViewSpec;
}
```

不暴露 `dispatch` 或 G2 instance。宿主需要执行确定性命令时，使用受控 `executeCommand` 或后续明确的 command prop，而不是绕过组件边界。

## Export Contract

```typescript
interface ExportOptions {
  readonly format: 'svg' | 'png';
  readonly pixelRatio?: number;
  readonly background?: string;
  readonly filename?: string;
}

interface ExportResult {
  readonly blob: Blob;
  readonly mimeType: 'image/svg+xml' | 'image/png';
  readonly suggestedFilename: string;
  readonly width: number;
  readonly height: number;
}
```

- 默认 PNG pixel ratio 为 2，允许 1 到 4。
- export 不触发下载；参考编辑器可基于 result 创建临时链接并在使用后 revoke。
- SVG 不包含外部脚本、网络图片或财务 metadata。

## Styling Contract

- 包提供 `styles.css`，宿主显式 import。
- 所有 selector 使用 `.tp-` 前缀或 `[data-tellplot]` scope。
- CSS variables 可在组件 root 覆盖，未提供时使用 design contract 默认值。
- 不修改 `html`、`body`、通用 `button`、`input` 或全局 box-sizing。

## Compatibility

- Peer ranges: React `^18.3 || ^19`、React DOM `^18.3 || ^19`、G2 `^5.4`。
- Public schema 遵循 semver；删除字段、改变命令语义或修改持久化 major version 属于 breaking change。
- Internal file paths 不属于公共 API。
