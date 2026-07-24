# G004 首个公开 Beta 发布 Goal Graph

## Metadata

- Feature ID: `008-public-beta-release`
- Goal ID: `G004`
- Version: 0.1.0
- Status: Superseded
- Last updated: 2026-07-23
- Approval: 未批准；T120/T121 由稳定版 T123 和未来 G005 取代

## T120 - 本地发布硬化与可复现候选

- Status: Cancelled
- Priority: P0
- Dependencies: G002 / T117、G002-R1 / T118、G002-R2 / T119、G002-R3 / T122 全部 Accepted；
  用户重新批准 G004
- Blocks: T121
- Story / Requirement: REL-US-001 至 REL-US-003；REL-FR-001 至 REL-FR-007；REL-NFR-001 至 REL-NFR-004
- Parallel: false
- Conflicts with: 新图表、breaking API、schema、依赖升级、远程 Git、仓库公开、deploy、npm publish
- Goal: 从当前已验收成果形成架构边界可执行、完整矩阵稳定、fresh clone 可复现的公开 Beta 候选。
- Allowed files: `.ai-platform/**`、`AGENTS.md`、`README.md`、`CHANGELOG.md`、`CONTRIBUTING.md`、
  `SECURITY.md`、`CODE_OF_CONDUCT.md`、`docs/**`、`.github/**`、`package.json`、`playwright.config.ts`、
  `packages/editor/package.json`、`packages/editor/README.md`、`packages/editor/LICENSE`、
  `packages/editor/tests/package/**`、`apps/playground/**`、`e2e/**`、`scripts/release/**`
- Forbidden targets: 核心领域/投影/命令/交互行为、公共 API、schema、依赖、remote Git、visibility、DNS、
  production deploy、Git tag、GitHub Release、npm publish
- Test targets: architecture imports/cycles、public API、package/tarball、sensitive data、broken links、WebKit
  stability、fresh clone full release matrix
- Deliverables: architecture gate、开源资料、稳定完整矩阵、clean-clone release rehearsal、T120 evidence
- Acceptance criteria: REL-SC-001、REL-SC-002；无 unresolved Critical/High/Medium finding；T121 输入完整。
- Definition of Done: TDD/evidence/review 完整，G004 保持执行中，T120 进入 `Needs_Review`；不执行远程动作。
- Validation commands: `pnpm install --frozen-lockfile`；`pnpm format:check`；`pnpm lint`；
  `pnpm typecheck`；`pnpm test:coverage`；`pnpm build`；`pnpm test:package`；
  `pnpm test:react-matrix`；`pnpm test:e2e`；`pnpm test:a11y`；`pnpm test:performance`；
  `pnpm test:browser-previous`；architecture/link/secret audit；artifact validator；`git diff --check`
- TDD plan: RED 固定 architecture/WebKit/release-rehearsal 失败证据；GREEN 最小修正；REFACTOR 只清理
  发布脚本和测试重复，不改产品行为。
- Packet path: `.ai-platform/specs/008-public-beta-release/packets/T120.yaml`
- Evidence required: `.ai-platform/evidence/T120/` 中的 summary、test results、architecture report、tarball
  manifest、clean-clone receipt、diff 和 review

## T121 - 公开仓库、网站与 npm Beta

- Status: Cancelled
- Priority: P0
- Dependencies: T120 review 通过；用户明确批准远程 Git、仓库公开、生产部署、tag/release 和 npm publish；
  `@tellplot` scope、2FA/Trusted Publishing、域名与托管权限可用
- Blocks: G004 目标级验收
- Story / Requirement: REL-US-001 至 REL-US-003；REL-FR-002、REL-FR-004 至 REL-FR-008
- Parallel: false
- Conflicts with: 未完成 T120、dirty worktree、未授权远程动作、版本变更、新图表
- Goal: 将同一 release commit 公开为 GitHub 仓库、生产网站、Git tag、GitHub Release 和 npm Beta。
- Allowed files: `.ai-platform/**`、发布元数据与只为远程环境必需的最小托管配置
- Test targets: public GitHub、CI、HTTPS/direct routes、npm version/dist-tags/tarball、public React consumer
- Deliverables: public repository、production site、`v0.1.0-beta.1` tag/release、
  `@tellplot/editor@0.1.0-beta.1` beta distribution、T121 evidence
- Acceptance criteria: REL-SC-003 至 REL-SC-005 全部满足。
- Definition of Done: 所有远程证据和三层 review 完整，G004 进入 `Needs_Review` 等待一次目标级验收。
- Validation commands: remote CI；production smoke；`npm view` version/dist-tags；public tarball audit；
  clean consumer install/render；artifact validator；`git diff --check`
- TDD plan: 不改变产品行为；先对 staging/公开 URL 与 registry 写失败检查，再执行最小远程发布动作。
- Packet path: T120 通过且远程授权完整后生成。
- Evidence required: `.ai-platform/evidence/T121/` 中的 commit/tag/release、GitHub visibility/CI、deployment、
  npm metadata/dist-tags/provenance、public install 和 review
