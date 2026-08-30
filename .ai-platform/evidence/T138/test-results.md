# T138 Test Results

## A001 TDD 与 gates

- RED：focused command exit 1，命中新 private receipt、runtime invalidation等预期缺口。
- 首轮 Chromium：0/5，保留真实 scene/range/resize诊断历史；修复后 A001 focused 57/57、editor full
  205/205、typecheck、build、Chromium packet suite、architecture、package surface、lint、diff-check均曾 PASS。
- A001 scalar回归曾为 editor full 4 failures；将 comparison completeness/geometry invalidation限定为 comparison后
  修复，未作为 baseline exception处理。

## A002 RED

命令：
`pnpm exec vitest run packages/editor/tests/rendering/g2/chart-runtime.test.ts packages/editor/tests/runtime/chart-surface.test.ts --pool=forks --maxWorkers=1`

结果：2 files / 36 tests，4 expected failures：

- render+resize仍发布可重建 authoritative receipt；
- forceFit reject被报告为 render failure；
- `runtime.dismissTooltip` 不存在；
- normal invalidation仍走 abort而非 idle cleanup。

## A002 GREEN 与 browser history

- focused runtime+surface：36/36 PASS。
- `pnpm --filter @tellplot/editor typecheck`：PASS。
- 首轮补强 Chromium曾因并发 preview server/build race与 lifecycle blocking出现 10 failures / 1 pass；随后单独
  column series仍失败，确认非纯环境问题。
- 修正 authority/ResizeObserver/preview lifecycle后：单独 column each-series PASS；单独 marquee PASS；完整 packet
  Chromium一次达到 21 pass / 7 fail。新增 each-series、marquee、Tooltip均 PASS，interaction-cancel全部 PASS；
  余下6个 all-zero probes与一个中英文 Undo locator failure。Undo locator已做等价 locale修正。

## A003 RED/GREEN/STOP

- RED：`pnpm exec vitest run packages/editor/tests/runtime/chart-surface.test.ts --pool=forks --maxWorkers=1`
  为 16 tests / 1 expected failure；`preview(null)` restore实际 `authoritative=false`。
- GREEN：runtime+surface focused 37/37 PASS；`pnpm --filter @tellplot/editor typecheck` PASS。
- 单一 browser gate：
  `pnpm exec playwright test e2e/comparison-interaction.spec.ts --project=chromium --grep 'column all-positive' --reporter=list`
  结果 0/1；第二个 32px hit probe等待 direct `dragging` 超时。相同断言重复失败，按 A003授权立即 STOP。
- 因 stop condition，未运行完整 Chromium、editor full/build、architecture、package surface、lint或最终
  `git diff --check`；不得把 A001历史通过结果表示为当前最终 gates。

## A004 settlement-synchronized browser STOP

- 保留 A003 unit：authoritative null-preview restore settlement前 direct interaction blocked；settlement后 receipt与
  `ready`恢复。
- probe Escape teardown只新增等待公开 `stage[data-render-state="ready"]`，随后等待既有双 RAF；未增加 fixed
  sleep，未修改命中点、±15/±17边界、容差或 Playwright timeout。这是同步公开 settlement合同，不是弱化产品合同。
- 单一 browser command：
  `pnpm exec playwright test e2e/comparison-interaction.spec.ts --project=chromium --grep 'column all-positive' --reporter=list`
  结果 0/1；仍在第二个 32px hit probe等待 direct `dragging`超时。
- 依 A004授权“同断言仍失败立即 stop”，未运行完整 Chromium或任何后续 packet gates。

## A005 preview ownership RED/GREEN/STOP

- RED：`pnpm exec vitest run packages/editor/tests/runtime/chart-surface.test.ts --pool=forks --maxWorkers=1`
  结果 18 tests / 1 expected failure；bare comparison `preview(null)` 把 request count从1增至2。
