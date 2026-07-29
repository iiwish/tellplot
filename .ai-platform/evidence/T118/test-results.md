# T118 / G002-R1 测试结果

## TDD Receipt

| Phase | Scope | Result |
| --- | --- | --- |
| RED | 来源分组边界退出、click 保留动作、drag 隐藏动作 | unit/component 旧行为按预期失败 |
| GREEN | waterfall/categorical axis、canvas 和 state correction slice | 67/67 passed |
| BROWSER | 分组首柱 click 与跨边界退出真实 G2 流程 | Chromium/Firefox/WebKit 3/3 passed |
| RED | contextual Inspector、inside resolver、cross-level move、atomic dissolve、group region config/spec | 新断言在旧行为上按预期失败 |
| GREEN | 10 个聚焦 component/domain/render/export files | 77/77 passed |
| GREEN | inside/cross-level 3-file slice | 22/22 passed |
| GREEN | legacy domain/keyboard correction slice | 46/46 passed |
| REFACTOR | shared group projection + waterfall/column/bar G2 specs | focused and full regression passed |
| RED | bounded group value extent + foreground G2 label mark | 4 expected failures / 1 pass |
| GREEN | group region + waterfall/categorical spec/export correction slice | 31/31 passed |
| RED | auxiliary mark axis ownership regression | 1 expected failure / 4 passes |
| GREEN | range/text marks leave axis ownership to the main interval | 5/5 passed；fresh grouped browser axis visible |
| RED | first-member label anchor + explicit foreground value/group labels | 5 expected failures / 25 passes |
| GREEN | group region + waterfall/categorical spec/export correction slice | 30/30 passed |
| RED | interval value label replaced by an independent foreground text mark | 4 expected failures / 14 passes |
| GREEN | waterfall/categorical value-label spec slice | 18/18 passed |
| REGRESSION | full unit expectations after mark split | 7 failures / 403 passes；all assertions migrated to the foreground mark contract |
| RED | decorative value marks must not reuse draggable `nodeId` | 3 expected unit failures；categorical three-browser drag 6 failures / 30 passes |
| GREEN | interaction-neutral `labelId/categoryId` value data | focused unit 18/18；categorical browser 18/18；waterfall/quickstart browser 18/18 |
| RED | value labels use frameless compact rounded halo | 3 expected failures / 59 passes |
| GREEN | waterfall/categorical value-label frameless style | 62/62 passed |
| RED | group label uses the same frameless visual contract | 1 expected failure / 5 passes |
| GREEN | group/value label visual contract slice | 68/68 passed |
| RED | 拖拽边界预览中的 group region 仍读取 canonical ViewSpec | 2 expected component failures |
| GREEN | waterfall/categorical region 与柱形共享 preview ViewSpec | focused 58/58；三浏览器关键回归 36/36 passed |
| RED | 展开分组内框选与跨边界框选仍要求同一直接父级 | focused component 6 个预期失败 |
| GREEN | lowest-common-container 归一化、整组提升、冗余拒绝与 outline 有效范围同步 | focused component 19/19 passed |
| BROWSER | 展开分组子柱 + 外部柱的真实 G2 marquee | current/previous Chromium、Firefox、WebKit 与 WebKit 18.4 passed |

## Full Gates

| Command | Result |
| --- | --- |
| `pnpm format:check` | passed |
| `pnpm lint` | passed；0 warning |
| `pnpm typecheck` | editor/playground strict TypeScript passed |
| `pnpm test:unit` | 52 files；458/458 passed |
| `pnpm test:coverage` | 458/458 passed；statements 87.08%、branches 81.68%、functions 89.97%、lines 87.19% |
| `pnpm build` | editor ESM/CJS/DTS/CSS 与 playground production build passed；既有 G2 chunk warning retained |
| `pnpm test:package` | publint、ATTW、ESM、CJS、types、pack contract passed |
| `pnpm test:react-matrix` | React 18.3.1 / 19.2.7；各 87,405 painted pixels；clean unmount |
| `pnpm test:e2e` | current Chromium/Firefox/WebKit 183/183 passed |
| `pnpm test:a11y` | Chromium/Firefox/WebKit 45/45 passed；无 serious/critical axe violation |
| `mise exec node@22.20.0 -- pnpm test:browser-previous` | previous Chromium/Firefox/WebKit 183/183；WebKit 18.4 61/61 passed |
| strict artifact validator | feature/task strict validation passed；0 error / 0 warning |
| `git diff --check` | passed |

## Diff Evidence

- 本轮递归层级框选 implementation + SSOT patch：`.ai-platform/evidence/T118/diff.patch`，1,205 lines，
  20 files；evidence bundle 自身不包含在 patch。
- SHA-256：`2de50ab449fe184402fcb8bcf3a5710e0807c75efb10464735bf1030baa07679`。
- `git apply --check --reverse` passed；基线为本地 commit `ead4be9`。
- package manifests 与 lockfile 对 baseline 逐字节一致；T118 source 未引入 `any`、`@ts-ignore` 或
  `@ts-expect-error`。

