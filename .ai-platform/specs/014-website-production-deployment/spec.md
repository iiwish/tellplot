# G008 官网生产部署 Spec

## Metadata

- Feature ID: `014-website-production-deployment`
- Goal ID: `G008`
- Version: 1.0.0
- Status: Confirmed
- Last updated: 2026-08-02
- Approval: 用户明确同意 Vercel 托管方案，确认 `tellplot.com` 使用 Cloudflare DNS，并要求创建目标后完成部署

## Objective

把现有真实图表官网作为可追溯、可回滚、可直接访问的生产网站发布到 `https://tellplot.com`。部署不得改变
TellPlot 包、图表行为或运行时 ownership，也不得增加网站后端或客户端 secret。

## Requirements

### WEB-FR-001 可复现静态构建

仓库提供稳定的 `build:site` 命令。Vercel 从仓库根目录使用 Node 22 与精确 pnpm 11 构建
`apps/playground/dist`，不依赖维护者本机产物。

### WEB-FR-002 直接路由

`/`、`/examples`、`/docs`、`/playground` 在 Preview 与 Production 均可直接访问和刷新。每个已知路由生成
独立 HTML shell；未知直接路径不得被 catch-all rewrite 伪装为成功页面。

### WEB-FR-003 可发现性与分享

每个索引路由提供 title、description、canonical、Open Graph 与 Twitter metadata。站点提供 favicon、
1200x630 社交预览、`robots.txt`、`sitemap.xml` 和 SoftwareSourceCode/WebSite structured data；客户端导航
同步更新 metadata。

### WEB-FR-004 安全与缓存

生产响应提供适合无后端静态站的 CSP、frame、MIME、referrer 和 permissions 防护。带哈希资产长期缓存，
HTML 保持 revalidate；构建、客户端 bundle、日志和 evidence 不包含凭据。

### WEB-FR-005 Preview 与 Production

GitHub 仓库连接 Vercel。变更先以 Preview URL 验收构建、路由、响应头、桌面/移动与核心编辑器流程，再从
`main` 建立 Production，记录 source commit、deployment URL、状态与回滚入口。

### WEB-FR-006 Cloudflare 域名

Cloudflare 继续作为 `tellplot.com` 权威 DNS。按 Vercel 提供的目标配置 apex 与 `www`，绑定并验证 TLS；
canonical origin 为 apex，`www` 永久跳转到 `https://tellplot.com`。

## Non-Functional Requirements

- WEB-NFR-001：不新增生产依赖，不改变 npm package、schema、图表配置或编辑行为。
- WEB-NFR-002：生产部署必须来自 clean、已推送的 Git commit，不能从未提交源码直接成为 canonical deployment。
- WEB-NFR-003：四个直接路由、静态资源、metadata、响应头和 HTTPS 具有自动或可复核 evidence。
- WEB-NFR-004：部署失败时 DNS 不切换；切换后可通过 Vercel rollback 或 Cloudflare DNS 恢复前一状态。

## Success Criteria

- WEB-SC-001：本地 clean build、focused tests、typecheck、lint 与完整网站 E2E 通过。
- WEB-SC-002：Vercel Preview 成功，四个直接 URL 返回 200 且加载正确页面。
- WEB-SC-003：`https://tellplot.com` HTTPS 可用，`www` 重定向正确，证书与 DNS 验证通过。
- WEB-SC-004：生产 HTML metadata、robots、sitemap、缓存和安全头符合合同。
- WEB-SC-005：生产核心编辑器加载、图表渲染和基础交互通过，无阻断浏览器错误。
- WEB-SC-006：无 unresolved Critical、High 或 Medium finding。

## Non-Goals

- SSR、服务端搜索、分析平台、数据库、账户或持久化服务。
- 改变首页视觉方向、图表功能、公共 API、npm 版本或 Git tag。
- 把 Cloudflare 改为应用运行时或迁移 nameserver 到 Vercel。
- 建设版本化文档系统、多语言网站或独立 docs framework。
