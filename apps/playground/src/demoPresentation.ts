/** Website-only colors used to demonstrate TellPlot's public appearance configuration. */
export const DEMO_WATERFALL_COLORS = {
  start: '#2F7CF6',
  positive: '#12B76A',
  negative: '#F04464',
  subtotal: '#2F7CF6',
  group: '#14B8A6',
  end: '#2F7CF6',
} as const;

export const DEMO_CATEGORICAL_COLORS = {
  positive: DEMO_WATERFALL_COLORS.positive,
  negative: DEMO_WATERFALL_COLORS.negative,
  group: DEMO_WATERFALL_COLORS.group,
} as const;

export const DEMO_COMPARISON_PALETTE = ['#0072B2', '#D55E00', '#009E73', '#CC79A7'] as const;
