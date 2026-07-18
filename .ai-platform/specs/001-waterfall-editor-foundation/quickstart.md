# 瀑布图基础切片验收路径

## Metadata

- Version: 0.2.0
- Status: Confirmed

## Reference Scenario

参考数据表达“期初营业利润 3,200 -> 销量增长 +860 -> 价格提升 +420 -> 产品结构 +160 -> 原材料成本 -510 -> 运输费用 -180 -> 人工成本 -260 -> 经营利润小计 3,690 -> 汇率影响 -90 -> 所得税影响 -240 -> 一次性收益 +80 -> 期末净利润 3,440”。每项使用稳定 ID，小计划分前后两个排序分段。

## User Acceptance Flow

1. 打开参考编辑器，确认中央瀑布图、左侧结构大纲和右侧校验摘要同时可见。
2. 在图表把“所得税影响”拖到“汇率影响”之前，确认落点清晰、期末净利润仍为 3,440。
3. 撤销并重做，确认图表与大纲顺序同步。
4. 在图表空白区域拖出选框覆盖“原材料成本”“运输费用”和“人工成本”，输入“成本压力”并确认，确认分组直接折叠且聚合值为 -950。
5. 展开“成本压力”，选择该组与同级相邻项目创建外组；折叠和展开外组，确认内组折叠状态、来源顺序和总额完整恢复。
6. 尝试拖动“期初营业利润”“经营利润小计”或“期末净利润”，确认锁定锚点不创建拖动预览且视图不变化。
7. 选择“成本压力”，保存 annotation“成本口径已复核”，确认 Inspector 保留精确文本且柱内出现可读摘要。
8. 导出 SVG 和 PNG，确认文件非空、顺序与当前视图一致、annotation 摘要可见。
9. 导出 ViewSpec JSON，刷新后导入，确认顺序、分组、折叠与精确 annotation 恢复。
10. 仅使用键盘重复一次排序与撤销，确认焦点和状态播报正确。

## Failure Flow

1. 加载重复 ID fixture，确认 editor 不渲染错误图表并显示字段路径。
2. 加载 end amount 与累计不一致 fixture，确认校验失败。
3. 拖拽过程中按 Escape 或切换窗口，确认状态未改变。
4. 使用旧 revision command，确认返回 `REVISION_CONFLICT`。
5. 在 reduced-motion 模式重复折叠和排序，确认无补间但所有反馈保留。
6. 构造循环 group、多个父级和跨层 selection，确认返回稳定结构化错误且 session identity 不变。

## Validation Commands

技术方案批准并完成脚手架后，canonical commands 为：

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:coverage
pnpm build
pnpm test:package
pnpm test:react-matrix
pnpm test:browser-previous
pnpm test:e2e
pnpm test:a11y
pnpm test:performance
```

浏览器兼容矩阵使用 `.nvmrc` 固定的 Node 22.20.0。`pnpm test:browser-previous` 以 Playwright 1.60.0 覆盖 Chromium 148、Firefox 150 和 WebKit 26.4 的上一发布列车，并以独立 Playwright 1.52.0 fixture 验证 WebKit 18.4 prior major；非项目 Node runtime 会直接失败，避免产生不可信的兼容性结果。
