# TellPlot 分类图验证切片 Plan

## Metadata

- Feature ID: `004-categorical-chart-validation`
- Version: 0.4.0
- Status: Confirmed
- Last updated: 2026-07-20
- Depends on: T101-T110 Accepted
- Approval: 用户已批准技术决策、任务顺序和验证门禁，并于 2026-07-20 验收 T116

## Decision Summary

1. 使用 schema `2.0.0` 的可判别 `SourceData` 联合增加 categorical family，同时完整保留 legacy
   `1.0.0` waterfall wire contract。
2. `ViewSpec` 保留共享叙事树，并把 `chartType` 扩展为 `waterfall | bar | column`；source/view 使用明确
   compatibility matrix，不通过启发式推断。
3. 命令执行器复用一套树变换，只把 waterfall anchor/segment 与 categorical movable-item 差异提取为
   最小内部 policy，不建立公共 plugin registry。
4. categorical 使用一个投影模型；bar 与 column 只在 G2 encode、axis、label 和 category-axis interaction
   上区分方向。
5. G2 继续负责 interval mark、scene bounds、Tooltip 和 enter/update/exit animation；TellPlot 负责财务
   语义、确定性命令、拖动状态与 DOM UI。
6. 先完成显式分类图纵向切片，再基于瀑布图与分类图真实重复抽取 `rendering/g2` 内部运行时。禁止在
   第二类图表跑通前进行通用化重写。

## Current Architecture Assessment

现有架构已经建立可靠的领域和质量基础：

- `SourceData` 与 `ViewSpec` 分离，原始金额不可变。
- 所有图表、大纲和键盘操作进入确定性命令与历史。
- waterfall projection 与 G2 spec 是确定性 adapter。
- screen、SVG 和 PNG 复用同一个 waterfall spec factory。
- TypeScript strict、closed-schema validation、真实浏览器、package、a11y 和 performance 门禁已经存在。

分类图会暴露五个已知扩展点：

- `SourceItemKind`、anchor validation 和 `ViewSpec.chartType` 当前只表达 waterfall。
- 命令执行器直接读取 contribution/subtotal segment。
- `chartPointer` 和 drop target 当前只表达 X 轴几何。
- `WaterfallCanvas` 同时承担 G2 生命周期、事件注册、手势状态、DOM overlay 和 chart-specific copy。
- `waterfallChartSpec.ts` 位于 `export/`，但同时服务屏幕与导出，目录所有权不准确。

这些是本 feature 的验证对象，不是预先大重构的理由。

## Target Architecture

目标边界在 T116 完成后形成，具体文件只在真实复用被测试证明后移动：

```text
packages/editor/src/
  domain/
    model.ts                 # public discriminated source/view contracts
    validation.ts            # schema dispatch + shared tree validation
    executeCommand.ts        # shared tree transforms + internal chart policy
    persistence.ts           # version-preserving parse/serialize
  charts/
    waterfall/
      projection.ts
      spec.ts
      policy.ts
    categorical/
      projection.ts
      spec.ts
      policy.ts
  rendering/g2/
    chartRuntime.ts          # Chart load/create/options/render/destroy queue
    exportRuntime.ts         # offscreen Canvas/SVG lifecycle
  interactions/
    categoryAxis.ts          # x/y neutral scene-bound ordering primitives
  components/
    FinancialChartEditor.tsx # orchestration and chart dispatch
    WaterfallCanvas.tsx      # waterfall presentation/gesture composition
    CategoricalCanvas.tsx    # categorical presentation/gesture composition
```

这是内部目标结构，不是公共 import surface。若实现证据显示某个 runtime 只有一个消费者，则保留在 chart
module 内，不为目录对称而抽取。

## Data And Schema Plan

### Schema dispatch

- `1.0.0` 无 `dataKind`，始终按 legacy waterfall closed schema 读取。
- `2.0.0` 必须有 `dataKind: 'waterfall' | 'categorical'`。
- `ViewSpec` 同样按 schema version 选择 legacy/current union。
- validation success 保留输入 identity；所有 normalization 只在 projection/spec 内产生新 plain data。

### Compatibility

- legacy source 与 legacy waterfall view 保持现有 round-trip。
- current waterfall source 只接受 current waterfall view。
- current categorical source 接受 current bar/column view。
- 不提供 implicit source/view upgrade，也不把 schema mismatch 当作可恢复警告。
- source fingerprint 纳入 schema version 和 dataKind。

### Initial view

- `createInitialViewSpec` 增加可选 closed options。
- legacy/current waterfall 默认 waterfall。
- categorical 默认 column，可显式选择 bar。
- chart type 在 session 内保持不变；本切片不增加 `setChartType` 命令。

## Domain Plan

命令树变换继续只有一份。当前 `contributionSegment` 和 `item.kind === 'contribution'` 判断改由内部 policy
提供，policy 只回答执行命令所需的稳定问题：

