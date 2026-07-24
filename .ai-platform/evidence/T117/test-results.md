# T117 / G002 Test Results

## TDD Receipt

| Phase | Command | Result |
| --- | --- | --- |
| RED | `pnpm exec vitest run packages/editor/tests/domain/commands.test.ts packages/editor/tests/package/public-api.test.ts` | expected failure：`ai` command source 被当前 parser 接受；26/27 passed |
| RED | `pnpm test:package` | expected failure：`CommandSource` 精确 union 与 compile-checked CSS import 未满足 |
| GREEN | focused Vitest command | 27/27 passed |
| GREEN | `pnpm test:package` | publint、ATTW、ESM、CJS、types、quickstart、tarball contract passed |
| RED | current Chromium usage-guide slice | 2 expected failures；“使用 TellPlot”入口尚不存在 |
| GREEN | current Chromium/Firefox/WebKit usage-guide slice | 6/6 passed；dialog、tabs、copy、focus、mobile、axe passed |
| RED | `states.test.tsx` layout slice | 3 expected failures；缺少布局数据、右侧标签栏和无 panel 空列合同 |
| RED | `pnpm test:package` | expected failure；`FinancialChartEditorLayout` 和 `layout` prop 尚未存在 |
| RED | desktop/mobile developer-layout browser slice | expected failure；桌面持久代码栏和移动端默认关闭合同未满足 |
| GREEN | layout component/package/browser slices | component 47/47；package passed；current Chromium/Firefox/WebKit 6/6 passed |
| RED | `pnpm exec vitest run apps/playground/tests/chartDocument.test.ts` | expected failure；安全图表文档模块尚不存在 |
| RED | current Chromium live-editor slice | expected failure；实时编辑器、双向同步与非法草稿状态尚不存在 |
| GREEN | chart-document unit + current Chromium slice | parser 4/4；左到右、非法草稿、右到左、接入示例 4/4 passed |

## Release-Candidate Gates

| Command | Result |
| --- | --- |
| `pnpm format:check` | passed |
| `pnpm lint` | passed |
| `pnpm typecheck` | passed |
| `pnpm test:unit` | 46 files；417/417 passed |
| `pnpm test:coverage` | 417/417 passed；statements 86.08%、branches 80.81%、functions 88.57%、lines 86.24% |
| `pnpm build` | editor ESM/CJS/DTS/styles 与 playground production build passed；既有 G2 chunk warning retained |
| `pnpm test:package` | `@tellplot/editor@0.1.0-beta.1`；publint/ATTW/ESM/CJS/types/pack passed |
| `pnpm test:react-matrix` | React 18.3.1 与 19.2.7 tarball install/build/real G2 canvas/clean unmount passed |
| `pnpm test:e2e` | current Chromium/Firefox/WebKit 150/150 passed |
| `pnpm test:a11y` | Chromium/Firefox/WebKit 33/33 passed；无 serious/critical axe violation |
| `pnpm test:performance` | waterfall p95 89.5ms；categorical p95 75.9ms；均低于 150ms budget |
| `mise exec node@22.20.0 -- pnpm test:browser-previous` | previous Chromium/Firefox/WebKit 150/150；WebKit 18.4 50/50 passed |
| strict artifact validator | passed after evidence completion |
| `git diff --check` | passed after evidence completion |

## Package Contract

- Tarball file count: 13
- Allowed roots only: `dist/`、`README.md`、`LICENSE`、`package.json`
- Required artifacts: ESM、CJS、`.d.ts`、`.d.cts`、styles、source maps、README、LICENSE、metadata
- Excluded: `src/`、tests、playground、docs、evidence、node_modules
- Runtime exports: 10/10 exact match
- Declaration leak scan: no `G2Spec`、`@antv/g2`、Chart/runtime constructor or export runtime symbol

## Review Correction Notes

- `review-correction.patch`：3,922 lines、37 files；SHA-256
  `16c9e7fb4be2abd32909b1023a699dc888fffb11d477d9c2cdb07dd36990d272`；基线 reverse-apply check passed。
- previous-browser matrix 首轮暴露 quickstart 在默认 160ms G2 展开动画结束前就开始 canvas hit test；
  测试显式等待已知动画边界后，current Chromium 连续 3/3 通过，clean exact-command rerun 为
  previous Chromium/Firefox/WebKit 138/138 + WebKit 18.4 46/46。未改动 runtime 或弱化状态/反馈断言。
- 使用入口不会改写编辑器状态；dialog 关闭后焦点返回触发按钮，复制只向本地 clipboard 写入用户主动选择的
  示例代码。
- `panels` 与 `layout` 责任分离：前者控制显隐，后者控制位置/呈现；默认组件 DOM 顺序和布局保持不变。
- `tellplot.config.json` 是 playground 本地组合而非 package schema；左侧 source 更新属于宿主输入，右侧图形
  编辑仍只产生 `ViewSpec` 命令。非法 JSON 和无效 source/view 均不会进入图形状态。
