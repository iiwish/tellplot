# G006 Requirements Checklist

## Metadata

- Version: 1.0.0
- Status: Completed
- Source: `.ai-platform/specs/011-framework-neutral-editor/spec.md`
- Last updated: 2026-07-29

## Checklist Scope

检查框架无关架构、完整编辑器迁移、React/Vue 适配、生命周期、包边界与发布质量是否足以进入执行。

## Requirement Quality Checks

- [x] 框架无关的含义同时覆盖 public API、依赖树、产物和运行时 ownership。[Clarity]
- [x] 四个 package 的职责、依赖方向和禁止依赖明确。[Architecture]
- [x] imperative create/update/destroy 与实例方法可测。[Testability]
- [x] 完整编辑器能力清单覆盖图表、直接操作、大纲、Inspector、历史、导出与 a11y。[Coverage]
- [x] React 18/19 与 Vue 3 的 props/events/ref/expose 合同明确。[Integration]
- [x] controlled/uncontrolled、非法状态、快速 update 和重复 destroy 已定义。[Edge cases]
- [x] SourceData/ViewSpec/command 不变量和 G2 ownership 未放宽。[Consistency]
- [x] 性能、a11y、SSR import、隐私、包格式和浏览器矩阵可验证。[NFR]
- [x] 未公开旧 API 不兼容与远程发布边界明确。[Scope]
- [x] 每个 `FRAMEWORK-FR-*` 和 `FRAMEWORK-NFR-*` 均有 task coverage。[Traceability]

## Findings Summary

- Critical: 0
- High: 0
- Medium: 0
- Low: 0

## Resolution Notes

用户已明确选择真正框架无关的 core/runtime、完整编辑器迁移与 React/Vue 薄适配，并接受发布前 breaking
package/API 调整。实现不得以 Vue 内嵌 React root 或打包 React runtime 替代该合同。

## User Review Gate

用户于 2026-07-29 对上述方案给出明确批准并要求连续完成 G006；checklist 无阻断项。
