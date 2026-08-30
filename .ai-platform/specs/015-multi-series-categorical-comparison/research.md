# G003 多序列分类比较技术研究

## Metadata

- Version: 0.1.0
- Status: Completed
- Feature ID: `015-multi-series-categorical-comparison`
- Goal ID: `G003`
- Last updated: 2026-08-12
- Runtime baseline: `@antv/g2@5.4.8`、`@antv/g-svg@2.1.1`
- Scope: 现有 core/editor 架构接缝、G2 分组 interval、label、legend、Tooltip、scene geometry、导出与兼容性

## Research Questions

1. schema `3.0.0` 能否在不复制命令内核的前提下保持 category-only 编辑？
2. G2 5.4.8 能否原生完成 2 至 4 series 的 bar/column 并排布局、稳定顺序、legend 与 shared Tooltip？
3. 同一 category 产生多个 scene elements 后，直接操作如何避免使用单根柱 bounds 或猜测 band geometry？
4. 逐 series label、category annotation 与 expanded-group region 如何延续 TDR-017 的 renderer ownership？
5. screen、SVG、PNG、DOM、React、Vue 与旧 v1/v2 consumer 如何共享一套可验证语义？

## Existing Architecture Assessment

### Core

- `packages/core/src/domain/model.ts`、`validation.ts` 与 `chartConfig.ts` 已使用 schema generation、
  `dataKind` 和 chart type 组成 closed discriminated contracts；v3 应增加显式 variant，不能修改 v2 item 的
  required scalar `amount`。
- `createInitialViewSpec.ts`、`viewTree.ts`、`executeCommand.ts`、`history.ts` 与 `editorStore.ts` 已把 source item
  作为叙事叶子。v3 category item 继续是叶子，因此 command union、selection 与 tree transform 无需增加
  series 命令。
- 现有 categorical projection 每个 node 只有一个 scalar amount，collapsed group 使用一个 accumulator。
  v3 必须使用独立 projection 类型，并对每个 series 分别执行 compensated sum。
- `session.ts` 的 fingerprint 当前按 scalar item 序列化。v3 必须按 schema 分支加入 series registry 与每个
  cell；v3 `-0` 只在 canonical fingerprint 中归一为 `0`，不能改变 v1/v2 行为。

### Editor And Renderer

- 现有 categorical G2 spec 使用一个 interval、`key=nodeId`、`color=kind` 并关闭 legend；comparison 需要
  独立 adapter，以 `color/series=seriesId` 表达 series identity，以复合 element key 表达更新 identity。
- `chartPointer.ts` 可以从 datum 的 `nodeId` 把任一 series mark 归一为 category；但 `chartSurface.ts` 中
  以 `Map<nodeId, bounds>` 或 `.find()` 读取 scene bounds 的路径会在重复 `nodeId` 时丢掉 marks。
- screen、SVG 和 PNG 已共享 G2 spec/runtime 方向，但 export request 只区分 chart type 和 scalar projection。
  v3 需要按 schema/family 区分内部 request，并允许合法空 comparison projection 导出。
- Outline、Inspector、summary 与 host adapters 已由 framework-neutral editor 统一拥有。series 只扩展其
  presentation data，不进入 React/Vue 私有状态。

## G2 5.4.8 Characterization

本轮规划前的真实 Canvas/SVG characterization 得到以下结论；实现阶段必须把这些观察固化为仓库内测试，
不能把研究记录当作永久兼容保证。

### Grouped Interval

- 一个 interval mark 使用 `encode.x=nodeId`、`encode.y=amount`、`encode.series=seriesId`、
  `encode.color=seriesId`、`encode.key=elementKey` 和 `dodgeX`，可以稳定生成每个 category 的 2 至 4 个 marks。
- `dodgeX` 优先使用 `series` channel，并把 transform padding 写入 series band 的 `paddingInner`。interval 与
  series-positioned helper mark 必须共享显式 series domain、`paddingInner=0.08` 与 `paddingOuter=0`，不能依赖
  各 mark 默认值。
- column 使用 category scale `reverse:false`；bar 使用同一 encode、`coordinate.transpose` 与 category scale
  `reverse:true`，才能保证首个 category 位于顶部。
- 零值 interval 仍存在，但 value-axis bounds 可以退化。空 data 配合显式 color domain/range 仍可生成完整 legend。

### Legend And Tooltip

- color ordinal domain/range 可以把 source series order 与 resolved palette 固定为唯一显示顺序；legend 的
  label formatter 可以把 `seriesId` 映射为安全 series label。
- G2 默认启用 legend filter。comparison view 必须显式关闭 `legendFilter` 与 `legendHighlight`，保证 legend
  只读，不能让过滤后的 geometry 与 category-only 编辑状态分叉。
- grouped interval 配置 shared Tooltip 后可返回同 category 的全部 series items。Tooltip 必须显式按当前
  source series ordinal 排序；仅依赖 scene element join 顺序会在 live reorder 后保留旧顺序。
- G2 5.4.8 在 series registry order、ID 或 count 结构变化时可能复用旧 legend item node，导致可见 legend
  顺序与新 domain 不一致。该更新必须建立 fresh legend component/view identity，而不是只更新 scale data。

### Labels And TDR-017

