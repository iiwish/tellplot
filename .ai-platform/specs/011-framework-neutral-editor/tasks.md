# G006 框架无关编辑器架构 Goal Graph

## Metadata

- Feature ID: `011-framework-neutral-editor`
- Goal ID: `G006`
- Version: 1.0.0
- Status: Accepted
- Last updated: 2026-07-30
- Approval: 用户已批准目标、架构、breaking package/API 与目标内连续执行，并于 2026-07-30 完成目标级验收

## Epic E011 - Framework-neutral TellPlot

完整编辑器由 framework-neutral core/runtime 唯一拥有，React/Vue 只负责宿主适配；四包发布候选通过完整门禁。

## T125 - 抽取 core 与框架无关状态引擎

- Status: Accepted
- Priority: P0
- Dependencies: G006 用户批准；spec/plan/checklist/analysis Confirmed/Completed/Clear
- Blocks: T126、T127、T128、T129
- Story / Requirement: FRAMEWORK-US-001；FRAMEWORK-FR-001、002、005、010；FRAMEWORK-NFR-001、005、006
- Parallel: false
- Conflicts with: T126-T129；当前 package/source/import graph
- Goal: 建立无 DOM/UI framework 的 `@tellplot/core`，把领域、配置、投影、交互策略和 session store 收敛为唯一状态实现。
- Allowed files: `packages/core/**`、`packages/editor/src/{config,domain,charts,interactions}/**`、
  `packages/editor/tests/{config,domain,categorical,waterfall,interactions,fixtures}/**`、root workspace/build/lint/test config、
  `pnpm-lock.yaml`、`.ai-platform/evidence/T125/**`、本 feature task/packet 状态
- Test targets: core SSR import、public exports、config/domain/projection/interaction invariants、store controlled/uncontrolled lifecycle
- Deliverables: `@tellplot/core` package、framework-neutral `EditorStore`、无 DOM/framework import graph、迁移后的 core tests
- Acceptance criteria: core ESM/CJS/types 可消费；所有领域不变量 green；import core 不访问 DOM；editor 后续只能消费 core 公共入口
- Definition of Done: focused coverage、build、typecheck、architecture core gate 通过并写入 T125 evidence
- Validation commands: `pnpm --filter @tellplot/core test`；`pnpm --filter @tellplot/core typecheck`；
  `pnpm --filter @tellplot/core build`；`pnpm release:architecture`；`git diff --check`
- TDD plan: RED core package/import/store contracts；GREEN 移动并导出最小 core；REFACTOR 清理跨层 import 和测试位置
- Packet path: `.ai-platform/specs/011-framework-neutral-editor/packets/T125.yaml`
- Evidence required: `.ai-platform/evidence/T125/summary.md`、`test-results.md`、`diff.patch`

## T126 - 实现 imperative DOM/G2 完整编辑器

- Status: Accepted
- Priority: P0
- Dependencies: T125 Accepted
- Blocks: T127、T128、T129
- Story / Requirement: FRAMEWORK-US-001、004；FRAMEWORK-FR-003、004、005、006；FRAMEWORK-NFR-001 至 006
- Parallel: false
- Conflicts with: T125、T127；editor runtime、styles、E2E selectors
- Goal: 交付不依赖 React/Vue 的 `createEditor`，迁移完整图表、直接操作、大纲、Inspector、Toolbar、历史、导出和 a11y。
- Allowed files: `packages/editor/**`、`packages/core/src/**` 中经 T125 建立的 interaction/store 扩展、
  `e2e/**`、root test/build config、`pnpm-lock.yaml`、`.ai-platform/evidence/T126/**`、本 feature task/packet 状态
- Test targets: create/update/destroy、invalid/empty/read-only、toolbar、outline pointer/keyboard、chart direct manipulation、
  grouping/annotation/history/export、focus/a11y、resource cleanup、多实例
- Deliverables: `@tellplot/editor` framework-neutral package、imperative instance、完整 DOM workbench 与 styles
- Acceptance criteria: editor/editor tarball 无 React/Vue/dnd-kit/lucide；完整现有主流程和 E2E 通过；destroy 无残留 listener/G2 root
- Definition of Done: TDD、focused unit/component/E2E、a11y/performance green，T126 evidence 完整
- Validation commands: `pnpm --filter @tellplot/editor test`；`pnpm --filter @tellplot/editor typecheck`；
  `pnpm --filter @tellplot/editor build`；`pnpm test:e2e`；`pnpm test:a11y`；`pnpm test:performance`；`git diff --check`
- TDD plan: RED imperative/UI/lifecycle contracts；GREEN 稳定 DOM shell 与逐功能迁移；REFACTOR controllers/disposer/event delegation
- Packet path: `.ai-platform/specs/011-framework-neutral-editor/packets/T126.yaml`
- Evidence required: `.ai-platform/evidence/T126/summary.md`、`test-results.md`、`diff.patch`

## T127 - React 与 Vue 薄适配包

- Status: Accepted
- Priority: P0
- Dependencies: T126 Accepted
- Blocks: T128、T129
- Story / Requirement: FRAMEWORK-US-002、003、004；FRAMEWORK-FR-007、008；FRAMEWORK-NFR-002、005、007
- Parallel: false
- Conflicts with: T126、T128；workspace dependencies 与 adapter fixtures
- Goal: 交付只映射 imperative instance 的 React 18/19 与 Vue 3 adapters，证明无第二套状态或 runtime。
- Allowed files: `packages/react/**`、`packages/vue/**`、adapter package fixtures/tests、root workspace/build/lint/test config、
  `pnpm-lock.yaml`、`.ai-platform/evidence/T127/**`、本 feature task/packet 状态
