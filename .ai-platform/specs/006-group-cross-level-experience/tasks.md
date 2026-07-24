# G002-R1 分组与跨层编辑体验 Goal Graph

## Metadata

- Feature ID: `006-group-cross-level-experience`
- Goal ID: `G002-R1`
- Version: 0.3.0
- Status: Needs_Review
- Last updated: 2026-07-23
- Approval: 用户于 2026-07-20 明确批准；目标与 G002、G002-R2、G002-R3 一起等待统一验收

## T118 - 交付 G002-R1 分组与跨层编辑体验

- Status: Needs_Review
- Priority: P0
- Dependencies: G001 Accepted；G002 / T117 release candidate complete
- Blocks: G002 目标级复验与后续基础图表扩展
- Story / Requirement: R1-FR-001 至 R1-FR-007；R1-NFR-001 至 R1-NFR-006
- Parallel: false；作为一个目标级 governed correction 连续执行
- Conflicts with: 新图表、schema、dependency、远程 Git、npm publish、正式 release
- Goal: 交付上下文选择、跨层语义拖拽、来源分组原子解散和可配置展开分组区域。
- Allowed files: `.ai-platform/**`、`AGENTS.md`、`docs/**`、`packages/editor/src/config/**`、
  `packages/editor/src/charts/**`、`packages/editor/src/components/**`、`packages/editor/src/domain/**`、
  `packages/editor/src/export/**`、`packages/editor/src/index.ts`、`packages/editor/src/interactions/**`、
  `packages/editor/src/styles/**`、`packages/editor/tests/**`、`apps/playground/**`、`e2e/**`
- Forbidden targets: `SourceData` / `ViewSpec` schema wire、dependency manifests/lockfile、raw G2 public API、remote Git、publish
- Test targets: selection context、move resolver、domain invariants/history、chart/outline interaction、group region projection、
  G2 screen/export spec、appearance parser/public types、E2E/a11y/performance/package/browser matrix
- Internal workstreams:
  - contextual selection and Inspector actions
  - before/after/inside resolution and cross-container chart/outline preview
  - atomic two-member source-group dissolution
  - shared expanded-group region projection and G2 rendering
  - configuration, export, documentation and goal-level validation
- Deliverables: contextual Inspector；cross-container chart/outline drag；atomic group cleanup；shared G2 group regions；
  public appearance types/docs；screen/export/browser/evidence bundle
- Acceptance criteria: R1-SC-001 至 R1-SC-005 全部满足；无 unresolved Critical/High/Medium finding；不执行远程动作。
- Definition of Done: RED/GREEN receipts、全量 gates、三层 review 和目标级 evidence 完整；G002-R1 / T118 进入
  `Needs_Review`，只向用户请求一次目标验收。
- Validation commands: `pnpm format:check`；`pnpm lint`；`pnpm typecheck`；`pnpm test:unit`；
  `pnpm test:coverage`；`pnpm build`；`pnpm test:package`；`pnpm test:react-matrix`；`pnpm test:e2e`；
  `pnpm test:a11y`；`pnpm test:performance`；`mise exec node@22.20.0 -- pnpm test:browser-previous`；
  strict artifact validator；`git diff --check`
- TDD plan: RED contextual/inside/dissolve/region tests；GREEN minimal command/adapter/G2 implementation；REFACTOR shared region code only.
- Packet path: `.ai-platform/specs/006-group-cross-level-experience/packets/T118.yaml`
- Evidence required: `.ai-platform/evidence/T118/summary.md`、`test-results.md`、`diff.patch`、`review.md`、visual evidence
- User review: 等待 G002 系列目标级统一验收。
