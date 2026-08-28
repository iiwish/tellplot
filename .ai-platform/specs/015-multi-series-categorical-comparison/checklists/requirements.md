# G003 多序列分类比较 Requirements Checklist

## Metadata

- Version: 0.5.0
- Status: Completed
- Source spec: `../spec.md` 0.5.0 Confirmed
- Last updated: 2026-08-12
- Scope: 多序列产品范围、数据与兼容、叙事不变量、交互、可访问性、导出和非功能要求

## Product And Scope

- [x] 是否说明多序列解决的业务比较问题，而不是只描述 G2 分组柱效果？[Clarity]
- [x] 是否明确财务分析用户与 Web 集成开发者的 JTBD？[Coverage]
- [x] 是否定义 actual/budget、current/prior 与多业务线的核心用户旅程？[Coverage]
- [x] 是否明确 bar/column 是同一 categorical family 的两种布局？[Consistency]
- [x] 是否把 category 固定为唯一编辑原子、series 固定为比较维度？[Scope]
- [x] 是否限制首期为 2 至 4 series，并定义 dense matrix？[Boundary]
- [x] 是否明确排除 stacked、双轴、其他图表、series 编辑、Dashboard 与 AI？[Boundary]
- [x] 是否明确排除 npm publish、tag、Release 与生产发布？[Release]

## Version And Compatibility

- [x] 是否解释扩展公开 TypeScript 判别联合为何不能伪装成 `1.x` minor？[Compatibility]
- [x] 是否明确本地 package target 为 `2.0.0`、多序列 schema 为 `3.0.0`？[Clarity]
- [x] 是否规定 v1/v2 wire/runtime/persistence 继续原样读取、运行和序列化？[Compatibility]
- [x] 是否禁止修改 v2 closed wire shape 或通过 optional 字段重复 scalar amount？[Data Integrity]
- [x] 是否规定 v1/v2/v3 source/view compatibility 和禁止隐式迁移？[State]
- [x] 是否定义 source fingerprint 必须包含 series/value 全部语义字段？[Correctness]
- [x] 是否定义 source 变化时旧 history 不得跨 fingerprint 重放？[State]
- [x] 是否说明 breaking public API/schema 仍需独立明确审批？[Governance]
- [x] 是否说明 exhaustive public-union consumer 需要 2.0 source migration，不伪造 type 零迁移？[Compatibility]
- [x] 是否保留 `CurrentSchemaVersion = '2.0.0'`、以 `ComparisonSchemaVersion` 表示 v3，并把精确名称纳入
      独立合同审批？[API]

## Data Contract

- [x] 是否定义稳定 dataset、series、category 和 value 字段？[Completeness]
- [x] 是否定义 series/category ID、label 与顺序规则？[Clarity]
- [x] 是否定义每个 category 对 series 的完整、唯一和有序覆盖？[Testability]
- [x] 是否明确 missing 不等于 zero，零值必须显式传入？[Ambiguity]
- [x] 是否定义 amount finite/safe 和 metadata primitive 边界？[Safety]
- [x] 是否允许重复 category label，但拒绝规范化后重复的 series label？[Accessibility]
- [x] 是否明确 single currency/unit 与跨 series 不同单位的 non-goal？[Boundary]
- [x] 是否禁止把 series value 放入 metadata 或变成 ViewNode？[Architecture]

## Domain And Invariants

- [x] 是否保持 SourceData 不可变、ViewSpec 只承载叙事状态？[Constitution]
- [x] 是否保持现有 closed command union 和四类入口的一致语义？[Consistency]
- [x] 是否保持 category-only pin、pinned-descendant group lock、node annotation 与宿主 emphasis 语义？[Clarity]
- [x] 是否定义 collapsed group 对每个 series 独立 compensated sum？[Correctness]
- [x] 是否禁止 category/group total 与跨 series 求和？[Data Integrity]
- [x] 是否定义任一 series overflow 使整个 projection 失败？[Failure]
- [x] 是否定义 category source coverage、顺序和 group tree 不变量？[Testability]
- [x] 是否定义 undo/redo 恢复完全一致 ViewSpec？[State]
- [x] 是否保留 v2 scalar projection API 精确签名，并为 v3 使用独立 projection/projector？[Compatibility]
- [x] 是否定义 source update 对 controlled/uncontrolled view、history、selection、focus 和 callback 的矩阵？[State]
- [x] 是否覆盖 category source order、currency/sourceRef/metadata fingerprint 更新与 fingerprint-invariant presentation 更新？[State]

## Rendering And Interaction

- [x] 是否要求 G2 `interval + series + dodgeX` 和稳定复合 key？[Architecture]
- [x] 是否定义 series order、legend/color 与 bar/column 方向？[Clarity]
- [x] 是否覆盖同 category 正数、负数和零的混合场景？[Edge Cases]
- [x] 是否明确多序列颜色不承担正负唯一语义？[Accessibility]
- [x] 是否按 exact hit、category-axis drop、2D ghost 和 per-mark marquee 区分 renderer-owned geometry？[Constitution]
- [x] 是否定义 cluster gap、minimum-target overlap、group-only inside、partial marquee 和 all-zero band？[Coverage]
- [x] 是否定义点击任一 series 只提交一条 category command？[State]
- [x] 是否覆盖 cancel、blur、pointer loss、Escape、unmount 和快速连续操作？[Edge Cases]

