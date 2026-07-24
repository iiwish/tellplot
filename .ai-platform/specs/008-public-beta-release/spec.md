# G004 首个公开 Beta 发布需求

## Metadata

- Feature ID: `008-public-beta-release`
- Goal ID: `G004`
- Version: 0.1.0
- Status: Superseded
- Last updated: 2026-07-23
- Approval: 未批准；稳定版目标以 `.ai-platform/specs/010-stable-v1-release/` 为准

## Goal

将通过目标级验收的 TellPlot 图表库、开源网站和开发者资料整理为可复现、可安装、可访问的首个公开 Beta，
发布 `@tellplot/editor@0.1.0-beta.1`，并保留稳定版与后续图表扩展的演进空间。

## Target Users

### REL-TU-001 React 开发者

可以从公开 registry 安装明确标记为 Beta 的 TellPlot 包，并从公开文档完成最小接入。

### REL-TU-002 开源维护者

可以从公开仓库的干净 `main`、tag、release 和 CI 证据复现 npm 产物及网站。

## User Stories

### REL-US-001 安装公开 Beta

开发者可以通过 `@beta` dist-tag 安装 `@tellplot/editor@0.1.0-beta.1`，读取 README、API 和迁移文档，
并在 React 18/19 宿主中运行。

### REL-US-002 审查发布来源

开发者可以从 npm metadata 到公开 GitHub tag、源码、LICENSE、CHANGELOG 和验证记录追溯发布来源。

### REL-US-003 访问真实示例

开发者可以通过 `tellplot.com` 浏览首页、示例、文档和在线工作台；直接访问 history URL 不返回 404。

## Functional Requirements

### REL-FR-001 架构发布门禁

发布前确认 `domain -> chart family -> G2 spec/runtime -> React surface` 的依赖方向，公共入口不导出
`G2Spec`、G2 `Chart`、scene context、projection 或内部 runtime。领域层不得依赖 React、G2 或 UI。
运行时代码不得形成模块循环。

### REL-FR-002 可复现发布源

发布只从干净 `main` 和确定的 Git commit 产生。tag、GitHub Release、npm tarball 和网站版本必须指向同一
源码状态；工作区未提交内容不得成为发布来源。

### REL-FR-003 干净环境验证

从 fresh clone 使用锁定 Node/pnpm 安装并完成 format、lint、typecheck、unit/coverage、build、package、
React 18/19、当前与上一浏览器、a11y、performance 和 artifact validation。当前 WebKit 导航超时必须被
修复，或通过可重复证据定位为基础设施问题并得到单独风险批准。

### REL-FR-004 公开仓库

GitHub 仓库公开提供 README、LICENSE、CHANGELOG、贡献指南、安全政策、行为准则、Issue/PR 模板、
CI 状态和版本说明。公开前完成敏感信息与发布文件审计。

### REL-FR-005 生产网站

`tellplot.com` 部署当前网站构建，启用 HTTPS、SPA fallback 和基本缓存策略。首页、示例、文档和工作台
均可通过直接 URL 打开，且不引入核心包网络依赖。

### REL-FR-006 npm 发布身份

发布者拥有 `@tellplot` scope 的写权限并使用 2FA、granular access token 或 Trusted Publishing。
凭据不得写入仓库、日志、evidence 或前端构建。

### REL-FR-007 Beta 分发语义

`0.1.0-beta.1` 使用 `beta` dist-tag 发布，不占用 `latest`。公开 tarball 内容必须与本地 allowlist、
publint、ATTW、ESM/CJS/types 和独立 consumer 验证一致。

### REL-FR-008 发布后验证

发布后从公开 registry 安装 `@tellplot/editor@beta`，验证版本、dist-tag、README、类型、样式入口和真实
React 渲染；同时验证 GitHub tag/release 和生产网站。

## Non-Functional Requirements

### REL-NFR-001 最小发布变更

G004 不增加图表家族、依赖、schema 或通用 registry，不为发布进行非必要核心重构。

### REL-NFR-002 安全

公开仓库、tarball、source map、构建日志和网站产物不得包含 token、私钥、个人路径、测试金额明细或其他
敏感数据。

### REL-NFR-003 可追溯性

每个本地和远程门禁记录命令、结果、commit SHA、产物摘要和残余风险；不得把隔离复跑描述为完整矩阵全绿。

### REL-NFR-004 兼容性

Beta 发布保持已验收的 React 18/19、G2 5、ESM/CJS/types 和浏览器合同。

## Architecture Review Baseline

- 当前目录按 `domain`、`charts/waterfall`、`charts/categorical`、`rendering/g2`、`interactions`、`react`、
  `components` 和 `export` 分责，符合项目规模，不复制 G2 的全量 runtime/library 架构。
- `packages/editor/src/index.ts` 是唯一 runtime 公共入口，十个 runtime exports 由精确测试锁定。
- G2 类型只存在于图表 spec 与 `rendering/g2` 内部边界；领域和交互几何不依赖 G2。
- 45 个 TypeScript/TSX 源文件的运行时 import graph 无循环。
- 两个 family Canvas 与 `FinancialChartEditor` 体积较大，`formatAmount` 位于 `components` 但被低层引用，
  architecture test 只覆盖关键文件。这些是非阻断维护性债务；G004 只补强边界门禁，交互控制器抽取在新增
  第三个图表家族前单独评估，不在发布前扩大行为回归面。

## Non-Goals

- 新图表、AI、Dashboard、服务端业务流程或通用 ChartPlugin registry。
- `1.0.0` 稳定版承诺。
- breaking public API、schema 迁移或依赖升级。
- 未经独立批准自动执行 push、merge、仓库公开、域名变更、生产部署或 npm publish。

## Success Criteria

- REL-SC-001：架构边界检查、公共 API contract 和 package contract 全部通过。
- REL-SC-002：fresh clone 完整发布矩阵通过，或任何残余失败获得用户单独风险批准。
- REL-SC-003：公开 GitHub、生产网站、npm package、tag 和 release 指向同一 commit。
- REL-SC-004：`npm install @tellplot/editor@beta` 在独立 React 18/19 consumer 中成功。
- REL-SC-005：npm `latest` 不指向 Beta；公开资料不包含敏感信息或失效链接。

## Approval Gates

- G004 获得明确批准后才授权本地发布准备、artifact 和验证工作。
- push、PR、merge、仓库公开、生产部署、DNS、Git tag、GitHub Release 和 npm publish 必须在实际执行前
  再取得明确授权。
- scope 权限、npm 登录、2FA、域名和托管账号需要用户或相应平台管理员提供。
