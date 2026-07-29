import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';

import ts from 'typescript';

import { fail, repositoryPath, repositoryRoot, toPosix, walkFiles } from './release-utils.mjs';

const sourceRoot = resolve(repositoryRoot, 'packages/editor/src');
const sourceFiles = walkFiles(sourceRoot).filter(path => ['.ts', '.tsx'].includes(extname(path)));
const sourceSet = new Set(sourceFiles);
const runtimeGraph = new Map(sourceFiles.map(path => [path, []]));
const findings = [];
let edgeCount = 0;

function resolveLocal(source, specifier) {
  if (!specifier.startsWith('.')) {
    return undefined;
  }
  const base = resolve(dirname(source), specifier);
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
  return toPosix(relative(sourceRoot, path));
}

function recordBoundary(source, target) {
  const from = sourceName(source);
  const to = sourceName(target);
  edgeCount += 1;

  if (from.startsWith('domain/') && !to.startsWith('domain/')) {
    findings.push(`domain boundary: ${from} -> ${to}`);
  }
  if (
    from.startsWith('interactions/') &&
    !(to.startsWith('domain/') || to.startsWith('interactions/'))
  ) {
    findings.push(`interactions boundary: ${from} -> ${to}`);
  }
  if (
    /^(charts|domain|export|interactions|rendering)\//u.test(from) &&
    to.startsWith('components/') &&
    to !== 'components/formatAmount.ts'
  ) {
    findings.push(`low-level component dependency: ${from} -> ${to}`);
  }
}

function collectImports(sourcePath) {
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
    if (target !== undefined) {
      recordBoundary(sourcePath, target);
      if (runtime) {
        runtimeTargets?.push(target);
      }
    }
    if (specifier === '@antv/g2' || specifier === '@antv/g-svg') {
      const name = sourceName(sourcePath);
      const allowed =
        name === 'charts/groupRegions.ts' ||
        /^charts\/(waterfall|categorical)\/spec\.ts$/u.test(name) ||
        name.startsWith('rendering/g2/');
      if (!allowed) {
        findings.push(`raw G2 import outside adapter boundary: ${name}`);
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
    const cycle = [...stack.slice(start), node].map(sourceName).join(' -> ');
    findings.push(`runtime import cycle: ${cycle}`);
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

const publicEntry = readFileSync(resolve(sourceRoot, 'index.ts'), 'utf8');
for (const forbidden of ['G2Spec', 'G2Chart', 'FinancialChartEditor', 'rendering/g2']) {
  if (publicEntry.includes(forbidden)) {
    findings.push(`public entry contains internal identifier: ${forbidden}`);
  }
}

if (findings.length > 0) {
  fail('TellPlot architecture check failed', [...new Set(findings)].sort());
} else {
  process.stdout.write(
    `${JSON.stringify(
      {
        status: 'passed',
        sourceFiles: sourceFiles.length,
        importEdges: edgeCount,
        runtimeCycles: 0,
        publicEntry: repositoryPath(resolve(sourceRoot, 'index.ts')),
      },
      null,
      2,
    )}\n`,
  );
}
