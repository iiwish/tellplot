# G009 TellPlot 开源介绍视频 Plan

## Metadata

- Feature ID: `015-launch-video`
- Goal ID: `G009`
- Version: 1.4.0
- Status: Confirmed
- Last updated: 2026-08-02
- Approval: 用户批准 60 秒创作者叙事、Qwen3-TTS 旁白、真实录屏、Remotion 合成、4K 横版终片、
  `TellPlot.com` 固定水印和 4K 封面

## Delivery Strategy

1. T135 固化 62.969 秒旁白、字幕、镜头时间线和 private Remotion 工程，先用程序化占位画面验证完整渲染。
2. T136 从当前 TellPlot production build 录制确定性交互素材，把真实拖拽、分组、撤销和图表切换接入主片。
3. T137 完成声音与字幕 QA、封面、媒体探测和目标级 review，产出本地可交付文件。
4. T138 使用一段 50.4 秒的真实编辑器连续录制承载完整产品叙事，保留事件同步指针和语音动作 cue；
   产品段不使用额外说明标题，图表家族使用一次静态官网证明。验片后在同一任务中补齐真实柱形拖拽
   预览，并把框选、命名和创建拆成可读节拍，重新输出并验收全部媒体。
5. T139 使用 3840x2160 浏览器画布和 Chromium 2x page scale 保持原 1920x1080 构图与真实输入语义，
   只交付 4K 横版终片；加入固定官网水印并以真实产品画面重新设计 4K 封面。

## Architecture

```text
TellPlot production build -> Playwright + page event cursor -> real WebM clips
Qwen3-TTS WAV -----------> narration + timed captions -------> Remotion 4 composition
brand tokens + copy ------> captions/watermark/two transitions -> 4K 16:9 / cover / SRT
```

`apps/video` 是 private workspace。它可以读取仓库内的品牌 token 和录制素材，但 `packages/**`、
`apps/playground` 和公共 tarball 不引用它。生成的 MP4/WebM/PNG 放在 `apps/video/out`，由 `.gitignore` 排除；
可复现源码、字幕、音频源和轻量录制配置保留在仓库。

## Dependency Decision

- 使用精确 `remotion@4.0.503`、`@remotion/cli@4.0.503` 和必要的同版本官方包；与现有 React 19 兼容。
- Remotion 解决多比例合成、逐帧字幕、可复现镜头和本地编码，退出时可导出静态 timing/copy 与原始媒体，
  不影响 TellPlot runtime。
- 不引入通用动画库、视频 SaaS SDK、云渲染、远程字体或音乐依赖。
- 当前项目符合 Remotion 对个人/不超过三人团队的免费使用条件；许可条件变化时停止渲染并重新评估。

## Visual Direction

- 使用 TellPlot 的白色画布、墨黑文字、蓝/绿/红/青功能色和零字距；不使用渐变球、3D mockup、假浏览器框
  或解释性包装卡片。
- 0 至 50.4 秒使用同一次真实编辑器录制，保持同一画布、同一取景逻辑和连续命令历史；旁白与字幕承担
  解释，不叠加 editorial 标题或章节页。
- 50.4 至 56.86 秒保持单一瀑布图官网画面，利用可见的图表家族标签表达支持范围，不轮播图表；56.86 秒
  以 10 帧纵向进入最终邀请。全片只有两个主视觉切点。
- Playwright 录制页负责事件同步指针，Remotion 负责镜头裁切、字幕、排版和切点，G2 负责录屏中的图形动画。
- 指针由 Playwright 录制页响应真实 mouse event，不在后期猜测轨迹；点击只使用 160ms 内的按下反馈。
- editor runtime 使用 G2 scene bounds 生成原尺寸、原方向和语义色的拖拽柱形预览；预览按 pointer delta
  直接更新 `transform`，录屏指针和产品预览共享同一真实输入。
- 16:9 以宽屏图表为主体；录制阶段使用 3840x2160 物理画布、1920x1080 逻辑布局和 2x page scale，
  保留拖拽指针、柱形预览、框选区域、完整分组对话框及 ViewSpec 的既有构图。
- `TellPlot.com` 水印固定在左上角，不参与进出场动画；封面使用真实分组结果画面、强定位标题和官网地址。

## Audio And Timing

- 旁白源：24 kHz、16-bit、mono，真实时长 62.969042 秒。
- 组合长度以旁白时长加不超过 0.8 秒尾帧确定；字幕按波形静音段和已批准文案校准。
- 动作镜头保留统一 0.65 秒录制前导，Remotion 用显式 action cue 把真实动作起点对齐到对应语音关键词，
  允许误差不超过 0.12 秒。
- 拖拽从开始到释放至少保留 1.2 秒；框选释放后先展示空白分组对话框，再逐字输入名称，名称可读至少
  1 秒后提交，让选区、命名和结果形成四个独立视觉阶段。
- 首次拖拽使用轻量本地 UI 声音或无音乐设计；不使用来源不明的背景音乐。
- 输出前把旁白转换为 Remotion/编码器稳定支持的格式并检查峰值，不对 TTS 音色做破坏性处理。

## Validation

- TypeScript/ESLint/Prettier 与视频 timeline 单元测试。
- 录制脚本确认关键 interaction state、view revision 和图表类型变化后才结束镜头。
- Remotion composition 列表、4K 16:9 render、4K cover still。
- macOS `afinfo` 与项目内媒体探测读取时长、声道、采样率、分辨率和 codec。
- 每个叙事段至少一帧抽检，并运行首尾黑帧/透明帧与字幕安全区检查。
- 拖拽中段、拖拽释放、框选中段、框选完成、空白对话框、完整名称和创建结果分别抽取 4K 横版关键帧。
- 媒体审计确认主片与封面为 3840x2160、录屏完整铺满画面、水印持续可见且交付目录没有竖版终片。
- strict artifact validator、secret scan、`git diff --check`。
