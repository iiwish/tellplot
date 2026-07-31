import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fail, repositoryRoot } from './release-utils.mjs';

export const OFFICIAL_NPM_REGISTRY = 'https://registry.npmjs.org/';
export const PRODUCTION_AUDIT_ARGUMENTS = [
  'audit',
  '--prod',
  '--audit-level=info',
  `--registry=${OFFICIAL_NPM_REGISTRY}`,
];

export function runProductionAudit() {
  return spawnSync('pnpm', PRODUCTION_AUDIT_ARGUMENTS, {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      NPM_CONFIG_REGISTRY: OFFICIAL_NPM_REGISTRY,
    },
    stdio: 'inherit',
  });
}

function main() {
  const result = runProductionAudit();
  if (result.error !== undefined) {
    fail('TellPlot production dependency audit failed', ['unable to execute pnpm audit']);
    return;
  }
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
  }
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main();
}
