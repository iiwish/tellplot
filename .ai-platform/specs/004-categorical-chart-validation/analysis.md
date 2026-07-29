# 004 分类图验证切片 Cross-Artifact Analysis

## Metadata

- Version: 0.11.0
- Status: Completed
- Feature ID: `004-categorical-chart-validation`
- Last updated: 2026-07-20
- Inputs: constitution 0.4.0 Confirmed；product design 0.6.0 Confirmed；feature spec 0.3.0、data model/API
  contract 0.2.0、plan 0.4.0 Confirmed；tasks 0.15.0 Confirmed；requirements checklist 0.2.0
  Completed；T113/T114/T115 packet A001；T116 execution packet/evidence `EP-004-T116-A001`
- Analysis mode: artifact 一致性、T112-T115 验收结果、T116 实现/evidence 与三层 review 复核

## Result

- Critical: 0
- High: 0
- Medium: 0
- Low: 0

没有发现违反章程、需求缺失、任务无来源、术语漂移、ownership 重叠或非功能要求无验证路径的问题。
用户已明确批准 feature contracts、Plan 与 tasks，并于 2026-07-19 验收 T112、批准 T113 packet。T113 已
完成实现、evidence 与三层 review；用户要求 clean review 后继续 T114，review 无 actionable finding，T113
条件验收成立。T114 也已完成实现、evidence 与 fresh review；用户明确授权并完成 T115 长目标。T115 的
实现、evidence、全部 blocking gates 与已披露 `groupSelection.ts` 执行偏差于 2026-07-20 获得用户明确验收。
T116-A001 在用户明确授权后完成实现、evidence 和三层 review，无 unresolved
Critical/High/Medium finding，并于 2026-07-20 获得用户明确验收。

## Status And Placeholder Check

- `spec.md`、`data-model.md`、`contracts/editor-api.md`、`plan.md`、`tasks.md` 均为 `Confirmed`，与
  2026-07-19 用户明确审批记录一致。
- `checklists/requirements.md` 为 `Completed`，只表示需求质量检查完成，正文保留独立 user review gate。
- T111-T116 均为 `Accepted`，E004 完成。
- T116 的实现、全量门禁、task-only evidence、三层 review 与用户验收记录完整。
- artifacts 已通过模板残留检查，没有未填写的占位内容。

## Requirement Coverage

| Requirement | Task coverage | Validation coverage | Result |
| --- | --- | --- | --- |
| CAT-FR-001 分类数据合同 | T111, T112 | domain validation, package public types | Covered |
| CAT-FR-002 类型与兼容矩阵 | T111, T112 | compatibility, initial view, parse/serialize | Covered |
| CAT-FR-003 共享状态与命令 | T112 | command/invariant/property tests | Covered |
| CAT-FR-004 分类投影 | T113 | categorical projection/coverage | Covered |
| CAT-FR-005 G2 图形与动画 | T113, T115 | spec, component, browser, reduced motion | Covered |
| CAT-FR-006 方向感知直接操作 | T114, T115 | X/Y collision, real browser reorder | Covered |
| CAT-FR-007 大纲与可访问性 | T114, T115 | component, keyboard, axe, browser | Covered |
| CAT-FR-008 持久化与导出 | T112, T115 | round-trip, SVG/PNG, export E2E | Covered |
| CAT-FR-009 安全公共配置 | T113, T115 | spec mapping, package/API boundary | Covered |
| CAT-NFR-001 瀑布零回归 | T112-T116 | scoped waterfall regression + final full suite | Covered |
| CAT-NFR-002 交互性能 | T114-T116 | RAF/collision tests + 200-item real G2 performance | Covered |
| CAT-NFR-003 可打断动画 | T113-T116 | spec/reduced motion/browser interruption | Covered |
| CAT-NFR-004 类型与运行时安全 | T112-T114, T116 | typecheck, lint, hostile input, coverage | Covered |
| CAT-NFR-005 包与浏览器兼容 | T115, T116 | package, React, current/previous browsers | Covered |
| CAT-NFR-006 可观测性与隐私 | T112, T115, T116 | safe error details, callback/log review | Covered |

全部 CAT-FR/CAT-NFR 至少映射到一个 task、一个可执行 validation surface 和一个 acceptance/result contract。

## Task Lineage And Scheduling

- T111 映射 global `US-003`、`FR-005` 和全部 feature requirements，承担 human approval，不实现代码。
- T112 映射 schema、compatibility、shared command 和 persistence，是全部实现的基础依赖。
- T113 映射 categorical projection/G2 spec，只拥有 categorical/config/test 文件。
- T114 映射 category-axis interaction，只拥有 interaction primitives 和对应 tests。
- T113/T114 在 T112 Accepted 后理论上可并行，allowed files 不重叠，均被 T115 join。当前 T112 验收基线
  尚未提交，packet 因此默认顺序直执行；并行需要另行授权共同基线与隔离 worktree。
