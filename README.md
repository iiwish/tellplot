# TellPlot

TellPlot 是面向财务分析与汇报场景的可编辑叙事图表项目。产品通过直接操作、结构化大纲和确定性命令帮助用户调整图表顺序、分组、折叠层级与表达重点，同时保持原始财务数据可追溯且不被编辑动作改写。

## 当前状态

产品设计、技术方案以及 T101-T108 任务图均已确认并完成验收。仓库包含可嵌入的 `@tellplot/editor` React 组件包、薄参考编辑器、完整测试分层和本地发布候选证据；npm publish 与正式版本发布尚未执行。

## 本地开发

```bash
pnpm install --frozen-lockfile
pnpm dev
```

参考编辑器默认由 Vite 启动。核心质量命令：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build
pnpm test:package
```

## 当前文档

- [产品设计 SSOT](.ai-platform/docs/product-design.md)
- [项目章程](.ai-platform/memory/constitution.md)
- [技术决策记录](.ai-platform/docs/technology-decision-record.md)
- [任务图](.ai-platform/docs/tasks.md)
- [交付状态报告](.ai-platform/docs/release-report.md)

## 第一阶段范围

- 财务瀑布图。
- 分类条形图与分类柱状图。
- 拖拽排序、分组与取消分组、折叠与展开。
- 结构化大纲、撤销重做、保存视图、演示文稿友好导出。
- AI-ready 命令模型；AI 只能通过可预览的确定性命令修改图表视图。

## 当前里程碑

- [瀑布图基础切片](.ai-platform/specs/001-waterfall-editor-foundation/spec.md)
- [实现计划](.ai-platform/specs/001-waterfall-editor-foundation/plan.md)
- [设计合同](.ai-platform/specs/001-waterfall-editor-foundation/design-contract.md)
- [任务图](.ai-platform/specs/001-waterfall-editor-foundation/tasks.md)
