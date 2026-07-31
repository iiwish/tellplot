# G005 本地发布准备 Requirements Checklist

## Metadata

- Version: 1.0.0
- Status: Completed
- Source: `.ai-platform/specs/012-public-release-readiness/spec.md`
- Last updated: 2026-07-31

## Checks

- [x] 本地 candidate 与公开发布 source 的合同明确分离。[Scope]
- [x] dirty branch、commit provenance、annotated-tag parity、隔离 remote query 和版本前置条件可测。[Traceability]
- [x] npm production advisory 使用官方 registry 且失败关闭。[Security]
- [x] stage-only Trusted Publishing、environment approval、provenance 与最小 OIDC job 可静态审计。[Supply chain]
- [x] 四包 staging 顺序、部分 stage 恢复和独立 2FA approval 行为明确。[Correctness]
- [x] 浏览器失败禁止通过 fixed sleep、skip、retry 或放宽断言处理。[Quality]
- [x] Browser/framework runner 在 POSIX 与 Windows 都有有界进程树释放，并由动态 lifecycle fixture
  验证 signal、孙进程和临时目录清理。[Portability]
- [x] remote Git、visibility、DNS、deploy、tag、release 与 publish 保持独立人工闸门。[Authorization]
- [x] canonical 文档更新与未发布状态有明确验收标准。[Documentation]

## Findings

- Critical: 0
- High: 0
- Medium: 0
- Low: 0

## User Gate

用户于 2026-07-31 明确要求修复 2026-07-30 发布 review 中列出的本地问题。该授权不包含任何远程或
公开发布动作。
