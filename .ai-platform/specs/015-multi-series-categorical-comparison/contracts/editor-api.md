# G003 Editor And Rendering Contract

## Metadata

- Version: 0.1.0
- Status: Confirmed
- Feature ID: `015-multi-series-categorical-comparison`
- Last updated: 2026-08-12
- Approval: 用户于 2026-08-12 明确批准本 breaking editor/rendering contract

## Host API

imperative DOM、React 18/19 和 Vue 3 继续消费同一 `ChartConfig` 与 `ViewSpec` unions。

不增加：

- DOM `EditorOptions` 字段、callback 或 `EditorInstance` method。
- React `ChartEditor` prop/ref method。
- Vue `ChartEditor` prop、emit、expose 或额外 `v-model`。
- legend click、series hover、series selection 或 cell selection event。
- comparison-specific export option/result/error。

现有 `SelectionState` 精确不变：

```typescript
export interface SelectionState {
  readonly nodeId: ViewNodeId;
  readonly nodeIds: readonly ViewNodeId[];
  readonly sourceIds: readonly SourceItemId[];
}
```

点击任一 series interval 都归一为所属 category/group node；selection 中不出现 series ID。category pin、
category/group annotation、host ViewSpec emphasis 和 readOnly 作用于完整 cluster。

## Outline And Inspector

- Outline 每个 visible category/group 只有一个 treeitem，series 不展开为 child treeitem。
- v3 Outline value surface 显示本地化的 `2 series`、`3 series` 或 `4 series` 计数，不计算或展示 total。
- Inspector 对普通 category 按 source series 顺序显示 series label/格式化 amount，并显示
  annotation、emphasis 与 pinned/locked/editable state。
- collapsed group 按 source series 顺序显示 aggregated values，并显示 collapsed、source category count、
  annotation、emphasis 与 locked/editable state。
- expanded group 不显示未投影的 aggregated values，显示 expanded、source category count、annotation、
  emphasis 与 locked/editable state。
- multi-selection 显示 selected node count 与 source category union count，并允许既有合法 group action；
  不选择 primary node、不显示逐 series value、不聚合跨 category 金额、不提供 cell edit surface。只有
  single-selection 才显示/编辑该 node annotation。
- series/category 长 label 可以在紧凑 surface 截断，但 Tooltip、Inspector 和 a11y summary 保留完整文本。

## G2 Rendering Ownership

### Internal Flattened Data

core comparison projection 不包含 G2 字段。editor 内部按 category-major、series-stable 顺序 flatten：

```typescript
interface ComparisonMarkDatum {
  readonly nodeId: ViewNodeId;
  readonly categoryLabel: string;
  readonly seriesId: SeriesId;
  readonly seriesLabel: string;
  readonly amount: number;
  readonly elementKey: string;
  readonly locked: boolean;
  readonly nodeKind: 'category' | 'group';
  readonly categoryOrder: number;
  readonly seriesOrder: number;
}
```

`elementKey` 使用可逆、collision-safe tuple encoding，例如 JSON tuple encoding
`JSON.stringify(['comparison-element', nodeId, seriesId])`。禁止分隔符拼接或可能碰撞的 hash。value label、
annotation anchor 等其他 internal elements 使用各自 namespace；internal spec child `markKey` 与 datum
`elementKey` 是两个不同概念。

comparison series band 使用一份 internal shared scale factory：source IDs 是唯一 domain，
`paddingInner = 0.08`，`paddingOuter = 0`。interval dodge transform 与任何 series-positioned renderer-native
label helper 必须使用完全相同的 domain/range/padding；不得依赖不同 mark type 的默认 series scale。

### Interval Spec

v3 使用一个 G2 `interval` child mark：

```typescript
{
  key: 'categorical-comparison-interval',
  type: 'interval',
  encode: {
    x: 'nodeId',
    y: 'amount',
    series: 'seriesId',
    color: 'seriesId',
    key: 'elementKey',
  },
  transform: [{ type: 'dodgeX', groupBy: 'x', padding: 0.08 }],
}
```

