# 004 分类图验证切片 Requirements Checklist

## Metadata

- Version: 0.2.0
- Status: Completed
- Source spec: `../spec.md` 0.1.0 Confirmed
- Last updated: 2026-07-20
- Scope: 需求清晰度、完整性、一致性、可测试性、边界与非功能要求

## Product And Scope

- [x] 是否说明了本切片解决的用户问题，而不是只描述新增图表类型？[Clarity]
- [x] 是否明确 bar 与 column 是同一 categorical family 的两种布局？[Consistency]
- [x] 是否明确分类图与现有 waterfall 共享哪些叙事能力？[Coverage]
- [x] 是否明确本切片也是第二类图表的架构验证闸门？[Scope]
- [x] 是否排除了堆叠、多序列、双轴、其他图表和 Dashboard？[Boundary]
- [x] 是否排除了运行中图表类型切换、AI、publish 和 release？[Boundary]
- [x] 是否避免把顶级开源项目目标等同于本切片内建设通用 SDK？[Scope]

## Data And Compatibility

- [x] 是否显式区分 waterfall 与 categorical SourceData，而不是依赖启发式？[Clarity]
- [x] 是否规定 legacy `1.0.0` waterfall wire shape 的兼容行为？[Compatibility]
- [x] 是否规定 current schema 的 discriminator、item 字段和 closed-schema 规则？[Completeness]
- [x] 是否定义 source/view/chart type compatibility matrix？[Testability]
- [x] 是否定义 categorical 默认 column 和显式 bar 的初始化行为？[Clarity]
- [x] 是否定义空分类、单分类、重复标签、正负零和非有限/溢出金额？[Edge Cases]
- [x] 是否定义 persistence 保留 schema version 且不隐式迁移？[Compatibility]
- [x] 是否说明 chart type 在当前 session 中保持不变？[State]

## Domain And Invariants

- [x] 是否要求 SourceData 不可变且 ViewSpec 承载叙事状态？[Constitution]
- [x] 是否要求分类图复用确定性 command/history，而不是建立第二套状态？[Consistency]
- [x] 是否分别定义 waterfall anchor/segment 和 categorical movable policy？[Clarity]
- [x] 是否定义递归树、同父级连续分组、固定后代和来源覆盖规则？[Completeness]
- [x] 是否定义 collapsed group 聚合口径、顺序和 overflow failure？[Testability]
- [x] 是否定义 undo/redo、revision、schema/type 保持语义？[State]
- [x] 是否禁止通过图形拖动修改 amount？[Safety]

## Rendering And Interaction

- [x] 是否规定 G2 是唯一 renderer，interval/key/animation 由内部 adapter 所有？[Architecture]
- [x] 是否规定 column 的 X category axis 与 bar 的 Y category axis？[Clarity]
- [x] 是否定义 bar 的逻辑首项对应视觉最上方？[Ambiguity]
- [x] 是否要求 scene bounds 而不是猜测柱宽或行高？[Constitution]
- [x] 是否定义 value-axis 位移不参与排序或金额变更？[Safety]
- [x] 是否覆盖 pointer threshold、cancel、blur、unmount、stale preview 和 locked target？[Edge Cases]
- [x] 是否定义拖动预览不写 history、提交只产生一个命令？[State]
- [x] 是否定义 G2 动画、可打断和 reduced motion 优先级？[NFR]

## UI, Accessibility And Export

- [x] 是否要求 chart、outline、summary 和 export 使用同一逻辑顺序？[Consistency]
- [x] 是否要求直接操作存在 outline/keyboard 等价路径？[Accessibility]
- [x] 是否定义 empty、invalid、incompatible、render failure 和 exporting-preview 状态？[Coverage]
- [x] 是否定义空 categorical 的屏幕、摘要和导出行为？[Clarity]
- [x] 是否要求 SVG/PNG 使用同一 projection/spec 并保留方向和叙事状态？[Testability]
- [x] 是否定义 chartAppearance 对 categorical 的语义映射与公共边界？[API]
- [x] 是否禁止 raw G2Spec、chart instance、formatter callback 和任意 encoding override？[Boundary]

## Non-Functional Requirements

- [x] 是否量化 200 项场景和 150ms 可见反馈目标？[Measurability]
- [x] 是否要求真实 G2/浏览器性能证据而不是 Mock？[Evidence]
- [x] 是否定义 waterfall 零回归范围？[Regression]
- [x] 是否定义 TypeScript strict、禁止逃生类型和 hostile input 行为？[Quality]
- [x] 是否定义 ESM/CJS/types、React、G2 和浏览器兼容矩阵？[Compatibility]
- [x] 是否明确不增加 runtime/animation dependency？[Dependency]
- [x] 是否定义不含金额、标签、sourceRef 和 metadata value 的可观测性边界？[Privacy]

## Traceability And Acceptance

- [x] 每个 CAT-FR 是否至少映射到一个 CAT-AC 或明确的 task validation？[Traceability]
- [x] 每个 CAT-NFR 是否映射到 task 和可执行 validation command？[Traceability]
- [x] Success Criteria 是否可测、面向用户结果且不依赖未批准技术？[Testability]
- [x] Acceptance Criteria 是否覆盖创建、排序、分组、锁定、持久化、导出、动画和 legacy regression？[Coverage]
- [x] tasks 是否为每个 requirement 指定 dependencies、allowed files、tests、TDD、commands 和 evidence？[Execution]
- [x] 是否明确 spec/plan/tasks 用户批准前全部实现任务保持 Draft？[Governance]

## Findings Summary

- Critical: 0
- High: 0
- Medium: 0
- Low: 0

## Resolution Notes

- 数据合同采用显式 schema `2.0.0` discriminator，避免放宽 legacy waterfall validator。
- bar 的逻辑顺序固定为 top-to-bottom，消除 G2 category scale 方向歧义。
- 运行中 chart type switching 明确排除，避免在未验证工作流下扩展 command schema。
- 空 categorical 明确为合法图表和合法导出，避免实现阶段自行决定。
- architecture extraction 放在完整 vertical slice green 后，符合 P-009。

## User Review Gate

Checklist 已完成需求质量检查；用户明确批准 `spec.md`、`data-model.md`、`contracts/editor-api.md`、
`plan.md` 与 `tasks.md`。T112-T116 均已完成交付检查并由用户验收，004 feature 完成。
