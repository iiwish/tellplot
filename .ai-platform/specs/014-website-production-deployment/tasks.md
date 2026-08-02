# G008 官网生产部署 Work Graph

## Metadata

- Feature ID: `014-website-production-deployment`
- Goal ID: `G008`
- Version: 1.0.0
- Status: Confirmed
- Last updated: 2026-08-02
- Approval: 用户明确批准本目标、Vercel Production、Cloudflare DNS 和远程 push

## T132 - 固化生产构建、路由与可发现性

- Status: Needs_Review
- Priority: P0
- Story / Requirement: WEB-FR-001 至 WEB-FR-004
- Dependencies: G007 / T131 Accepted
- Blocks: T133
- Parallel: false
- Conflicts with: npm publish、tag、公共 API、图表行为、SSR/新网站框架
- Goal: 建立可测试的 Vercel 静态部署合同、route shells、metadata、静态发现文件、缓存和安全头。
- Allowed files: `package.json`、`apps/playground/**`、`e2e/**`、`vercel.json`、`README.md`、`docs/**`、`AGENTS.md`、`.ai-platform/**`
- Test targets: deployment config、route metadata、Vite build output、typecheck、lint、网站路由 E2E
- Deliverables: 生产部署源码与配置、T132 evidence
- Acceptance criteria: WEB-FR-001 至 004 与 WEB-SC-001 满足；无生产依赖或包行为变化。
- Definition of Done: clean production build 产出四个 route shells 和全部 discovery assets；focused/full gate 通过。
- Validation commands: focused Vitest；`pnpm format:check`；`pnpm lint`；`pnpm typecheck`；`pnpm build:site`；`pnpm test:unit`；相关 Playwright；artifact validator；`git diff --check`
- TDD plan: RED 固定缺失部署合同；GREEN 实现静态构建与 metadata；REFACTOR 验证 CSP、缓存与无重复 route 文案。
- Packet path: `.ai-platform/specs/014-website-production-deployment/packets/T132.yaml`
- Evidence required: `.ai-platform/evidence/T132/summary.md`、`test-results.md`、`review.md`

## T133 - 建立并验收 Vercel Preview 与 Production source

- Status: Ready
- Priority: P0
- Story / Requirement: WEB-FR-005
- Dependencies: T132 Needs_Review；clean committed and pushed source
- Blocks: T134
- Parallel: false
- Conflicts with: dirty worktree deployment、DNS cutover、npm release
- Goal: 连接 GitHub 与 Vercel，使用仓库配置完成 Preview，验收后建立 main Production deployment。
- Allowed files: Vercel project/settings/deployments、GitHub repository/settings、`.gitignore`、`.ai-platform/**`、`README.md`
- Test targets: hosted build log、direct routes、headers、metadata、desktop/mobile、editor smoke
- Deliverables: Preview/Production URL、source SHA、deployment evidence、T133 review
- Acceptance criteria: WEB-FR-005、WEB-SC-002 与 Production source traceability 满足。
- Definition of Done: Preview 与 Production deployment Ready，四路由和编辑器 smoke 通过，尚未依赖 DNS 才能访问。
- Validation commands: Vercel deployment inspect；HTTP/browser smoke；secret scan；artifact validator
- TDD plan: 先以 Preview 验证配置，失败不得提升 Production；通过后以同一已提交配置建立 Production。
- Packet path: `.ai-platform/specs/014-website-production-deployment/packets/T133.yaml`
- Evidence required: `.ai-platform/evidence/T133/summary.md`、`test-results.md`、`review.md`

## T134 - 绑定 Cloudflare 域名并完成生产验收

- Status: Pending
- Priority: P0
- Story / Requirement: WEB-FR-006
- Dependencies: T133 Needs_Review；Vercel Production Ready
- Blocks: G008 goal review
- Parallel: false
- Conflicts with: nameserver migration、未验证 deployment 的 DNS 切换
- Goal: 在 Cloudflare 配置 Vercel 要求的 DNS，绑定 apex/www，验证 HTTPS、canonical、重定向与回滚。
- Allowed files: Cloudflare `tellplot.com` zone DNS、Vercel domains/deployments、`README.md`、`docs/**`、`AGENTS.md`、`.ai-platform/**`
- Test targets: DNS authoritative resolution、TLS、HTTP headers/routes、metadata、robots/sitemap、生产 editor smoke
- Deliverables: Production domain、DNS/TLS/rollback evidence、G008 final review
- Acceptance criteria: WEB-FR-006 与 WEB-SC-003 至 006 满足。
- Definition of Done: apex 生产可用，www 永久重定向，四个路由与核心编辑器通过，无 unresolved blocker。
- Validation commands: `dig`/authoritative DNS；`curl` HTTPS/headers/routes；真实浏览器 smoke；artifact validator；`git diff --check`
- TDD plan: DNS 前记录无解析基线；绑定后逐项验证，不满足时回滚记录并保持 Vercel URL 可用。
- Packet path: `.ai-platform/specs/014-website-production-deployment/packets/T134.yaml`
- Evidence required: `.ai-platform/evidence/T134/summary.md`、`test-results.md`、`review.md`
