# T106 Test Results

## RED

| Target | Exit | Expected signal |
| --- | ---: | --- |
| initial T106 component suite | 1 | 31 tests 中 22 个因 interaction/group/cancel/lifecycle 行为缺失失败，9 个既有边界通过 |
| initial real Chromium suite | 1 | 15/15 因 drag/group/axe/performance 行为尚未实现失败 |
| review regression suite | 1 | 48 tests 中 9 个因 modal focus、touch multiselect、cross-surface target、stale drag cancel、locale/easing/contrast 缺失失败 |
| stale dnd-kit session regression | 1 | 受控 ViewSpec 更新后再次 pointermove + pointerup 仍产生 1 个旧手势 command |
| stale dnd-kit visual-session regression | 1 | active guard 后旧 command 已被阻止，但 row 仍保留 `dragging` 与 transform |
| controlled commit layout race regression | 1 | 父级 layout effect 在新 ViewSpec commit 中释放旧 pointer，passive invalidation 前仍提交 1 个 command |
| row-body drag hit target regression | 1 | 267x36px 行中仅 24x32px grip 可起拖；从 label 区按下并移动后 editor 仍为 `idle` |

## GREEN And Fresh Validation

| Command | Exit | Result |
| --- | ---: | --- |
| `pnpm exec vitest run --project editor-components packages/editor/tests/components/outline.test.tsx packages/editor/tests/components/keyboard.test.tsx packages/editor/tests/components/group-actions.test.tsx` | 0 | 3 files、28 tests passed |
| `pnpm exec vitest run --project editor-components --maxWorkers=4` | 0 | 7 files、70 tests passed |
| `pnpm test:unit` | 0 | 19 files、242 tests passed |
| `pnpm test:coverage` | 0 | 242 tests passed；全部 thresholds 通过 |
| `pnpm typecheck` | 0 | editor 与 playground strict source typecheck 通过 |
| `pnpm lint` | 0 | 0 warning/error |
| `pnpm format:check` | 0 | 全部 matched files 通过 |
| `pnpm build` | 0 | editor ESM/CJS/CSS/declarations 与 playground production build 成功 |
| `pnpm test:package` | 0 | publint、ATTW、ESM/CJS runtime 与 type consumer 通过 |
| isolated Chromium T106 suite after row-body amendment | 0 | 21/21 passed、0 skipped、0 flaky、0 unexpected |
| `git diff --check` | 0 | 无 whitespace error |

默认 Playwright 端口 4173 被本机无关服务占用；原 T106 使用一次性等价配置在 4174 验证。本轮直接连接用户运行的 `http://localhost:5174/`，单 Chromium worker 完成复验，并在交付前移除临时配置。

## Coverage

| Boundary | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| Aggregate | 92.33% | 87.02% | 92.94% | 92.42% |
| Components | 87.61% | 81.93% | 86.28% | 87.94% |
| Interactions | 79.86% | 70.45% | 100% | 79.57% |
| Domain | 97.87% | 95.26% | 100% | 97.82% |
| Waterfall | 99.04% | 100% | 100% | 99.03% |

## Real Browser Evidence

- 21 tests: accessibility 5、outline/chart cancel and reject 12、parity/group/reduced motion 3、performance 1。
- chart、outline、keyboard move 后根顺序一致；G2 Canvas identity 保留，accepted update 不 recreate Chart。
- outline parity 从行正文 62% 横向位置起拖，computed cursor 为 `grab`；真实浏览器提交 revision 并得到相同 post-removal 顺序，不再依赖 grip 精确命中。
- Escape、window blur、pointercancel、无语义目标释放和 dnd-kit cancel 均保持 revision/history/order identity，随后可立即执行新动作。
- fixed anchor、cross-segment move、两项 group child 移出均被 domain 拒绝，console 不包含 label、amount、sourceRef 或 caller exception。
- group create/collapse/expand/ungroup 保持 2 个 source、`¥1,280` aggregate 与原始 contribution order。
- 5 个 axe 场景均无 serious/critical violation；覆盖 ready tree、活动落点/live status、expanded/collapsed disclosure、inline rejection 和 390px mobile group flow。
- mobile 通过 32px 原生 checkbox 无修饰键选择两项；inspector dialog 初始焦点、Tab containment、Escape close 和 trigger focus restore 均通过。
- enabled primary action 的 computed color 为白字绿底；Canvas label 使用深色文字与 3px 白色 halo。
- reduced motion 下 CSS/G2 非必要 duration 为 0，同步落点和 aria 状态仍存在。

## Performance

- Fixture: exactly 200 visible contributions、202 painted G2 bars、nonblank Canvas。
- Clock: one browser `performance.now()` clock。
- Formula: `sorted[ceil(.95*n)-1]` nearest-rank p95。
- Same semantic target: 100 pointermove events，`FinancialChartEditor` root commit delta = 0。
- Samples (ms):

```text
29.900000035762787, 29.100000023841858, 29.899999976158142,
29.400000035762787, 28.30000001192093, 28.69999998807907, 30,
27.899999976158142, 28.099999964237213, 28.5, 29.100000023841858,
28, 27.80000001192093, 27.899999976158142, 28.599999964237213,
28, 28.099999964237213, 28.899999976158142, 29.099999964237213,
28.099999964237213, 30, 29.30000001192093, 27.899999976158142,
29, 27.80000001192093, 28, 29.399999976158142, 27.899999976158142,
28, 28.399999976158142
```

- p95: `30ms`；approved threshold: `<=150ms`。

## Validation Retries

- 第一轮 review 中多个 Playwright/build 进程并发，performance trials 得到 176-290.4ms；这些结果明确标记为争用环境下的非验收运行，不计作通过证据。
- 修复 cross-surface target 后的一次 21-test run 有 7 个失败：6 个由高对比 label halo 把一个短柱的像素簇分成两个造成测试取点误判，另一个 performance p95 为 163.1ms。测试改为按 12 个真实类别带宽聚合像素，15 个相关用例随后全绿；最终 layout-effect/epoch 修复后的 fresh 21-test run p95 为 30.0ms。
- 一次并发 unit run 使既有 seeded property test 超过 5 秒；隔离运行通过，并将全量脚本固定为 `--maxWorkers=4`。整行热区 amendment 后 unit 与 coverage 均 fresh 242/242。
- 最终 engineering re-review 的 stale dnd-kit sensor High 以定向回归复现；active guards 先阻止迟到 command，session epoch remount 再终止 dnd-kit 内部 active/transform。父 harness layout-effect regression 进一步锁定 commit 后、下一输入前的时序，scope invalidation 因此使用 `useLayoutEffect`。回归同时验证 focus 返回原 row、释放后下一次 pointer move 可立即成功；fresh component、unit、coverage 与 21-test Chromium 均通过。
- 整行热区浏览器复验首次使用 `127.0.0.1:5174`，因现有服务仅绑定 `localhost` 得到连接拒绝；切换到页面实际 URL 后同一测试配置 3/3，随后完整 T106 suite 21/21。该失败是地址绑定问题，不计作产品行为失败。

## Not Run

- Firefox/WebKit、React 18/19 matrix、persistence round-trip、SVG/PNG export 与发布：属于 T107/T108，不作为 T106 假证据。