- item 是否属于可叙事集合。
- item 是否为系统锚点。
- 一组后代是否可以共享 container。
- 锁定原因是 system anchor、segment boundary 还是 pinned。

policy 不接受宿主回调、不携带 G2 类型、不决定投影、不决定 UI copy。validator 与 command executor 使用
同一个 family 选择逻辑，避免“validator 允许但 command 拒绝”的漂移。

分类聚合复用 waterfall 已验证的 compensated summation，但结果类型与 anchor semantics 独立。分类图不会
复用 `WaterfallDatum.start/end`，避免让通用 projection 变成大量可选字段。

## G2 Rendering Plan

### Categorical spec

- 一个 `CategoricalProjection` 支持 bar/column。
- column: `encode.x = nodeId`、`encode.y = amount`，使用默认 Cartesian coordinate。
- bar: 保持同一语义 encode，使用 G2 `coordinate.transform: transpose` 转为横向布局，并通过 category scale
  方向保证逻辑首项位于顶部。
- `encode.key = nodeId` 在两种布局保持稳定。
- ordinary datum color 根据 amount 符号映射 positive/negative；collapsed group 使用 group。
- value label、axis formatter、Tooltip、annotation、emphasis 和 animation 复用 resolved appearance。
- export 设置 reduced motion 并关闭 Tooltip，screen 使用当前配置。

### Runtime ownership

T115 已完成并验收 categorical screen/export integration。T116 比较两类 chart lifecycle，并且只抽取以下
被当前生产消费者共同使用的职责：

- dynamic G2 constructor loading。
- render request ordering 与 stale request discard。
- active animation finish。
- options/render error mapping。
- event unregistration、destroy 和 callback isolation。
- offscreen Canvas/SVG host cleanup。

chart-specific mark、copy、projection、interaction policy 和 label position 不进入 shared runtime。

## Interaction Plan

把现有水平 bounds adapter 扩展为 axis-neutral category bounds：

```typescript
type CategoryAxis = 'x' | 'y';

interface ChartCategoryBounds {
  readonly nodeId: ViewNodeId;
  readonly min: number;
  readonly center: number;
  readonly max: number;
}
```

- G2 scene `getBounds()` 继续是唯一图形边界来源。
- column 和 waterfall 使用 X category axis。
- bar 使用 Y category axis，并由 adapter 保留 top-to-bottom logical order。
- collision 使用移动 mark 在 category axis 上的边缘越过相邻 mark 边缘，不读取 value-axis size。
- pointer down 后冻结同一 render revision 的 bounds；projection 改变或 render revision 变化时取消旧 session。
- 4px pending threshold、RAF 合并、Pointer capture、Escape/blur/unmount cancel 继续复用。
- keyboard 和 outline 不经过像素碰撞，直接产生同一 command target。

## React And UI Plan

`FinancialChartEditor` 继续是唯一公共组件，根据已验证的 source/view 选择 projection 与 chart canvas。共享
selection、outline、inspector、toolbar、feedback、history 和 export orchestration。

新增 `CategoricalCanvas` 只负责分类图所需的：

- bar/column G2 spec 输入。
- category-axis gesture composition。
- 分类图标题、empty state 和 group action anchor。
- G2 render issue 与现有 feedback contract 的连接。

不复制 session、command dispatch、group dialog、outline 或 inspector 领域状态。若两类 Canvas 出现完全相同
的 G2 lifecycle block，保留到 T116 再抽取。

## Accessibility And Export Plan

- accessible summary 使用 chart type 对应的可读名称和逻辑顺序，不描述 G2 encode。
- bar 的 DOM summary 第一项对应视觉最上方；column 第一项对应最左侧。
- empty categorical 仍渲染标题、0 项摘要和可导出的空图。
- SVG/PNG 接收 chart-neutral render request，内部选择匹配 spec factory。
- SVG sanitizer、PNG encoder 和 export error contract 保持不变。
- screen/export parity 通过同一 factory 的结构测试与真实浏览器像素/DOM 检查证明。

## TDD Strategy

### RED

- 新 schema discriminator、compatibility matrix、legacy identity 与 deterministic round-trip 测试失败。
- categorical tree invariants、projection、compensated aggregation 和 property sequence 测试失败。
- bar Y-axis 与 column X-axis scene bounds/collision 测试失败。
- categorical G2 spec、screen rerender、SVG/PNG、a11y 和 package consumer 测试失败。
- architecture consolidation 前增加 screen/export spec parity 与 runtime cleanup characterization tests。

### GREEN

- 每个 task 只实现通过本 task RED 所需的最小行为。
- 新 family 先通过 pure domain/projection，再接 G2，再接 React/export。
- 所有现有 waterfall tests 在每个 task 后保持 green。

### REFACTOR

