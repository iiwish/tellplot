# T138 Execution Summary

## 结论

T138 A001 完成 receipt/geometry 主实现；独立 review 后的 A002-A005 补齐 render-resize authority、forceFit failure、
interaction cleanup、Tooltip 与 comparison preview ownership。A006-A008 逐步校正 browser evidence 的 raster
pixel-cell、plot 外 expectation、bar source-axis顺序与 narrow Outline selector，并如实保留每次 stop history。
A009 最终把 bar hit失败拆到 distance 31，使用真实 reversed band scale、transposed coordinate 与 layout offset 的
private receipt fixture证明产品 pointer bounds正确；失败来自 E2E 对带 1 CSS px stroke 的 bar painted fill edge
误当 zero baseline。仅修正 test-side baseline estimator后，3个 bar定向 cases与当前全部 packet gates通过。
A010关闭 review发现的两处 lifecycle窗口：active comparison drag从valid target移到invalid target时保留preview
ownership与冻结receipt；ResizeObserver在observe前同步记录container size，不再把首次delivery前的真实resize吞成
baseline。新增真实浏览器valid→invalid→valid复入证明只提交一次command/history，全部packet gates再次通过。

T138 实现与 evidence 已收口；三层终审均为 Critical 0 / High 0 / Medium 0，task 进入 `Needs_Review`，不代表
用户 `Accepted`。

## Task-local baseline

- 执行前读取 execution packet、AGENTS、TDR-025、editor API contract 与 T137 evidence。
- pre-edit receipts：`/tmp/t138-preedit-status.txt`、`/tmp/t138-preedit-tracked.diff`、
  `/tmp/t138-preedit-allowed.tar`。
- A001 review-fix baseline另存 `/tmp/t138-a001-diff.patch`、`/tmp/t138-a001-summary.md`、
  `/tmp/t138-a001-test-results.md`；本 evidence 保留 A001 与 A002/A003 失败历史。
- `diff.patch` 由 pre-T138 allowed-files snapshot 与当前 T138-owned files机械生成，不申领 T135-T137/governance
  baseline。

## A001 实现

- private `comparisonSceneReceipt` 按 projection × series验证 current main interval 的 identity、tuple key、datum、
  finite bounds、revision/generation；missing/duplicate/unregistered/stale/hostile input整份 fail closed。
- exact/marquee 使用 actual rectangles，drop/action 使用 category-axis union，ghost 使用 2D union；all-zero
  使用 G2 band scale、coordinate、layout/margin/padding、zero baseline 与 plot range派生 renderer band和 32 CSS px
  interior strip。
- comparison pointer只消费 authoritative receipt；任一 series interval映射到同一 category command，无
  series/cell state或 public surface。

## A002/A003 review fix

- private settlement 增加 `origin` / `geometryAuthoritative`。render期间 resize 时先发布 non-authoritative
  settlement；forceFit success后才 authoritative。forceFit reject发布 non-authoritative resize success，不冒充
  render failure；comparison blocked，scalar保持 ready且无 `CHART_RENDER_ERROR`。
- ResizeObserver以真实 `contentRect` size去重首次/same-size notification；真实 size change才 invalidate/forceFit。
- 正常 comparison geometry invalidation通过 idle `onInteractionChange` 清理，不走 `onInteractionAbort` 或 render
  error。真实 render failure仍走原 error path。
- private `dismissTooltip()` 仅隐藏 container内 `.g2-tooltip`，在 interaction、hover action、geometry invalidation与
  destroy清理；后续 G2 hover仍可重新显示。
- 非空 drag preview标记 non-authoritative且不 invalidate geometry；其 settlement不替换 authoritative receipt。
  这是安全的，因为 preview只从已冻结 active receipt产生，不取得 lifecycle ownership；真实 resize/update/current
  render仍 invalidate并 fail closed。`preview(null)` 则走 authoritative current restore：settlement前 blocked，成功
  settlement后重建 receipt/ready。
- 浏览器 QA 增加每个 series独立 category move+undo、comparison marquee category dedupe，以及 Tooltip
  hover -> resize/update dismiss并可再次 hover。

## Stop condition

A003 focused GREEN 后，按授权只运行
`column all-positive renderer band exposes only the local all-zero 32px target`。该 case 仍在第二个 32px hit probe
等待 `dragging` 超时，与 A002/A003 前定向失败相同。依授权“若第二次同一断言仍失败立即 stop并封存”，未继续修改
contract、timeout或断言。A004 仅增加公开 settlement同步，不改变命中点、32px边界、容差或 timeout；同一 case
仍在第二个 hit probe失败，因此再次立即 STOP。未运行完整 Chromium/其余 gates。该 browser blocker需根代理
重新审计/重新授权后才能继续。

## A005 preview ownership

- chart surface新增 private comparison preview-active ownership。bare comparison `preview(null)` 且无 active preview
  时 no-op，不产生 render request或 geometry invalidation。
- non-null comparison preview取得 ownership；随后 null执行一次 authoritative current restore并清 ownership。
  authoritative `update`/request与 destroy清 ownership；scalar v1/v2 bare null preview保持原 render语义。
- 原 `column all-positive` case仍在相同第二个 32px hit probe失败，因此未运行后续完整 gates，T138仍不可进入
  `Needs_Review`。

## A006 raster pixel-cell correction

- `paintedComponents` 连通域的 `maxX/maxY` 是 inclusive raster indexes。CSS outer max使用 `(max + 1) * scale`，
  center使用 `(min + max + 1) / 2 * scale`；min仍为 `min * scale`。
- 纯 helper math RED/GREEN精确证明 `[2..4]`, scale 2, offset 10应映射 `{min:14,max:20,center:17}`，而非
  旧值 `{min:14,max:18,center:16}`。
