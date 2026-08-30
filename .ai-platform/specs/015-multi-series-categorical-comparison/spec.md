# G003 多序列分类比较 Spec

## Metadata

- Feature ID: `015-multi-series-categorical-comparison`
- Goal ID: `G003`
- Version: 0.5.0
- Status: Confirmed
- Source: 2026-08-12 用户要求把分类叙事编辑从单序列提升为可用于业务比较的多序列能力
- Last updated: 2026-08-12
- Review: 产品范围审批已完成；精确 public API/schema/migration、G2 5.4.8 可实施性与 UX/a11y/host
  三路独立复核均为 Critical 0 / High 0 / Medium 0，精确 breaking contract 已获用户批准
- Approval: 用户于 2026-08-12 先后明确批准 G003 产品范围、`tellplot@2.0.0` / schema `3.0.0` 方向、
  精确 breaking public API/schema contract、TDR-025、technical plan 与 T135-T141 work graph

## Objective

TellPlot 为分类条形图和分类柱状图增加多序列业务比较能力，使财务分析与汇报用户可以在同一分类下比较
实际与预算、本期与上期或多个业务线，同时继续把分类作为唯一叙事编辑原子。

多序列只扩展分类图的数据表达和呈现，不建立第二套命令、状态或交互模型。排序、分组、折叠、分类
固定、节点注释、宿主 ViewSpec emphasis、撤销和导出继续作用于完整分类或对应叙事节点；
任何操作都不得修改宿主传入的原始数值。首期不新增 group pin 或交互式 emphasis command。

## Version And Compatibility Decision

本目标形成本地 `tellplot@2.0.0` 候选，并为多序列 source/view 使用 schema `3.0.0`。

- 公开 `SchemaVersion`、`SourceData`、`ViewSpec`、`ChartConfig` 和 validation reason 是已承诺的 `1.x`
  判别联合。增加多序列 variant 会改变 exhaustive TypeScript consumer 的编译边界，因此不伪装成 `1.x`
  minor。
- `2.0.0` runtime 继续原样读取、验证、渲染和序列化 legacy waterfall `1.0.0` 与现有
  waterfall/categorical `2.0.0`，已有 wire data 与持久化视图不需要迁移才能继续运行。
- schema `3.0.0` 只用于新的多序列 categorical source/view，不改变现有 schema 的 closed wire shape。
- `LegacySchemaVersion = '1.0.0'` 与 `CurrentSchemaVersion = '2.0.0'` 保留其 literal 含义；新增
  `ComparisonSchemaVersion = '3.0.0'`，并将 `SchemaVersion` 扩展为三个 generation 的联合。该精确名称
  属于已确认的 public contract。
- 现有 `CategoricalSourceData`、`CategoricalDatum`、`CurrentViewSpec` 继续表示 v2 scalar 合同；v3 使用
  独立的 source/view/datum types，再将新 variant 加入对应公开联合。新 types 的精确导出名在
  `data-model.md` 与 `contracts/` 中定义并已获批准。
- 使用具体 v1/v2 variant 的 canonical TypeScript fixtures 继续编译；对 `SchemaVersion`、`SourceData`、
  `ViewSpec` 或 `ChartConfig` 公开联合执行 exhaustive narrowing 的 source consumer 需要按 2.0 migration
  guide 处理新 variant，不承诺 source-level 零迁移。
- 本目标不执行 npm publish、Git tag、GitHub Release 或生产发布；这些动作继续保留独立人工闸门。

## Target Users And Jobs

### TU-MSC-001 财务分析与汇报用户

需要在固定业务分类下并列比较 2 至 4 个口径，并通过叙事排序、递归分组和折叠形成可交付图表。

### TU-MSC-002 Web 应用开发者

需要用一份显式、类型化的多序列 `ChartConfig` 接入 DOM、React 或 Vue，而不维护 G2 的 dodge、图例、
场景边界、动画或导出生命周期。

## User Stories And Scenarios

### US-MSC-001 创建业务比较图

开发者传入稳定的序列定义、分类定义和完整数值矩阵，用户看到按声明顺序排列的分组柱状图或分组条形图，
并通过图例、共享 Tooltip 和数值标签识别每个序列。

### US-MSC-002 调整分类叙事顺序

用户从任意一个序列柱开始拖动时，系统选择并移动完整分类 cluster；结构大纲、键盘和宿主命令产生相同的
分类级命令和一条历史记录。

### US-MSC-003 组织与折叠分类层级

用户创建递归分类组、跨层移动、固定分类、折叠或解散分组。折叠结果为每个序列分别聚合的比较 cluster，
不会跨序列计算没有业务意义的总额。

### US-MSC-004 检查与交付比较结果

