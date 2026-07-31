# T125 Evidence Summary

- Task: T125 - 抽取 core 与框架无关状态引擎
- Status: Accepted
- Acceptance: 用户于 2026-07-30 随 G006 完成目标级验收
- Date: 2026-07-29
- Execution: Direct Execute；当前策略未授权 subagent，按 G006 连续目标由主 agent 执行

## Delivered

- 新增 `@tellplot/core@1.0.0` ESM/CJS/types package。
- 迁移 config、domain、projection、interaction policy 与 241 条既有不变量测试。
- 新增 framework-neutral `createEditorStore`，覆盖 controlled/uncontrolled、callbacks、selection、history 和 destroy。
- `@tellplot/editor` 通过 workspace public entry 消费 core；core 架构门禁禁止 React/Vue/G2 依赖和反向 import。

## Review

- Spec compliance: FRAMEWORK-FR-001/002/005/010 的 T125 范围满足。
- Bug/code quality: focused typecheck、unit 和 architecture 无 finding。
- QA acceptance: editor typecheck/build 与旧 public/release contract smoke test green。

## Residual Risk

完整 DOM editor 与 adapters 尚未迁移，由 T126-T129 顺序关闭；T125 未改变 UI 行为。
