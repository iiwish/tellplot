# TellPlot 图表配置边界

## 目标

TellPlot 提供稳定、可测试、与财务语义一致的配置层。宿主可以调整常见呈现方式，但不能覆盖会破坏财务投影、拖拽命中、导出一致性或可访问性的 G2 内部配置。

## 公共配置

`FinancialChartEditor` 通过 `chartAppearance` 接收 `FinancialChartAppearance`：

- `title`：图表可见标题、导出标题和无障碍摘要标题。
- `palette`：起点、正向、负向、小计、分组和终点的财务语义色。
- `axis`：X/Y 坐标轴是否显示。
- `valueLabels`：`auto`、`always` 或 `never`。
- `tooltip`：是否启用 G2 图形 Tooltip；导出图像不包含交互 Tooltip。
- `animation`：启用状态和有限时长；系统 reduced motion 始终优先。
- `numberFormat`：有限的小数位和币种显示方式。

未提供的字段使用 TellPlot 默认值。运行时的非有限数字、越界小数位、空颜色和空标题回退到安全默认值，不进入领域状态。

```tsx
import { FinancialChartEditor } from '@tellplot/editor';
import '@tellplot/editor/styles.css';

<FinancialChartEditor
  sourceData={sourceData}
  chartAppearance={{
    title: '经营利润桥',
    palette: {
      positive: '#168363',
      negative: '#D5524A',
    },
    axis: { x: true, y: true },
    valueLabels: 'auto',
    tooltip: true,
    animation: { enabled: true, duration: 160 },
    numberFormat: {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      currencyDisplay: 'narrowSymbol',
    },
  }}
/>;
```

语义色使用具体的 3、4、6 或 8 位十六进制颜色，例如 `#168363`；不接受依赖宿主样式表的 CSS variable，确保独立 SVG/PNG 导出得到相同颜色。`duration` 取 0 到 1000 毫秒，数字格式的小数位取 0 到 6。`maximumFractionDigits` 小于最小小数位时会自动提升到相同值。配置对象按不可变 React props 使用；宿主修改配置时应传入新对象。

## 内部所有权

以下能力不属于稳定公共配置：

- G2 `data` 与 transform。
- `encode.x`、`encode.y`、`encode.key` 和内部 color domain。
- X band 几何、稳定 node ID 和场景命中边界。
- G2 chart instance、renderer 和事件注册。
- 拖拽状态机、Pointer capture 和落点计算。
- 任意 `G2Spec` merge、spec transform 或未约束回调。

## 为什么不开放原始 G2Spec

TellPlot 的交互依赖稳定的节点编码、图形边界和屏幕/导出共享 spec。任意覆盖可能让视觉结果与 `ViewSpec`、无障碍摘要或命令历史不一致。需要增加呈现能力时，应先把真实需求定义为 TellPlot 语义配置，再由 adapter 映射到 G2。

## 持久化边界

`chartAppearance` 是宿主级呈现配置，不写入 `ViewSpec`。顺序、分组、折叠、注释和强调继续由 `ViewSpec` 保存。需要让某项呈现配置随视图持久化时，必须通过单独 schema 版本决策。
