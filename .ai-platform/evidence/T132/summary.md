# T132 Evidence Summary

## Status

- Task: T132
- Goal: G008
- Status: Needs_Review
- Date: 2026-08-02

## Scope

现有 React/Vite 官网获得仓库级 Vercel 部署合同、精确 pnpm 11 构建命令、四个静态 route shell、统一类型化
metadata、favicon、真实首页社交预览、robots、sitemap、结构化数据、缓存和静态站安全响应头。实现未新增依赖，
未修改 lockfile、npm package、图表 schema、公共 API 或编辑行为。

## TDD Evidence

- RED：focused suite 在实现前 3 个 test file 失败；缺少 `siteMetadata`、`vercel.json`、`build:site`、route
  shells 和 discovery assets。
- GREEN：同一 focused suite 3 files / 13 tests 通过；`pnpm build:site` 从 workspace source 生成四个 HTML
  shell、hashed assets、favicon、1200x630 PNG、robots 与 sitemap。
- REFACTOR：route title/description/canonical/OG/Twitter 只使用 `SITE_METADATA`；客户端 history navigation 与
  生产 HTML shell 共享同一 metadata source。

## Artifact

- 社交预览来自 1200x630 真实首页与 G2 图表截图，不使用远程图片。
- `og-image.png` 72493 bytes，SHA-256
  `2cafabde95246640d172d410431320f979a814d13dcc20702cd13d26f096bd78`。
- Vercel 只 rewrite `/examples`、`/docs`、`/playground` 三个已知直接路由，未知直接 URL 保持托管 404。
- HTML 使用 `max-age=0, must-revalidate`，hashed assets 使用一年 immutable cache。

## Residual Gate

Vercel hosted pnpm 11、实际响应头/CSP 与 deployment URL 尚需 T133 Preview 验证；Cloudflare DNS/TLS 属于 T134。
