# TellPlot 文档

本目录提供面向产品、设计、工程和集成方的长期文档入口。交付任务、执行包与验收证据保留在 `.ai-platform/`，不与长期产品文档混写。

## 权威来源

- [产品设计 SSOT](../.ai-platform/docs/product-design.md)
- [项目章程](../.ai-platform/memory/constitution.md)
- [技术决策记录](../.ai-platform/docs/technology-decision-record.md)
- [工程任务图](../.ai-platform/docs/tasks.md)
- [发布状态](../.ai-platform/docs/release-report.md)

## 长期文档

- [产品路线图](roadmap.md)
- [架构概览](architecture.md)
- [图表配置边界](configuration.md)

## 文档规则

- 产品定位、范围和成功指标只在产品设计 SSOT 中定义。
- 路线图只记录产品阶段、结果和进入条件，不复制工程任务清单。
- 架构文档解释稳定边界；具体实现决策进入技术决策记录。
- 配置文档描述 TellPlot 公共语义，不把 G2 的内部配置面直接变成公共 API。
- `.ai-platform/evidence/` 是不可变的交付证明，不承担当前产品说明职责。
