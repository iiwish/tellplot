# T129 Test Results

## Final Aggregate Gate

- Runtime: Node 22.20.0 / pnpm 11.1.3
- Command: `mise exec node@22.20.0 -- pnpm release:check`
- Result: `passed` on 2026-07-30
- Final signal: `TellPlot 1.0.0 stable release checks passed.`

## Gate Results

- `pnpm security:lock`: 14 个 AntV 包、17 个精确 artifact 的 version、tarball URL 与 SHA-512
  integrity allowlist 全部通过。
- `pnpm security:dependencies`: lockfile 与 48 个 installed manifest 一致；preinstall/postinstall 两层门禁通过。
- `pnpm release:architecture`: 49 source files / 193 import edges / 0 runtime cycles / 4 public entries。
- `pnpm release:audit`: 4 packages / 25 public files / 19 Markdown files / 419 audited files。
- `pnpm format:check`、`pnpm lint --max-warnings=0`、core/editor/react/vue/playground typecheck：通过。
- `pnpm test:coverage`: 53 files / 439 tests；statements 88.35%、branches 80.64%、functions 89.30%、
  lines 88.44%；core domain branches 95.34%，全部阈值通过。
- `pnpm build`: 四包与 playground production build 通过；最大 emitted JS chunk 448.83 kB，低于
  500 kB 门禁。
- `pnpm release:artifact`: 四个 1.0.0 tarball 的 rebuild、文件 allowlist、size 和 SHA-256 同源校验通过。
- `pnpm test:package`: core/editor/react/vue 均通过 publint、ATTW、ESM、CJS、types 与包级 consumer
  contract；根命令使用独立临时 npm cache，不依赖用户全局 cache 的可写状态。
- `pnpm test:framework-matrix`: imperative DOM、React 18.3.1、React 19.2.7、Vue 3.5.27 从四包
  tarball 运行同一受控 move/undo 场景；ViewSpec、CommandEvent、SVG 语义一致，G2 canvas 非空，
  auto-sized flex/grid、定高宿主与 clean unmount 通过。四个 consumer 使用
  `--strict-peer-dependencies`；Vite 8.1.4 / Rolldown 1.1.5 的 WASM fallback 固定
  `@napi-rs/wasm-runtime@1.1.6`，fresh install 无 peer warning。
- `pnpm test:performance`: 2/2；waterfall p95 70.8ms，categorical p95 71.2ms，预算 150ms，
  same-target React root commit delta 0。performance project 禁用 trace/video/screenshot，且在 authoritative
  scene ready 后采样，诊断采集不污染延迟结果。
- `pnpm test:e2e`: current Chromium/Firefox/WebKit 186/186。
- `pnpm test:a11y`: 45/45，无 serious 或 critical axe violation。
- `pnpm test:browser-previous`: Playwright 1.60.0 Chromium 148 / Firefox 150 / WebKit 26.4 共
  186/186；WebKit 18.4 previous-major 62/62。
- `pnpm release:rehearse`: 336-file isolated source 通过 frozen install、供应链门禁、49/193/0
  architecture、311-file release audit、typecheck、53 files / 439 unit tests、build、四包 package contract
  与四宿主 framework matrix。

## Security And Robustness Regression

- tooltip 文本使用 DOM text node；SVG export 清除 script、event handler、foreignObject、远程 URL 与
  executable namespace；PNG/SVG export options 对 accessor、hostile descriptor 和非法字段返回稳定错误。
- SourceData/ViewSpec/config/options 先验证 plain record、own enumerable data property、精确字段集合与
  数组密度；稀疏数组、symbol/named property、`__proto__` 和 prototype-pollution 输入均被拒绝。
- Store 对外 snapshot 深度分离并冻结；受控 command ID、pending ID 与多实例 host ID 冲突采用确定性拒绝，
  不会误接受其他实例或其他候选。
- G2 preview render 失败会立即中止交互、报告稳定 render error，并恢复 authoritative scene；失败或陈旧
  preview 不可在 pointerup 提交命令。
- tooltip/SVG/export、配置验证、错误消息与反馈区不泄漏 source content、原生异常或动态可执行内容。
- 所有第三方 GitHub Actions 固定完整 commit SHA；依赖安装前后均执行 AntV 精确 artifact 审计。
- 严格 consumer install 的 RED 稳定复现 registry 漂移将 `@napi-rs/wasm-runtime` 提升到 1.2.0 并造成
  `@emnapi/*` peer 冲突；固定与 Rolldown 1.1.5 同代的 1.1.6 后，四宿主 strict install/build/browser
  matrix 全部通过。

## Lifecycle, Interaction And Accessibility Regression

- 初始化失败事务式释放 container ownership、DOM、listener 与 G2 root；`destroy()` 幂等，多实例和
  React Strict Mode replay 不重复上报逻辑拒绝。
- controlled/uncontrolled、clone、Vue reactive Proxy、等价对象键重排和 ViewSpec 集合重排保持 accepted
  session、history 与活动交互；真实数据、图表类型或外部 ViewSpec 变化会清理 stale interaction。
- 直接图表、大纲与键盘进入同一 command/store；pointercancel、Escape、window blur、捕获释放、跨段拒绝、
  两项分组原子解散和 recursive group/marquee 均在当前及旧版浏览器矩阵通过。
- toolbar status 保留可见文本/title，不在 generic `div` 使用禁止的 `aria-label`；容器 360/500/899/900/1280px
  响应式边界在三浏览器及 WebKit 18.4 通过。
- panel/export roving focus、dialog focus return、multiselect tree、live region、reduced motion、移动触控区和
  embeddable landmark 均通过单元与 axe 门禁。

## Artifact Validation

- `git apply --check --cached .ai-platform/evidence/T129/diff.patch`
- `python3 $HOME/.codex/skills/ai-delivery-governor/scripts/validate_delivery_artifacts.py --root . --feature-id 011-framework-neutral-editor --strict`
- `git diff --check`
- 三轮独立最终复核覆盖 spec/architecture、runtime/lifecycle、security/robustness 与 OSS 文档；未解决
  Critical / High / Medium finding 为 `0 / 0 / 0`。

在线 `pnpm audit --prod` 因当前环境未获外部 registry advisory 查询授权而未刷新；本地精确版本、URL、
SHA-512 integrity、installed manifest 与 tarball 门禁全部通过。该环境限制不替代 G005 在干净 commit/CI
环境中的在线 advisory 复核。
