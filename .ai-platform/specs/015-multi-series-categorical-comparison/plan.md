# G003 多序列分类比较 Technical Plan

## Metadata

- Feature ID: `015-multi-series-categorical-comparison`
- Goal ID: `G003`
- Version: 0.1.0
- Status: Confirmed；TDR-025-A01 / T140 ownership amendment 为 Confirmed
- Last updated: 2026-08-28
- Source contract: `spec.md`、`data-model.md` 与 `contracts/` 已 Confirmed
- Target: 本地 `tellplot@2.0.0` candidate；comparison source/view schema `3.0.0`
- Approval: 用户于 2026-08-12 明确批准本 plan、TDR-025 与 T135-T141 work graph；于 2026-08-27 明确批准
  TDR-025-A01 与 T140 amendment；于 2026-08-28 完成 G003 目标级验收

## Plan Objective

在保持 v1/v2 wire/runtime/persistence 和现有命令模型的前提下，为 core、framework-neutral editor、
DOM/React/Vue 宿主、导出、公共包与文档实现 schema `3.0.0` 多序列 categorical comparison。实现必须把
category 保持为唯一编辑原子，把 series 保持为 source-owned 只读比较维度，并通过 renderer-owned scene
geometry 完成整组直接操作。

本 plan 已按串行 work graph 完成执行；T135-T141 与 G003 已通过完整质量矩阵、三层终审和用户目标级验收，
状态为 `Accepted`。dependency、远程 Git、publish、tag、release 与 production promotion 仍需独立批准。

## Technical Context

- Language: TypeScript strict；禁止 `any`、`@ts-ignore`、`@ts-expect-error`。
- Core: `@tellplot/core` private workspace layer，无 DOM/G2/React/Vue import。
- Renderer/editor: `@tellplot/editor` private workspace layer，G2 5.4.8 是唯一 chart renderer。
- Hosts: imperative DOM runtime + React 18/19 与 Vue 3 薄适配。
- Distribution: 单一公共 `tellplot` package 与现有五个 export paths。
- Testing: Vitest、Playwright、axe、package consumers、framework/current/previous-browser matrix。
- Dependency decision: 无新增 dependency；保持现有 AntV direct dependencies 和 lockfile供应链边界。

## Current Architecture Assessment

### Stable Boundaries To Preserve

- `SourceData` / `ViewSpec` 使用 schema generation 做严格兼容，不进行启发式迁移。
- `ViewSpec`、tree transform、command union、history、revision、annotation 与 emphasis 是唯一叙事状态。
- `projectCategorical` 与 `CategoricalDatum` 是 v2 scalar public contract，不宽化为 union。
- `createEditor` 持有 G2 lifecycle、直接操作、Outline、Inspector、summary、export 与 a11y；React/Vue 不复制状态。
- screen、SVG 与 PNG 复用同一 projection 与 spec factory；公共 API 不暴露 G2 instance/raw spec。

### Required Extensions

- core 增加 v3 comparison source/view/config types、closed validation、projection、fingerprint 与 store update 分支。
- categorical editor 内部以 `generation: 'scalar' | 'comparison'` 判别 projection/spec/export path；不新增 public
  chart family 或 registry。
- comparison adapter 将一个 category projection 扁平化为多个 renderer marks，同时保留 category `nodeId`。
- scene receipt 从单 node 单 bounds 升级为严格的 node-by-series interval receipt，再按用途派生 geometry。
- Outline 保持 category tree；Inspector/summary/Tooltip 展示 source-ordered series values；empty source 摘要保留
  series registry。
- local package candidate 升为 2.0.0，同时保留已发布 1.0 workflow、T131 evidence 与远程发布配置的历史完整性。

## Target Architecture

