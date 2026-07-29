# G002-R2 开源官网与示例中心 Plan

## Metadata

- Version: 0.1.0
- Status: Confirmed
- Last updated: 2026-07-23

## Technical Approach

- 保留现有 React 19 + Vite 8 单页应用，使用极小的 `history.pushState` 路由层，不新增 router。
- 将当前工作台从 `App.tsx` 提取为 `ExampleWorkbench`，不改变其 source/view/state 所有权。
- 新增网站壳、首页、示例中心、文档页和 playground-only 示例目录。
- 首页与示例预览直接使用 read-only `ChartEditor`，图形动画仍由 G2 负责。
- 视觉样式集中在 playground CSS token 和站点作用域中，不修改 `@tellplot/editor` 默认视觉。

## Internal Workstreams

1. T119-A001：目标 artifact、设计合同、基线与 RED 导航/示例 E2E。
2. T119-A002：路由、网站壳、首页真实图表舞台和示例目录。
3. T119-A003：文档页、工作台迁移、移动菜单与响应式收敛。
4. T119-A004：视觉 QA、无障碍、全量回归、review 和 evidence。

## Allowed Files

- `.ai-platform/**`
- `AGENTS.md`
- `README.md`
- `docs/**`
- `apps/playground/**`
- `e2e/**`
- `vitest.config.ts`（仅在需要新增 playground 测试项目配置时）

## Forbidden Changes

- `packages/editor/**` 行为、公共 API 或样式。
- `package.json`、lockfile 或 dependency 变化。
- SourceData/ViewSpec schema 与 command wire 变化。
- 新图表家族、远程服务、遥测、登录、部署和远程 Git。

## Validation

- Focused TDD: 新站点路由、内容目录和浏览器流程。
- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:unit`
- `pnpm test:coverage`
- `pnpm build`
- `pnpm test:package`
- `pnpm test:react-matrix`
- `pnpm test:e2e`
- `pnpm test:a11y`
- `pnpm test:performance`
- `mise exec node@22.20.0 -- pnpm test:browser-previous`
- artifact validator strict
- `git diff --check`

## Definition Of Done

全部成功标准、桌面/移动视觉合同和发布候选门禁通过；review 无 unresolved Critical/High/Medium finding；
T119 与 G002-R2 进入 `Needs_Review`，不执行 stage、commit、push、publish 或部署。
