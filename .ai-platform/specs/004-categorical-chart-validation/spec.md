# TellPlot 分类图验证切片 Spec

## Metadata

- Feature ID: `004-categorical-chart-validation`
- Version: 0.3.0
- Status: Confirmed
- Source: 已确认的 `US-003`、`FR-005`、Phase 1A 分类图验证切片；2026-07-19 架构规划讨论
- Last updated: 2026-07-20
- Approval: 用户于 2026-07-20 明确验收 T116，004 feature 完成

## Goal

在不改写原始财务数据、不复制命令内核、不暴露 G2 内部能力的前提下，为
`@tellplot/editor` 增加单序列分类条形图和分类柱状图。该切片必须证明瀑布图与分类图能够共享
`ViewSpec` 的叙事树、确定性命令、历史、结构大纲和公共配置，同时保留各自独立的数据校验、投影、
G2 编码和轴向交互规则。

本切片也是多图表架构的验证闸门。只有瀑布图、条形图和柱状图均通过真实浏览器验收后，才允许从
实际重复中抽取内部公共图表运行时；本切片不建立面向第三方的通用图表插件系统。

## User Stories And Scenarios

### US-CAT-001 创建分类图

财务分析人员可以使用一组带稳定 ID、标签和金额的分类数据创建纵向柱状图或横向条形图。两种布局
展示相同的分类顺序、金额、分组和来源关系。

### US-CAT-002 调整叙事顺序

财务分析人员可以直接拖动未锁定的分类柱或条，也可以在结构大纲中精确排序。提交后图表使用 G2
短过渡动画稳定到新位置，原始分类金额和来源关系保持不变。

### US-CAT-003 组织分类层级

财务分析人员可以对同父级连续分类或分组创建递归分组、折叠、展开、解散和固定。折叠分组显示后代
分类金额的确定性聚合，并保留完整来源追踪。

### US-CAT-004 保存与输出

财务分析人员可以撤销、重做、保存、加载并导出当前分类图。屏幕、SVG、PNG 和无障碍摘要使用同一
顺序、分组、折叠、标签、金额格式和强调语义。

## Functional Requirements

### CAT-FR-001 分类数据合同

系统必须使用显式可判别的数据合同区分瀑布数据与分类数据。分类数据至少包含稳定数据集 ID、可选
币种，以及按源顺序排列的分类项；每个分类项包含稳定 item ID、非空标签、有限金额、可选来源引用和
JSON-compatible metadata。

现有 `1.0.0` 瀑布 `SourceData` 必须继续按当前严格规则验证和运行。新分类数据使用新的可判别 schema，
不得通过放宽瀑布起点、终点或小计校验来伪装成分类数据。

### CAT-FR-002 图表类型与兼容矩阵

`ViewSpec` 必须明确区分 `waterfall`、`bar` 和 `column`。瀑布数据只兼容 `waterfall`；分类数据只兼容
`bar` 和 `column`。不兼容组合必须返回结构化 validation issue，不生成部分视图或部分投影。

分类数据在未指定初始图表类型时确定性地使用 `column`。宿主可以通过受约束的初始视图选项选择
`bar`。本切片不在编辑器内部增加图表类型切换命令；运行中的类型切换需要后续真实工作流证据。

### CAT-FR-003 共享叙事状态与命令

分类图必须复用 `ViewSpec` 中的规范化递归树、折叠状态、固定状态、注释、强调和 revision，并复用
`moveItem`、`moveGroup`、`createGroup`、`ungroup`、`collapseGroup`、`expandGroup`、`pinItem`、
`unpinItem` 和 `setAnnotation`。

图表家族特有规则必须由内部类型化 policy 执行。瀑布图继续禁止移动系统锚点和跨 subtotal segment
操作；分类图没有 subtotal segment，但固定项及包含固定后代的分组仍不得移动或非法归组。

### CAT-FR-004 分类投影

系统必须把有效的分类 `SourceData + ViewSpec` 投影为稳定、有序、JSON-compatible 的分类 datum。
普通分类的金额等于原始 item amount；折叠分组金额等于全部后代分类的 compensated sum；展开分组
不生成额外数据柱。投影不得修改或共享可变输入容器。

金额为正、负或零均合法。聚合结果非有限或绝对值超过 `Number.MAX_SAFE_INTEGER` 时必须拒绝投影，
不得输出截断或部分结果。

### CAT-FR-005 G2 图形与动画

条形图和柱状图必须使用 G2 `interval` mark、稳定 node ID key、TellPlot 受控的 encode、scale、axis、
label、Tooltip 和 enter/update/exit animation。柱状图以 X 轴为分类轴，条形图以 Y 轴为分类轴。

