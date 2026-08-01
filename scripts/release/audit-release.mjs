import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';

import {
  collectPublicSurface,
  packageContracts,
  publicPackageContracts,
  validatePackageContract,
  validatePackageSurface,
  workspacePackageEntries,
} from './package-contracts.mjs';
import { fail, repositoryPath, repositoryRoot, toPosix, walkFiles } from './release-utils.mjs';

const findings = [];
const packageEntries = workspacePackageEntries(repositoryRoot);
const publicSurfaceCounts = {};
const requiredFiles = [
  'README.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CODE_OF_CONDUCT.md',
  'SUPPORT.md',
  'LICENSE',
  'docs/getting-started.md',
  'docs/api.md',
  'docs/configuration.md',
  'docs/errors.md',
  'docs/migration.md',
  'docs/versioning.md',
  ...packageContracts.flatMap(({ directory }) => [
    `packages/${directory}/README.md`,
    `packages/${directory}/LICENSE`,
  ]),
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/pull_request_template.md',
];

for (const contract of packageContracts) {
  const packageRoot = resolve(repositoryRoot, 'packages', contract.directory);
  const manifestPath = resolve(packageRoot, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const publishConfig = manifest.publishConfig ?? {};

  if (manifest.name !== contract.name) {
    findings.push(`${contract.directory} package name must be ${contract.name}`);
  }
  if (contract.public === true) {
    if (manifest.version !== '1.0.0' || !/^\d+\.\d+\.\d+$/u.test(String(manifest.version))) {
      findings.push(`${contract.name} version must be stable 1.0.0`);
    }
    if (manifest.private === true) {
      findings.push(`${contract.name} public package must not be private`);
    }
    if (publishConfig.access !== 'public') {
      findings.push(`${contract.name} publishConfig.access must be public`);
    }
    if (publishConfig.registry !== 'https://registry.npmjs.org/') {
      findings.push(`${contract.name} must use the official npm registry`);
    }
    if (!Array.isArray(manifest.files) || !manifest.files.includes('dist')) {
      findings.push(`${contract.name} must publish only its dist allowlist plus npm metadata`);
    }
  } else {
    if (manifest.private !== true || manifest.version !== '0.0.0') {
      findings.push(`${contract.name} must remain a private 0.0.0 workspace layer`);
    }
    if (manifest.publishConfig !== undefined) {
      findings.push(`${contract.name} private workspace layer must not define publishConfig`);
    }
  }

  const surface = collectPublicSurface(resolve(packageRoot, contract.entry), { packageEntries });
  publicSurfaceCounts[contract.name] = {
    runtime: surface.runtime.length,
    types: surface.types.length,
  };
  findings.push(...validatePackageContract(manifest, surface, contract));
  for (const subpath of contract.subpaths ?? []) {
    const subpathSurface = collectPublicSurface(resolve(packageRoot, subpath.entry), {
      packageEntries,
    });
    publicSurfaceCounts[`${contract.name}${subpath.path.slice(1)}`] = {
      runtime: subpathSurface.runtime.length,
      types: subpathSurface.types.length,
    };
    findings.push(
      ...validatePackageSurface(
        subpathSurface,
        subpath,
        `${contract.name}${subpath.path.slice(1)}`,
      ),
    );
  }
}

for (const path of requiredFiles) {
  if (!existsSync(resolve(repositoryRoot, path))) {
    findings.push(`missing public file: ${path}`);
  }
}

const markdownFiles = [
  ...walkFiles(resolve(repositoryRoot, 'docs')).filter(path => extname(path) === '.md'),
  ...[
    'README.md',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    'SECURITY.md',
    'CODE_OF_CONDUCT.md',
    'SUPPORT.md',
    ...packageContracts.map(({ directory }) => `packages/${directory}/README.md`),
  ].map(path => resolve(repositoryRoot, path)),
];
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/gu;
for (const markdownPath of markdownFiles) {
  const text = readFileSync(markdownPath, 'utf8');
  for (const match of text.matchAll(linkPattern)) {
    const raw = match[1]?.trim();
    if (raw === undefined || raw === '' || raw.startsWith('#') || /^(https?:|mailto:)/u.test(raw)) {
      continue;
    }
    const path = raw.replace(/^<|>$/gu, '').split('#')[0]?.split('?')[0];
    if (path !== undefined && path !== '' && !existsSync(resolve(dirname(markdownPath), path))) {
      findings.push(`broken local link: ${repositoryPath(markdownPath)} -> ${raw}`);
    }
  }
}

const auditRoots = ['apps', 'docs', 'packages', 'scripts', '.github'].map(path =>
  resolve(repositoryRoot, path),
);
const governanceAuditExtensions = new Set(['.json', '.md', '.patch', '.yaml', '.yml']);
const governanceAuditFiles = walkFiles(resolve(repositoryRoot, '.ai-platform')).filter(path =>
  governanceAuditExtensions.has(extname(path)),
);
const auditFiles = [
  ...auditRoots.flatMap(path =>
    walkFiles(path, { excludedNames: ['dist', 'node_modules', 'coverage'] }),
  ),
  ...governanceAuditFiles,
  ...requiredFiles.slice(0, 6).map(path => resolve(repositoryRoot, path)),
  resolve(repositoryRoot, 'package.json'),
];
const sensitivePatterns = [
  { name: 'private key marker', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/u },
  { name: 'GitHub token', pattern: /\bgh[oprsu]_[A-Za-z0-9]{20,}\b/u },
  { name: 'npm token', pattern: /\bnpm_[A-Za-z0-9]{20,}\b/u },
  { name: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/u },
  { name: 'personal absolute path', pattern: /(?:\/Users\/|\/home\/|[A-Z]:\\Users\\)/u },
  { name: 'temporary absolute path', pattern: /(?:\/private)?\/var\/folders\//u },
];
for (const path of new Set(auditFiles)) {
  const text = readFileSync(path, 'utf8');
  for (const rule of sensitivePatterns) {
    if (rule.pattern.test(text)) {
      findings.push(`${rule.name}: ${toPosix(relative(repositoryRoot, path))}`);
    }
  }
}

if (findings.length > 0) {
  fail('TellPlot stable release audit failed', [...new Set(findings)].sort());
} else {
  process.stdout.write(
    `${JSON.stringify(
      {
        status: 'passed',
        version: '1.0.0',
        packages: publicPackageContracts.map(({ name }) => name),
        publicSurface: publicSurfaceCounts,
        publicFiles: requiredFiles.length,
        markdownFiles: markdownFiles.length,
        auditedFiles: new Set(auditFiles).size,
      },
      null,
      2,
    )}\n`,
  );
}