```text
CategoricalComparisonSourceData (schema 3)
        |
        v
closed validation + source fingerprint
        |
        +--> category-only CategoricalComparisonViewSpec
        |
        v
projectCategoricalComparison
  category/collapsed-group + ordered per-series values
        |
        v
private comparison adapter
  flat marks + palette/legend/tooltip + labels/regions
        |
        +--> G2 Canvas screen --> settled comparison scene receipt
        |                         --> exact/drop/ghost/marquee geometry
        |
        +--> fresh G2 SVG/PNG export runtime
        |
        +--> Outline / Inspector / narrative DFS summary

DOM createEditor owns runtime and state
        ^                         ^
        |                         |
React adapter                Vue adapter
```

## Core Design

### Schema And Validation

1. 在 `domain/ids.ts`、`model.ts` 与 `config/chartConfig.ts` 增加已批准的 comparison concrete types，并只扩展
   approved public unions。
2. validation 先完成 closed structural validation，再在 series registry 有效时执行 reference、coverage 与
   order relational validation，遵守 `contracts/validation.md` 的 exact precedence、message、path 与 safe details。
3. `createInitialViewSpec` 对 v3 只创建 category root order，默认 column；series 不进入 tree、pin、annotation
   或 emphasis reference space。
4. `serializeViewSpec` / `parseViewSpec` 保留 exact generation；source/view/chart compatibility 使用已批准矩阵，
   不隐式迁移。
5. `toFinancialChartAppearance` 继续映射三代共同 presentation semantics；comparison series palette 与 legend
   由 editor 内部 resolver 读取，不扩展 public `FinancialChartAppearance`。

### Projection And Aggregation

1. 新建独立 `comparisonTypes.ts` 与 `comparisonProjection.ts`；`projectCategoricalComparison(SourceData,
   ViewSpec)` 是唯一新增 runtime export。
2. projection 复用现有 narrative tree traversal，但普通 category 输出 source-ordered values，collapsed group
   为每个 series 建立独立 Neumaier accumulator。
3. 每个 series 聚合分别检查 finite/safe；任一失败使整个 projection 原子失败。禁止生成 category/group total。
4. v3 amount 输出把 `-0` 规范为正零；source object identity 与内容保持不可变。
5. v2/v3 projector 在 source/view 本身不兼容时先返回现有 compatibility issue；只有一对彼此 compatible 但
   属于另一 generation 的 source/view 才返回 approved projector-generation issue。

### Session And Update Semantics

1. fingerprint 按 schema 分支，对 v3 canonicalize series registry、category/value 与各层 metadata；number `-0`
   使用正零 canonical token，v1/v2算法不变。
2. source semantic update、category order-only update、series reorder/structure update、presentation-only update、
   category ID set 与 generation change 分别执行 approved matrix。
3. category-only command、selection、history 与 undo/redo 继续使用一套实现；不增加 series command 或 cell state。
4. source/session replacement 不伪造 command/view callbacks；selection 只在归一结果变化时发一次事件。

## G2 Presentation Design

### Internal Datum And Stable Identity

comparison adapter 按 category-major、series-minor 顺序产生 internal datum：

```typescript
interface ComparisonMarkDatum {
  readonly nodeId: ViewNodeId;
  readonly categoryLabel: string;
  readonly seriesId: SeriesId;
  readonly seriesLabel: string;
  readonly amount: number;
  readonly elementKey: string;
  readonly nodeKind: 'category' | 'group';
  readonly categoryOrder: number;
  readonly seriesOrder: number;
  readonly locked: boolean;
}
```

`elementKey` 使用 `JSON.stringify([namespace, nodeId, seriesId])` 生成可逆、无分隔符碰撞的 tuple identity；
不使用 hash 或 `${nodeId}:${seriesId}`。child mark identity 与 element identity 分开命名。

### Main Interval

- 一个主 interval child mark，private mark key 固定为 comparison interval identity。
- `encode: x=nodeId, y=amount, series=seriesId, color=seriesId, key=elementKey`。
- `dodgeX(groupBy:'x', padding:0.08)`；series band 显式 `paddingInner=0.08`、`paddingOuter=0`。
- category、series 与 color domain 均从 authoritative projection/source registry 显式提供；不按 value 排序。
- column category scale `reverse:false`；bar 使用 transpose 且 category scale `reverse:true`。
- y domain 包含所有 visible amounts 与 zero baseline；positive/negative 不再覆盖 series fill。

