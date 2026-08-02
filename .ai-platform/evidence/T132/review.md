# T132 Review

## Status

- Status: Passed
- Unresolved Critical: 0
- Unresolved High: 0
- Unresolved Medium: 0

## Review Focus

- Vercel 必须从仓库根目录解析 workspace source，不能把 `apps/playground` 设为隔离 Root Directory。
- pnpm 11 必须精确执行，不得为托管环境静默降低项目 release toolchain。
- 静态 HTML 与客户端导航 metadata 必须一致，查询参数不进入 canonical。
- fallback 只能覆盖已知路由，未知路径不能成为 soft 404。
- CSP、缓存和 discovery assets 不得引入客户端 secret、远程运行时或第二个网站框架。

## Findings Closed

- Vite `write: false` 测试不会返回 public directory assets：测试改为同时验证 generated bundle route shells 与
  public discovery 文件，并校验 PNG 固有宽高。
- 客户端进入 not-found 后会保留上一页面 canonical/OG：not-found 分支显式更新 current URL 和 noindex，再在
  返回有效路由时恢复 index metadata。
- HTML 缓存合同只依赖 Vercel 默认值不够明确：四个页面显式使用 must-revalidate，hashed assets 单独 immutable。

## Verdict

T132 满足 WEB-FR-001 至 004 和 WEB-SC-001。代码、测试和 production artifact 可以作为 clean Git source
进入 T133 Preview；托管环境行为不在本任务中提前声明通过。
