# T139 Test Results

## RED receipt

命令：
`pnpm exec vitest run packages/editor/tests/runtime/comparison-editor.test.ts packages/editor/tests/runtime/editor.test.ts packages/react/tests packages/vue/tests --pool=forks --maxWorkers=1`

结果：4 files / 50 tests，46 PASS / 4 expected FAIL。

- Outline comparison row仍显示 scalar source count，而不是 series count。
- Inspector缺少 category/collapsed/expanded/multi-selection exact semantics。
- summary缺少完整 source registry 与 narrative DFS markers。
- disabled focus key回到 root，而不是首个可见 Outline row。

RED 来自预期的 T139 Workbench/focus 缺口；不是 fixture、package version、timeout、environment 或 predecessor failure。

## A001 failure and deviation history

1. `pnpm typecheck && pnpm test:framework-matrix`：typecheck PASS；matrix FAIL。Imperative registry assertion只接受
   English comma，实际合法 locale copy 使用中文 punctuation。
2. retry 1 `pnpm test:framework-matrix`：FAIL。同一 assertion仍错误要求 punctuation 后有空格。
3. retry 2 `pnpm test:framework-matrix`：Imperative、React 18、React 19 PASS；Vue 3等待 editor ready timeout。
   新 Vue fixture使用 deep `ref`，对 reactive Proxy执行 `structuredClone`。
4. retry budget 已耗尽后仍执行了越界 retry 3；改用 `shallowRef` 后四宿主 PASS。这是 execution-policy deviation，
   不作为最终唯一 matrix evidence。

## A002 recovery history

- exact focused：4 files / 54 tests PASS。
- workspace typecheck：PASS。
- editor full：30 files / 221 tests PASS；editor typecheck PASS。
- React：6/6 PASS；React typecheck PASS。
- Vue：3/3 PASS；Vue typecheck PASS。
- workspace build：PASS。
- framework matrix clean replay：Imperative、React 18、React 19、Vue 3 PASS。
- Chromium packet首轮：31/32；新增 comparison a11y fixture等待错误 status copy。
- 唯一定向 selector修复后重跑：31/32；responsive host只有 Outline static panel，测试未使用 existing Inspector panel
  activation helper。依 A002 stop policy 停止。

## A003 recovery history

- responsive helper支持 visible complementary/tabpanel/dialog、中英文 Inspector tab 与 toolbar trigger。
- 单 comparison a11y case：0/1。dialog与 category/series/state assertions已可达；annotation assertion错误使用
  container `textContent` 读取 textarea value。依 A003 stop policy 停止。

## A004 recovery history

- annotation改为 semantic textbox `toHaveValue`；Pinned/Highlighted/Locked 与 source-order series断言保留。
- 单 comparison a11y case：1/1 PASS。
- exact focused：4 files / 54 tests PASS。
- workspace typecheck：PASS。
- editor full：30 files / 221 tests PASS；editor typecheck PASS。
- React：6/6 PASS；React typecheck PASS。
- Vue：3/3 PASS；Vue typecheck PASS。
- workspace build：PASS。
- framework matrix：四宿主 PASS。
- Chromium packet：32/32 PASS，包含 comparison Workbench/summary/empty registry/axe、direct interaction与 responsive
  layout。
- `pnpm lint`：FAIL，仅 focused test 的 never-reassigned binding 与 unused initial locator assignment。依 A004 stop
  policy 停止。

## A005 authoritative final gates

- `pnpm lint`：PASS，0 warnings。
- `git diff --check`：PASS。
- `pnpm release:architecture`：PASS，61 source files / 231 import edges / 0 runtime cycles。
- `node scripts/release/validate-package-surface.mjs`：PASS，8 个 package/subpath contracts。
- `pnpm exec vitest run packages/editor/tests/runtime/comparison-editor.test.ts`：1 file / 4 tests PASS。

上述 A005 gate验证纯机械 lint cleanup。A004 已在同一产品/adapter/E2E 当前实现上完成其余完整 gates；A005 未修改
runtime、adapter、matrix、E2E 或 public surface。

## Final functional receipts