- Test targets: React Strict Mode/controlled/uncontrolled/ref/unmount；Vue v-model/emits/expose/update/unmount；adapter import graph
- Deliverables: `@tellplot/react`、`@tellplot/vue` ESM/CJS/types/styles contracts 与双框架 consumer fixtures
- Acceptance criteria: adapters 共享 editor instance；React/Vue package 分别只声明自身 framework peer；行为和 ViewSpec 一致
- Definition of Done: adapter unit/package/matrix tests、typecheck、build 通过并写入 T127 evidence
- Validation commands: `pnpm --filter @tellplot/react test`；`pnpm --filter @tellplot/vue test`；`pnpm typecheck`；
  `pnpm build`；`pnpm test:framework-matrix`；`git diff --check`
- TDD plan: RED React/Vue contract consumers；GREEN lifecycle wrappers；REFACTOR shared adapter test scenarios without shared runtime state
- Packet path: `.ai-platform/specs/011-framework-neutral-editor/packets/T127.yaml`
- Evidence required: `.ai-platform/evidence/T127/summary.md`、`test-results.md`、`diff.patch`

## T128 - 迁移 playground、文档与消费合同

- Status: Accepted
- Priority: P0
- Dependencies: T127 Accepted
- Blocks: T129
- Story / Requirement: FRAMEWORK-FR-009、010、011；FRAMEWORK-NFR-005、007
- Parallel: false
- Conflicts with: T127、T129；playground imports、public docs、release metadata
- Goal: 让真实站点和全部文档只消费新公共包，建立 imperative/React/Vue 可复制接入与包消费验证。
- Allowed files: `apps/playground/**`、`docs/**`、`README.md`、`CHANGELOG.md`、`SUPPORT.md`、`package.json`、
  `packages/*/README.md`、package consumer fixtures/tests、`scripts/release/**`、`pnpm-lock.yaml`、
  `.ai-platform/evidence/T128/**`、本 feature task/packet 状态
- Test targets: playground build/routes/workbench、docs examples compile、local links、imperative/React/Vue tarball consumers
- Deliverables: 迁移后的 playground、framework-neutral architecture/API/getting-started 文档、四包 metadata/consumer contracts
- Acceptance criteria: playground 不私有导入；三种 quickstart 可编译；旧 React-only 产品描述和依赖合同无残留
- Definition of Done: site tests、build、package consumers、release audit、link scan 通过并写入 T128 evidence
- Validation commands: `pnpm --filter @tellplot/playground test`；`pnpm build`；`pnpm test:package`；
  `pnpm release:audit`；`git diff --check`
- TDD plan: RED public package/docs/site contract；GREEN imports/metadata/docs migration；REFACTOR canonical examples and package scripts
- Packet path: `.ai-platform/specs/011-framework-neutral-editor/packets/T128.yaml`
- Evidence required: `.ai-platform/evidence/T128/summary.md`、`test-results.md`、`diff.patch`

## T129 - 完整质量矩阵与发布候选 evidence

- Status: Accepted
- Priority: P0
- Dependencies: T128 Accepted
- Blocks: G005 公开稳定版发布
- Story / Requirement: 全部 FRAMEWORK-FR、FRAMEWORK-NFR 与 FRAMEWORK-SC
- Parallel: false
- Conflicts with: 远程 Git、publish、release、schema 或新图表范围
- Goal: 验证 framework-neutral 1.0 本地候选，关闭 review findings，形成可复演的四包目标级 evidence。
- Allowed files: 全部 G006 相关源码、tests、docs、release scripts、package metadata、`.ai-platform/**`；禁止远程状态
- Test targets: architecture、format、lint、typecheck、coverage、build、package/framework matrix、E2E、a11y、performance、
  current/previous browser、artifact/rehearse、三层 review
- Deliverables: 四包 tarball/manifests、architecture report、isolated-source receipt、review、G006 summary/release report
- Acceptance criteria: FRAMEWORK-SC-001 至 007 全部满足；无 unresolved Critical/High/Medium；不执行远程动作
- Definition of Done: 完整目标级结果、验证和残余风险已交付；用户于 2026-07-30 验收 G006/T125-T129
- Validation commands: `pnpm release:architecture`；`pnpm release:audit`；`pnpm format:check`；`pnpm lint`；
  `pnpm typecheck`；`pnpm test:coverage`；`pnpm build`；`pnpm test:package`；`pnpm test:framework-matrix`；
  `pnpm test:e2e`；`pnpm test:a11y`；`pnpm test:performance`；`pnpm test:browser-previous`；
  `pnpm release:artifact`；`pnpm release:rehearse`；strict artifact validator；`git diff --check`
- TDD plan: RED release/architecture/package drift tests；GREEN gate updates and defect fixes；REFACTOR evidence aggregation；FINAL fresh full matrix
- Packet path: `.ai-platform/specs/011-framework-neutral-editor/packets/T129.yaml`
- Evidence required: `.ai-platform/evidence/T129/summary.md`、`test-results.md`、`diff.patch`、`review.md`、
  `architecture-report.md`、`tarball-manifest.json`、`isolated-source-receipt.md`
