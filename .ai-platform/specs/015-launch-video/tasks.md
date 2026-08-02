# G009 TellPlot 开源介绍视频 Work Graph

## Metadata

- Feature ID: `015-launch-video`
- Goal ID: `G009`
- Version: 1.4.0
- Status: Confirmed
- Last updated: 2026-08-02
- Approval: 用户批准完整制作目标、Qwen3-TTS 旁白、Remotion 私有工程和本地媒体交付

## T135 - 固化旁白、时间线与 Remotion 制作工程

- Status: Needs_Review
- Priority: P0
- Story / Requirement: VIDEO-FR-001、VIDEO-FR-003、VIDEO-FR-004、VIDEO-FR-006
- Dependencies: G008 implementation complete；用户提供的旁白 WAV 可读
- Blocks: T136
- Parallel: false
- Conflicts with: 公共包依赖、产品行为、npm release、远程部署
- Goal: 建立 private Remotion 工程、旁白/字幕时间线、4K 横版 composition 和可重复本地渲染基线。
- Allowed files: `package.json`、`pnpm-lock.yaml`、`.gitignore`、`apps/video/**`、`.ai-platform/**`、`AGENTS.md`
- Test targets: timeline invariants、composition metadata、audio duration、caption coverage、typecheck、render smoke
- Deliverables: Remotion source、旁白副本、字幕、占位主片、T135 evidence
- Acceptance criteria: 62.969 秒旁白完整覆盖；横版 composition 可枚举并完成短区间 smoke render；无公共包依赖。
- Definition of Done: exact dependencies、timeline tests、typecheck、smoke render、review 与 evidence 全部通过。
- Validation commands: focused tests；`pnpm --filter @tellplot/video typecheck`；Remotion composition；短区间 render；artifact validator；`git diff --check`
- TDD plan: RED 固定 timeline/caption/尺寸合同；GREEN 建立最小 composition；REFACTOR 抽取共享镜头与品牌 token。
- Packet path: `.ai-platform/specs/015-launch-video/packets/T135.yaml`
- Evidence required: `.ai-platform/evidence/T135/summary.md`、`test-results.md`、`review.md`

## T136 - 录制真实产品交互并完成主片

- Status: Needs_Review
- Priority: P0
- Story / Requirement: VIDEO-FR-001、VIDEO-FR-002、VIDEO-FR-006
- Dependencies: T135 Needs_Review
- Blocks: T137
- Parallel: false
- Conflicts with: 虚构 UI、修改产品运行时适配录屏、远程账号画面
- Goal: 从 production build 录制真实排序、框选分组、折叠、撤销和图表家族镜头，替换占位画面并完成主片。
- Allowed files: `apps/video/**`、`apps/playground/tests/**`、`.ai-platform/**`
- Test targets: capture assertions、recording manifest、main composition、frame review、audio sync
- Deliverables: 可重复录制脚本、真实 WebM 素材、16:9 主片、T136 evidence
- Acceptance criteria: 所有核心产品画面来自真实运行时；前 8/12/45 秒节奏合同满足；主片无黑帧和敏感信息。
- Definition of Done: capture、完整主片 render、关键抽帧、spec/code/QA review 与 evidence 全部通过。
- Validation commands: production build；capture script；recording manifest test；main render；frame audit；artifact validator；`git diff --check`
- TDD plan: RED 为每段定义可观察的交互终态；GREEN 录制最小真实镜头；REFACTOR 收敛确定性等待和镜头复用。
- Packet path: `.ai-platform/specs/015-launch-video/packets/T136.yaml`
- Evidence required: `.ai-platform/evidence/T136/summary.md`、`test-results.md`、`review.md`

## T137 - 封面与最终媒体验收

- Status: Needs_Review
- Priority: P0
- Story / Requirement: VIDEO-FR-004、VIDEO-FR-005；VIDEO-NFR-001 至 006
- Dependencies: T136 Needs_Review
- Blocks: G009 goal review
- Parallel: false
- Conflicts with: 社交平台发布、Git push、npm release、云端渲染
- Goal: 完成字幕、安全区、音频、封面与全部媒体探测，形成可验收交付包。
- Allowed files: `apps/video/**`、`.gitignore`、`docs/**`、`AGENTS.md`、`.ai-platform/**`
- Test targets: landscape composition、subtitle safe area、codec/duration/resolution、black-frame scan、cover
- Deliverables: 4K 16:9 MP4、SRT、4K 封面 PNG、渲染说明和 T137 evidence
- Acceptance criteria: VIDEO-SC-001 至 006 全部满足；无 unresolved blocker；输出可播放且与旁白同步。
- Definition of Done: 全量 render、自动媒体检查、关键帧视觉 review、目标总结与 evidence 全部完成。
- Validation commands: full renders；media probe；frame extraction/audit；format/lint/typecheck/tests；artifact validator；secret scan；`git diff --check`
- TDD plan: RED 固定交付 manifest 和媒体规格；GREEN 生成全部输出；REFACTOR 收敛共享布局并完成 review。
- Packet path: `.ai-platform/specs/015-launch-video/packets/T137.yaml`
- Evidence required: `.ai-platform/evidence/T137/summary.md`、`test-results.md`、`review.md`