### Appearance, Legend And Tooltip

- internal comparison resolver 把 source order、默认 palette 与 partial overrides 解析为完整 color range；group
  region color继续使用 comparison `colors.group`。
- color legend 默认显示且只读，series ID 由 safe formatter 映射为 label；显式关闭 `legendFilter` 与
  `legendHighlight`。
- Tooltip 默认 shared，title 为 escaped category label，每个 item 只含 escaped series label 与格式化 value；
  view-level sort 使用 current `seriesOrder`，不依赖 scene join order。
- tooltip disabled 或 export runtime 显式关闭 Tooltip interaction，不能依赖 G2 default。
- series order/ID/count 结构变化先取消 interaction、销毁 receipt，再建立 fresh G2 chart/view identity；label-only
  与 presentation-only 更新可以走普通 render lifecycle。

### Labels And Expanded Group Regions

TDR-025 对 TDR-017 作 comparison-only amendment：

- v1/v2 已有 standalone text value/group labels 保持不变。
- v3 per-series value label 使用透明 G2 point anchor + attached label；point 与 interval 共享完全相同 x/y/series
  scale factory和 padding。
- v3 nonzero category/collapsed-group annotation 每 node 只产生一个 series-positioned point，锚定 max-abs
  series endpoint，tie 按 source order。
- v3 all-zero annotation 使用无 series channel 的 category-centered anchor，x 来自完整 G2 category band center，
  y 来自 zero baseline；label offset 在 plot interior 内优先正向、越界时翻转并约束。
- v3 expanded-group label使用无series channel的transparent point与attached label，锚定first visible member
  完整cluster center与`valueEnd`，共享flip/contain transform。
- helper marks 使用独立 namespaced keys，并固定 `tooltip:false`、`axis:false`、`legend:false`、`animate:false`、
  `opacity:0`、`pointerEvents:'none'`；receipt 只读取主 interval。
- comparison expanded-group region value extent 为所有 visible member × series amounts 与 zero 的 min/max；region
  横跨 first/last visible category band。group label 位于 first visible member 的完整 category cluster center、
  `valueEnd`，不绑定任何 series；nested depth offset 沿用现有 policy。

## Scene Receipt And Direct Manipulation

### Authoritative Receipt

新建 private comparison receipt adapter，receipt 包含 render signature/revision、physical category axis、expected
interval marks 与按 projection/source order 重建的 category geometry。

receipt 只在当前 authoritative render settled 后建立，并要求每个 visible node × declared series 恰有一个：

- `markType === 'interval'`；
- child mark identity 等于 comparison main interval；
- scene element key 等于 datum `elementKey`；
- node/series 属于当前 registry；
- bounds finite；
- render signature 与当前 source/view/config/size 一致。

missing、duplicate、unregistered、stale、invalid bounds 或 key mismatch 使整份 receipt non-authoritative。chart exact
hit、drag、marquee 与 action rail fail closed；Outline、keyboard、Inspector 与 host commands 继续可用。

### Geometry Uses

- exact hit：实际 interval rectangles；cluster gap 保持空白。
- marquee：逐实际 rectangle 相交，再按 category `nodeId` 去重。
- drop/action：同 category interval 在 physical category axis 上的 union；active drag 的窄目标按相邻 union 中点
  确定 tie，projection order 优先。
- ghost：同 category 全部 interval 的 2D union。
- all-zero exception：完整G2 category band × zero baseline strip；plot value-axis span至少32px时总厚度固定
  32 CSS px，positive侧不足时从negative侧补足；span不足32px时使用完整interior；marquee仍使用退化实际rect。

pointerdown 先 finish current animation 再读取 settled receipt。resize、render、accepted geometry-affecting update、
source/view/config replacement 与 destroy 必须先取消 active drag/marquee/hover/Tooltip 且不写 command/history，
随后 invalidate receipt；新 render settled 后才重建。

## Editor, Accessibility And Host Integration

### Projection Routing

