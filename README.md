# TellPlot

TellPlot 是基于 AntV G2 的轻量可编辑基础图表库。它为 React 应用提供瀑布图、分类条形图和分类柱状图，以及一致的数据、交互、配置和导出能力。

## 当前状态

G001 已验收。G002、G002-R1、G002-R2、G002-R3 与 G004 已完成实现，统一等待目标级验收。
`@tellplot/editor@1.0.0` 本地稳定版候选、发布门禁和隔离源码复演已经完成；npm publish、
GitHub Release 与生产网站部署均未执行。

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

本地网站包含以下入口：

- `/`：真实图表驱动的 TellPlot 首页。
- `/examples`：瀑布图、分类柱状图和分类条形图示例中心。
- `/docs`：安装、React 接入、数据/视图模型、配置和导出入口。
- `/playground`：亮色公共图表配置、独立视图状态与完整结构工作台。

## 当前文档

- [文档入口](docs/README.md)
- [产品路线图](docs/roadmap.md)
- [架构概览](docs/architecture.md)
- [入门与集成](docs/getting-started.md)
- [公共 API](docs/api.md)
- [错误处理](docs/errors.md)
- [图表配置边界](docs/configuration.md)
- [迁移与兼容](docs/migration.md)
- [版本与兼容政策](docs/versioning.md)
- [变更记录](CHANGELOG.md)
- [产品设计 SSOT](.ai-platform/docs/product-design.md)
- [项目章程](.ai-platform/memory/constitution.md)
- [技术决策记录](.ai-platform/docs/technology-decision-record.md)
- [目标与历史任务图](.ai-platform/docs/tasks.md)
- [交付状态报告](.ai-platform/docs/release-report.md)

## 第一阶段范围

- 财务瀑布图。
- 分类条形图与分类柱状图。
- 拖拽排序、递归分组与取消分组、折叠与展开；框选可在展开分组内建子组或跨边界建上层分组。
- 结构化大纲、撤销重做、保存视图、演示文稿友好导出。
- 类型化命令、可撤销历史和确定性图表不变量。

## 当前里程碑

- [瀑布图基础切片](.ai-platform/specs/001-waterfall-editor-foundation/spec.md)
- [实现计划](.ai-platform/specs/001-waterfall-editor-foundation/plan.md)
- [设计合同](.ai-platform/specs/001-waterfall-editor-foundation/design-contract.md)
- [任务图](.ai-platform/specs/001-waterfall-editor-foundation/tasks.md)
- [安全图表配置](.ai-platform/specs/003-chart-configuration-foundation/spec.md)
- [分类图与多图表架构](.ai-platform/specs/004-categorical-chart-validation/spec.md)
- [轻量图表库 Beta](.ai-platform/specs/005-lightweight-chart-library-beta/spec.md)
- [分组与跨层编辑体验](.ai-platform/specs/006-group-cross-level-experience/spec.md)
- [开源官网与示例中心](.ai-platform/specs/007-open-source-showcase/spec.md)
- [公共配置 API v1](.ai-platform/specs/009-public-configuration-api/spec.md)
- [首个稳定版 1.0](.ai-platform/specs/010-stable-v1-release/spec.md)
