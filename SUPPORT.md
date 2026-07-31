# TellPlot Support

## Stable Scope

1.x 支持 waterfall、单序列 bar、单序列 column，以及文档化的配置、编辑、持久化、SVG/PNG 和无障碍能力。
支持矩阵见 [docs/versioning.md](docs/versioning.md)。

## Before Opening An Issue

1. 确认使用受支持的 framework adapter、G2、Node 和浏览器版本。
2. 阅读 [入门](docs/getting-started.md)、[API](docs/api.md)、[错误处理](docs/errors.md) 和
   [迁移说明](docs/migration.md)。
3. 使用 `validateChartConfig`、`validateSourceData` 或 `validateViewSpec` 获取脱敏错误路径。
4. 准备不包含真实金额、业务标签、来源引用或凭据的最小复现。

Bug 使用 Issue 模板；明确的新图表需求使用 feature request。使用问题可以提交 Discussion。安全问题必须
遵循 [SECURITY.md](SECURITY.md) 私下报告。

## Response Contract

开源维护按可用时间进行，不提供 SLA。Critical 安全和数据正确性问题优先；兼容性回归、可访问性与导出
问题次之；未确认的通用扩展和新图表进入路线图评估。