editor private projection union 保留 `family:'categorical'`，增加 `generation:'scalar'|'comparison'`，让 spec、
export、Inspector 与 summary 精确 narrow。不得把 comparison datum 伪装成 scalar `CategoricalDatum`。

### Workbench Semantics

- Outline 每个 category/group 一行，comparison 行只显示 series count，不显示 total。
- Inspector 按 contract 区分 category、collapsed group、expanded group 与 multi-selection；multi-selection 不选
  primary node、不跨 category 聚合 value。
- summary 无条件先朗读 source-ordered series registry，再按 narrative DFS 朗读 expanded structural entry、
  category 与 collapsed group；合法 empty source 仍能识别全部 series。
- selection、lock、annotation、emphasis、group action 与 command 只作用 category/group。
- focus key 只有在 target 仍 connected、visible、enabled、focusable 时保留，否则使用 approved panel-aware fallback。

### DOM, React And Vue

- imperative runtime 是唯一 update/selection/focus/callback semantics owner。
- React controlled source/view 必须在同一 render 提供 compatible pair；Vue 在同一 reactive flush 提供。
- adapters 只转发现有 props/events/handle，不增加 comparison-only component API。
- standalone view/defaultView、controlled/uncontrolled transition、readOnly 双向切换、panel/Inspector mode 与完整
  presentation update 都有三宿主 contract tests。

## Export Design

- internal export request 按 scalar categorical 与 comparison categorical 判别，不仅按 `bar|column` 判别。
- screen、SVG、PNG 共享 comparison projection、series registry、resolved palette、legend、label、region 与
  number format spec factory；export 使用 fresh G2 runtime 并关闭 interaction/animation。
- v3 empty projection 不返回 `EXPORT_UNAVAILABLE`；显式 color domain/range 保留可选 legend，并输出合法尺寸、
  title、background 与空 plot。v1/v2 empty/export behavior 保持不变。
- SVG sanitizer 继续拒绝 remote resource 与 unsafe node；PNG 继续从同一离屏 spec 生成。

## Public Package, Documentation And Migration

- `packages/tellplot` local candidate version 设为 `2.0.0`；private workspace package version policy保持不变。
- package export map不变；root/core导出16个已批准 type与一个 runtime projector，framework subpaths保持原表面。
- package/type consumers覆盖 v1/v2 concrete fixtures、v3 construction、公开联合 exhaustive migration 与 guide
  示例的 isolated strict TypeScript compile。
- playground增加 actual-vs-budget 2-series 与 business-line 4-series 示例，只消费 public entrypoints。
- docs更新 API、configuration、errors、getting started、architecture、versioning 与 migration canonical content。
- data contract、API、configuration与migration文档的全部TypeScript code fences由local harness逐段抽取并在
  built declarations/tarball上isolated compile；非standalone片段必须显式标注并由harness组合，不能任意排除。
  breaking边界使用独立expected-failure fixture断言目标diagnostic，再编译migrated fixture，禁止
  `@ts-expect-error`。
- 不新增 runtime migration helper；fresh view与 preserve narrative都是 host-side显式路径。
- local candidate使用独立`release:candidate:audit`、artifact与rehearsal命令，必须显式candidate version/evidence
  task；published-lineage `release:audit`/artifact/rehearsal保持1.0/T131语义并作为immutability fixture。

### Published 1.0 Lineage Boundary

本地 2.0 candidate validation 不覆盖或改写已验收的 `.ai-platform/evidence/T131/**`，不修改 npm publish workflow、
tag、Trusted Publisher、availability 或 production preflight。candidate artifact命令必须接收独立 evidence root/task
并 fail closed；默认的已发布 1.0 provenance assertions保持可重放。本目标的 tarball manifest/hash与 isolated-source
receipt只写入 G003 final task evidence。

## Delivery Strategy

### T135 Schema 3 与 Public Type 基础

先建立16个approved types、closed validation、appearance config、persistence/create-initial/fingerprint contract，
并让旧projectors对新union完成防御性generation narrowing。projection type definitions进入独立
`comparisonTypes.ts`，但此阶段不实现comparison runtime projector。

