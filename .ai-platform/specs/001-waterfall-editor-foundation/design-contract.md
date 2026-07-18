# 瀑布图编辑器设计合同

## Metadata

- Version: 0.2.0
- Status: Confirmed
- Surface: desktop-first operational interactive tool
- Last updated: 2026-07-16

## Product Brief

- Pitch: 为财务分析人员提供可信、可直接操作、可嵌入业务系统的瀑布图叙事编辑器。
- Primary audience: 高频制作经营分析和 PPT 汇报的财务分析人员。
- Secondary audience: 负责嵌入和维护组件的 React 开发人员。
- Unique value: 图表操作始终受财务不变量保护，并与精确结构大纲共享一套命令。
- Platform: 桌面 Web 与嵌入式 React surface；移动端保证可查看和完成核心操作，不做专项优化。

## Design Thesis

视觉方向采用“运营级克制 + 财务批注感”。界面像一张被精心排版的分析工作台，而不是 BI Dashboard、营销页或卡片集合。图表始终是第一视觉中心，大纲负责精确控制，检查器只展示当前选择相关信息。

Signature interaction：柱子拖动越过同父级插入边界时，受影响项目立即预排；空白区域拖动显示框选，确认名称后创建并折叠分组；提交后柱子在 160ms 内稳定到新位置和正确瀑布高度。

## Layout Contract

- App top bar: 52px，高度稳定，包含数据集名称、undo、redo、导出菜单和视图状态。
- Main workbench: `grid-template-columns: 280px minmax(520px, 1fr) 300px`。
- Outline pane: 最小 240px、最大 360px，可由宿主隐藏。
- Chart stage: 最小高度 560px，画布不放入装饰卡片，使用完整中央工作区。
- Inspector: 300px，显示选择、分组与注释；无选择时展示校验摘要。
- 1024px 以下: inspector 变为右侧 drawer，outline 保持 248px。
- 760px 以下: outline 与 inspector 使用全屏 sheet，chart stage 占满主区；主操作始终可达且文本不重叠。

## Color Tokens

- `--tp-bg: #F3F5F4`
- `--tp-surface: #FFFFFF`
- `--tp-surface-subtle: #EAEEEC`
- `--tp-text: #18211D`
- `--tp-text-muted: #5F6B65`
- `--tp-border: #D5DBD7`
- `--tp-border-strong: #AAB5AF`
- `--tp-accent: #126E57`
- `--tp-accent-hover: #0E5B48`
- `--tp-accent-soft: #DCEFE8`
- `--tp-positive: #168363`
- `--tp-negative: #D5524A`
- `--tp-total: #315C8C`
- `--tp-warning: #A46812`
- `--tp-danger: #B93832`
- `--tp-focus: #0D66D0`

颜色只表达选择、金额方向、总额和错误，不用大面积单一色填充页面。正负颜色必须同时配合符号、标签或图例，不以颜色作为唯一信息。

## Typography

- UI: `Inter, "Noto Sans SC", "PingFang SC", system-ui, sans-serif`。
- Numeric: 同一字体栈，启用 `font-variant-numeric: tabular-nums`。
- Metadata: `ui-monospace, SFMono-Regular, Menlo, monospace`。
- Body: 13px/20px。
- Compact label: 12px/16px。
- Panel heading: 14px/20px，600 weight。
- Chart title: 18px/26px，650 weight。
- 不使用 viewport 宽度缩放字体，不使用负 letter-spacing。

## Spacing And Shape

- Base unit: 4px。
- Control heights: icon 32px、default 36px、compact row 36px。
- Panel padding: 12px；chart stage padding: 20px 24px 16px。
- Border radius: controls 5px、menus/modals 6px、重复 item 4px。
- Shadow 只用于 menu、drawer、drag overlay；静态 panel 使用边框，不使用浮动卡片阴影。

## Components And States

