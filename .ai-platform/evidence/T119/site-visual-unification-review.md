# T119 全站视觉统一 Review

## Metadata

- Goal: `G002-R2`
- Attempt: `T119-A008`
- Status: Passed
- Reviewed: 2026-07-23

## Review Scope

- `/examples`: 浅灰画布、卡片式搜索与筛选、无边框真实图表卡片、卡片式后续入口。
- `/docs`: 卡片式目录、文档章节和版本信息；代码与概念对照使用无阴影的内嵌浅色区域。
- `/playground`: 浅灰工作画布、代码和编辑器工作卡片、蓝色交互强调；保留高密度编辑结构与必要分隔。
- `/not-found`: 与网站一致的居中白色内容卡片。
- Shared: 顶栏和页脚与首页使用同一画布、阴影、圆角和颜色合同。

## Visual Evidence

- `visual/examples-card-desktop.png`
- `visual/examples-card-mobile.png`
- `visual/docs-card-desktop.png`
- `visual/docs-card-mobile.png`
- `visual/workbench-card-desktop.png`
- `visual/workbench-card-mobile.png`

桌面证据使用 `1440x900`，移动证据使用 `390x844`。移动文档页最终测得
`document.documentElement.scrollWidth === window.innerWidth === 390`。

## Verification

- `pnpm format:check`: passed
- `pnpm lint`: passed
- `pnpm typecheck`: passed
- `pnpm test:unit`: 51 files, 438 tests passed
- `pnpm exec playwright test e2e/showcase.spec.ts --project=chromium --project=firefox --project=webkit`:
  15 tests passed
- `pnpm test:a11y`: 45 tests passed across Chromium, Firefox, and WebKit
- `git diff --check`: passed

## Findings

- 示例和文档在移动端明确回落为单列，不受桌面两列规则覆盖。
- 文档卡片显式使用 `minmax(0, 1fr)`，代码块内部滚动且页面不存在横向溢出。
- 工作台次要文字色满足小字号对比度要求，蓝色启用状态继续通过 axe 严重/关键违规检查。
- 视觉层只改变网站与参考工作台外壳，不改变图表数据、命令、ViewSpec、G2 生命周期或导出行为。

## Residual Risk

- 长文档内容继续增加时，需要保持每个章节卡片的单一主题，避免重新形成嵌套卡片。
- 工作台保持桌面优先；移动端代码面板仍通过按需打开的全屏对话框承载。
