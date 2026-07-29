import { run } from './release-utils.mjs';

const gates = [
  ['pnpm', ['release:architecture']],
  ['pnpm', ['release:audit']],
  ['pnpm', ['format:check']],
  ['pnpm', ['lint']],
  ['pnpm', ['typecheck']],
  ['pnpm', ['test:coverage']],
  ['pnpm', ['build']],
  ['pnpm', ['release:artifact']],
  ['pnpm', ['test:package']],
  ['pnpm', ['test:react-matrix']],
  ['pnpm', ['test:e2e']],
  ['pnpm', ['test:a11y']],
  ['pnpm', ['test:performance']],
  ['pnpm', ['test:browser-previous']],
  ['pnpm', ['release:rehearse']],
];

for (const [command, args] of gates) {
  process.stdout.write(`\n[stable] ${command} ${args.join(' ')}\n`);
  run(command, args, { inherit: true });
}

process.stdout.write('\nTellPlot 1.0.0 stable release checks passed.\n');
