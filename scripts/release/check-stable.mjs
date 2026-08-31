import { run } from './release-utils.mjs';
import { currentRelease } from './current-release.mjs';

const PERFORMANCE_COOLDOWN_MS = 60_000;

async function coolDownHost() {
  process.stdout.write(
    `\n[stable] cooling host for ${String(PERFORMANCE_COOLDOWN_MS / 1_000)}s before the 150ms performance gate\n`,
  );
  await new Promise(resolve => setTimeout(resolve, PERFORMANCE_COOLDOWN_MS));
}

const gates = [
  ['pnpm', ['security:lock']],
  ['pnpm', ['security:dependencies']],
  ['pnpm', ['audit:prod']],
  ['pnpm', ['release:architecture']],
  ['pnpm', ['release:audit']],
  ['pnpm', ['format:check']],
  ['pnpm', ['lint']],
  ['pnpm', ['typecheck']],
  // Run the timing gate before coverage/build/package work heats the host.
  ['pnpm', ['test:performance']],
  ['pnpm', ['test:coverage']],
  ['pnpm', ['build']],
  ['pnpm', ['release:artifact']],
  ['pnpm', ['test:package']],
  ['pnpm', ['test:framework-matrix']],
  ['pnpm', ['test:e2e']],
  ['pnpm', ['test:a11y']],
  ['pnpm', ['test:browser-previous']],
  ['pnpm', ['release:rehearse']],
];

for (const [command, args] of gates) {
  if (args[0] === 'test:performance') {
    await coolDownHost();
  }
  process.stdout.write(`\n[stable] ${command} ${args.join(' ')}\n`);
  run(command, args, { inherit: true });
}

process.stdout.write(`\nTellPlot ${currentRelease.version} stable release checks passed.\n`);
