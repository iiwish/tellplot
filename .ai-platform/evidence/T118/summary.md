# T118 / G002-R1 交付摘要

## Outcome

G002-R1 完成上下文分组动作、跨层 before/after/inside 编辑、按展开区域边界退出分组、两成员来源分组
原子解散，以及由 G2 统一渲染的可配置展开分组区域。waterfall、column、bar、结构大纲、键盘、
SVG/PNG 和宿主调用继续进入同一套确定性 ViewSpec 命令与历史；没有引入第二渲染器、依赖、schema
或原始 G2 公共出口。

## Delivered

- Inspector 仅在至少两个节点的选择上下文显示创建分组；单 group 只显示分组信息和取消分组。
- pointer 内部语义统一为 `before | after | inside`；group 中部命中 inside，边缘保持 before/after。
- 图表拖拽候选覆盖 G2 当前投影中的全部可移动可见节点，图表与大纲共享同一 target resolver。
- 图表在 pointer down 时从 G2 scene bounds 投影来源分组边界；成员边缘内继续排序，指针越过展开分组
  边界即以该 group 的 before/after 退出，不必先碰撞下一个外部柱；继续命中外部柱后恢复标准目标
  碰撞。嵌套分组按实际跨越的最外层边界退出。
- 首成员柱的折叠和取消分组动作在普通 click 后保持可见；只有指针位移达到 4px 拖拽阈值后才隐藏。
- 跨容器移动使来源 group 只剩一个直接子节点时，命令原子替换并清理 group-only 状态；一次 undo/redo
  完整恢复或重放。
- `FinancialChartAppearance.groupRegion` 提供 `enabled`、有界 `fillOpacity` 和 `label`；默认开启。
- 展开分组通过 G2 `range` 在 interval 前绘制为横向与数值范围均有界的矩形，继承 `palette.group`；inside
  预览提升区域强调，折叠父级同时隐藏其展开后代区域。
- 区域标签由 interval 后的 G2 `text` mark 绘制，锚定首个可见成员柱顶、使用明确前景 `zIndex` 和紧凑
  层级错位；数值标签由另一个 interval 后的 G2 `text` mark 绘制，锚定真实端点并向柱内偏移 2px。两类
  标签均不使用独立底框，只保留 1.5px 圆角高对比文字光晕。
- 数值标签使用独立 `labelId/categoryId` 数据，不复用可拖拽柱形的 `nodeId`，因此不进入 G2 scene 的编辑
  候选集合；waterfall、column 和 bar 的直接拖拽保持原合同。
- screen、SVG 和 PNG 使用同一 canonical region projection，密集画布隐藏区域标签并关闭背景动画。
- public types、package README、API 和 configuration 文档已同步。

## Scope Integrity

- dependency manifest 和 lockfile：未修改。
- `SourceData` / `ViewSpec` wire schema：未修改。
- 公共 command wire：未修改。
- `any`、`@ts-ignore`、`@ts-expect-error`：未引入。
- correction commit：`42c0342`；remote Git、push、PR、publish、release 未执行。

## Quality

- full unit/coverage：52 files，453/453 passed；总 lines 87.10%、branches 81.90%。
- current Chromium/Firefox/WebKit：180/180；a11y：45/45。
- previous Playwright release：180/180；WebKit 18.4：60/60。
- React 18.3.1 / 19.2.7、publint、ATTW、ESM/CJS/types、tarball contract、build 全部通过。
- 三层 review 无 unresolved Critical/High/Medium finding。
- 聚合 `pnpm test:performance` clean exact-command pass：waterfall p95 69.6ms，categorical p95 96.3ms，
  30 samples、root commit delta 0，均低于 150ms 预算。

## Residual Risks

- Low：本机长浏览器矩阵期间图形系统负载较高，200-item performance 会产生环境抖动；150ms 预算、
  30 samples 和 assertion 均未弱化，原始诊断样本保留在 `test-results.md`。
- Low：playground 保留既有 G2 chunk size warning；本目标没有新增依赖或引入第二运行时。
- Low：跨层编辑仍只移动单个 node，不包含多节点批量拖拽，符合明确 non-goal。

## Acceptance Gate

G002-R1 / T118 的实现、review 和聚合性能门禁均已完成，状态为 `Needs_Review`，与 G002、G002-R2、
G002-R3 统一等待用户目标级验收。npm publish、远程 Git 和正式 release 未获授权。
