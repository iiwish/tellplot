import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import ts from 'typescript';

const contractDocument = JSON.parse(
  readFileSync(new URL('./package-contracts.json', import.meta.url), 'utf8'),
);

export const packageContracts = contractDocument.packages;
export const publicPackageContracts = packageContracts.filter(contract => contract.public === true);

const packageContractByName = new Map(packageContracts.map(contract => [contract.name, contract]));

function hasModifier(node, kind) {
  return node.modifiers?.some(modifier => modifier.kind === kind) ?? false;
}

function bindingNames(name) {
  if (ts.isIdentifier(name)) {
    return [name.text];
  }
  return name.elements.flatMap(element =>
    ts.isOmittedExpression(element) ? [] : bindingNames(element.name),
  );
}

function declaredNames(statement) {
  if (
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement) ||
    ts.isFunctionDeclaration(statement) ||
    ts.isClassDeclaration(statement) ||
    ts.isEnumDeclaration(statement) ||
    ts.isModuleDeclaration(statement)
  ) {
    return statement.name !== undefined && ts.isIdentifier(statement.name)
      ? [statement.name.text]
      : [];
  }
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap(declaration =>
      bindingNames(declaration.name),
    );
  }
  return [];
}

function declarationKind(statement) {
  return ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)
    ? 'type'
    : 'runtime';
}

function setExport(surface, name, kind) {
  if (kind === 'runtime' || !surface.has(name)) {
    surface.set(name, kind);
  }
}

function sourceModulePath(sourcePath, specifier, packageEntries) {
  const publicEntry = packageEntries[specifier];
  const base =
    publicEntry !== undefined
      ? publicEntry
      : specifier.startsWith('.')
        ? resolve(dirname(sourcePath), specifier)
        : undefined;
  if (base === undefined) {
    return undefined;
  }
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    `${base}.cts`,
    resolve(base, 'index.ts'),
    resolve(base, 'index.tsx'),
    resolve(base, 'index.mts'),
    resolve(base, 'index.cts'),
  ];
  return candidates.find(candidate => existsSync(candidate));
}

