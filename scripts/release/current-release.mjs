import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { repositoryRoot } from './release-utils.mjs';

const descriptorKeys = [
  'artifact',
  'artifactRoot',
  'evidenceTask',
  'manifestPath',
  'nodeVersion',
  'npmVersion',
  'packageName',
  'pnpmVersion',
  'registry',
  'schemaVersion',
  'tag',
  'version',
  'workflow',
];
const artifactKeys = ['filename', 'sha256', 'sizeBytes'];
const exactWorkflow = 'iiwish/tellplot/.github/workflows/publish-npm.yml';
const officialRegistry = 'https://registry.npmjs.org/';

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value, expected) {
  return isObject(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify(expected);
}

function isStableVersion(value) {
  return typeof value === 'string' && /^\d+\.\d+\.\d+$/u.test(value);
}

export function validateCurrentRelease(value) {
  const findings = [];
  if (!hasExactKeys(value, descriptorKeys)) {
    findings.push('current release descriptor must use the exact closed schema');
  }
  if (value?.schemaVersion !== 1) {
    findings.push('current release descriptor schemaVersion must be 1');
  }
  if (value?.packageName !== 'tellplot') {
    findings.push('current release packageName must be tellplot');
  }
  if (!isStableVersion(value?.version)) {
    findings.push('current release version must be a stable semantic version');
  }
  if (value?.tag !== `v${value?.version ?? ''}`) {
    findings.push('current release tag must exactly match the version');
  }
  if (!/^T\d+$/u.test(value?.evidenceTask ?? '')) {
    findings.push('current release evidenceTask must be a task ID');
  }

  const expectedEvidenceRoot = `.ai-platform/evidence/${value?.evidenceTask ?? ''}`;
  if (value?.artifactRoot !== `${expectedEvidenceRoot}/artifacts`) {
    findings.push('current release artifactRoot must be the selected task artifacts directory');
  }
  if (value?.manifestPath !== `${expectedEvidenceRoot}/tarball-manifest.json`) {
    findings.push('current release manifestPath must be the selected task manifest');
  }

  if (!hasExactKeys(value?.artifact, artifactKeys)) {
    findings.push('current release artifact must use the exact closed schema');
  }
  if (value?.artifact?.filename !== `${value?.packageName ?? ''}-${value?.version ?? ''}.tgz`) {
    findings.push('current release artifact filename must match package and version');
  }
  if (!Number.isSafeInteger(value?.artifact?.sizeBytes) || value.artifact.sizeBytes <= 0) {
    findings.push('current release artifact sizeBytes must be a positive safe integer');
  }
  if (!/^[0-9a-f]{64}$/u.test(value?.artifact?.sha256 ?? '')) {
    findings.push('current release artifact sha256 must be lowercase hexadecimal');
  }
  if (value?.registry !== officialRegistry) {
    findings.push('current release registry must be the official npm registry');
  }
  if (value?.workflow !== exactWorkflow) {
    findings.push('current release workflow must be the canonical publish workflow');
  }
  for (const field of ['nodeVersion', 'pnpmVersion', 'npmVersion']) {
    if (!isStableVersion(value?.[field])) {
      findings.push(`current release ${field} must be an exact semantic version`);
    }
  }
  return findings;
}

export function loadCurrentRelease(
  path = resolve(repositoryRoot, 'scripts/release/current-release.json'),
) {
  const value = JSON.parse(readFileSync(path, 'utf8'));
  const findings = validateCurrentRelease(value);
  if (findings.length > 0) {
    throw new Error(`Invalid current release descriptor:\n${findings.join('\n')}`);
  }
  return Object.freeze({ ...value, artifact: Object.freeze({ ...value.artifact }) });
}

export const currentRelease = loadCurrentRelease();
