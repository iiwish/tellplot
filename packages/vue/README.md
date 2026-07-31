# @tellplot/vue

TellPlot 的 Vue 3 薄适配器，支持 `v-model:view`。

在已有 Vue 3.5 项目中安装：

```bash
pnpm add @tellplot/core @tellplot/vue @antv/g2@5.4.8
```

```vue
<script setup lang="ts">
import { ChartEditor, type ChartConfig } from '@tellplot/vue';
import '@tellplot/vue/styles.css';

const config = {
  type: 'column',
  data: {
    schemaVersion: '2.0.0',
    dataKind: 'categorical',
    datasetId: 'revenue-by-region',
    items: [
      { id: 'east', label: 'East', amount: 128 },
      { id: 'west', label: 'West', amount: 96 },
    ],
  },
} as const satisfies ChartConfig;
</script>

<template>
  <ChartEditor :config="config" />
</template>
```

不传 `view` 时组件管理编辑状态；受控接入使用 `v-model:view`，也可以用 `default-view` 指定非受控初值。
组件 expose `focus`、`getView` 和 `exportImage`，卸载时自动销毁 imperative instance。

`render-error` 在图表渲染失败时发送稳定 issue，并在恢复成功后发送 `null`。

组件只映射 `@tellplot/editor` 生命周期；编辑状态、G2 和 UI 不在本包重复实现。完整 emits、状态和错误合同见
[入门](https://github.com/iiwish/tellplot/blob/main/docs/getting-started.md)与
[公共 API](https://github.com/iiwish/tellplot/blob/main/docs/api.md)。License: MIT。
