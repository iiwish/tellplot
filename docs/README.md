# TellPlot 文档

本目录提供面向产品、设计、工程和集成方的长期文档入口。交付任务、执行包与验收证据保留在 `.ai-platform/`，不与长期产品文档混写。

## 权威来源

- [产品设计 SSOT](../.ai-platform/docs/product-design.md)
- [项目章程](../.ai-platform/memory/constitution.md)
- [技术决策记录](../.ai-platform/docs/technology-decision-record.md)
- [目标与历史任务图](../.ai-platform/docs/tasks.md)
- [发布状态](../.ai-platform/docs/release-report.md)

## 长期文档

- [产品路线图](roadmap.md)
- [架构概览](architecture.md)
- [入门与集成](getting-started.md)
- [公共 API](api.md)
- [错误处理](errors.md)
- [图表配置边界](configuration.md)
- [迁移与兼容](migration.md)
- [版本、兼容与弃用政策](versioning.md)
- [变更记录](../CHANGELOG.md)

## 本地网站

- `/`：产品首页与真实图表家族切换。
- `/examples`：当前三个已验证图表的示例中心。
- `/docs`：面向接入方的可扫描文档入口。
- `/playground`：公共 `ChartConfig`、独立 `ViewSpec`、结构大纲、检查器与导入导出工作台。

网站页面通过 `tellplot/react` 消费唯一公共包，并从 `tellplot` 使用数据与持久化能力。`docs/**` 与
package README 是长期 canonical 文档。网站不提供远程内容、版本服务、搜索后端或公共图表 registry。

## 文档规则

- 产品定位、范围和成功指标只在产品设计 SSOT 中定义。
- 路线图只记录产品阶段、结果和进入条件，不复制工程任务清单。
- 架构文档解释稳定边界；具体实现决策进入技术决策记录。
- 配置文档描述 TellPlot 公共语义，不把 G2 的内部配置面直接变成公共 API。
- 入门和 API 示例必须与 package consumer 一起通过 TypeScript strict 编译。
- `.ai-platform/evidence/` 是不可变的交付证明，不承担当前产品说明职责。
