# TellPlot

TellPlot 是基于 AntV G2 的框架无关可编辑基础图表库。它提供瀑布图、分类条形图和分类柱状图，完整编辑器
可直接挂载到任意 DOM 容器，也可通过 React 18/19 或 Vue 3 薄适配器接入。

## 包结构

- `@tellplot/core`：配置、数据模型、投影、命令、历史和无 DOM `EditorStore`。
- `@tellplot/editor`：imperative DOM/G2 编辑器、交互、导出和样式。
- `@tellplot/react`：React 生命周期适配器。
- `@tellplot/vue`：Vue 3 生命周期与 `v-model:view` 适配器。

编辑动作只产生新的 `ViewSpec`，不会改写宿主持有的 `SourceData`。直接操作、结构大纲、键盘和宿主命令
进入同一套确定性命令与历史。

## 快速开始

在已有宿主项目中选择对应入口。G2 使用经过兼容与安全复核的精确版本：

```bash
# 原生 DOM 或其他 framework
pnpm add @tellplot/core @tellplot/editor @antv/g2@5.4.8

# React 18.3 / 19
pnpm add @tellplot/core @tellplot/react @antv/g2@5.4.8

# Vue 3.5
pnpm add @tellplot/core @tellplot/vue @antv/g2@5.4.8
```

三种可复制示例、公共配置和受控状态说明见[入门与三种集成](docs/getting-started.md)。每个 UI 入口都需
导入自身的 `styles.css`；原生 DOM 接入还需在卸载时调用 `destroy()`。

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

本地网站入口包括产品首页、示例中心、开发者文档和完整编辑工作台。网站使用
`@tellplot/react`，编辑能力仍由 `@tellplot/editor` 唯一实现。

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

`1.0.0` 四包本地候选的公开 npm、Git tag、GitHub Release 和生产部署均需独立授权。

## License

MIT
