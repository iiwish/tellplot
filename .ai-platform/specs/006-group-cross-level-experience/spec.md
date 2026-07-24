# G002-R1 分组与跨层编辑体验 Spec

## Metadata

- Feature ID: `006-group-cross-level-experience`
- Goal ID: `G002-R1`
- Version: 0.2.0
- Status: Confirmed
- Last updated: 2026-07-24
- Approval: 用户明确批准 G002-R1，并于 2026-07-24 批准递归层级框选与嵌套分组语义

## Goal

让用户无需理解内部树约束即可选择分组、跨分组拖拽节点，并通过展开分组区域直接理解图表层级。所有
结构变化继续进入现有确定性命令、历史和不变量校验；G2 继续拥有图形、场景边界、比例尺和动画。

## User Outcomes

- 点击已经选中的分组只表达当前分组上下文，不显示“所选节点必须连续且位于同一父级”。
- 创建分组动作只在多选上下文出现，非法多选的原因只约束创建动作，不污染普通选择反馈。
- 用户可以在图表和结构大纲中把 item 或 group 拖到其他合法分组之前、之后或内部。
- 用户可以在展开分组内框选连续成员创建子分组；框选跨越分组边界时，界面明确选择整个分组并与相邻
  节点创建上层分组。
- 两成员分组移出一个节点后自动解散，剩余节点保持原位置，一次撤销恢复完整分组和移动。
- 展开分组在 waterfall、column 和 bar 中显示可配置背景，屏幕与 SVG/PNG 语义一致。

## Requirements

### R1-FR-001 上下文选择

Inspector 根据选择上下文显示动作。单个 group 显示分组信息与取消分组；单个 item 显示项目详情；至少
两个节点的选择才显示创建分组表单。重复点击当前节点保持幂等选择，不触发分组校验错误。

### R1-FR-002 语义落点

Pointer adapter 使用 `before | after | inside` 三种内部落点。普通 item 支持 before/after；group 的边缘
支持 before/after，中心支持 inside。展开 group 的可见子节点边缘属于该 group container。

### R1-FR-003 跨层移动

图表拖拽候选覆盖当前 G2 projection 中所有可移动可见节点，不限定来源节点的直接父级。结构大纲和图表
把相同语义落点解析为现有 `{ containerId, index }` 命令，不增加公共 command wire 字段。

### R1-FR-004 原子解散

跨容器移动让来源 group 只剩一个直接子节点时，命令执行器用剩余节点替换来源 group，并删除来源 group
及其 collapsed、annotation 和 emphasis 状态。操作只产生一个 history entry；undo/redo 完整恢复或重放。
锁定、循环、瀑布 segment、来源覆盖和最少两成员不变量保持阻断。

### R1-FR-005 展开分组区域

每个展开 group 投影为稳定 region，横向范围从第一个到最后一个可见后代，纵向范围包围成员柱形的实际
数值上下界。G2 在主 interval mark 之前渲染有界矩形背景，并在 interval 之后用独立 text mark 渲染空间
允许时的 group label。label 锚定第一个可见成员的柱顶并保留紧凑间距，使用高于柱形和值标签的明确
`zIndex`；嵌套标签按 depth 错位，不能被柱形或同起点父分组覆盖。折叠 group 不渲染展开区域。区域不得
遮挡轴、Tooltip、拖拽和框选。group 与数值标签均不使用卡片式背景，只保留 1.5px 圆角高对比文字光晕。
数值标签也由 interval 之后的独立 text mark 绘制，锚定柱形真实端点并按方向向柱内偏移 2px；它使用高于
柱形、低于 group label 的明确 `zIndex`，避免 range interval 的自动标签几何和内部绘制顺序遮挡文字。

### R1-FR-006 安全配置

`FinancialChartAppearance` 增加可选 `groupRegion`：

- `enabled?: boolean`，默认 `true`。
- `fillOpacity?: number`，默认 `0.06`，运行时限制为 `0` 至 `0.2`。
- `label?: 'auto' | 'never'`，默认 `auto`。

区域颜色继承 `palette.group`。配置是宿主呈现状态，不进入 `ViewSpec`，不开放原始 G2 options 或 callback。

### R1-FR-007 一致反馈

拖拽预览在图表与大纲同步表达 before/after/inside；inside 使用区域强调而不是边线。取消、非法目标和锁定
反馈保持稳定，readOnly 和 reduced motion 始终优先。

### R1-FR-008 递归层级框选

图表框选与结构大纲多选把原始可见节点归一化为最低共同容器下的直接子节点：

- 选择只位于同一展开分组内时，连续的直接子节点创建该分组的子分组。
- 选择跨越分组边界时，命中的后代提升为共同父级下的完整 group 节点，再与其他选中节点创建上层分组。
- 归一化后的节点按树顺序去重，不自动补齐未选择的普通间隔节点；非连续结果继续拒绝。
- 归一化覆盖非根分组的全部直接子节点时视为已有完整分组，不创建会使父分组只剩一个直接子节点的
  冗余层级。
- 图表、大纲、Inspector 与创建分组对话框在提交前显示归一化后的节点和来源范围。公共
  `createGroup` command wire、同父级与连续性校验保持不变。

## Non-Functional Requirements

- R1-NFR-001：无新增、删除或升级 dependency。
- R1-NFR-002：TypeScript strict；禁止 `any`、`@ts-ignore`、`@ts-expect-error`。
- R1-NFR-003：所有树变换、来源覆盖、聚合、undo/redo 和跨 segment 具有确定性测试。
- R1-NFR-004：背景 mark 不进入主 element hit set，不降低 200-item 150ms 性能预算。
- R1-NFR-005：screen、SVG、PNG、React 18/19、ESM/CJS/types 和浏览器矩阵保持绿色。
- R1-NFR-006：键盘 into/out 路径、ARIA tree 状态和 reduced motion 不回归。

## Non-Goals

- 新图表家族、多序列、数据编辑、确定性层级框选提升之外的任意自动重组或多节点批量拖拽。
- 允许持久化单成员 group。
- 原始 `G2Spec`、chart instance、内部 scene adapter 或 drop callback 公共出口。
- 新拖拽、动画、状态或渲染依赖。
- npm publish、远程 Git、PR、merge、tag 或正式 release。

## Success Criteria

- R1-SC-001：单 group/item 选择不显示创建分组错误；合法/非法多选的分组动作上下文准确。
- R1-SC-002：waterfall、column、bar 和 outline 跨分组 before/after/inside 主流程通过真实交互测试。
- R1-SC-003：两成员来源 group 自动解散，三成员来源 group 保留，嵌套、锁定、segment 和 undo/redo 通过。
- R1-SC-004：默认、关闭、透明度边界、label 模式、嵌套和折叠区域通过 spec/export/视觉测试。
- R1-SC-005：完整 unit/coverage、package、React、current/previous browsers、a11y、performance 和 export gates
  通过，无 unresolved Critical/High/Medium finding。
- R1-SC-006：展开分组组内子分组、跨边界整组提升、嵌套共同父级、冗余全选、非连续、锁定、segment
  与单步 undo/redo 均有 component/domain/真实浏览器证据。

## Approval Gate

用户已批准 G002-R1 的目标范围、公共可选配置和连续执行方式。目标内内部任务不设置逐项用户验收；
dependency、schema、breaking API、远程 Git、publish 和 release 仍需独立明确授权。