### T136 Comparison Projection 与 State Invariants

实现唯一runtime export、逐series aggregation、commands/history/session/store update semantics与property tests。

### T137 G2 Comparison Presentation

实现 internal flatten/spec/palette/legend/Tooltip/label/group-region，并用真实 G2 characterization 固定
bar/column、2/4 series、empty/live reorder behavior。

### T138 Scene Geometry 与 Category Direct Manipulation

实现 authoritative receipt、四种 geometry、all-zero fallback、render lifecycle cancellation 与整组 pointer/marquee/
drag/action behavior。

### T139 Workbench、Accessibility 与 Host Parity

完成 Outline/Inspector/summary/focus/update/readOnly/panel semantics，以及 DOM/React/Vue parity。

### T140 Export、Playground、Docs 与 Local 2.0 Candidate

完成 SVG/PNG/empty parity、public examples、migration/type docs、package consumer与 candidate-aware local artifact
tooling；保持 published 1.0 lineage与remote configuration不可变。

T140 的真实 G2 SVG RED 证明后置 helper 的 `axis:false` 会覆盖 main interval shared scale guide。
TDR-025-A01 采用 private helper scale key isolation：保留原 Canvas paint order与唯一 main interval guide owner，
helper继续 `axis:false`、`legend:false`，只隔离G2 guide merge。该修复精确拥有
`packages/editor/src/charts/categorical/comparisonSpec.ts` 与既有 canonical spec test，不进入receipt/geometry/
interaction或v1/v2路径。T140还必须为4-series public-only example补完整edit/collapse/ViewSpec/SVG/PNG journey，
并以真实SVG bbox/anchor验证group、annotation与empty legend on/off，而不是只检查raw string或mock spec。

### T141 Full Quality And Goal Evidence

执行 performance/layout/current+previous browser/full package矩阵、isolated-source candidate rehearsal与三层 review；
只形成local evidence，不执行remote/release动作。

T135-T141默认顺序执行。即使 T139 与 T140 在 T138后可按文件所有权并行，当前主 worktree采用串行交付，
避免package/type/fixture与runtime update语义的集成漂移；独立review可以并行。

## Test And Evidence Strategy

### TDD Layers

1. Core RED：schema/reason/path、config、projection、aggregation、invariants、persistence、fingerprint、store update。
2. Renderer RED：canonical G2 spec、point-label alignment、legend/Tooltip、group regions、receipt与geometry。
3. Workbench RED：Inspector/summary/focus/update/callback与三宿主生命周期。
4. Export/package RED：SVG/PNG/empty、public exports、consumer/migration、playground public-only imports。
5. Browser RED：real Canvas/SVG rendering、interaction、a11y、responsive与performance。

每个行为 task必须保留 RED failure reason、GREEN result和refactor后fresh validation；Mock G2不能替代真实
Canvas/SVG验收。

### Performance And Visual Matrix

- `200 categories x 2 series`：warm-up 后 keyboard/direct pointer交替各30次；两组 commit-to-painted-frame p95
  均 `<=150ms`，并证明 direct preview按 RAF 合并且不触发host React root commit。
- `50 categories x 4 series`：`1280x720` / `640x480` × `zh-CN` / `en-US` × idle/hover/active-drag；真实Canvas
  检查horizontal overflow、plot/legend/toolbar overlap、overlay occlusion与交互，同一真实G2 SVG挂入DOM后用
  `getBBox()`检查visible text pairwise intersection。`>40` marks明确断言value labels为0，再以Outline/Tooltip/
  Inspector证明全部category可读可编辑。
- browser matrix：Chromium、Firefox、WebKit current + repository previous-browser policy；comparison rendering specs
  不命名为 performance，确保进入 previous-browser runner。

### Final Gates

- format、lint、typecheck、coverage、build。
- core/editor/React/Vue/playground/package tests。
- framework matrix、E2E、a11y、performance、current/previous browser。
- dependency lock/production audit、architecture、candidate-only audit与published-1.0-lineage immutability contract。
- G003 candidate artifact、tarball manifest/hash与 isolated-source rehearsal。
- artifact validator、`git diff --check`、spec compliance、bug/code-quality与QA acceptance review。

