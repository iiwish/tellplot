import { spawn } from 'node:child_process';

const DEFAULT_GRACEFUL_TIMEOUT_MS = 5_000;
const DEFAULT_FORCE_TIMEOUT_MS = 5_000;
const DEFAULT_TASKKILL_TIMEOUT_MS = 5_000;
const PROCESS_GROUP_POLL_INTERVAL_MS = 25;

function validateTimeout(value, name) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
  return value;
}

export function createProcessLifecycle(label, options = {}) {
  const gracefulTimeoutMs = validateTimeout(
    options.gracefulTimeoutMs ?? DEFAULT_GRACEFUL_TIMEOUT_MS,
    'gracefulTimeoutMs',
  );
  const forceTimeoutMs = validateTimeout(
    options.forceTimeoutMs ?? DEFAULT_FORCE_TIMEOUT_MS,
    'forceTimeoutMs',
  );
  const taskkillTimeoutMs = validateTimeout(
    options.taskkillTimeoutMs ?? DEFAULT_TASKKILL_TIMEOUT_MS,
    'taskkillTimeoutMs',
  );
  const activeProcesses = new Map();
  const processStops = new WeakMap();
  let cleanupFinished = false;
  let listenersInstalled = false;
  let receivedSignal;
  let resolveCleanupCompleted;
  const cleanupCompleted = new Promise(resolvePromise => {
    resolveCleanupCompleted = resolvePromise;
  });

  const removeSignalListeners = () => {
    if (!listenersInstalled) {
      return;
    }
    listenersInstalled = false;
    process.removeListener('SIGINT', handleSigint);
    process.removeListener('SIGTERM', handleSigterm);
  };

  const signalProcess = (child, processGroup, signal) => {
    if (processGroup && child.pid !== undefined) {
      try {
        process.kill(-child.pid, signal);
      } catch (error) {
        if (error?.code !== 'ESRCH') {
          throw error;
        }
      }
      return;
    }
    child.kill(signal);
  };

  const isProcessGroupAlive = processGroupId => {
    try {
      process.kill(-processGroupId, 0);
      return true;
    } catch (error) {
      if (error?.code === 'ESRCH') {
        return false;
      }
      if (error?.code === 'EPERM') {
        return true;
      }
      throw error;
    }
  };

  const hasStopped = (child, processGroup) => {
    if (processGroup && child.pid !== undefined) {
      return !isProcessGroupAlive(child.pid);
    }
    return child.exitCode !== null || child.signalCode !== null;
  };

  const waitForStopped = (child, processGroup, timeoutMs) => {
    if (hasStopped(child, processGroup)) {
      return Promise.resolve(true);
    }

    return new Promise((resolvePromise, rejectPromise) => {
      const deadline = Date.now() + timeoutMs;
      let timeout;
      const finish = stopped => {
        if (timeout !== undefined) {
          clearTimeout(timeout);
        }
        resolvePromise(stopped);
      };
      const poll = () => {
        try {
          if (hasStopped(child, processGroup)) {
            finish(true);
            return;
          }
        } catch (error) {
          if (timeout !== undefined) {
            clearTimeout(timeout);
          }
          rejectPromise(error);
          return;
        }
        const remainingMs = deadline - Date.now();
        if (remainingMs <= 0) {
          finish(false);
          return;
        }
        timeout = setTimeout(poll, Math.min(PROCESS_GROUP_POLL_INTERVAL_MS, remainingMs));
      };
      poll();
    });
  };

  const runTaskkill = (pid, force) =>
    new Promise((resolvePromise, rejectPromise) => {
      let settled = false;
      let timeout;
      const args = ['/PID', String(pid), '/T', ...(force ? ['/F'] : [])];
      const taskkill = spawn('taskkill', args, {
        stdio: 'ignore',
        windowsHide: true,
      });
      const finish = result => {
        if (settled) {
          return;
        }
        settled = true;
        if (timeout !== undefined) {
          clearTimeout(timeout);
        }
        resolvePromise(result);
      };
      timeout = setTimeout(() => {
        taskkill.kill('SIGKILL');
        taskkill.unref();
        finish({ code: null, timedOut: true });
      }, taskkillTimeoutMs);
      taskkill.once('error', error => {
        if (settled) {
          return;
        }
        settled = true;
        if (timeout !== undefined) {
          clearTimeout(timeout);
        }
        rejectPromise(error);
      });
      taskkill.once('close', code => finish({ code, timedOut: false }));
    });

  const stopWindowsProcessTree = async child => {
    if (child.pid === undefined) {
      child.kill('SIGTERM');
      if (!(await waitForStopped(child, false, gracefulTimeoutMs))) {
        child.kill('SIGKILL');
        if (!(await waitForStopped(child, false, forceTimeoutMs))) {
          throw new Error(`${label} process did not stop after forced termination`);
        }
      }
      return;
    }

    const gracefulResult = await runTaskkill(child.pid, false);
    const gracefulExit =
      !gracefulResult.timedOut && (await waitForStopped(child, false, gracefulTimeoutMs));
    if (gracefulExit) {
      return;
    }

    const forcedResult = await runTaskkill(child.pid, true);
    const forcedExit =
      !forcedResult.timedOut && (await waitForStopped(child, false, forceTimeoutMs));
    if (!forcedExit) {
      const reason = forcedResult.timedOut
        ? 'taskkill /F timed out'
        : `taskkill /F exited with code ${String(forcedResult.code)}`;
      throw new Error(`${label} process tree did not stop: ${reason}`);
    }
  };

  const stopProcess = async (child, requestedProcessGroup) => {
    if (child === undefined) {
      return;
    }
    const activeStop = processStops.get(child);
    if (activeStop !== undefined) {
      await activeStop;
      return;
    }
    const processGroup =
      requestedProcessGroup ?? activeProcesses.get(child) ?? process.platform !== 'win32';
    if (
      (process.platform === 'win32' || !processGroup || child.pid === undefined) &&
      (child.exitCode !== null || child.signalCode !== null)
    ) {
      return;
    }
    if (
      process.platform !== 'win32' &&
      processGroup &&
      child.pid !== undefined &&
      !isProcessGroupAlive(child.pid)
    ) {
      return;
    }
    const stop = (async () => {
      if (process.platform === 'win32') {
        await stopWindowsProcessTree(child);
        return;
      }
      signalProcess(child, processGroup, 'SIGTERM');
      if (!(await waitForStopped(child, processGroup, gracefulTimeoutMs))) {
        signalProcess(child, processGroup, 'SIGKILL');
        if (!(await waitForStopped(child, processGroup, forceTimeoutMs))) {
          throw new Error(`${label} process group did not stop after SIGKILL`);
        }
      }
    })();
    processStops.set(child, stop);
    try {
      await stop;
    } finally {
      processStops.delete(child);
    }
  };

  const stopActiveProcesses = async () => {
    const results = await Promise.allSettled(
      [...activeProcesses].map(([child, processGroup]) => stopProcess(child, processGroup)),
    );
    const failures = results.flatMap(result =>
      result.status === 'rejected' ? [result.reason] : [],
    );
    if (failures.length > 0) {
      throw new AggregateError(failures, `${label} could not stop every active process`);
    }
  };

  const trackProcess = (child, processGroup = process.platform !== 'win32') => {
    activeProcesses.set(child, processGroup);
    const release = () => activeProcesses.delete(child);
    child.once('error', release);
    child.once('exit', release);
    return child;
  };

  const throwIfTerminationRequested = () => {
    if (receivedSignal !== undefined) {
      throw new Error(`${label} received ${receivedSignal}`);
    }
  };

  const handleSignal = signal => {
    if (receivedSignal !== undefined) {
      return;
    }
    receivedSignal = signal;
    const signalProcessCleanup = stopActiveProcesses().catch(error => {
      console.error(`${label} process cleanup failed after ${signal}:`, error);
    });
    void Promise.allSettled([signalProcessCleanup, cleanupCompleted]).then(() => {
      removeSignalListeners();
      try {
        process.kill(process.pid, signal);
      } catch {
        process.exitCode = signal === 'SIGINT' ? 130 : 143;
      }
    });
  };
  const handleSigint = () => handleSignal('SIGINT');
  const handleSigterm = () => handleSignal('SIGTERM');

  return {
    finishCleanup() {
      if (cleanupFinished) {
        return;
      }
      cleanupFinished = true;
      removeSignalListeners();
      resolveCleanupCompleted();
    },
    get receivedSignal() {
      return receivedSignal;
    },
    installSignalCleanup() {
      if (listenersInstalled) {
        return;
      }
      listenersInstalled = true;
      process.once('SIGINT', handleSigint);
      process.once('SIGTERM', handleSigterm);
    },
    stopActiveProcesses,
    stopProcess,
    throwIfTerminationRequested,
    trackProcess,
  };
}
