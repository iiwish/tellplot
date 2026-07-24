# T122 验证结果

## Metadata

- Date: 2026-07-23
- Primary runtime: Node 24.15.0 / pnpm 11.1.3
- Previous-browser runtime: Node 22.20.0
- Result: Passed

## Focused TDD And Review Fixes

| Gate | Result |
| --- | --- |
| public config validator / package API / type consumer | passed |
| `ChartEditor` facade component tests | 4/4 passed |
| playground config/view parser | 3/3 passed |
| live config/view Chromium/Firefox/WebKit | 12/12 passed |
| rendering screenshot receipt | Chromium 3/3 passed |
| invalid-stage compatibility regression | 3/3 passed |

RED failures were observed before implementation and are summarized in `summary.md`.

## Full Release-Candidate Gates

| Command / Gate | Result |
| --- | --- |
| `pnpm format:check` | passed |
| `pnpm lint` | passed |
| `pnpm typecheck` | passed |
| `pnpm test:unit` | 49 files；433/433 passed |
| `pnpm test:coverage` | 433/433；statements 85.57%；branches 80.08%；functions 88.08%；lines 85.72% |
| constrained domain/chart/G2 coverage | all >=95% |
| `pnpm build` | passed；仅保留既有 G2 chunk-size warning |
| `pnpm test:package` | publint、ATTW、ESM、CJS、types、quickstart 和 tarball contract passed |
| `pnpm test:react-matrix` | React 18.3.1 / 19.2.7；各 87405 painted pixels；clean unmount |
| `pnpm test:e2e` | Chromium/Firefox/WebKit 177/177 passed |
| `pnpm test:a11y` | 45/45 passed |
| `pnpm test:performance` | waterfall p95 78.7ms；categorical p95 79.3ms；均低于 150ms |
| previous Playwright release | 177/177 passed |
| WebKit 18.4 previous-major | 59/59 passed |
| strict artifact validator | feature-specific strict 与 root validator 均 passed |
| `git diff --check` | passed |

## Boundary Audits

- Runtime exports 恰为 11 个：`ChartEditor`、`validateChartConfig` 和 9 个既有 session/domain API。
- G002-R3 相对 baseline 未修改 package manifest、lockfile、domain model/commands/validation 或 export 实现。
- 新公共实现未引入 `any`、`@ts-ignore`、`@ts-expect-error`、`eval` 或 `new Function`。
- `FinancialChart*` 只保留在内部架构说明和 beta 前迁移映射，不从 package entry 导出。

## Notes

- 直接在 Node 24 运行 previous-browser 脚本会按 `.nvmrc` 预期拒绝；使用
  `mise exec node@22.20.0 -- pnpm test:browser-previous` 完整通过。
- 一次并发运行 package 与 React matrix 时，两个命令同时清理 dist 造成非产品性竞争；顺序复跑均通过。
- Playwright 成功截图经过人工查看；非活动 config/view panel 的 CSS 可见性问题已修复并加入回归测试。

## Approved Label Configuration Extension

用户批准标签配置扩展后的 fresh 验证：

| Gate | Result |
| --- | --- |
| label validator/resolver/waterfall/categorical/group-region focused tests | 37/37 passed |
| `pnpm format:check` / lint / typecheck / `git diff --check` | passed |
| `pnpm test:unit` | 52 files；447/447 passed |
| build / package / React 18.3.1 + 19.2.7 matrix | passed |
| live-code / rendering / export / showcase Chromium | 20/20 passed |
| accessibility Chromium/Firefox/WebKit | 45/45 passed |
| 200-item performance | waterfall p95 84ms；categorical p95 111.6ms；均低于 150ms |
| desktop browser visual review | passed；标签位于柱体外侧、无默认背景框、层级清晰 |

移动端 `auto` 标签密度策略由组件测试锁定；`display: 'always'` 仍可覆盖该默认策略。一次渲染 E2E
暴露测试像素探针仍使用旧演示绿色，探针改为当前 `#12B76A` 后 focused 和 20 个 Chromium 场景复跑通过。