用户在 Inspector、Tooltip 和无障碍摘要中按同一顺序读取全部序列值，添加分类级注释或强调，并导出与
屏幕一致的 SVG、PNG 和 ViewSpec JSON。

### US-MSC-005 保留既有接入

已有 waterfall 和单序列 categorical consumer 继续使用原有 source/view wire shape、默认视觉和运行时
行为；采用多序列能力的 consumer 明确选择 schema `3.0.0`。对公开联合做 exhaustive narrowing 的
TypeScript consumer 按 2.0 migration guide 增加 v3 分支。

## Core User Journey

1. 宿主使用 `type: 'column' | 'bar'`、schema `3.0.0`、2 至 4 个稳定 series 和完整 category/value matrix
   创建 editor。
2. TellPlot 验证 series、category、value 覆盖与 source/view compatibility，创建只包含分类节点的初始
   `ViewSpec`。
3. G2 按 series 顺序绘制并列 interval marks、只读图例和共享 Tooltip；每个 mark 保留所属 category ID。
4. 用户从任意 series mark、结构大纲或键盘路径移动、分组和折叠完整分类。
5. TellPlot 通过现有确定性命令提交一个 category/group 级变更，逐 series 校验聚合与来源覆盖。
6. 用户在 Inspector 和无障碍摘要中读取一致的 series 文本顺序、金额和分组语义；屏幕与
   导出另外保持一致 palette。

## Functional Requirements

### MSC-FR-001 多序列分类数据合同

多序列 source 使用以下语义合同：

- `schemaVersion: '3.0.0'`、`dataKind: 'categorical'`、稳定 `datasetId`、可选共享 `currency`。
- `series` 按显示顺序声明 2 至 4 个 `{ id, label, metadata? }`；series ID 唯一、非空。label 在
  trim 后非空，以 `label.trim().normalize('NFC')` 的大小写敏感结果校验唯一，不允许两个可见/可朗读
  series 使用相同名称。
- `items` 按默认分类顺序声明 `{ id, label, sourceRef?, metadata?, values }`；category ID 唯一、非空，
  label 非空，label 可以重复。
- 每个 `values` entry 为 `{ seriesId, amount, sourceRef?, metadata? }`，并按顶层 `series` 顺序完整且恰好
  覆盖每个 series 一次。
- `amount` 必须有限且绝对值不超过 `Number.MAX_SAFE_INTEGER`；metadata 继续只接受 JSON-compatible
  primitive。v3 将 `-0` 与 `0` 视为同一个业务零：validation success 保留输入 identity，但 projection、
  formatting 和 fingerprint canonical form 使用正零；仅在零符号变化时不创建新 session。v1/v2 行为不变。
- 缺失值不自动解释为 `0`。业务上的零必须显式传入 `amount: 0`；未知、重复或缺失 series value 使整个
  source 验证失败。
- category 与 series 是独立 ID namespace；series value 不成为 `ViewNode`，也不进入叙事树。

现有 schema `1.0.0` 与 `2.0.0` closed source shape 保持不变。系统不得从可选字段、`metadata`、数组长度
或 item shape 启发式推断多序列模式。

### MSC-FR-002 分类级 ViewSpec 与命令

schema `3.0.0` `ViewSpec` 继续使用 `chartType: 'bar' | 'column'`，并只保存 category/group 的顺序、递归
分组、折叠、category pin、node annotation、宿主 emphasis 和 revision。series 顺序来自不可变 source，
不进入 `ViewSpec`。

现有 `moveItem`、`moveGroup`、`createGroup`、`ungroup`、`collapseGroup`、`expandGroup`、`pinItem`、
`unpinItem` 和 `setAnnotation` wire shape 保持原语义：只有 category 可 pin，含 pinned descendant 的 group 继续
不可移动；`setAnnotation` 可作用于 category/group。emphasis 继续是宿主在受控 ViewSpec 或初始/持久化
ViewSpec 中提供的状态，不新增 `setEmphasis` command。series value 不支持单独选择、移动、固定、
注释、强调或历史操作。

### MSC-FR-003 确定性逐序列投影与聚合

一个可见 category 或 collapsed group 投影为一个稳定 category datum，其中包含按 source series 顺序排列的
2 至 4 个 series values。

现有 scalar `CategoricalDatum` 和 `projectCategorical` 保留 v2 精确签名与返回值。v3 使用独立的
`CategoricalComparisonDatum` / `CategoricalComparisonProjection` types 与
`projectCategoricalComparison` runtime export；内部可以共享叙事树遍历与求和实现，但不将现有 scalar
API 宽化成联合返回值。这些精确名称属于已确认的 public contract。

