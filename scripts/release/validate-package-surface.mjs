import { resolve } from 'node:path';

import {
  collectPublicSurface,
  packageContracts,
  validatePackageSurface,
  workspacePackageEntries,
} from './package-contracts.mjs';
import { fail, repositoryRoot } from './release-utils.mjs';

const packageEntries = workspacePackageEntries(repositoryRoot);
const findings = [];
const checked = [];

for (const contract of packageContracts) {
  const packageRoot = resolve(repositoryRoot, 'packages', contract.directory);
  const entryPath = resolve(packageRoot, contract.entry);
  findings.push(
    ...validatePackageSurface(
      collectPublicSurface(entryPath, { packageEntries }),
      contract,
      contract.name,
    ),
  );
  checked.push(contract.name);

  for (const subpath of contract.subpaths ?? []) {
    const label = `${contract.name}${subpath.path.slice(1)}`;
    findings.push(
      ...validatePackageSurface(
        collectPublicSurface(resolve(packageRoot, subpath.entry), { packageEntries }),
        subpath,
        label,
      ),
    );
    checked.push(label);
  }
}

if (findings.length > 0) {
  fail('TellPlot package surface validation failed', findings);
} else {
  process.stdout.write(`${JSON.stringify({ status: 'passed', checked }, null, 2)}\n`);
}
