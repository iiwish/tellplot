# G002-R2 开源官网与示例中心 Tasks

## Metadata

- Version: 0.4.5
- Status: Accepted
- Last updated: 2026-07-29
- Acceptance: 用户于 2026-07-29 与 G002、G002-R1、G002-R3、G004 统一验收

## Goal Task

### T119 - 开源官网与示例中心

- Status: Accepted
- Priority: P0
- Dependencies: G002 / T117 implementation complete；G002-R1 / T118 implementation complete
- Blocks: G002-R2 目标级验收
- Story / Requirement: SHOWCASE-FR-001 至 SHOWCASE-FR-006；SHOWCASE-NFR-001 至 SHOWCASE-NFR-007
- Parallel: 否
- Conflicts with: dependency、公共 API、schema、核心包行为、远程 Git、publish、release、deploy
- Goal: 交付真实图表驱动的 TellPlot 官网、示例中心、文档入口和连续工作台。
- Allowed files: `.ai-platform/**`、`AGENTS.md`、`README.md`、`docs/**`、`apps/playground/**`、`e2e/**`、
  `vitest.config.ts`
- Test targets: route/content unit、navigation/workbench E2E、a11y、desktop/mobile visual、完整 release candidate
- Deliverables: 网站、示例目录、文档页、T119 evidence 和目标级 review
- Acceptance criteria: SHOWCASE-SC-001 至 SHOWCASE-SC-005 全部满足。
- Definition of Done: TDD、完整验证、视觉 rubric、review 和 evidence 完成，目标停在 `Needs_Review`。
- Validation commands: `pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm test:unit`、
  `pnpm test:coverage`、`pnpm build`、`pnpm test:package`、`pnpm test:react-matrix`、`pnpm test:e2e`、
  `pnpm test:a11y`、`pnpm test:performance`、上一发布浏览器矩阵、artifact validator、`git diff --check`
- TDD plan: RED 站点路由/内容/浏览器测试；GREEN 最小网站壳与页面；REFACTOR 提取工作台和内容目录。
- Evidence required: RED receipt、changed files、完整命令结果、desktop/mobile screenshots、visual rubric、
  task-only diff 和 residual risk。
- Packet path: `.ai-platform/specs/007-open-source-showcase/packets/T119.yaml`
- User review: 用户于 2026-07-29 统一验收 G002-R2 / T119。

## Internal Attempts

| Attempt | Scope | Status |
| --- | --- | --- |
| T119-A001 | artifacts、设计合同、基线与 RED | Completed |
| T119-A002 | 网站壳、首页、示例中心 | Completed |
| T119-A003 | 文档、工作台迁移、响应式 | Completed |
| T119-A004 | 视觉 QA、回归、review、evidence | Completed |
| T119-A005 | 首页信息架构、真实图表舞台与开发者入口优化 | Completed |
| T119-A006 | 首页操作入口去重与接入章节合并 | Completed |
| T119-A007 | 首页卡片视觉与可编辑分组瀑布图 | Completed |
| T119-A008 | 全站卡片视觉统一与工作台外壳优化 | Completed |
| T119-A009 | 演示数据、Showcase 配色与最小代码优化 | Completed |
