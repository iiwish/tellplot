# G008 官网生产部署 Plan

## Metadata

- Feature ID: `014-website-production-deployment`
- Goal ID: `G008`
- Version: 1.0.0
- Status: Confirmed
- Last updated: 2026-08-02
- Approval: 用户已批准 Vercel、Cloudflare DNS 与 Production 完整执行

## Delivery Strategy

1. T132 以测试固定部署配置、静态 route shell、metadata、robots/sitemap、缓存和安全头，再完成最小实现。
2. T133 从 clean commit 建立 Vercel 项目与 Preview，验证 pnpm 11 构建、直接路由、响应头和真实编辑器。
3. T134 提升 Production，绑定 Cloudflare DNS 下的 apex 与 `www`，验证 HTTPS、重定向与回滚，再固化 evidence。

## Architecture

```text
GitHub main -> Vercel build (repo root, Node 22, pnpm 11.1.3)
                         -> apps/playground/dist
Cloudflare authoritative DNS -> Vercel static edge/TLS -> tellplot.com
```

官网继续从 workspace source 构建，因此 PR Preview 可以验证同一提交中的包与网站。Vercel 不获得 npm token、
Cloudflare token 或业务数据；DNS 只在 Preview 通过后切换。

## Risk Controls

- 使用 exact `npx pnpm@11.1.3` 绕开 Vercel未稳定承诺 pnpm 11 的自动选择，不修改已验收 release toolchain。
- 只为四个已知 SPA 路由配置 fallback，避免未知 URL 产生 soft 404。
- 生产域名切换前记录 DNS 现状；没有可用 Preview 时不创建生产记录。
- CSP 先在本地 production preview 和 Vercel Preview 验证，任何资源或导出阻断都在 DNS 前修复。
- 生产 deployment 记录 Git SHA，Vercel 保留上一 deployment，Cloudflare 记录可逆。

## Validation

- Focused Vitest：deployment contract、route metadata、production bundle。
- `pnpm format:check`、`pnpm lint`、`pnpm typecheck`、`pnpm build:site`、`pnpm test:unit`。
- Playwright：四个 direct routes、核心编辑器、桌面/移动、console/network。
- Preview/Production：HTTP status、canonical/OG、robots/sitemap、CSP/cache、DNS、TLS、www redirect。
- strict artifact validator、secret scan、`git diff --check`。
