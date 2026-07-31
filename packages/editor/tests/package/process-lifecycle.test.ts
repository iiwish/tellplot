import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

interface FixtureReadyState {
  readonly grandchildPid: number;
  readonly heartbeatPath: string;
  readonly temporaryRoot: string;
}

interface ProcessExit {
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
}

const root = resolve(process.cwd());
const fixtureRunner = resolve(
  root,
  'packages/editor/tests/helpers/fixtures/processLifecycleRunner.mjs',
);

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolvePromise => {
    setTimeout(resolvePromise, milliseconds);
  });
}

async function waitFor<T>(
  readValue: () => T | undefined,
  description: string,
  timeoutMs = 5_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = readValue();
    if (value !== undefined) {
      return value;
    }
    await delay(25);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

function waitForExit(child: ChildProcess, timeoutMs: number): Promise<ProcessExit> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({
      code: child.exitCode,
      signal: child.signalCode as NodeJS.Signals | null,
    });
  }
  return new Promise((resolvePromise, rejectPromise) => {
    const timeout = setTimeout(() => {
      rejectPromise(new Error(`fixture runner did not exit within ${String(timeoutMs)}ms`));
    }, timeoutMs);
    child.once('exit', (code, signal) => {
      clearTimeout(timeout);
      resolvePromise({ code, signal });
    });
  });
}

function isProcessRunning(pid: number): boolean {
  if (process.platform === 'win32') {
    const result = spawnSync('tasklist', ['/FI', `PID eq ${String(pid)}`, '/FO', 'CSV', '/NH'], {
      encoding: 'utf8',
      timeout: 2_000,
      windowsHide: true,
    });
    return result.status === 0 && result.stdout.includes(`"${String(pid)}"`);
  }

  const result = spawnSync('ps', ['-p', String(pid), '-o', 'pid='], {
    encoding: 'utf8',
    timeout: 2_000,
  });
  return result.status === 0 && result.stdout.trim() === String(pid);
}

function readPid(path: string): number | undefined {
  if (!existsSync(path)) {
    return undefined;
  }
  const pid = Number.parseInt(readFileSync(path, 'utf8'), 10);
  return Number.isSafeInteger(pid) && pid > 0 ? pid : undefined;
}

function forceProcessTree(pid: number): void {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
      stdio: 'ignore',
      timeout: 2_000,
      windowsHide: true,
    });
    return;
  }
  try {
    process.kill(-pid, 'SIGKILL');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') {
      throw error;
    }
  }
}

async function forceFixtureCleanup(
  child: ChildProcess,
  controlDirectory: string,
  grandchildPid?: number,
): Promise<void> {
  const cleanupMarkerPath = join(controlDirectory, 'cleanup-complete');
  const groupLeaderPidPath = join(controlDirectory, 'group-leader.pid');
  if (child.exitCode === null && child.signalCode === null) {
    const gracefulExit = waitForExit(child, 4_000);
    if (process.platform === 'win32') {
      if (child.connected) {
        child.send('SIGTERM', error => {
          void error;
        });
      }
    } else {
      child.kill('SIGTERM');
    }
    await gracefulExit.catch(() => undefined);
  }

  const needsTreeFallback =
    !existsSync(cleanupMarkerPath) ||
    (grandchildPid !== undefined && isProcessRunning(grandchildPid));
  const groupLeaderPid = readPid(groupLeaderPidPath);
  if (needsTreeFallback && groupLeaderPid !== undefined) {
    forceProcessTree(groupLeaderPid);
    await delay(100);
  }
  if (child.pid !== undefined && child.exitCode === null && child.signalCode === null) {
    forceProcessTree(child.pid);
  }
}

describe('process lifecycle', () => {
  it('stops a detached process group before removing runner resources', async () => {
    const controlDirectory = await mkdtemp(join(tmpdir(), 'tellplot-lifecycle-test-'));
    const readyPath = join(controlDirectory, 'ready.json');
    const cleanupMarkerPath = join(controlDirectory, 'cleanup-complete');
    const output: string[] = [];
    const runner = spawn(process.execPath, [fixtureRunner, controlDirectory], {
      cwd: root,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });
    runner.stdout?.on('data', chunk => output.push(String(chunk)));
    runner.stderr?.on('data', chunk => output.push(String(chunk)));
    let ready: FixtureReadyState | undefined;

    try {
      const readyState = await waitFor<FixtureReadyState>(() => {
        if (!existsSync(readyPath)) {
          return undefined;
        }
        return JSON.parse(readFileSync(readyPath, 'utf8')) as FixtureReadyState;
      }, 'fixture readiness');
      ready = readyState;
      const initialHeartbeatSize = statSync(readyState.heartbeatPath).size;
      await waitFor(
        () => (statSync(readyState.heartbeatPath).size > initialHeartbeatSize ? true : undefined),
        'the grandchild heartbeat',
      );
      expect(isProcessRunning(readyState.grandchildPid)).toBe(true);

      const exitPromise = waitForExit(runner, 10_000);
      if (process.platform === 'win32') {
        runner.send('SIGTERM');
      } else {
        expect(runner.kill('SIGTERM')).toBe(true);
      }
      const exit = await exitPromise;

      if (process.platform !== 'win32') {
        expect(exit).toEqual({ code: null, signal: 'SIGTERM' });
      } else {
        expect(exit.code !== 0 || exit.signal === 'SIGTERM').toBe(true);
      }
      expect(existsSync(cleanupMarkerPath), output.join('')).toBe(true);
      expect(existsSync(readyState.temporaryRoot), output.join('')).toBe(false);
      await waitFor(
        () => (isProcessRunning(readyState.grandchildPid) ? undefined : true),
        'the fixture grandchild to exit',
      );

      await delay(150);
      const stoppedHeartbeatSize = statSync(readyState.heartbeatPath).size;
      await delay(200);
      expect(statSync(readyState.heartbeatPath).size).toBe(stoppedHeartbeatSize);
    } finally {
      await forceFixtureCleanup(runner, controlDirectory, ready?.grandchildPid);
      await rm(controlDirectory, {
        force: true,
        maxRetries: 3,
        recursive: true,
        retryDelay: 25,
      });
    }
  });

  it('keeps Windows tree termination bounded and force-capable', async () => {
    const source = await readFile(
      resolve(root, 'packages/editor/tests/helpers/processLifecycle.mjs'),
      'utf8',
    );

    expect(source).toContain("spawn('taskkill', args");
    expect(source).toContain("const args = ['/PID', String(pid), '/T', ...(force ? ['/F'] : [])]");
    expect(source).toContain('taskkillTimeoutMs');
    expect(source).toContain('await runTaskkill(child.pid, true)');
  });
});
