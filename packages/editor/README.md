# TellPlot editor workspace layer

本目录是 TellPlot 的私有 imperative DOM/G2 编辑器层。完整 toolbar、outline、chart、inspector、交互、
历史、无障碍语义和共享 comparison SVG/PNG 导出都由该层唯一实现。

消费者应安装 `tellplot` 并从根入口使用 `createEditor`；本 workspace package 不独立发布。React/Vue 子路径
只映射本层生命周期，不复制编辑状态或 G2 runtime。公共合同见 [API 文档](../../docs/api.md)。
