/** Produces one finite zero-based domain shared by every mark in a composed chart. */
export function zeroBasedValueDomain(values: Iterable<number>): readonly [number, number] {
  let minimum = 0;
  let maximum = 0;
  for (const value of values) {
    if (Number.isFinite(value)) {
      minimum = Math.min(minimum, value);
      maximum = Math.max(maximum, value);
    }
  }
  return Object.freeze(minimum === maximum ? [0, 1] : [minimum, maximum]);
}
