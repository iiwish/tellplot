# T106-CR001 Test Results

## Metadata

- Status: Accepted
- Accepted on: 2026-07-16
- Downstream gate: T107 compatibility evidence refresh unlocked；T108 remains `Draft` until T107 acceptance.

## RED And Review Findings

| Target | Exit | Signal |
| --- | ---: | --- |
| acceptance interaction regressions | 1 | locked click 无 selection；密集柱 `<4px` 抖动提前显示 overlay/可能提交；pending release 多发 idle |
| independent interaction review | review finding | readOnly click selection、locked outside-release cleanup、回拖清 target 与 X-only real-width contract 缺口 |
| original target acquisition | behavioral failure | 必须等 pointer 触碰目标柱的二维区域才预排，未按拖动柱宽计算 |
| stale chart action after exact ungroup | 1 | 280/281 passed；已删除 group 的 overlay 暴露内部 ID |

所有 finding 均已通过 focused regression 关闭；没有放宽行为断言。

## GREEN And Fresh Validation

| Command | Exit | Result |
| --- | ---: | --- |
| targeted chart pointer/state tests | 0 | 2 files、47 tests passed |
| `pnpm test:unit` | 0 | 28 files、292 tests passed |
| `pnpm test:coverage` | 0 | 292 tests passed；全部 thresholds 通过 |
| selected Chromium command/interaction/export | 0 | 21/21 passed、0 skipped、0 unexpected |
| accessibility Chromium | 0 | 7/7 passed；zero serious/critical axe violations |
| isolated production performance | 0 | 200 visible items、30 samples、p95 26.4ms、same-target commit delta 0 |
| production full Chromium projects | 0 | 31 functional + 1 isolated performance = 32/32 passed |
| `pnpm typecheck` | 0 | editor 与 playground strict source typecheck 通过 |
| `pnpm lint` | 0 | 0 warning/error |
| `pnpm format:check` | 0 | 全部 matched files 通过 |
| `pnpm build` | 0 | editor ESM/CJS/CSS/declarations 与 playground production build 成功 |
| `pnpm test:package` | 0 | publint、ATTW、ESM/CJS runtime 与 type consumer 通过 |
| `git diff --check` | 0 | 无 whitespace error |
| feature artifact validator | 0 | `001-waterfall-editor-foundation` lightweight validation passed |

## Coverage

| Boundary | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| Aggregate | 90.20% | 83.96% | 92.27% | 90.30% |
| Domain | 97.81% | 95.04% | 100% | 97.76% |
| Components | 84.40% | 77.62% | 86.58% | 84.82% |
| Interactions | 81.81% | 72.51% | 100% | 80.90% |
| Waterfall | 97.52% | 95.83% | 100% | 97.50% |

## Horizontal Reorder Matrix

- Right crossing: translated source `maxX` reaches sibling `minX` and resolves `after` before the pointer touches the target bar.
- Left crossing: translated source `minX` reaches sibling `maxX` and resolves `before`.
- Furthest crossing: resolver returns the furthest consecutively crossed sibling in the drag direction.
- Real width: source and candidates can have unequal widths; no inferred slot width is used.
- X only: target resolution has no Y input; component and real Chromium move the pointer outside the target's vertical range.
- Origin return: target and indicator clear; pointerup produces no command.
- Pending threshold: absolute horizontal delta below 4px produces no dragging publication or overlay, even when dense bar edges already touch.

## Locked And Lifecycle Matrix

- Start、operating subtotal、end 与 pinned projection 均走 `datum.locked` 门；拖动尝试返回 `item-locked`，revision/history 不变。
- Locked 和 readOnly press 都能在未水平移动 4px 时完成 selection。
- Native pointerup outside、pointercancel、lostpointercapture、Escape、window blur 与 unmount 都释放 capture/listeners 并恢复 idle。
- 每个系统锚点在真实 Chromium 中独立 reload 后验证，避免前一个手势的 stale state 掩盖后续断言。

## Performance Evidence

- Approved contract 保持 200 visible contributions、30 full drag samples、nearest-rank p95 `<=150ms` 与 same-target 100 pointermove 的 React root commit delta `0`。
- 开发服务器测量曾出现 p95 178.4ms、203.7ms、213.8ms 和 260.9ms；失败样本包含 React/Vite development instrumentation、runner 调度与 probe 成本，不代表交付运行态。
- 一次 functional harness failure 来自 200 项窄柱下旧 pointerdown 坐标落在柱外；harness 改为读取 Canvas 真实 source/target bounds，未修改产品阈值。
- Playwright 最终从 production Vite build 启动 strict-port preview。isolated 样本 p95 为 26.4ms，production combined projects 32/32；阈值、样本数和产品代码性能路径均未放宽。

## Validation Retries

- 端口 4174 被无关项目占用；fresh runs 使用 4176-4179 严格端口，未复用未知 server，也未终止用户进程。
- `pnpm test:package` 在默认 sandbox 内的 `npm pack` 失败；同一命令在批准的 sandbox 外通过 publint、ATTW、runtime 与 type consumer，确认是 sandbox 限制。
- `pnpm test:a11y -- --project=chromium` 会把分隔符传给 Playwright；批准的显式 Chromium 命令通过 7/7。
- task-level artifact validator 返回 `Task not found: T106-CR001`，因为 parser 只识别 `TNNN`；feature-level validation 通过。

## Real Browser Evidence

- Blank plot marquee、atomic create-and-collapse、nested group create/expand/collapse、exact ungroup、undo/redo 与 export 路径通过。
- X-only drag 使用 source `maxX` 与 target `minX` 计算 crossing，pointer 保持在目标柱之前且 Y 位于目标垂直范围之外，revision 和顺序仍正确更新。
- Start、operating subtotal、end 三个锁定 mark 分别验证不出现 overlay、revision 保持 0、交互回到 idle。
- In-app browser 在 `127.0.0.1:5175` 以大幅垂直偏移完成同一 X-only 换位；随后拖动经营利润小计保持 revision 不变、interaction 为 idle，reload 后恢复 revision 0 验收状态。
- 390x844 保持 chart painted、outline dialog 可达；axe 无 serious/critical violation。

## Not Run

- Firefox/WebKit 与 React 18.3/19.2 host matrix 属于 T108；当前环境未安装对应 browser binaries。
- Remote CI、publish、push、PR、merge 和 npm registry smoke 未获授权。
