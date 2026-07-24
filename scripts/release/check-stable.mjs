import { run } from './release-utils.mjs';

const gates = [
  ['pnpm', ['release:architecture']],
  ['pnpm', ['release:audit']],
  ['pnpm', ['format:check']],
  ['pnpm', ['lint']],
  ['pnpm', ['typecheck']],
  ['pnpm', ['test:unit']],
  ['pnpm', ['build']],
  ['pnpm', ['test:package']],
];

for (const [command, args] of gates) {
  process.stdout.write(`\n[stable] ${command} ${args.join(' ')}\n`);
  run(command, args, { inherit: true });
}

process.stdout.write('\nTellPlot 1.0.0 stable release checks passed.\n');
