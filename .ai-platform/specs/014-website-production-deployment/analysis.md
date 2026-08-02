# G008 官网生产部署 Consistency Analysis

- Version: 1.0.0
- Status: Completed
- Last updated: 2026-08-02

## Inputs

- Constitution: `.ai-platform/memory/constitution.md`
- Product contract: `.ai-platform/docs/product-design.md` FR-015、NFR-005、NFR-008
- Technical decisions: TDR-018、TDR-021、TDR-024
- Accepted site baseline: G002-R2 / T119
- Feature spec/plan/checklist/work graph: `014-website-production-deployment`
- User approval: 2026-08-02 明确同意 Vercel 目标并确认 Cloudflare DNS

## Coverage

- WEB-FR-001 至 004 映射 T132，WEB-FR-005 映射 T133，WEB-FR-006 映射 T134。
- pnpm 11 不通过 Vercel 自动推断，使用 exact invocation 保持 G007 release toolchain 不变。
- 网站只消费已存在的 workspace/public 组件；部署不进入 npm 包，不增加 runtime dependency。
- Preview、Production 与 DNS 依赖顺序防止未验证构建成为 canonical production origin。
- Cloudflare nameserver 不变，DNS 记录和 Vercel deployment 均保留独立回滚路径。

## Findings

无阻断性 scope、architecture、dependency、security、authorization 或 rollback finding。

## Execute Gate

- Result: Clear
- Scope: T132-T134 连续实现、push、Vercel Preview/Production、Cloudflare DNS 与生产验收
- Remote authorization: 用户已明确授权完成本目标；不包含 npm publish、tag 或 package release
