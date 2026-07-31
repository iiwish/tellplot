import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fail, repositoryRoot } from './release-utils.mjs';

const policyPath = resolve(repositoryRoot, 'scripts/release/trusted-antv-versions.json');

function trustedArtifactsFor(policy, name) {
  const artifacts = policy[name];
  if (artifacts === null || typeof artifacts !== 'object' || Array.isArray(artifacts)) {
    return {};
  }
  return artifacts;
}

export function collectAntvLockEntries(lockText) {
  const lines = lockText.split(/\r?\n/u);
  const packagesStart = lines.findIndex(line => line === 'packages:');
  if (packagesStart === -1) {
    return {
      entries: [],
      findings: ['lockfile packages section is missing'],
    };
  }

  let packagesEnd = lines.length;
  for (let index = packagesStart + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (line !== '' && !/^\s/u.test(line) && !/^\s*#/u.test(line)) {
      packagesEnd = index;
      break;
    }
  }

  const entries = [];
  const findings = [];
  for (let index = packagesStart + 1; index < packagesEnd; index += 1) {
    const header = lines[index] ?? '';
    if (/^ {2}<<\s*:/u.test(header)) {
      findings.push('lockfile packages section must not use YAML merge keys');
      continue;
    }
    if (!/^ {2}\S/u.test(header) || !header.includes('@antv/')) {
      continue;
    }

    const match = /^ {2}'(@antv\/[^']+)@([^'(]+)(?:\([^']*\))?':\s*$/u.exec(header);
    if (match === null || match[1] === undefined || match[2] === undefined) {
      findings.push(`unparseable AntV package entry in lockfile: ${header.trim()}`);
      continue;
    }

    let bodyEnd = index + 1;
    while (bodyEnd < packagesEnd && !/^ {2}\S/u.test(lines[bodyEnd] ?? '')) {
      bodyEnd += 1;
    }
    const body = lines.slice(index + 1, bodyEnd);
    const resolutionLines = body.filter(line => /^ {4}resolution:/u.test(line));
    const resolution = resolutionLines[0] ?? '';
    const integrityMatch = /^ {4}resolution: \{integrity: (sha512-[A-Za-z0-9+/]+={0,2})\}$/u.exec(
      resolution,
    );
    const hasCustomSource = body.some(line =>
      /(?:https?:|git(?:hub)?[:+]|(?:tarball|path|directory|repo|commit):)/iu.test(line),
    );
    entries.push({
      name: match[1],
      version: match[2],
      integrity: integrityMatch?.[1],
      hasCanonicalResolution: resolutionLines.length === 1 && integrityMatch !== null,
      hasCustomSource,
    });
    index = bodyEnd - 1;
  }
  return { entries, findings };
}

export function collectAntvLockVersions(lockText) {
  const versions = new Map();
  for (const { name, version } of collectAntvLockEntries(lockText).entries) {
    const packageVersions = versions.get(name) ?? new Set();
    packageVersions.add(version);
    versions.set(name, packageVersions);
  }
  return versions;
}

export function validateAntvLock(lockText, trustedArtifacts) {
  const findings = [];
  const forbiddenIndicators = [
    '@antv/setup',
    'github:antvis/G2#',
    'bun run index.js',
    '1916faa365f2788b6e193514872d51a242876569',
    '7cb42f57561c321ecb09b4552802ae0ac55b3a7a',
  ];
  for (const indicator of forbiddenIndicators) {
    if (lockText.includes(indicator)) {
      findings.push(`dependency lock contains forbidden AntV indicator: ${indicator}`);
    }
  }

  const collected = collectAntvLockEntries(lockText);
  findings.push(...collected.findings);
  const entryCounts = new Map();
  for (const entry of collected.entries) {
    const id = `${entry.name}@${entry.version}`;
    entryCounts.set(id, (entryCounts.get(id) ?? 0) + 1);
    const trustedIntegrity = trustedArtifactsFor(trustedArtifacts, entry.name)[entry.version];
    if (typeof trustedIntegrity !== 'string') {
      findings.push(`unreviewed AntV dependency in lockfile: ${id}`);
      continue;
    }
    if (!entry.hasCanonicalResolution || entry.hasCustomSource) {
      findings.push(
        `AntV dependency does not use a canonical registry integrity resolution: ${id}`,
      );
    }
    if (entry.integrity !== trustedIntegrity) {
      findings.push(`AntV dependency integrity does not match reviewed artifact: ${id}`);
    }
  }
  for (const [id, count] of entryCounts) {
    if (count !== 1) {
      findings.push(`AntV dependency has duplicate lockfile entries: ${id}`);
    }
  }
  for (const [name, artifacts] of Object.entries(trustedArtifacts)) {
    if (
      !name.startsWith('@antv/') ||
      artifacts === null ||
      typeof artifacts !== 'object' ||
      Array.isArray(artifacts)
    ) {
      findings.push(`invalid trusted AntV artifact policy entry: ${name}`);
      continue;
    }
    for (const [version, integrity] of Object.entries(artifacts)) {
      const id = `${name}@${version}`;
      if (typeof integrity !== 'string' || !/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(integrity)) {
        findings.push(`invalid reviewed integrity in AntV artifact policy: ${id}`);
      }
      if (!entryCounts.has(id)) {
        findings.push(`trusted AntV dependency is missing from lockfile: ${id}`);
      }
    }
  }
  return findings;
}