- 独立 `text` mark 不支持 interval 的 series band placement；直接对 text 应用 series/dodge 会让逐 series
  value labels 重叠在 category center。
- 透明 `point` helper mark 可以使用与 interval 相同的 category/value/series scale，并让 attached label 对齐
  每个 dodged series endpoint。helper mark 必须使用独立 namespaced key，且显式设置 `tooltip:false`、
  `axis:false`、`legend:false`、`animate:false`、`opacity:0` 和 `pointerEvents:'none'`。
- nonzero category/collapsed-group annotation 可使用一个 series-positioned point，选择绝对值最大 series，tie
  按 source order；all-zero annotation 使用不带 series channel 的 category-centered point，并在 plot interior
  内选择可见 offset。
- scene receipt 只接受 comparison 主 interval mark；transparent point 和 attached label 不得进入 hit、drag、
  marquee 或 action geometry。

### Renderer-Owned Geometry

- scene element data 同时保留 child mark identity、encoded element key 与原始 datum，可据此严格验证
  `(nodeId, seriesId)` pair，而不新增 public renderer fields。
- authoritative receipt 只能在当前 render settled 后建立；每个 visible node 与每个 declared series 必须恰有
  一个 finite interval rect。missing、duplicate、unregistered、stale 或 key mismatch 使整份 direct-manipulation
  receipt 不可用，不能局部 first/last wins。
- exact hit 使用实际 interval rect；marquee 对实际 rect 求交后按 nodeId 去重；drop 使用 category-axis interval
  union；ghost 使用 2D union。这四种 geometry 不能压成一份通用 bounds。
- all-zero node 的 exact target 使用 G2 category band，而不是 zero rect 的 inset union。category band 来自目标
  view 的 band scale、coordinate 与 layout offset；value axis 使用以零基线为起点、在 plot interior 内完成的
  32 CSS px target strip。
- resize、render、accepted layout/config/source/view update 会改变坐标系时，必须先无历史地取消 active drag、
  marquee、hover 与 Tooltip，再 invalidate receipt。active drag 只冻结未发生 geometry change 的 receipt。

## Alternatives Considered

### 将每个 category-series cell 作为顶层 source item

Rejected。它会让 `rootOrder`、selection、pin、annotation 和 command 的编辑原子退化为单根柱，破坏
category-only 叙事合同。

### 在 v2 item 增加 optional `seriesValues`

Rejected。required scalar `amount` 与 values 会形成重复事实和虚构 total，同时悄然改变已发布 closed schema。

### 新增 `groupedBar` / `groupedColumn` chart type

Rejected。comparison 是 categorical encoding 的新 schema generation，不是新的布局家族；保留 `bar | column`
可以复用现有 chart policy、commands 与 transpose 语义。

### 使用 stacked、第二 value axis 或跨 series total

Rejected。实际/预算、本期/上期等 series 不可相加；首期共享一个 value axis，只做并排比较。

### 使用 standalone text、DOM overlay 或手写 Canvas labels

Rejected。standalone text 无法可靠进入 series band；DOM/Canvas overlay 会建立第二套 scale、导出和动画路径。
v3 使用 G2 point helper + attached label，v1/v2 继续使用已确认的 text mark。

### 用 category cluster 的 2D union 处理所有交互

Rejected。2D union 会把正负 marks 之间的大块空白误判为 exact hit 或 marquee；不同交互用途必须保留不同
geometry。

### 增加 drag、state、legend 或 label dependency

Rejected。G2、Pointer Events、现有 store 与 editor controllers 已覆盖需求；新增 dependency 不解决阻断问题。

## Dependency And Supply-Chain Decision

- 不新增 runtime 或 dev dependency，不修改 AntV 版本。
- `@antv/g2@5.4.8` 与 `@antv/g-svg@2.1.1` 的 direct dependency、许可证和发布 allowlist 保持不变。
- G2 scene/scale/component 行为通过 adapter characterization tests 隔离；未来升级 G2 时这些 tests 是重新评估
  receipt、legend remount、series padding 与 helper alignment 的退出闸门。

## Implementation Risks To Prove

1. series registry 结构更新时 fresh G2 identity 是否同时清理旧 legend、interaction 与 scene receipt。
2. bar/column、2/4 series、正负/零值下 point label center 与 interval center 的像素对齐。
3. all-negative domain 中 all-zero target 与 annotation 是否始终在 plot interior 可访问。
4. active animation、interrupt、resize 与 rapid update 下 receipt 是否只绑定当前 authoritative render。
5. empty comparison、长 legend 与窄容器的 screen/SVG/PNG parity。
6. `200 x 2` 真实 G2 reorder p95 与 `50 x 4` 视觉布局预算。
7. v1/v2 exact concrete type、wire、visual、export 与 package consumer regression。

## Research Conclusion

G003 在现有架构内可实现：core 增加显式 v3 comparison variant 和独立 projection；editor 增加独立
comparison G2 adapter、严格 scene receipt 与 category geometry；DOM/React/Vue 继续共享一套 runtime。
实现不需要新 chart type、命令、renderer、public migration helper 或 dependency。TDR-025 与已确认的
technical plan 已把 TDR-017 的 comparison label/group-region 特例和 G2 legend structural remount 固定为
可测试决策。
