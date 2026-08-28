# T139 Execution Summary

## 结论

T139-A014 已闭合 comparison queued focus restore 的最后同源时序问题。pending token 由该次 restore 捕获的 immutable
comparison policy 决定，不再读取 render 后的 current schema；pure v3、v2→v3、v3→invalid→v2 与
comparison→legacy 连续同步 update 均可把稳定 focus key 或 approved fallback 恢复到最终 DOM，不会落到 `body`。
若用户主动把焦点移到 editor 外的 connected control，pending restore 立即取消并保留外部焦点。steady v2 仍使用原有
legacy timing，hostile atomic rejection 不创建或取消错误 token，version、top-modal 与 destroy guards 保持有效。
当前树已按 T139 packet 完成 clean replay，所有 required gates 通过，可进入最终三层复审；task status 保持不变。

本 evidence 保留 T139-A001 的 retry-budget deviation、T139-A002-A005 的受控恢复记录、A010 的全部失败/停止历史、
A011 首次 retry 发现的 React remount parity 失败，以及 A012 的 fixture calibration、RED/GREEN 与 gate retry。
A010 preflight 时 evidence 文件尚未整合 A006-A009 的逐命令记录；A010 不重写或虚构未观察到的输出。其 cumulative
current-tree changes 被保留，A009 最后一个已由 orchestrator 确认为 Playground host parser fixture boundary 的失败
也在下文与 `test-results.md` 中明确承接。A014 追加在 A013 之后，不覆盖任何既有 attempt history。

## Task-local baseline

- 执行前已读取 `AGENTS.md`、constitution、产品 SSOT、TDR-025、feature spec/plan/contracts/tasks/analysis、
  T139 packet 与 T138 final evidence。
- preflight 确认 T139 为 `Ready`，T138 为已有 final evidence 的 `Needs_Review` predecessor；T140-T141 保持
  `Draft` 且未实施。
- pre-edit worktree 已包含已审核的 T135-T138 与 governance 变更；T139 未覆盖或回滚这些 predecessor changes。
- 最早 allowed-files snapshot 保存在 `/tmp/tellplot-t139-baseline-A001`，包含 45 个 exact packet-owned paths。
  `diff.patch` 由该 snapshot 与最终 current tree 机械生成，不拼接 attempt patch。
- task-local diff 覆盖 14 个 implementation/test/matrix/E2E paths；baseline 中未修改的文件不进入 patch，baseline 不存在的
  `packages/editor/tests/runtime/comparison-editor.test.ts` 以 `/dev/null` 新增，evidence 三件套不纳入自身 patch。
- patch 已在隔离 temporary Git tree 中从 baseline 正向 apply，并逐文件 `cmp` final current tree；随后 reverse apply，
  逐文件 `cmp` 最早 baseline 且确认新增文件消失。共享 worktree 未执行 apply、reset 或 restore。

## TDD

- RED 使用 focused editor/React/Vue command 加 deterministic single-worker flags：4 个新增 comparison cases 按预期
  全部失败，既有 46 个 cases 全绿。失败分别命中 Outline 仍显示 scalar source count、Inspector 缺少四态、summary
  缺少 source registry/DFS，以及 disabled focus target 回到 root 而非 approved fallback。
- GREEN 以同一 focused surface 验证 comparison Workbench；A014 最终 focused 为 16/16，packet exact focused 为
  4 files / 66 tests PASS。
- REFACTOR 由 editor full 233/233、React 6/6、Vue 3/3、workspace typecheck 与 build 验证；
  comparison state 未复制到 framework adapters。

## Workbench semantics

- Outline 对 comparison 仅产生 category/group treeitem，紧凑值显示 source registry 的 series 数量，不生成 series
  child、不显示虚构总额；既有 keyboard、group 与 drag command 仍以 category/group 为唯一节点。
