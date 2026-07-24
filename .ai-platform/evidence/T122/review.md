# T122 / G002-R3 目标级复核

## Verdict

`PASS`。G002-R3 / T122 满足 CONFIG-SC-001 至 CONFIG-SC-007，无未解决 Critical、High 或 Medium
finding，可以进入 `Needs_Review`。

## Spec Compliance

| Success criterion | Result |
| --- | --- |
| CONFIG-SC-001 | waterfall、bar、column 最小示例统一为 `ChartEditor config={config}` |
| CONFIG-SC-002 | TypeScript consumer 锁定 data family 和 appearance family |
| CONFIG-SC-003 | runtime validator 覆盖合法、未知字段、嵌套非法值、accessor 和 family conflict |
| CONFIG-SC-004 | playground 默认编辑公共 config；独立 view 文件接收右侧命令 |
| CONFIG-SC-005 | runtime/types/quickstart/ESM/CJS/React 18/19/tarball 全部通过 |
| CONFIG-SC-006 | unit/coverage/build/package/E2E/a11y/performance/previous-browser 全部通过 |
| CONFIG-SC-007 | 三层复核无 unresolved Critical/High/Medium finding |

## Code And API Review

- public facade 只适配既有 `FinancialChartEditor`，不拥有第二套 session、projection 或 G2 runtime。
- 判别式 config 在 TypeScript 和 JavaScript runtime 使用相同字段边界；source validator 继续作为数据 SSOT。
- controlled/uncontrolled 模式、config/view 兼容性和 invalid state 均有组件测试。
- accessor/proxy 异常被封闭为稳定 issue；host callback 异常不会破坏 editor。
- package runtime export 精确锁定；declaration 不泄漏 G2 或内部 adapter 类型。
- 对象式标签配置只包含有限纯数据字段；旧字符串简写兼容，unknown field 和越界值均返回精确 JSON
  Pointer。
- value/group 前景标签在 waterfall、column 和 transpose bar 中按数值方向映射 inside/outside；
  背景默认关闭，显式启用时使用固定紧凑 padding/radius，不改变命中。
- 未开放 `collision`：G2 view-level label transform 只处理 mark labels，不能可靠处理当前独立前景 text
  mark；避免为 1.0 暴露无效配置。
- manifest、lockfile、schema、command、projection 和 export implementation 相对 baseline 未改变。
- 未发现 `any`、ignore directive、动态代码执行或 raw G2 escape hatch。

## QA And Visual Review

- 当前浏览器矩阵 177/177、a11y 45/45、previous release 177/177、WebKit 18.4 59/59。
- 桌面截图中公共 config、真实 G2 图形和大纲同时可见，标签、柱形和编辑器 chrome 无不合理重叠。
- 移动截图中图形保持非空、坐标轴可读，outline/inspector 入口可达。
- 视觉复核发现 `.playground-live-editor` 的 author `display:grid` 覆盖原生 `[hidden]`，导致两个文件面板
  同时绘制。该 Medium finding 已通过显式 `[hidden] { display:none }` 和三浏览器断言关闭。
- reduced motion、键盘 tab roving、非法草稿保持和实时配置同步继续通过。

## Residual Low Risks

- L-001：Vite 仍报告既有 G2 chunk-size warning；当前目标没有用户价值证据支持拆分或替换 G2。
- L-002：包只完成本地 tarball 和独立 consumer 验证；公开 registry 安装属于 G004。
- L-003：config 按 React 不可变 props 约定更新；宿主应替换对象而不是原地修改。

以上风险不影响当前公共配置合同和本地 Beta 候选，也不授权 stage、commit、远程 Git、publish、release
或部署。