- GREEN：同一 command 18/18 PASS。覆盖 bare null no-op、non-null preview后一次 authoritative null restore、
  update/destroy清 ownership，以及 scalar bare null仍 authoritative request。
- 单一 browser：
  `pnpm exec playwright test e2e/comparison-interaction.spec.ts --project=chromium --grep 'column all-positive' --reporter=list`
  结果 0/1；仍在相同第二个 32px hit probe等待 `dragging`超时。
- 依 A005明确授权，同一 browser断言失败后立即 STOP；未运行 packet focused、editor full/typecheck/build、完整
  Chromium、architecture、package surface、lint或 diff-check。

## A006 raster math RED/GREEN/SCOPE STOP

- RED：
  `pnpm exec playwright test e2e/comparison-interaction.spec.ts --project=chromium --grep 'inclusive raster' --reporter=list`
  结果 0/1。inclusive `[2..4]`, scale 2, offset 10实际旧值 `{min:14,max:18,center:16}`，预期 outer
  pixel-cell `{min:14,max:20,center:17}`。
- GREEN + original browser：
  `pnpm exec playwright test e2e/comparison-interaction.spec.ts --project=chromium --grep 'inclusive raster|column all-positive' --reporter=list`
  结果 helper 1 PASS，column case 1 FAIL。原第二个 hit `dragging`断言已通过；失败前移到后续首个 padding
  `selecting`断言。
- A006只授权E2E pixel-cell换算，禁止产品 geometry/hit修改。新失败超出精确范围，故未运行完整 packet gates，
  保留真实结果并 STOP。

## A007 outside expectation与完整 gates STOP

- 单一 browser：`column all-positive renderer band exposes only the local all-zero 32px target` PASS。
- packet focused：5 files / 65 tests PASS。
- editor full：29 files / 213 tests PASS。
- editor typecheck：PASS。
- editor build：PASS，ESM/CJS/DTS。
- 完整 Chromium comparison+cancel：25/29 PASS，4 FAIL：
  - bar local all-negative hit未进入 `dragging`；
  - bar local all-positive hit未进入 `dragging`；
  - bar global all-zero hit未进入 `dragging`；
  - resize cancellation mutation/history断言通过，但viewport resize后 `rootOrder()`读到 `[]`而非
    `['alpha','beta']`。
- 因 A007规定“同一/新断言失败则stop”，未运行 architecture、package surface、lint或最终 diff-check。

## A008 source sequence RED/GREEN与定向 STOP

- RED：
  `pnpm exec playwright test e2e/comparison-interaction.spec.ts --project=chromium --grep 'source-axis order' --reporter=list`
  结果0/1；area sort把centers `[100,200]`反转为`[200,100]`。
- GREEN采用category-axis center顺序，且narrow `rootOrder()`通过公开 Outline overlay读取可见authoritative tree。
- 定向命令：
  `pnpm exec playwright test e2e/comparison-interaction.spec.ts --project=chromium --grep 'bar all-|bar global|resize invalidates' --reporter=list`
  结果1/4：resize cancellation PASS；bar local negative、bar local positive、bar global zero的hit均未进入
  `dragging`。
- 依A008“4 cases失败stop”，未复跑完整 Chromium或任何后续 gates。

## A009 定向诊断、RED/GREEN与最终 gates

- 单跑诊断：
  `pnpm exec playwright test e2e/comparison-interaction.spec.ts --project=chromium --grep 'bar all-positive renderer band' --reporter=list`
  首轮 0/1；distance 1 hit通过，distance 31 expected `dragging` / received `selecting`，point `(483, 402)`。
- Private transpose fixture：
  `pnpm exec vitest run packages/editor/tests/rendering/g2/comparison-scene-receipt.test.ts`
  1 file / 10 tests PASS。真实 reversed band + transpose + layout offsets精确得到 pointer baseline `118..150`、
  category band `33..68`，因此未修改 product receipt geometry。
