# TellPlot 版本、兼容与弃用政策

## Semantic Versioning

- patch：修复缺陷，不改变文档化公共合同。
- minor：增加向后兼容能力，可以引入带替代路径的弃用。
- major：允许 breaking public API、schema 或错误码变化，并提供迁移说明。

版本字段描述候选内容。npm、Git tag、GitHub Release 和生产网站状态以公开 registry 与发布报告为准。

## 2.x 公共表面

- `tellplot` 与 `tellplot/core` 的 runtime exports、类型、schema、命令和稳定错误语义。
- `tellplot` 的 `createEditor`、`EditorOptions`、`EditorInstance`、export 和 `styles.css` subpath。
- `tellplot/react` 的 `ChartEditor` props/handle。
- `tellplot/vue` 的 `ChartEditor` props/emits/expose 与 `v-model:view`。
- 文档化的 schema generation、error code/reason 和 JSON Pointer path。

内部文件、CSS class、G2Spec、G2 Chart instance、projection implementation、scene context 和 DOM controllers
不属于兼容承诺。应用不得导入 `src/`、`dist/` 或未声明 subpath。

## 弃用政策

公共能力弃用至少跨一个 minor：在类型和文档中标记、提供替代入口、更新 changelog/migration，并保留
兼容测试到下一 major。安全或数据正确性紧急修复可以立即限制危险行为，但必须说明迁移路径。

## 支持矩阵

| Surface  | Stable support                                                |
| -------- | ------------------------------------------------------------- |
| React    | 18.3、19.x                                                    |
| Vue      | 3.5.x                                                         |
| AntV G2  | TellPlot direct dependency `5.4.8`                            |
| Node     | 构建与验证 `>=22.13.0`                                        |
| Browsers | 当前 Chromium、Firefox、WebKit 与项目 previous-browser matrix |

## Schema

- legacy waterfall `1.0.0` 保持读取与序列化兼容。
- waterfall/categorical `2.0.0` 保持严格 `dataKind` 和 chart type compatibility。
- categorical comparison `3.0.0` 使用 2 至 4 个 source-ordered series，并只与 v3 bar/column view 配对。
- TellPlot 不执行启发式 schema migration。
- 新 schema generation 必须明确读取策略；无法兼容的变化进入新的 major。

兼容问题应包含最小复现、包/framework/browser 版本和脱敏配置，不得提交金额、业务标签、来源引用、token
或私钥。