- x/category、series 和 color ordinal domains 全部显式使用 projection/source order。column category scale
  固定 `reverse: false`；bar 在 transpose 后固定 `reverse: true`，使首个 category 位于最上。
- `dodgeX.padding` 与 shared series scale 的 `paddingInner` 都固定为 `0.08`；series `paddingOuter` 固定为
  `0`。characterization tests 按 scene pixels 比较 interval 与 series-positioned label anchor centers。
- color range 是 resolved complete 2 至 4 color array。
- 不设置 `orderBy: 'value'`，不从 amount、object key 或 color override order 推断 series order。
- y scale 必须包含 zero baseline，覆盖全部 visible values；bar 的 value axis 由 coordinate transpose 改变方向。
- column 首个 category 在最左，bar 首个 category 在最上。
- `legend.color` 使用 series ID domain 并把 label 安全映射为 source series label。
- `legendFilter` 与 `legendHighlight` 显式为 `false`；隐藏 legend 不等同于启用 filter interaction。
- G2 5.4.8 incremental legend update 不保证实际 item node 随 ordinal 重排。accepted series registry
  ID/order/count update 必须为 legend 建立新的 component identity；若当前 G2 view 无法独立可靠 remount
  legend，则重建 comparison view/runtime。该边界先取消 active interaction、销毁旧 receipt，再以新
  source order 建立 settled render 与 receipt；不能只检查 legend component data/domain。真实 Canvas 与 SVG
  tests 必须按 label pixel position 验证 live reorder 后的可见 legend 顺序。
- Tooltip 开启时显式使用 shared category behavior；每个 interval item 只提供 escaped series label 与
  formatted amount。view-level Tooltip `sort` 必须按 current source series ordinal 重排 items，不能依赖
  flattened/scene element traversal order；series live reorder 后使用 stable element keys 仍立即反映新顺序。
- `appearance.tooltip === false` 与 export spec 都显式禁用 view/mark Tooltip interaction，不依赖 G2 default。

### Labels And Annotation

- per-series value label 使用 collision-safe category/series identity，锚定各自 amount endpoint，并保持
  source series order。
- category/collapsed-group annotation 只输出一次；存在非零 value 时锚定预计算 series endpoint，选择最大
  `Math.abs(amount)`，tie 选 source order first。all-zero 锚定 category center 与 zero baseline，不锚定
  first-series center。
- annotation 优先沿远离 zero baseline 的方向 offset；all-zero 优先沿 positive direction。若该方向会越过
  plot interior，则翻转方向并保持在 plot 内，不与 legend、axis label 或 toolbar 争用布局。
- labels/annotation anchors 不拦截 interval pointer events，也不进入 scene geometry receipt。
- column/bar、2/4 series 的 label center 必须与对应 interval category-axis center 对齐；value label、annotation
  和 interval 的 animation key 不碰撞。

G2 5.4.8 原型已经证伪 standalone `text + dodgeX`：text mark 不支持 series-band positioning，会使 labels
重叠在 category center。TDR-017 当前规定 v2 使用 interval 之后的独立 text mark。已确认的 TDR-025 选择
renderer-native series label mechanism；单独保持 all-zero annotation 的 category-center anchor；把 comparison
expanded-group value extent 定义为全部 visible member x series values 与 zero baseline 的 union；并固定
comparison group-label 的 category/series/value anchor。v2 behavior 保持不变。该 internal mark-type/anchor
选择已经通过 TDR-025 固定，不能在实现中静默改变。

任何为 labels、annotation 或 layout 建立的 non-interval helper mark 必须显式设置 `tooltip: false`、
`axis: false`、`legend: false` 和 non-interactive pointer behavior；shared Tooltip 只从 comparison interval
elements 形成 2 至 4 个 items。

## Renderer-Owned Geometry

screen interaction 从 G2 scene/scale 构建一次 render-revision-bound receipt，内部最少包含 actual interval
rectangles、category axis intervals、2D union 和 baseline；receipt 不 export、不 log。

receipt 只在 current authoritative render settled 后构建；pointerdown 前先 finish animations 并重新读取。
acceptance 必须证明每个 visible projection node x 每个 declared series 恰有一个 scene element，并同时满足：

