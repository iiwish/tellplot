# T116 多图表内部架构收敛 Evidence

## Status

- Task: `T116`
- Packet: `EP-004-T116-A001`
- Attempt: `T116-A001`
- Executor: Codex direct execution
- Worktree: `codex/t112-categorical-data-contract`
- Status: `Accepted`
- Authorization: 用户于 2026-07-20 明确回复“批准 EP-004-T116-A001 开始执行”。
- Acceptance: 用户于 2026-07-20 明确回复“同意验收 T116”。
- Remote actions: 未执行 stage、commit、push、PR、merge、publish 或 release。

## Outcome

T116 在已验收 T112-T115 行为不变的前提下，将 waterfall 与 categorical 重复的 G2
screen lifecycle 收敛到 `rendering/g2/chartRuntime.ts`，将 SVG/PNG 重复的 offscreen lifecycle
收敛到 `rendering/g2/exportRuntime.ts`。projection/spec/types 按 chart family 归属到 `charts/**`，
waterfall 改用已验收的 X/Y category-axis primitives，旧 horizontal wrappers 已删除。

G2 仍然独占 marks、scene bounds、events 和 animation ownership。shared runtime 不读取财务数据、
不选择图表类型、不暴露 `Chart` instance，也没有新增 registry、plugin contract、dependency
或公共 API。

## Accepted Baseline Isolation

- 执行前已将当前 dirty worktree 的 271 个受控文件复制到
  `/tmp/tellplot-T116-A001-baseline.8jUPvp/worktree/`。
- Manifest: `/tmp/tellplot-T116-A001-baseline.8jUPvp/manifest.sha256`。
- Manifest SHA-256: `46198651c10620e6f7ec6459a2018f20701e8ef259776ff7524767fccf7bd819`。
- 快照排除 `.git`、`node_modules`、`coverage`、`dist`、Playwright 输出和 `evidence/T116`；
  未 reset、stash、stage 或覆盖 T112-T115 baseline。
- `diff.patch` 由临时 Git 快照仓库生成，不依赖当前仓库 index，且排除
  `evidence/T116/**`本身。
- 最终 patch 覆盖 50 个 task-only 文件，包含新增 runtime、chart-family modules 与 tests；
  reverse-apply check 通过，SHA-256 为
  `2fe4ac34415e75444a5aab8d33327f4027bdf66bcb55aaa5f07a690f778fd8eb`。

## Ownership Map

| Baseline path | Current path | Change |
| --- | --- | --- |
| `waterfall/projectWaterfall.ts` | `charts/waterfall/projection.ts` | 只调整 import/ownership，语义 deep-equal |
| `waterfall/waterfallTypes.ts` | `charts/waterfall/types.ts` | 类型归属移动 |
| `export/waterfallChartSpec.ts` | `charts/waterfall/spec.ts` | screen/export 共用 spec 归属移动 |
| `categorical/projectCategorical.ts` | `charts/categorical/projection.ts` | 只调整 import/ownership，语义 deep-equal |
| `categorical/categoricalTypes.ts` | `charts/categorical/types.ts` | 类型归属移动 |
| `categorical/categoricalChartSpec.ts` | `charts/categorical/spec.ts` | family spec 归属移动 |
| two Canvas lifecycle blocks | `rendering/g2/chartRuntime.ts` | 按两个真实生产 consumer 收敛 |
| SVG/PNG offscreen blocks | `rendering/g2/exportRuntime.ts` | 按两个真实生产 consumer 收敛 |

`components/formatAmount.ts` 仍是 charts/export/components 共用的纯函数。它不形成文件级循环；
本任务不为目录对称扩大移动范围，该保留边界已写入 canonical architecture。

## Shared Runtime Consumer Audit

| Operation | Production consumers | Contract |
| --- | --- | --- |
| constructor cache/load | chart runtime, export runtime | failure 后可 retry；不公开 constructor |
| request queue / stale settlement | WaterfallCanvas, CategoricalCanvas | serialized render；latest request wins |
| animation finish | WaterfallCanvas, CategoricalCanvas | superseding input/teardown 不被 G2 animation 锁住 |
| event on/off | WaterfallCanvas, CategoricalCanvas | exact listener pair；partial registration failure 也显式 off |
| scene context read | WaterfallCanvas, CategoricalCanvas | 只返回 `unknown` context，不返回 chart instance |
| dispose/destroy | WaterfallCanvas, CategoricalCanvas | RAF/microtask stale work 无效；destroy exactly once |
| hidden host/render/reader/finally | SVG exporter, PNG exporter | success/render/reader/destroy failure 都移除 host |

