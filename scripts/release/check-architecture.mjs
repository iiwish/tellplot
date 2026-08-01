import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';

import ts from 'typescript';

import {
  isCoreForbidden,
  isFrameworkNeutralForbidden,
  matchesAnyPackageSpecifier,
  matchesPackageSpecifier,
} from './architecture-policy.mjs';
import { packageContracts } from './package-contracts.mjs';
import { fail, repositoryPath, repositoryRoot, toPosix, walkFiles } from './release-utils.mjs';

const packageRoots = packageContracts.map(contract =>
  resolve(repositoryRoot, 'packages', contract.directory, 'src'),
);
const packageSourcePolicies = packageContracts.map(contract => ({
  contract,
  prefix: `packages/${contract.directory}/src/`,
  runtimePackages: Object.keys({
    ...contract.dependencies,
    ...contract.peerDependencies,
  }).concat(contract.sourceDependencies ?? []),
}));
const sourceFiles = packageRoots.flatMap(root =>
  walkFiles(root).filter(path => ['.ts', '.tsx'].includes(extname(path))),
);
const sourceSet = new Set(sourceFiles);
const runtimeGraph = new Map(sourceFiles.map(path => [path, []]));
const findings = [];
let edgeCount = 0;

function resolveLocal(source, specifier) {
  const publicPackages = Object.fromEntries(
    packageContracts.map(contract => [
      contract.name,
      resolve(repositoryRoot, 'packages', contract.directory, contract.entry),
    ]),
  );
  const base = publicPackages[specifier]
    ? publicPackages[specifier]
    : specifier.startsWith('.')
      ? resolve(dirname(source), specifier)
      : undefined;
  if (base === undefined) {
    return undefined;
  }
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    resolve(base, 'index.ts'),
    resolve(base, 'index.tsx'),
  ];
  return candidates.find(path => sourceSet.has(path) || existsSync(path));
}

function sourceName(path) {
  return toPosix(relative(repositoryRoot, path));
}

function recordBoundary(source, target) {
  const from = sourceName(source);
  const to = sourceName(target);
  edgeCount += 1;
  if (from.startsWith('packages/core/') && !to.startsWith('packages/core/')) {
    findings.push(`core package boundary: ${from} -> ${to}`);
  }
  if (
    from.startsWith('packages/editor/') &&
    !to.startsWith('packages/editor/') &&
    !to.startsWith('packages/core/')
  ) {
    findings.push(`editor package boundary: ${from} -> ${to}`);
  }
  if (from.startsWith('packages/core/src/domain/') && !to.startsWith('packages/core/src/domain/')) {
    findings.push(`core domain boundary: ${from} -> ${to}`);
  }
  if (
    from.startsWith('packages/core/src/interactions/') &&
    !(
      to.startsWith('packages/core/src/domain/') || to.startsWith('packages/core/src/interactions/')
    )
  ) {
    findings.push(`core interactions boundary: ${from} -> ${to}`);
  }
}

