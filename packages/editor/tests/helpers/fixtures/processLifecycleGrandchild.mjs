import { appendFileSync, writeFileSync } from 'node:fs';

const heartbeatPath = process.argv[2];
const pidPath = process.argv[3];

if (heartbeatPath === undefined || pidPath === undefined) {
  throw new Error('heartbeat and pid paths are required');
}

writeFileSync(pidPath, String(process.pid), 'utf8');
appendFileSync(heartbeatPath, 'ready\n', 'utf8');

process.on('SIGTERM', () => {
  // Exercise the process-group force escalation after the group leader exits.
});

setInterval(() => {
  appendFileSync(heartbeatPath, 'tick\n', 'utf8');
}, 25);
