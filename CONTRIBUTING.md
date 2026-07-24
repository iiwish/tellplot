# Contributing to TellPlot

感谢参与 TellPlot。项目保持小核心：新能力必须来自明确图表需求，优先使用 G2，不引入第二渲染引擎、
Dashboard、AI 或通用插件框架。

## 开始

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test:unit
pnpm build
```

需要 Node 22.20.0 和 pnpm 11.1.3。行为变更默认先增加失败测试；财务聚合、顺序和层级变更必须有不变量测试。

## Pull Request

- 每个 PR 只解决一个清晰问题，说明用户影响、验证命令和残余风险。
- 使用 Conventional Commits。
- 不提交生成的 `dist/`、coverage、Playwright report、token、业务数据或个人环境文件。
- 公共 API、schema、依赖、发布和远程基础设施变化必须先获得维护者批准。
- UI 变化附桌面和移动证据；交互变化覆盖键盘、reduced motion 与真实浏览器。

提交前运行：

```bash
pnpm release:check
pnpm test:e2e
pnpm test:a11y
pnpm test:performance
```

## 设计边界

- `SourceData` 不可由编辑动作改写。
- `ViewSpec` 是排序、分组、折叠、固定、注释和强调的唯一持久状态。
- 图表、大纲、键盘和宿主调用进入同一确定性命令。
- G2 负责 mark、scale、coordinate、scene boundary、renderer 和图形动画。

安全问题请按 [SECURITY.md](SECURITY.md) 私下报告，不要创建公开 Issue。
