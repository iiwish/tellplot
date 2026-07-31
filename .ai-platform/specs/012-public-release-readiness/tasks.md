# G005 本地发布准备 Work Graph

## Metadata

- Feature ID: `012-public-release-readiness`
- Goal ID: `G005`
- Version: 1.0.0
- Status: Needs_Review
- Last updated: 2026-07-31
- Approval: 用户明确要求修复发布 review findings

## T130 - 关闭本地公开发布准备缺口

- Status: Needs_Review
- Priority: P0
- Story / Requirement: RELEASE-FR-001 至 005；RELEASE-NFR-001 至 004
- Dependencies: G006 / T125-T129 Accepted；用户批准本地 remediation
- Blocks: G005 公开发布执行
- Parallel: true，仅允许 browser、release pipeline、docs 三个不重叠文件切片
- Conflicts with: remote Git、npm bootstrap/trust/stage/publish、release、production deploy、DNS、
  公共 API/schema/dependency changes
- Goal: 关闭浏览器、供应链、发布来源、工作流和 canonical 文档的本地 release readiness findings。
- Allowed files: `e2e/**`、`playwright.config.ts`、`package.json`、`scripts/release/**`、
  `.github/workflows/**`、`packages/editor/tests/package/{stable-release,process-lifecycle}.test.ts`、
  `packages/editor/tests/helpers/**`、
  `packages/editor/tests/browser-matrix/run-previous-browsers.mjs`、
  `packages/editor/tests/react-matrix/run-react-matrix.mjs`、`docs/roadmap.md`、
  `.ai-platform/docs/{tasks,release-report}.md`、`AGENTS.md`、本 feature 与 T130 evidence
- Test targets: browser determinism、跨平台 process-tree lifecycle、official audit、source preflight、
  workflow contract、canonical docs、完整 local release matrix
- Deliverables: 确定的 browser gate、官方 npm audit command、public source preflight、受保护的
  stage-only Trusted Publishing workflow、canonical 发布文档和 T130 evidence。
- Acceptance criteria: `RELEASE-SC-001` 至 `RELEASE-SC-006` 满足；当前 dirty source 被 public preflight
  拒绝；lightweight/stale tag 和 Git URL rewrite 不能绕过远端来源校验；未执行任何远程动作。
- Definition of Done: 本地可修复 finding 全部关闭；完整 release matrix 通过；T130 evidence 完整；
  G005 仍只因远程授权/身份/托管、package bootstrap、stage-only trust 与 2FA approval 保持 Blocked
- Validation commands: `pnpm release:check`；`pnpm release:preflight`；
  `pnpm release:trust-readiness`；`pnpm audit:prod`；strict artifact validator；`git diff --check`
- TDD plan: RED 复现 browser 与 release contract 缺口；GREEN 用 authoritative ready、显式 registry、
  strict source/stage-only workflow contract 关闭；REFACTOR 完整矩阵和隔离源码复演保持全绿。
- Packet path: `.ai-platform/specs/012-public-release-readiness/packets/T130.yaml`
- Evidence required: `.ai-platform/evidence/T130/summary.md`、`test-results.md`、`review.md`、`diff.patch`