- 只有 T115 vertical slice 全部 green 后才执行 T116 shared runtime extraction。
- 不改变公共 API、wire schema、error code、默认 appearance 或 screenshot baseline。
- 每次文件移动后运行 scoped tests、typecheck 和 package tests，最终再跑全量浏览器矩阵。

## Validation Strategy

每个 task 使用 scoped RED/GREEN 命令；T116 最终门禁为：

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:coverage`
- `pnpm build`
- `pnpm test:package`
- `pnpm test:react-matrix`
- `pnpm test:e2e`
- `pnpm test:a11y`
- `pnpm test:performance`
- `pnpm test:browser-previous`
- `python3 /Users/iiwish/.codex/skills/ai-delivery-governor/scripts/validate_delivery_artifacts.py --root . --feature-id 004-categorical-chart-validation`
- `git diff --check`

Coverage 必须为 `domain/**`、`waterfall/**`、新增 `categorical/**` 和抽取后的 `rendering/**` 建立不低于
95% statements/branches/functions/lines 的门禁。真实浏览器需要新增 bar/column rendering、direct reorder、
group/collapse、export、a11y 和 200 项 performance 场景。

## Constitution Check

| Principle | Compliance |
| --- | --- |
| P-001 真实工作流优先 | 只实现已确认的单序列分类条形/柱状图，不扩展通用 BI 范围。 |
| P-002 数据与视图分离 | 分类 amount 保留在 SourceData，排序/分组只修改 ViewSpec。 |
| P-003 一个确定性命令入口 | chart、outline、keyboard 共用现有 command union。 |
| P-004 轻量核心 | 本切片不连接 AI 或平台能力；外部确定性操作使用 host command source。 |
| P-005 财务不变量优先 | 分类来源覆盖、聚合和锁定规则是阻断门禁。 |
| P-006 原生能力优先 | interval、scene bounds、Tooltip 和图形动画使用 G2。 |
| P-007 直接与精确操作并存 | bar/column canvas 和 outline/keyboard 同时验收。 |
| P-008 性能与可打断 | 保留 RAF、短动画、interrupt/reduced motion 与真实性能预算。 |
| P-009 小范围验证后抽象 | T116 只在第二类图表通过后抽取实际重复。 |
| P-010 Evidence over assertion | scoped TDD、全量浏览器与 package evidence 全部列入任务。 |

无章程例外。

## Alternatives Considered

### 直接把 categorical 当作无 anchor 的 waterfall

拒绝。该方案会放宽已确认的 waterfall SourceData validator，让缺失 start/end 的错误数据被误判为合法，
并迫使 projection 使用大量可选字段。

### 现在建立通用 ChartPlugin registry

拒绝。只有一个完整 family 和一个待验证 family，无法证明第三方扩展协议。公共 registry 会过早冻结
projection、gesture、export 和 error contract。

### 为 bar 与 column 分别复制领域模型

拒绝。两者只在方向和 G2 encode 上不同，复制 tree/command/history 会违反单一命令入口。

### 允许宿主传入 G2Spec 实现分类图

拒绝。会破坏 source/view encoding、稳定 node key、scene hit testing、screen/export parity 和公共 API
演进边界。

### 引入第二个渲染或动画引擎

拒绝。G2 已满足 interval 和图形过渡，新增依赖没有已确认问题与退出收益。

## Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| schema v2 使 legacy 类型分支增加 | validator、session 和 persistence 复杂度上升 | 使用严格判别联合；legacy/current 各自 characterization 与 round-trip tests；禁止隐式迁移 |
| bar 视觉顺序与 rootOrder 反转 | chart、outline、export 顺序不一致 | 固定 rootOrder 为 top-to-bottom；只在 G2 scale 适配方向；跨 surface parity tests |
| chart policy 提取变成通用框架 | 范围和维护成本失控 | policy 只暴露命令所需问题；保持内部；T116 删除未被两类 chart 使用的抽象 |
| Canvas 复用造成复杂条件分支 | 手势回归和可维护性下降 | 先独立 CategoricalCanvas；只抽取 lifecycle，不合并 chart-specific gesture composition |
| 200 个横向标签造成布局/性能问题 | 可读性与交互预算失败 | stable dimensions、label auto hide、密集模式、真实三浏览器性能与截图 |
| screen/export spec 漂移 | 输出与编辑状态不一致 | 单一 spec factory、parity tests、真实 SVG/PNG evidence |

## Work Order

1. T111-T115 已完成并由用户验收。
2. T116-A001 已按用户批准的 execution packet 完成内部结构收敛。
3. T116 的全量门禁、视觉/export parity、task-only evidence 与三层 review 已完成。
4. 用户于 2026-07-20 明确验收 T116，E004 完成。

## Approval Gate

用户已明确批准 `spec.md`、`data-model.md`、`contracts/editor-api.md`、本 Plan 和 `tasks.md`，并于
2026-07-20 验收 T116。E004 不再阻塞后续目标规划；任何新图表或公共 API 变化进入独立目标级审批。
