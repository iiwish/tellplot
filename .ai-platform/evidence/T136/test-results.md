# T136 Test Results

## TDD

| Phase | Command | Result |
| --- | --- | --- |
| RED | `pnpm exec vitest run packages/core/tests/categorical packages/core/tests/domain/commands.test.ts packages/core/tests/domain/history.test.ts packages/core/tests/domain/property-sequences.test.ts packages/core/tests/editorStore.test.ts` | Expected fail: 4/9 files，10/85 tests；9 missing projector，1 missing selection callback semantics；无 timeout/fixture failure |
| GREEN | 同上 | Pass；A001 focused green，后续最终 9 files / 100 tests |
| REFACTOR | `pnpm --filter @tellplot/core test && pnpm --filter @tellplot/core typecheck && pnpm release:architecture` | 最终各 gate 单独/组合通过；A001 高负载期间曾有 property tests 固定 15 秒 timeout，未改 timeout/断言 |

## A002 Review Regressions

| Command | Result |
| --- | --- |
| `pnpm exec vitest run packages/core/tests/categorical/projectCategoricalComparison.test.ts`（root/nested source 与 view TOCTOU tests，修复前） | Expected fail；输出可包含未验证 non-finite value |
| 同一 focused 文件（descriptor snapshot、二次 validation 与 late trap 修复后） | Pass，13 tests |
| `pnpm exec vitest run packages/editor/tests/package/stable-release.test.ts --maxWorkers=1 --no-file-parallelism` | Pass，1 file / 14 tests；未改 timeout/断言 |

## Final Validation

| Command | Result |
| --- | --- |
| `pnpm exec vitest run packages/core/tests/categorical packages/core/tests/domain/commands.test.ts packages/core/tests/domain/history.test.ts packages/core/tests/domain/property-sequences.test.ts packages/core/tests/editorStore.test.ts` | Pass，9 files / 100 tests |
| `pnpm --filter @tellplot/core test` | Pass，29 files / 314 tests |
| `pnpm test:coverage` | Pass，62 files / 513 tests；categorical S/B/F/L `96.79/95.31/100/96.70`，domain `97.84/95.82/99.39/97.79` |
| `pnpm --filter @tellplot/core typecheck` | Pass |
| `pnpm --filter @tellplot/core build` | Pass，ESM/CJS/DTS |
| `pnpm --filter @tellplot/core test:package` | Pass，publint、ATTW、public API |
| `node scripts/release/validate-package-surface.mjs` | Pass，core/editor/react/vue/tellplot 与公开 subpaths |
| `pnpm test:package` | Pass，public `tellplot@1.0.0` package contract |
| `pnpm release:architecture` | Pass，56 source files，212 import edges，0 runtime cycles |
| `pnpm lint` | Pass，0 warnings |
| `git diff --check` | Pass |

## Recovery History

- A001 `pnpm test:coverage`: 61/62 files、504/505 tests passed；唯一失败为既有 stable-release audit 固定 15 秒
  timeout。低并发复演仍只在同一用例 timeout。
- A002 首次 coverage 在 510 tests 全通过后因新增 snapshot 分支将 categorical threshold 降到阈值以下；未改
  coverage threshold，通过真实 hostile/malformed comparison tests 补足覆盖。
- A002 第二次 coverage 在 512 tests 全通过后仅既有 domain aggregate branch threshold 未达 95%；补充真实
  schema 3 malformed matrix validation cases后，最终原始 coverage command 通过。
