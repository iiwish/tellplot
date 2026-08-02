# T138 Test Results

| Gate | Result | Evidence |
| --- | --- | --- |
| TDD RED | Passed | drag ghost 测试因缺失 renderer-sized preview 按预期失败；分组节奏测试因缺失 `STORY_PACING_SECONDS` 按预期失败 |
| Production recapture | Passed | schema 2 manifest、7 个 WebM、14 个首尾静帧、7 组终态断言；`story-take` 完成单次会话全流程，action pre-roll 为 0.653 秒 |
| Editor drag ghost | Passed | focused 1 file / 10 tests；验证 G2 scene 尺寸、轴向、语义色、标签和 pointer delta transform |
| Pointer contract | Passed | `page-event-overlay` version 1、160ms feedback、真实 pointer event 驱动 |
| Story contract | Passed | 50.4 秒连续编辑器、0 个 editorial overlay、2 个主视觉切点、静态瀑布图家族证明、`31% 51%` 固定竖屏焦点 |
| Action cue contract | Passed | 6 个主 cue 直接引用字幕时间点，展开/折叠、重做、导出按顺序位于同一长镜头 |
| Video tests | Passed | 5 files / 14 tests |
| Full renders | Passed | 横竖屏均为 1908 帧，封面 still 成功 |
| Key-frame review | Passed | 当前脚本覆盖 20 个横屏、15 个竖屏关键帧；媒体审计读取 27 / 21 个非空 review 帧 |
| Media audit | Passed | H.264/AAC、48 kHz stereo、63.658667 秒、目标分辨率与封面尺寸全部匹配 |
| Deliverable tests | Passed | 1 file / 4 tests；视频、封面、字幕均满足合同 |
| Format / lint / typecheck | Passed | 全仓 Prettier、ESLint、7 个 workspace typecheck |
| Unit tests | Passed | 56 files / 461 tests |
| Cross-browser E2E | Passed | Chromium、Firefox、WebKit 共 204 tests；包含图表拖拽、取消、框选、响应式与无障碍流程 |
| Build | Passed | core、editor、React、Vue、单公共包和 production site 全部构建 |
| Release audit | Passed | 唯一公共包仍为 `tellplot@1.0.0`，video workspace 未进入公共表面 |
| Diff check | Passed | `git diff --check` 无错误 |

最终媒体 SHA-256：

- 16:9：`0f3cf761048c308e037a5a91aa345d5868c86d9a925297a3e303b2cf27e506b4`
- 9:16：`e1ec0c90766b0e13dc3268ec60bd31cbb502c3bb1b83c721079aad07416396f2`
- Poster：`6991fd23887c2c6a39dced7d74d0d372732b8053d8d7ee0df8bef41c1c466f2b`