- E2E baseline helper RED：
  `pnpm exec playwright test e2e/comparison-interaction.spec.ts --project=chromium --grep 'recovers the transposed zero baseline' --reporter=list`
  0/1 expected failure；bar positive预期 `450`，旧 estimator实际 `451`。
- Helper GREEN：同命令 1/1 PASS。原 bar all-positive随后 1/1 PASS；bar local negative/positive + bar global zero
  定向命令 3/3 PASS。
- Packet focused：5 files / 66 tests PASS。
- Editor full：29 files / 214 tests PASS。
- Editor typecheck：PASS。
- Editor build：PASS，ESM/CJS/DTS。
- 完整 Chromium comparison+cancel：31/31 PASS。
- `pnpm release:architecture`：PASS，61 source files / 230 import edges / 0 runtime cycles。
- `node scripts/release/validate-package-surface.mjs`：PASS，8个 package/subpath contracts。
- `pnpm lint`：PASS，0 warnings。
- `git diff --check`：PASS。
- `python3 <ai-delivery-governor-skill>/scripts/validate_delivery_artifacts.py --root . --task-id T138`：
  PASS，0 errors / 14 warnings；warnings均为 validator跨其他 feature目录探测同名 T138 packet未找到，权威
  feature 015 packet与本 task evidence可用。

## A010 review fix RED/GREEN与最终 gates

- RED：
  `pnpm exec vitest run packages/editor/tests/runtime/chart-surface.test.ts packages/editor/tests/rendering/g2/chart-runtime.test.ts --pool=forks --maxWorkers=1`
  2 files / 42 tests，2 expected failures：active comparison drag的invalid-target null restore实际
  `authoritative=true`；同步初始size `100x80`后首次delivery `120x80`未触发forceFit。same-size grid保持通过。
- GREEN首轮新增断言通过；既有forceFit-failure fixture因jsdom隐式`0x0`被新合同正确识别为真实resize而多一次
  settlement。fixture显式声明其原合同初始`100x100`后，同一focused 42/42 PASS；未放宽forceFit failure语义。
- Browser定向：
  `pnpm exec playwright test e2e/comparison-interaction.spec.ts --project=chromium --grep 'valid to invalid to valid' --reporter=list`
  1/1 PASS。valid→invalid→valid drag保持active，最终revision 1；一次Undo恢复原顺序并耗尽Undo history。
- Packet focused：5 files / 69 tests PASS。
- Editor full首轮216/217；stable-release audit发现A009 evidence中的个人绝对路径。将记录改为可移植
  `<ai-delivery-governor-skill>`与repo-relative root后复跑29 files / 217 tests PASS。
- Editor typecheck：PASS。
- Editor build：PASS，ESM/CJS/DTS。
- 完整 Chromium comparison+cancel：32/32 PASS。
- `pnpm release:architecture`：PASS，61 source files / 230 import edges / 0 runtime cycles。
- `node scripts/release/validate-package-surface.mjs`：PASS，8个 package/subpath contracts。
- `pnpm lint`：PASS，0 warnings。
- `git diff --check`：PASS。

## Scope receipt

未修改 dependency/lockfile/package version/public entry，未执行 remote Git/stage/commit/release/publish；T139-T141
未实施。A010 worker handoff 时未自行推进 T138 status；最终 review integration 仅推进 T138 状态并生成 T139
packet，未实施 T139 runtime/tests。

## Final review results

- Spec compliance review：Critical 0 / High 0 / Medium 0，PASS。
- Bug/code-quality review：Critical 0 / High 0 / Medium 0，PASS。
- QA acceptance review：Critical 0 / High 0 / Medium 0，PASS。
- Final gate：无 unresolved blocking finding；A001-A010 历史与 stop records 保留，A010 fresh validation 作为当前
  authoritative 结果。T138 已进入 `Needs_Review`，不等同用户 `Accepted`。
