# T123 稳定版架构与发布审计

## Architecture Result

`PASS`。

| Metric | Result |
| --- | --- |
| TypeScript / TSX source files | 47 |
| Runtime import edges | 240 |
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
- secret、private-key、token 和个人绝对路径模式在 release-facing surfaces 中无命中。
- 审计只报告规则和路径，不输出疑似凭据内容。
- package tarball 只包含 allowlist 中的 13 个 dist/metadata/README/LICENSE 文件。

## Change Boundary

- `pnpm-lock.yaml` 与 baseline 完全一致。
- root package 除四条 release scripts 外保持一致。
- editor package 除 `0.1.0-beta.1` 改为 `1.0.0` 外保持一致。
- runtime source、schema、command、projection、interaction、G2 runtime 与 export implementation 未改变。
- `vitest.config.ts` 的 source alias 只消除测试对预生成 `dist` 的隐式依赖。

## Conclusion

当前结构满足 1.0 稳定候选的分层与公共边界要求。没有证据支持在发布前拆出 `@tellplot/core`、
增加 registry 或重构 G2 runtime；这些动作会扩大风险且不改善当前三个图表家族的公共合同。
