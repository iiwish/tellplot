# G007 单包分发与公开发布 Work Graph

## Metadata

- Feature ID: `013-single-package-distribution`
- Goal ID: `G007`
- Version: 1.0.0
- Status: In_Progress
- Last updated: 2026-08-01
- Approval: 用户明确批准本目标及单包发布边界

## T131 - 收敛单包分发并完成公开发布

- Status: In_Progress
- Priority: P0
- Story / Requirement: DIST-FR-001 至 005；DIST-NFR-001 至 004
- Dependencies: G006 / T125-T129 Accepted；G005 / T130 本地发布安全门禁可复用
- Blocks: `tellplot@1.0.0` 公开发布
- Parallel: false
- Conflicts with: 新图表、schema、编辑行为、第二渲染引擎、公开旧四包稳定版本、兼容 shim
- Goal: 以一个 `tellplot` 公共包交付 imperative、React 和 Vue 完整编辑器，并完成可追溯的 1.0.0 发布。
- Allowed files: `packages/**`、`apps/playground/**`、`scripts/release/**`、`.github/workflows/**`、
  `docs/**`、`README.md`、`CHANGELOG.md`、`AGENTS.md`、`.ai-platform/**`、测试与 lockfile
- Test targets: package/public surface、architecture、framework consumers、browser/a11y/performance、
  supply chain、artifact reproducibility、preflight、staging 与 public fresh install
- Deliverables: `tellplot` 包、私有内部 layers、单包文档/fixtures/release pipeline、T131 evidence、公开 1.0.0。
- Acceptance criteria: DIST-SC-001 至 006 满足；公开 registry 只产生 `tellplot@1.0.0` 稳定结果。
- Definition of Done: 本地与托管门禁通过；旧 stage 已清理；tag、workflow、staged artifact、npm 公开版本、
  provenance 和 fresh install 证据一致；无未解决发布阻塞。
- Validation commands: `pnpm release:check`；`pnpm release:preflight`；`pnpm release:artifact`；
  `pnpm release:trust-readiness`；public registry/provenance/fresh-install verification
- TDD plan: RED 固定单包合同；GREEN 建立聚合包并迁移所有 consumers；REFACTOR 以完整 release matrix 和
  公共 staged artifact 关闭边界缺口。
- Packet path: `.ai-platform/specs/013-single-package-distribution/packets/T131.yaml`
- Evidence required: `.ai-platform/evidence/T131/summary.md`、`test-results.md`、`review.md`、
  `tarball-manifest.json`、workflow/stage/registry evidence