公开 preflight、availability、tag、publish、GitHub Release、production promotion不在本目标 final gates中。

## Constitution Check

| Principle | Plan alignment | Result |
| --- | --- | --- |
| P-001 真实需求优先 | 只实现已确认的 2-4 series comparison，不预建 stacked/line/plugin | Satisfied |
| P-002 原始数据与视图分离 | source/value不可变，series不进入 ViewSpec | Satisfied |
| P-003 一个确定性编辑入口 | 复用现有 category/group commands，无 series command | Satisfied |
| P-004 轻量核心 | 无服务、AI、Dashboard、registry或第二 renderer | Satisfied |
| P-005 数据不变量优先 | dense coverage、逐 series compensated sum、atomic overflow与property tests | Satisfied |
| P-006 G2 原生优先 | interval/dodge/legend/Tooltip/point/scale/scene均由G2拥有 | Satisfied |
| P-007 直接与精确操作并存 | scene geometry直接操作 + Outline/keyboard fallback | Satisfied |
| P-008 可感知性能/可打断 | stable tuple key、cancel lifecycle、reduced motion与量化budget | Satisfied |
| P-009 实现后抽象 | 新 comparison adapter，不建立通用chart plugin layer | Satisfied |
| P-010 Evidence over assertion | TDD、真实浏览器、a11y、performance、package与isolated-source gates | Satisfied |
| P-011 框架边界 | core无DOM/G2，editor无React/Vue，adapters无领域状态 | Satisfied |

Constitution violations: None。

## Risk Register

| Risk | Impact | Mitigation / Evidence |
| --- | --- | --- |
| G2 incremental legend保留旧item顺序 | live series reorder显示错误 | registry结构变化重建private chart/view；真实Canvas/SVG label-position test |
| point helper与interval series band漂移 | label对应错误series | 共享显式scale factory/padding；2/4 series bar/column像素中心characterization |
| stale/partial scene receipt | 拖错category或错误落点 | settled N×S exact receipt；任一异常整份fail closed；lifecycle invalidation tests |
| all-zero/all-negative target不可达 | 无法鼠标操作category | G2完整band + plot-interior 32px strip；bar/column局部/全局零浏览器测试 |
| expanded group跨series extent错误 | region截断或虚构series语义 | all member×series+zero projection；cluster-center group label anchor tests |
| v3 union破坏v1/v2内部访问 | compile/runtime regression | schema narrowing、concrete type fixtures、旧wire/visual/export/package matrix |
| local 2.0 tooling覆盖1.0 provenance | 历史evidence或发布配置被污染 | candidate独立evidence root；T131/workflow/preflight禁止修改；release-boundary tests |
| 400 marks性能退化 | drag或commit超预算 | mark-count density policy、RAF preview、200x2两路径p95 evidence |

## Supporting Artifacts

- Product/spec: `spec.md`
- Exact model: `data-model.md`
- Public contracts: `contracts/public-api.md`、`validation.md`、`editor-api.md`、`migration.md`
- Research: `research.md`
- Requirements checklists: `checklists/requirements.md`、`checklists/public-contract.md`
- Architecture decision: `.ai-platform/docs/technology-decision-record.md` TDR-025
- Work graph: `tasks.md`
- Consistency analysis: `analysis.md`

## Approval Gate

- Result: Approved
- Approval evidence: 用户于 2026-08-12 明确批准本 technical plan、TDR-025 与 T135-T141 work graph；于
  2026-08-27 明确批准 TDR-025-A01 与 T140 amendment。
- Execution state: planning artifacts 与 T140 amendment 均为 `Confirmed`；T135-T140 为 `Needs_Review` 且三层终审
  均为 Critical 0 / High 0 / Medium 0；T141 为 `Ready`，进入完整质量矩阵与目标级 evidence。
- Not authorized: dependency 安装或升级、stage/commit/push/PR、tag、publish、release 或 production promotion。
