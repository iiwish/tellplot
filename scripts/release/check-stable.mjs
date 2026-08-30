import { run } from './release-utils.mjs';
import { currentRelease } from './current-release.mjs';

const gates = [
  ['pnpm', ['security:lock']],
  ['pnpm', ['security:dependencies']],
  ['pnpm', ['audit:prod']],
  ['pnpm', ['release:architecture']],
  ['pnpm', ['release:audit']],
  ['pnpm', ['format:check']],
  ['pnpm', ['lint']],
  ['pnpm', ['typecheck']],
  ['pnpm', ['test:coverage']],
  ['pnpm', ['build']],
  ['pnpm', ['release:artifact']],
  ['pnpm', ['test:package']],
  ['pnpm', ['test:framework-matrix']],
  // Keep the timing gate ahead of long browser suites so its result is not order-dependent.
  ['pnpm', ['test:performance']],
  ['pnpm', ['test:e2e']],
  ['pnpm', ['test:a11y']],
  ['pnpm', ['test:browser-previous']],
  ['pnpm', ['release:rehearse']],
];

for (const [command, args] of gates) {
  process.stdout.write(`\n[stable] ${command} ${args.join(' ')}\n`);
  run(command, args, { inherit: true });
}

process.stdout.write(`\nTellPlot ${currentRelease.version} stable release checks passed.\n`);
