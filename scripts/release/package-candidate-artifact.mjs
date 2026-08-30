import { createHash } from 'node:crypto';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { canonicalizeNpmTarball } from './canonical-gzip.mjs';
import {
  assertCandidateOutputPath,
  assertPinnedCandidateNode,
  parseCandidateArguments,
  runCandidateCommand,
} from './audit-candidate.mjs';
import { repositoryRoot, run } from './release-utils.mjs';

function packageCandidateArtifact() {
  const { candidateVersion, evidenceTask, evidenceRoot } = parseCandidateArguments(
    process.argv.slice(2),
  );
  assertPinnedCandidateNode();
  const filename = `tellplot-${candidateVersion}.tgz`;
  const artifactsRoot = resolve(evidenceRoot, 'artifacts');
  const artifactTarget = resolve(artifactsRoot, filename);
  const manifestTarget = resolve(evidenceRoot, 'tarball-manifest.json');
  assertCandidateOutputPath(evidenceRoot, artifactsRoot);
  assertCandidateOutputPath(evidenceRoot, artifactTarget);
  assertCandidateOutputPath(evidenceRoot, manifestTarget);
  const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'tellplot-candidate-artifact-'));

  try {
    const packageRoot = resolve(repositoryRoot, 'packages/tellplot');
    const manifest = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));
    if (manifest.name !== 'tellplot' || manifest.version !== candidateVersion) {
      throw new Error('Candidate manifest does not match the selected version.');
    }
    run('pnpm', ['build'], { cwd: packageRoot, inherit: true });
    run('pnpm', ['pack', '--pack-destination', temporaryRoot], { cwd: packageRoot });
    const temporaryArtifact = resolve(temporaryRoot, filename);
    canonicalizeNpmTarball(temporaryArtifact);
    const packManifest = JSON.parse(
      run('pnpm', ['pack', '--dry-run', '--json'], { cwd: packageRoot }),
    );
    const files = packManifest.files
      .map(file => (typeof file === 'string' ? file : file.path))
      .sort()
      .map(path => ({ path }));
    const sha256 = createHash('sha256').update(readFileSync(temporaryArtifact)).digest('hex');
    const receipt = {
      version: candidateVersion,
      evidenceTask,
      nodeVersion: process.versions.node,
      packages: [
        {
          name: manifest.name,
          version: manifest.version,
          filename,
          sizeBytes: statSync(temporaryArtifact).size,
          sha256,
          files,
        },
      ],
    };
    mkdirSync(artifactsRoot, { recursive: true });
    assertCandidateOutputPath(evidenceRoot, artifactsRoot);
    assertCandidateOutputPath(evidenceRoot, artifactTarget);
    assertCandidateOutputPath(evidenceRoot, manifestTarget);
    copyFileSync(temporaryArtifact, artifactTarget);
    assertCandidateOutputPath(evidenceRoot, manifestTarget);
    writeFileSync(manifestTarget, `${JSON.stringify(receipt, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({ status: 'passed', ...receipt })}\n`);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

runCandidateCommand(packageCandidateArtifact);
