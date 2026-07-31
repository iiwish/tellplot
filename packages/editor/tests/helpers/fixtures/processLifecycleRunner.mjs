import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createProcessLifecycle } from '../processLifecycle.mjs';

const controlDirectoryArgument = process.argv[2];

if (controlDirectoryArgument === undefined) {
  throw new Error('a control directory is required');
}

const controlDirectory = resolve(controlDirectoryArgument);
const heartbeatPath = join(controlDirectory, 'grandchild-heartbeat.txt');
const grandchildPidPath = join(controlDirectory, 'grandchild.pid');
const groupLeaderPidPath = join(controlDirectory, 'group-leader.pid');
const readyPath = join(controlDirectory, 'ready.json');
const readyTemporaryPath = join(controlDirectory, 'ready.json.tmp');
const cleanupMarkerPath = join(controlDirectory, 'cleanup-complete');
const temporaryRoot = await mkdtemp(join(tmpdir(), 'tellplot-process-lifecycle-'));
const lifecycle = createProcessLifecycle('process-lifecycle-fixture', {
  forceTimeoutMs: 2_000,
  gracefulTimeoutMs: 250,
  taskkillTimeoutMs: 2_000,
});
let cleanupPromise;

const delay = milliseconds =>
  new Promise(resolvePromise => {
    setTimeout(resolvePromise, milliseconds);
  });

const waitForGrandchild = async () => {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    lifecycle.throwIfTerminationRequested();
    if (existsSync(grandchildPidPath) && existsSync(heartbeatPath)) {
      const grandchildPid = Number.parseInt(await readFile(grandchildPidPath, 'utf8'), 10);
      if (Number.isSafeInteger(grandchildPid) && grandchildPid > 0) {
        return grandchildPid;
      }
    }
    await delay(20);
  }
  throw new Error('lifecycle fixture grandchild did not become ready');
};

const cleanup = () =>
  (cleanupPromise ??= (async () => {
    let processCleanupError;
    try {
      await lifecycle.stopActiveProcesses();
    } catch (error) {
      processCleanupError = error;
    } finally {
      try {
        await rm(temporaryRoot, {
          force: true,
          maxRetries: 3,
          recursive: true,
          retryDelay: 25,
        });
        await writeFile(cleanupMarkerPath, 'complete\n', 'utf8');
      } finally {
        lifecycle.finishCleanup();
      }
    }
    if (processCleanupError !== undefined) {
      throw processCleanupError;
    }
  })());

process.on('message', message => {
  if (process.platform === 'win32' && message === 'SIGTERM') {
    process.emit('SIGTERM');
  }
});

lifecycle.installSignalCleanup();

try {
  const groupLeaderPath = fileURLToPath(
    new URL('./processLifecycleGroupLeader.mjs', import.meta.url),
  );
  const processGroup = process.platform !== 'win32';
  const groupLeader = lifecycle.trackProcess(
    spawn(process.execPath, [groupLeaderPath, heartbeatPath, grandchildPidPath], {
      detached: processGroup,
      stdio: 'ignore',
    }),
    processGroup,
  );
  if (groupLeader.pid === undefined) {
    throw new Error('lifecycle fixture group leader did not start');
  }
  await writeFile(groupLeaderPidPath, String(groupLeader.pid), 'utf8');
  const grandchildPid = await waitForGrandchild();
  await writeFile(
    readyTemporaryPath,
    `${JSON.stringify({ grandchildPid, heartbeatPath, temporaryRoot })}\n`,
    'utf8',
  );
  await rename(readyTemporaryPath, readyPath);

  while (true) {
    lifecycle.throwIfTerminationRequested();
    await delay(20);
  }
} catch (error) {
  if (lifecycle.receivedSignal === undefined) {
    console.error('process lifecycle fixture failed:', error);
    process.exitCode = 1;
  }
} finally {
  try {
    await cleanup();
  } catch (error) {
    if (lifecycle.receivedSignal === undefined) {
      console.error('process lifecycle fixture cleanup failed:', error);
      process.exitCode = 1;
    }
  }
}