## Coverage Focus

- `groupRegions.ts`：statements 96.66%、branches 86.84%、lines 96.61%。
- categorical spec：lines 100%、branches 94.50%。
- waterfall spec：lines 100%、branches 98.57%。
- `executeCommand.ts`：lines 93.95%、branches 87.72%。
- validation：lines 99.29%、branches 98.02%。
- shared G2 runtime：lines 97.72%、branches 98.30%。

## Performance

150ms product budget、30 samples 和 assertion 未修改。2026-07-24 的聚合 exact command clean pass 为
waterfall 69.9ms、categorical 77.5ms，root commit delta 均为 0。此前高系统负载诊断样本保留如下：

| Run | Waterfall p95 | Categorical p95 | Root commit delta | Result |
| --- | ---: | ---: | ---: | --- |
| high-load diagnostic 1 | 175.90ms | 171.70ms | 0 / 0 | environment-sensitive failure |
| high-load diagnostic 2 | 180.40ms | 209.30ms | 0 / 0 | environment-sensitive failure |
| high-load diagnostic 3 | 303.00ms | 104.40ms | 0 / 0 | waterfall failed；categorical passed |
| high-load diagnostic 4 | 489.70ms | 259.80ms | 0 / 0 | environment-sensitive failure |
| high-load diagnostic 5 | 264.50ms | 246.20ms | 0 / 0 | environment-sensitive failure |
| high-load diagnostic 6 | 445.90ms | 351.30ms | 0 / 0 | environment-sensitive failure |
| high-load diagnostic 7 | 221.80ms | 311.80ms | 0 / 0 | environment-sensitive failure |

聚合 `pnpm test:performance` exit 0，T118 性能门禁通过并进入 `Needs_Review`。没有降低预算、样本数或
assertion，也没有修改性能测试或公共行为来规避门禁。

## Behavior Evidence

- single item/group Inspector context、非法多选、ungroup：component + E2E passed。
- 层级选择 normalizer 覆盖组内子分组、root/嵌套共同父级提升、祖先覆盖去重、冗余全选、缺口与锁定；
  outline 把原始跨层选择立即同步为完整 group + 外部节点，真实 G2 marquee 创建的上层折叠分组保留内部
  分组并覆盖正确来源。current/previous browsers 和 WebKit 18.4 全部通过。
- outline real DnD into group、chart cross-container scene bounds、before/after/inside synchronized preview：passed。
- 来源 group 的 G2 scene bounds 在 drag start 固化；边界内成员重排与边界外 group before/after 退出
  分离；指针进入外部 mark 后标准碰撞重新接管，边界不会持续吸附。首成员柱 click 保留折叠/取消分组
  动作，达到 4px drag intent 后隐藏。unit/component 与三浏览器真实 G2 回归 passed。
- 柱形与分组背景均从相同 preview ViewSpec 投影；三成员 group 的末成员越界时，G2 `range` mark 在
  pointer up 前从末成员缩到第二成员，放手前无 `onViewSpecChange`，放手后画布 hash 与预览一致。
- two-child dissolve、three-child retain、nested replacement、locked/segment/cycle、one-step undo/redo：passed。
- default/disabled/opacity/label/nested/collapsed regions、bounded value extent 和 G2 `range → interval → text`
  mark order：passed。
- waterfall/column/bar grouped SVG/PNG canonical projection、sanitization and nonblank output：passed。
- export/cancel targeted Chromium/Firefox/WebKit regression：60/60 passed。
- full E2E 首轮发现三浏览器 quickstart SVG 丢失 collapsed group axis label；移除辅助 text mark 的
  `axis: false` 后 quickstart 3/3 passed，随后 full E2E 132/132 passed。
- 背景 mark 也不声明 axis ownership；聚焦 unit 5/5 passed，fresh browser 创建分组后 x/y axis、bounded
  range 与 foreground label 同时可见，最终 quickstart 三浏览器再次 3/3 passed。
- 首成员柱顶锚点、独立 group/value text mark、真实端点、2px 柱内偏移、`zIndex`、无底框细圆角光晕和
  interaction-neutral label data 聚焦测试 73/73 passed；waterfall、categorical、quickstart 三浏览器目标
  回归 36/36 passed。
- 数值标签矩形底候选在 full E2E 中使 Firefox/WebKit mobile pixel geometry 仅识别 2 根正向柱（130/132）；
  候选被拒绝后 mobile regression 3/3、最终 full E2E 132/132 passed。
- 数值 text mark 首版复用 `nodeId` 时，分类图拖拽无法稳定解析 drop target（30/36）；切换到独立
  `labelId/categoryId` 后分类图 18/18、waterfall/quickstart 18/18，最终 full E2E 132/132 passed。