- mark type 为 `interval`，`sceneData.markKey === 'categorical-comparison-interval'`。
- `sceneData.key === datum.elementKey`，datum nodeId/seriesId 属于 current projection/source registry。
- rectangle coordinates finite，render signature/revision 与 current source/view/config/layout 一致。
- receipt 按 projection/source order 重建，不信任 scene traversal order。

任一 missing、duplicate、unknown、stale 或 invalid element 使整份 direct-manipulation receipt
non-authoritative：禁用 chart hit/drag/marquee/action rail，保留 Outline/keyboard；不得从 partial marks 降级或
first/last wins。resize、render、source/config/view change invalidate receipt。任何 accepted update、resize 或
render request 只要会改变 plot geometry，必须先 cancel active drag/marquee/hover/Tooltip，再 apply，且不产生
command/history；不能让 active drag 在新布局中继续使用旧坐标。没有 geometry change 的 callback-only update
可以保留 active receipt。active drag 只在没有并发 geometry change 时使用 pointerdown 冻结且已验收的
receipt直到 commit/cancel。

### Exact Hit

- 普通 category/collapsed group 只以 actual interval rectangles 进行 exact hit；series 间隙不命中。
- pointer event datum 直接映射相同 `nodeId`，点击任一 series 进入同一 category interaction。
- 当某一 visible datum 的全部 values 都满足 `amount === 0` 时，该 datum 是 all-zero category。all-zero
  exception 始终使用目标 G2 view 的 category band scale + coordinate/layout mapping 得到完整 renderer-owned
  category-axis band；zero interval scene rects 用于验证 node/series coverage并提供 baseline，不用 inset 后的
  interval rect union 代替完整 band。plot interior 的 value-axis span 至少为 32 CSS px 时，target 总厚度固定
  为 32px；更窄时使用完整 plot value-axis span。target 完全限制在 plot interior，优先从 baseline 沿 positive
  direction 延伸；该侧不足 32px 时从 negative direction 补足。column/bar、全图 all-negative 与全图
  all-positive 都不得把 target 放到 plot 外。
- all-zero target 不跨 category band，因此 category 间 padding 不命中；同一个 all-zero cluster 的 series
  inner gaps 在此退化例外中可以命中。
- 如果 G2 view band scale、coordinate mapping、layout offset 或 zero baseline 读取失败，则 all-zero direct hit
  不可用；系统不以 inset rect、固定宽度或 DOM estimate 猜测 band，Outline/keyboard 仍可用。

### Drag, Ghost And Marquee

- drag/drop 使用同 category actual marks 的 category-axis interval union；all-zero 使用相同 renderer band。
- active drag 可以在 cluster inner gap 落点；inactive gap 继续启动 marquee。
- minimum-target overlap 以相邻 axis interval midpoint 分区，tie 按 projection order 选前者；`inside` 只对
  group target middle region 成立。
- ghost 使用完整 category cluster 的 2D actual bounds union；all-zero ghost 可以退化为 baseline line，
  不伪造数值高度。
- marquee 与每个 actual interval rectangle 分别求交后按 category ID 去重。all-zero degenerate rect 只有在
  marquee 跨过 baseline 时命中，不复用 32px pointer target。
- group action rail、hover action 和 drop indicator 按 category cluster/axis geometry 定位，不使用 first/last
  mark wins 的 Map。

## Tooltip, Summary And Accessibility

- shared Tooltip title 是 full category/group label，items 恰为 2 至 4 个，按 source order 显示 marker、
  full series label 与 formatted value。
- Tooltip 的 HTML/text 被 escape；不执行 source string、host callback 或 formatter。
- a11y summary 先读取 visible cluster count 与 series count，再无条件按 source order 读取完整 series registry
  labels；该 registry 在 `items: []` 以及 legend on/off 时都存在。随后按 narrative depth-first order 生成
  structural entries。expanded group 自身先产生 group entry，读取 group label、expanded state、
  annotation/emphasis、source category count 与 locked state；随后递归读取 visible descendants。collapsed
  group 只产生一个 group entry，读取 collapsed state、逐 series aggregated values、source category count、
  annotation/emphasis 与 locked state。
