# G009 Cross-Artifact Analysis

## Result

`Clear`。spec、plan、work graph、项目章程和既有产品边界一致，无 Critical 或 High finding。

## Findings Closed Before Execution

- Remotion 仅存在于 private 制作 workspace，不改变 TDR-003 对 TellPlot 产品 UI/G2 动画 ownership 的约束。
- 用户提供的 WAV 是唯一旁白源；长文本生成、角色选择和外部 TTS 调用已在目标开始前完成。
- 真实产品镜头由 production build 与浏览器状态断言生成，不需要修改图表 runtime 以配合录制。
- 大体积最终媒体保存在 gitignored 输出目录，避免污染 Git 和 npm artifact；制作源码、字幕和小型源音频可追踪。
- Remotion 许可适用于当前个人/小团队开源制作；该前提变化即触发停止和重新审计。
- 当前宿主策略禁止 sub-agent，因此 T135-T137 使用 Direct Execute；主 agent 仍执行 packet、evidence 和三阶段 review。

## Residual Risks

- TTS 实际停顿可能与文字估时不同：T135 通过波形静音段校准字幕，最终以音频为准。
- Canvas 录屏的字体/GPU 时序可能波动：T136 使用 production build、固定 viewport 和显式交互终态断言。
- 4K 浏览器录制可能因物理画布与逻辑布局不一致产生局部内容或输入漂移：T139 使用 Chromium page scale
  保持 1920x1080 布局语义，并通过真实拖拽断言和 3840x2160 抽帧同时验证输入与画面。
- 本机缺少全局 ffmpeg/ffprobe：Remotion 官方渲染工具链负责编码，并使用 macOS `afinfo` 与项目内探测校验。

## G009-R1 二剪分析

- 鼠标不可见的根因是 Playwright `recordVideo` 不录制系统指针；解决方案是在录制页注入只响应真实
  pointer/mouse event 的高层指针，不修改产品源码，也不在 Remotion 中猜测运动路径。
- 音画不同步的根因是动作素材从 scene 起点播放，而旁白关键词通常在 scene 中后段出现；解决方案是为
  每段素材记录统一 pre-roll 和 `actionStartOffsetSeconds`，由 typed edit cue 对齐到语音波形。
- PPT 感来自连续白底 Statement/System/Bridge 页面和卡片阵列；二剪保留真实产品素材作为每段视觉底图，
  抽象概念只使用短促 editorial typography、rule、crop 和 wipe，不再以整页卡片解释。
- 二剪不新增依赖、不改变公共产品和 production runtime，仍属于已批准 G009 制作边界。

## G009-R2 4K 横版终稿分析

- 交付面固定为一个 3840x2160 横版主片、SRT 和 3840x2160 封面，避免竖版构图分散当前验片与发布精力。
- 浏览器 context 使用 3840x2160 物理画布；页面根布局保持 1920x1080，并通过 Chromium 2x page scale
  进入 4K 录制流。该方式保留真实 Pointer Event 坐标语义，避免 CSS transform 导致碰撞与拖拽漂移。
- 固定水印属于 Remotion 品牌层，不进入产品源码；封面使用 production capture，不伪造产品界面。
- T139 不新增依赖，不改变公共 API、schema、包布局、官网生产内容或 release。
