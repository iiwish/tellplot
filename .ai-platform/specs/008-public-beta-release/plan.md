# G004 首个公开 Beta 发布技术计划

## Metadata

- Feature ID: `008-public-beta-release`
- Goal ID: `G004`
- Version: 0.1.0
- Status: Superseded
- Last updated: 2026-07-23
- Approval: 未批准；稳定版目标以 `.ai-platform/specs/010-stable-v1-release/` 为准

## Decision Summary

1. 发布源只能是干净 `main` 的确定 commit，不从当前未提交工作区直接 publish。
2. 当前分层与 G2 ownership 保持不变；发布前不重构大型 Canvas，不建立 registry。
3. T120 完成本地发布硬化、架构门禁、WebKit 稳定性、公开资料和可复现验证。
4. T121 只在本地门禁完成且用户再次批准远程动作后执行公开仓库、网站、tag、release 和 npm publish。
5. Beta 使用 `beta` dist-tag；`latest` 留给未来稳定版。

## Architecture Decision

TellPlot 不复制 G2 的 Runtime + library 扩展系统。G2 是通用可视化语法，按 mark、scale、coordinate、
interaction 和 runtime 组织；TellPlot 是受限业务编辑器，按不可变领域状态、图表家族投影、G2 adapter、
交互和 React surface 组织。两者共同遵循概念分层、窄公共入口和内部 runtime ownership，但模块数量与
抽象层级按产品规模保持克制。

T120 增加可执行的 architecture gate，至少锁定：

- `domain/**` 不依赖 React、G2、components、charts、rendering 或 export。
- `interactions/**` 不依赖 React、G2 或 components。
- G2 runtime/type import 只允许在 `charts/**/spec.ts`、`charts/groupRegions.ts` 和 `rendering/g2/**`。
- 低层模块不得新增到 `components/**` 的运行时依赖。
- TypeScript/TSX runtime import graph 无循环。
- `src/index.ts` 不导出内部 chart/runtime/scene 类型。

## Release Flow

```text
accepted goals
  -> local architecture/package hardening
  -> clean-clone full validation
  -> remote-action approval
  -> public repository + production site
  -> tag/release + npm beta publish
  -> public registry smoke test
```

## Validation Strategy

### Local

- architecture/public API/package contract tests。
- format、lint、typecheck、unit/coverage 和 build。
- React 18/19、current/previous browser、a11y 和 performance。
- fresh clone + frozen install + exact release commands。
- tarball file allowlist、sensitive data、broken link 和 metadata audit。

### Remote

- GitHub default branch/CI/visibility、tag 和 release。
- production site HTTPS、direct routes 和 asset loading。
- npm version、dist-tags、provenance/maintainers 和 public install。

## Risk Register

| Risk | Impact | Mitigation |
| --- | --- | --- |
| 从 dirty worktree 发布 | npm 产物不可追溯 | 只允许 clean main commit；fresh clone 复演 |
| Beta 意外占用 latest | 普通安装获得预发布版 | 显式 `--tag beta`；发布后检查 dist-tags |
| WebKit 长矩阵超时 | 发布门禁不稳定 | T120 定位并修复；未解决需单独风险批准 |
| npm scope 无权限 | publish 失败或命名被占 | 发布前确认 `@tellplot` owner/write 与 2FA |
| 私有仓库或失效主页 | 开源用户无法审计/学习 | 公开仓库与生产网站先于 npm publish |
| 发布前大型重构 | 引入交互回归 | G004 限定最小发布变更；结构债务后置 |
| token 泄漏 | 供应链与账号风险 | Trusted Publishing/2FA；secret audit；日志脱敏 |

## Constitution Check

- G2 原生能力优先：满足，不改变 runtime ownership。
- SourceData 不可变与统一命令：满足，不改变领域行为。
- 新依赖必须解决确认问题：满足，默认不新增依赖。
- TDD 与发布证据：满足，稳定性修正先建立失败复现。
- 远程 Git/publish 独立授权：满足，T121 保持阻塞。

## Alternatives

### 直接从当前工作区 publish

拒绝。当前工作区包含多目标未提交成果，无法从 Git commit 复现。

### 先扩展更多图表再发布

拒绝。当前三个图表家族已形成可用 Beta，应先公开验证需求，再确定 G003。

### 发布 Beta 到 latest

拒绝。预发布版本必须通过 `beta` dist-tag 明确 opt-in。

### 发布前全面重构组件

拒绝。当前层次边界清晰且行为验证充分，大型重构会扩大首发风险；只补强可执行边界门禁。