- 普通 category 的每个值等于对应原始 value amount，但 v3 的 `-0` 输出为正零。
- collapsed group 对每个 series 独立使用 compensated sum 聚合全部后代 category。
- compensated sum 的零结果规范为正零，避免显示或持久化出业务上不存在的负零。
- 任一 series 聚合非有限或超出安全整数范围时，整个 projection 失败，不返回部分结果。
- 系统不定义 category total、group total、variance、同比或百分比，不跨实际/预算等 series 求和。
- `sourceIds` 继续按叙事叶子顺序追踪 category ID，来源不丢失、不重复。

### MSC-FR-004 分组柱状图与分组条形图

多序列 categorical 继续使用 `column` 和 `bar` 两种 chart type，不增加 `groupedColumn`、`groupedBar`
或公共 chart registry。

- G2 使用一个 `interval` mark、series color encode、稳定 category/series 复合 mark key 和原生 `dodgeX`。
- column 首个 category 位于左侧，bar 首个 category 位于顶部；每个 category 内的 series 顺序始终与
  source 声明一致，不按数值重排。
- series 颜色与只读 legend 一一对应。多序列正负值通过零基线、方向和带符号数值表达，颜色不再承担
  正负语义。
- 同一 category 可以同时包含正数、负数和零；bar transpose 后保持完全相同的逻辑顺序和数值语义。
- expanded group region 覆盖组内所有 category 的全部 series 数值范围；collapsed group 不绘制展开区域。

