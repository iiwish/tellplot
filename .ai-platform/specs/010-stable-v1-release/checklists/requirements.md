# G004 稳定版 1.0 Requirements Checklist

## Metadata

- Feature ID: `010-stable-v1-release`
- Goal ID: `G004`
- Version: 1.0.0
- Status: Completed
- Last updated: 2026-07-23

## Checklist

- [x] 稳定版与图表数量无关，承诺范围明确。
- [x] 1.0 runtime/type/schema/error/peer/browser 合同可测试。
- [x] SemVer、弃用、支持与安全政策有明确要求。
- [x] 本地候选与公开发布状态严格区分。
- [x] dirty worktree 不作为远程发布来源。
- [x] architecture、cycle、link、secret/path、tarball 审计可自动执行。
- [x] 隔离源码复演不需要破坏或提交当前工作树。
- [x] 远程 Git、deploy、tag、release 和 publish 保留独立闸门。
- [x] 新图表、schema、依赖和核心重构保持范围外。

## Result

`PASS`。没有阻断性需求缺口，可以执行 T123。
