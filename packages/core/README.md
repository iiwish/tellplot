# TellPlot core workspace layer

本目录是 TellPlot 的私有、框架无关领域层，包含配置、数据、视图、命令、历史、投影、持久化、交互策略和
`EditorStore`。它不访问 DOM、G2、React 或 Vue，并由 `tellplot` 与 `tellplot/core` 公共入口统一分发。

消费者应安装 `tellplot`，不得依赖本 workspace package 名称或内部源码路径。公共合同见
[API 文档](../../docs/api.md)。
