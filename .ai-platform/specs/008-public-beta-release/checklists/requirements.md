# G004 首个公开 Beta 发布需求清单

## Metadata

- Feature ID: `008-public-beta-release`
- Version: 0.1.0
- Status: Superseded
- Source: `../spec.md`
- Last updated: 2026-07-23

## Requirement Quality

- [x] Beta 版本、包名和 dist-tag 明确。
- [x] 本地准备与远程发布的人工闸门分开。
- [x] fresh clone、clean `main`、commit/tag/tarball/site 可追溯关系明确。
- [x] GitHub、npm、网站和文档四个公开表面均有成功标准。
- [x] npm scope、登录、2FA/Trusted Publishing 和域名权限被列为外部依赖。
- [x] WebKit 残余失败不能被隔离复跑掩盖。
- [x] 架构边界、公共 API、包格式、兼容性、安全和敏感信息要求可验证。
- [x] 新图表、breaking API、schema、依赖和通用 registry 明确排除。
- [x] 发布后 registry 安装与生产网站验证被覆盖。

## Findings

- Critical: 0
- High: 0
- Medium: 0
- Low: 2

Low findings：

- 两个 family Canvas 存在较多交互编排重复；发布前重构的回归风险高于收益，在新增下一图表家族前评估。
- `formatAmount` 的目录 ownership 与 architecture test 覆盖面可以更清晰；T120 通过边界门禁和文档约束
  防止继续扩散。

## Resolution

上述 Low finding 不影响当前公共 API、运行时正确性或 Beta 安装。G004 坚持最小发布变更，并把它们写入
架构基线和后续扩展前置条件。

## User Review Gate

Beta requirements 不再进入执行；当前稳定版 requirements 位于
`.ai-platform/specs/010-stable-v1-release/checklists/requirements.md`。
