# T137 测试结果

## TDD receipt

### RED

首个 exact focused invocation 在共享机器负载下只输出 Vitest `RUN` 后退出，未产生可归因 assertion，未将其作为 RED 证据。使用同一 focused target 并限制单 worker 重新执行：

```text
pnpm exec vitest run packages/editor/tests/export/comparison-chart-spec.test.ts --pool=forks --maxWorkers=1
```

结果：exit 1，suite 在导入 `../../src/charts/categorical/comparisonSpec` 时因模块不存在而失败，0 tests collected。失败与预期缺失 comparison spec 直接一致，不是 fixture、timeout 或 environment failure。

### GREEN

```text
pnpm exec vitest run packages/editor/tests/export/comparison-chart-spec.test.ts packages/editor/tests/rendering/comparison-group-regions.test.ts packages/editor/tests/export/safe-tooltip.test.ts packages/editor/tests/rendering/g2/chart-runtime.test.ts
```

初始 GREEN 结果：exit 0，4 files passed，28 tests passed。A003 review fix 后复跑为 4 files passed，34 tests passed。

### REFACTOR focused expansion

```text
pnpm exec vitest run packages/editor/tests/export/comparison-chart-spec.test.ts packages/editor/tests/rendering/comparison-group-regions.test.ts packages/editor/tests/export/safe-tooltip.test.ts packages/editor/tests/rendering/g2/chart-runtime.test.ts packages/editor/tests/rendering/g2/comparison-label-transform.test.ts packages/editor/tests/runtime/outline.test.ts packages/editor/tests/runtime/editor.test.ts --pool=forks --maxWorkers=1
```

结果：exit 0，7 files passed，72 tests passed。

## Packet validation

| Command | Result |
| --- | --- |
| focused Vitest command | PASS；4 files / 34 tests |
| `pnpm --filter @tellplot/editor test` | PASS；28 files / 191 tests |
| `pnpm --filter @tellplot/editor typecheck` | PASS；`tsc --noEmit` |
| `pnpm --filter @tellplot/editor build` | PASS；ESM/CJS/DTS build |
| `pnpm exec playwright test e2e/comparison-rendering.spec.ts --project=chromium` | PASS；4/4 |
| `pnpm release:architecture` | PASS；60 source files / 227 import edges / 0 runtime cycles |
| `pnpm lint` | PASS；0 errors / 0 warnings |
| `git diff --check` | PASS |

## Validation history

- Chromium A001 run 1：1/3 passed。实际 label 到 interval 距离 6 px，初始断言为 5 px；Tooltip item text 含 G2 DOM 排版空白。保留真实失败。
- Chromium A001 run 2：3/4 passed；empty legend、positive/negative-domain all-zero 与 live recreation/legend/Tooltip 均通过。matrix 仍因 `#FF00FF` 小连通岛误识别得到 10 px 假阴性，触发 packet retry stop。
- 治理接受测试测量分类并授权 T137-A002：主 label 背景 component 使用 `area >= 20` 且 bbox 宽高至少 4 px，保留真实 Canvas 与 `<= 6` CSS px alignment threshold。
- A002 单格诊断：1/1 passed，四个完整 label 背景距离 `0.5/0.5/0.5/0` px。
- A002 完整 Chromium：4/4 passed，8-cell matrix、empty registry legend、positive/negative-domain all-zero、live registry recreation/source order 全绿。
- lint 首次发现新增 runtime test 的 empty constructor 违反 `no-useless-constructor` / `no-unused-vars` / `no-empty-function`；删除无用途 constructor 后复跑 PASS。产品代码未改变。

## T137-A003 review-fix receipt

独立首轮 bug/code-quality review 报告 Critical 0 / High 0 / Medium 3：auto density 使用 category count、合法 placement 未映射、Canvas nearest-any pairing 可产生假阳性。另指出 equal-absolute tie 尚无显式 fixture。

```text
pnpm exec vitest run packages/editor/tests/export/comparison-chart-spec.test.ts --pool=forks --maxWorkers=1
```

A003 RED：exit 1，12 tests 中 3 failed、9 passed。失败分别为 positive auto value expected `bottom` but received `top`、group inside expected `bottom` but received `top`、`shouldShowComparisonValueLabels is not a function`。equal-absolute tie test在现有严格 `>` 实现上通过。

A003 GREEN 后：comparison canonical test 12/12 passed；packet focused 4 files / 34 tests passed。完整 Chromium 4/4 passed，使用主 label component、每 cluster 精确 component count、source-color order 与 sorted one-to-one center pairing，不使用 nearest-any 或 mock component data。

## Regression and boundary receipt

- Editor full suite 包含 scalar categorical、waterfall、export/spec/runtime regression，28 files / 191 tests 全绿。
- comparison interval 数量、key、encode、dodge、domain/padding/palette、helper mark isolation、equal-absolute source-first annotation tie、placement、auto-density 与 empty source 均由 canonical spec tests 固定。
- stale render 与 stale forceFit continuation 由 runtime tests 固定；label-only reuse 与 registry reorder recreation 由 editor runtime tests 固定。
- architecture test 与 `release:architecture` 证明 comparison spec/labels/receipt/geometry 未进入 public package entry；raw G2 allowlist 只新增 `comparisonSpec.ts`。
