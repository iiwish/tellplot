import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { canonicalizeGzipHeader } from './canonical-gzip.mjs';
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

const packageDirectories = ['core', 'editor', 'react', 'vue'];
const evidenceRoot = resolve(repositoryRoot, '.ai-platform/evidence/T129');
const artifactsRoot = resolve(evidenceRoot, 'artifacts');
const manifestPath = resolve(evidenceRoot, 'tarball-manifest.json');
const temporaryRoot = mkdtempSync(join(tmpdir(), 'tellplot-release-artifacts-'));

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function comparableFiles(files) {
  return files.map(file => (typeof file === 'string' ? file : file.path)).sort();
}

function artifactFilename(manifest) {
  return `${manifest.name.replace(/^@/u, '').replaceAll('/', '-')}-${manifest.version}.tgz`;
}

try {
  const currentPackages = [];
  for (const directory of packageDirectories) {
    const packageRoot = resolve(repositoryRoot, 'packages', directory);
    const packageManifest = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));
    const filename = artifactFilename(packageManifest);
    const freshArtifactPath = resolve(temporaryRoot, filename);

    run('pnpm', ['build'], { cwd: packageRoot, inherit: true });
    run('pnpm', ['pack', '--pack-destination', temporaryRoot], { cwd: packageRoot });
    canonicalizeGzipHeader(freshArtifactPath);
    const packManifest = JSON.parse(
      run('pnpm', ['pack', '--dry-run', '--json'], { cwd: packageRoot }),
    );
    const files = comparableFiles(packManifest.files).map(path => ({ path }));
    currentPackages.push({
      name: packageManifest.name,
      version: packageManifest.version,
      filename,
      sizeBytes: statSync(freshArtifactPath).size,
      sha256: sha256(freshArtifactPath),
      files,
    });
  }

  const current = { version: '1.0.0', packages: currentPackages };
  if (write) {
    mkdirSync(artifactsRoot, { recursive: true });
    for (const packageArtifact of currentPackages) {
      copyFileSync(
        resolve(temporaryRoot, packageArtifact.filename),
        resolve(artifactsRoot, packageArtifact.filename),
      );
    }
    writeFileSync(manifestPath, `${JSON.stringify(current, null, 2)}\n`);
  }

  const findings = [];
  if (!existsSync(manifestPath)) {
    findings.push('missing release artifact manifest');
  }
  for (const packageArtifact of currentPackages) {
    if (!existsSync(resolve(artifactsRoot, packageArtifact.filename))) {
      findings.push(`missing release artifact: ${packageArtifact.filename}`);
    }
  }

  if (findings.length === 0) {
    const stored = JSON.parse(readFileSync(manifestPath, 'utf8'));
    for (const packageArtifact of currentPackages) {
      const storedPackage = stored.packages?.find(item => item.name === packageArtifact.name);
      if (storedPackage === undefined) {
        findings.push(`manifest is missing ${packageArtifact.name}`);
        continue;
      }
      for (const field of ['version', 'filename', 'sizeBytes', 'sha256']) {
        if (storedPackage[field] !== packageArtifact[field]) {
          findings.push(`manifest ${packageArtifact.name} ${field} does not match`);
        }
      }
      if (
        JSON.stringify(comparableFiles(storedPackage.files ?? [])) !==
        JSON.stringify(comparableFiles(packageArtifact.files))
      ) {
        findings.push(`manifest ${packageArtifact.name} files do not match`);
      }
      const storedArtifactPath = resolve(artifactsRoot, packageArtifact.filename);
      if (
        statSync(storedArtifactPath).size !== packageArtifact.sizeBytes ||
        sha256(storedArtifactPath) !== packageArtifact.sha256
      ) {
        findings.push(`stored ${packageArtifact.name} tarball does not match the manifest`);
      }
    }
  }

  if (findings.length > 0) {
    fail('TellPlot release artifact check failed', findings);
  } else {
    process.stdout.write(
      `${JSON.stringify({ status: write ? 'refreshed' : 'passed', ...current }, null, 2)}\n`,
    );
  }
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
