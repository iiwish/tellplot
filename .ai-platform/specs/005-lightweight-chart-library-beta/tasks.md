# G002 轻量图表库 Beta Goal Graph

## Metadata

- Feature ID: `005-lightweight-chart-library-beta`
- Goal ID: `G002`
- Version: 0.6.0
- Status: Needs_Review
- Last updated: 2026-07-23
- Approval: 用户于 2026-07-20 明确批准 G002；目标与 G002-R1、G002-R2、G002-R3 一起等待统一验收

## T117 - 交付 G002 轻量图表库 Beta

- Status: Needs_Review
- Priority: P0
- Dependencies: G001 / T101-T116 Accepted
- Blocks: npm publish、G003 新图表扩展
- Story / Requirement: G002；BETA-FR-001 至 BETA-FR-008；BETA-NFR-001 至 BETA-NFR-006
- Story / Requirement extension: BETA-FR-009；BETA-NFR-007
- Story / Requirement extension: BETA-FR-010；BETA-NFR-008
- Parallel: false；G002 作为一个目标级 governed task 连续执行
- Conflicts with: 新图表、runtime 行为、依赖升级、远程 Git、npm publish、正式 release
- Goal: 交付可安装、可理解、可集成、可验证的 `@tellplot/editor@0.1.0-beta.1` release candidate。
- Allowed files: `README.md`、`CHANGELOG.md`、`docs/**`、`package.json`、`packages/editor/package.json`、
  `packages/editor/README.md`、`packages/editor/LICENSE`、`packages/editor/src/domain/commands.ts`、
  `packages/editor/tests/domain/commands.test.ts`、`packages/editor/tests/package/**`、
  `packages/editor/tests/react-matrix/run-react-matrix.mjs`、`packages/editor/src/react/editorTypes.ts`、
  `packages/editor/src/index.ts`、`packages/editor/src/components/FinancialChartEditor.tsx`、
  `packages/editor/src/components/EditorToolbar.tsx`、`packages/editor/src/components/PanelRail.tsx`、
  `packages/editor/src/styles/editor.css`、
  `packages/editor/tests/components/**`、`apps/playground/src/**`、`e2e/**`、`.ai-platform/**`
- Read-only behavior: chart projection/rendering、chart interactions、export implementation and source/view schema
- Test targets: public exports、command source、compile-checked quickstart、tarball allowlist、ESM/CJS/types、
  React 18/19、当前/上一浏览器、a11y、performance、export regression
- Deliverables: beta package metadata；package README/LICENSE；developer docs；CHANGELOG；tarball；目标级 evidence
- Internal workstreams:
  - beta API and command-source contract audit
  - developer documentation and compile-checked examples
  - package metadata, README, LICENSE, changelog and tarball allowlist
  - package/React/browser/a11y/performance release-candidate validation
  - playground usage dialog、copy feedback and responsive accessibility
  - persistent developer code pane、optional panel layout and visibility combinations
  - safe public config/view files、light editor and deterministic bidirectional synchronization
  - goal-level spec/engineering/QA review and evidence
- Acceptance criteria: BETA-SC-001 至 BETA-SC-008 全部满足；无 unresolved Critical/High/Medium finding；
  npm publish、远程 Git 和正式 release 未执行。
- Definition of Done: TDD receipt、完整 release-candidate gates、三层 review 与目标级 evidence 完整；G002 和
  T117 同步进入 `Needs_Review`，只向用户请求一次目标验收。
- Validation commands: `pnpm format:check`；`pnpm lint`；`pnpm typecheck`；`pnpm test:unit`；
  `pnpm test:coverage`；`pnpm build`；`pnpm test:package`；`pnpm test:react-matrix`；`pnpm test:e2e`；
  `pnpm test:a11y`；`pnpm test:performance`；`pnpm test:browser-previous`；strict artifact validator；
  `git diff --check`
- TDD plan: RED 锁定 beta version、tarball、quickstart 和 command source；GREEN 做最小 package/docs 修改；
  REFACTOR 只清理陈旧公共文案。
- Packet path: `.ai-platform/specs/005-lightweight-chart-library-beta/packets/T117.yaml`
- Evidence required: `.ai-platform/evidence/T117/` 中的目标级 summary、tests、diff、pack manifest、API surface 和 review
- User review: 等待 G002 系列目标级统一验收。
- Execution variance: compile-checked CSS import 需要为 styles subpath 声明 `types` condition；React tarball
  consumer 的 manifest assertion 同步验证该 metadata，不改变 runtime、CSS 内容或导入路径。
- Review state: spec compliance、bug/code quality 与 QA review 无 blocking finding；417/417 unit/coverage、
  current browser 150/150、previous browser 150/150 + WebKit 18.4 50/50、a11y 33/33、React 18/19、package、
  type/lint/format/build/performance 均通过。
- Review correction: T117-A002 演示页使用入口通过 410/410 unit/coverage、current browser 138/138、previous
  browser 138/138 + WebKit 18.4 46/46、a11y 33/33、package、type/lint/format/build/performance。
- Review correction: T117-A003 已完成并通过复核；桌面常驻代码、右侧 panel tabs、可选布局 API 和
  独立 panel 显隐组合均已验证，默认组件布局保持不变。
- Review correction: T117-A004 已完成并通过复核；playground 使用安全 JSON 编辑和确定性双向同步；
  G002-R3 将其公开文件收敛为独立 `ChartConfig` 与 `ViewSpec`。
