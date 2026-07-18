# 001 瀑布图编辑器基础切片任务图

## Metadata

- Version: 0.2.0
- Status: Confirmed
- Approval: 用户于 2026-07-16 明确批准递归模型与 T106-CR001，并授权按 TDD 完成实现
- Last updated: 2026-07-18

## Epic E1 - 可嵌入瀑布图编辑器

### Story S1 - 可信领域基础

## T101 - 建立 workspace 与质量工具链

- Status: Accepted
- Priority: P0
- Dependencies: T002 approval
- Blocks: T102、T105、T108
- Story / Requirement: WF-US-005、WF-NFR-005、WF-NFR-006
- Parallel: 否
- Conflicts with: T105、T108；共享 root 与 package 配置
- Goal: 建立可安装、可构建、可测试的 pnpm workspace、单 editor 产品包和薄 playground 壳层。
- Allowed files: `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`.npmrc`、`.nvmrc`、`tsconfig.base.json`、`eslint.config.js`、`.prettierignore`、`.gitignore`、`vitest.config.ts`、`playwright.config.ts`、`packages/editor/package.json`、`packages/editor/tsconfig.json`、`packages/editor/tsup.config.ts`、`packages/editor/src/index.ts`、`packages/editor/tests/package/**`、`apps/playground/package.json`、`apps/playground/tsconfig.json`、`apps/playground/vite.config.ts`、`apps/playground/index.html`、`apps/playground/src/main.tsx`、`apps/playground/src/App.tsx`
- Test targets: `packages/editor/tests/package/**`
- Deliverables: 精确版本依赖、workspace scripts、严格 TS 配置、flat ESLint、按 import/require 匹配声明格式的 package exports、最小 playground build、package smoke test。
- Acceptance criteria: `pnpm install` 生成 lockfile；editor 可构建 ESM/CJS，并分别提供 ESM `.d.ts` 与 CJS `.d.cts`；playground 可构建；packed package smoke test 证明入口可解析。
- Definition of Done: format、lint、typecheck、unit smoke、build、publint 均通过；无运行时业务实现。
- Validation commands: `pnpm install`；`pnpm format:check`；`pnpm lint`；`pnpm typecheck`；`pnpm test:unit`；`pnpm build`；`pnpm test:package`
- TDD plan: RED：先添加 package import/type smoke test 并确认入口或产物缺失失败；GREEN：创建最小 workspace 和 package 产物；REFACTOR：去除重复配置并保持全部命令通过。
- Packet path: `.ai-platform/specs/001-waterfall-editor-foundation/packets/T101.yaml`
- Evidence required: 依赖安装版本、RED/GREEN 输出、build 产物清单、package lint 结果、changed files、diff summary、residual risk。

## T102 - 实现 SourceData、ViewSpec 与验证器

- Status: Accepted
- Priority: P0
- Dependencies: T101
- Blocks: T103、T104、T105
- Story / Requirement: WF-US-001、WF-FR-001、WF-FR-002、WF-FR-003、WF-NFR-001、WF-NFR-007
- Parallel: 否
- Conflicts with: T103、T104；共享 domain types
- Goal: 建立无 React/G2 依赖的不可变数据模型、初始 ViewSpec 和结构化验证结果。
- Allowed files: `packages/editor/src/domain/model.ts`、`packages/editor/src/domain/ids.ts`、`packages/editor/src/domain/errors.ts`、`packages/editor/src/domain/validation.ts`、`packages/editor/src/domain/createInitialViewSpec.ts`、`packages/editor/src/index.ts`、`packages/editor/tests/domain/model.test.ts`、`packages/editor/tests/domain/validation.test.ts`、`packages/editor/tests/domain/immutability.test.ts`、`packages/editor/tests/fixtures/**`、`packages/editor/tests/package/**`
- Test targets: `packages/editor/tests/domain/model.test.ts`、`packages/editor/tests/domain/validation.test.ts`、`packages/editor/tests/domain/immutability.test.ts`、既有 package public API consumer tests
- Deliverables: 公共 data/view/error types、source/view validators、initial view factory、财务 fixture。
- Acceptance criteria: 重复 ID、非有限金额、非法 anchor、非法 group 引用和 source mismatch 均返回稳定错误码；输入对象不被修改。
- Definition of Done: 目标测试先红后绿；domain coverage 门槛达到 95%；禁止 React/G2 import。
- Validation commands: `pnpm test:unit -- packages/editor/tests/domain/model.test.ts packages/editor/tests/domain/validation.test.ts packages/editor/tests/domain/immutability.test.ts`；`pnpm test:coverage`；`pnpm typecheck`；`pnpm lint`
- TDD plan: RED：为每个 validation/error/immutability contract 添加失败测试；GREEN：实现最小 types、factory 和 validators；REFACTOR：统一 path/error helpers，保持序列化 plain data。
- Packet path: `.ai-platform/specs/001-waterfall-editor-foundation/packets/T102.yaml`
- Evidence required: RED/GREEN 输出、coverage、error matrix、changed files、diff summary、residual risk。
- Acceptance authority: 用户授权 Codex 对 T102-T104 执行独立 review 并验收；T105 完成后恢复用户可视化验收。

## T103 - 实现命令执行器与历史

- Status: Accepted
- Priority: P0
- Dependencies: T102
- Blocks: T104、T106、T107
- Story / Requirement: WF-US-002、WF-US-003、WF-US-004、WF-FR-004、WF-FR-005、WF-FR-009、WF-FR-013
- Parallel: 否
- Conflicts with: T102、T104、T106；共享 command/session contracts
- Goal: 用单一纯函数路径实现类型化命令、原子校验、revision、undo/redo 和非敏感事件。
- Allowed files: `packages/editor/src/domain/commands.ts`、`packages/editor/src/domain/session.ts`、`packages/editor/src/domain/executeCommand.ts`、`packages/editor/src/domain/history.ts`、`packages/editor/src/domain/invariants.ts`、`packages/editor/src/domain/errors.ts`、`packages/editor/src/index.ts`、`packages/editor/tests/domain/commands.test.ts`、`packages/editor/tests/domain/history.test.ts`、`packages/editor/tests/domain/invariants.test.ts`、`packages/editor/tests/domain/property-sequences.test.ts`、`packages/editor/tests/fixtures/commandSourceData.ts`、`packages/editor/tests/package/**`
- Test targets: `packages/editor/tests/domain/commands.test.ts`、`packages/editor/tests/domain/history.test.ts`、`packages/editor/tests/domain/invariants.test.ts`、`packages/editor/tests/domain/property-sequences.test.ts`、既有 package public API consumer tests
- Deliverables: command union、session factory、executor、undo/redo、invariant checks、command events。
- Acceptance criteria: 所有命令成功、拒绝、no-op、revision conflict 和 history branch 行为满足合同；随机合法序列保持来源与金额守恒。
- Definition of Done: 每种命令有 RED/GREEN 证据；失败命令 state identity 不变；coverage 门槛通过。
- Validation commands: `pnpm test:unit -- packages/editor/tests/domain/commands.test.ts packages/editor/tests/domain/history.test.ts packages/editor/tests/domain/invariants.test.ts packages/editor/tests/domain/property-sequences.test.ts`；`pnpm test:coverage`；`pnpm typecheck`；`pnpm lint`
- TDD plan: RED：按 move、group、collapse、pin、annotation、history 顺序增加失败测试；GREEN：逐个实现 command handler；REFACTOR：抽取共享 immutable update 与 invariant pipeline。
- Packet path: `.ai-platform/specs/001-waterfall-editor-foundation/packets/T103.yaml`
- Evidence required: 按命令分类的 RED/GREEN 输出、property sequence seed/result、coverage、changed files、diff summary、residual risk。
- Acceptance authority: 用户授权 Codex 对 T102-T104 执行独立 review 并验收；T103 已完成 fresh 独立 review，无 Critical、High 或 Medium finding。

## T104 - 实现瀑布投影

- Status: Accepted
- Priority: P0
- Dependencies: T102、T103
- Blocks: T105、T106、T107
- Story / Requirement: WF-US-001、WF-US-003、WF-FR-006、WF-NFR-001
- Parallel: 否
- Conflicts with: T103、T105；共享 projection contract
- Goal: 把 SourceData 与 ViewSpec 确定性投影为图表和大纲共同使用的可见节点。
- Allowed files: `packages/editor/src/waterfall/waterfallTypes.ts`、`packages/editor/src/waterfall/projectWaterfall.ts`、`packages/editor/src/waterfall/formatWaterfall.ts`、`packages/editor/src/index.ts`、`packages/editor/tests/waterfall/projectWaterfall.test.ts`、`packages/editor/tests/waterfall/anchors.test.ts`、`packages/editor/tests/waterfall/groups.test.ts`、`packages/editor/tests/waterfall/determinism.test.ts`
- Test targets: `packages/editor/tests/waterfall/projectWaterfall.test.ts`、`packages/editor/tests/waterfall/anchors.test.ts`、`packages/editor/tests/waterfall/groups.test.ts`、`packages/editor/tests/waterfall/determinism.test.ts`
- Deliverables: WaterfallProjection types、projection、anchor/group calculations、determinism fixtures。
- Acceptance criteria: 正负、零值、subtotal、collapsed/expanded group 和 end validation 都正确；同一输入产生深度相等 projection。
- Definition of Done: 投影测试和 95% coverage 通过；无 React/G2 imports；错误返回领域 error。
- Validation commands: `pnpm test:unit -- packages/editor/tests/waterfall`；`pnpm test:coverage`；`pnpm typecheck`；`pnpm lint`
- TDD plan: RED：先覆盖简单累计，再覆盖负数、group、subtotal、invalid end；GREEN：实现单向纯投影；REFACTOR：提取 anchor segment 与 aggregate helpers。
- Packet path: `.ai-platform/specs/001-waterfall-editor-foundation/packets/T104.yaml`
- Evidence required: RED/GREEN 输出、fixture projection snapshots、coverage、changed files、diff summary、residual risk。
- Acceptance authority: 用户授权 Codex 对 T102-T104 执行独立 review 并验收；fresh 独立 review 无 Critical、High 或 Medium finding。

### Story S2 - 可操作组件

## T105 - 实现 React 工作台与 G2 渲染

- Status: Accepted
- Priority: P0
- Dependencies: T101、T102、T104
- Blocks: T106、T107、T108
- Story / Requirement: WF-US-001、WF-US-005、WF-FR-010、WF-FR-014、WF-NFR-004、WF-NFR-005
- Parallel: 否
- Conflicts with: T101、T106、T107；共享 component/styles/playground files
- Goal: 建立符合设计合同的 React editor shell、受控/非受控 session adapter、真实 G2 瀑布图和薄 playground。
- Allowed files: `package.json`、`pnpm-lock.yaml`、`vitest.config.ts`、`packages/editor/package.json`、`packages/editor/tsconfig.json`、`packages/editor/tsup.config.ts`、`packages/editor/src/components/**`、`packages/editor/src/styles/**`、`packages/editor/src/react/**`、`packages/editor/src/index.ts`、`packages/editor/tests/setup.ts`、`packages/editor/tests/components/**`、`packages/editor/tests/package/**`、`apps/playground/package.json`、`apps/playground/tsconfig.json`、`apps/playground/vite.config.ts`、`apps/playground/src/**`、`apps/playground/index.html`、`e2e/fixtures/**`、`e2e/rendering.spec.ts`
- Test targets: `packages/editor/tests/components/editor-modes.test.tsx`、`packages/editor/tests/components/states.test.tsx`、`packages/editor/tests/components/callbacks.test.tsx`、`e2e/rendering.spec.ts`
- Deliverables: FinancialChartEditor、toolbar/outline/chart/inspector shell、G2 lifecycle adapter、ready/empty/invalid states、real fixture playground。
- Acceptance criteria: 受控与非受控行为一致；真实 G2 chart 非空；组件卸载无 listener/chart 泄漏；目标视口无重叠。
- Definition of Done: component tests、Chromium render E2E、typecheck、lint、build 通过；视觉截图人工检查无阻断问题。
- Validation commands: `pnpm test:unit -- packages/editor/tests/components`；`pnpm build`；`pnpm test:e2e -- e2e/rendering.spec.ts`；`pnpm typecheck`；`pnpm lint`
- TDD plan: RED：先写模式、状态、callback component tests 和 nonblank browser assertion；GREEN：实现最小 shell 与 chart adapter；REFACTOR：拆分稳定 UI components 和 scoped styles。
- Packet path: `.ai-platform/specs/001-waterfall-editor-foundation/packets/T105.yaml`
- Evidence required: RED/GREEN 输出、desktop/compact/mobile screenshots、canvas pixel evidence、cleanup check、changed files、diff summary、residual risk。
- Acceptance authority: T105 已完成 fresh engineering、test 与 visual review，无 Critical、High 或 Medium finding；用户于 2026-07-15 明确接受。

## T106 - 实现排序、分组与折叠交互

- Status: Accepted
- Priority: P0
- Dependencies: T103、T104、T105
- Blocks: T107、T108
- Story / Requirement: WF-US-002、WF-US-003、WF-FR-007、WF-FR-008、WF-NFR-002、WF-NFR-003、WF-NFR-004
- Parallel: 否
- Conflicts with: T105、T107；共享 editor interaction components
- Goal: 让图表、大纲和键盘通过同一命令实现可信排序、分组、折叠与非法操作反馈。
- Allowed files: `package.json`、`pnpm-lock.yaml`、`packages/editor/package.json`、`packages/editor/src/components/**`、`packages/editor/src/interactions/**`、`packages/editor/src/styles/**`、`packages/editor/tests/setup.ts`、`packages/editor/tests/components/**`、`apps/playground/src/fixtures.ts`、`e2e/waterfall-editor.spec.ts`、`e2e/interaction-cancel.spec.ts`、`e2e/accessibility.spec.ts`、`e2e/performance.spec.ts`
- Test targets: `packages/editor/tests/components/outline.test.tsx`、`packages/editor/tests/components/keyboard.test.tsx`、`packages/editor/tests/components/group-actions.test.tsx`、`e2e/waterfall-editor.spec.ts`、`e2e/interaction-cancel.spec.ts`
- Deliverables: dnd-kit outline、chart Pointer Events adapter、drop indicator、selection/group actions、keyboard path、live feedback。
- Acceptance criteria: chart/outline/keyboard move 产生一致 ViewSpec；Escape/blur/invalid drop 不改状态；fixed item 有可解释拒绝；group collapse 数值正确。
- Definition of Done: unit/component/E2E 先红后绿；200 item interaction measurement 达标；axe 无 serious/critical violation。
- Validation commands: `pnpm test:unit -- packages/editor/tests/components/outline.test.tsx packages/editor/tests/components/keyboard.test.tsx packages/editor/tests/components/group-actions.test.tsx`；`pnpm test:e2e -- e2e/waterfall-editor.spec.ts e2e/interaction-cancel.spec.ts`；`pnpm test:a11y`；`pnpm test:performance`；`pnpm typecheck`；`pnpm lint`
- TDD plan: RED：分别覆盖 outline move、keyboard move、chart drop、cancel、group/collapse；GREEN：接入统一 commands；REFACTOR：抽取 interaction adapters，确保高频 pointer state 不进 React render loop。
- Packet path: `.ai-platform/specs/001-waterfall-editor-foundation/packets/T106.yaml`
- Evidence required: RED/GREEN 输出、相同 command parity 证据、cancel state snapshots、performance trace、axe result、changed files、diff summary、residual risk。
- Review state: fresh engineering/spec 与 visual/QA review 无 Critical、High 或 Medium finding；整行拖拽热区 amendment 后 component 70/70、unit 242/242、Chromium 21/21、已记录 200-item p95 30.0ms 和 package/build gates 全绿。
- Acceptance authority: 用户于 2026-07-16 完成整行拖拽热区复验并明确接受 T106。

## T106-CR001 - 递归分组与图表直接编排闭环

- Status: Accepted
- Priority: P0
- Dependencies: T102、T103、T104、T105、T106
- Blocks: T107 用户验收、T108
- Story / Requirement: WF-US-002、WF-US-003、WF-FR-003 至 WF-FR-009、WF-NFR-001 至 WF-NFR-004
- Parallel: 否
- Conflicts with: T107、T108；共享 domain schema、projection、public selection、chart adapter、outline、export 与 E2E
- Goal: 将单层 group 提升为无固定深度上限的递归有序森林，并通过图表柱拖动、空白框选、原子创建折叠、悬浮/聚焦组按钮和精确解组完成可发现的直接编排闭环。
- Allowed files: `.ai-platform/docs/**`、`.ai-platform/specs/001-waterfall-editor-foundation/**`、`.ai-platform/evidence/T106-CR001/**`、`packages/editor/src/domain/**`、`packages/editor/src/waterfall/**`、`packages/editor/src/interactions/**`、`packages/editor/src/components/**`、`packages/editor/src/react/**`、`packages/editor/src/export/**`、`packages/editor/src/styles/**`、`packages/editor/src/index.ts`、`packages/editor/tests/**`、`apps/playground/src/**`、`e2e/waterfall-editor.spec.ts`、`e2e/interaction-cancel.spec.ts`、`e2e/accessibility.spec.ts`、`e2e/export.spec.ts`、`e2e/performance.spec.ts`、`playwright.config.ts`、`package.json`
- Test targets: `packages/editor/tests/domain/validation.test.ts`、`packages/editor/tests/domain/commands.test.ts`、`packages/editor/tests/domain/history.test.ts`、`packages/editor/tests/domain/property-sequences.test.ts`、`packages/editor/tests/domain/persistence.test.ts`、`packages/editor/tests/waterfall/groups.test.ts`、`packages/editor/tests/components/group-actions.test.tsx`、`packages/editor/tests/components/outline.test.tsx`、`packages/editor/tests/components/keyboard.test.tsx`、`e2e/waterfall-editor.spec.ts`、`e2e/interaction-cancel.spec.ts`、`e2e/accessibility.spec.ts`
- Deliverables: recursive ViewSpec validator、moveGroup/createGroup contract、recursive projection、recursive outline、same-parent marquee、pending/drag gesture state、live reorder preview、real DOM group controls、atomic create-and-collapse、exact ungroup、persistence/export/accessibility parity。
- Acceptance criteria: 三层 fixture 可创建、折叠、展开、移动和解组；循环/多父/孤儿/跨段结构稳定拒绝；外层折叠往返保持后代状态；框选确认只增加一个 revision 和一个 undo entry；拖动预览不写 history；图表 hover/focus 与 outline/keyboard 都能操作正确 group；来源、金额、顺序和导出一致。
- Definition of Done: RED/GREEN/REFACTOR 证据完整；domain/property/component/real Chromium/axe/performance/persistence/export/package/build/type/lint/format 全绿；无 Critical/High/Medium review finding；任务进入 `Needs_Review`，等待用户验收。
- Validation commands: `pnpm test:unit -- packages/editor/tests/domain packages/editor/tests/waterfall packages/editor/tests/components`；`pnpm test:coverage`；`pnpm exec playwright test e2e/waterfall-editor.spec.ts e2e/interaction-cancel.spec.ts e2e/export.spec.ts --project=chromium`；`pnpm exec playwright test e2e/accessibility.spec.ts --project=chromium`；`pnpm test:performance`；`pnpm exec playwright test --project=chromium --project=chromium-performance`；`pnpm typecheck`；`pnpm lint`；`pnpm format:check`；`pnpm build`；`pnpm test:package`；`git diff --check`；artifact validator
- TDD plan: RED：先补递归 validation/command/projection/property tests，再补 marquee、原子创建折叠、live preview、group overlay 与 nested outline 交互测试；GREEN：实现最小递归树 helper、command handlers、projection 与 gesture adapters；REFACTOR：统一 parent/leaf traversal、保持 pointer 高频状态不进入 session render loop并清理单层假设。
- Packet path: `.ai-platform/specs/001-waterfall-editor-foundation/packets/T106-CR001.yaml`
- Evidence required: artifact approval、RED/GREEN 命令与预期失败、递归不变量矩阵、三层 projection snapshot、history identity、真实 Chromium 框选/拖动/双按钮证据、axe/performance/export/package 结果、changed files、diff、三层 review 与 residual risk。
- Review state: 基于渲染器真实水平边界和拖动柱宽的 X-only 碰撞、4px pending 阈值、回拖清除目标、锁定/只读点击选择及 pointer lifecycle 清理均已通过 component 与真实 Chromium 复验；无未解决 Critical、High 或 Medium finding。
- Acceptance authority: 用户于 2026-07-16 明确接受 T106-CR001；T107 兼容证据刷新与用户验收均已完成，T108 已解锁。

### Story S3 - 可恢复与可交付

## T107 - 实现持久化、导出与可访问性闭环

- Status: Accepted
- Priority: P0
- Dependencies: T103、T104、T105、T106、T106-CR001
- Blocks: T108
- Story / Requirement: WF-US-004、WF-US-005、WF-FR-011、WF-FR-012、WF-FR-013、WF-NFR-003、WF-NFR-007
- Parallel: 否
- Conflicts with: T105、T106、T106-CR001、T108；共享 public API、toolbar、chart adapter 和 E2E
- Goal: 完成 ViewSpec 解析/序列化、SVG/PNG export、公共 handle、图表文本摘要和无障碍状态。
- Allowed files: `package.json`、`pnpm-lock.yaml`、`packages/editor/package.json`、`packages/editor/tsup.config.ts`、`packages/editor/src/domain/persistence.ts`、`packages/editor/src/export/**`、`packages/editor/src/components/FinancialChartEditor.tsx`、`packages/editor/src/components/EditorToolbar.tsx`、`packages/editor/src/components/WaterfallCanvas.tsx`、`packages/editor/src/components/AccessibleChartSummary.tsx`、`packages/editor/src/components/editorMessages.ts`、`packages/editor/src/react/editorTypes.ts`、`packages/editor/src/styles/**`、`packages/editor/src/index.ts`、`packages/editor/tests/domain/persistence.test.ts`、`packages/editor/tests/components/accessibility.test.tsx`、`packages/editor/tests/export/**`、`packages/editor/tests/package/**`、`apps/playground/package.json`、`apps/playground/src/**`、`e2e/export.spec.ts`、`e2e/accessibility.spec.ts`
- Test targets: `packages/editor/tests/domain/persistence.test.ts`、`packages/editor/tests/components/accessibility.test.tsx`、`packages/editor/tests/export/**`、`e2e/export.spec.ts`、`e2e/accessibility.spec.ts`
- Deliverables: parse/serialize、export handle、SVG/PNG results、download example、summary/live region/focus closure。
- Acceptance criteria: round-trip 保持规范化 ViewSpec；不兼容 schema/source 明确拒绝；SVG/PNG 非空且匹配当前顺序；axe gate 通过。
- Definition of Done: unit/component/export E2E/axe/type/build 全绿；导出无隐式网络与敏感 metadata。
- Validation commands: `pnpm test:unit -- packages/editor/tests/domain/persistence.test.ts packages/editor/tests/components/accessibility.test.tsx packages/editor/tests/export`；`pnpm test:e2e -- e2e/export.spec.ts e2e/accessibility.spec.ts`；`pnpm test:a11y`；`pnpm build`；`pnpm typecheck`；`pnpm lint`
- TDD plan: RED：先写 persistence conflict、export blob、focus/summary tests；GREEN：实现 public APIs 和 adapters；REFACTOR：统一 structured errors 与 cleanup。
- Packet path: `.ai-platform/specs/001-waterfall-editor-foundation/packets/T107.yaml`
- Evidence required: RED/GREEN 输出、round-trip fixtures、export metadata/pixel evidence、axe report、changed files、diff summary、residual risk。
- Review state: 递归 ViewSpec round-trip、当前可见投影 JSON/SVG/PNG、共享 emphasis 样式、live preview 导出门禁、有限 public handle、递归可访问摘要、文件工作流与 cleanup 已完成；unit 295/295、selected Chromium 13/13、coverage/build/package/type/lint/format 全绿，独立复审无未解决 Critical、High 或 Medium finding。
- Acceptance authority: 用户于 2026-07-16 明确接受 T107；T108 已解锁。

## T108 - 完成集成、包质量与视觉验收

- Status: Accepted
- Priority: P0
- Dependencies: T101 至 T107
- Blocks: release candidate review
- Story / Requirement: WF-SC-001 至 WF-SC-005、WF-NFR-001 至 WF-NFR-007
- Parallel: 否
- Conflicts with: 所有实现任务；执行最终全量验证和必要的任务内修复
- Goal: 用真实浏览器、包消费、性能、覆盖率和视觉证据证明瀑布图基础切片可评审。
- Allowed files: `.github/workflows/ci.yml`、`package.json`、`playwright.config.ts`、`vitest.config.ts`、`e2e/**`、`packages/editor/tests/**`、`apps/playground/src/**`、`.ai-platform/specs/001-waterfall-editor-foundation/quickstart.md`、`.ai-platform/evidence/T108/**`、`.ai-platform/docs/release-report.md`；实现缺陷修复仅限 T108 执行包记录的窄范围 fix scope
- Test targets: `packages/editor/tests/**`、`e2e/**`、React 18.3/19.2 package consumer fixtures、visual screenshots
- Deliverables: CI、完整 validation suite、三浏览器结果、React 18.3/19.2 runtime consumer matrix、coverage、performance、package checks、desktop/compact/mobile screenshots、review evidence。
- Acceptance criteria: quickstart 成功；React 18.3 与 19.2 宿主均能安装、渲染和卸载公共组件；所有 quality gates 通过；无 Critical/High review finding；无严重可访问性问题；残余风险明确。
- Definition of Done: fresh full validation、spec compliance review、engineering review 和 QA review 完成，任务进入 `Needs_Review` 而非自动 Accepted。
- Validation commands: `pnpm format:check`；`pnpm lint`；`pnpm typecheck`；`pnpm test:coverage`；`pnpm build`；`pnpm test:package`；`pnpm test:react-matrix`；`pnpm test:browser-previous`；`pnpm test:e2e`；`pnpm test:a11y`；`pnpm test:performance`；`git diff --check`；artifact validator
- TDD plan: RED：为集成中发现的每个行为缺陷先添加回归测试；GREEN：在批准 fix scope 内修复；REFACTOR：只清理验证揭示的重复或不稳定测试设施。
- Packet path: `.ai-platform/specs/001-waterfall-editor-foundation/packets/T108.yaml`
- Evidence required: 完整命令与 exit code、coverage、三浏览器矩阵、package reports、screenshots、performance numbers、review findings、changed files、diff summary、residual risk。
- Review state: fresh validation、final patch/validator、browser/CI、engineering、visual/QA 与 spec/evidence reviews 全部通过，无未解决 Critical、High 或 Medium finding。
- Acceptance authority: 用户于 2026-07-18 明确接受 T108；T101-T108 任务图执行完成。

## Dependency Graph

```text
T101 -> T102 -> T103 -> T104 -> T105 -> T106 -> T106-CR001 -> T107 -> T108
  |                         ^
  +-------------------------+
```

任务按顺序执行。虽然部分测试文件理论上可并行，但共享 contracts 和当前无独立 worktree ownership，默认不并行，避免在基础模型尚未稳定时制造冲突。
