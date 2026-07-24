# T118 / G002-R1 Review

## Spec Compliance

- R1-SC-001：Inspector 按选择上下文显示动作；单 item/group 不再暴露创建分组错误，非法多选只约束
  创建动作。
- R1-SC-002：outline、waterfall、column 和 bar 共享 before/after/inside resolver；真实 outline DnD、G2
  scene bounds 和同步 preview 覆盖跨分组主流程。来源分组 scene bounds 独立于成员碰撞，越过区域边界
  即退出分组，区域内部仍保持成员排序。
- R1-SC-003：两成员来源 group 原子解散并清理 collapsed/annotation/emphasis；三成员、嵌套、锁定、segment、
  cycle 和单步 undo/redo 均有不变量测试。
- R1-SC-004：默认、关闭、透明度边界、label、嵌套和折叠祖先通过 config/spec/export/rendering tests。
- R1-SC-005：unit/coverage、package、React、current/previous browser、a11y、export gates 通过；聚合
  `pnpm test:performance` clean pass 为 waterfall 101.4ms、categorical 75.4ms，均低于 150ms 预算。

Result: implementation PASS；delivery gate PASS；Critical/High/Medium code findings 0。

## Bug And Code Quality

- 移动命令只在跨 container 且来源 group 恰有两个直接子节点时解散；同 container 重排不受影响。
- drag start 快照可见 mark 的 G2 bounds，并由 leaf membership 投影 direct-to-outer 来源分组边界；
  resolver 选择指针实际跨越的最外层边界，不依赖 DOM 尺寸、固定间距或下一个外部柱；命中来源分组
  之外的 mark 后，标准 collision target 重新接管。
- 分组动作状态不再被 G2 冒泡的 plot pointerdown 提前清除；普通 click 保留动作，4px drag intent
  才清除，明确区分 click 与 drag。
- chart interaction、命令校验与 group actions 始终读取 canonical ViewSpec；只有柱形投影和 G2
  group region mark 读取临时 preview ViewSpec。拖拽过程因此实时反映未来分组范围，又不会提前增加
  revision、写入受控状态或污染 undo/redo。
- destination index 使用原有 `{ containerId, index }` contract，并在来源 group 替换后执行插入；没有新增
  public command 字段。
- group region 从 canonical projection 的 leaf membership 推导；collapsed group 及被 collapsed ancestor
  隐藏的后代均不生成 mark。
- 初版全高 `rangeX` 与 interval 内 label 会造成区域过重、标签被柱形遮挡；复核后改为由成员投影的
  `start/end` 或 `amount` 计算数值边界，并使用 G2 `range` 绘制有界矩形。
- 标签改为 interval 后的独立 G2 `text` mark，并使用 depth offset；嵌套 group 即使共享起点也保持可辨识。
  group 与 value label 均不使用独立底框，只保留 1.5px 圆角高对比文字光晕。背景与标签均设置
  `pointerEvents: none`，不进入主 element hit set，图表命中仍读取 G2
  scene bounds。
- 标签纵向锚点使用首个可见成员自身柱顶而不是整个 region 最高值，避免瀑布累计值差异造成横向取首项、
  纵向取远端高点的悬浮错位。group label 使用 `zIndex: 10`；数值标签使用独立 G2 `text` mark、细圆角
  光晕和 `zIndex: 5`，层级不依赖 interval 内部 label 的绘制顺序。
- 前景数值 mark 首版复用了柱形 `nodeId`，三浏览器分类图回归暴露它会进入 G2 scene 编辑候选并吞掉
  drop target。最终数据只保留 `labelId/categoryId/anchor/text/direction`，不暴露 `nodeId`；column/bar
  18/18、waterfall/quickstart 18/18 和 full E2E 132/132 均通过。
- full E2E 复核发现辅助 text mark 的 `axis: false` 覆盖了共享类别轴；range/text 辅助 mark 均改为不声明
  axis ownership，主 interval 继续唯一控制 formatter、显示开关和轴样式。fresh grouped browser 与
  quickstart SVG regression 均验证坐标轴保留。
- PanelOverlay 在 focused action 被条件替换时恢复 dialog 内焦点，修复了移动端创建分组后的焦点丢失。
- public appearance parser 对 opacity 限制为 0..0.2，未知 label 回退默认，未开放 callback 或 G2 options。

Result: PASS；actionable findings 0。

## QA Acceptance

- 455 unit tests、180 current-browser tests、180 previous-browser tests、WebKit 18.4 60 tests 和
  45 a11y tests 全绿。
- manual desktop browser QA 观察到真实 G2 有界分组矩形、前景 label、单 group 的唯一取消分组动作，以及
  把“产品结构”拖入“增长驱动”后的 revision、层级和成功反馈；嵌套分组 `233` / `123` 标签均未被柱形
  遮挡。
- 用户反馈复核后，1295 x 925 单分组 `123` 的标签位于首个成员柱顶约 2px 处；独立
  fresh tab 的“外层 / 内层”嵌套标签紧凑堆叠在首柱上方。最终 1295 x 925 截图中 `+¥860` 紧贴首柱
  内侧，`-¥510` 等负值锚定各自真实下端点，全部位于柱形前景。数值标签矩形底方案因分割移动端小柱形
  而被 review 拒绝。进一步视觉复核将原 3px 描边和 group 标签 chip 统一收敛为无底框文字与 1.5px 圆角
  光晕，保留独立前景 text mark、端点锚定和交互中立性。
- collapsed ancestor export 泄露内部 group label 的 review finding 已修复并加入 unit/E2E regression。
- mobile Inspector action replacement 的焦点边界 finding 已修复并加入 unit/E2E regression。
- correction commits 为 `42c0342`、`5f0dcb9`；没有执行 remote Git、push、publish 或 release。

Result: product QA PASS；performance delivery gate PASS；G002-R1 / T118 进入 `Needs_Review`。

## Residual Risk Classification

- Low：高系统图形负载会影响本地 canvas-first-paint p95；门禁不降级，并保留 clean run 与 diagnostic 样本。
- Low：嵌套区域以透明度、outer-to-inner mark order 和最多三级标签错位区分；极深层级仍受 0.2 opacity
  上限保护。
- Low：outside 当前目标的任意自动重组和多节点批量拖拽均保持 non-goal。