分类金额使用长度和零基线表达。折叠分组使用 `chartAppearance.palette.group`；普通分类按金额符号使用
`positive` 或 `negative`。颜色不得成为正负或锁定状态的唯一信息。

### CAT-FR-006 方向感知的直接操作

图表必须按分类轴解释拖动和落点。柱状图沿 X 轴计算排序，条形图沿 Y 轴计算排序；数值轴位移和柱高
不得改变分类金额或参与排序语义。拖动使用 G2 场景边界和 pointer 坐标，不允许猜测固定柱宽或行高。

拖动开始阈值、Pointer capture、取消、失焦、非法落点、实时预览和提交语义必须与已验收瀑布图保持
一致。拖动预览不写入 history，提交只产生一条确定性命令。

### CAT-FR-007 结构大纲与可访问性

条形图、柱状图和结构大纲必须显示一致的分类顺序、层级、折叠、固定、来源数量和金额。所有核心
排序与分组能力必须有键盘等价路径；Canvas 不是唯一信息源。状态变化必须通过现有焦点与 `aria-live`
机制可感知。

### CAT-FR-008 持久化与导出

分类 `ViewSpec` 必须支持确定性 JSON 序列化、严格解析、数据集冲突检查和版本识别。SVG 与 PNG 导出
必须使用与屏幕相同的分类投影和 G2 spec factory，并保留当前顺序、方向、分组、折叠、标签、注释、
强调和数字格式。

### CAT-FR-009 安全公共配置

现有 `FinancialChartAppearance` 必须继续作为分类图唯一公共呈现配置入口。分类图可以映射已经批准的
标题、正负/分组语义色、坐标轴、数值标签、Tooltip、数字格式和动画，不得增加原始 `G2Spec`、chart
instance、任意 spec transform 或编码覆盖。

## Non-Functional Requirements

### CAT-NFR-001 瀑布图零回归

现有 `1.0.0` 瀑布输入、ViewSpec、命令结果、屏幕交互、SVG/PNG、可访问性和性能门禁必须继续通过。
内部文件移动不得改变公共入口或默认视觉。

### CAT-NFR-002 交互性能

在 200 个可见分类以内，拖动目标预览必须按 animation frame 合并更新；普通重排提交后的可见反馈在
产品基准环境中必须于 150ms 内开始。分类图必须建立独立的真实 G2 性能样本，不能以 Mock 或空图
替代。

### CAT-NFR-003 可打断动画

G2 重排和折叠动画必须能被下一次输入快速完成或打断，不得锁住编辑器。`prefers-reduced-motion` 和
显式 reduced motion 必须优先，密集图表可以按已批准阈值关闭非必要动画。

### CAT-NFR-004 类型与运行时安全

公共 API 和内部 chart family 分派必须使用 TypeScript 严格判别联合，禁止 `any`、`@ts-ignore` 和
`@ts-expect-error`。所有外部 JSON 输入继续使用 closed schema、own-property 读取和结构化错误。

### CAT-NFR-005 包与浏览器兼容

ESM、CJS、类型声明、React 18.3/19、G2 5.4、当前 Chromium/Firefox/WebKit 和上一代浏览器矩阵必须
继续通过。分类图不得增加新的运行时或动画依赖。

### CAT-NFR-006 可观测性与隐私

新增错误、命令和性能记录只能包含图表类型、命令类型、失败类型、计数和耗时，不得记录金额、标签、
来源引用或 metadata value。

## Functional Scope

本切片包括：

- 单序列纵向分类柱状图。
- 单序列横向分类条形图。
- 排序、固定、递归分组、折叠、展开和解散分组。
- 结构大纲、键盘操作、撤销、重做、注释和强调。
- `ViewSpec` 持久化、SVG/PNG、无障碍摘要和安全图表配置。
- 基于两类图表真实重复的内部架构收敛。

## Non-Goals

- 堆叠条形图、堆叠柱状图、多序列分组图、百分比图或双轴组合图。
- 在图表中编辑金额、改变原始分类或写回数据源。
- 运行中的图表类型切换命令或图表类型选择器。
- 排名、Top N、Others 自动归组或其他新增排序命令。
- 折线图、饼图、散点图、地图、Dashboard 或通用 G2 图表 SDK。
- 第三方 chart plugin registry、原始 G2 配置逃生口或第二个渲染引擎。
- 新动画框架、AI provider、npm publish 或正式版本发布。

## States And Error Handling

- 空分类数据：显示结构化空状态，不创建可拖动标记；导出仍产生合法空图或明确的
  `EXPORT_UNAVAILABLE`，具体行为在公共 API 合同中固定。