- 普通 category 按 source series order 读取 label/value，并读取 annotation、emphasis 与 pinned/locked state。
- annotation 为空和 emphasis 未设置时不生成虚构文本；expanded group annotation 虽不绘制为 chart label，
  仍出现在 structural summary entry 与 Inspector。
- summary 的 series text/value 使用 comparison projection formatter；structural state 来自 ViewSpec/tree policy，
  两者按 node ID join，不以 Canvas/scene elements 作为信息源。
- 颜色不进入 accessible name，也不是 series、sign、lock、annotation 或 emphasis 的唯一信息源。
- category ordering/grouping/collapse/pin 继续通过 Outline/keyboard 提供等价路径、focus 与 aria-live feedback。

## Export

`EditorInstance.exportImage`、React/Vue handles、`ExportOptions`、`ExportResult` 与 error unions 精确不变。

- screen/SVG/PNG 复用同一 comparison projection、resolved series registry/palette、legend、labels、group
  regions、annotation 和 emphasis semantics。
- export 禁用 animation、Tooltip interaction、selection/hover/drag overlays 和 remote resources。
- valid empty v3 categories 仍导出 title、background、dimensions 与 configured legend；显式 color domain/range
  保证 empty data 仍可绘制 2 至 4 个 legend entries。
- existing v1/v2 empty/export behavior 不因 v3 改变。
- internal export request 必须按 schema/family 判别 v2 scalar categorical 与 v3 comparison，不能只按
  `chartType` 猜测 projection shape。

## Editor Update Matrix

| Change                                                                                                                                    | Uncontrolled                                                                        | Controlled                                                     | State/events                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| title/colors/legend/locale/format/axes/labels/tooltip/animation/groupRegion/panels/Outline placement/Inspector mode/height                | 保留 current view                                                                   | 保留 host view                                                 | fingerprint 不变；保留 session/history/selection，仅按需 render/layout；不发 command/view/selection event                                                                                                                                                      |
| callback identity                                                                                                                         | 保留 current view                                                                   | 保留 host view                                                 | fingerprint 不变；保留 session/history/selection，不 render/layout；不发 command/view/selection event                                                                                                                                                          |
| series registry order                                                                                                                     | previous view 有效时保留                                                            | 同次提供的 host view 必须有效                                  | 立即按新 ordinal 重排 marks/legend/Tooltip/labels/Inspector/summary/export，并为未 override series 重算默认 palette；legend 使用 fresh component/view identity；新 fingerprint/session 清 history/processed IDs，保留有效 selection，不伪造 command/view event |
| 除仅 zero-sign 等价更新外的 amount、currency、series count/label/ID/metadata、category label/metadata/sourceRef、value metadata/sourceRef | previous view 有效时保留                                                            | 同次提供的 host view 必须有效                                  | 立即 reproject/render；series ID/count change 使用同一 fresh legend component/view identity；新 fingerprint/session，清 history/processed IDs；保留有效 selection，不伪造 command/view event                                                                   |
| category item source order only                                                                                                           | 保留 current view/tree/revision；新顺序只影响 future initial view                   | 同次提供的 host view 必须有效                                  | 新 fingerprint/session，清 history/processed IDs；保留 current narrative order/selection，不伪造 command/view event                                                                                                                                            |
| category ID set                                                                                                                           | 有效 defaultView，否则 initial view                                                 | 同次必须提供完整有效 v3 view                                   | 新 session；selection 仅在全部 nodes 存在时保留，否则清空并发一次 change                                                                                                                                                                                       |
| dataset/schema/chart type                                                                                                                 | compatible defaultView 或 initial view                                              | 同次必须提供 compatible view                                   | 不跨边界保留 history/selection                                                                                                                                                                                                                                 |
| invalid v3 live config/view                                                                                                               | 进入 stable invalid editor state                                                    | 进入 stable invalid editor state                               | 清 active interaction/selection，发一次 `onConfigRejected`；不发 command/view event                                                                                                                                                                            |
| readOnly toggle                                                                                                                           | 保留 view/history/selection                                                         | 相同                                                           | `false -> true` 取消 active drag/marquee/Tooltip，不产生 command/history；`true -> false` 只重新启用合法 controls，不伪造事件或恢复旧 interaction                                                                                                              |
| historyLimit change                                                                                                                       | 使用新 limit 创建 session                                                           | 使用新 limit 创建 session                                      | 清空旧 history，保留当前有效 view/selection                                                                                                                                                                                                                    |
| standalone controlled `view` update                                                                                                       | n/a                                                                                 | 验证并显示 host view                                           | 仅与 existing/pending session 的 source fingerprint、historyLimit 和 view 一致时保留 session/history，否则创建新 session；reconcile selection，不伪造 command/view event                                                                                       |
| standalone `defaultView` update                                                                                                           | 只作为初始化或 source/config 失配后的 fallback；单独改变不替换当前有效 view/session | 与 `view` 同时存在时沿用 existing controlled-option validation | 单独改变不发 command/view/selection event                                                                                                                                                                                                                      |
| uncontrolled -> controlled                                                                                                                | n/a                                                                                 | 同一更新必须提供有效 host `view`                               | host view 成为 authoritative；按 standalone controlled view 规则保留或重建 session，reconcile selection，不伪造事件                                                                                                                                            |
| controlled -> uncontrolled                                                                                                                | 当前已接受的 controlled view 成为 uncontrolled seed                                 | n/a                                                            | source fingerprint、historyLimit 和 view 一致时保留 session/history，否则创建新 session；reconcile selection，不伪造事件                                                                                                                                       |

