# T115 Test Results

## RED

| Command / gate | Exit | Result |
| --- | ---: | --- |
| 新 categorical component/export scoped tests | 1 | 缺少 `CategoricalCanvas`、editor chart dispatch 与 categorical export；符合 packet 预期 RED。 |
| 首次 categorical grouping browser flow | 1 | shared evaluator 返回 `ITEM_LOCKED`；补 regression 后做最小 chart-family policy 修复。 |
| 首次 categorical 200-item pointer path | 1 | preview rerender 替换 canvas 后 active overlay 消失；修复 capture restoration/document fallback。 |
| 首次 full `pnpm test:e2e` | 1 | 126 passed、6 failed；仅两个旧 import assertions 在三引擎仍期待 `UNSUPPORTED_SCHEMA_VERSION`，按 accepted T112 current-schema contract 改为 `SOURCE_CONFLICT` 后全绿。 |

## GREEN And Refactor

| Command | Exit | Result |
| --- | ---: | --- |
| `pnpm exec vitest run packages/editor/tests/components packages/editor/tests/export packages/editor/tests/package` | 0 | 22 files、170 tests passed。 |
| `pnpm test:unit` | 0 | 41 files、380 tests passed。 |
| `pnpm test:coverage` | 0 | 41 files、380 tests passed；所有 configured thresholds 通过。 |

Coverage summary：statements 85.29%（3433/4025）、branches 79.88%（2672/3345）、functions 87.25%
（575/659）、lines 85.48%（3369/3941）。`src/categorical` 为 98.90/100/100/98.88，T114 category-axis
保持 98.71/95.78/100/98.66。

## Final Validation

| Command | Exit | Signal |
| --- | ---: | --- |
| `pnpm typecheck` | 0 | editor 与 playground strict TypeScript 通过。 |
| `pnpm lint` | 0 | ESLint 0 warning。 |
| `pnpm format:check` | 0 | 全仓 Prettier 通过。 |
| `pnpm build` | 0 | editor ESM/CJS/DTS/CSS 与 playground production build 通过；仅既有 G2 large-chunk warning。 |
| `pnpm test:package` | 0 | publint、attw、ESM、CJS、types consumer 全部通过。 |
| `pnpm test:react-matrix` | 0 | React 18.3.1 与 19.2.7 均构建；真实 G2 canvas 87,405 painted pixels；clean unmount。 |
| `pnpm test:e2e` | 0 | Chromium/Firefox/WebKit 共 132 tests passed，1.8m。 |
| `pnpm test:a11y` | 0 | 三引擎共 27 tests passed；axe 无 serious/critical violation。 |
| `pnpm test:performance` | 0 | 2 tests passed；waterfall p95 66.10ms，categorical p95 65.50ms，预算 150ms，均 30 samples，same-target root commit delta 0。 |
| `python3 $HOME/.codex/skills/ai-delivery-governor/scripts/validate_delivery_artifacts.py --root . --feature-id 004-categorical-chart-validation --task-id T115 --strict` | 0 | strict task artifact validation 通过。 |
| 同一 validator 的 feature-level `--strict` | 0 | 004 全 feature artifacts 通过。 |
| `git apply --reverse --check .ai-platform/evidence/T115/diff.patch` | 0 | task-only patch 可从当前 T115 worktree 反向应用。 |
| `git diff --check` | 0 | 无 whitespace error。 |

`pnpm test:package` 曾在与 `pnpm build` 并发执行时因 build 清理 `dist` 产生一次环境型 false failure；按照
validation 隔离规则串行重跑后稳定通过，未弱化 assertion 或跳过 gate。

## Browser Evidence

- Column 与 bar 各识别 8 个真实 G2 mark bands；sign sequence 均为 4 positive、3 negative、1 positive。
- 初始 canvas/outline/summary 为同一 8 项 `rootOrder`；等价 X/Y direct drag 后前三项均为
  `consumer, enterprise, services`，undo/redo revision 与顺序一致。
- collapsed group `订阅业务` 金额为 2,140、source count 为 2；screen、outline、summary、SVG 与 PNG 只显示
  group，不显示两个 child labels，并保持 group 位于 `专业服务` 之前。
- PNG width > 500、height > 300、painted pixels > 500；SVG/PNG 均非空；SVG sanitizer assertion 排除
  executable nodes、remote href、`sourceRef` 与 metadata。
- empty 显示 0 项 summary；invalid 只显示 stable code/path 且 canvas count 为 0。

## Performance Attachments

- `metrics/performance-samples.json`
- `metrics/categorical-performance-samples.json`

## Boundary Checks

- `packages/editor/src/index.ts` 与 generated declaration 中没有 `G2Spec`、`Chart` 或 `CategoricalCanvas` 公共导出。
- T115 changed paths 搜索未发现 `any`、`@ts-ignore` 或 `@ts-expect-error`。
- runtime logs 只含稳定 callback/render code/path，不包含 label、amount、`sourceRef` 或 metadata。
- dependencies、lockfile、domain/categorical/T114 primitives/waterfall runtime 未由 T115 修改；唯一 read-only
  偏差为 `groupSelection.ts` 的 categorical leaf baseline correction，详见 summary Scope Audit。
