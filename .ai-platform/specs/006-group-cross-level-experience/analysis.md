# G002-R1 Cross-Artifact Analysis

## Metadata

- Version: 0.2.0
- Status: Completed
- Feature ID: `006-group-cross-level-experience`
- Goal ID: `G002-R1`
- Last updated: 2026-07-24

## Result

- Critical: 0
- High: 0
- Medium: 0

## Coverage

- R1-FR-001 映射 Inspector component tests 与 selection callback regression。
- R1-FR-002 / R1-FR-003 映射 move resolver、outline、waterfall/column/bar canvas 和 E2E。
- R1-FR-004 映射 executor、recursive group invariants、history、persistence 与 property-style regressions。
- R1-FR-005 / R1-FR-006 映射 shared region projection、G2 specs、appearance parser、public types 和 SVG/PNG。
- R1-FR-007 映射 cross-surface preview、readOnly、a11y 和 reduced motion tests。
- R1-FR-008 映射 tree-path selection normalizer、chart/outline effective selection、Inspector/dialog scope、
  nested group command、undo/redo 和真实 G2 marquee tests。
- 全部 NFR 具有 package、browser、a11y、performance、coverage 或 strict static gate。

## Consistency

- 产品 SSOT FR-014、CD-005、TDR-010 与 TDR-017 使用相同跨层 container/index 命令语义。
- `ViewSpec` schema 和 command wire 不变；inside 只存在于 interaction adapter。
- 自动解散维持 TDR-009 的每组至少两个 direct children，不放宽 validator。
- 层级框选只在交互层把可见命中提升为最低共同容器下的直接子节点；领域 `createGroup` 继续只接受同父级
  连续节点。全容器选择被识别为冗余，不产生单成员父分组。
- `groupRegion` 是 approved additive appearance API，继续遵守 TDR-012 的安全配置边界。
- region projection 是 waterfall、column、bar 的真实共享需求，不建立通用 chart registry。

## Constitution Check

- P-002 / P-005：来源数据不变，树与财务不变量有阻断测试。
- P-003：所有入口继续使用唯一 executor。
- P-004 / P-009：没有平台能力、第二引擎或未来抽象。
- P-006：range、band、scene bounds 和 animation 由 G2 负责。
- P-007 / P-008：chart/outline/keyboard 与可打断 motion 均在范围内。
- P-010：evidence 和全量 release-candidate gates 完整。

## Execution Readiness

用户已明确批准 G002-R1 与递归层级框选语义。目标、公共可选配置、allowed files、TDD、validation、
evidence、baseline 和 stop conditions 完整；T118 已完成实现与复核，停在 `Needs_Review`。
