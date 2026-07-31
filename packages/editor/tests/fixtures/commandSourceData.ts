import type { SourceData } from '@tellplot/core';

export const commandSourceData = {
  schemaVersion: '1.0.0',
  datasetId: 'command-fixture',
  currency: 'CNY',
  items: [
    { id: 'start', label: 'Opening', amount: 10, kind: 'start' },
    { id: 'a', label: 'Alpha confidential', amount: 1, kind: 'contribution' },
    { id: 'b', label: 'Beta confidential', amount: 2, kind: 'contribution' },
    { id: 'c', label: 'Gamma confidential', amount: 3, kind: 'contribution' },
    { id: 'subtotal', label: 'Subtotal', amount: 16, kind: 'subtotal' },
    { id: 'd', label: 'Delta confidential', amount: -4, kind: 'contribution' },
    { id: 'e', label: 'Epsilon confidential', amount: 5, kind: 'contribution' },
    { id: 'end', label: 'Ending', amount: 17, kind: 'end' },
  ],
} as const satisfies SourceData;
