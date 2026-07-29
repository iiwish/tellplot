# G002-R3 公共配置 API v1 Goal Graph

## Metadata

- Feature ID: `009-public-configuration-api`
- Goal ID: `G002-R3`
- Version: 0.2.0
- Status: Accepted
- Last updated: 2026-07-29
- Approval: 用户于 2026-07-23 明确批准目标与执行，并于 2026-07-29 与 G002 系列、G004 统一验收

## T122 - 交付公共配置 API v1

- Status: Accepted
- Priority: P0
- Dependencies: G002 / T117、G002-R1 / T118、G002-R2 / T119 implementation complete
- Blocks: G002 系列目标级验收、G004 / T120
- Story / Requirement: CONFIG-FR-001 至 CONFIG-FR-009；CONFIG-NFR-001 至 CONFIG-NFR-006
- Parallel: false
- Conflicts with: 新图表、schema migration、G2 runtime 重构、依赖升级、远程 Git、publish、release
- Goal: 让公共配置代码清晰、声明式、可校验，并让演示页只展示真实公共合同。
- Allowed files: `packages/editor/src/config/**`、`packages/editor/src/components/ChartEditor.tsx`、
  `packages/editor/src/index.ts`、`packages/editor/src/react/editorTypes.ts`、
  `packages/editor/src/domain/errors.ts`、`packages/editor/tests/**`、
  `apps/playground/src/**`、`apps/playground/tests/**`、`e2e/**`、`README.md`、`CHANGELOG.md`、
  `packages/editor/README.md`、`docs/**`、`.ai-platform/**`、`AGENTS.md`
- Read-only behavior: domain schema、commands、chart projection、G2 runtime、pointer interactions、export implementation
- Test targets: public runtime exports；ChartConfig compile contract；config validator；ChartEditor controlled/uncontrolled；
  playground config/view parsing and synchronization；package/React/browser/a11y/performance regressions
- Deliverables: public config types/validator/facade；双文件 playground；文档与迁移；package/browser evidence
- Acceptance criteria: CONFIG-SC-001 至 CONFIG-SC-007 全部满足；无 unresolved Critical/High/Medium finding。
- Definition of Done: TDD receipt、完整 gates、三层 review 和目标级 evidence 完整；T122 进入 `Needs_Review`。
- Validation commands: `pnpm format:check`；`pnpm lint`；`pnpm typecheck`；`pnpm test:unit`；
  `pnpm test:coverage`；`pnpm build`；`pnpm test:package`；`pnpm test:react-matrix`；`pnpm test:e2e`；
  `pnpm test:a11y`；`pnpm test:performance`；`pnpm test:browser-previous`；strict artifact validator；
  `git diff --check`
- TDD plan: RED public/type/validator/component/playground contracts；GREEN facade and mapping；REFACTOR docs and demo；
  FINAL release candidate gates.
- Packet path: `.ai-platform/specs/009-public-configuration-api/packets/T122.yaml`
- Evidence required: `.ai-platform/evidence/T122/summary.md`、`test-results.md`、`diff.patch`、`review.md`、
  `api-surface.md`、playground screenshots

## Internal Workstreams

| Workstream | Scope | State |
| --- | --- | --- |
| T122-A001 | Artifacts、public/type/validator RED | Completed |
| T122-A002 | ChartConfig、validateChartConfig、ChartEditor GREEN | Completed |
| T122-A003 | Playground public config/view files and docs | Completed |
| T122-A004 | Full gates、三层 review、evidence | Completed |
| T122-A005 | 对象式数值/分组标签配置、G2 前景映射与响应式密度复核 | Completed |