- Inspector 精确区分 category、collapsed group、expanded group 与 multi-selection。category/collapsed group 按
  source order 展示格式化 series values；expanded group 只展示结构、来源、annotation/emphasis/locked state；
  multi-selection 无 fabricated primary、无跨 category value，仍保留合法 group action。
- locked state 同时考虑 projected datum、selection source 与 pinned source 的交集以及 readOnly，因此 expanded group
  不依赖未投影 aggregate 即可表达结构锁定语义。
- comparison summary 先朗读 visible cluster/series count，再无条件朗读完整 source-ordered registry，随后按 narrative
  DFS 输出 expanded structural entry、children、collapsed aggregate/category，并通过 node ID 拼接 annotation、
  emphasis、pin 与 lock；empty source 在 legend off 时仍保留完整 registry。

## Focus and updates

- focus retention 仅接受 connected、visible、enabled、非 hidden/inert/aria-hidden 且当前 responsive panel 可用的 target。
  target 失效时依次回退到首个可见 Outline row、首个可用 toolbar control、chart heading、editor root。
- chart heading 使用稳定 private focus key；readOnly、panel visibility、Inspector mode 与 responsive overlay 不改变
  selection ownership，也不会把焦点留在 detached/disabled control。
- generation transition 的 focus policy 由单次 update 的 before/after generation 决定并捕获到 queued restore，完成后才
  采用 after generation。v3→v2 或 invalid-v3→v2 不会过早切到 legacy；随后的纯 v2 update 仍使用原有 root fallback。
- private pending restore token 由每次 queued restore 的 immutable comparison policy 与非空 focus state 创建，覆盖
  pure v3、任一 generation transition 与中间 invalid state。后续 `state:null` restore 若没有 editor 外 connected active
  target，则视为旧 target detach 的中间状态并保留 token；editor 外 connected focus target 视为用户显式接管并取消 token。
  queued closure 一次性清理 pending，且继续服从 version、top modal 与 destroyed guard；destroy 显式递增 version 并清
  token，不增加全局 focus listener 或 public state。
- callback-only update 不重复 render；source/config 与 compatible controlled view 仍由 imperative runtime 原子处理。
  React 在同一 render、Vue 在同一 reactive flush 提交 comparison pair；view/defaultView 双向 controlled-mode transition
  通过 adapter tests，callbacks 始终读取最新 props/emits。

## Framework matrix

- legacy v1 controlled move/undo 与既有 SVG scenario 保留。
- real packed `tellplot` + G2 5.4.8 在 Imperative DOM、React 18.3.1、React 19.2.7 与 Vue 3.5.27 中验证 v3
  controlled pair、move/undo、source registry reorder、palette/legend/summary repaint、four-series live update 与 clean
  unmount。
- v3 SVG 未调用、未声明通过，明确留给 T140。
- locale-aware matrix assertion允许既有中文/英文 registry punctuation；Vue consumer使用 `shallowRef` 保持 fixture
  config 为 structured-cloneable plain nested data。这两处均是 packet-owned matrix fixture fix。
- A011 不再用已满足的 registry 文本代表 view settlement；三类 consumer 对 schema/dataset/chart/revision/rootOrder/
  groups/collapse/pin/annotation/emphasis 的完整 receipt 连续两帧匹配。React 保持同一个 editor instance 跨 generation
  更新，因此 legacy 与 comparison 的 command identity/history 生命周期和 Imperative/Vue 一致。
- runner 对 initial 2-series、registry reorder 与 4-series 分别要求新的稳定 Canvas pixel signature，并逐阶段验证
  source-order legend/Inspector ordinal 与全部 palette colors 实际出现在 Canvas；没有相对 v1 signature 的后两阶段假阳性。

## A001 execution-policy deviation

- 首轮 matrix 在中文 registry punctuation assertion 失败；retry 1 仍错误假定 separator 后存在空格。
- retry 2 中 Imperative/React 18/React 19 通过，Vue fixture 因对 reactive Proxy 执行 `structuredClone` 而未进入
  ready state。
