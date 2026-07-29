import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { fail, repositoryRoot, run } from './release-utils.mjs';

const write = process.argv.slice(2).includes('--write');
const unsupportedArguments = process.argv.slice(2).filter(argument => argument !== '--write');
if (unsupportedArguments.length > 0) {
  throw new Error(`Unsupported arguments: ${unsupportedArguments.join(', ')}`);
}

const releaseNodeVersion = readFileSync(resolve(repositoryRoot, '.nvmrc'), 'utf8')
  .trim()
  .replace(/^v/u, '');
if (process.versions.node !== releaseNodeVersion) {
  throw new Error(
    `Release artifact requires Node ${releaseNodeVersion}; current runtime is ${process.versions.node}`,
  );
}

const packageRoot = resolve(repositoryRoot, 'packages/editor');
const packageManifest = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));
const filename = `${packageManifest.name.replace(/^@/u, '').replaceAll('/', '-')}-${packageManifest.version}.tgz`;
const evidenceRoot = resolve(repositoryRoot, '.ai-platform/evidence/T123');
const artifactPath = resolve(evidenceRoot, 'artifacts', filename);
const manifestPath = resolve(evidenceRoot, 'tarball-manifest.json');
const temporaryRoot = mkdtempSync(join(tmpdir(), 'tellplot-release-artifact-'));
const freshArtifactPath = resolve(temporaryRoot, filename);

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function comparableFiles(files) {
  return files.map(file => file.path).sort();
}

try {
  run('pnpm', ['build'], { cwd: packageRoot, inherit: true });
  run('pnpm', ['pack', '--pack-destination', temporaryRoot], { cwd: packageRoot });
  const packManifest = JSON.parse(
    run('pnpm', ['pack', '--dry-run', '--json'], { cwd: packageRoot }),
  );
  const files = comparableFiles(packManifest.files).map(path => ({ path }));
  const current = {
    name: packageManifest.name,
    version: packageManifest.version,
    filename,
    sizeBytes: statSync(freshArtifactPath).size,
    sha256: sha256(freshArtifactPath),
    files,
  };

  if (write) {
    copyFileSync(freshArtifactPath, artifactPath);
    writeFileSync(manifestPath, `${JSON.stringify(current, null, 2)}\n`);
  }

  const findings = [];
  if (!existsSync(artifactPath)) {
    findings.push(`missing release artifact: ${filename}`);
  }
  if (!existsSync(manifestPath)) {
    findings.push('missing release artifact manifest');
  }

  if (findings.length === 0) {
    const stored = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const storedArtifact = {
      sizeBytes: statSync(artifactPath).size,
      sha256: sha256(artifactPath),
    };

    for (const field of ['name', 'version', 'filename', 'sizeBytes', 'sha256']) {
      if (stored[field] !== current[field]) {
        findings.push(`manifest ${field} does not match the current package`);
      }
    }
    if (
      JSON.stringify(comparableFiles(stored.files ?? [])) !== JSON.stringify(comparableFiles(files))
    ) {
      findings.push('manifest files do not match the current package');
    }
    if (
      storedArtifact.sizeBytes !== current.sizeBytes ||
      storedArtifact.sha256 !== current.sha256
    ) {
      findings.push('stored tarball does not match the current package');
    }
  }

  if (findings.length > 0) {
    fail('TellPlot release artifact check failed', findings);
  } else {
    process.stdout.write(
      `${JSON.stringify(
        {
          status: write ? 'refreshed' : 'passed',
          ...current,
        },
        null,
        2,
      )}\n`,
    );
  }
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