上述 update matrix 延续 existing EditorStore 的 invalid-state contract；v3 不把 ordinary invalid config/view
update 改成 retain-previous-state。hostile option inspection/callback-type failure 继续使用 existing atomic retain
path。presentation update 中除 callback identity 外，凡导致 render/layout/plot geometry 变化者也先取消
active interaction/preview/Tooltip。所有 semantic source update 在 apply 前执行同一取消规则。selection 真正变化时才发
`onSelectionChange`。source update 不发 `onViewChange` 或 `onCommand`。presentation/callback-only update 不
发 selection event。仅在 v3 amount 或 numeric metadata 中互换 `0`/`-0` 是 fingerprint-invariant 等价更新，
不重建 session，projector 与 formatter 继续使用正零。

selection 保留且原 stable focus-key target 仍 connected、visible、enabled 且 focusable 时才保留该 target。
node 消失、selection 清空、editor 进入 invalid state，或 panel/Inspector mode/readOnly update 使原 target
隐藏、disabled、detached 或不可聚焦时，无论 selection 是否保留都执行 focus fallback：首个可见 Outline
treeitem、首个可用 toolbar control、programmatically focusable chart-stage heading、editor root。被关闭/隐藏的
panel、narrow modal 内不可见元素跳过；fallback 不把 focus 移到 disabled control 或 Canvas-only mark。

React 必须在同一次 render、Vue 必须在同一次 reactive flush 提交新的 controlled source/config 与 compatible
view；分两步提交允许中间 update 被原子拒绝。invalid initial config 仍创建 stable invalid editor surface。
DOM、React 和 Vue contract tests 必须覆盖 standalone controlled view、defaultView-only、两种 mode transition，
上表完整 presentation surface、2/4-series controlled/uncontrolled live series reorder、Outline/Inspector hide、
Inspector static/tabs 切换、readOnly 双向 toggle，以及 category/collapsed/expanded/multi-selection Inspector
fields；三种宿主的 state、callback count、series order、resolved default palette 和 focus result 必须一致。

## Approval Gate

本文的 host、rendering、geometry、a11y、export 与 update semantics 已与其余 G003 contracts 一起于
2026-08-12 获得用户明确 breaking approval；TDR-025、technical plan 与 work graph 也已获批。当前 T135
只处理 schema/public type 基础，editor/G2 runtime 由 T137-T140 的串行前置依赖阻塞。