- Outline：一个 category/group 一个 treeitem；显示 series count；无 series child、无 fabricated total。
- Inspector：category、collapsed group、expanded group、multi-selection 四态全部通过；source-order values与
  formatter一致；multi-selection无 primary/cross-category value且保留合法 group action。
- Summary：nonempty与empty source均保留完整 registry；structural entries按 narrative DFS；annotation、emphasis、
  pin、lock由 node ID 连接且不读取 Canvas color/geometry。
- Focus：disabled/readOnly/hidden responsive target依次回退 Outline、toolbar、heading、root；只保留
  connected/visible/enabled/focusable target。
- Updates：callback-only、presentation、source、generation、invalid state、panel/mode/readOnly 与 history behavior由
  focused/editor regression覆盖；React same-render与Vue same-flush pair、view/defaultView双向 transition通过。
- Browser：keyboard、aria-live、focus visibility、responsive Inspector dialog、empty registry、reduced-motion与 axe
  serious/critical 0 assertions通过。
- Matrix：legacy v1 move/undo+SVG保留；real tarball/G2 v3在四宿主完成 move/undo、registry reorder、
  palette/legend/summary repaint、four-series update与clean unmount。未运行或宣称 v3 SVG。

## Artifact validation

- `python3 $HOME/.codex/skills/ai-delivery-governor/scripts/validate_delivery_artifacts.py --root . --task-id T139`：
  PASS，0 errors / 14 warnings。warnings均为 validator跨其他 feature目录探测同名 T139 packet未找到；权威
  feature 015 packet与本 task evidence三件套存在且可读。

## Scope receipt

未修改 dependency/lockfile/package version/public surface/T138 geometry；未实施 T140/T141；未执行 remote Git、
stage/commit/release/publish。T139 task status未修改，等待三层 review。

## A006-A009 history boundary

A010 preflight 时 current evidence 仍只记录到 A005，未包含 A006-A009 的逐命令输出；A010 保留 cumulative current
tree，不虚构缺失 receipts。orchestrator 对 A009 最后失败的权威分类是：Playground
`LiveChartEditor.applyDraft()` 在宿主 parser 层拒绝 invalid config，公开 config textarea 不会调用 TellPlot
`editor.update`，因此 browser case 不可能借此进入 stable invalid；这不是 product runtime failure。

## A010 TDD and focused recovery

1. RED：
   `pnpm exec vitest run packages/editor/tests/runtime/comparison-editor.test.ts --pool=forks --maxWorkers=1`
   为 1 file / 7 tests，6 PASS / 1 expected FAIL。ordinary invalid update 已进入 stable invalid、callback assertions成立，
   但 focus 落到 `.tp-outline-trigger`，不是 comparison-only approved root fallback。hostile update 已证明 view、selection、
   focus 与 callback 原子保留。
2. GREEN：同一 comparison unit 为 1 file / 7 tests PASS。最小 runtime change 只让 comparison invalid lifecycle 跳过
   无有效 panel 可打开的 Outline/Inspector toolbar triggers；v1/v2 不进入该 predicate。
3. focused unit + Chromium 首跑：comparison unit 7/7 PASS；responsive case FAIL 于最终 root assertion。原因是先隐藏的旧
   heading 在合法 presentation render 中被替换，新 heading 恢复为可见，不是 product assertion failure。
4. Chromium retry：持续 CSS 在独立 browser task 中隐藏 heading，但浏览器在 Apply 前已把 active focus blur 到 body，
   root assertion仍 FAIL。fixture 改为在 native input→RAF 之后、document-level programmatic Apply 之前的同一 task 注入
   CSS，保留真实 focus-key capture。
5. Chromium focused final：
   `pnpm exec playwright test e2e/container-responsive.spec.ts --project=chromium --grep "comparison focus fallback"`
   为 1/1 PASS。wide→compact、narrow overlay→compact、hidden toolbar trigger、Outline→heading、empty source 与手工隐藏
   heading 后合法 presentation update→root 全部保留；不可达 invalid textarea末段已删除。

上述 browser fixture经历两次失败后才 clean replay，超过 packet对一次尝试的保守 retry节奏；失败历史在此完整保留，
不以最终 focused PASS覆盖。

## A010 framework matrix stop