export function validateInstalledAntvManifest(manifest, path, trustedArtifacts) {
  const findings = [];
  if (typeof manifest.name !== 'string' || !manifest.name.startsWith('@antv/')) {
    return [`unexpected package in AntV install scope: ${path}`];
  }
  const trusted = new Set(Object.keys(trustedArtifactsFor(trustedArtifacts, manifest.name)));
  if (typeof manifest.version !== 'string' || !trusted.has(manifest.version)) {
    findings.push(`unreviewed installed AntV dependency: ${manifest.name}@${manifest.version}`);
  }
  for (const lifecycle of ['preinstall', 'install', 'postinstall']) {
    if (manifest.scripts?.[lifecycle] !== undefined) {
      findings.push(
        `AntV dependency has an install lifecycle script (${lifecycle}): ${manifest.name}@${manifest.version}`,
      );
    }
  }
  if (manifest.optionalDependencies?.['@antv/setup'] !== undefined) {
    findings.push(`AntV dependency contains @antv/setup: ${manifest.name}@${manifest.version}`);
  }
  const serialized = JSON.stringify(manifest);
  if (serialized.includes('bun run index.js') || serialized.includes('github:antvis/G2#')) {
    findings.push(`AntV dependency contains a forbidden lifecycle indicator: ${path}`);
  }
  return findings;
}

function installedManifestPaths() {
  const pnpmRoot = resolve(repositoryRoot, 'node_modules/.pnpm');
  if (!existsSync(pnpmRoot)) {
    return [];
  }
  const paths = [];
  for (const entry of readdirSync(pnpmRoot)) {
    const scope = resolve(pnpmRoot, entry, 'node_modules/@antv');
    if (!existsSync(scope)) {
      continue;
    }
    for (const packageName of readdirSync(scope)) {
      const manifestPath = resolve(scope, packageName, 'package.json');
      if (existsSync(manifestPath)) {
        paths.push(manifestPath);
      }
    }
  }
  return paths;
}

function main() {
  const args = process.argv.slice(2);
  const lockOnly = args.length === 1 && args[0] === '--lock-only';
  if (args.length > 0 && !lockOnly) {
    fail('TellPlot dependency security audit failed', [`unsupported argument: ${args.join(' ')}`]);
    return;
  }
  const trustedArtifacts = JSON.parse(readFileSync(policyPath, 'utf8'));
  const lockText = readFileSync(resolve(repositoryRoot, 'pnpm-lock.yaml'), 'utf8');
  const findings = validateAntvLock(lockText, trustedArtifacts);
  const manifestPaths = lockOnly ? [] : installedManifestPaths();
  if (!lockOnly) {
    if (manifestPaths.length === 0) {
      findings.push('installed AntV dependency manifests are unavailable; run pnpm install first');
    }
    for (const manifestPath of manifestPaths) {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      findings.push(...validateInstalledAntvManifest(manifest, manifestPath, trustedArtifacts));
    }
  }

  if (findings.length > 0) {
    fail('TellPlot dependency security audit failed', [...new Set(findings)].sort());
    return;
  }
  process.stdout.write(
    `${JSON.stringify(
      {
        status: 'passed',
        policy: 'exact-reviewed-antv-artifacts',
        scope: lockOnly ? 'lockfile' : 'lockfile-and-installed-manifests',
        packages: Object.keys(trustedArtifacts).length,
        artifacts: Object.values(trustedArtifacts).reduce(
          (count, artifacts) => count + Object.keys(artifacts).length,
          0,
        ),
        ...(lockOnly ? {} : { installedManifests: manifestPaths.length }),
      },
      null,
      2,
    )}\n`,
  );
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main();
}
