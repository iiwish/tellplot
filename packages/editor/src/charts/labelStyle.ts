interface ResolvedLabelStyle {
  readonly color: string;
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly background: boolean;
  readonly backgroundColor: string;
  readonly backgroundOpacity: number;
}

/** Maps TellPlot's bounded label style onto the shared G2 text-mark vocabulary. */
export function createForegroundLabelStyle(style: ResolvedLabelStyle) {
  return {
    background: style.background,
    ...(style.background
      ? {
          backgroundFill: style.backgroundColor,
          backgroundOpacity: style.backgroundOpacity,
          backgroundPadding: [2, 4] as const,
          backgroundRadius: 3,
        }
      : {}),
    fill: style.color,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    lineJoin: 'round' as const,
    lineWidth: style.background ? 0 : 1.5,
    pointerEvents: 'none' as const,
    stroke: style.background ? 'transparent' : 'rgba(255, 255, 255, 0.92)',
  };
}
