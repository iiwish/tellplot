# T123 稳定版架构与发布审计

## Architecture Result

`PASS`。

| Metric | Result |
| --- | --- |
| TypeScript / TSX source files | 48 |
| Runtime import edges | 245 |
| Runtime cycles | 0 |
| Public entry | `packages/editor/src/index.ts` |
| Runtime exports | 11 |

门禁使用 TypeScript compiler API 解析 import、export 和 dynamic import，不用正则猜测依赖图。

## Enforced Boundaries

- domain 不依赖 React、G2、components、rendering、export 或 interactions。
- interactions 不依赖 React components 或 G2 runtime。
- charts 拥有 family-specific projection/spec，不反向依赖 components。
- raw `@antv/g2` import 只允许在批准的 spec/runtime owner。
- components、export 和 React adapter 不得形成 runtime import cycle。
- public entry 不得导出 `FinancialChart*`、G2Spec、Chart instance、projection 或 runtime handle。

既有 `formatAmount` 低层依赖被明确列为当前允许债务，没有借 G004 扩大重构范围。

## Release Audit

- package identity 为 `@tellplot/editor@1.0.0`，不存在 prerelease 标记。
- 19 个必需公开文件全部存在，16 个公开 Markdown 文件的本地链接可解析。
- secret、private-key、token、个人绝对路径和临时目录模式在 release-facing surfaces 与
  `.ai-platform` 交付记录中无命中。
- 审计只报告规则和路径，不输出疑似凭据内容。
- package `publishConfig` 固定 `access: public` 和 npm 官方 registry，不受开发机全局 registry 漂移影响。
- package tarball 只包含 allowlist 中的 13 个 dist/metadata/README/LICENSE 文件。

## Change Boundary

- `pnpm-lock.yaml` 与依赖集合保持不变。
- editor package 固定 1.0.0 身份、public access 和 npm 官方 registry。
- 发布聚合门禁覆盖全部稳定版阻断项，当前与旧版 Playwright 配置使用两个 worker 隔离 WebKit 长队列。
- schema、command、projection、G2 runtime 与 export implementation 未改变；分组边界交互 correction
  保持在既有 interactions/components 层内，没有新增公共出口或越层依赖。
- source alias 只消除测试对预生成 `dist` 的隐式依赖。

## Conclusion

当前结构满足 1.0 稳定候选的分层与公共边界要求。没有证据支持在发布前拆出 `@tellplot/core`、
增加 registry 或重构 G2 runtime；这些动作会扩大风险且不改善当前三个图表家族的公共合同。
