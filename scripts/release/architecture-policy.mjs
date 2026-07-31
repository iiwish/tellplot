const FRAMEWORK_NEUTRAL_FORBIDDEN_PACKAGES = [
  'react',
  'react-dom',
  'vue',
  '@dnd-kit',
  'lucide-react',
];
const CORE_FORBIDDEN_PACKAGES = [
  ...FRAMEWORK_NEUTRAL_FORBIDDEN_PACKAGES,
  '@antv/g2',
  '@antv/g-svg',
];

export function matchesPackageSpecifier(specifier, packageName) {
  return specifier === packageName || specifier.startsWith(`${packageName}/`);
}

export function matchesAnyPackageSpecifier(specifier, packageNames) {
  return packageNames.some(packageName => matchesPackageSpecifier(specifier, packageName));
}

export function isFrameworkNeutralForbidden(specifier) {
  return matchesAnyPackageSpecifier(specifier, FRAMEWORK_NEUTRAL_FORBIDDEN_PACKAGES);
}

export function isCoreForbidden(specifier) {
  return matchesAnyPackageSpecifier(specifier, CORE_FORBIDDEN_PACKAGES);
}
