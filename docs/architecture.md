# TellPlot 架构概览

## 核心数据流

TellPlot 把原始财务事实、可编辑叙事状态、确定性操作、图表家族投影和 G2 渲染分开管理。

```text
ChartConfig -> public adapter -> SourceData + ViewSpec -> Command Executor
                                       |              -> CommandLog / undo / redo
                                       +-> Chart Projection -> G2Spec -> G2 Runtime
                                       +-> persistence / host commands
```

### ChartConfig

`ChartConfig` 是公开宿主意图，以 `type` 判别图表家族并收纳 `data`、`appearance`、`editor`、`locale`
和 `height`。`ChartEditor` 校验配置、创建或保留兼容的 `ViewSpec`，再适配到内部工作台；它不把 G2
options 或 runtime handle 暴露给宿主。

### SourceData

`SourceData` 是 `waterfall | categorical` 的严格可判别联合，保存稳定 ID、金额、币种和来源引用。编辑操作
不得改写该对象。

### ViewSpec

`ViewSpec` 保存图表类型、顺序、递归分组树、折叠、固定、注释和强调。它是可序列化、可校验的叙事状态，
不包含 G2 chart instance、像素边界或渲染函数。

### Command Executor

直接操作、大纲、键盘和宿主操作使用同一组类型化命令。执行器校验 revision、目标位置、固定状态、
递归树和来源覆盖不变量，并生成可撤销历史。

`domain/chartPolicy.ts` 保持领域所有权。它只表达 waterfall anchor/segment 与 categorical movable-item 的
命令约束，不是图表插件接口，也不依赖 projection 或 G2。

## 内部模块

```text
packages/editor/src/
  domain/                         # schema、命令、历史、持久化、领域 policy
  charts/
    waterfall/
      projection.ts              # waterfall SourceData + ViewSpec -> projection
      spec.ts                    # waterfall projection -> G2Spec
      types.ts
    categorical/
      projection.ts              # categorical SourceData + ViewSpec -> projection
      spec.ts                    # bar/column projection -> G2Spec
      types.ts
  rendering/g2/
    chartRuntime.ts              # screen Chart load/render/event/destroy lifecycle
    exportRuntime.ts             # offscreen Canvas/SVG lifecycle
  interactions/
    categoryAxis.ts              # X/Y category-axis geometry and collision
    chartPointer.ts              # G2 event/scene boundary adapter
  components/
    ChartEditor.tsx              # 公共声明式 facade 与 config/view 适配
    FinancialChartEditor.tsx     # 唯一 session、chart dispatch 与 UI orchestration
    WaterfallCanvas.tsx          # waterfall gesture/presentation composition
    CategoricalCanvas.tsx        # bar/column gesture/presentation composition
  export/
    svgExport.ts                 # SVG sanitizer 与序列化
    pngExport.ts                 # PNG canvas encoding
```

依赖方向为：

```text
components/export -> charts -> domain/config
components/export -> rendering/g2
components -> interactions -> domain IDs
rendering/g2 -> G2
domain -X-> charts/rendering/components
```

`charts/**` 和 `rendering/g2/**` 都是包内部路径，不属于公共 import surface。

`charts/**`、export 与 components 当前共用 `components/formatAmount.ts`。该文件是无 React
依赖的纯格式化函数，不形成文件级循环依赖。本次收敛保留其路径，因为移动它不能减少已验证
重复，也不改善运行时边界；后续只在格式化能力扩展为独立子系统时再调整 ownership。

## G2 Runtime

### Screen Runtime

`chartRuntime.ts` 只拥有两类 Canvas 已共同使用的运行时职责：

- 缓存并动态加载 G2 `Chart` constructor。
- 为 mounted host 创建单一 chart instance。
- 串行处理 options/render，并让最新 request 胜出。
- 丢弃 stale render 结果，阻止卸载后的异步初始化复活 chart。
- 在更新或直接操作前快速完成 active G2 animations。
- 成对注册/注销 G2 events，隔离结果 callback，并执行 exact-once destroy。
- 只向交互 adapter 提供 scene context，不把 chart instance 暴露给组件。

Canvas 继续拥有 chart-family copy、projection/spec 选择、拖动状态、DOM overlay、group action 和
pointer-capture composition。运行时不读取财务数据，也不决定图表类型。

### Export Runtime

`exportRuntime.ts` 创建隐藏 Canvas/SVG host，渲染调用方提供的内部 `G2Spec`，在限定 reader callback
完成后销毁 chart 并移除 host。success、constructor/render failure 和 reader failure 使用同一 finally cleanup。

SVG sanitizer/serialization 留在 `svgExport.ts`，PNG pixel-ratio/encoding 留在 `pngExport.ts`。chart-family
spec 选择也留在 export orchestration，offscreen runtime 不认识 waterfall、bar 或 column。

## 图表家族

waterfall 与 categorical 各自拥有 projection、renderer-ready types 和 spec factory：

- waterfall projection 保留 start/end/subtotal、segment、累计值和 anchor 不变量。
- categorical projection 保留单序列金额、compensated group aggregation 和逻辑 `rootOrder`。
- column 使用 X category axis；bar 通过 G2 transpose 使用 Y category axis。
- screen、SVG、PNG 和无障碍摘要复用同一 family projection/spec 语义。

家族目录不包含命令执行器、session、history、公共 plugin interface 或 renderer registry。

## 交互边界

`categoryAxis.ts` 是 waterfall、column 和 bar 的轴向几何原语。waterfall/column 传入 `x`，bar 传入 `y`。
排序只读取 G2 scene `getBounds()` 投影出的 `min/center/max`，不猜测固定柱宽或行高，也不让 value-axis
位移改变顺序。

`chartPointer.ts` 只把 hostile G2 event/context 转换为结构化 point、datum 和 scene bounds。固定、同父级、
segment、group 和 command eligibility 仍由领域 policy 与调用方冻结的 candidate set 决定。

## 配置流

```text
ChartConfig.appearance -> public adapter -> internal resolved appearance
                                          -> family screen G2Spec
                                          -> family SVG/PNG G2Spec
                                          -> accessible chart summary
```

公共配置只描述稳定的财务图表语义。内部 adapter 独占 `data`、`encode`、stable key、比例尺几何、renderer、
事件注册和交互状态。

## 公共边界

`packages/editor/src/index.ts` 只导出 `ChartEditor`、`ChartConfig`、公共数据/命令类型、session、
validation、persistence 和 export 合同。内部 `FinancialChartEditor` 和以下内容保持内部：

- projection 与 G2 spec factory。
- `G2Spec`、G2 `Chart`、scene context 和 runtime handles。
- category-axis/pointer adapter 与 gesture state。
- chart policy 和 arbitrary spec transform。

TellPlot 当前不提供公共或内部通用 chart plugin registry。新增图表家族先通过真实工作流证明领域、交互和
导出边界，再决定是否存在可复用能力。

## 仓库边界

- `packages/editor`：唯一产品包，包含领域、图表家族、React 工作台、G2 runtime、持久化和导出。
- `apps/playground`：示例数据和人工验收入口，不复制产品逻辑。
- `e2e`：真实浏览器、可访问性、导出和性能验证。
- `.ai-platform`：SSOT、feature spec、任务图、execution packet 和 evidence。