- retry budget 此时已耗尽，但 A001 在改用 `shallowRef` 后又执行一次 matrix 并通过四宿主。这是明确的
  execution-policy deviation；失败输出与越界事实保留，不以该结果替代后续 clean replay。

## A002-A005 controlled recovery

- A002 从当前树重新运行 focused/typecheck/editor/adapters/build/matrix。matrix 四宿主 clean replay 通过；Chromium
  首轮因 fixture status selector 使用错误 canonical copy 停止，定向修复后又暴露 responsive Inspector selector
  未使用 panel helper，依授权停止。
- A003 扩展既有 `activateInspectorPanel`，统一解析 visible complementary/tabpanel/dialog，并支持中英文 tab 与
  toolbar trigger。单 case 成功打开 responsive dialog，但 annotation 用 `textContent` 读取 form value 而失败，依授权
  停止。
- A004 保持 assertion 强度，改用 Inspector 内 semantic textbox 的 `toHaveValue`，同时继续断言 series order、
  Pinned/Highlighted/Locked 与 axe。单 case、完整功能 gates 与 32-case Chromium suite 通过；lint 发现 focused test
  的两处纯机械声明问题，依授权停止。
- A005 仅把 never-reassigned binding 改为 `const` 并删除未使用初始 locator assignment。lint、diff-check、
  architecture、package surface 与 comparison focused 全部通过；没有产品行为改动。

## A006-A010 review recovery

- A006-A008 的 cumulative current tree 收紧了 comparison-only focus lifecycle、CSS/responsive visibility、layout
  transition fallback、collapsed-group pin semantics、update matrix与真实 framework receipts；A010 未回滚这些变更。
  A010 preflight 可用 evidence 尚未包含这些尝试的逐命令失败历史，权威细节仍保留在 orchestrator messages，未在此
  反向推断或伪造。
- A009 最后失败断言尝试通过 Playground config textarea 让 editor 进入 stable invalid。Playground
  `LiveChartEditor.applyDraft()` 在宿主 parser 层拒绝 invalid config，不调用 TellPlot `editor.update`；orchestrator 已将
  其确认为不可达 fixture boundary，不是 product runtime bug。
- A010 在 imperative unit 中先把 comparison focus 放到将失效的 `west` Outline target。新增 assertion 真实 RED：
  ordinary invalid 后焦点落到 invalid toolbar trigger，而不是 approved root fallback。runtime 仅在 comparison
  invalid lifecycle 中排除无法打开有效 panel 的 Outline/Inspector triggers；hostile option inspection 继续原子保留
  view、selection、focus 且不伪造 callback。GREEN 为 comparison unit 7/7。
- A010 从 Chromium case 删除不可达 invalid textarea 段；保留 wide→compact、narrow overlay→compact、CSS-hidden
  trigger、Outline→heading、empty source 与 root fallback。root fixture 必须在同一 document task 内注入持续 CSS hide
  并触发合法 presentation Apply，避免 heading replacement 或浏览器提前 blur 使 receipt 失真；最终该 case 1/1。
- A010 framework matrix 首次失败揭示 React legacy fixture 错把非 comparison `activeView` 固定为 initial view；修正为
  existing host-controlled view。第二次运行 Imperative 全绿，但 React 18 在 comparison standalone controlled annotation
  receipt 读取到旧 view。诊断为 `waitForRegistry()` 在 registry 文本已满足时提前返回，并未等待同 registry 下的
  annotation/view update settlement；未证实 product runtime bug。retry budget 到此耗尽，停止后续 edits/gates。

## A011 matrix recovery

- A010 的真实 React 18 annotation failure直接作为 RED。A011 为 Imperative、React 与 Vue consumer 增加公开 `getView()`
  stable predicate polling；每个 mode step 都等待自己的完整 ViewSpec expected result，未加入 fixed sleep，也未改弱 runner。
