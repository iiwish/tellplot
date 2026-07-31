# Security Policy

## Supported Versions

| Version        | Support              |
| -------------- | -------------------- |
| 1.x            | 安全与数据正确性修复 |
| 未发布开发版本 | 仅当前 `main`        |

## Reporting

请通过 [GitHub Security Advisory 私有报告入口](https://github.com/iiwish/tellplot/security/advisories/new)
联系维护者。不要在公开 Issue、Discussion、日志或截图中披露漏洞细节、token、私钥、业务金额、标签或
来源引用。

报告应包含：

- 受影响版本和环境。
- 可脱敏的最小复现。
- 预期与实际影响。
- 已知缓解方式。

维护者会在确认收到后协调复现、修复、公告和披露时间。无法立即修复时，会提供风险说明和临时缓解措施。

## Scope

核心包默认不发起网络请求。宿主的数据获取、权限、持久化、上传和服务端集成不属于 TellPlot 的安全边界。

## Dependency Integrity

TellPlot 将 AntV G2 peer 固定为经过兼容与安全复核的 `5.4.8`，并对 lockfile 中全部 `@antv/*` 包使用
精确版本与 `sha512` integrity allowlist。CI 与隔离源码复演在安装依赖前执行 `pnpm security:lock`，
拒绝未经复核或缺失 integrity 的 AntV artifact、自定义 tarball / resolution、`@antv/setup` 和已知恶意
lifecycle indicator；安装后再由 `pnpm security:dependencies` 核对实际 manifest、精确版本和
`preinstall` / `install` / `postinstall`。workspace 仅允许 `esbuild` 执行安装期构建脚本，CI 使用的
第三方 GitHub Actions 也固定到经过复核的完整 commit SHA。稳定版门禁会复验这些检查。

这是对 2026 年 5 月 AntV npm 供应链事件的长期防护。依赖升级必须同时更新 allowlist、完整质量矩阵和
安全复核，不得只放宽 semver range。事件参考：
[GitLab G2 advisory](https://advisories.gitlab.com/npm/%40antv/g2/GMS-2026-196/) 与
[Microsoft Security Research](https://www.microsoft.com/en-us/security/blog/2026/05/20/mini-shai-hulud-compromised-antv-npm-packages-enable-ci-cd-credential-theft/)。
