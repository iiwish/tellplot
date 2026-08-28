import type { SourceData } from 'tellplot';

export function generationName(source: SourceData): string {
  if (source.schemaVersion === '1.0.0') return 'legacy-waterfall';
  if (source.schemaVersion === '2.0.0') return source.dataKind;
  const exhaustive: never = source;
  return exhaustive;
}
