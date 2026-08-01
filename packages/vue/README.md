# TellPlot Vue workspace layer

本目录是 TellPlot 的私有 Vue 3 生命周期适配层。它只创建宿主容器并映射 props、emits、expose、
`v-model:view` 与卸载，不拥有 EditorStore、G2 或第二套编辑 UI。

消费者应安装 `tellplot`，从 `tellplot/vue` 导入 `ChartEditor`，并导入 `tellplot/styles.css`。本 workspace
package 不独立发布。公共合同见 [API 文档](../../docs/api.md)。
