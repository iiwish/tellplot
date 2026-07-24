# T119 演示内容与图形复核

## Verdict

`PASS`。演示数据、网站专用图表主题与示例代码形成同一套可复用展示系统，未修改
`@tellplot/editor` 的稳定默认配色或新增公共 API。

## Presentation System

- 瀑布图使用无需图例即可理解的业务语义色：增长绿色、下降红色，起点、小计与终点等锁定锚点统一蓝色，
  分组使用青绿色。
- 演示数据保留期初 `3,200`、经营利润小计 `3,690`、期末 `3,440` 三个财务锚点，并通过
  `+980 / +540 / +260` 与 `-720 / -250 / -320` 形成清晰的增长、成本、回落节奏。
- 分类图数据采用收入与投入并列的业务口径，正负值跨度足以验证柱状图、条形图、分组与排序。
- 首页接入示例只保留包导入、样式导入、数据导入、`type` 与 `data`；工作台实时配置只显式写出
  会影响当前展示的设置。
- 实时配置保持纯 JSON、无 `eval`，右侧命令仍只更新独立 `ViewSpec`，双向同步边界不变。

## Verification

| Gate | Result |
| --- | --- |
| `pnpm test:unit` | 52 files；440/440 passed |
| focused Chromium E2E | 21/21 passed |
| interaction cancellation E2E | 12/12 passed |
| `pnpm test:a11y` | Chromium / Firefox / WebKit 45/45 passed |
| `pnpm test:performance` | waterfall p95 90.5ms；categorical p95 95.8ms；both <150ms |
| `pnpm lint` | passed |
| `pnpm typecheck` | passed |
| `pnpm format:check` | passed |
| `git diff --check` | passed |

## Visual Evidence

- `visual/showcase-theme-home-desktop.png`
- `visual/showcase-theme-home-mobile.png`
- `visual/showcase-theme-examples-mobile.png`
- `visual/showcase-theme-workbench-desktop.png`
- `visual/showcase-theme-workbench-mobile.png`
- `visual/semantic-palette-workbench-desktop.png`
- `visual/semantic-config-docs-desktop.png`
- `visual/semantic-config-docs-mobile.png`

1440x900 与 390x844 均无横向溢出；首页首屏可看到真实图表和下一段内容，工作台保留实时配置、
真实画布与结构大纲的同步关系。