- T115 是用户可验证的 vertical integration，覆盖唯一 editor、export、a11y 和 browser workflow。
- T116 在 T115 Accepted 后执行，只抽取实际重复，全量 release-candidate gates 已完成。

没有循环依赖。每个实现 task 都包含 priority、dependencies、blocks、requirement mapping、parallel/conflict、
goal、allowed files、test targets、deliverables、acceptance、Definition of Done、validation commands、TDD、packet
path 和 evidence contract。

## Constitution Compliance

- P-001：范围只包含已确认单序列分类图，不引入通用 BI 列表。
- P-002：amount/sourceRef/metadata 留在 SourceData，叙事操作只修改 ViewSpec。
- P-003：bar、column、outline、keyboard 共享现有 EditorCommand wire union。
- P-004：本 feature 只增加基础图表能力，没有引入网络服务、Dashboard 或插件框架。
- P-005：来源覆盖、聚合、overflow、固定和 waterfall anchor regression 是 blocking validation。
- P-006：G2 是唯一 renderer，mark、scene bounds、Tooltip 和图形动画由 G2 提供。
- P-007：Canvas 直接操作和 outline/keyboard 同时进入 acceptance。
- P-008：150ms、RAF、interrupt 和 reduced motion 均有 requirement/task/validation。
- P-009：shared runtime extraction 明确依赖第二类 chart vertical slice green。
- P-010：每个 task 有真实命令和 evidence，最终包含三浏览器、package、a11y 和 performance。

无例外，无静默放宽章程。

## Terminology Check

- `waterfall`、`bar`、`column` 只用作 `ChartType`；bar/column 统一归属 `categorical` SourceData family。
- `dataKind` 只标识 SourceData family；不与 `chartType`、G2 mark type 或 item kind 混用。
- `rootOrder` 在所有 artifacts 中定义为逻辑叙事顺序；bar 为 top-to-bottom，column/waterfall 为 left-to-right。
- `chart policy` 始终是内部命令约束，不是公共 plugin、renderer 或 host callback。
- `projection` 是 chart-family-specific plain data；`G2Spec` 只属于内部 rendering adapter。
- `chartAppearance` 仍是宿主级语义呈现配置，不进入 ViewSpec。

术语一致，无 conflicting definition。

## Public API And Compatibility Check

- data model、spec 和 API contract 一致选择 explicit schema `2.0.0` discriminator。
- legacy `1.0.0` waterfall 在三份 artifact 中都要求保留 input identity、validation、initial view 和 round-trip。
- current categorical 默认 column、可显式 bar，在 spec/data model/API contract/plan/tasks 中一致。
- chart switching 在全部 artifacts 中保持 Non-Goal，不存在隐藏 `setChartType` command。
- `FinancialChartAppearance` wire shape 保持不变；categorical 只映射现有 semantic palette。
- raw G2Spec、chart instance、spec transform、plugin registry 和新 renderer 在全部 artifacts 中被排除。

## Non-Functional Validation Check

- Performance: 200 visible items、RAF 合并、150ms product target、真实 G2/browser evidence。
- Accessibility: keyboard equivalent、outline、aria-live、Canvas summary、empty summary、axe。
- Motion: G2 native enter/update/exit、interrupt、reduced motion、dense behavior。
- Compatibility: ESM/CJS/types、React 18/19、G2 5.4、current/previous browser matrix。
- Privacy: issue/log/evidence 不包含 amount、label、sourceRef 或 metadata value。
- Regression: 每个 task scoped waterfall checks，T116 全量 matrix。

所有 NFR 都有可执行 validation command 或 task-specific test target，没有仅以形容词描述的质量要求。

## Residual Risks

以下是已经进入 Plan risk register 并有 mitigation 的实施风险，不构成 artifact finding：

- dual schema generation 增加 validator/session 分支。
- G2 horizontal bar category scale 可能反转视觉顺序。
- Canvas lifecycle extraction 可能引发 render queue 或 cleanup regression。
- 200 个横向标签可能影响布局和软件 Canvas 性能。
- 长浏览器矩阵后的高系统负载可能使单次 performance p95 抖动。

这些风险分别由 strict union/round-trip、order parity、characterization/cleanup tests 和真实浏览器性能门禁控制。

## Packet Review

- T113 ownership 只包含 categorical/config/tests 与 Vitest 配置；waterfall spec、公共入口、React、interaction
  和 export runtime 均为只读或禁止修改。
- T113 使用完整 `pnpm test:coverage`，并要求把 categorical tests 纳入 `editor-unit` project 及四项 95% 阈值，
  避免 scoped coverage 与仓库既有 domain/waterfall thresholds 发生假失败或漏测。
