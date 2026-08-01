import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { run } from './release-utils.mjs';

const packageNames = ['tellplot'];
const npmCache = mkdtempSync(join(tmpdir(), 'tellplot-npm-cache-'));

try {
  for (const packageName of packageNames) {
    run('pnpm', ['--filter', packageName, 'run', 'test:package'], {
      inherit: true,
      env: { NPM_CONFIG_CACHE: npmCache },
    });
  }
} finally {
  rmSync(npmCache, { force: true, recursive: true });
}
