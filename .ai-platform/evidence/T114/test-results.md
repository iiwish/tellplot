# T114 Test Results

## RED

| Command | Exit | Result |
| --- | ---: | --- |
| `pnpm exec vitest run packages/editor/tests/components/categoryAxis.test.ts packages/editor/tests/components/chartPointer.test.ts packages/editor/tests/components/group-actions.test.ts` | 1 | 新 categoryAxis module 缺失；4 个新 chartPointer adapter tests 因函数缺失失败。既有 tests 21/21 通过。 |

## GREEN And Refactor

| Command | Exit | Result |
| --- | ---: | --- |
| 同一 scoped command | 0 | 3 files、34 tests 全绿；legacy horizontal 与 group action expectations 未修改。 |
| `pnpm test:unit` | 0 | 38 files、370 tests 全绿。 |
| `pnpm test:coverage` | 0 | 38 files、370 tests 全绿；全部既有 configured thresholds 通过。 |

新 `categoryAxis.ts` coverage 为 statements 98.71%、branches 95.78%、functions 100%、lines 98.66%。
categorical 维持 98.90/100/100/98.88，domain 维持 98.09/95.61/100/98.05，waterfall 维持
97.56/96.15/100/97.54。

## Final Validation

| Command | Exit | Signal |
| --- | ---: | --- |
| `pnpm typecheck` | 0 | editor 与 playground strict TypeScript 通过。 |
| `pnpm build` | 0 | editor ESM/CJS/DTS/CSS 与 playground production build 通过。 |
| `pnpm lint` | 0 | ESLint 0 warning。 |
| `pnpm format:check` | 0 | 全仓 Prettier 通过。 |
| `python3 $HOME/.codex/skills/ai-delivery-governor/scripts/validate_delivery_artifacts.py --root . --feature-id 004-categorical-chart-validation --task-id T114 --strict` | 0 | 最终 strict artifact validation 通过。 |
| `git diff --check` | 0 | 无 whitespace error。 |

## Boundary Checks

- `packages/editor/src/index.ts` 未由 T114 修改；构建声明不导出 category-axis primitives。
- `WaterfallCanvas.tsx`、`group-actions.test.ts`、categorical source/spec/tests 和 dependencies 未修改。
- `moveTargets.ts` 保持原实现，证明 semantic command target 已经与显示轴无关。
