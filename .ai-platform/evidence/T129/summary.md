# T129 / G006 Delivery Summary

- Status: Accepted
- Accepted: 用户于 2026-07-30 授权验收中直接修复并完成目标级验收
- Version: 1.0.0
- Packages: `@tellplot/core`、`@tellplot/editor`、`@tellplot/react`、`@tellplot/vue`
- Runtime ownership: core 拥有领域状态与命令，editor 拥有 DOM/G2 完整工作台，React/Vue 只适配 lifecycle
- Editor scope: 瀑布图、分类条形图、分类柱状图、直接编排、大纲、Inspector、Toolbar、分组、批注、
  历史、持久化、SVG/PNG 导出、响应式与无障碍全部迁移
- Consumer scope: imperative DOM、React 18/19、Vue 3 公共接入与隔离 tarball 验证
- Compatibility: 不保留未公开的 React-only API 或 package 兼容层
- Remote boundary: 未执行 stage、commit、push、PR、merge、tag、GitHub Release、deploy 或 npm publish

## Outcome

G006 的 FRAMEWORK-SC-001 至 007 全部满足，未解决 Critical / High / Medium finding 为 `0 / 0 / 0`。
最终 `mise exec node@22.20.0 -- pnpm release:check` 完整通过：

- 49 source files / 193 import edges / 0 runtime cycles；419-file release audit；
- 53 files / 439 tests 与全部 coverage threshold；
- current Chromium/Firefox/WebKit 186/186，a11y 45/45；
- previous browser release 186/186，WebKit 18.4 62/62；
- performance 2/2，waterfall p95 70.8ms、categorical p95 71.2ms，150ms budget，React commit delta 0；
- 四包 publint/ATTW/ESM/CJS/types、tarball framework matrix 与 336-file isolated-source rehearsal；
- 14 个 AntV package / 17 个精确 artifact / 48 个 installed manifest 的版本、URL、SHA-512 integrity 门禁。

## Quality Closure

- Store 对外 snapshot detached/frozen/prototype-safe；受控候选、重复 command ID 与多实例 host ID 不串扰。
- public config/options/export closed-shape 验证覆盖 accessor、hostile descriptor、symbol/named property、
  `__proto__` 与 sparse array。
- tooltip、SVG 和 export 路径完成 XSS/metadata sanitization，不执行动态输入或泄漏 source content。
- preview render 失败会取消交互并恢复 authoritative scene；异步 render/export、resize 与 destroy 生命周期闭环。
- React Strict Mode、Vue reactive Proxy、等价输入、selection/history、focus/a11y、container responsive 与
  current/previous browser 均有回归门禁。
- package test 使用临时 npm cache；performance gate 排除 trace/video/screenshot 干扰并等待 authoritative ready。
- tarball framework consumers 使用 strict peer install；Vite/Rolldown WASM fallback 的 registry 漂移由精确
  版本约束和 stable gate 测试阻断。

## Package Evidence

| Package | Size | SHA-256 |
| --- | ---: | --- |
| `@tellplot/core` | 216937 bytes | `4cfa4d35bc3b2806daeb041e24c06916cf497b489c4f41f6c427474eb2de7e7b` |
| `@tellplot/editor` | 261820 bytes | `3f37a90d566d956d8d0a2d30978b17a0f2b5dd4dd2d2ea26626ac50130bb06a2` |
| `@tellplot/react` | 6481 bytes | `c8d84a0a825883167e056f82f1918adcf80c858b022c7d65651fdcaa18395242` |
| `@tellplot/vue` | 6127 bytes | `a149c504084ea1af7d003e8c3a3374e30660a29afb8159ee68d3d158c5aa8811` |

## Source Evidence

- `diff.patch` 记录当前 G006 候选相对仓库 HEAD 的全部文本/二进制变更，并排除 evidence 自身。
- Patch: 278 file headers / 58,159 lines / 2,093,415 bytes。
- SHA-256: `218b0895b39283feb4d4122fbcfa9649f59ac0bdc941448bd561ddb92aaad2c3`。
- `git apply --check --cached .ai-platform/evidence/T129/diff.patch` 通过，证明 patch 可应用到当前 HEAD index baseline。

## Residual Low Risks

- 永久 command ID 去重集合在超长常驻实例中线性增长。
- AntV 未调用的 transitive dynamic-code 分支和 strict Trusted Types 宿主需要持续验证。
- 候选仍是本地 dirty/uncommitted worktree；G005 必须从干净 commit 重跑完整发布门禁。
- 最大 G2 chunk 为 448.83 kB；500 kB 构建预算持续约束回归。
- 当前环境未获 registry advisory 查询授权，在线 `pnpm audit --prod` 未刷新；npm/GitHub/托管/域名也属于 G005。

上述 Low 风险不阻断 G006/T129 验收。公开发布仍须独立授权。
