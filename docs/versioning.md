# TellPlot 版本、兼容与弃用政策

## Semantic Versioning

TellPlot 从 `1.0.0` 起遵循 Semantic Versioning：

- patch：修复缺陷，不改变文档化公共合同。
- minor：增加向后兼容能力，可以引入带替代路径的弃用。
- major：允许 breaking public API、schema 或错误码变化，并提供迁移说明。

版本字段只描述候选内容。npm、Git tag、GitHub Release 和生产网站是否已发布，以公开 registry 与发布报告
为准。

## 1.x 兼容承诺

兼容表面包括：

- `packages/editor/src/index.ts` 导出的 runtime 和 TypeScript 类型。
- `ChartEditor` props/handle、`ChartConfig`、`SourceData`、`ViewSpec`、commands、errors 和 export。
- `@tellplot/editor/styles.css` 入口。
- 文档化的 schema generation、error code/reason 和 JSON Pointer path 语义。
- React、React DOM、G2、Node 和浏览器支持矩阵。

内部文件、CSS class、G2Spec、G2 Chart instance、projection、scene context 和 runtime adapter 不属于
兼容承诺。应用不得导入 `src/`、`dist/` 或未在 package exports 中声明的路径。

## 弃用政策

公共能力弃用至少跨一个 minor：

1. 在类型和文档中标记弃用，并给出替代入口。
2. 在 CHANGELOG 和 migration 文档说明行为差异。
3. 保留兼容测试，直到下一 major 才允许移除。
4. 安全或数据正确性紧急修复可以立即限制危险行为，但必须发布公告和迁移路径。

## 支持矩阵

| Surface              | Stable support                                                  |
| -------------------- | --------------------------------------------------------------- |
| React                | 18.3、19.x                                                      |
| React DOM            | 与 React 对应的 18.3、19.x                                      |
| AntV G2              | peer range `^5.4.0`                                             |
| Node                 | 构建/验证 22.20.0；CI 验证当前 Node 24                          |
| Browsers             | 当前 Chromium、Firefox、WebKit；上一 Playwright browser release |
| WebKit compatibility | 18.4 previous-major regression matrix                           |

超出 peer/engine range 的组合可以运行，但不属于 1.x 阻断支持合同。

## Schema

- legacy waterfall `1.0.0` 保持解析和序列化兼容。
- waterfall/categorical `2.0.0` 保持严格 `dataKind` 和 chart type compatibility。
- TellPlot 不执行启发式 schema migration。
- 新 schema generation 必须向后读取现有 generation；无法兼容的变化进入新的 major。

## 报告兼容问题

先阅读 [支持政策](../SUPPORT.md) 和 [错误处理](errors.md)，再提交包含最小复现、版本矩阵和脱敏配置的
Issue。不要提交金额、业务标签、来源引用、token 或私钥。
