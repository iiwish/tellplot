import type { G2BaseComponent } from '@antv/g2';

export interface ComparisonLabelFlipOptions {
  readonly transposed?: boolean;
}

type UnknownRecord = Record<string, unknown>;
type ComparisonLabelTransform = (
  labels: readonly unknown[],
  context: unknown,
) => readonly unknown[];

function record(value: unknown): UnknownRecord | undefined {
  return typeof value === 'object' && value !== null ? (value as UnknownRecord) : undefined;
}

function finite(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function pair(value: unknown): readonly [number, number] | undefined {
  if (!Array.isArray(value) || value.length < 2) {
    return undefined;
  }
  const first = finite(value[0]);
  const second = finite(value[1]);
  return first === undefined || second === undefined ? undefined : [first, second];
}

function hide(style: UnknownRecord | undefined): void {
  if (style !== undefined) {
    style['visibility'] = 'hidden';
  }
}

function flipLabel(label: unknown, context: unknown, transposed: boolean): void {
  const target = record(label);
  const style = record(target?.['style']);
  const descriptor = record(target?.['__data__']);
  const points = descriptor?.['points'];
  const anchor = Array.isArray(points) ? pair(points[0]) : undefined;
  const layout = record(record(context)?.['layout']);
  const getRenderBounds = target?.['getRenderBounds'];
  if (
    style === undefined ||
    anchor === undefined ||
    layout === undefined ||
    typeof getRenderBounds !== 'function'
  ) {
    hide(style);
    return;
  }

  try {
    const bounds = record(Reflect.apply(getRenderBounds, label, []));
    const minimum = pair(bounds?.['min']);
    const maximum = pair(bounds?.['max']);
    const x = finite(layout['x']) ?? 0;
    const y = finite(layout['y']) ?? 0;
    const width = finite(layout['width']);
    const height = finite(layout['height']);
    if (
      minimum === undefined ||
      maximum === undefined ||
      width === undefined ||
      height === undefined
    ) {
      hide(style);
      return;
    }
    const left = x + (finite(layout['marginLeft']) ?? 0) + (finite(layout['paddingLeft']) ?? 0);
    const right =
      x + width - (finite(layout['marginRight']) ?? 0) - (finite(layout['paddingRight']) ?? 0);
    const top = y + (finite(layout['marginTop']) ?? 0) + (finite(layout['paddingTop']) ?? 0);
    const bottom =
      y + height - (finite(layout['marginBottom']) ?? 0) - (finite(layout['paddingBottom']) ?? 0);
    const overflow = transposed
      ? minimum[0] < left || maximum[0] > right
      : minimum[1] < top || maximum[1] > bottom;
    if (!overflow) {
      return;
    }
    const currentX = finite(style['x']);
    const currentY = finite(style['y']);
    if (currentX === undefined || currentY === undefined) {
      hide(style);
      return;
    }
    if (transposed) {
      style['x'] = 2 * anchor[0] - currentX;
    } else {
      style['y'] = 2 * anchor[1] - currentY;
    }
  } catch {
    hide(style);
  }
}

/** Flips endpoint labels before G2's exceedAdjust contains them in the plot interior. */
export const comparisonFlipToInteriorLabelTransform: G2BaseComponent<
  ComparisonLabelTransform,
  ComparisonLabelFlipOptions
> =
  (options = {}) =>
  (labels, context) => {
    for (const label of labels) {
      flipLabel(label, context, options.transposed === true);
    }
    return labels;
  };