function collectImports(sourcePath) {
  const sourceNameValue = sourceName(sourcePath);
  const text = readFileSync(sourcePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    sourcePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    sourcePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const runtimeTargets = runtimeGraph.get(sourcePath);

  function add(specifier, runtime) {
    const target = resolveLocal(sourcePath, specifier);
    const sourcePolicy = packageSourcePolicies.find(policy =>
      sourceNameValue.startsWith(policy.prefix),
    );
    if (target !== undefined) {
      recordBoundary(sourcePath, target);
      if (runtime) {
        runtimeTargets?.push(target);
      }
    }
    if (
      !specifier.startsWith('.') &&
      sourcePolicy !== undefined &&
      !sourcePolicy.runtimePackages.some(packageName =>
        matchesPackageSpecifier(specifier, packageName),
      )
    ) {
      findings.push(
        `external dependency outside ${sourcePolicy.contract.name} allowlist: ${sourceNameValue} -> ${specifier}`,
      );
    }
    if (sourceNameValue.startsWith('packages/core/') && isCoreForbidden(specifier)) {
      findings.push(`forbidden core dependency: ${sourceNameValue} -> ${specifier}`);
    }
    if (sourceNameValue.startsWith('packages/editor/') && isFrameworkNeutralForbidden(specifier)) {
      findings.push(`forbidden editor framework dependency: ${sourceNameValue} -> ${specifier}`);
    }
    if (
      sourceNameValue.startsWith('packages/react/') &&
      matchesPackageSpecifier(specifier, 'vue')
    ) {
      findings.push(`cross-framework React dependency: ${sourceNameValue} -> ${specifier}`);
    }
    if (
      sourceNameValue.startsWith('packages/vue/') &&
      matchesAnyPackageSpecifier(specifier, ['react', 'react-dom'])
    ) {
      findings.push(`cross-framework Vue dependency: ${sourceNameValue} -> ${specifier}`);
    }
    if (matchesAnyPackageSpecifier(specifier, ['@antv/g2', '@antv/g-svg'])) {
      const allowed =
        sourceNameValue === 'packages/editor/src/charts/groupRegions.ts' ||
        /^packages\/editor\/src\/charts\/(waterfall|categorical)\/spec\.ts$/u.test(
          sourceNameValue,
        ) ||
        sourceNameValue.startsWith('packages/editor/src/rendering/g2/');
      if (!allowed) {
        findings.push(`raw G2 import outside editor adapter boundary: ${sourceNameValue}`);
      }
    }
  }

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      let runtime = !node.isTypeOnly;
      if (ts.isImportDeclaration(node) && node.importClause !== undefined) {
        const clause = node.importClause;
        runtime =
          !clause.isTypeOnly &&
          (clause.name !== undefined ||
            clause.namedBindings === undefined ||
            ts.isNamespaceImport(clause.namedBindings) ||
            clause.namedBindings.elements.some(element => !element.isTypeOnly));
      }
      add(node.moduleSpecifier.text, runtime);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1
    ) {
      const argument = node.arguments[0];
      if (argument !== undefined && ts.isStringLiteral(argument)) {
        add(argument.text, true);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

for (const sourceFile of sourceFiles) {
  collectImports(sourceFile);
}

const visiting = new Set();
const visited = new Set();
const stack = [];

function visitCycle(node) {
  if (visiting.has(node)) {
    const start = stack.indexOf(node);
    findings.push(
      `runtime import cycle: ${[...stack.slice(start), node].map(sourceName).join(' -> ')}`,
    );
    return;
  }
  if (visited.has(node)) {
    return;
  }
  visiting.add(node);
  stack.push(node);
  for (const target of runtimeGraph.get(node) ?? []) {
    visitCycle(target);
  }
  stack.pop();
  visiting.delete(node);
  visited.add(node);
}

for (const sourceFile of sourceFiles) {
  visitCycle(sourceFile);
}

const coreEntry = readFileSync(resolve(repositoryRoot, 'packages/core/src/index.ts'), 'utf8');
for (const forbidden of ['G2Spec', 'G2Chart', 'HTMLElement', 'react', 'vue']) {
  if (coreEntry.includes(forbidden)) {
    findings.push(`core public entry contains forbidden identifier: ${forbidden}`);
  }
}
const editorEntry = readFileSync(resolve(repositoryRoot, 'packages/editor/src/index.ts'), 'utf8');
for (const forbidden of ['G2Spec', 'G2Chart', 'FinancialChartEditor', 'rendering/g2']) {
  if (editorEntry.includes(forbidden)) {
    findings.push(`editor public entry contains internal identifier: ${forbidden}`);
  }
}

if (findings.length > 0) {
  fail('TellPlot architecture check failed', [...new Set(findings)].sort());
} else {
  process.stdout.write(
    `${JSON.stringify(
      {
        status: 'passed',
        packages: packageRoots.map(repositoryPath),
        sourceFiles: sourceFiles.length,
        importEdges: edgeCount,
        runtimeCycles: 0,
        publicEntries: packageContracts.map(contract =>
          repositoryPath(resolve(repositoryRoot, 'packages', contract.directory, contract.entry)),
        ),
      },
      null,
      2,
    )}\n`,
  );
}