- Top bar: icon buttons with Lucide icons, tooltips, disabled reason for undo/redo。
- Outline row: drag handle、expand/collapse、label、amount、lock status；稳定 36px 行高。
- Chart stage: title、plot、drop indicator、marquee、selection ring、group action overlay、text summary。
- Emphasis: `highlight` 保持 100% opacity，并使用 `#18211D` 3px stroke；`muted` 使用 28% opacity。屏幕 Canvas、PNG 与离屏 SVG 复用同一个 G2 chart spec，不允许各自解释强调样式。
- Group action overlay: 使用 Lucide 的真实 DOM icon button；折叠组显示展开，展开父组的首个可见节点显示收起，同一锚点可同时显示两个动作。
- Group dialog: 框选两个以上合法节点后显示紧凑标题对话框；Enter 确认，Escape 取消，确认只产生一个 createGroup command。
- Inspector: selection details、source count、group actions、annotation field、validation summary。
- Command feedback: inline status strip and `aria-live`，不使用阻断 toast 代替字段反馈。
- Export menu: SVG、PNG、ViewSpec JSON 三项，导出中显示 progress state；存在 live reorder preview 时图像导出返回结构化 `EXPORT_UNAVAILABLE /export`，避免 PNG 与 SVG 捕获不同顺序。
- Empty/error/loading: 使用同一工作台骨架，不跳转到营销式空页面。

每个 interactive component 必须覆盖 default、hover、focus-visible、active、disabled、loading 和 error 中适用的状态。

## Motion Contract

- Hover/focus color: 100ms `ease-out`。
- Row and bar committed reorder: 160ms `cubic-bezier(0.2, 0, 0, 1)`。
- Panel enter/exit: 180ms，同一 easing，位移不超过 12px。
- Dragged item: 直接跟随 pointer，不使用 spring。
- Reorder preview: pointer down 时固化真实 G2 scene 水平边界并保持 `pending-bar`；水平位移达到 4px 后才显示 drag overlay 和计算落点。拖动柱的左/右边缘沿 X 轴越过同父级相邻柱的右/左边缘后更新临时 projection，Y 轴和柱高不参与碰撞；回拖到原位清除临时落点，预览不写入 history。锁定柱与只读模式仍允许点击选择，锁定柱的拖动尝试不创建 drag preview。
- Drop indicator: opacity 80ms，不改变布局尺寸。
- Reduced motion: duration 0ms，保留 selection、drop 和 validation state。
- Motion ownership: G2 负责画布图形；CSS/dnd-kit 负责 DOM；不引入 Motion。

## Accessibility Contract

- 所有 icon button 有可访问名称和 tooltip。
- 大纲遵循 tree/treeitem 或经过验证的等价语义，层级、展开和选择状态可读。
- 键盘排序提供显式命令，不要求用户模拟 pointer drag。
- 焦点环使用 2px `--tp-focus` 加 2px offset。
- 图表提供可读标题、摘要和当前顺序列表；Canvas 不是唯一信息源。
- hover-only group action 必须在 selection、focus-visible 和键盘大纲中提供等价路径。
- 触控目标最小 32px，关键主操作 36px。

## Forbidden Patterns

- 不创建 landing page、hero 或功能介绍卡片。
- 不使用渐变、装饰性光球、玻璃拟态、大圆角或嵌套卡片。
- 不在界面放置教程式长文、键盘快捷键说明段落或自我介绍文案。
- 不用动画掩盖命令失败，不让动画阻塞下一次输入。
- 不在 chart stage 上覆盖会遮挡数据的永久浮层。

## Visual QA Targets

- Desktop: 1440x900，outline、chart、inspector 同屏。
- Compact desktop: 1024x768，inspector drawer，无图表裁切。
- Mobile safety: 390x844，chart 可见，outline/sheet 可达，无文字和控制重叠。
- Required captures: ready、drag target、collapsed group、invalid data、export menu、reduced motion。
