# T106 Evidence Summary

## Metadata

- Task: T106 - 实现排序、分组与折叠交互
- Attempt: T106-A001
- Status: Accepted
- Branch: `codex/reset`
- Date: 2026-07-16
- Execution: Codex TDD execution with delegated RED work、real Chromium validation、independent engineering/visual review and user-acceptance hit-target amendment

## Scope Result

图表、大纲和键盘通过同一 `executeCommand` 路径完成 `moveItem`；大纲支持从可拖动行正文直接起拖，不再要求精确命中 24px grip，同时保留无修饰键多选、创建分组、折叠、展开和取消分组。图表与大纲共享语义落点，活动手势支持 Escape、blur、pointercancel、无目标释放以及 ViewSpec/projection/readOnly 更新取消。实现保留单一 G2 Chart 实例、latest-wins render queue、隐私安全的行内反馈、模态焦点管理、reduced motion 和 200 项性能边界。

T106 未改变领域命令、瀑布投影、公共 API 或 SourceData/ViewSpec 语义；未引入 Motion、Framer Motion、GSAP、全局 store、第二个 renderer、持久化或导出。

## Locked Behavior

- chart、outline、keyboard 使用相同 post-removal target 语义，三条路径产生相同根顺序。
- chart/outline 拖动时同步显示同一语义目标；图表落点位置来自 G2 scene datum 与 bounds，不按 Canvas 宽度猜测类别。
- 同一目标内 100 次 pointermove 不增加 `FinancialChartEditor` root commit；目标切换才更新语义 preview。
- fixed item、跨 segment、两项分组 child 移出等非法操作不提交 revision/history，并只输出 code 与通用文案。
- 连续、直接根级、未 pinned contribution 可用原生 checkbox 在触摸设备无修饰键多选；显式非空组名后创建分组。
- group create/collapse/expand/ungroup 保持 amount、sourceIds 与根顺序守恒；折叠组金额只来自 T104 projection。
- 大纲保留 `tree/treeitem/aria-multiselectable`、36px row、roving focus、disclosure button 与锁定状态；未锁定行正文是鼠标/触控笔拖拽热区，checkbox/disclosure 不触发拖拽，grip 保留触摸可靠区且不进入 Tab 顺序。
- modal 打开后获得焦点、Tab 被约束在 dialog、Escape 关闭并恢复触发按钮焦点。
- G2 和 row committed transition 使用 160ms `cubic-bezier(0.2, 0, 0, 1)`；reduced motion 将非必要 duration 置零但保留目标和状态。
- projection/locale/motion 更新复用同一 Chart；新请求覆盖旧请求，卸载只 destroy 一次且清理 listener、pointer capture、rAF 与 pending render。

## TDD Evidence

RED:

- 初始 31 个 T106 component tests 中 22 个按预期失败、9 个既有边界通过；失败集中在 dnd-kit outline、chart adapter、keyboard、group/collapse、cancel 与 lifecycle 缺失。
- 初始 real Chromium 15/15 按预期失败；ready root 存在，但 move/group/cancel/axe/performance 合同尚未实现。
- 独立 review 后新增 modal focus、触摸 checkbox 多选、跨 surface target、valid-to-valid controlled update cancel、locale feedback、精确 easing 与 label halo 回归；focused RED 为 9 failed / 39 passed。
- 最终 engineering re-review 证明受控更新后 dnd-kit sensor 仍可通过后续 move/up 提交旧手势；新增 stale-session 回归先复现旧 command。首轮 guard 阻止提交后，follow-up RED 又证明 dnd-kit 行仍处于 dragging/transform；最后用父级 layout effect 在受控 commit 内释放旧指针，复现 passive-effect 窗口中的旧 command。最终以 `useLayoutEffect` scope invalidation、session epoch remount、active guard、焦点恢复和立即复用断言闭环。
- 用户验收复测测得 267x36px 行中只有 24x32px grip 可起拖，实际命中面积约 8%；新增 row-body 回归从 label 区按下后仍得到 `idle`，按预期 RED。

GREEN:

