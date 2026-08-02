# G008 Requirements Checklist

- [x] 用户明确批准 Vercel 托管、Production 部署、远程 push 与 Cloudflare DNS 变更。
- [x] canonical production origin 固定为 `https://tellplot.com`，Cloudflare 保持权威 DNS。
- [x] 仓库根目录、精确 Node/pnpm、build command 和 output directory 已明确。
- [x] 四个直接路由、未知路径 404、metadata、robots、sitemap、favicon 和社交预览合同已明确。
- [x] 静态站安全头、缓存、无客户端 secret 与可回滚边界已明确。
- [x] Preview 在 Production/DNS 前验收，失败关闭。
- [x] 不改变 npm package、公共 API、schema、图表行为或 G2 ownership。
- [x] 本地、托管、DNS、TLS 与真实浏览器 evidence 要求已明确。
