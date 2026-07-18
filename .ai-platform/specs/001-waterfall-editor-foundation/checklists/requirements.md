# 001 需求质量清单

## Metadata

- Version: 0.2.0
- Status: Completed
- Reviewed: 2026-07-16

## Product And Scope

- [x] 产品用户、真实工作流和第一切片结果明确。
- [x] React 组件包与薄参考编辑器的职责边界明确。
- [x] 瀑布图与后续分类图的阶段边界明确。
- [x] AI、PPTX、服务端、协同和通用插件系统明确排除。

## Data And Correctness

- [x] SourceData、ViewSpec、EditorSession 和 projection 的职责明确。
- [x] 稳定 ID、重复 label、非有限金额、anchor 和 group 规则明确。
- [x] 来源守恒、金额守恒、锁定项和原子失败要求可测。
- [x] revision、undo/redo 和持久化兼容规则明确。
- [x] 错误有稳定 code、path 和非敏感 details。
- [x] 递归树的循环、孤儿、多父、覆盖唯一性、最小直接子节点和 subtotal segment 规则明确。
- [x] 外层折叠往返、精确解组和 descendant collapsed state 保留语义明确。

## Interaction And UX

- [x] 图表、大纲和键盘路径都映射到同一命令。
- [x] 合法落点、非法落点、Escape、blur 和固定项反馈明确。
- [x] ready、empty、invalid、rejected、exporting 和 reduced-motion 状态明确。
- [x] 桌面、紧凑桌面和移动安全布局明确。
- [x] motion 的所有权、时长、easing 和 reduced-motion 路径明确。
- [x] 柱子点击、4px 水平拖动阈值、空白框选、同父级真实柱宽 X-only 命中和非法跨层选择语义明确；Y 轴高度不参与排序。
- [x] 起点、终点、小计、固定项与只读项的点击选择、拖动拒绝和 pointer cleanup 语义明确。
- [x] live reorder preview 与 command/history 提交边界明确。
- [x] hover-only group action 存在 focus、keyboard 和 outline 等价路径。

## Integration And API

- [x] 受控/非受控模式与冲突语义明确。
- [x] 公共 exports、peer dependencies、styles 和 imperative handle 明确。
- [x] export 返回 Blob，不隐式下载或发起网络请求。
- [x] 回调和事件不包含敏感财务值。

## Quality And Acceptance

- [x] 正确性、性能、可访问性、包质量和浏览器目标量化。
- [x] 每个 user story 有可观察 acceptance。
- [x] 每个 requirement 映射到 task。
- [x] TDD、真实 G2 浏览器验证、visual QA 和 package checks 都有任务。
- [x] release 前三层 review 与用户 acceptance gate 明确。

## Conclusion

递归分组与图表直接编排需求完整、可测且与项目章程一致。用户已于 2026-07-16 明确批准 T106-CR001 范围与 TDD 执行。
