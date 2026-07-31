# T129 / G006 Goal Review

## Verdict

`ACCEPTED`。用户于 2026-07-30 授权在验收中直接修复问题并完成验收。FRAMEWORK-SC-001 至
FRAMEWORK-SC-007 全部满足；最终完整 `release:check` 通过，未解决 Critical / High / Medium finding
为 `0 / 0 / 0`。G006 / T125-T129 状态为 `Accepted`。

## Spec Compliance

| Success criterion | Result |
| --- | --- |
| FRAMEWORK-SC-001 | core/editor 可在无 React/Vue 的 imperative consumer 中 import、mount、update、export、destroy |
| FRAMEWORK-SC-002 | imperative DOM、React 18.3.1、React 19.2.7、Vue 3.5.27 真实 tarball consumer 通过 |
| FRAMEWORK-SC-003 | 四宿主同一 move/undo 场景的 ViewSpec、CommandEvent 与 SVG 语义一致 |
| FRAMEWORK-SC-004 | architecture、manifest、tarball 与 import scan 证明 core/editor 不含宿主框架 |
| FRAMEWORK-SC-005 | 439 unit、186 current E2E、45 a11y、2 performance、186 previous、62 WebKit 18.4 通过 |
| FRAMEWORK-SC-006 | 49/193/0 architecture、419-file audit、四包 manifest、336-file rehearsal 通过 |
| FRAMEWORK-SC-007 | spec、architecture、runtime、security、OSS 与 QA review 无未解决 P0/P1/P2 finding |

## Architecture And API Review

- core 唯一拥有数据、视图、命令、历史和 store；editor 唯一拥有 DOM/G2 工作台；adapters 只映射宿主
  lifecycle，不存在 React/Vue 分叉状态或第二渲染 runtime。
- 四包 ESM/CJS/types/styles、exports、peer dependencies、public API 文档与 quickstart 均由真实 tarball
  consumer 验证；consumer install 启用 `--strict-peer-dependencies`，并固定 Vite/Rolldown WASM fallback
  的同代 transitive，registry 漂移不能再以 warning 被忽略。`@tellplot/editor` package test 实际执行
  ESM、CJS、NodeNext 与 pack contract。
- public options/config/export 输入采用精确 closed shape；未知键、accessor、symbol/named array property、
  sparse array、hostile prototype 和非法 descriptor 在字段读取前被拒绝。
- Store snapshot 与候选数据 detached/frozen、prototype-safe；重复 action ID、pending controlled ID 和多实例
  host ID 由确定性合同处理，不会跨宿主误接受。

## Runtime And Lifecycle Review

- 初始化失败事务式释放 container ownership、DOM、observer、listener 与 G2 root；`destroy()` 幂等，异步
  initialization/render/export 的 late settlement 无法复活实例。
- controlled candidate 只在宿主回传语义一致 ViewSpec 后进入 accepted session；clone、Vue reactive Proxy、
  等价 config 键重排和 collapsed/pinned 集合重排保持 history 与活动交互。
- 数据、图表类型、ready/invalid context 或外部 ViewSpec 的真实变化会取消 stale interaction；普通受控接受
  不会意外关闭 panel，未接受候选不会污染 revision、history 或 selection。
- preview render 与 authoritative scene 分离；非 authoritative G2 render 失败会中止 pointer session、报告稳定
  错误并恢复 authoritative scene，pointerup 不可提交失败或陈旧 preview。
- `ResizeObserver` 刷新非 window resize 的 canvas 与命中边界；render 中 resize 合并，destroy 时断开。
- export 从最新 accepted revision 构建离屏 scene；render/reader/destroy 的异常均走稳定错误与 finally cleanup。

## Security And Supply-Chain Review

- tooltip 使用 text node；SVG sanitizer 移除 script、event handler、foreignObject、远程 URL、source metadata
  与 executable namespace；PNG/SVG options 不执行 accessor，也不回显 source content 或原生异常。
- SourceData/ViewSpec 的密集数组、own enumerable data property、prototype 与递归节点预算均有恶意输入测试，
  稀疏数组 DoS 和 prototype pollution 路径已关闭。
- AntV 依赖固定 14 个 package / 17 个 artifact 的版本、URL 与 SHA-512 integrity；安装前审计 lockfile，
  安装后审计 48 个 manifest。所有第三方 GitHub Actions 固定完整 commit SHA。
- 在线 `pnpm audit --prod` 因当前执行环境未获 registry advisory 查询授权而未刷新；G005 clean commit/CI
  发布演练继续承担在线 advisory 复核。本地精确 artifact 门禁全部通过。

## UX, Accessibility And Performance Review

- 直接图表、大纲、键盘和宿主调用进入同一 command；Escape、blur、pointercancel、capture release、跨段拒绝、
  recursive group、marquee 与原子解散覆盖 current/previous browser matrix。
- export menu roving focus、dialog focus return、multiselect tree、live region、reduced motion、移动触控区、
  embeddable landmarks 与多实例 hover/feedback isolation 通过。
- generic toolbar status 不使用禁止的 `aria-label`；保留可见文本与 title。360/500/899/900/1280px
  container responsive boundary 在 Chromium、Firefox、WebKit 和 WebKit 18.4 通过。
- performance project 不录制 trace/video/screenshot，并等待 authoritative scene ready 后采样；waterfall p95
  70.8ms、categorical p95 71.2ms，均低于 150ms，React root commit delta 为 0。预算未放宽。

## QA And Release Review

- Node 22.20.0 / pnpm 11.1.3 的最终 `release:check` 是唯一聚合验收基线。
- 53 files / 439 tests 与全部 coverage threshold 通过；current browsers 186/186、a11y 45/45、previous
  release 186/186、WebKit 18.4 62/62 通过。
- 四包 tarball 与 manifest 的文件、size、SHA-256 完全一致；imperative/React 18/React 19/Vue 3 matrix
  同时在工作树和 336-file 隔离源码副本通过。
- 三个独立复核方向覆盖架构/API、runtime/lifecycle、security/robustness 与 OSS 文档；发现的所有 Medium
  及以上问题均先增加回归再修复，最终未解决 C/H/M 为 0。
- 本目标未执行 stage、commit、push、PR、merge、tag、GitHub Release、deploy 或 npm publish。

## Residual Low Risks

- L-001：永久 command ID 去重合同使 `processedActionIds` / `acceptedActionIds` 在超长常驻实例中线性增长。
- L-002：AntV 未调用的 transitive dynamic-code 分支及 strict Trusted Types 环境仍需在真实宿主 CSP 下持续验证。
- L-003：候选位于本地 dirty/uncommitted worktree；G005 必须从用户批准的干净 commit 重跑完整门禁。
- L-004：G2 保持按需大 chunk；当前最大 448.83 kB，500 kB build budget 继续阻断体积回归。
- L-005：npm/GitHub 身份、公开仓库、生产托管、域名、SPA fallback 与在线 advisory 属于 G005 外部条件。

这些 Low 风险不阻断 G006 本地架构目标验收，也不构成任何远程或发布授权。
