# T136 Summary

## Result

T136 从 production build 录制并断言 6 段真实 TellPlot 操作：图表直接排序、框选分组、结构大纲拖拽与
撤销/重做、ViewSpec 状态、SVG 导出和瀑布图/柱状图/条形图切换。Remotion 主片使用这些 WebM 作为产品
镜头，不使用虚构编辑器 UI。

## Capture Contract

- 固定 viewport：1600×900。
- 每段录制包含可观察的交互终态断言和 console error 闸门。
- `manifest.json` 固化素材文件、裁切起点、动作时长和 assertions。
- `public/captures/` 保持 gitignored，可通过 `pnpm --filter @tellplot/video capture` 重建。

## Main Film

16:9 composition 以首帧真实拖拽建立 hook，6 秒内完成问题与主张，12 秒内展示框选分组；30 秒后依次
呈现大纲、撤销/重做、导出、命令/ViewSpec/G2 架构和原始数据不变的状态模型。完整主片渲染为
1920×1080、30 fps、H.264 + AAC。
