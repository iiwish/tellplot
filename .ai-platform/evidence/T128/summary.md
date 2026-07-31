# T128 Delivery Summary

- Status: Accepted
- Acceptance: 用户于 2026-07-30 随 G006 完成目标级验收
- Playground: 真实站点改为只消费 `@tellplot/react` 与公共类型，不再依赖 editor 内部实现
- Documentation: README、getting started、API、configuration、architecture、migration、errors、versioning
  与 support 统一描述 `core/editor/react/vue` 四包架构
- Consumer contracts: imperative DOM、React 18/19 和 Vue 3 quickstart 都通过真实 tarball 安装、类型检查、
  生产构建与浏览器挂载/卸载验证
- Release tooling: architecture、audit、artifact、rehearsal 和 stable aggregate gate 均按四包合同工作
- Compatibility: 不保留未公开发布的 React-only API 或过渡重定向

## Review Notes

- Playground 保留完整编辑工作台，配置与 ViewSpec 双文件流程仍只经过公共 API。
- 三种框架 quickstart 分别展示最小接入，公共类型由 core/editor 单一来源导出。
- 文档只描述当前架构，不承诺已删除的历史 API 兼容性。
