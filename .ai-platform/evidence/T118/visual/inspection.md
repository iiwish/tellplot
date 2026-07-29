# T118 Visual And Export Inspection

## Desktop Screen

- Viewport：1440 x 900，本地 playground，waterfall fixture。
- 创建展开分组“增长驱动”后，G2 canvas 非空；区域背景的横向边界由首末可见后代确定，纵向边界由成员
  实际 `start/end` 确定，不再铺满整个绘图区。
- 在 1295 x 925 实际用户状态中复核嵌套分组 `233` / `123`：两个 label 均绘制在柱形前方，细圆角文字
  光晕与 depth offset 使共享起点仍可辨识；柱形、轴和 tooltip hit surface 未被遮挡。
- 在用户后续 1295 x 925 单分组 `123` 状态中对比：标签锚点由整个 region 的最高累计值改为首成员
  “销量增长”的柱顶，垂直间距约 2px；明确 `zIndex` 和细圆角文字光晕保证标签不被柱形覆盖。
- 另开 fresh playground 创建两成员分组复核：x/y axis 和 grid 保持可见，bounded rectangle 只覆盖分组
  成员的类别与数值范围，label 位于柱形前方；这也排除了长期 HMR canvas 缓存造成的旧画面干扰。
- 另开 fresh playground 创建“外层 / 内层”嵌套分组：父子标签在首柱上方按 12px 层级步进紧凑错位，
  两者均完整可见；数值标签通过独立前景 text mark、细圆角文字光晕和显式层级保持可读。
- `visual/value-label-foreground.png` 使用 1295 x 925 fresh playground 创建五成员分组 `123`：group label
  位于“销量增长”柱顶外侧约 2px，`+¥860` 位于同一端点柱内约 2px；正负数值均完整覆盖在柱色前方，
  `-¥510`、`-¥180` 和 `-¥260` 不再漂移到远离各自柱形的位置。
- `visual/frameless-labels.png` 在同一视口复核最终样式：group 与 value label 均没有卡片式底框，1.5px 圆角
  光晕只用于分离文字和柱色；端点间距、前景层级、分组区域尺寸与拖拽命中不变。
- 选择该 group 时 Inspector 只显示“取消分组”，不显示创建分组表单或连续性错误。
- 把“产品结构”拖入该 group 后，revision 为 2，group 显示 3 个直接成员，“产品结构”ARIA level 为 2，
  move feedback accepted。
- console 未观察到 G2 render error。

## Mobile Screen

- Viewport：390 x 844，由 current Chromium/Firefox/WebKit accessibility E2E 验证。
- outline sheet 中多选、touch target、Inspector create-group 动作均可达；创建动作替换后焦点仍位于 dialog。
- axe serious/critical violation：0。

## Export

- waterfall、column、bar 的 SVG/PNG 均从 canonical expanded-group regions 构建。
- bounded `range` mark 位于主 interval 前，value/group `text` mark 位于 interval 后；装饰性 value data 不含
  `nodeId`，背景和标签均不参与编辑 hit set，collapsed group 及 collapsed ancestor 的内部 label 不进入 SVG。
- SVG sanitizer 断言继续拒绝 script、foreignObject、javascript URL、远程 href、sourceRef 和 source metadata。
- PNG/SVG 非空与 screen/export projection parity 由 component/export E2E 共同验证。
