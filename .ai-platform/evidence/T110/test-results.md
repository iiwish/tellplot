# T110 测试结果

## 治理预检

- 修改前已检查工作树，分支从干净的 `main` 建立。
- 用户批准记录在 Confirmed spec 和 execution packet。
- Requirements checklist 与 cross-artifact analysis 无 Critical、High 或 Medium finding。

## TDD

### RED

- 聚焦 Vitest 共运行 67 个既有测试：63 passed、4 failed；新增配置 suite 因模块尚不存在无法加载。
- 失败覆盖预期缺口：配置模块缺失；标题和无障碍摘要忽略 `chartAppearance`；共享 G2 spec 与 SVG 导出仍使用固定标题。
- RED receipt 生成前没有修改 production source。

### GREEN

- 配置解析、G2 映射、组件 rerender、无障碍和 SVG parity 聚焦测试 70/70 通过。
- 最终全量 unit/component tests 330/330 通过。
- `chartAppearance.ts` statements、branches、functions、lines 均为 100%。

## 全量验证

- `pnpm format:check`: passed。
- `pnpm lint`: passed，0 warnings。
- `pnpm typecheck`: editor 与 playground passed。
- `pnpm test:coverage`: 32 files、330 tests passed；aggregate statements 90.68%、branches 84.63%、functions 93.90%、lines 90.77%。
- `pnpm build`: editor ESM/CJS/types/styles 与 playground production build passed。
- `pnpm test:package`: publint、Are The Types Wrong、ESM/CJS import 和 public type consumer passed。
- `pnpm test:react-matrix`: React 18.3.1 与 19.2.7、G2 5.4.8 真实 tarball consumer passed；配置重绘后分别为 87,405 与 88,744 painted pixels，clean unmount，0 runtime error。
- `pnpm test:e2e`: Chromium、Firefox、WebKit 108/108 passed。
- `pnpm test:a11y`: Chromium、Firefox、WebKit 21/21 passed。
- `pnpm test:performance`: 200 项、30 samples，visible-canvas p95 71.1ms，budget 150ms，same-target root commit delta 0。
- `git diff --check`: passed。
