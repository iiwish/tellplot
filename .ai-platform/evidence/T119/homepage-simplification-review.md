# T119 首页精简复核

## Metadata

- Change: `G002-R2-CR002`
- Status: Passed
- Date: 2026-07-23
- Scope: 首页、全局导航、页脚及相关响应式与 E2E

## Verdict

`PASS`。首页只保留两个章节：真实图表产品舞台和开发者接入区。示例、文档、工作台、图表切换、安装与
配置各自只有一个明确归属，不再跨顶栏、首屏、图表栏、内容区和页脚重复出现。

## Information Architecture

- 顶栏：Logo 返回首页；主导航只保留“示例、文档”；“打开工作台”是唯一全局主操作。
- 首屏：负责产品定位、带默认分组的可编辑真实图表和图表家族切换；唯一页面操作是跳到接入区。
- 图表卡片：只显示当前示例说明和家族选择，不再提供第二个工作台入口。
- 接入区：安装命令、四张数据流卡片和最小 TypeScript 配置合并呈现。
- 页脚：只保留品牌、运行时和 MIT 元信息，不复制主导航。

## Visual Review

- 桌面首屏保留完整真实图表，并在 `1440x900` 露出接入区。
- 移动端首屏在 `390x844` 露出接入区，compact 图表没有值标签碰撞或横向溢出。
- 默认瀑布图以展开的“增长驱动”分组显示区域背景和标签；首页组件为可写模式，贡献柱拖拽排序和空白区域
  框选分组直接进入既有确定性命令内核。
- 全页使用统一亮色系统，以浅灰画布和白色内容卡片形成层级，不使用贯穿页面的分隔线。
- 图表舞台、安装命令、数据流和代码块使用一致的 6-8px 圆角与柔和阴影；代码块保持亮色主题、
  稳定行号和可聚焦水平滚动。

## Visual Rubric

评分：0 = 未满足，1 = 基本满足，2 = 明确满足。

| Dimension | Score | Evidence |
| --- | ---: | --- |
| 产品首屏信号 | 2 | H1、定位、真实图表和家族切换同屏 |
| 信息去重 | 2 | 页面只保留两个职责明确的章节 |
| 操作去重 | 2 | 全局操作、页内引导和图表切换互不重复 |
| 真实资产 | 2 | hero 渲染可编辑 `ChartEditor`、本地 fixture 和真实分组 ViewSpec |
| 响应式构图 | 2 | 桌面和移动均无页面溢出并露出下一章节 |
| 开发者可用性 | 2 | 首屏可直接拖拽、框选；安装、数据流和有效配置在同一接入区 |
| 视觉辨识度 | 2 | 编辑排版、真实图表和统一卡片体系形成清晰节奏 |
| 可访问性 | 2 | 三浏览器 axe 45/45；页内跳转和代码滚动可键盘使用 |
| 扩展边界 | 2 | 未新增依赖、图表 registry 或第二套运行时 |
| 克制性 | 2 | 卡片只承载图表、安装、流程和代码，不嵌套、不重复导航 |

- Average: 2.0 / 2.0
- Core dimension at 0: none
- Contract target: >=1.7

## Evidence

- [桌面首屏](visual/home-simplified-first-viewport.png)
- [桌面完整页](visual/home-simplified-desktop.png)
- [移动完整页](visual/home-simplified-mobile.png)
- showcase E2E: Chromium/Firefox/WebKit 15/15
- accessibility: Chromium/Firefox/WebKit 45/45
- unit: 51 files、438/438
- format、lint、typecheck、build、`git diff --check`: passed

## Residual Risk

- Vite 继续报告既有 G2 chunk-size warning；本次没有增加运行时依赖或额外图表 bundle。
- 网站仍是本地交付，部署与 SPA fallback 不属于本次变更。