- 首次 GREEN matrix继续到跨宿主 parity 时发现 React comparison通过 `key` 重建 editor，导致 comparison undo command ID
  从 1 重新计数，而 Imperative/Vue 在同实例中为 4。该 fixture 不等价于既有 adapter lifecycle。
- 唯一 retry 删除 React comparison remount key；同一 instance通过公开 `update` 跨 v1→v3，随后四宿主 matrix clean PASS。
  再次完整 clean replay仍四宿主 PASS，未修改 runtime、adapter source或 public API。

## A012 focus-transition and evidence recovery

- pre-RED fixture 首次包含 v2 不支持的 `appearance.legend`，因此只进入 stable invalid；该次不作为 product RED。移除
  invalid presentation 后，同一 focused case 真实 RED：v3 focused group key 在有效 v2 ungrouped view 中消失，焦点落到
  editor root，而不是首个可见 Outline row。
- 最小 runtime change 将 `useComparisonFocus` 作为一次 render/restore 的不可变参数传入 queued microtask。第一次 GREEN
  已证明 v3→v2 主断言恢复为 Outline；control branch 最初使用 expanded group，`north` key 仍存在，不足以验证 legacy
  fallback。改为 collapsed group 使 key 确实消失后，focused 8/8 PASS，纯 v2 update 按既有行为落 root。
- editor full 首跑的唯一失败来自 T139 evidence 内个人绝对路径触发 stable release audit；机械改为 `$HOME` 后
  30 files / 225 tests PASS。该修复只影响 evidence 可移植性。
- 原 `diff.patch` 在 `git apply --stat` 报 corrupt。A012 从最早 45-path snapshot 重新机械生成单一 patch：14 files，
  2485 insertions / 170 deletions；隔离 tree 的 syntax、forward apply/current cmp、reverse apply/baseline cmp 全部 PASS。

## A013 queued focus timing recovery

- authoritative RED 在 A012 v3→v2 test 中不 flush microtask，连续执行有效 v3→v2 update 与真实 v2 height/presentation
  update；1 file / 9 tests 为 8 PASS / 1 expected FAIL，焦点最终落 `body` 而非首个可见 Outline `north`。同组新增
  external button 对照，要求 host 显式接管焦点时 pending fallback 必须取消。
- 最小 runtime change 增加 private `pendingComparisonFocusRestoreVersion`。第一次校准把同步 render 后仍在 editor 内的
  focus 误判为显式接管，导致 readOnly fallback 留在旧 row；第二次校准把纯 v3 presentation restore 也纳入 pending，导致
  既有 presentation root assertion 回归。最终实现只把 editor 外 connected target 作为显式接管，并只在 current schema
  已是 legacy 而单次 immutable policy仍为 comparison时创建 pending token。
- focused clean GREEN 为 9/9。连续 transition 落 `north`；随后 steady v2 collapse 仍按 legacy 落 root；外部 button
  在第二次 update/flush 后保持 active。既有 foreground top-modal authority test 随 editor full 226/226 继续通过。
- `diff.patch` 再次从最早 45-path snapshot 机械生成完整 single patch：14 files，2541 insertions / 170 deletions；隔离 tree
  的 syntax、forward apply/current cmp、reverse apply/baseline cmp 全部 PASS。

## A014 immutable comparison-policy timing recovery

- 参数化 focused RED 不 flush 第一次 restore microtask，并连续执行同步 updates。pure v3→pure v3、v2→v3→v3、
  v3→ordinary invalid→valid v2 与 pending window 中的 hostile atomic rejection 真实失败并落到 `body`；external-focus
  三场景同时覆盖立即 queued closure 与后续 null-state update cancellation，steady v2 legacy control 在 RED 时已通过，
  证明 fixture 可区分 host 接管与 comparison timing bug。