1. `pnpm test:framework-matrix` 首跑：React/Vue package unit PASS，real packed package Imperative DOM PASS；React 18 legacy
   `runScenario()` 等待 revision 1 timeout。fixture 在 comparison扩展后错误地让 legacy render继续使用 immutable initial
   view；定向改为共享 host-controlled `hostView`。
2. `pnpm test:framework-matrix` retry：React/Vue package unit PASS，Imperative DOM 的 legacy 与 v3 phases PASS；React 18
   到 v3 controlled standalone annotation receipt时 FAIL，`standaloneView.annotations.alpha` 为 `undefined`。当前
   `waitForRegistry(['Current', 'Plan'])` 在 registry 已满足时立即返回，不能证明同 registry 下的 controlled view/annotation
   已结算；这是 matrix fixture synchronization blocker，尚未证实 product runtime bug。
3. A010 在第二次 matrix failure 后按 packet停止。React 19、Vue 3 matrix，以及 workspace typecheck、editor/adapter full、
   build、完整 Chromium packet、lint、diff-check、architecture、package surface 和 artifact validator均未继续执行。

当前 authoritative status：comparison unit 7/7 PASS；responsive focus 1/1 PASS；framework matrix FAIL/STOP；不可进入
三层 review。

## A011 framework matrix recovery

1. RED reproduction：`pnpm test:framework-matrix`。React/Vue package unit通过，Imperative legacy/v3通过；React 18
   在 runner exact assertion读取到 `standaloneView.annotations.alpha === undefined`，与 A010 stop receipt一致。
2. 最小 GREEN：Imperative/React/Vue consumer新增公开 `getView()` predicate polling。receipt精确包含
   `schemaVersion`、`datasetId`、`chartType`、`revision`、`rootOrder`、groups、collapse、pin、annotations与emphasis，
   连续两个 animation frame匹配才返回。comparison defaultView seed、defaultView-only current-view preservation、
   default→controlled、host-controlled annotation与controlled→uncontrolled seed均等待各自expected state；无fixed sleep。
3. 首次 matrix retry：Imperative与React 18各自scenario通过，但runner跨宿主deep equality发现React comparison
   `callbackCommand.commandId` 为 `tp-direct-2`，Imperative为 `tp-direct-4`。原因是React fixture的comparison `key`
   重建EditorInstance，重置command identity；Imperative/Vue均保持同实例跨generation update。
4. 唯一fixture retry删除React remount `key`，不修改runner assertion或runtime。`pnpm test:framework-matrix`随后
   Imperative DOM、React 18.3.1、React 19.2.7、Vue 3.5.27全部PASS。
5. full clean replay中的独立 `pnpm test:framework-matrix` 再次四宿主PASS。legacy v1 move/undo+SVG保留；v3完成
   2-series move/undo、defaultView/controlled/uncontrolled transitions、registry reorder、4-series expansion与clean unmount。
   v3 SVG仍未调用并留给T140。

runner继续保持强断言：initial 2-series Canvas必须相对先前v1 appearance取得新的稳定signature；reorder必须相对
2-series取得新的稳定signature；4-series必须相对reorder再取得新的稳定signature。各阶段同时断言source-order
registry/Inspector ordinal与expected palette colors在真实Canvas上有非零pixel receipt，未改runtime、未弱化runner。

## A011 authoritative clean replay

- focused：`pnpm exec vitest run packages/editor/tests/runtime/comparison-editor.test.ts packages/editor/tests/runtime/editor.test.ts packages/react/tests packages/vue/tests --pool=forks --maxWorkers=1`：4 files / 57 tests PASS。
- editor full：`pnpm --filter @tellplot/editor test`：30 files / 224 tests PASS。
- React：`pnpm --filter @tellplot/react test`：1 file / 6 tests PASS。
- Vue：`pnpm --filter @tellplot/vue test`：1 file / 3 tests PASS。
- framework：`pnpm test:framework-matrix`：Imperative DOM、React 18、React 19、Vue 3全部PASS。
- typecheck：`pnpm typecheck`：core/editor/react/vue/tellplot/playground全部PASS。
- build：`pnpm build`：所有workspace build PASS。
- Chromium：`pnpm exec playwright test e2e/comparison-interaction.spec.ts e2e/accessibility.spec.ts e2e/container-responsive.spec.ts --project=chromium`：33/33 PASS。
- lint：`pnpm lint`：PASS，0 warnings。
- whitespace：`git diff --check`：PASS。
- architecture：`pnpm release:architecture`：PASS，61 source files / 231 import edges / 0 runtime cycles。
- package surface：`node scripts/release/validate-package-surface.mjs`：PASS，8 package/subpath contracts。
- artifact validator：`python3 $HOME/.codex/skills/ai-delivery-governor/scripts/validate_delivery_artifacts.py --root . --task-id T139`：PASS，0 errors / 14 warnings；warnings均为validator探测其他feature目录的同名packet，feature 015 authoritative packet与evidence三件套完整。

