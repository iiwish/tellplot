import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';

import ts from 'typescript';

import { fail, repositoryPath, repositoryRoot, toPosix, walkFiles } from './release-utils.mjs';

const findings = [];
const packagePath = resolve(repositoryRoot, 'packages/editor/package.json');
const packageManifest = JSON.parse(readFileSync(packagePath, 'utf8'));
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
  'packages/editor/README.md',
  'packages/editor/LICENSE',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/pull_request_template.md',
];

if (packageManifest.version !== '1.0.0') {
  findings.push(`package version must be 1.0.0, received ${String(packageManifest.version)}`);
}
if (!/^\d+\.\d+\.\d+$/u.test(String(packageManifest.version))) {
  findings.push('package version must not contain a prerelease suffix');
}
for (const path of requiredFiles) {
  if (!existsSync(resolve(repositoryRoot, path))) {
    findings.push(`missing public file: ${path}`);
  }
}

const publicEntryPath = resolve(repositoryRoot, 'packages/editor/src/index.ts');
const publicEntryText = readFileSync(publicEntryPath, 'utf8');
const publicEntry = ts.createSourceFile(
  publicEntryPath,
  publicEntryText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);
const runtimeExports = [];
for (const statement of publicEntry.statements) {
  if (
    ts.isExportDeclaration(statement) &&
    !statement.isTypeOnly &&
    statement.exportClause !== undefined &&
    ts.isNamedExports(statement.exportClause)
  ) {
    for (const element of statement.exportClause.elements) {
      if (!element.isTypeOnly) {
        runtimeExports.push(element.name.text);
      }
    }
  }
}
const expectedRuntimeExports = [
  'ChartEditor',
  'createEditorSession',
  'createInitialViewSpec',
  'executeCommand',
  'parseViewSpec',
  'redoSession',
  'serializeViewSpec',
  'undoSession',
  'validateChartConfig',
  'validateSourceData',
  'validateViewSpec',
].sort();
if (JSON.stringify(runtimeExports.sort()) !== JSON.stringify(expectedRuntimeExports)) {
  findings.push('runtime exports do not match the stable 1.x allowlist');
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
    'packages/editor/README.md',
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

const auditRoots = ['apps', 'docs', 'packages/editor/src', 'scripts', '.github'].map(path =>
  resolve(repositoryRoot, path),
);
const auditFiles = [
  ...auditRoots.flatMap(path => walkFiles(path, { excludedNames: ['dist'] })),
  ...requiredFiles.slice(0, 6).map(path => resolve(repositoryRoot, path)),
  resolve(repositoryRoot, 'package.json'),
  packagePath,
];
const sensitivePatterns = [
  { name: 'private key marker', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/u },
  { name: 'GitHub token', pattern: /\bgh[oprsu]_[A-Za-z0-9]{20,}\b/u },
  { name: 'npm token', pattern: /\bnpm_[A-Za-z0-9]{20,}\b/u },
  { name: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/u },
  { name: 'personal absolute path', pattern: /(?:\/Users\/|\/home\/|[A-Z]:\\Users\\)/u },
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
        version: packageManifest.version,
        runtimeExports: expectedRuntimeExports.length,
        publicFiles: requiredFiles.length,
        markdownFiles: markdownFiles.length,
        auditedFiles: new Set(auditFiles).size,
      },
      null,
      2,
    )}\n`,
  );
}
