# T122 / G002-R3 公共配置 API v1 交付摘要

## Metadata

- Goal: `G002-R3`
- Task: `T122`
- Packet: `EP-G002-R3-T122-A001`
- Status: `Accepted`
- Accepted on: 2026-07-29
- Date: 2026-07-23
- Branch: `codex/t112-categorical-data-contract`

## Outcome

`@tellplot/editor` 的普通 React 接入收敛为 `ChartEditor + ChartConfig`。开发者通过判别式
`type`、`data`、`appearance` 和 `editor` 描述图表，不再把内部组件参数或手工初始化 `ViewSpec`
当作基础画图配置。`ViewSpec` 继续独立保存顺序、分组、折叠、固定、注释和强调状态。

playground 左栏编辑真实公共 `tellplot.config.json`，高级标签页独立编辑
`tellplot.view.json`。合法配置实时驱动右侧图形；图形命令只回写 view；非法草稿保持可编辑且不改变
最后一次合法图表。

## Delivered

- 新增封闭、判别式 `ChartConfig` 与 `validateChartConfig`，覆盖 waterfall、bar、column。
- 新增公共 `ChartEditor` facade、受控 `view`、非受控 `defaultView` 和 `ChartEditorHandle`。
- package runtime 固定为 11 个导出，不暴露 `FinancialChart*`、G2Spec、Chart instance 或内部 adapter。
- 语义 appearance 使用 colors、axes、labels、tooltip、animation、groupRegion 和 numberFormat。
- editor 配置收纳 readOnly、historyLimit、panels、outline placement 和 inspector mode。
- playground 使用配置/视图双文件模型、亮色编辑器、严格 JSON 校验和双向同步。
- README、getting started、API、configuration、errors、migration 和网站示例统一到同一公共合同。
- 视觉复核发现非活动文件面板被 author CSS 覆盖 `hidden` 的问题；已修复并增加三浏览器回归断言。
- 用户批准的标签配置扩展支持显示、内外位置、0-24px 偏移、颜色、8-32px 字号、100-900
  字重和可选背景；字符串显示策略保持兼容。
- 数值标签、分类标签与分组标签继续使用 interval 之后的独立 G2 text mark，屏幕、SVG 和 PNG 共享
  同一 spec。`auto` 在移动视口让出空间，`always` 保留显式强制显示语义。
- G2 的 `labelTransform` 不处理独立 text mark，因此未开放无法可靠生效的碰撞选项、formatter、逐项
  callback 或 raw G2 label spec。

## TDD Receipt

- RED：public export/type consumer 因缺少 `ChartEditor`、`ChartConfig` 和 `validateChartConfig` 失败。
- RED：playground config/view parser 3/3 因公共解析函数不存在失败。
- GREEN：validator、facade、受控/非受控状态和双文件 parser focused tests 通过。
- REGRESSION：首次完整 E2E 为 174/177，定位为公共 invalid stage 缺少既有
  `data-tellplot="editor"` 兼容选择器；修复后 focused 3/3、完整 177/177。
- VISUAL REVIEW：Playwright 截图发现隐藏 tab panel 仍被 CSS 绘制；修复后 focused 12/12 和视觉复核通过。
- LABEL EXTENSION RED：对象式 value/group label 配置被旧 validator 拒绝，三类前景标记仍使用固定样式。
- LABEL EXTENSION GREEN：公共类型、validator、内部 resolver、waterfall/bar/column/group label
  mapping、导出共享 spec、实时示例和文档全部通过 focused 与发布级回归。

## Visual Evidence

- [桌面公共配置工作台](visual/playground-desktop-config.png)
- [移动工作台](visual/playground-mobile.png)

桌面截图显示单一活动配置文件、真实 G2 图形和右侧结构大纲；移动截图确认图形与工具栏无重叠并保持可达。

## Diff Evidence

- Baseline: `/tmp/tellplot-G002-R3-baseline.b4XnP2/worktree`
- Task-only patch: [diff.patch](diff.patch)
- Patch scope: 65 files；2513 insertions；1343 deletions
- Patch SHA-256: `92d7612cd9506d3a2986ff4dd044c7a9019434beb523a33aa908c2b7d6039c71`
- Patch excludes generated dist、coverage、Playwright output、node_modules 和 evidence 自身。

## Delivery Boundary

没有修改 dependency manifest、lockfile、`SourceData` / `ViewSpec` schema、命令协议、chart projection、
G2 runtime 或 export implementation。没有执行 stage、commit、push、PR、merge、npm publish、release
或部署。用户于 2026-07-29 完成目标级统一验收，G002-R3 / T122 状态为 `Accepted`。