## Lifecycle Behavior Matrix

| Case | Evidence |
| --- | --- |
| request before async constructor settles | latest request 在 initialization 后被 flush |
| rapid superseding requests | RAF 取消旧帧，token 阻止 stale callback，最新 spec 渲染 |
| request during active render | stale settlement 标记 `latest=false`，然后串行渲染最新 request |
| dispose before/during initialization or render | 不复活 chart，不发送 late settlement |
| event registration partially fails | 已成功的 listener 显式 `off`，chart 销毁 |
| callback/off/destroy/animation/context throws | 内部细节被隔离，不中断后续 cleanup |
| export render or reader throws | format layer 返回结构化 error，chart/host 在 `finally` 释放 |

## Visual And Export Evidence

`visual/` 包含 waterfall/column/bar 的 ready、grouped 画面及三类 SVG/PNG 导出。人工检查未发现
toolbar、canvas、outline、inspector、group action 或 feedback 重叠；首个 waterfall/column item
保持最左，首个 bar item 保持最上。

- visible canvas painted pixels: waterfall 67,278 / grouped 74,982；column 78,114 / grouped 65,273；
  bar 76,467 / grouped 61,783。
- 三个 export PNG 均为 1620 x 1356 RGBA，文件大小 199-240 KiB；SVG 均大于 24 KiB。
- column/bar ready、grouped screen 及 SVG/PNG 与已验收 T115 对应文件 SHA-256 完全一致。
- SVG audit 不包含 `script`、`foreignObject`、remote href、`sourceRef` 或 metadata。

## Boundary Audit

- `index.ts`、ESM/CJS declarations 没有 `G2Spec`、G2 `Chart`、runtime handle 或 internal adapter。
- components/export/public entry 没有 raw `@antv/g2` runtime import；只有 family spec 的 type-only
  `G2Spec` 和 `rendering/g2` 自身依赖 G2。
- 旧 top-level waterfall/categorical 与 `export/waterfallChartSpec.ts` 已删除，无残留 import。
- `domain/**`、schema、commands、history、session、persistence、appearance wire shape 和 dependencies
  相对 T115 accepted baseline 未修改。
- T116 changed source/test 无 `any`、`@ts-ignore`、`@ts-expect-error`、public registry 或第二渲染引擎。

## Review

### Spec Compliance

通过，无 unresolved Critical/High/Medium finding。chart-family ownership、两个 internal runtime、
waterfall X-axis migration、公共边界与 full release-candidate gates 均符合 packet。产品、schema、
command、copy、visual 和 dependency 范围未扩展。

### Engineering

通过，无 unresolved Critical/High/Medium finding。review 曾发现“后续 event 注册失败时已注册
listener 未显式 off”；新增 RED 证明 `off` 为 0 次，修正 active registration 记录时机后
18/18 runtime/architecture tests 通过。shared operations 均有两个生产 consumer，无 speculative API。

### QA Acceptance

通过，无 unresolved Critical/High/Medium finding。scoped 226 tests、full unit/coverage 393 tests、
current browsers 132 tests、previous release browsers 132 tests、WebKit 18.4 44 tests、a11y 27 tests、
React 18/19、package 和 visual/export parity 均通过。performance 成功样本为 waterfall 68.3ms、
categorical 69.5ms，低于 150ms p95 预算，same-target root commit delta 为 0。

## Residual Risks

- G2 scene context 本质上仍是 renderer-owned hostile input；`chartPointer.ts` 继续以 `unknown`
  解析并结构化失败，没有把私有 shape 提升为公共合同。
- `components/formatAmount.ts` 是无 React 依赖的共用工具，当前路径不理想但不形成文件循环；
  只在格式化发展为独立子系统时再调整，不为目录对称扩大 T116。
- playground build 仍有既有 G2 chunk 超过 500 kB warning；本任务没有新增 dependency 或同步
  拆解 G2 的用户价值证据。
- 长时间浏览器矩阵后的高系统负载会使单次 performance p95 抖动；两次高负载失败
  分别只影响 waterfall/categorical 之一，不改预算后的独立 clean run 结果见
  `test-results.md`。

## Acceptance Gate

用户于 2026-07-20 明确验收 T116-A001。T116 状态为 `Accepted`；本次验收未授权 stage、commit、
push、PR、merge、publish 或 release。
