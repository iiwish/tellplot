# TellPlot 架构概览

## 核心边界

TellPlot 把原始财务事实、可编辑叙事状态、确定性操作和图表渲染分为四层。

```text
SourceData -> ViewSpec -> Command Executor -> Projection -> G2Spec -> G2
                  |              |
                  |              +-> CommandLog / undo / redo
                  +-> persistence / AI candidate commands
```

### SourceData

`SourceData` 保存稳定 ID、金额、类型、币种和来源引用。编辑操作不改写该对象。

### ViewSpec

`ViewSpec` 保存顺序、递归分组树、折叠、锁定、注释和强调。它是可序列化、可校验的叙事状态，不包含 G2 chart instance 或任意渲染函数。

### Command Executor

直接操作、大纲、键盘和 AI 候选操作使用同一组类型化命令。执行器校验 revision、目标位置、锁定状态、递归树和来源覆盖不变量，并生成可撤销历史。

### Projection And G2 Adapter

投影层把 `SourceData + ViewSpec` 转换为可见瀑布数据。G2 adapter 负责 `G2Spec`、Canvas 生命周期、场景边界、Pointer Events 和图形动画。领域状态不引用 G2。

## 配置流

```text
FinancialChartAppearance -> normalize -> resolved appearance
                                      -> screen G2Spec
                                      -> SVG/PNG G2Spec
                                      -> accessible chart summary
```

公共配置只描述稳定的财务图表语义。内部 adapter 保留 `data`、`encode`、`key`、比例尺几何、事件注册和交互状态的所有权。

## 包边界

- `packages/editor`：唯一产品包，包含领域、投影、React 工作台、G2 adapter、持久化和导出。
- `apps/playground`：示例数据和人工验收入口，不复制产品逻辑。
- `e2e`：真实浏览器、可访问性、导出和性能验证。
- `.ai-platform`：SSOT、feature spec、任务图、执行包和证据。
