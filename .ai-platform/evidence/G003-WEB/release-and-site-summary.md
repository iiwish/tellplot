# TellPlot 2.0 发布与官网优化验收摘要

## 公共发布

- npm：`tellplot@2.0.0`，`latest=2.0.0`
- Git tag：`v2.0.0`
- Release commit：`389cb7fe143ddf733a839af721cc1c26c96c9810`
- GitHub Actions run：`33376535385`
- GitHub Release：<https://github.com/iiwish/tellplot/releases/tag/v2.0.0>
- npm artifact SHASUM：`ab3d9b1379907076cb8292bd4bf9797d25168cc5`
- 冻结 artifact SHA-256：`44177ce56c1839748ee1558aba8e6e5660dc882cb7387193ff28f585bc263fca`
- npm publish attestation 与 SLSA provenance 已验证，fresh install 与公共入口 smoke 已通过。

## 官网优化

- 首页默认示例固定为 `01 经营变动瀑布图`。
- 顶部版本标识更新为 `2.0`。
- 工作台文件栏增加五个公开示例的原生选择器，当前选择由 URL 确定并支持刷新、分享与浏览器历史。
- 切换示例会重建对应 config 与 ViewSpec；存在编辑时先提示，取消后保留当前工作。
- 测试/诊断 fixture 显示“当前测试数据”，不伪装成公开目录项。
- 移动端收敛选择器标签与文件状态，导出菜单向右对齐，390px 视口无横向溢出。
- Changelog 已从本地候选描述更新为 `2.0.0` 的已发布 canonical 状态。

## 验证结果

| 门禁 | 结果 |
| --- | --- |
| `pnpm test:unit` | 72 files / 618 tests passed |
| `pnpm lint` | passed, 0 warnings |
| `pnpm build:site` | passed |
| `e2e/showcase.spec.ts` | Chromium / Firefox / WebKit，21/21 passed |
| `e2e/accessibility.spec.ts --project=chromium` | 16/16 passed |
| `git diff --check` | passed |

## 视觉证据

- `site-audit/01-production-home-desktop.png`：修改前首页默认 04。
- `site-audit/02-production-workbench-desktop.png`：修改前工作台没有示例切换入口。
- `site-audit/04-local-home-desktop.png`：修改后首页默认 01，版本标识为 2.0。
- `site-audit/05-local-workbench-desktop.png`：修改后桌面工作台选择器与文件操作共存。
- `site-audit/06-local-workbench-mobile.png`：390x844 移动端多序列工作台无重叠或溢出。

## 审核结论

实现未修改 npm package、公共 API、schema 或图表 runtime。官网目录继续是 website-only catalog，工作台只消费既有 canonical fixture。当前变更具备提交 PR、通过 fresh CI 后合并并由 Vercel 从 `main` 自动部署的条件。
