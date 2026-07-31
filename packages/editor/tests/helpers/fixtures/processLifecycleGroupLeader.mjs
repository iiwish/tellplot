import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const heartbeatPath = process.argv[2];
const pidPath = process.argv[3];

if (heartbeatPath === undefined || pidPath === undefined) {
  throw new Error('heartbeat and pid paths are required');
}

const grandchildPath = fileURLToPath(new URL('./processLifecycleGrandchild.mjs', import.meta.url));
const grandchild = spawn(process.execPath, [grandchildPath, heartbeatPath, pidPath], {
  detached: false,
  stdio: 'ignore',
});

grandchild.once('error', error => {
  console.error('lifecycle fixture grandchild failed to start:', error);
  process.exitCode = 1;
});

setInterval(() => {
  // Keep the group leader alive while the fixture grandchild writes its heartbeat.
}, 1_000);
