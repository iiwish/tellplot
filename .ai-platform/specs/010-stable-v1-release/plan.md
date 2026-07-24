# G004 首个稳定版 1.0 计划

## Metadata

- Feature ID: `010-stable-v1-release`
- Goal ID: `G004`
- Version: 1.0.0
- Status: Confirmed
- Last updated: 2026-07-23

## Strategy

1. 用 RED tests 锁定 `1.0.0` metadata、稳定 runtime exports、必需公共资料和 release scripts。
2. 冻结 SemVer、兼容、弃用、支持与 schema 政策，不扩展图表范围。
3. 使用 TypeScript compiler API 建立 import graph、依赖方向和 cycle 门禁。
4. 建立本地链接、secret/path、metadata 与 tarball 审计，并组合为 `pnpm release:check`。
5. 从隔离源码执行 frozen install 与稳定候选复演。
6. 运行完整矩阵，生成 tarball manifest、architecture report、review 和目标 evidence。

## Version Strategy

- package version：`1.0.0`。
- 本地验证产物：`tellplot-editor-1.0.0.tgz`。
- npm dist-tag：未来远程发布使用 `latest`；本目标不执行 publish。
- breaking changes：只允许进入新的 major。
- deprecation：至少跨一个 minor，包含替代路径、迁移文档和测试。

## Release Commands

- `pnpm release:architecture`
- `pnpm release:audit`
- `pnpm release:check`
- `pnpm release:rehearse`

`release:check` 不执行 Git 或网络写操作。`release:rehearse` 创建临时隔离源码副本并验证，不修改当前工作树。

## Risk Controls

- dirty worktree：仅作为本地候选输入；公开发布必须等待后续 Git 授权形成干净 commit。
- 首发即 1.0：稳定承诺限定当前三个图表家族和文档化能力，不承诺通用 G2 替代品。
- 无公开 Beta：用独立 tarball、React 18/19、上一浏览器和隔离源码复演提高发布前置信心。
- 发布脚本误泄漏：只报告规则与文件路径，不回显匹配内容。
- 发布前重构：禁止修改领域、projection、interaction 和 G2 runtime。