## A011 scope receipt

本次只修改三个 packet-owned framework matrix consumer fixtures与T139 evidence。未修改runtime、React/Vue adapter source、
T138 geometry、T140 export/docs/playground/package、dependency/lockfile/version/public surface/T131；未执行remote Git、
stage、commit、push、PR、publish、tag、release或production promotion。T139 status保持不变，可进入三层review。

## A012 focus-transition RED/GREEN

1. fixture calibration：首次新增 v3→v2 case 时，v2 fixture 带入不支持的 `appearance.legend`，editor 正确进入 stable
   invalid。该输出不是 product RED；移除 invalid presentation 后再取得 authoritative RED。
2. RED：
   `pnpm exec vitest run packages/editor/tests/runtime/comparison-editor.test.ts --pool=forks --maxWorkers=1`
   为 1 file / 8 tests，7 PASS / 1 expected FAIL。有效 v3→v2 update 后旧 comparison group focus key 消失，实际焦点落
   editor root，期望按 comparison transition policy 落首个可见 Outline `north`。
3. 首次 GREEN 运行中，v3→v2 主断言已通过；后续 legacy control assertion 仍停在 `north`。诊断为 v2 grouped view
   处于 expanded 状态，`north` key 并未消失。fixture 改为 collapsed group，确保 steady-state v2 key 确实失效，未改变
   runtime assertion 强度。
4. GREEN：同一 focused command 为 1 file / 8 tests PASS。单次 update 捕获
   `comparisonFocusLifecycle || before=v3 || after=v3`，queued restore 使用该不可变 policy；render scheduling 后才采用
   after generation。v3→v2 回退 Outline，下一次纯 v2 update 按 legacy 落 root。

## A012 patch replay receipt

- 旧 `diff.patch` 的 `git apply --stat` 报 `corrupt patch at ...:138`，不能作为最终 evidence。
- source baseline 为最早 `/tmp/tellplot-t139-baseline-A001` 的 45 个 exact packet-owned paths。机械 temporary Git tree
  仅以这些 paths 和 baseline 不存在的 `packages/editor/tests/runtime/comparison-editor.test.ts` 比较 final current tree。
- `git apply --stat .ai-platform/evidence/T139/diff.patch`：PASS；14 files changed，2485 insertions / 170 deletions。
- isolated baseline tree：`git apply --check` 与正向 `git apply` PASS；45 baseline paths 加新增 focused test 逐文件
  `cmp` final current tree PASS。
- 同一 isolated tree：`git apply --reverse --check` 与 reverse apply PASS；45 paths 逐文件 `cmp` baseline PASS，新增
  focused test 不存在。共享 worktree 未执行 apply、reset、restore 或 checkout。

## A012 authoritative final gates

- exact focused：4 files / 58 tests PASS。
- editor full：首跑仅因本 evidence 的个人绝对路径触发 stable release audit；改为 `$HOME` 后 clean replay
  30 files / 225 tests PASS。
- React：1 file / 6 tests PASS；Vue：1 file / 3 tests PASS。
- framework matrix：Imperative DOM、React 18.3.1、React 19.2.7、Vue 3.5.27全部PASS；legacy v1 SVG保留，v3
  move/undo、controlled transitions、registry reorder、palette/legend、4-series与clean unmount保持，v3 SVG仍未调用。