- T113 明确 bar 通过 G2 transpose 实现，projection、data、stable key 与语义色保持一致；视觉轴映射、分类反向、
  label position 与 grow direction 是唯一方向差异。
- T114 只拥有 category-axis geometry 与兼容 wrapper；`group-actions.test.ts` 是只读回归目标，不属于允许修改范围。
- T114 把 locked/same-parent eligibility 保留在 chart policy 与调用方冻结 candidate set，避免把领域规则复制进
  scene geometry；stale revision、4px threshold 与 hostile bounds 使用结构化失败。
- 两个 packet 都明确禁止在当前未提交 T112 基线上并行，不会通过不完整 `HEAD` 创建 worktree。
- T113 fresh validation 为 focused 23/23、full coverage 357/357；categorical coverage
  98.90/100/100/98.88，三层 review 无 blocking finding。
- T114 fresh validation 为 focused 34/34、full unit/coverage 370/370；category-axis coverage
  98.71/95.78/100/98.66；X/Y parity、hostile boundary 与 legacy horizontal regression 通过，三层 review 无
  blocking finding。
- T115 交付了 components/export/playground/E2E 纵向切片；共享 `groupSelection.ts` 的 chart-family-aware
  baseline correction 是唯一已披露 read-only 偏差，用户已随 T115 验收确认。TDD、真实 G2/browser、export、
  a11y、200-item performance、visual evidence 和三层 review 全部通过。
- T116 packet 把共享边界限制为两个生产 Canvas 已重复的 constructor/load、request queue、stale discard、
  animation finish、event/error/destroy lifecycle，以及 SVG/PNG 已重复的 offscreen host lifecycle；chart-specific
  spec/projection/gesture/copy 与格式 sanitizer/encoder 保持原 ownership。
- T116 packet 使用 `charts/waterfall`、`charts/categorical` 和按证据成立的 `rendering/g2` 作为内部目标，
  明确禁止公共 registry、raw G2 public exposure、行为/视觉/schema/依赖变化和只为对称存在的 API。
- T116 packet 要求先运行 accepted characterization，再用缺失 runtime contract tests 形成 RED，逐消费者 GREEN，
  最后删除单消费者 abstraction；覆盖 queue/stale/cleanup、screen/export parity、95% rendering coverage 与完整
  release-candidate gates。
- T116 以外部 content snapshot 隔离未提交 T112-T115 baseline；task-only patch 不依赖当前 index
  并通过 reverse-apply。执行中未 reset、stash、stage 或 commit。
- 最终 runtime operations 都有两个生产 consumer；WaterfallCanvas/CategoricalCanvas 共用 screen
  lifecycle，SVG/PNG 共用 offscreen lifecycle，没有 registry 或 speculative extension hook。
- engineering review 发现 partial event registration failure 的显式 off 缺口；RED 复现后修正并纳入
  98% 级 runtime coverage。

## Artifact Validation Evidence

- AI Delivery Governor strict task/feature validator：通过，0 error、0 warning，包含 T116 evidence 和
  placeholder 检查。
- YAML parse：T113-T116 packet 均为合法 YAML。
- Prettier check：通过，feature artifacts 与 packets 均符合仓库格式。
- `git diff --check`：通过，无空白错误。
- Requirement ID parity：spec 与 tasks 均覆盖 CAT-FR-001 至 CAT-FR-009、CAT-NFR-001 至
  CAT-NFR-006、CAT-AC-001 至 CAT-AC-009。
- Runtime tests：T116 full unit/coverage 393/393；`rendering/g2` 四项覆盖为
  98.07/98.36/100/98.07；current browsers 132/132、previous browsers 132/132、WebKit 18.4 44/44、
  a11y 27/27、React 18/19、package 与 clean 200-item performance 通过。

## Execution Readiness

结论：004 artifacts 与 T116-A001 实现一致。T112-T116 已由用户验收；T116 已完成
characterization、RED/GREEN/refactor、全量门禁、fresh visual/export evidence 和三层 review，
无 unresolved Critical/High/Medium finding。E004 分类图验证切片完成。

T112 RED 后的 TypeScript 编译确认：`SourceData` 扩展为严格 union 后，现有 waterfall projector 必须在
canonical validation 成功后显式收窄 waterfall source，否则公共 union 无法通过严格类型检查。T112 allowed
files 因此包含 `projectWaterfall.ts` 的单一防御性收窄；该调整不实现 categorical projection、不改变现有
waterfall projection 结果，也不与 T113 ownership 冲突。

同一 exact union 要求现有 editor empty-state 判断与 `groupSelection` 在访问 waterfall-only `kind` 前先做
属性收窄。T112 只加入防御性 type guard：categorical component 仍由 waterfall projector 返回结构化不兼容
结果，categorical direct interaction 仍未接入；T115/T114 的产品行为 ownership 保持不变。
