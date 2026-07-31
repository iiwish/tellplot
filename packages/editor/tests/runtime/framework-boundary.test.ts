import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('@tellplot/editor framework boundary', () => {
  it('has a framework-neutral public entry and package graph', () => {
    const entry = readFileSync(resolve(process.cwd(), 'packages/editor/src/index.ts'), 'utf8');
    const manifest = readFileSync(resolve(process.cwd(), 'packages/editor/package.json'), 'utf8');

    for (const forbidden of ['react', 'react-dom', 'vue', '@dnd-kit', 'lucide-react']) {
      expect(entry).not.toContain(forbidden);
      expect(manifest).not.toContain(forbidden);
    }
    expect(entry).toContain('createEditor');
  });
});