- Review regression focused run 48/48 通过；整行热区 amendment 的 focused outline tests 11/11 通过。
- 全部 editor component tests 7 files / 70 tests，fresh 全量 19 files / 242 tests 通过。
- Fresh coverage 为 statements 92.33%、branches 87.02%、functions 92.94%、lines 92.42%。
- 整行热区 amendment 后完整 real Chromium 21/21 通过，覆盖 row-body parity、group lifecycle、12 类 cancel/reject、5 个 axe 场景、reduced motion 与 200 项性能。
- 200 contribution / 202 marks、30 次完整拖动样本，nearest-rank p95 为 30.0ms，门槛为 150ms；同一目标 pointermove root commit delta 为 0。
- build、strict typecheck、ESLint、Prettier、publint、ATTW、ESM/CJS/types consumers 与 `git diff --check` 全部通过。

## Visual QA

| Dimension | Score / 2 | Evidence |
| --- | ---: | --- |
| Information hierarchy and legibility | 2.0 | chart 为主工作面，outline 数值与 Canvas halo 标签清晰 |
| State feedback continuity | 2.0 | chart 与 outline 同步落点，selection/drop/focus/rejection 连续可辨 |
| Responsive and accessibility | 1.9 | 390x844 group flow 可完成，modal 无裁切且焦点闭环 |
| Visual consistency and restraint | 1.9 | 1440 三栏稳定，overlay 与目标线不挤压布局，白字绿底主动作对比明确 |
| Motion and reduced-motion safety | 2.0 | 160ms committed motion 符合合同，reduced motion 保留完整目标信息 |

Average: 1.96 / 2；核心维度无 0。

Required captures:

- `screenshots/desktop-drag-target.png`
- `screenshots/collapsed-group.png`
- `screenshots/mobile-group-actions.png`
- `screenshots/reduced-motion.png`

## Changed Files

- Dependencies/config: `package.json`、`pnpm-lock.yaml`、`packages/editor/package.json`
- Components/styles: `packages/editor/src/components/{EditorToolbar,FinancialChartEditor,InspectorPanel,OutlinePanel,PanelOverlay,WaterfallCanvas,editorMessages}.tsx|ts`、`packages/editor/src/styles/editor.css`
- Interaction adapters: `packages/editor/src/interactions/{chartPointer,groupSelection,moveTargets}.ts`
- Tests: component callback/state additions、`group-actions.test.tsx`、`keyboard.test.tsx`、`outline.test.tsx`、`overlay.test.tsx`、四个 T106 E2E files
- Fixture: `apps/playground/src/fixtures.ts` 的确定性 200 contribution 数据集
- Governance/evidence: T106 packet、task/analysis/release state 与 `.ai-platform/evidence/T106/**`

## Independent Review Verdict

- Engineering/spec/visual review 发现性能争用证据、跨 surface target、触摸多选、活动手势 stale state、modal focus、对比度、grip Tab 和 easing 等问题；最终 re-review 继续发现 dnd-kit stale command、残留 visual transform 与 passive-effect pointerup 竞态，每项均先补失败回归再修复。
- 原完整实现的 independent engineering/spec 与 visual/QA 复审无 Critical、High 或 Medium finding；整行热区 amendment 另经 targeted diff review，未改变 domain、projection、public API、键盘路径或触摸滚动边界，无新增 Critical、High 或 Medium finding。
- 用户于 2026-07-16 完成整行拖拽热区复验并明确接受 T106；T107 已解锁，T108 继续等待 T107。

## Residual Risk

- T106 的浏览器合同以 Chromium 为验收环境；Firefox/WebKit 与 React 版本矩阵属于 T108。
- 已记录的 30 个性能样本最大值为 30.0ms、p95 为 30.0ms；整行热区 amendment 后 21-test Chromium run 再次通过 `<=150ms` 门禁，T108 继续在完整矩阵中监控尾延迟。
- Playground production build 的 lazy G2 chunk 约 1.3MB；editor package 保持 G2 peer external，bundle budget 属于 T108。
- 持久化、SVG/PNG export 与最终可访问摘要闭环属于 T107，当前不可发布。

## Scope Confirmation

- 未修改 domain command、controller public surface、waterfall projection 或财务金额语义。
- 未新增持久化、导出、AI、backend、network、routing 或公共 G2/dispatch handle。
- 未执行 commit、push、PR、merge、publish 或其他远端写操作。