- 最小 runtime change 删除 current-schema token qualification；`useComparisonFocus && state !== null` 直接创建 pending
  version token。后续 null-state render 仅在 editor 外 connected active target 存在时取消；queued closure对所有 pending
  comparison policy 执行相同 external-focus、version、top-modal 与 destroyed guards，并一次性清 token。
- 既有 presentation matrix 的 root assertion 不符合 approved fallback contract：其 narrow layout 下旧 Outline target
  detach 后，首个可用且可见 control 是 `toolbar-outline`。A014 将 assertion 改为该 approved fallback，没有把旧 bug固化。
- focused GREEN 为 16/16；exact focused为 4 files / 66 tests；editor full 233/233，完整 framework/adapter/workspace/
  Chromium/quality gates 全绿。patch 从 A001 最早 45-path snapshot机械重建为 14 files、2689 insertions / 170 deletions，
  隔离 baseline 的 forward/current cmp 与 reverse/baseline cmp 全部 PASS。

## Final review integration

- Spec compliance：Critical 0 / High 0 / Medium 0，结论 `Clear`。A014 的 comparison-only focus policy、完整
  Workbench/Inspector/summary/update contract、T138 边界与 v1/v2 不变性均符合已批准 spec、TDR-025、plan 和 T139 packet。
- Bug/code quality：Critical 0 / High 0 / Medium 0，结论 `Clear`。最终 review 未发现未解决的 runtime、focus timing、
  adapter ownership、callback/session/history、framework settlement 或 evidence replay 缺陷。
- QA acceptance：Critical 0 / High 0 / Medium 0，结论 `Clear`。A014 authoritative gates、真实 Chromium、四宿主 matrix、
  a11y/focus receipts 与 task-local patch replay 足以支持 T139 进入 `Needs_Review`。
- 三层 final review 只关闭 T139 execution gate，不代表用户 `Accepted`，也不授权 T140 之外的 package、release、remote
  或 published 1.0 lineage 变更。A001-A014 的全部失败、重试、stop、recovery 与执行偏差历史继续保留。

## Changed files

- Runtime：`packages/editor/src/editor/chartSurface.ts`、`domEditor.ts`、`messages.ts`、`outline.ts`。
- Focused tests：`packages/editor/tests/runtime/comparison-editor.test.ts`。
- Adapter tests：`packages/react/tests/ChartEditor.test.tsx`、`packages/vue/tests/ChartEditor.test.ts`。
- Framework matrix：Imperative/React/Vue consumer templates 与 `run-react-matrix.mjs`。
- Browser QA：`e2e/accessibility.spec.ts`、`e2e/container-responsive.spec.ts`、`e2e/editorPanels.ts`。
- Evidence：`.ai-platform/evidence/T139/{summary.md,test-results.md,diff.patch}`。

## Scope confirmation

- 未修改 T138 receipt、pointer geometry、category hit/drop bounds 或 G2 lifecycle ownership。
- 未实施 T140 export、docs 或 package work；v3 SVG/PNG 仍由 T140 负责。
- 未修改 dependency、lockfile、package version、manifest、public exports、public EditorOptions/callback/instance/component
  signatures 或 T131。
- 未执行 remote Git、stage、commit、push、PR、publish、tag、release 或 production promotion。
- evidence 不记录真实业务值；测试仅使用 deterministic synthetic fixtures。

## Residual risk

- Inspector responsive container 依赖既有 static/tabs/overlay semantic roles；browser helper已覆盖当前三种路径，后续若
  更改 roles/accessible names 需要同步更新稳定 selector contract。
- real G2 matrix 验证当前固定 framework/runtime versions；更广 browser/version performance与视觉矩阵属于 T141。
- A011 使用连续两帧公开 ViewSpec receipt作为 host settlement信号；该 fixture假设浏览器 paint boundary可覆盖 React/Vue
  已提交更新，当前 React 18/19 与 Vue 3 的真实 packed-package matrix已验证此假设。
