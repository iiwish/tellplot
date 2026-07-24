# T117 / G002 Review

## Spec Compliance

- BETA-SC-001: package README quickstart 由独立 strict TypeScript consumer 编译，React 18/19 tarball consumer
  均渲染真实非空 G2 canvas。
- BETA-SC-002: runtime exports 精确为十个，declarations leak scan 为 0。
- BETA-SC-003: dry-run tarball 为 `0.1.0-beta.1`，13 个文件全部在 allowlist 内。
- BETA-SC-004: publint、ATTW、ESM、CJS 和 types consumers 全绿。
- BETA-SC-005: 完整 release-candidate gates 通过。
- BETA-SC-006: playground 使用入口在桌面和 390 x 844 移动视口可用；dialog、tabs、copy feedback、Escape
  focus return 和 serious/critical axe 扫描通过当前与上一浏览器矩阵。
- BETA-SC-007: 桌面端左代码/中图表/右 panel rail 布局、默认布局兼容、单 panel 与全隐藏组合、
  标签键盘导航和移动端 dialog 均由 component/package/current/previous-browser tests 覆盖。
- BETA-SC-008: 左侧合法 source/appearance 修改更新真实 G2 图形，右侧创建分组回写 revision/group，非法
  JSON 保留且图形状态不变；亮色主题、移动 dialog 和 ARIA 状态通过当前/上一浏览器矩阵。

Result: PASS；Critical/High/Medium findings 0。

## Bug And Code Quality

- `CommandSource` 类型和 runtime parser 使用同一 closed set；负例验证 `ai` 被稳定拒绝。
- styles export 的 `types`/`default` conditions 由 package、type consumer 和 React tarball manifest 共同验证。
- package dependencies 与 peer ranges 未增加、删除或升级。
- chart projection、G2 runtime、chart interactions 和 export behavior 未修改。
- task-only diff 仅包含 G002 artifacts、docs、package metadata、contract tests 和单一 command-source 收窄。
- T117-A003 增加可选 `FinancialChartEditorLayout`、可访问 panel rail 和响应式开发者布局；不传入 `layout`
  时保持大纲左侧、检查器右侧，`panels` 继续独立控制显隐。
- 示例引用真实 `FinancialChartEditor`、`WaterfallSourceData`、`FinancialChartAppearance`、
  `FinancialChartEditorPanels`、`FinancialChartEditorLayout` 和 styles subpath。
- native dialog 负责 modal/focus boundary，三个 ARIA tabs 支持方向键/Home/End，代码滚动区可聚焦，复制状态
  使用 polite live region；没有增加依赖或引入第二套文档 runtime。
- T117-A004 的文档解析器只接受封闭 JSON 字段并复用公共 source/view validators；不执行输入代码，也不导出
  新 runtime API。原生 textarea、行号 gutter、320ms 延迟与立即应用按钮不依赖 Monaco/CodeMirror。
- 双向状态边界清晰：左侧合法文档替换受控 props，右侧既有 `onViewSpecChange` 只回写 view；金额不会被
  图表交互反向修改。非法草稿与最后一次合法图形身份分离。

Result: PASS；actionable findings 0。

## QA Acceptance

- unit/coverage、build、package、React、current/previous browsers、a11y、performance 全部通过。
- 现有 waterfall/bar/column screen、direct manipulation、history、persistence 和 SVG/PNG E2E 连同新增双向
  编辑场景共 150/150 回归通过。
- quickstart 在确认默认 G2 展开动画完成后才执行 canvas hit test；连续 current Chromium 与 clean
  previous-browser matrix 通过，锁定反馈、revision 和树顺序断言保持。
- npm publish、远程 Git 和正式 release 未执行。

Result: PASS；G002 / T117 可进入 `Needs_Review`。

## Residual Risk Classification

- Low: 原生 textarea 不提供完整 IDE 级语法高亮；当前亮色、行号、复制、立即应用和错误路径已满足轻量
  演示目标，避免引入重型编辑器依赖。
- Low: waterfall performance 保留 150ms gate 持续监测。
- Low: G2 bundle warning 属于既有构建提示，不构成当前行为或 package contract failure。
- Low: registry publish/install 尚未执行，属于明确排除范围而非缺失的本地 release-candidate gate。
