import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { OFFICIAL_NPM_REGISTRY } from './audit-production.mjs';
import { fail, repositoryRoot } from './release-utils.mjs';

const PACKAGE_DIRECTORIES = ['core', 'editor', 'react', 'vue'];
const EXPECTED_PACKAGE_NAMES = PACKAGE_DIRECTORIES.map(directory => `@tellplot/${directory}`);

export function packageRootUrl(name) {
  return new URL(encodeURIComponent(name), OFFICIAL_NPM_REGISTRY).toString();
}

export function packageVersionUrl(name, version) {
  return new URL(
    `${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
    OFFICIAL_NPM_REGISTRY,
  ).toString();
}

function packageId(packageMetadata) {
  return `${packageMetadata.name}@${packageMetadata.version}`;
}

function releaseVersion(packages) {
  const versions = packages.map(packageMetadata => packageMetadata?.version);
  return versions.length === EXPECTED_PACKAGE_NAMES.length &&
    versions.every(version => version === versions[0]) &&
    /^\d+\.\d+\.\d+$/u.test(versions[0] ?? '')
    ? versions[0]
    : undefined;
}

function validatePackages(packages) {
  const findings = [];
  if (
    JSON.stringify(packages.map(packageMetadata => packageMetadata?.name)) !==
    JSON.stringify(EXPECTED_PACKAGE_NAMES)
  ) {
    findings.push('trust readiness requires core, editor, react, and vue in dependency order');
  }
  if (releaseVersion(packages) === undefined) {
    findings.push('trust readiness requires one stable version across all four packages');
  }
  return findings;
}

export function validateTrustReadiness(packages, results, confirmation) {
  const findings = validatePackages(packages);
  const version = releaseVersion(packages);
  const expectedConfirmation = `stage ${version} stage-only-trusted-publishers-verified`;
  if (confirmation !== expectedConfirmation) {
    findings.push(
      `stage-only trusted publishers must be verified manually; confirmation must equal "${expectedConfirmation}"`,
    );
  }

  const expectedIds = new Set(packages.map(packageId));
  const resultCounts = new Map();
  for (const result of results) {
    const id = packageId(result);
    resultCounts.set(id, (resultCounts.get(id) ?? 0) + 1);
    if (!expectedIds.has(id)) {
      findings.push(`unexpected npm trust-readiness result: ${id}`);
      continue;
    }
    if (result.rootStatus === 'bootstrap-required') {
      findings.push(
        `${result.name} package root is absent; bootstrap required: complete a separately authorized non-1.0.0 bootstrap publish, then configure publish-npm.yml with npm-production as a stage-only Trusted Publisher (allow-stage-publish enabled, allow-publish disabled) before rerunning`,
      );
    } else if (result.rootStatus !== 'exists') {
      findings.push(`${result.name} package root query failed on the official npm registry`);
    }

    if (result.versionStatus === 'exists') {
      findings.push(`${id} already exists on the official npm registry`);
    } else if (result.versionStatus !== 'available') {
      findings.push(`${id} version query failed on the official npm registry`);
    }
  }
  for (const id of expectedIds) {
    if (resultCounts.get(id) !== 1) {
      findings.push(`${id} trust-readiness result is missing or duplicated`);
    }
  }
  return [...new Set(findings)];
}

async function queryStatus(url, missingStatus) {
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        accept: 'application/json',
      },
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    return response.status === 404 ? missingStatus : response.ok ? 'exists' : 'query-failed';
  } catch {
    return 'query-failed';
  }
}

async function queryPackage(packageMetadata) {
  const [rootStatus, versionStatus] = await Promise.all([
    queryStatus(packageRootUrl(packageMetadata.name), 'bootstrap-required'),
    queryStatus(packageVersionUrl(packageMetadata.name, packageMetadata.version), 'available'),
  ]);
  return {
    ...packageMetadata,
    rootStatus,
    versionStatus,
  };
}

function loadPackages() {
  return PACKAGE_DIRECTORIES.map(directory => {
    try {
      const manifest = JSON.parse(
        readFileSync(resolve(repositoryRoot, 'packages', directory, 'package.json'), 'utf8'),
      );
      return {
        name: manifest.name,
        version: manifest.version,
      };
    } catch {
      return {
        name: `@tellplot/${directory}`,
        version: '',
      };
    }
  });
}

async function main() {
  const args = process.argv.slice(2);
  const ci = args.length === 1 && args[0] === '--ci';
  if (args.length > 0 && !ci) {
    fail('TellPlot npm Trusted Publishing readiness failed', [
      `unsupported arguments: ${args.join(' ')}`,
    ]);
    return;
  }

  const packages = loadPackages();
  const packageFindings = validatePackages(packages);
  if (packageFindings.length > 0) {
    fail('TellPlot npm Trusted Publishing readiness failed', packageFindings);
    return;
  }

  const results = await Promise.all(packages.map(queryPackage));
  const findings = validateTrustReadiness(
    packages,
    results,
    process.env['TELLPLOT_RELEASE_CONFIRMATION'],
  );
  if (ci && process.env['GITHUB_ACTIONS'] !== 'true') {
    findings.push('Trusted Publishing readiness --ci requires GitHub Actions');
  }
  if (ci && process.env['GITHUB_EVENT_NAME'] !== 'workflow_dispatch') {
    findings.push('Trusted Publishing readiness --ci requires workflow_dispatch');
  }
  if (findings.length > 0) {
    fail('TellPlot npm Trusted Publishing readiness failed', findings);
    return;
  }
  process.stdout.write(
    `${JSON.stringify(
      {
        status: 'passed',
        registry: OFFICIAL_NPM_REGISTRY,
        bootstrap: 'complete',
        trustedPublishers: 'stage-only-manually-verified',
        packages: packages.map(packageId),
      },
      null,
      2,
    )}\n`,
  );
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  await main();
}