- 单 browser中原第二个 hit断言已通过，说明原偏1假设可证实；新失败是首个 padding probe未进入
  `selecting`。A006禁止产品 geometry/命中修改，因此停止并等待新审计。

## A007 outside expectation

- probe新增 `outside` expectation。distance -1（baseline外1px）只断言不进入 `dragging`并安全 mouse-up/cleanup；
  distance 33仍必须 `selecting`，category midpoint仍必须 `selecting`。±15/±17点位、容差与timeout不变。
- 原单一 `column all-positive` case通过。随后完整 Chromium 25/29：column local/global all-zero与全部新增
  each-series/marquee/Tooltip通过，interaction-cancel全通过；bar local negative/positive与bar global zero的 hit断言失败，
  resize cancellation case在viewport change后读取到空 Outline order。
- A007明确要求任一新断言失败即 stop，因此未运行后续 architecture/package/lint/diff gates，T138仍不可进入
  `Needs_Review`。

## A008 bar sequence与narrow selector

- category cluster helper改为按category-axis CSS center顺序而非 area排序；纯 sequence RED证明 area可反转
  beta/gamma身份，GREEN固定source-axis order。transposed bar的source顺序体现在从上到下递增的CSS category
  centers，alpha由相邻beta/gamma center外推。
- `rootOrder()` 优先读取当前可见 authoritative tree；narrow layout无可见tree时，通过公开
  `Open structure outline` control打开overlay，再读取可见tree。Resize cancellation case由空列表恢复为通过。
- 定向4 cases为1 PASS / 3 FAIL；bar local negative、bar local positive、bar global zero仍在 hit未进入
  `dragging`。A008要求任一失败即 stop，未继续修改或运行完整 gates。

## A009 transposed receipt characterization与bar baseline修复

- bar all-positive每个 probe使用高信号 `test.step`/expect message。单跑精确确认 distance 1进入 `dragging`，
  distance 31在 `(483, 402)`进入 `selecting`；失败不是 receipt unavailable、category extrapolation或 teardown race。
- 新增 private receipt fixture：reversed category band scale经过 transposed coordinate，再叠加
  layout/margin/padding offsets；精确得到 all-zero bar `pointerBounds` baseline `118..150`、category band
  `33..68`，并验证 strip内命中、strip外不命中。该 fixture首跑即通过，排除 product receipt geometry bug。
- E2E exact-palette scanner读取的是 bar非密集 interval的 painted fill edge，baseline-facing edge受 1 CSS px stroke
  向内收缩；它不是 G2 zero baseline。pure helper RED得到 positive `451`而预期`450`，GREEN仅对 transposed bar
  positive减1、negative加1；未修改产品 geometry、±15/±17点、32px contract、timeout或容差。
- 原 bar all-positive单跑通过；bar local negative、bar local positive、bar global zero 3/3通过；完整 Chromium
  comparison+cancel 31/31通过。Focused、editor full、typecheck、build、architecture、package surface、lint与
  diff-check全部通过。

## A010 preview复入与observer初始size review fix

- comparison preview ownership继续由surface private state持有。active drag中收到 `preview(null)`只请求
  non-authoritative current render，不invalidate geometry、不清ownership、不替换冻结receipt；drag进入idle后的
  null restore才authoritative并清ownership。update/destroy仍清ownership，scalar bare null行为不变。
- ResizeObserver注册前同步读取finite `getBoundingClientRect()`作为 `observedSize`。首次delivery同尺寸忽略；若
  observe前后尺寸已变化，首次delivery立即invalidate并进入既有forceFit settlement。读取异常/非finite时保留
  原首次finite delivery建立baseline的fail-safe。
- unit覆盖valid preview→invalid null时drag仍active、receipt仍可复用，回到valid后提交一次，idle null再执行一次
  authoritative restore并清owner；runtime两格覆盖initial same-size ignored与first-delivery changed invalidates。
- Chromium真实Canvas从valid target移入无效区域再返回valid target，drag全程保持，最终revision仅加1；一次Undo
  恢复原顺序且Undo disabled，证明只有一个command/history entry。
- 最终focused 69/69、editor full 217/217、typecheck、build、Chromium comparison+cancel 32/32、architecture、
  package surface、lint与diff-check全部通过。

## 范围确认

A001-A010 runtime/test attempts 未修改 public export、dependency、lockfile、package version、manifest、T131、
remote Git、stage、commit、publish、tag、release 或 production，也未实施 T139/T140。A010 worker handoff 时未自行
推进 T138 status；最终状态由下述 review integration 决定。

## Final Review Integration

- Spec compliance：Critical 0 / High 0 / Medium 0。T138 满足 authoritative N×S receipt、four-purpose geometry、
  all-zero renderer-band target、category-only command 与 lifecycle fail-closed contract，未越入 T139/T140。
- Engineering quality：Critical 0 / High 0 / Medium 0。A010 已关闭 valid→invalid→valid preview 复入与
  ResizeObserver 首次 delivery 的两处 lifecycle 窗口，最终 focused、editor、browser、architecture、surface、lint
  与 diff gates 全绿。
- QA acceptance：Critical 0 / High 0 / Medium 0。真实 G2 Canvas 覆盖任意 series category move/undo、marquee
  dedupe、Tooltip lifecycle、bar/column local/global all-zero、positive/all-negative domain、resize/cancel 与单一
  command/history。
- Review conclusion：无 unresolved Critical、High 或 Medium finding。T138 已进入 `Needs_Review`；仅用户明确
  验收后才能进入 `Accepted`，G003 仍继续按已批准串行图执行 T139-T141。