## T138 - 事件同步指针与连续编辑二剪

- Status: Needs_Review
- Priority: P0
- Story / Requirement: VIDEO-FR-007 至 010；VIDEO-NFR-007 至 008；VIDEO-SC-007 至 009
- Dependencies: T135-T137 Needs_Review；用户于 2026-08-02 提出二剪反馈
- Blocks: G009-R1 goal review
- Parallel: false
- Conflicts with: 后期猜测鼠标轨迹、虚构产品 UI、连续 PPT 标题页、公共 API/schema/包布局变更
- Goal: 重新录制可见事件同步指针，用真实动作 cue 与 WAV 波形编排一段连续编辑器长镜头；产品段
  不使用额外说明文字和图表状态轮播，以两个主视觉切点完成横版视频。
- Allowed files: `apps/video/**`、`packages/editor/src/editor/chartSurface.ts`、
  `packages/editor/src/styles/editor.css`、`packages/editor/tests/runtime/chart-surface.test.ts`、`.ai-platform/**`、
  `.gitignore`、`pnpm-lock.yaml`
- Test targets: renderer-sized drag ghost、pointer capture contract、grouping pacing、continuous-take action cue sync、
  zero-overlay/two-cut contract、subtitle timing、横版关键帧、媒体规格
- Deliverables: 新录屏、二剪 Remotion source、重渲染横版 MP4、封面、SRT、T138 evidence
- Acceptance criteria: 鼠标在所有操作镜头清晰可见；关键动作与对应旁白误差不超过 0.12 秒；0 至 50.4 秒
  是同一次编辑会话；产品段额外说明标题为 0；主视觉切点最多 2；图表家族不切换状态；横版审查无
  遮挡、黑帧或同步 finding；拖拽柱形预览按 G2 scene bounds 和指针 delta 移动；框选、空白对话框、名称
  输入和创建结果均有独立可辨识画面。
- Definition of Done: RED/GREEN tests、production recapture、motion review、全量 render、媒体/全仓门禁和 evidence 通过。
- Validation commands: capture；focused tests；render smoke/full/review；media audit；motion review；全仓门禁；artifact
  validator；`git diff --check`
- TDD plan: RED 固定 pointer manifest、renderer-sized drag ghost、分组节奏、连续长镜头、zero-overlay、two-cut
  与 action cue 合同；GREEN 注入真实指针、产品拖拽预览并完成单次会话录制；REFACTOR 删除独立动作拼接、
  说明标题和图表轮播，收敛横版固定构图。
- Packet path: `.ai-platform/specs/015-launch-video/packets/T138.yaml`
- Evidence required: `.ai-platform/evidence/T138/summary.md`、`test-results.md`、`motion-review.md`、`review.md`

## T139 - 4K 横版、水印与封面终版

- Status: Needs_Review
- Priority: P0
- Story / Requirement: VIDEO-FR-005、VIDEO-FR-011；VIDEO-NFR-009；VIDEO-SC-003、VIDEO-SC-010
- Dependencies: T138 Needs_Review；用户于 2026-08-02 批准只交付横版并要求提高分辨率、加入官网水印、
  重做封面
- Blocks: G009-R2 goal review
- Parallel: false
- Conflicts with: 竖版媒体交付、虚构产品 UI、公共 API/schema/包布局变更、远程发布
- Goal: 使用完整铺满的 3840x2160 真实浏览器录制生成 4K 横版终片，固定显示 `TellPlot.com` 水印，
  以真实产品画面完成 4K 封面，并从最终输出中排除竖版视频。
- Allowed files: `apps/video/**`、`.ai-platform/**`、`.gitignore`、`pnpm-lock.yaml`
- Test targets: 4K capture manifest、single landscape deliverable、watermark contract、4K cover、媒体规格与关键帧
- Deliverables: `tellplot-launch-4k.mp4`、`tellplot-launch-cover-4k.png`、SRT、media audit、T139 evidence
- Acceptance criteria: 录制流、主片和封面均为 3840x2160；录屏铺满画面；水印在全片左上角稳定可读且
  不遮挡操作；封面使用真实产品画面；交付目录无竖版终片；无 unresolved Critical/High/Medium finding。
- Definition of Done: RED/GREEN 契约测试、4K production recapture、全片与封面 render、媒体/视觉 review、
  全仓门禁和 evidence 通过。
- Validation commands: capture；focused tests；render full/cover/review；media audit；全仓门禁；artifact validator；
  `git diff --check`
- TDD plan: RED 固定单横版 4K、录制分辨率、水印和封面合同；GREEN 完成 page-scale 4K 录制、品牌层和
  封面构图；REFACTOR 删除竖版 composition/脚本/输出并收敛媒体审计。
- Packet path: `.ai-platform/specs/015-launch-video/packets/T139.yaml`
- Evidence required: `.ai-platform/evidence/T139/summary.md`、`test-results.md`、`motion-review.md`、`review.md`
