# T105 Evidence Summary

## Metadata

- Task: T105 - 实现 React 工作台与 G2 渲染
- Attempt: T105-A001
- Status: Accepted
- Branch: `codex/reset`
- Date: 2026-07-15
- Execution: Codex direct TDD execution with delegated RED tests、independent engineering review and visual QA

## Scope Result

实现公共 `FinancialChartEditor`、受控/非受控 controller、toolbar/outline/chart/inspector 工作台、真实 G2 waterfall canvas、ready/empty/invalid/chart-error 状态和薄 playground。组件只消费 T104 `projectWaterfall` 结果，不复制瀑布累计逻辑；T106 交互和 T107 持久化/导出保持未实现。

## Locked Behavior

- `viewSpec` 为受控模式：命令 callback 可以产生候选视图，但宿主回传前可见视图不偏离 props。
- `defaultViewSpec` 为非受控初始值：accepted command 立即提交；同一 React batch 的连续命令串行消费最新 session。
- 同时提供两种 view props 进入确定性 `INVALID_CONFIGURATION /viewSpec` 状态，不创建 G2。
- `readOnly` 阻止写命令，不触发 accepted/rejected host callback；选择仍可用。
- accepted callback 顺序固定为 `onCommand` 后 `onViewSpecChange`；rejected 只触发 `onCommandRejected`。
- 四类 host callback 异常均被隔离，日志只包含 callback identity，不包含调用方错误文本或财务值。
- 每个有效 projection 只保留一个活动 Chart；projection 替换和卸载均 destroy exactly once，过期异步完成不更新或记录错误。
- G2 使用 browser-only dynamic import，公共 ESM/CJS 包可在 Node 中安全导入，G2/React/React DOM 保持 peer external。
- 1440px 使用 280px / flexible chart / 300px 三栏；1024px 使用 inspector drawer；390px 使用 outline/inspector 全屏 sheet。
- 小于等于 759px 时隐藏 Canvas 内数值标签以避免拥挤，金额继续由 outline 和可访问摘要提供。

## TDD Evidence

RED:

- controller mode/callback tests 在 controller/component 不存在时失败。
- ready/empty/invalid/G2-error 和 lifecycle tests 在公共组件不存在时 7/7 失败。
- Chromium rendering tests 在 ready editor root 和真实 canvas 不存在时 3/3 失败。
- package runtime/type/CSS consumers 在 `FinancialChartEditor` 与 `styles.css` subpath 未导出时失败。

GREEN:

- 22 个 component tests 覆盖 mode lock、prop echo、连续 dispatch、readOnly、callback 顺序/隔离、selection copy、四种 editor state、i18n、mobile label policy、G2 failure/recovery 和 lifecycle。
- Fresh 全量 194 tests 通过；aggregate statements 95.83%、branches 92.16%、functions 93.03%、lines 95.74%。
- Chromium 真实 G2 三视口 3/3 通过；canvas painted pixels 为 desktop 76,185、compact 55,071、mobile 23,087。
- build、strict project typecheck、ESLint、Prettier、publint、ATTW、ESM/CJS runtime、CSS consumer 和 declaration consumer 全部通过。

## Visual QA

| Dimension | Score / 2 | Evidence |
| --- | ---: | --- |
| Product fit and artifact primacy | 2.0 | 图表是主工作面，无 landing page、hero 或 card grid |
| Composition and hierarchy | 2.0 | desktop 三栏、compact drawer、mobile sheets 均保持图表可见 |
| Typography and density | 1.9 | 13px operator UI、tabular numbers、稳定 toolbar/panel hierarchy |
| Color and state clarity | 1.8 | positive/negative/total/invalid 状态可区分；桌面柱内标签对比度仍有 Low 风险 |
| Responsive and interaction safety | 2.0 | 三视口 overflow 0、Canvas 非空、移动端可见文字重叠 0 |

Average: 1.94 / 2；核心维度无 0。

Required captures:

- `screenshots/desktop-ready.png`
- `screenshots/compact-ready.png`
- `screenshots/mobile-ready.png`
- `screenshots/invalid-data.png`

## Changed Files

- Public/editor: `packages/editor/src/index.ts`、`src/react/**`、`src/components/**`、`src/styles/editor.css`
- Build/package: `package.json`、`pnpm-lock.yaml`、`vitest.config.ts`、editor/playground manifests、tsconfig、tsup/Vite config
- Tests: `packages/editor/tests/components/**`、`tests/setup.ts`、`tests/package/**`、`e2e/rendering.spec.ts`
- Playground: `apps/playground/index.html`、`src/App.tsx`、`src/main.tsx`、`src/fixtures.ts`、`src/playground.css`
- Governance/evidence: T105 packet、task/analysis/release state and `.ai-platform/evidence/T105/**`

## Independent Review Verdict

- Engineering review initially found two Medium issues: `readOnly` did not block dispatch and synchronous uncontrolled dispatch could overwrite an accepted command. Both received failing regression tests and implementation fixes.
- Test review initially found five Medium coverage gaps: selection alias、all callback exception paths、pending unmount、async Chart timing and compact/mobile painted pixels. All are closed with observable assertions.
- Final engineering re-review found one Low recovery issue where a successful same-projection retry retained an earlier render alert. A RED regression reproduced it; the current-generation success path now clears the issue, and the follow-up review reports Low 0.
- Final engineering、test and visual reviews report no Critical、High or Medium finding.
- 用户于 2026-07-15 明确接受 T105；T106 可以按已批准依赖图进入执行。

## Residual Risk

- Desktop/compact Canvas value labels use a fixed dark fill and can have modest contrast on colored bars. Outline and text summary are redundant sources; T107 accessibility closure should apply a verified label contrast strategy.
- CSS package consumers verify subpath、side effects、non-empty output、`.gt-editor` scope and absence of `:root/html/body`; they do not yet parse every selector to reject all possible future global selectors.
- G2 5.4.8 transitive declarations conflict with TypeScript 6 DOM declarations. `skipLibCheck` is scoped to editor/playground projects; project source remains strict and packed declaration consumers pass.
- Playground emits a roughly 1.3 MB lazy G2 chunk. The editor package keeps G2 external; bundle/performance budgets remain T108 scope.

## Scope Confirmation

- 未实现 drag/drop、reorder、group/collapse command controls、undo/redo UI、persistence、SVG/PNG export、AI、backend 或 network call。
- 未暴露 controller、dispatch、projection 或 G2 instance。
- 未新增动画库；DOM motion 为 scoped CSS，Canvas motion 由 G2 负责并遵循 reduced motion。
- 未执行 commit、push、PR、merge、publish 或其他远端写操作。