function publicSurfaceMap(entryPath, packageEntries, cache, visiting) {
  const cached = cache.get(entryPath);
  if (cached !== undefined) {
    return cached;
  }
  if (visiting.has(entryPath)) {
    throw new Error(`Public export cycle cannot be resolved: ${entryPath}`);
  }
  visiting.add(entryPath);

  const source = ts.createSourceFile(
    entryPath,
    readFileSync(entryPath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    entryPath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const localDeclarations = new Map();
  const surface = new Map();

  for (const statement of source.statements) {
    const names = declaredNames(statement);
    const kind = declarationKind(statement);
    for (const name of names) {
      localDeclarations.set(name, kind);
    }
    if (!hasModifier(statement, ts.SyntaxKind.ExportKeyword)) {
      continue;
    }
    const exportedNames = hasModifier(statement, ts.SyntaxKind.DefaultKeyword)
      ? ['default']
      : names;
    for (const name of exportedNames) {
      setExport(surface, name, kind);
    }
  }

  for (const statement of source.statements) {
    if (!ts.isExportDeclaration(statement)) {
      continue;
    }
    const specifier =
      statement.moduleSpecifier !== undefined && ts.isStringLiteral(statement.moduleSpecifier)
        ? statement.moduleSpecifier.text
        : undefined;
    const targetPath =
      specifier === undefined ? undefined : sourceModulePath(entryPath, specifier, packageEntries);
    const target =
      targetPath === undefined
        ? undefined
        : publicSurfaceMap(targetPath, packageEntries, cache, visiting);

    if (statement.exportClause === undefined) {
      if (specifier !== undefined && target === undefined) {
        throw new Error(`Cannot resolve public export ${specifier} from ${entryPath}`);
      }
      for (const [name, kind] of target ?? []) {
        if (name !== 'default') {
          setExport(surface, name, kind);
        }
      }
      continue;
    }

    if (ts.isNamespaceExport(statement.exportClause)) {
      setExport(surface, statement.exportClause.name.text, 'runtime');
      continue;
    }

    for (const element of statement.exportClause.elements) {
      const exportedName = element.name.text;
      if (statement.isTypeOnly || element.isTypeOnly) {
        setExport(surface, exportedName, 'type');
        continue;
      }
      const localName = element.propertyName?.text ?? element.name.text;
      const kind = target?.get(localName) ?? localDeclarations.get(localName);
      if (kind === undefined) {
        throw new Error(`Cannot classify public export ${localName} from ${entryPath}`);
      }
      setExport(surface, exportedName, kind);
    }
  }

  visiting.delete(entryPath);
  cache.set(entryPath, surface);
  return surface;
}

export function collectPublicSurface(entryPath, options = {}) {
  const surface = publicSurfaceMap(
    resolve(entryPath),
    options.packageEntries ?? {},
    new Map(),
    new Set(),
  );
  const runtime = [];
  const types = [];
  for (const [name, kind] of surface) {
    (kind === 'runtime' ? runtime : types).push(name);
  }
  return {
    runtime: runtime.sort(),
    types: types.sort(),
  };
}

function normalizedRecord(value) {
  return Object.fromEntries(
    Object.entries(value ?? {}).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function sameRecord(left, right) {
  return JSON.stringify(normalizedRecord(left)) === JSON.stringify(normalizedRecord(right));
}

function sameNames(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function recordDifference(actual, expected) {
  const normalizedActual = normalizedRecord(actual);
  const normalizedExpected = normalizedRecord(expected);
  const unexpected = Object.keys(normalizedActual).filter(name => !(name in normalizedExpected));
  const missing = Object.keys(normalizedExpected).filter(name => !(name in normalizedActual));
  const changed = Object.keys(normalizedActual).filter(
    name => name in normalizedExpected && normalizedActual[name] !== normalizedExpected[name],
  );
  return [
    unexpected.length === 0 ? undefined : `unexpected ${unexpected.join(', ')}`,
    missing.length === 0 ? undefined : `missing ${missing.join(', ')}`,
    changed.length === 0
      ? undefined
      : `changed ${changed.map(name => `${name}=${String(normalizedActual[name])}`).join(', ')}`,
  ]
    .filter(Boolean)
    .join('; ');
}

function nameDifference(actual, expected) {
  const actualNames = new Set(actual);
  const expectedNames = new Set(expected);
  const unexpected = [...actualNames].filter(name => !expectedNames.has(name)).sort();
  const missing = [...expectedNames].filter(name => !actualNames.has(name)).sort();
  return [
    unexpected.length === 0 ? undefined : `unexpected ${unexpected.join(', ')}`,
    missing.length === 0 ? undefined : `missing ${missing.join(', ')}`,
  ]
    .filter(Boolean)
    .join('; ');
}

function inheritedExportNames(contract, field, visiting = new Set()) {
  const key = `${contract.name ?? contract.path ?? 'subpath'}:${field}`;
  if (visiting.has(key)) {
    throw new Error(`Package contract export inheritance cycle: ${key}`);
  }
  visiting.add(key);
  const names = new Set(contract[field] ?? []);
  for (const inheritedName of contract.inheritExports ?? []) {
    const inherited = packageContractByName.get(inheritedName);
    if (inherited === undefined) {
      throw new Error(`Unknown inherited package contract: ${inheritedName}`);
    }
    for (const name of inheritedExportNames(inherited, field, visiting)) {
      names.add(name);
    }
  }
  visiting.delete(key);
  return [...names].sort();
}

export function expectedPackageSurface(contract) {
  return {
    runtime: inheritedExportNames(contract, 'runtimeExports'),
    types: inheritedExportNames(contract, 'typeExports'),
  };
}

export function validatePackageSurface(surface, contract, label = contract.name) {
  const findings = [];
  const expectedSurface = expectedPackageSurface(contract);
  if (!sameNames(surface.runtime, expectedSurface.runtime)) {
    findings.push(
      `${label} runtime exports do not match the stable allowlist (${nameDifference(
        surface.runtime,
        expectedSurface.runtime,
      )})`,
    );
  }
  if (!sameNames(surface.types, expectedSurface.types)) {
    findings.push(
      `${label} type exports do not match the stable allowlist (${nameDifference(
        surface.types,
        expectedSurface.types,
      )})`,
    );
  }
  return findings;
}

export function validatePackageContract(manifest, surface, contract) {
  const findings = [];
  for (const field of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'peerDependenciesMeta',
  ]) {
    if (!sameRecord(manifest[field], contract[field])) {
      findings.push(
        `${contract.name} ${field} do not match the stable allowlist (${recordDifference(
          manifest[field],
          contract[field],
        )})`,
      );
    }
  }
  findings.push(...validatePackageSurface(surface, contract));
  return findings;
}

export function workspacePackageEntries(repositoryRoot) {
  return Object.fromEntries(
    packageContracts.map(contract => [
      contract.name,
      resolve(repositoryRoot, 'packages', contract.directory, contract.entry),
    ]),
  );
}
