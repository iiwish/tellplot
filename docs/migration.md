# TellPlot 包选择与状态迁移

## 包选择

所有场景安装同一个 `tellplot` 包：

| 场景                               | 公共入口                          |
| ---------------------------------- | --------------------------------- |
| 纯数据校验、命令或 SSR             | `tellplot/core`                   |
| 原生 DOM、Web Component 或其他框架 | `tellplot` 的 `createEditor`      |
| React 18/19                        | `tellplot/react` 的 `ChartEditor` |
| Vue 3                              | `tellplot/vue` 的 `ChartEditor`   |

React/Vue adapters 依赖同一个 imperative editor，不需要把状态或命令迁移到另一套实现。

## ViewSpec 迁移

持久化内容始终与原始 `SourceData` 一起校验：

```ts
import { parseViewSpec } from 'tellplot/core';

const restored = parseViewSpec(serialized, sourceData);
if (restored.ok) {
  editor.update({ config, view: restored.value, onViewChange });
}
```

TellPlot 不执行启发式 schema migration。dataset、schema generation、chart type 或 source family 不兼容时，
宿主应执行明确的数据迁移，或用 `createInitialViewSpec` 创建新视图。

## 接入检查

1. 只从 `tellplot` 声明的 package exports 导入，不导入 `src/` 或 `dist/`。
2. UI 接入只引入一次 `tellplot/styles.css`。
3. 受控模式只传 `view`，非受控模式可传 `defaultView`，两者互斥。
4. React/Vue 卸载由 adapter 自动销毁；imperative 接入显式调用 `destroy`。
5. 宿主命令使用唯一 ID、当前 `baseRevision` 和 `source: 'host'`。
6. 升级后运行 TypeScript strict、关键交互、导出与无障碍测试。
