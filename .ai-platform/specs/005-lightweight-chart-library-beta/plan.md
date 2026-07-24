# G002 轻量图表库 Beta Plan

## Metadata

- Feature ID: `005-lightweight-chart-library-beta`
- Goal ID: `G002`
- Version: 0.4.0
- Status: Confirmed
- Last updated: 2026-07-23
- Approval: 用户已批准 G002 目标级连续执行、演示页常驻代码、可选面板布局和双向实时图表文档

## Baseline

- G001 / T101-T116 均为 `Accepted`。
- 当前 accepted baseline 有意保留在 dirty worktree，不以 HEAD 代替。
- G002 执行前外部快照位于 `/tmp/tellplot-G002-baseline.jBh5ji/worktree/`。
- Manifest: `/tmp/tellplot-G002-baseline.jBh5ji/manifest.sha256`，293 files，SHA-256
  `9664ccb6fb57ac8e41622ee7a6ccb81b0458438d44f143cd0b698f843ce01b3c`。

## Delivery Strategy

1. 用 contract tests 锁定 beta runtime exports、package version、tarball allowlist 和无 AI source 的命令边界。
2. 保持 runtime 函数、组件 props、数据/view schema、G2 ownership 和视觉行为不变。
3. 建立 package README 与长期 developer docs，并用独立 TypeScript consumer 编译核心示例。
4. 将 `@tellplot/editor` 版本设为 `0.1.0-beta.1`，补齐 README、LICENSE、CHANGELOG 和迁移规则。
5. 运行 package、React、当前/上一浏览器、a11y、performance、export 和完整静态门禁。
6. 生成 task-only diff、test results、review 和目标级 summary，状态停在 `Needs_Review`。
7. 参考编辑器工具栏提供“使用”对话面板，直接展示安装、最小 React 引入和安全配置代码；入口不修改核心
   编辑器 runtime、公共 API 或图表行为。
8. 将桌面使用代码改为默认常驻左栏；以向后兼容的 `layout` 配置让演示页使用右侧大纲/检查器标签栏，
   `panels` 继续独立控制面板显隐，窄屏沿用对话面板。
9. 将静态左栏升级为亮色开发者面板：分别编辑公共 `ChartConfig` 与 `ViewSpec` JSON，短延迟校验后
   更新图形；右侧命令变更只回写视图文件，不把图形编辑解释为源金额变更。
10. 非法草稿保持可编辑并明确显示第一个错误路径，图表继续使用最后一次合法状态；安装、React 与配置代码
    保留在独立“接入示例”模式，不新增代码编辑器或执行器依赖。

## Public API Decision

Beta runtime exports 保持十一个：

- `ChartEditor`
- `createEditorSession`
- `createInitialViewSpec`
- `executeCommand`
- `parseViewSpec`
- `redoSession`
- `serializeViewSpec`
- `undoSession`
- `validateChartConfig`
- `validateSourceData`
- `validateViewSpec`

公共类型继续从单一 entry 导出。`ChartEditor` 使用判别式 `ChartConfig`；外部确定性命令使用
`source: 'host'`。包尚未发布，迁移文档记录 beta 前命名与属性映射。

## Documentation Surface

- `packages/editor/README.md`：npm package first view、安装、最小代码、支持能力与链接。
- `docs/getting-started.md`：source-only、bar/column 初始化、受控/非受控、样式和宿主要求。
- `docs/api.md`：runtime exports、公共类型、component/handle、schema 和 internal boundary。
- `docs/errors.md`：validation、command、export 和接入故障处理。
- `docs/migration.md`：beta SemVer、schema 1/2、0.1.0-beta.1 升级检查。
- `CHANGELOG.md`：beta release scope。
- playground 使用面板：安装、最小 React 引入与 `ChartConfig` 的即时可复制版本。
- playground 实时配置：公共 `ChartConfig` 与 `ViewSpec` 的独立 JSON 序列化、解析、校验和双向同步。
- `ChartEditor` editor options：默认 split 布局不变；可选 outline placement 与 tabbed inspector mode，
  不公开内部 panel component。

## Test Strategy

- RED：beta contract tests 先要求版本、README/tarball、compiled quickstart 和 command source 收窄。
- GREEN：最小修改 package/docs/command source 与测试。
- REFACTOR：统一陈旧 T107/AI 文案，不扩展 runtime。
- Review correction RED：先锁定公共配置/视图解析、非法草稿身份保持和浏览器双向同步。
- Review correction GREEN：实现无依赖亮色 textarea 编辑器、延迟应用和外部 revision 回写。
- Final：format、lint、typecheck、unit/coverage、build、package、React matrix、current/previous browsers、a11y、
  performance、strict artifact validator、diff check。

## Risk Controls

- 不把文档愿望变成新 runtime API。
- 不因 G2 chunk warning增加分包或 dependency。
- 不把 beta version 等同于 publish 授权。
- 不修改 chart projection、rendering、interaction、appearance 或 export behavior。
- 使用面板只消费已经确认的公共 API；不维护第二份虚构配置合同。
- 面板布局由组件公共配置实现，不用 playground CSS 猜测或重排内部 DOM。
- 不执行用户输入的 JavaScript；配置和视图只经过 `JSON.parse`、封闭字段校验、
  `validateChartConfig` 和 `validateViewSpec`。
- 左侧合法 data 变更显式重建受控编辑器状态；右侧命令仍只能改变 `ViewSpec`，保持 data/view 分离。
- 任何 full gate 行为回归只做最小缺陷修复；需要产品/视觉/schema 变化时停止。
