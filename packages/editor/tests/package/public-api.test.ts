import { describe, expect, it } from 'vitest';

import * as editor from '../../src/index';

describe('@tellplot/editor public entry', () => {
  it('exposes only the stable 1.x runtime API', () => {
    expect(Object.keys(editor).sort()).toEqual(['createEditor']);
  });
});
