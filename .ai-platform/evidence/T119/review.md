# T119 目标级复核

## Verdict

`PASS`。G002-R2 / T119 满足全部成功标准，无未解决 Critical、High 或 Medium finding，可以进入
`Needs_Review`。

## Spec Compliance

- 网站壳、真实图表首页、可搜索分类示例目录、文档入口与连续工作台均已交付。
- 首页与示例使用真实 `FinancialChartEditor` 和本地 fixture，不使用截图、占位图或第二套图表实现。
- `/playground` 保持 source/view 所有权、确定性命令、导入导出和非法草稿语义。
- history navigation、直接 URL、移动菜单、页面元数据、landmark 和 heading 通过 E2E/axe。
- T119-only diff 未包含 `packages/editor/**`、dependency manifest、lockfile、公共 API 或 schema。

## Code And Risk Review

- 路由层仅处理四个静态页面，使用类型化 route union 和 `history.pushState`，没有引入 router。
- 示例目录明确标记为 website-only，三项 discriminated IDs 与 fixture URL 有单元测试。
- 视觉系统提炼 ECharts 的清晰产品定位和 G2 的分类示例结构，只继承意图，不复制 logo、品牌图形、
  文案或配色。
- 网站图表容器使用真实组件且对页面语义设为 inert，避免嵌套编辑器 landmark/focus 干扰浏览页面。
- 动画只使用不影响可读性的 CSS transform；G2 继续负责图形动画；reduced motion 已覆盖。
- 未发现 `any`、`@ts-ignore`、`@ts-expect-error`、`eval` 或 `new Function`。

## Visual Rubric

评分：0 = 未满足，1 = 基本满足，2 = 明确满足。

| Dimension | Score | Evidence |
| --- | ---: | --- |
| 产品首屏信号 | 2 | TellPlot H1、真实图表与主操作同屏 |
| 领域贴合度 | 2 | SourceData/ViewSpec/G2 关系成为页面结构 |
| 信息层级 | 2 | 首页、示例、文档、工作台路径清晰 |
| 真实资产 | 2 | 所有主要图形均由真实组件渲染 |
| 视觉辨识度 | 2 | 高留白产品舞台、真实图表主视觉、蓝色交互强调和财务语义色一致 |
| 响应式构图 | 2 | 1440x900 与 390x844 均无溢出并露出后续内容 |
| 交互工艺 | 2 | 家族切换、菜单、复制、前进/后退和焦点反馈完整 |
| 可访问性 | 2 | 45/45 axe；键盘、landmark、reduced motion 完整 |
| 扩展边界 | 2 | playground 内容目录不进入 runtime registry |
| 克制性 | 2 | 无渐变光球、远程素材、卡片套卡片或重型依赖 |

- Average: 2.0 / 2.0
- Core dimension at 0: none
- Contract target: >=1.7

## Residual Low Risks

- L-001：当前目标不部署网站；未来 history URL 托管需要 SPA fallback 配置。
- L-002：网站文档是接入入口；版本化搜索和正式文档托管属于独立 G004 目标。
- L-003：两次完整矩阵中的同一既有 WebKit 用例在进入 `/playground` 时发生 30 秒导航超时；隔离复跑
  1/1 通过，未发现产品行为回归。

以上风险不影响本地网站、beta 包或当前验收，也不支持在本目标引入 router/docs framework。
