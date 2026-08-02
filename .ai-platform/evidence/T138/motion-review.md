# T138 Motion Review

| Before | After | Why |
| --- | --- | --- |
| Playwright WebM 不包含系统鼠标 | 录制页用真实 pointer event 驱动高对比指针和 160ms 按压环，见 `apps/video/scripts/capture.ts:147` | 指针路径与真实输入同源，拖拽因果可见且不存在后期漂移 |
| 产品拖拽只显示一枚白色文字标签，柱形仍停在原位 | editor 从 G2 scene bounds 生成同尺寸、同方向、同语义色的柱形预览，并按真实 pointer delta 更新 `transform`，见 `packages/editor/src/editor/chartSurface.ts:389`、`packages/editor/src/styles/editor.css:998` | 指针与柱形保持一一对应，不靠后期补动画，也不引入弹簧延迟 |
| 框选释放、名称填入和创建结果连续闪过 | 3.52/4.9 秒定义拖拽按下与释放，9.22/10.35/10.72/11.9 秒分别定义框选、释放、逐字输入和提交，见 `apps/video/src/storyContract.ts:1`、`apps/video/scripts/capture.ts:411` | 每个因果阶段都有可读停留，观众可以理解而不是只看到结果 |
| 产品叙事由六段独立动作素材和多个静帧拼接 | 0 至 50.4 秒只播放 `story-take` 单次编辑器录制，见 `apps/video/src/LaunchVideo.tsx:41`、`apps/video/src/LaunchVideo.tsx:86` | 观众不必在每段旁白重新识别画面，操作历史也保持连续 |
| 每段旁白叠加一组 editorial 标题、规则线或角标 | 产品段 editorial overlay 数量固定为 0，只保留旁白字幕，见 `apps/video/src/storyContract.ts:12`、`apps/video/src/LaunchVideo.tsx:138` | 语音、字幕和标题不再重复表达同一信息，视线留在真实操作上 |
| 图表家族段依次切换瀑布图、柱状图和条形图 | 只显示真实官网瀑布图静帧及其三个家族标签，见 `apps/video/src/LaunchVideo.tsx:58`、`apps/video/src/storyContract.ts:19` | 支持范围仍可验证，但画面不会连续闪换 |
| 不同动作使用不同横竖屏 focus，镜头随段落左右移动 | 连续长镜头各方向只使用一个固定 focus，竖屏使用 `31% 51%` 保留拖拽、框选、完整分组对话框、聚合结果与 ViewSpec，见 `apps/video/src/LaunchVideo.tsx:50`、`apps/video/src/captures.ts:15` | 构图稳定，指针运动发生在画面内，而不是由摄像机追赶动作 |
| 产品上方另加一层视频品牌签名 | 产品段依赖真实页面内 TellPlot 品牌，独立品牌只在结尾与封面出现，见 `apps/video/src/LaunchVideo.tsx:107`、`apps/video/src/LaunchVideo.tsx:170` | 删除重复标识，避免画面像套了一层宣传模板 |
| 场景切换伴随多组 action wipe 和章节转场 | 全片仅 50.4 秒 10 帧 opacity 交叉淡化与 56.86 秒 10 帧纵向 CTA 进入，见 `apps/video/src/LaunchVideo.tsx:62`、`apps/video/src/LaunchVideo.tsx:109` | 两个转场都有叙事目的，低频、短促，只动画合成友好的 `opacity` 和 `transform` |
| 浅色字幕底进入深色结尾会形成白条 | 最终邀请同步使用深色字幕层，见 `apps/video/src/LaunchVideo.tsx:145`、`apps/video/src/styles.css:99` | CTA 保持一个连续暗场，字幕仍清晰但不割裂画面 |

## Verdict

逐帧复核覆盖拖拽中段与释放、框选中段与完成、空白对话框、完整名称、聚合结果、展开/折叠、撤销/重做、
导出、ViewSpec、静态图表家族证明和最终 CTA。
产品段没有解释性覆盖物或镜头追踪，图表状态不轮播；两个叙事转场各为 10 帧并只使用 `opacity` 或
`transform`，符合 6-12 帧合同。产品拖拽预览只逐事件更新 `transform`，没有 transition 或插值。未发现 feel-breaking
regression、可删除的无目的动画、非合成属性动画、连续 PPT 画面、
文字遮挡或异常黑帧。导出视频不是交互 UI，`prefers-reduced-motion` 不适用于确定性最终媒体。

**Decision: Approve.**
