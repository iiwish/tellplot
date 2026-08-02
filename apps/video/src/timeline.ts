export const FPS = 30;
export const AUDIO_DURATION_SECONDS = 62.969042;
export const TAIL_SECONDS = 0.6;
export const TOTAL_FRAMES = Math.ceil((AUDIO_DURATION_SECONDS + TAIL_SECONDS) * FPS);

export const LANDSCAPE_SIZE = Object.freeze({ width: 1920, height: 1080 });

export interface CaptionCue {
  readonly id: string;
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

export interface SceneCue {
  readonly id: string;
  readonly start: number;
  readonly end: number;
}

export const SCENES: readonly SceneCue[] = Object.freeze([
  { id: 'hook', start: 0, end: 6 },
  { id: 'brand', start: 6, end: 12 },
  { id: 'problem', start: 12, end: 21.04 },
  { id: 'origin', start: 21.04, end: 30.08 },
  { id: 'system', start: 30.08, end: 45.68 },
  { id: 'architecture', start: 45.68, end: 50.4 },
  { id: 'families', start: 50.4, end: 56.86 },
  { id: 'future', start: 56.86, end: AUDIO_DURATION_SECONDS + TAIL_SECONDS },
]);

export const CAPTIONS: readonly CaptionCue[] = Object.freeze([
  {
    id: 'hook-question',
    start: 0.58,
    end: 3.02,
    text: '看到这张图，你会不会下意识觉得，',
  },
  {
    id: 'hook-payoff',
    start: 3.52,
    end: 5.2,
    text: '这些柱子应该可以直接拖？',
  },
  {
    id: 'intuition',
    start: 6,
    end: 8.86,
    text: '我一直是这么觉得的。\n想换顺序就拖一下，',
  },
  {
    id: 'group',
    start: 9.22,
    end: 11.62,
    text: '想把几项放在一起，\n就直接框起来。',
  },
  {
    id: 'static-chart',
    start: 12.38,
    end: 14.42,
    text: '可大多数图表画出来以后就只能看。',
  },
  {
    id: 'translation-cost',
    start: 14.96,
    end: 18.2,
    text: '想要调整，还得回到表格、\n配置，甚至代码。',
  },
  {
    id: 'reason',
    start: 18.84,
    end: 20.32,
    text: '这也是我做 TellPlot 的原因。',
  },
  {
    id: 'finance-request',
    start: 21.04,
    end: 24.72,
    text: '前段时间做财务分析的时候，\n业务方刚好提出了这个需求。',
  },
  {
    id: 'prototype',
    start: 25.46,
    end: 29.22,
    text: '我先做了一个可交互的瀑布图，\n算是这个想法最早的原型。',
  },
  {
    id: 'hard-part',
    start: 30.08,
    end: 33.72,
    text: '它能解决问题，但我也发现：\n让一根柱子动起来并不难。',
  },
  {
    id: 'system',
    start: 34.26,
    end: 39.08,
    text: '真正难的，是把分组、撤销、\n数据保护和导出，可靠地做成一套系统。',
  },
  {
    id: 'rebuild',
    start: 39.56,
    end: 42.02,
    text: '所以我基于 G2，重新设计了 TellPlot。',
  },
  {
    id: 'ownership',
    start: 42.66,
    end: 45.26,
    text: 'G2 负责渲染，TellPlot 专心处理编辑。',
  },
  {
    id: 'immutable',
    start: 45.68,
    end: 50.4,
    text: '所有操作只改变可以保存和恢复的视图状态，\n不会改动原始数据。',
  },
  {
    id: 'families',
    start: 50.4,
    end: 53.36,
    text: '现在它支持瀑布图、柱状图和条形图，',
  },
  {
    id: 'hosts',
    start: 53.36,
    end: 56.2,
    text: '同一套能力也可以接入 DOM、React 和 Vue。',
  },
  {
    id: 'future',
    start: 56.86,
    end: 60.12,
    text: '接下来，我还想继续探索\n更多图表应该怎样被直接编辑。',
  },
  {
    id: 'invitation',
    start: 60.72,
    end: AUDIO_DURATION_SECONDS,
    text: '如果你也遇到过类似的场景，欢迎告诉我。',
  },
]);

export function sceneAt(seconds: number): SceneCue {
  const active = SCENES.find(scene => seconds >= scene.start && seconds < scene.end);
  if (active !== undefined) {
    return active;
  }
  const fallback = SCENES[SCENES.length - 1];
  if (fallback === undefined) {
    throw new Error('Launch video requires at least one scene.');
  }
  return fallback;
}

export function captionAt(seconds: number): CaptionCue | undefined {
  return CAPTIONS.find(caption => seconds >= caption.start && seconds < caption.end);
}