- 无效数据：编辑器保持错误工作台，不初始化 G2，不泄露原始值。
- 不兼容数据与图表类型：返回 `SOURCE_CONFLICT / INCOMPATIBLE_CHART_TYPE`。
- 聚合溢出：返回 `INVALID_SOURCE_DATA / UNSAFE_AMOUNT`，不生成部分 projection。
- 活动预览期间导出：继续返回 `EXPORT_UNAVAILABLE /export`。
- G2 render 失败：保留结构大纲和可访问摘要，显示不含财务值的结构化错误。

## Edge Cases

- 空分类集合和仅一个分类。
- 重复标签但稳定 ID 不同。
- 正数、负数、零和全部为零。
- 极长标签、窄容器、200 个可见分类和深层递归分组。
- 折叠组包含正负混合项、零和固定后代。
- 横向条形图反向视觉顺序与 `ViewSpec.rootOrder` 的一致定义。
- pointer 在拖动中离开图表、窗口失焦、Escape 取消或组件卸载。
- bar/column ViewSpec 与 waterfall/categorical SourceData 不兼容。
- legacy `1.0.0` 瀑布 ViewSpec 的加载、保存和重新渲染。
- reduced motion、高缩放比例、键盘-only 和屏幕阅读器路径。

## Data And Integration Needs

- `SourceData` 使用可判别 chart family，并保留稳定 ID、币种和来源引用。
- `ViewSpec.chartType` 是持久化叙事状态的一部分，不进入 `chartAppearance`。
- 宿主继续负责数据获取、权限和服务端存储。
- 分类图不要求宿主提供 G2 配置、像素边界或聚合结果。
- 详细 schema 和兼容策略见 `data-model.md`；公共调用边界见 `contracts/editor-api.md`。

## Success Criteria

- CAT-SC-001：同一分类数据和合法编辑序列在条形图与柱状图中产生完全一致的分类顺序、分组树和来源集合。
- CAT-SC-002：全部分类领域不变量和现有瀑布领域不变量测试通过，来源丢失、重复或金额漂移缺陷为 0。
- CAT-SC-003：用户可以分别通过图表直接操作与结构大纲完成分类重排并成功撤销。
- CAT-SC-004：200 个可见分类的真实浏览器重排满足 CAT-NFR-002，且下一次操作不被动画阻塞。
- CAT-SC-005：SVG、PNG、屏幕和无障碍摘要在方向、顺序、折叠、标签和金额格式上保持一致。
- CAT-SC-006：现有瀑布、package、React、浏览器、a11y 和 performance 全量门禁无回归。

## Acceptance Criteria

- CAT-AC-001：有效分类数据可以确定性创建 `column` ViewSpec，并可显式创建 `bar` ViewSpec。
- CAT-AC-002：柱状图沿 X 轴、条形图沿 Y 轴拖动同一节点后，得到 deep-equal 的叙事顺序和一条命令记录。
- CAT-AC-003：折叠分类组的金额等于全部后代分类 compensated sum，展开后恢复原顺序、层级和后代折叠状态。
- CAT-AC-004：固定分类或包含固定后代的分组不能被非法移动，界面与命令错误都说明稳定原因码。
- CAT-AC-005：条形图和柱状图可以保存、恢复、撤销、重做，并拒绝不兼容 source/view 组合。
- CAT-AC-006：两种分类布局的 SVG 与 PNG 反映当前方向、顺序、分组、折叠、标签、注释和强调。
- CAT-AC-007：分类图使用 G2 原生图形动画，reduced motion 下不发生非必要补间，拖动中不使用动画追赶指针。
- CAT-AC-008：公共包只增加受约束的 chart/data 类型和初始化选项，不导出 G2Spec、chart instance 或内部 adapter。
- CAT-AC-009：现有 `1.0.0` 瀑布数据和 ViewSpec 在不迁移 wire value 的情况下继续通过验证、渲染和 round-trip。

## Clarifications And Confirmed Direction

- 2026-07-19：用户确认继续使用完整 G2，并逐步增加图表类型，不以按图形裁剪 G2 为当前目标。
- 2026-07-19：用户确认图表渲染和动画继续基于 G2，TellPlot 只负责财务语义、确定性编辑和 UI 编排。
- 2026-07-19：用户确认下一阶段以分类条形图与柱状图验证架构，不先进行脱离需求的大重构。
- 2026-07-19：用户要求按上述方向产出 feature spec、plan、tasks、checklist 和 analysis。

## Approval Gate

本 Spec、`data-model.md` 与 `contracts/editor-api.md` 已获得用户明确批准。T112-T116 均已实现、验证并
验收；004 分类图验证切片状态为完成。