- `pnpm typecheck`：core/editor/react/vue/tellplot/playground全部PASS。
- `pnpm build`：所有workspace build PASS。
- Chromium exact packet：33/33 PASS，包含 comparison interaction、Workbench/a11y 与 responsive focus fallback。
- `pnpm lint`：PASS，0 warnings。
- `git diff --check`：PASS。
- `pnpm release:architecture`：PASS，61 source files / 231 import edges / 0 runtime cycles。
- `node scripts/release/validate-package-surface.mjs`：PASS，8 package/subpath contracts。
- `python3 $HOME/.codex/skills/ai-delivery-governor/scripts/validate_delivery_artifacts.py --root . --task-id T139`：
  PASS，0 errors / 14 warnings；warnings仅为 validator 探测其他 feature 目录的同名 T139 packet，feature 015 的
  authoritative packet 与 evidence 三件套存在且可读。

## A012 scope receipt

本次产品 delta 仅修改 packet-owned `domEditor.ts` 与 comparison focused test，evidence 机械重建并补充真实历史。未修改
React/Vue adapter source、T138 receipt/geometry/pointer lifecycle、T140 export/docs/playground/package、dependency、lockfile、
version、manifest、public surface、T131 或 task status；未执行 remote Git、stage、commit、push、PR、publish、tag、release
或 production promotion。comparison invalid/hostile、v2→v3 与既有 v1/v2 steady-state tests继续通过。

## A013 queued focus timing RED/GREEN

1. RED：在既有 v3→v2 case 中删除第一次 microtask flush，连续执行 `editor.update(v3→valid v2)` 与真实 v2
   height/presentation update，再统一 flush。新增 host external button 对照。
2. `pnpm exec vitest run packages/editor/tests/runtime/comparison-editor.test.ts --pool=forks --maxWorkers=1`：
   1 file / 9 tests，8 PASS / 1 expected FAIL。连续 update 后旧 v3 target 已 detach，第二次 `restoreWorkbenchState(null)`
   递增 version并取消第一次 pending fallback，最终 `document.activeElement` 为 `body`，而不是首个可见 Outline `north`。
3. 第一次定向实现后 focused 为 8/9：pending closure 将同步 render 后仍在 editor 内的旧合法 focus误判为 host 显式接管，
   readOnly fallback保留在 `west`，没有执行首个 Outline fallback。
4. 第二次定向实现后 focused 为 8/9：将每次 comparison restore都创建 pending token，纯 v3 presentation update错误落
   CSS-visible toolbar trigger，而不是既有 root receipt。
5. 最终 GREEN：同一 focused command为 1 file / 9 tests PASS。private pending token只在 comparison→legacy restore创建；
   `state:null` 且 active为 `body`/document root时不取消，editor外 connected target则显式取消；editor内 target不当作外部
   接管。queued closure一次性清 token并尊重 version/top-modal/destroyed guard；destroy显式 version++/clear。
6. control receipts：连续 transition落 `north`；随后的 steady v2 collapse仍按 legacy落 root；外部 button在第二次
   update/flush后保持 active。既有 `keeps the foreground modal authoritative when a background editor rerenders` 随 editor
   full通过，证明 top modal不会被 pending workbench restore抢焦点。

## A013 authoritative final gates

- exact focused：
  `pnpm exec vitest run packages/editor/tests/runtime/comparison-editor.test.ts packages/editor/tests/runtime/editor.test.ts packages/react/tests packages/vue/tests`：4 files / 59 tests PASS。
- editor full：`pnpm --filter @tellplot/editor test`：30 files / 226 tests PASS。
- React：`pnpm --filter @tellplot/react test`：1 file / 6 tests PASS。
- Vue：`pnpm --filter @tellplot/vue test`：1 file / 3 tests PASS。
- framework matrix：`pnpm test:framework-matrix`：Imperative DOM、React 18.3.1、React 19.2.7、Vue 3.5.27全部PASS；
  legacy v1 move/undo+SVG保留，v3 move/undo、controlled transitions、registry reorder、palette/legend、4-series与clean
  unmount保持，v3 SVG仍未调用。