## UI, Tooltip And Accessibility

- [x] 是否定义 Outline 单 category 行且禁止虚构总额？[Clarity]
- [x] 是否定义 Inspector 与 collapsed group 的逐 series 值？[Coverage]
- [x] 是否定义 shared Tooltip 的 category title、series order、颜色和值？[Usability]
- [x] 是否定义 value label 复合 key 与按 mark count 的 auto density？[Correctness]
- [x] 是否定义 category/collapsed-group annotation 的 endpoint、tie、all-zero 与 expanded-group 规则？[Consistency]
- [x] 是否定义 legend 只读、默认显示和文本替代路径？[Boundary]
- [x] 是否要求键盘、Outline、焦点和 aria-live 等价路径？[Accessibility]
- [x] 是否定义空 category、全零、长 label、窄容器和 reduced motion？[Edge Cases]
- [x] 是否定义 collapsed group 的摘要计数、状态、逐 series 值与来源 category 朗读？[Accessibility]

## Export And Integration

- [x] 是否要求 screen/SVG/PNG/Inspector/summary 的 series 语义一致？[Consistency]
- [x] 是否定义合法空图可以导出，且 legend on/off 与屏幕一致？[Coverage]
- [x] 是否定义 export 排除 Tooltip DOM、动画、远程资源与交互状态？[Security]
- [x] 是否覆盖 ViewSpec JSON 的精确 schema 与 deterministic round-trip？[Persistence]
- [x] 是否定义 DOM、React 和 Vue 共享同一 runtime ownership？[Architecture]
- [x] 是否定义 playground 示例只消费公共 API 且不形成 registry？[Boundary]
- [x] 是否禁止 raw G2Spec、chart instance、任意 callback 与新增 runtime dependency？[Constitution]

## Non-Functional Requirements

- [x] 是否量化 `200 categories x 2 series` 的 viewport、warm-up、sample count、paint receipt 与 150ms p95？[Measurability]
- [x] 是否定义 `50 categories x 4 series` 的 viewport、locale、label fixture 与 idle/hover/drag occlusion 验收？[Coverage]
- [x] 是否定义默认 palette 的背景对比度与 pairwise color-distance 预算？[Accessibility]
- [x] 是否要求真实 G2/browser evidence，不以 Mock 或单序列替代？[Evidence]
- [x] 是否定义 collision-safe key、interruptible animation 和 reduced motion？[NFR]
- [x] 是否定义 TypeScript strict 和 hostile closed-schema input？[Quality]
- [x] 是否定义日志/evidence 不包含 category、series、amount 或来源值？[Privacy]
- [x] 是否要求 v1/v2、package、framework、browser、a11y 与 performance 零回归？[Regression]
- [x] 是否明确本目标只形成 local candidate，不产生远程副作用？[Release]

## Traceability And Readiness

- [x] 每个 user story 是否至少映射到一个 `MSC-FR` 和 success criterion？[Traceability]
- [x] 每个 `MSC-FR` 是否具有可观察行为或 acceptance criterion？[Testability]
- [x] 每个 `MSC-NFR` 是否提供量化或可执行的未来 validation target？[Measurability]
- [x] 是否定义 invalid、empty、overflow、incompatible 与 render failure 状态？[Coverage]
- [x] 是否不存在 `TBD`、`TODO`、启发式迁移或未定义术语？[Readiness]
- [x] 是否区分产品 Spec、精确 breaking contract 与 plan/task 三个独立审批闸门？[Governance]

## Findings Summary

- Critical: 0
- High: 0
- Medium: 0
- Low: 0

## Resolution Notes

- 使用 package `2.0.0` 与 schema `3.0.0` 承载公开判别联合扩展，避免以 optional 字段制造重复金额事实。
- 保留 v1/v2 wire/runtime/persistence compatibility；仅 exhaustive public-union TypeScript consumer 需要明确
  2.0 source migration。
- category 保持唯一叙事节点，series values 只进入逐 series projection 与 G2 mark data。
- dense matrix、missing 不等于 zero、逐 series compensated sum 和禁止跨 series total 消除了主要数据歧义。
- renderer-owned exact/axis/2D/per-mark geometry、复合 mark key、shared Tooltip 和只读 legend
  关闭了主要交互与呈现缺口。
- source update 矩阵、annotation 锚点、legend on/off、唯一 series label 和可量化的 palette/布局/性能口径
  关闭了复审发现。
- category-only pin、宿主 emphasis、完整 source fingerprint、presentation-only update、panel-aware focus
  fallback 与 overlay occlusion 规则对齐了现有 command/store/UI 合同。
- 16 个新 v3 type exports 与 `projectCategoricalComparison` 已由第二阶段合同固定并获批准；category
  source order 进入 fingerprint，collapsed group 摘要闭合了计数、状态、聚合值和来源数。
- 产品范围、major/schema方向、精确breaking contract、technical plan、TDR-025与work graph均已获批准；
  当前仅T135进入执行。

## User Review Gate

- Approval: 产品范围与精确breaking public contract闸门均于2026-08-12通过
- Reviewer notes: technical plan、TDR-025与T135-T141 work graph也已于2026-08-12获批；仅T135为`Ready`
  且已有packet，T136-T141保持`Draft`并由前置依赖阻塞。
