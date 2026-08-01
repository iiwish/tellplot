# TellPlot

TellPlot 是基于 AntV G2 的框架无关可编辑基础图表库。它提供瀑布图、分类条形图和分类柱状图，完整编辑器
可直接挂载到任意 DOM 容器，也可通过 React 18/19 或 Vue 3 薄适配器接入。

## 分发结构

TellPlot 对外只发布 `tellplot`。根入口提供数据、命令与 imperative 编辑器，`tellplot/core`、
`tellplot/react` 和 `tellplot/vue` 提供隔离的按需入口。仓库内部继续按 core、editor、React 和 Vue
分层，框架适配器不拥有第二套编辑状态或 G2 runtime。

编辑动作只产生新的 `ViewSpec`，不会改写宿主持有的 `SourceData`。直接操作、结构大纲、键盘和宿主命令
进入同一套确定性命令与历史。

## 快速开始

在已有宿主项目中安装一个包。G2 使用 TellPlot 内部经过兼容与安全复核的精确版本：

```bash
pnpm add tellplot
```

三种可复制示例、公共配置和受控状态说明见[入门与三种集成](docs/getting-started.md)。每个 UI 入口都需
导入统一的 `tellplot/styles.css`；原生 DOM 接入还需在卸载时调用 `destroy()`。

## 本地开发

```bash
pnpm install --frozen-lockfile
pnpm dev
```

主要质量命令：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm build
pnpm test:package
pnpm test:framework-matrix
```

本地网站入口包括产品首页、示例中心、开发者文档和完整编辑工作台。网站通过 `tellplot/react`
消费公共包，编辑能力仍由内部 framework-neutral editor 唯一实现。

## 文档

- [文档入口](docs/README.md)
- [入门与三种集成](docs/getting-started.md)
- [公共 API](docs/api.md)
- [架构概览](docs/architecture.md)
- [配置边界](docs/configuration.md)
- [错误处理](docs/errors.md)
- [包选择与状态迁移](docs/migration.md)
- [版本与兼容政策](docs/versioning.md)
- [产品设计 SSOT](.ai-platform/docs/product-design.md)

`tellplot@1.0.0` 的公开 npm、Git tag、GitHub Release 和生产部署均经过独立发布闸门。

## License

MIT
