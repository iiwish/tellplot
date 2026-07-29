# T116 Test Results

## TDD Receipts

| Phase | Command / signal | Exit | Result |
| --- | --- | ---: | --- |
| Characterization | accepted component/export 8-file suite | 0 | 8 files、40 tests passed before source changes |
| RED | `vitest run packages/editor/tests/rendering packages/editor/tests/package/architecture-boundary.test.ts` | 1 | 3 files failed because runtime modules/ownership paths were absent and raw G2 lifecycle still lived in consumers |
| GREEN | runtime + state/pointer suites | 0 | 59 tests passed after WaterfallCanvas migration |
| GREEN | categorical runtime/component suites | 0 | 56 tests passed after CategoricalCanvas migration |
| GREEN | export runtime/export suites | 0 | 28 tests passed after SVG/PNG migration |
| REFACTOR | chart paths/runtime/export/axis/architecture suites | 0 | 96 tests passed; obsolete wrappers and ownership paths removed |
| Review RED | partial event registration failure | 1 | expected `off` once, received 0; reproduced deterministic cleanup defect |
| Review GREEN | runtime/export/architecture | 0 | 3 files、18 tests passed after incremental registration tracking fix |

## Final Unit And Coverage

| Command | Exit | Result |
| --- | ---: | --- |
| `pnpm exec vitest run packages/editor/tests/rendering packages/editor/tests/components packages/editor/tests/export packages/editor/tests/package` | 0 | 25 files、182 tests passed |
| `pnpm exec vitest run packages/editor/tests/waterfall packages/editor/tests/categorical` | 0 | 7 files、44 tests passed |
| `pnpm test:unit` | 0 | 44 files、393 tests passed |
| `pnpm test:coverage` | 0 | 44 files、393 tests passed; all configured thresholds passed |

Coverage summary: statements 86.09% (3405/3955), branches 80.91% (2671/3301), functions 88.36%
(585/662), lines 86.27% (3343/3875). `src/rendering/g2` 为
98.07/98.36/100/98.07；`charts/categorical` 为 98.90/100/100/98.88；`charts/waterfall` 为
98.05/98.11/100/98.02。

## Release Candidate Gates

| Command | Exit | Signal |
| --- | ---: | --- |
| `pnpm format:check` | 0 | Prettier clean |
| `pnpm lint` | 0 | ESLint 0 warning |
| `pnpm typecheck` | 0 | editor/playground strict TypeScript passed |
| `pnpm build` | 0 | ESM/CJS/DTS/CSS and playground build passed; existing G2 chunk warning only |
| `pnpm test:package` | 0 | publint, attw, ESM, CJS and type consumer passed |
| `pnpm test:react-matrix` | 0 | React 18.3.1 and 19.2.7; 87,405 painted pixels; clean unmount |
| `pnpm test:e2e` | 0 | current Chromium/Firefox/WebKit 132/132 passed |
| `pnpm test:a11y` | 0 | 27/27 passed; no serious/critical axe violation |
| `pnpm test:browser-previous` under Node 22.20.0 | 0 | Playwright 1.60 current-previous 132/132 and WebKit 18.4 44/44 passed |
| final runtime/architecture rerun | 0 | 3 files, 18 tests passed after review fix and evidence generation |
| strict task artifact validator | 0 | T116 packet/evidence passed with 0 error and 0 warning |
| strict feature artifact validator | 0 | feature 004 passed with 0 error and 0 warning |
| `git diff --check` | 0 | no whitespace error |

`pnpm test:browser-previous` 首次在 Node 24.15.0 被脚本的 `.nvmrc` precondition 正确拒绝，
未进入浏览器测试。改用 `mise exec node@22.20.0 -- pnpm test:browser-previous` 后原 gate
通过；没有修改脚本或运行时断言。

## Performance

| Run | Waterfall p95 | Categorical p95 | Budget | Result |
| --- | ---: | ---: | ---: | --- |
| clean release-candidate run | 68.30ms | 69.50ms | 150ms | passed, 30 samples each, root commit delta 0 |
| high-load diagnostic run 1 | 204.20ms | 132.70ms | 150ms | waterfall-only environment failure |
| high-load diagnostic run 2 | 129.90ms | 179.50ms | 150ms | categorical-only environment failure |

两次 diagnostic 发生在 current/previous browser 长矩阵后，系统 load average 约 7-9，且失败在两个
等价 workflow 间交替，不呈现 chart runtime 回归。未改动 150ms 预算、sample 数或 assertion。
实现完成后的 clean exact command 已通过；review 修复只改变 event registration 抛错路径，
成功初始化/指针路径的执行语义不变。

## Visual And Export Checks

- Fresh screenshots: `waterfall-ready.png`, `waterfall-grouped.png`, `column-ready.png`,
  `column-grouped.png`, `bar-ready.png`, `bar-grouped.png`.
- Fresh exports: waterfall/column/bar grouped SVG and PNG.
- Painted pixels are 61,783-78,114 across all ready/grouped canvases.
- Column/bar ready, grouped and SVG/PNG SHA-256 values are byte-identical to accepted T115 evidence.
- SVG sanitizer scan found no executable nodes, remote href, `sourceRef` or metadata.

## Architecture And Privacy Checks

- Architecture boundary test proves target chart paths exist, obsolete paths are absent, and components/export/index
  have no raw G2 runtime import.
- Generated declarations and `index.ts` contain no `G2Spec`, G2 `Chart`, renderer callback or runtime handle.
- Task-only source scan contains no `any`, `@ts-ignore`, `@ts-expect-error`, public registry or second renderer.
- Projection/spec file comparison against the external baseline shows import-path/ownership changes only.
- Final `diff.patch` excludes T112-T115 and T116 evidence files and passes reverse-apply verification.
- Final task-only patch contains 50 files、1,537 insertions、1,016 deletions；SHA-256 为
  `2fe4ac34415e75444a5aab8d33327f4027bdf66bcb55aaa5f07a690f778fd8eb`。
