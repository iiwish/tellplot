# T140 Test Results

## RED / Stop History

| Attempt | Command / signal | Result |
| --- | --- | --- |
| A001-A004 | comparison export、public journey、real SVG axis characterization | expected RED / stop history retained；interval reorder因 T137 Canvas回归被拒绝 |
| A006 | transparent guide-owner implementation | local GREEN，但 independent review认定违反 confirmed helper guide contract；不属于 final implementation |
| A008 | `vitest ... comparison-chart-spec.test.ts` | expected RED：13 tests中2 failed，guide-owner仍存在且helper x/series scale无private key |
| A008 | `vitest ... candidate-tools.test.ts -t "actual runtime"` | expected RED：2/2 failed，env override绕过actual runtime并泄漏fake root |
| A008 | empty comparison browser run | fixture RED：测试错误要求`ready` canvas；合法产品state为`empty`，修正前置条件后2/2 passed |
| A009 | strengthened real SVG matrix/journey with local `getBBox()` coordinates | expected RED：10 failed / 4 passed；8个matrix与2个journey的局部坐标偏差证明旧receipt不足 |
| A009 | symlinked `.ai-platform/evidence` ancestor test | expected RED：old parser跟随symlink并暴露fake-root ENOENT；ancestor containment后3 commands closed/no-leak |
| A009 | docs runtime composition | expected RED：old harness拒绝`compose-runtime`，随后strict fixture暴露TS4111；实现runtime execution与index access修正后GREEN |
| A009 | first final `release:candidate:rehearse` | expected RED：clean copy有意排除evidence，新增ancestor gate找不到base；隔离副本创建空safe gate root后GREEN |

## Final Packet Validation

所有正式 validation 使用 Node `22.20.0` 执行。

| Command | Exit | Receipt |
| --- | ---: | --- |
| `pnpm exec vitest run packages/editor/tests/export/comparison-export.test.ts apps/playground/tests packages/tellplot/tests` | 0 | 9 files / 32 tests passed |
| `pnpm exec vitest run packages/editor/tests/package` | 0 | 9 files / 46 tests passed；candidate tooling 9/9 |
| `pnpm --filter @tellplot/playground build` | 0 | strict TypeScript + production Vite build passed |
| `pnpm build` | 0 | all workspace build targets passed |
| `pnpm test:package` | 0 | publint、attw、ESM/CJS、strict consumer与pack contract passed |
| `pnpm test:framework-matrix` | 0 | Imperative DOM / React 18 / React 19 / Vue 3 real hosts passed |
| `pnpm exec playwright test e2e/comparison-export.spec.ts e2e/live-code-editor.spec.ts e2e/quickstart.spec.ts e2e/showcase.spec.ts --project=chromium` | 0 | 24 tests passed |
| `pnpm release:candidate:audit -- --candidate-version 2.0.0 --evidence-task T140` | 0 | exact candidate manifest/private layers/export map/public delta passed |
| `pnpm release:candidate:artifact -- --candidate-version 2.0.0 --evidence-task T140` | 0 | Node 22.20.0；canonical artifact/manifest rebuilt below T140 |
| same candidate artifact command repeated | 0 | filename、597340 bytes、SHA-256与manifest完全一致 |
| `pnpm release:candidate:rehearse -- --candidate-version 2.0.0 --evidence-task T140` | 0 | 588 files；frozen install、build、package、audit passed |
| `pnpm lint` | 0 | zero warnings |
| `git diff --check` | 0 | no whitespace errors |

## Focused Receipts

- Canonical spec: 13/13 passed；原 paint order、无 guide-owner、唯一 main interval guide owner、所有 point helpers
  `axis:false` / `legend:false`、private namespaced x/y/series scale keys。
- Shared export/runtime suite: 11 files / 85 tests passed，覆盖 comparison export、canonical spec、scene receipt 与
  comparison editor runtime。
- Real comparison browser matrix: 14/14 passed；含2个axis tests、8个bar/column x 2/4-series x sign/zero SVG+PNG
  tests、2/4-series完整public journeys及empty legend on/off。
- Matrix point helpers: 8/8 fixtures逐项验证category-major/series-minor DOM order、series color、对应interval
  category center≤1.5px；axis/legend text被排除，每个helper local `getBBox()`非零。
- Public journeys: expanded group label验证first-member cluster/category center与labelValue endpoint；collapse后
  annotation精确验证2-series source-first tie与4-series stretch的category/value双轴anchor。ViewSpec在expand并改写
  annotation后import，恢复collapsed/original annotation，重导JSON deterministic equivalence。
- Legal empty: legend enabled时2个source labels有可见bbox，disabled时均不存在；SVG sanitizer receipts为unsafe 0、
  external 0、interactive 0，PNG为opaque configured background与nonblank output。
- `pnpm typecheck`: all six workspace targets passed。
- `pnpm test:docs:typescript`: 4 documents / 10 fences passed；preserve narrative的2个fences组成1个真实runtime
  execution，另含1个expected `TS2322`，0 silent skips。
- `pnpm release:architecture`: 62 source files、237 import edges、runtime cycles 0。
- `validate-package-surface.mjs`: public/private package entry surface passed。
- Task-local `diff.patch`: 48 files，164506 bytes；HEAD加T135-T139 reviewed patches构成baseline，isolated replay与
  final T140-owned tree byte-identical。
- Immutable lineage: `git diff --exit-code -- pnpm-lock.yaml .github/workflows scripts/release/audit-release.mjs
  scripts/release/package-artifact.mjs scripts/release/rehearse-source.mjs .ai-platform/evidence/T131` exit 0。

## Candidate Fail-Closed Receipt

- Missing、duplicate、unsupported version/task、absolute path、separator、dot segment、encoded traversal、
  symlinked `.ai-platform/evidence` ancestor与symlinked evidence root统一拒绝。
- Artifact/rehearse忽略`TELLPLOT_CANDIDATE_NODE_VERSION`，只比较actual runtime与`.nvmrc`。
- Symlinked nested `artifacts/` directory、`tarball-manifest.json` leaf与`isolated-source-receipt.md` leaf均在
  build/write前拒绝；sentinel保持不变，stderr不包含fake repository root。
- Clean-source rehearsal只在隔离临时目录创建空的`.ai-platform/evidence/T140` audit gate root；不复制旧evidence，
  receipt仍只写回真实T140 root。

No dependency/lockfile、private version、T141、stage/commit/push/PR、publish/tag/release、registry availability、
public preflight or production command was changed or executed.

## Final Reviews

- Spec compliance: Critical 0 / High 0 / Medium 0 / Low 0，`Clear_For_T140`。
- Bug/code quality: Critical 0 / High 0 / Medium 0 / Low 0，Clear。
- QA acceptance: Critical 0 / High 0 / Medium 0 / Low 0，`Clear_For_T140_QA`。
- Review evidence: `.ai-platform/evidence/T140/review.md`。
