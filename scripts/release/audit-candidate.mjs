import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  collectPublicSurface,
  expectedPackageSurface,
  packageContracts,
  validatePackageContract,
  workspacePackageEntries,
} from './package-contracts.mjs';
import { fail, repositoryRoot } from './release-utils.mjs';

const CANDIDATE_REJECTION = 'Candidate arguments rejected.';

function reject() {
  const error = new Error(CANDIDATE_REJECTION);
  error.name = 'CandidateArgumentsRejected';
  throw error;
}

export function runCandidateCommand(command) {
  try {
    command();
  } catch (error) {
    if (error instanceof Error && error.name === 'CandidateArgumentsRejected') {
      process.stderr.write(`${CANDIDATE_REJECTION}\n`);
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

function lstatIfPresent(path) {
  try {
    return lstatSync(path);
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined;
    reject();
  }
}

function decoded(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    reject();
  }
}

function assertCandidateDirectoryInside(root, directory) {
  let rootReal;
  let directoryReal;
  try {
    const stats = lstatSync(directory);
    if (stats.isSymbolicLink() || !stats.isDirectory()) reject();
    rootReal = realpathSync(root);
    directoryReal = realpathSync(directory);
  } catch {
    reject();
  }
  const realRelative = relative(rootReal, directoryReal);
  if (
    realRelative === '' ||
    realRelative === '..' ||
    realRelative.startsWith(`..${sep}`) ||
    isAbsolute(realRelative)
  ) {
    reject();
  }
}

export function parseCandidateArguments(args) {
  const normalizedArgs = args[0] === '--' ? args.slice(1) : args;
  if (normalizedArgs.length !== 4 || normalizedArgs.some(value => value.includes('='))) reject();
  const values = new Map();
  for (let index = 0; index < normalizedArgs.length; index += 2) {
    const key = normalizedArgs[index];
    const value = normalizedArgs[index + 1];
    if (
      value === undefined ||
      (key !== '--candidate-version' && key !== '--evidence-task') ||
      values.has(key)
    ) {
      reject();
    }
    values.set(key, value);
  }
  const candidateVersion = values.get('--candidate-version');
  const evidenceTask = values.get('--evidence-task');
  if (candidateVersion !== '2.0.0' || (evidenceTask !== 'T140' && evidenceTask !== 'T141')) {
    reject();
  }
  for (const raw of values.values()) {
    const value = decoded(raw);
    if (
      isAbsolute(value) ||
      value === '.' ||
      value === '..' ||
      value.includes('/') ||
      value.includes('\\') ||
      value.split(/[\\/]/u).some(segment => segment === '.' || segment === '..')
    ) {
      reject();
    }
  }
  const aiPlatformRoot = resolve(repositoryRoot, '.ai-platform');
  const evidenceBase = resolve(aiPlatformRoot, 'evidence');
  assertCandidateDirectoryInside(repositoryRoot, aiPlatformRoot);
  assertCandidateDirectoryInside(repositoryRoot, evidenceBase);
  const evidenceRoot = resolve(evidenceBase, evidenceTask);
  const relativePath = relative(evidenceBase, evidenceRoot);
  if (relativePath.startsWith('..') || relativePath.includes(sep) || relativePath === '') reject();
  try {
    const baseReal = realpathSync(evidenceBase);
    if (lstatSync(evidenceRoot).isSymbolicLink()) reject();
    const realRelative = relative(baseReal, realpathSync(evidenceRoot));
    if (realRelative.startsWith('..') || isAbsolute(realRelative)) reject();
  } catch (error) {
    if (error?.code !== 'ENOENT') reject();
  }
  return { candidateVersion, evidenceTask, evidenceRoot };
}

export function assertPinnedCandidateNode() {
  let pinnedVersion;
  try {
    pinnedVersion = readFileSync(resolve(repositoryRoot, '.nvmrc'), 'utf8').trim();
  } catch {
    reject();
  }
  if (pinnedVersion === '' || process.versions.node !== pinnedVersion) reject();
}

export function assertCandidateOutputPath(evidenceRoot, target) {
  const rootStats = lstatIfPresent(evidenceRoot);
  if (rootStats === undefined || rootStats.isSymbolicLink() || !rootStats.isDirectory()) reject();

  let realEvidenceRoot;
  try {
    realEvidenceRoot = realpathSync(evidenceRoot);
  } catch {
    reject();
  }
  const targetRelative = relative(evidenceRoot, target);
  if (
    targetRelative === '' ||
    isAbsolute(targetRelative) ||
    targetRelative === '..' ||
    targetRelative.startsWith(`..${sep}`)
  ) {
    reject();
  }

  const segments = targetRelative.split(sep);
  let current = evidenceRoot;
  for (const [index, segment] of segments.entries()) {
    if (segment === '' || segment === '.' || segment === '..') reject();
    current = resolve(current, segment);
    const stats = lstatIfPresent(current);
    if (stats === undefined) return;
    if (stats.isSymbolicLink() || (index < segments.length - 1 && !stats.isDirectory())) reject();
    let realCurrent;
    try {
      realCurrent = realpathSync(current);
    } catch {
      reject();
    }
    const realRelative = relative(realEvidenceRoot, realCurrent);
    if (realRelative === '..' || realRelative.startsWith(`..${sep}`) || isAbsolute(realRelative)) {
      reject();
    }
  }
}

function auditCandidate() {
  const { candidateVersion, evidenceTask } = parseCandidateArguments(process.argv.slice(2));
  const findings = [];
  const contractDocument = JSON.parse(
    readFileSync(resolve(repositoryRoot, 'scripts/release/package-contracts.json'), 'utf8'),
  );
  const expectedDelta = {
    runtimeExports: ['projectCategoricalComparison'],
    typeExports: [
      'ComparisonSchemaVersion',
      'SeriesId',
      'CategoricalComparisonSeries',
      'CategoricalComparisonValue',
      'CategoricalComparisonSourceItem',
      'CategoricalComparisonSourceData',
      'CategoricalComparisonViewSpec',
      'CategoricalComparisonDatumKind',
      'CategoricalComparisonSeriesValue',
      'CategoricalComparisonDatum',
      'CategoricalComparisonProjection',
      'CategoricalComparisonProjectionResult',
      'CategoricalComparisonSeriesColor',
      'CategoricalComparisonChartColors',
      'CategoricalComparisonChartAppearance',
      'CategoricalComparisonChartConfig',
    ],
  };
  if (
    contractDocument.candidateVersion !== candidateVersion ||
    JSON.stringify(contractDocument.candidatePublicDelta) !== JSON.stringify(expectedDelta)
  ) {
    findings.push('candidate public delta must be exactly 16 types and one runtime projector');
  }
  const packageEntries = workspacePackageEntries(repositoryRoot);
  const publicContract = packageContracts.find(contract => contract.name === 'tellplot');
  if (publicContract === undefined) throw new Error('Candidate package contract is unavailable.');

  for (const contract of packageContracts) {
    const packageRoot = resolve(repositoryRoot, 'packages', contract.directory);
    const manifest = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));
    const surface = collectPublicSurface(resolve(packageRoot, contract.entry), { packageEntries });
    findings.push(...validatePackageContract(manifest, surface, contract));
    if (contract.public === true) {
      if (manifest.version !== candidateVersion || manifest.name !== 'tellplot') {
        findings.push('tellplot manifest must be the selected 2.0.0 candidate');
      }
      const exportKeys = Object.keys(manifest.exports ?? {}).sort();
      if (
        JSON.stringify(exportKeys) !==
        JSON.stringify(['.', './core', './package.json', './react', './styles.css', './vue'])
      ) {
        findings.push('tellplot export map must remain unchanged');
      }
    } else if (manifest.private !== true || manifest.version !== '0.0.0') {
      findings.push(`${contract.name} must remain private 0.0.0`);
    }
  }

  for (const path of ['README.md', 'docs/api.md', 'docs/configuration.md', 'docs/migration.md']) {
    if (!existsSync(resolve(repositoryRoot, path))) {
      findings.push(`missing candidate documentation: ${path}`);
    }
  }
  if (findings.length > 0) {
    fail('TellPlot candidate audit failed', [...new Set(findings)].sort());
  } else {
    process.stdout.write(
      `${JSON.stringify({
        status: 'passed',
        version: candidateVersion,
        evidenceTask,
        publicSurface: expectedPackageSurface(publicContract),
      })}\n`,
    );
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCandidateCommand(auditCandidate);
}
