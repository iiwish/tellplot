# G004 首个稳定版 1.0 需求

## Metadata

- Feature ID: `010-stable-v1-release`
- Goal ID: `G004`
- Version: 1.0.0
- Status: Confirmed
- Last updated: 2026-07-23
- Approval: 用户于 2026-07-23 明确批准创建并完成 1.0.0 稳定版大目标

## Goal

把当前 waterfall、bar、column 的已实现能力整理为 `@tellplot/editor@1.0.0` 本地稳定版候选。稳定版承诺
当前支持范围内的公共 API、schema、错误码、React/G2 peer 范围和浏览器合同，不以增加图表数量作为
发布条件。

本目标完成本地实现、兼容合同、开源资料、自动发布门禁、隔离源码复演和完整质量矩阵。远程 Git、生产
部署、tag、GitHub Release 与 npm publish 不属于本次授权。

## User Outcomes

- React 开发者通过 `ChartEditor + ChartConfig` 接入明确标记为稳定版的包。
- 维护者可以根据版本、兼容、弃用、支持、安全和贡献文档理解 1.x 承诺。
- 发布者可以用一个确定命令验证架构、公共文件、链接、敏感信息、包内容和完整工程门禁。
- 当前未提交工作树可以生成可审计的本地 tarball；真正公开发布仍只允许来自后续授权的干净 commit。

## Requirements

### STABLE-FR-001 稳定版本身份

package、README、CHANGELOG、网站文档、测试和发布报告使用 `1.0.0`，不得把公开候选描述为 Beta。
本地 tarball 名称和 manifest 必须为 `@tellplot/editor@1.0.0`。

### STABLE-FR-002 公共合同冻结

1.0 runtime exports 精确固定为 `ChartEditor`、`validateChartConfig` 和九个既有 domain/session API。
类型合同覆盖 `ChartConfig`、`ViewSpec`、commands、errors、export 和 React props/handle。内部
`FinancialChart*`、G2Spec、Chart instance、projection 和 runtime handle 不属于兼容承诺。

### STABLE-FR-003 版本与弃用政策

文档定义 Semantic Versioning、1.x 兼容范围、最短弃用周期、支持矩阵和 schema 兼容政策。breaking
public API、schema 或错误码变化只能进入新的 major；弃用至少跨一个 minor 并提供迁移说明。

### STABLE-FR-004 开源维护资料

公开源码包含 README、LICENSE、CHANGELOG、CONTRIBUTING、SECURITY、CODE_OF_CONDUCT、SUPPORT、
Issue templates 和 PR template。文档链接在本地可解析，安全报告不要求公开披露漏洞细节。

### STABLE-FR-005 架构门禁

自动检查 domain、interactions、charts、rendering、components/export/react 的依赖方向、G2 import
边界、公共入口和 TypeScript/TSX runtime import cycle。检查使用结构化 TypeScript parser，不使用
字符串猜测 import graph。

### STABLE-FR-006 发布审计

自动检查版本、必需公开文件、package metadata、本地 Markdown 链接、明显 secret/private-key 模式、
个人绝对路径和 tarball allowlist。审计不得输出业务数据值或凭据内容。

### STABLE-FR-007 隔离源码复演

从排除 `.git`、node_modules、dist、coverage 和测试输出的隔离源码副本执行 frozen install、稳定版
门禁和 package 构建。由于远程 Git 未授权，本次复演不是公开发布来源；公开发布仍要求干净 commit。

### STABLE-FR-008 完整质量矩阵

format、lint、typecheck、unit/coverage、build、package、React 18/19、current/previous browser、
a11y、performance、stable release audit 和 artifact validator 全部通过。

## Stable Support Contract

- React：18.3 与 19.x。
- React DOM：与 React 对应的 18.3 与 19.x。
- G2：5.4.x 及满足 peer range 的兼容 5.x。
- Node：构建与验证使用 22.20.0；CI 同时验证当前 Node 24。
- 浏览器：当前 Chromium、Firefox、WebKit，以及上一 Playwright browser release；WebKit 18.4
  保留兼容回归。
- Schema：现有 1.x legacy waterfall 与 2.x waterfall/categorical 解析合同保持兼容。

## Non-Functional Requirements

- STABLE-NFR-001：不增加 runtime 或 dev dependency。
- STABLE-NFR-002：不修改 SourceData/ViewSpec schema、命令行为、projection 或 G2 runtime。
- STABLE-NFR-003：发布门禁跨平台、失败即非零退出，并只输出路径/规则，不输出 secret 内容。
- STABLE-NFR-004：工作树已有用户成果不得被 reset、stash、覆盖或隐式提交。
- STABLE-NFR-005：不得把本地候选描述为已公开发布。

## Non-Goals

- 新图表家族、多序列、AI、Dashboard、通用 plugin registry 或 raw G2Spec。
- 远程 Git、仓库公开、production deploy、DNS、tag、GitHub Release 或 npm publish。
- 为发布重构大型 Canvas、交互控制器或领域模型。

## Success Criteria

- STABLE-SC-001：`pnpm pack` 生成 `@tellplot/editor@1.0.0` 且 package contract 全绿。
- STABLE-SC-002：runtime/type/compat/deprecation/schema 合同文档和测试完整。
- STABLE-SC-003：architecture、public files、links、secret/path 和 tarball 自动门禁通过。
- STABLE-SC-004：隔离源码 frozen install、build、package 和稳定版 audit 可复现。
- STABLE-SC-005：完整当前/上一浏览器、React、a11y 和性能矩阵通过。
- STABLE-SC-006：无 unresolved Critical、High 或 Medium finding。

## Approval Gate

用户已批准 G004 本地稳定版目标、版本改为 `1.0.0` 和连续执行。stage、commit、push、PR、merge、
production deploy、DNS、tag、GitHub Release 和 npm publish 仍需独立明确授权。
