# G004 首个稳定版 1.0 Goal Graph

## Metadata

- Feature ID: `010-stable-v1-release`
- Goal ID: `G004`
- Version: 1.0.0
- Status: Accepted
- Last updated: 2026-07-29
- Approval: 用户已批准目标与连续执行，并于 2026-07-29 与 G002 系列统一验收

## T123 - 交付 1.0.0 本地稳定版候选

- Status: Accepted
- Priority: P0
- Dependencies: G002、G002-R1、G002-R2、G002-R3 implementation/review complete；用户批准 G004
- Blocks: G005 公开稳定版发布
- Story / Requirement: STABLE-FR-001 至 008；STABLE-NFR-001 至 005
- Parallel: false
- Conflicts with: 新图表、schema、breaking API、依赖、核心重构、远程 Git、publish、deploy
- Goal: 交付可复现、可审计但尚未执行远程发布的 `@tellplot/editor@1.0.0` 本地稳定候选。
- Allowed files: package/release metadata、`.github/**`、`scripts/release/**`、公开文档、package tests、
  `packages/editor/tests/react-matrix/**`、
  `apps/playground/src/DocsPage.tsx`、`apps/playground/src/SiteHeader.tsx`、`apps/playground/vite.config.ts`、
  `apps/playground/tests/**`、`e2e/**`、root scripts、`.gitignore`、`.prettierignore`、`vitest.config.ts`、`.ai-platform/**`、
  `AGENTS.md`
- Read-only behavior: domain、commands、charts、projection、interactions、G2 runtime、export implementation
- Test targets: stable metadata/public files RED；runtime export；architecture graph/cycles；release audit；
  isolated source；package/React/browser/a11y/performance regressions
- Deliverables: `@tellplot/editor@1.0.0` tarball；1.x 兼容与维护文档；release scripts；隔离源码 receipt；
  三层 review 与目标级 evidence
- Acceptance criteria: STABLE-SC-001 至 STABLE-SC-006 全部满足；无 unresolved Critical/High/Medium
  finding；不执行任何远程动作。
- Definition of Done: 1.0.0 tarball、隔离源码 receipt、三层 review 与 evidence 完整，G004/T123
  进入 `Needs_Review`。
- Validation commands: `pnpm release:architecture`、`pnpm release:audit`、`pnpm release:artifact`、
  `pnpm release:check`、`pnpm release:rehearse`、完整质量与浏览器矩阵、strict artifact validator、
  `git diff --check`
- TDD plan: RED stable version/files/scripts；GREEN policy/community/release gates；REFACTOR 组合命令与隔离复演；
  FINAL 完整兼容矩阵和 evidence。
- Packet path: `.ai-platform/specs/010-stable-v1-release/packets/T123.yaml`
- Evidence required: `.ai-platform/evidence/T123/summary.md`、`test-results.md`、`diff.patch`、`review.md`、
  `architecture-report.md`、`tarball-manifest.json`、`isolated-source-receipt.md`

## Internal Workstreams

| Workstream | Scope | State |
| --- | --- | --- |
| T123-A001 | Stable artifacts、metadata/docs RED | Completed |
| T123-A002 | Version/API/support/community GREEN | Completed |
| T123-A003 | Architecture/release audit scripts | Completed |
| T123-A004 | Isolated-source rehearsal | Completed |
| T123-A005 | Full gates、review、evidence | Completed |
| T123-A006 | Final tarball provenance 与 playground chunk correction | Completed |