- `pnpm typecheck`：core/editor/react/vue/tellplot/playground全部PASS。
- `pnpm build`：所有workspace build PASS。
- Chromium exact packet：
  `pnpm exec playwright test e2e/comparison-interaction.spec.ts e2e/accessibility.spec.ts e2e/container-responsive.spec.ts --project=chromium`：33/33 PASS。
- `pnpm lint`：PASS，0 warnings。
- `git diff --check`：PASS。
- `pnpm release:architecture`：PASS，61 source files / 231 import edges / 0 runtime cycles。
- `node scripts/release/validate-package-surface.mjs`：PASS，8 package/subpath contracts。
- `python3 $HOME/.codex/skills/ai-delivery-governor/scripts/validate_delivery_artifacts.py --root . --task-id T139`：
  PASS，0 errors / 14 warnings；warnings仅为validator探测其他feature目录的同名T139 packet，feature 015权威packet与
  evidence三件套完整。

## A013 patch replay receipt

- `diff.patch` 从最早 `/tmp/tellplot-t139-baseline-A001` 的45个 exact packet-owned paths 与最终 current tree机械重建；
  baseline不存在的 focused test以 `/dev/null` 新增，evidence自身不纳入patch。
- `git apply --stat .ai-platform/evidence/T139/diff.patch`：PASS；14 files changed，2541 insertions / 170 deletions。
- isolated baseline tree：syntax、`git apply --check`、forward apply与45 baseline paths + focused test逐文件 `cmp`
  current tree全部PASS。
- 同一 isolated tree：`git apply --reverse --check`、reverse apply与45 paths逐文件 `cmp` baseline全部PASS；新增focused
  test不存在。共享worktree未执行apply、reset、restore或checkout。
- post-evidence smoke一度误将 baseline→final patch直接对final shared worktree运行 `git apply --check`，因此按设计报告
  hunks already applied/新文件已存在；未执行apply、未修改worktree。patch适用性的权威receipt仍是上述isolated baseline
  forward/reverse/cmp，随后`git diff --check`与artifact validator继续PASS。

## A013 scope receipt

产品delta仅修改packet-owned `packages/editor/src/editor/domEditor.ts` 与 focused comparison test，并机械更新T139 evidence。
未修改React/Vue adapter source、T138 receipt/geometry/pointer lifecycle、T140 export/docs/playground/package、dependency、
lockfile、version、manifest、public surface、T131或task status；未执行remote Git、stage、commit、push、PR、publish、tag、
release或production promotion。当前tree可进入最终三层复审。

## A014 immutable comparison-policy RED/GREEN

1. RED：
   `pnpm exec vitest run packages/editor/tests/runtime/comparison-editor.test.ts --pool=forks --maxWorkers=1`
   为 1 file / 16 tests，12 PASS / 4 expected FAIL。以下连续同步 update 均未 flush 第一次 restore microtask：
   pure v3 presentation→pure v3 presentation、v2 focused target→v3→v3 presentation、v3 focused group→ordinary
   invalid→valid v2，以及 pure v3 pending window 中插入 hostile atomic rejection。四场景最终均落 `body`，而不是稳定
   focus key或首个可见 Outline fallback。
2. RED controls：pure v3、v2→v3 与 v3→invalid→v2 三类 pending window 中，host 把 focus 移到 editor 外 connected
   button 后都保持外部焦点；每类同时覆盖不再 update 的 queued-closure guard与后续 null-state update cancellation。
   steady v2 连续 updates保持 legacy `body` timing。两类 control在 RED 时已通过。
3. 最小 GREEN：`pendingComparisonFocusRestoreVersion` 不再检查 render 后 current schema；所有
   `useComparisonFocus === true && state !== null` 的 queued restore 创建 version token。随后 null-state restore 在 active
   为 `body`/document root或 editor 内部时保留 token，只在 connected external target 存在时取消。queued closure一次性
   清 token并继续服从 external-focus、version、top-modal 与 destroyed guards。
4. focused 首次 GREEN为 15/16；唯一失败是既有 presentation matrix 仍断言 root。该 fixture在 narrow layout 中的旧
   Outline key已失效，approved fallback顺序实际命中可见 `toolbar-outline`。将错误 expectation更正为现有 contract后，
   同一 focused command为 16/16 PASS；未修改 runtime fallback顺序或 v1/v2 semantics。
