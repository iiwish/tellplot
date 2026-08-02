# G007 Requirements Checklist

- [x] 用户明确批准一个无 scope 的公共 `tellplot` 包。
- [x] 内部 core/editor/React/Vue 分层继续保持私有和可独立测试。
- [x] 公共根、core、React、Vue 和 CSS 子路径已明确。
- [x] G2/G SVG direct dependency 与 React/Vue optional peer 边界已明确。
- [x] 不保留未公开四包 API 兼容负担。
- [x] 单包 package 与 framework consumer 门禁通过。
- [x] 完整 release gate 与 reproducible artifact 通过。
- [x] 旧 staged candidates 与 scoped bootstrap packages 清理并完成新 package trust 配置。
- [x] 公开 npm、tag、GitHub Release 与 fresh install 证据一致。
