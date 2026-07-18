import { describe, expect, it } from 'vitest';

import * as editor from '../../src/index';

describe('@tellplot/editor public entry', () => {
  it('exposes only the approved T107 runtime API', () => {
    expect(Object.keys(editor).sort()).toEqual([
      'FinancialChartEditor',
      'createEditorSession',
      'createInitialViewSpec',
      'executeCommand',
      'parseViewSpec',
      'redoSession',
      'serializeViewSpec',
      'undoSession',
      'validateSourceData',
      'validateViewSpec',
    ]);
  });
});