5. hostile option getter仍在 render前原子拒绝，不创建或取消 pending token；后续合法 v3 presentation render恢复原稳定
   `west` key。既有 foreground top-modal authority test随 editor full通过，destroy仍 version++并显式清 token。

## A014 authoritative final gates

- exact focused：
  `pnpm exec vitest run packages/editor/tests/runtime/comparison-editor.test.ts packages/editor/tests/runtime/editor.test.ts packages/react/tests packages/vue/tests`：4 files / 66 tests PASS。
- editor full：`pnpm --filter @tellplot/editor test`：30 files / 233 tests PASS。
- React：`pnpm --filter @tellplot/react test`：1 file / 6 tests PASS。
- Vue：`pnpm --filter @tellplot/vue test`：1 file / 3 tests PASS。
- framework matrix：`pnpm test:framework-matrix`：Imperative DOM、React 18.3.1、React 19.2.7、Vue 3.5.27全部PASS；
  legacy v1 move/undo+SVG保留，v3 move/undo、controlled transitions、registry reorder、palette/legend、4-series与clean
  unmount保持，v3 SVG仍未调用。
- `pnpm typecheck`：core/editor/react/vue/tellplot/playground全部PASS。
- `pnpm build`：所有workspace build PASS。
- Chromium exact packet：
  `pnpm exec playwright test e2e/comparison-interaction.spec.ts e2e/accessibility.spec.ts e2e/container-responsive.spec.ts --project=chromium`：33/33 PASS。
- `pnpm lint`：PASS，0 warnings。
- `git diff --check`：PASS。
- `pnpm release:architecture`：PASS，61 source files / 231 import edges / 0 runtime cycles。
- `node scripts/release/validate-package-surface.mjs`：PASS，8 package/subpath contracts。
- `python3 $HOME/.codex/skills/ai-delivery-governor/scripts/validate_delivery_artifacts.py --root . --task-id T139`：
  PASS，0 errors / 14 warnings；warnings仅为validator探测其他feature目录的同名T139 packet，feature 015权威packet与
  evidence三件套完整。

## A014 patch replay receipt

- `diff.patch` 从最早 `/tmp/tellplot-t139-baseline-A001` 的45个 exact packet-owned paths 与最终 current tree机械重建；
  baseline不存在的 focused test以 `/dev/null` 新增，evidence自身不纳入patch。
- `git apply --stat .ai-platform/evidence/T139/diff.patch`：PASS；14 files changed，2689 insertions / 170 deletions。
- isolated baseline tree：`git apply --check`、forward apply与45 baseline paths + focused test逐文件 `cmp` current tree
  全部PASS。
- 同一 isolated tree：`git apply --reverse --check`、reverse apply与45 paths逐文件 `cmp` baseline全部PASS；新增focused
  test不存在。共享worktree未执行apply、reset、restore或checkout。

## A014 scope receipt

产品delta仅修改packet-owned `packages/editor/src/editor/domEditor.ts` 与 focused comparison test，并机械更新T139 evidence。
未修改React/Vue adapter source、T138 receipt/geometry/pointer lifecycle、T140 export/docs/playground/package、dependency、
lockfile、version、manifest、public surface、T131或task status；未执行remote Git、stage、commit、push、PR、publish、tag、
release或production promotion。当前tree可进入最终三层复审。

## A014 final three-layer review integration

- Spec compliance final：Critical 0 / High 0 / Medium 0；`Clear`。
- Bug/code-quality final：Critical 0 / High 0 / Medium 0；`Clear`。
- QA acceptance final：Critical 0 / High 0 / Medium 0；`Clear`。
- Review integration未重跑、替换或隐藏 A001-A014 的任何命令结果；authoritative validation仍为上方 A014 fresh gates，
  包括 focused 66/66、editor 233/233、React 6/6、Vue 3/3、四宿主 matrix、workspace typecheck/build、Chromium
  33/33、lint、architecture、package surface、artifact validator与`git diff --check`全部通过。
- T139可进入`Needs_Review`，但不代表用户`Accepted`。T140仅因该串行前置和三层review均满足而可转为`Ready`；
  T141仍由T140阻塞。