G2 5.4.8 已提供本目标需要的
[dodgeX](https://g2.antv.antgroup.com/en/manual/core/transform/dodge-x)、
[分类图例](https://g2.antv.antgroup.com/manual/component/legend)与
[shared Tooltip](https://g2.antv.antgroup.com/en/manual/component/tooltip)。TellPlot 不重复建设这些运行时。

### MSC-FR-005 整组直接操作与命中

任一 series mark 的 pointer event 都映射到所属 category `nodeId`。TellPlot 必须使用 G2 场景图提供的
mark bounds 派生四种目的明确的 category geometry：

- exact hit 使用实际 mark event/bounds，点击任一 mark 归一到 category 并激活 hover action，不将
  cluster 空白区当作实柱命中。
- drag/drop 使用同 category 所有 mark 在 category axis 上的 interval union，用于 hover action 定位、
  活动拖拽时的窄容器目标、分类轴碰撞、`before | after | inside` 落点、跨展开分组边界移动和
  来源组自动解散。
- ghost 使用同 category 全部 mark 的 2D bounds union。
- marquee 分别与实际 mark rectangle 求交，再按 category ID 去重。
- 非活动拖拽时，cluster 间隙不选中 category，按既有空白区语义启动 marquee；已从实际 mark 开始
  拖拽后，间隙可作为 drop 区域。活动拖拽的最小目标重叠时，按相邻 category-axis interval union
  中点分区，中点 tie 按 projection 顺序选前者。`inside` 只对 group target 的中间区域成立。
- 全零 category 的 mark rectangle 若退化，exact hit 与 drag target 使用 G2 scene/scale 返回的 category
  band geometry，不回退到硬编码柱宽。

不得用最后一根柱的 bounds、第一根柱的 bounds、DOM 固定柱宽或估算 band geometry 代替相应的
renderer-owned geometry。拖动完整 category 只提交一条现有命令；预览、取消、blur、pointer loss、Escape 与
unmount 继续遵守既有语义。

### MSC-FR-006 Outline、Inspector 与选择

- Outline 每个 category/group 只显示一个 treeitem，series 不展开为树节点。
- 多序列行不得展示虚构的总额；紧凑表面显示 series 数量，Inspector 按声明顺序显示 series label 与格式化值。
- collapsed group Inspector 显示逐 series 聚合和 category 来源数量。
- expanded group Inspector 显示 expanded/source count/annotation/emphasis/locked state，不显示未投影的聚合值。
- multi-selection Inspector 只显示 selected node count、source category union count 与合法 group action；不选择
  primary node、不显示逐 series value、不跨 category 聚合金额。只有 single-selection 显示/编辑 node annotation。
- 点击任一 series mark 的 selection callback 继续返回所属 category/group 和 category `sourceIds`。
- category pin 同步锁定其全部 series marks；category/group annotation 与宿主 emphasis 作用于完整
  node，并同步影响其全部 series marks。不提供 group pin 或交互式 emphasis 命令。

### MSC-FR-007 Tooltip、标签与注释

- Tooltip 默认按 category 共享，标题为 category label，内容按 source 顺序显示全部 series label、颜色和
  格式化值；Tooltip 不执行宿主 callback 或任意 formatter。
- value label 以稳定 category/series 复合 key 锚定每个 mark；`auto` 密度按可见 mark 数而不是 category 数
  决定是否显示。
- 可见 category 或 collapsed group 的 annotation 通过 renderer-native label layer 只渲染一次；锚定到绝对值最大的
  series endpoint，tie 按 source series 顺序选先声明者，并沿该 endpoint 远离零基线的方向偏移。
  全零时锚定零基线与 category center，优先沿正值方向偏移（column 向上、bar 向右）；如果正值方向
  已位于 plot 边界，label 在 plot interior 内翻转偏移。expanded group
  annotation 保留在 Inspector/无障碍语义中，组折叠为可见
  cluster 时再按同一规则渲染一次。
- `auto` value labels 在可见 mark 超过 40 时全部隐藏。长 label 可以截断或轴上自动隐藏，但完整
  category/series/value 始终可从 Tooltip、Inspector 和摘要读取；可见标签不得与 legend、相邻
  category、toolbar、group action 或 drag indicator 相交。

### MSC-FR-008 安全序列外观配置

`ChartConfig.appearance` 增加有限、可序列化的 series 颜色和 legend 显示语义：

- 未配置颜色时使用固定顺序的 4 色 palette；每个颜色与白色 plot 背景的对比度至少为
  `3:1`，任意两色的 CIEDE2000 色差至少为 `20`。实际识别仍必须同时使用文本与稳定顺序。
- 宿主使用有序 `[{ seriesId, color }]` entries 按 series ID 提供合法十六进制颜色；未识别 ID、
  重复 series ID 或非法颜色被运行时校验拒绝。
- 多序列 legend 默认显示，可以显式隐藏；首期 legend 只读，不过滤、隐藏、重排或选择 series。
- appearance 不接受颜色 callback、任意 formatter、raw theme、G2 scale/legend options 或 chart instance。
- schema `2.0.0` 单序列 categorical 继续使用现有 positive/negative/group 颜色语义。

### MSC-FR-009 持久化、更新与迁移边界

- schema `3.0.0` source 只兼容 schema `3.0.0` bar/column view；v1、v2、v3 不隐式互读或迁移。
- `serializeViewSpec` 与 `parseViewSpec` 保留精确 schema version、chart type 和 category 叙事树。
- source fingerprint 包含 schema、dataset、currency、series 定义/顺序/metadata、category 定义/来源顺序/
  sourceRef/metadata 及每个 value 的 seriesId/amount/sourceRef/metadata。v3 amount 与 numeric metadata 中的
  `-0` 在 fingerprint canonical form 中写为正零。
- series 定义、顺序或任一语义 value 改变时，editor 不得对新 source 重放旧 history；`0` 与 `-0` 的
  单独替换不是 v3 语义变化。
- 迁移文档说明 v2 可以继续原样运行；构造 v3 时，宿主必须显式提供 2 至 4 个真实
  series ID/label，并按 category ID 对齐每个 series 的 values。TellPlot 不将单个 v2 source 自动包装为
  不合法的单 series v3，不猜测业务名称、不自动迁移持久化数据，也不把旧 revision/history 伪装为
  新 source history。
- 宿主可以用 v3 `createInitialViewSpec` 创建新视图并明确丢弃旧叙事状态；如需保留叙事树，迁移
  guide 提供确定性转换：只在 dataset 与 category ID 集合一致时复制 root/group、collapse、pin、annotation
  和 emphasis，将 schema 设为 `3.0.0`、revision 重置为 `0`、清空 history，再走完整 v3 validation；条件
  不满足时迁移失败。这不是 runtime 的隐式 parse/update 行为。

已初始化 editor 的 source/config update 遵守以下确定性矩阵：

| 变化                                                                                                                                                                                  | Uncontrolled                                                                        | Controlled                                                                  | 共同结果                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| series registry order 改变，dataset/schema/category ID set 不变                                                                                                                       | 前一个 ViewSpec 通过完整 v3 validation 时原样保留 tree 与 revision                  | 使用宿主同次提供且验证通过的 view                                           | 立即按新 ordinal 重排 marks/legend/Tooltip/labels/Inspector/summary/export，并为未 override series 重算默认 palette；新 fingerprint/session 清空 history/processed IDs，保留有效 selection        |
| 除仅 zero-sign 等价更新外的 amount、currency、series count/label/ID/metadata、category label/sourceRef/metadata 或 value sourceRef/metadata 改变，dataset/schema/category ID set 不变 | 前一个 ViewSpec 通过完整 v3 validation 时原样保留 tree 与 revision                  | 使用宿主同次提供且验证通过的 view                                           | 立即 reproject/render；series ID/count change 使用 fresh legend component/view identity；新 fingerprint 创建新 session，清空 history/processed IDs；仍存在的 category/group selection 保留        |
| 只有 category item source order 改变                                                                                                                                                  | 当前 ViewSpec/tree/revision 原样保留；新顺序只影响 future initial view              | 使用宿主同次提供且验证通过的 view                                           | 新 fingerprint/session 清空 history/processed IDs；当前叙事顺序与有效 selection 保留                                                                                                              |
| category ID set 改变                                                                                                                                                                  | 旧 view 失配时使用新 source 创建 initial view，或使用宿主同次提供的有效 defaultView | 宿主必须同次提供完整覆盖新 category set 的有效 view，否则整个 config 被拒绝 | 新 session 清空 history；selection 仅在所有已选节点仍存在时保留，否则清空                                                                                                                         |
| dataset、schema 或 chart type 改变                                                                                                                                                    | 使用 compatible defaultView 或创建 initial view                                     | 宿主必须同次提供 compatible view，否则整个 config 被拒绝                    | 旧 session/history/selection 不跨边界保留                                                                                                                                                         |
| fingerprint 不变，只更改 series colors、legend、locale、number format、labels、tooltip、animation、panel 或尺寸                                                                       | 保留当前 ViewSpec/session                                                           | 保留宿主 view/session                                                       | 保留 history/selection，仅按需 reproject/render/layout；ordinary 非法 presentation config 进入 existing stable invalid state，hostile option/callback inspection failure 才原子保留前一个有效状态 |

所有 source 语义更新在应用前取消活动 drag/preview/Tooltip，不产生 command 或历史。selection 保留且原
focus-key target 仍 connected/visible/enabled/focusable 时保留焦点；否则无论 selection 是否保留，焦点按
首个可见 Outline treeitem、首个可用 toolbar control、始终存在且可程序聚焦的 chart-stage heading、editor
root 顺序回退。更新不伪造
`onViewChange`/`onCommand`；只在归一后的 selection 确实变化时发出 `onSelectionChange`，被拒绝的
config 发出 `onConfigRejected`。
仅将 v3 amount 或 numeric metadata 的 `0` 与 `-0` 互换属于 fingerprint-invariant 等价更新，不重建
session，呈现和格式化继续使用正零。

### MSC-FR-010 导出、空状态与无障碍

- 屏幕、SVG 和 PNG 共享可见 category/series 顺序、格式化值、palette、legend 设置、group region、
  collapsed annotation 与 emphasis 语义。Tooltip、Inspector 和无障碍摘要共享 projected node 的完整
  series 文本、顺序与格式化值；Outline、Inspector 和摘要按各自表面表达相同的 category/group 叙事状态。
- 摘要先说明可见 category/group cluster 数与 series 数，并无条件按 source order 读取完整 series registry，
  包括合法空 category 集合。随后按 narrative depth-first order 朗读：expanded group 先生成含 expanded、
  annotation/emphasis、locked 与来源数的 structural entry，再递归可见后代；普通 category 读取逐 series
  值和 annotation/emphasis/pinned/locked；collapsed group 读取 collapsed、逐 series 聚合值、来源数、
  annotation/emphasis/locked。
- legend 不是识别 series 的唯一途径；Tooltip 和 Inspector 对 projected node 始终包含文本 series label，
  摘要通过始终存在的 series registry 保证空/非空 source 都可朗读全部 series 名称。
- 合法的空 category 集合仍可以创建、读取和导出包含标题、尺寸和背景的空图；legend 启用
  时屏幕与导出均包含 legend，显式禁用时两者均不包含。
- 导出不包含 Tooltip DOM、交互状态、远程资源或动画。

### MSC-FR-011 三种宿主与公共表面

imperative DOM、React 18/19 和 Vue 3 使用同一 `ChartConfig`、core projection、editor runtime 和事件语义。
多序列实现不得复制框架专属领域状态、G2 生命周期或手势逻辑。

`tellplot` 与 `tellplot/core` 必须导出 schema `3.0.0` 所需的 16 个 named types、
`projectCategoricalComparison` 和验证能力；精确清单由 `data-model.md` 与 `contracts/public-api.md` 固定并
已经批准。
内部 G2 spec factory、scene context、bounds union adapter 和 runtime handle 不进入公共入口。

## Non-Functional Requirements

### MSC-NFR-001 数据正确性

多序列 property tests 必须证明每个 series 的 source category 覆盖完整、聚合准确、顺序稳定、原始输入
不可变，且 undo/redo 恢复完全一致的 `ViewSpec`。任何跨 series 求和视为阻断性缺陷。

### MSC-NFR-002 性能

在项目基准环境和 `1440 x 900` viewport 中，`200 categories x 2 series` 的直接重排预览按
animation frame 合并且不触发宿主 React root commit。初始动画结束后先执行 1 次 warm-up，再采集
keyboard 与 direct pointer 各 30 次交替重排；从 commit 到第一个同时匹配期望 revision/order 的
painted Canvas frame，两组 p95 均不超过 `150ms`。样本、计算公式与两组 p95 作为 JSON
evidence 保存。

`50 categories x 4 series` 在 `1280 x 720` 与 `640 x 480`、`zh-CN` 与 `en-US`、最长 12 个 CJK
字符或 24 个 Latin 字符的固定 fixture 下分别验收 idle、hover 与 active-drag：页面无意外
水平滚动；plot、legend 与 toolbar 布局区域不相交；group action 和 drag indicator 可作为 plot
overlay，但不得遮挡当前交互目标、legend、toolbar 或必要文本；可见 labels 两两不相交；每个
category 仍可通过 Outline/Tooltip/Inspector 读取完整文本并可执行整组编辑。所有样本使用
真实 G2 Canvas，不以 Mock、单序列或空图代替。

### MSC-NFR-003 动画与稳定 key

每个 mark 使用 collision-safe category/series 复合 key。重排、金额更新、折叠、展开和 series 集合更新的
动画可被下一次操作完成或打断，不得在 series 之间错误 morph。`prefers-reduced-motion` 优先，dense 场景
按可见 mark 数关闭非必要动画。

### MSC-NFR-004 可访问性

所有 category 级排序、分组、折叠和 category pin 继续有键盘等价路径、稳定焦点、`aria-live` 反馈和
结构大纲。
颜色不得成为 series、正负或强调状态的唯一信息源。

### MSC-NFR-005 类型、输入与隐私

实现使用 TypeScript strict，禁止 `any`、`@ts-ignore` 和 `@ts-expect-error`。所有 v3 外部输入继续使用
closed schema、own-property 读取和结构化错误；错误、日志和性能 evidence 不记录 amount、category label、
series label、sourceRef 或 metadata value。

### MSC-NFR-006 兼容与依赖

现有 v1/v2 wire/runtime/persistence、单序列视觉、命令、导出、ESM/CJS 加载、imperative、React、Vue、
current/previous browser、a11y 和 performance 门禁全部保持；具体旧 variant 的类型 fixtures 保持编译。公开
联合的 exhaustive TypeScript consumer 按 2.0 migration guide 处理新 v3 variant。多序列不增加 runtime、状态、拖拽或
动画依赖，G2 继续是唯一 renderer。

### MSC-NFR-007 发布边界

本目标交付本地可复现的 `2.0.0` feature candidate、文档和 evidence。任何 commit、push、PR、tag、npm
publish、GitHub Release 或生产网站提升按仓库 Git 规则和独立远程/发布批准执行。

## Functional Scope

- 2 至 4 个 series 的分组柱状图与分组条形图。
- category 级直接排序、框选、递归分组、跨层移动、折叠、category pin、node annotation、宿主
  emphasis、撤销和重做。
- 每个 series 独立聚合、稳定顺序、默认颜色、只读 legend 和 shared Tooltip。
- Outline 单 category 行、Inspector 逐 series 数值、完整无障碍摘要。
- ViewSpec JSON、SVG、PNG、空图导出和屏幕语义一致性。
- schema `3.0.0` closed validation、持久化、fingerprint 与显式迁移文档。
- imperative DOM、React 18/19、Vue 3、官网示例和工作台配置。
- 本地 `tellplot@2.0.0` candidate，不含公开发布。

## Non-Goals

- stacked、100% stacked、range、双轴、柱线组合、折线、饼图或其他新图表家族。
- 超过 4 个 series、null/missing value、不同 series 使用不同 currency/unit。
- series/cell 单独选择、拖拽、重排、隐藏、固定、注释、强调、编辑或持久化 legend 状态。
- legend filter/focus、按某个 series 自动排序、Top N、Others、variance、同比、百分比或排名计算。
- 通过图表修改 amount、自动写回业务系统或远程持久化。
- raw `G2Spec`、G2 chart instance、任意 formatter、公共 plugin registry、第二 renderer 或新动画依赖。
- Dashboard、AI、Agent、账户、协作、服务端或数据准备能力。
- npm publish、Git tag、GitHub Release 和生产发布。

## States And Error Handling

- 合法空 categories：显示空状态；legend 启用时保持只读 legend，显式禁用时不渲染；
  Inspector/outline 无 category；SVG/PNG 导出合法空图。
- series 数量不在 2 至 4：返回结构化 source validation issue，不初始化 G2。
- duplicate/unrecognized/missing series value：指出稳定 JSON Pointer path，不返回部分 source 或 projection。
- 非有限、不安全 amount 或逐 series 聚合溢出：拒绝整个 projection，不泄露原始数值。
- source/view schema、dataset 或 chart type 不兼容：返回 `SOURCE_CONFLICT`，不启发式迁移。
- 全零或正负混合 category：继续渲染、选择、读取和导出；全零 cluster 的可操作 bounds 必须来自 G2 scene/
  scale 能力，不猜测固定柱宽。
- G2 render failure：保留 Outline、Inspector 和摘要，发出不包含业务值的稳定 render issue。
- 活动拖拽期间导出、destroy 期间导出和 stale controlled view：继续遵守现有结构化失败语义。

## Edge Cases

- 2 个与 4 个 series、空 categories、单 category、200 categories x 2 series、50 categories x 4 series。
- 重复 category label 且 ID 不同为合法输入；重复规范化 series label 即使 ID 不同也必须拒绝。
- 每个 category 内全部为正、全部为负、全部为零或正负零混合。
- 极长 category/series label、窄容器、移动端、高缩放、不同 locale/currency。
- nested group、collapsed group、跨层 move、来源组自动解散、pinned descendant 和 reduced motion。
- 点击每个 series mark、cluster 间隙、marquee 只命中部分 marks、pointer 离开窗口和快速连续操作。
- series 颜色缺失、非法或与 category ID 同字符串；ID namespace 仍按类型和上下文隔离。
- source series 定义或 value 更新后 controlled/uncontrolled session、selection 与 history 的安全恢复。
- screen、SVG 和 PNG 中长 legend、annotation、value labels 与 expanded group region 的布局。
- legacy v1 waterfall、current v2 waterfall 和 v2 single categorical 的验证、round-trip 与视觉回归。

## Constraints And Assumptions

- G2 固定为当前经过审核的 direct dependency 和唯一渲染/图形动画引擎。
- category 是唯一编辑原子；series 是不可编辑的 source comparison dimension。
- 输入是 2 至 4 series 的 dense matrix，所有缺失业务值由宿主显式决定是否填 `0`。
- 一份图表只使用一个可选 currency，所有 series 共用同一数值轴。
- 不为未来 stacked、line、dual-axis 或 sparse data 预建公共抽象。
- 本 Spec 的产品范围、`2.0/schema 3.0` 方向、精确公开 API/schema、TDR-025、technical plan 与 task graph
  已经用户明确批准；当前按串行依赖只执行 T135。

## Data And Integration Needs

- 宿主负责获取、授权和构造 series/category/value source；TellPlot 不发起网络请求。
- series order 是数据合同，series colors/legend 是安全 appearance 合同，category narrative state 是 ViewSpec。
- G2 adapter 内部把每个 category datum 展开为 category-major、series-stable mark data。
- screen 与 export 复用同一 projection、series palette 和 G2 spec factory。
- playground 增加 actual-vs-budget 与 multi-business-line 示例，但示例目录继续保持网站私有。

## Success Criteria

- MSC-SC-001：用户可以在 column 与 bar 中比较 2 至 4 个 series，并始终通过文本、顺序和颜色准确识别
  category/series/value。
- MSC-SC-002：从任意 series mark、Outline、键盘或 host command 移动同一 category，得到 deep-equal 的
  叙事树和一条历史记录。
- MSC-SC-003：nested collapsed group 的每个 series 聚合与独立 source sum 完全一致，来源 category 丢失、
  重复或跨 series 混合缺陷为 0。
- MSC-SC-004：屏幕、SVG 和 PNG 的可见 series 顺序、格式化值、palette 与 legend on/off 一致；
  Tooltip、Inspector 和摘要的 projected-node series 文本顺序和值一致；Outline、Inspector 和摘要中的
  category/group 叙事状态一致，且空 source 的摘要仍按 source order 朗读全部 series 名称。
- MSC-SC-005：`200 x 2` 性能预算和 `50 x 4` 视觉/交互预算通过真实浏览器验证。
- MSC-SC-006：现有 v1/v2 wire/runtime/persistence 无需迁移即可通过 package、framework 和 browser
  compatibility matrix；exhaustive TypeScript consumer 有可执行的 2.0 source migration guide。
- MSC-SC-007：公共包不暴露 G2 instance/raw spec，不增加 runtime dependency，不发起网络请求。

## Acceptance Criteria

- MSC-AC-001：有效 v3 dense matrix 可以确定性创建 bar/column ViewSpec；非法 series 数量、覆盖、顺序、
  ID 或 amount 返回稳定、隐私安全的 validation issues。
- MSC-AC-002：旧 v1/v2 source/view/config 的具体 variant 类型 fixture、运行时和序列化测试保持通过，
  v3 不修改旧 wire shape；公开联合的 exhaustive consumer 迁移测试按 guide 通过。
- MSC-AC-003：任一 series mark 的点击、拖拽、hover action、框选和 group action 均归一为完整 category。
- MSC-AC-004：实际 mark bounds 驱动 exact hit 与 marquee，category-axis interval union 驱动落点与 group
  exit，2D union 驱动 ghost；不存在单 mark bounds 覆盖、cluster 空白误选或猜测 geometry。
- MSC-AC-005：collapsed group 对每个 series 独立 compensated sum；任一 series overflow 使整个操作失败。
- MSC-AC-006：series source order 在 marks、legend、shared Tooltip、labels、Inspector、summary 和 export 中
  稳定；live reorder 后以真实 Canvas/SVG 可见 label position 验证 legend 新顺序，不只检查 component data。
- MSC-AC-007：value label 使用复合 key，category annotation 只出现一次，正负混合与 bar transpose 正确。
- MSC-AC-008：category pin、category/group annotation、undo/redo、跨层 move 和 auto-dissolve 继续使用
  现有 command union；含 pinned descendant 的 group 不可移动，emphasis 仅作为宿主 ViewSpec 状态输入。
- MSC-AC-009：空 v3 categories 可以显示、读取并导出合法 SVG/PNG；全零 category 保持可选择和可操作。
- MSC-AC-010：DOM、React、Vue、current/previous browser、a11y、reduced motion、performance、package 和
  isolated-source gates 全部通过。
- MSC-AC-011：本地 artifact 标识为 `tellplot@2.0.0` candidate；未获得独立批准时没有远程发布副作用。
- MSC-AC-012：playground 的 actual-vs-budget 与 4-series 示例可完成整组编辑、折叠和导出，
  只消费公共入口；数据合同、API、configuration 和 2.0 migration 文档的所有代码样例通过
  isolated TypeScript typecheck，v2 原样运行与手工构造 v3 的路径均有可执行示例。

## Clarifications

- 2026-08-05：路线图审计将多序列分类比较识别为 G003 的最高价值候选，优先于直接增加折线图或饼图。
- 2026-08-12：用户明确要求继续推进，把分类叙事编辑从单序列提升到可用于业务比较的多序列。
- 2026-08-12：兼容性审计确认新增公开 variant 会改变 `1.x` 精确判别联合；本文采用 2.0/schema 3.0，
  并保留 v1/v2 runtime compatibility。
- 2026-08-12：G2 5.4.8 审计确认 `interval + series + dodgeX + legend + shared Tooltip` 可以满足核心呈现，
  但同 category 多 scene bounds 必须在 TellPlot 内部按 exact hit、axis drop、ghost 和 marquee 用途
  分别保留或聚合。
- 2026-08-12：用户明确批准 G003 产品范围与本地 `tellplot@2.0.0` / schema `3.0.0` 方向，并授权进入
  精确公开 API/schema contract 设计；该次批准当时不包含 breaking contract、技术 plan、task graph 或
  runtime 实现。
- 2026-08-12：用户随后明确批准精确 breaking public contract，并授权生成 technical plan、TDR amendment、
  work graph 与 analysis；该次批准当时不包含 execution packet 或 runtime 实现。
- 2026-08-12：用户进一步明确批准 TDR-025、technical plan 与 T135-T141 work graph；planning artifacts
  标记为 `Confirmed`，仅 T135 进入 `Ready` 并生成 execution packet。

## Open Questions

无未决产品范围或 public contract 问题。精确公开 types、wire fields、validation reasons、appearance 和
migration contract 已由 `data-model.md` 与 `contracts/` 固定并获批准；technical plan、TDR-025 与 work graph
也已确认。当前只有 T135 可执行，T136-T141 由串行前置依赖阻塞。

## Approval Gate

产品范围、精确 breaking contract、TDR-025、technical plan 与 T135-T141 work graph 三道闸门均已于
2026-08-12 通过。

第二道闸已批准以下精确合同：

1. 新增和扩展的 public TypeScript exports、判别联合与函数签名。
2. schema `3.0.0` source/view closed wire shape、validation reason/path 与 compatibility matrix。
3. 多序列 appearance、默认 palette、legend、DOM/React/Vue 透传与迁移边界。
4. 明确接受 exhaustive TypeScript union consumer 需要 2.0 source migration，而 v1/v2 wire/runtime/
   persistence 保持兼容。

当前执行入口仅为 `Ready` 的 T135 与
`.ai-platform/specs/015-multi-series-categorical-comparison/packets/T135.yaml`。T136-T141 保持 `Draft`，在各自
前置 task 完成 evidence 与 review integration 前不生成 packet、不提前修改其 runtime 范围。dependency、远程
Git、stage/commit/push/PR、tag、publish、release 与 production promotion 仍需独立批准。
