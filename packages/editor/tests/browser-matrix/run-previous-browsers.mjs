import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createProcessLifecycle } from '../helpers/processLifecycle.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = resolve(HERE, '../../../..');
const ROOT_E2E = join(WORKSPACE, 'e2e');
const MATRIX_DEFINITIONS = [
  {
    id: 'previous-release',
    fixture: join(HERE, 'fixture'),
    playwrightVersion: '1.60.0',
    cachedModulesEnvironment: 'TELLPLOT_PREVIOUS_MODULES_DIR',
    projects: [
      {
        name: 'previous-chromium',
        engine: 'chromium',
        device: 'Desktop Chrome',
        revision: '1223',
        version: '148.0.7778.96',
      },
      {
        name: 'previous-firefox',
        engine: 'firefox',
        device: 'Desktop Firefox',
        revision: '1522',
        version: '150.0.2',
      },
      {
        name: 'previous-webkit',
        engine: 'webkit',
        device: 'Desktop Safari',
        revision: '2287',
        version: '26.4',
      },
    ],
  },
  {
    id: 'webkit-previous-major',
    fixture: join(HERE, 'webkit-previous-major-fixture'),
    playwrightVersion: '1.52.0',
    cachedModulesEnvironment: 'TELLPLOT_WEBKIT_PREVIOUS_MAJOR_MODULES_DIR',
    projects: [
      {
        name: 'previous-major-webkit',
        engine: 'webkit',
        device: 'Desktop Safari',
        revision: '2158',
        version: '18.4',
      },
    ],
  },
];
const collectOnly = process.argv.includes('--collect-only');
const lifecycle = createProcessLifecycle('previous-browser-matrix');

function displayCommand(command, args, cwd, matrixId) {
  const location = relative(WORKSPACE, cwd) || '.';
  const scope = matrixId === undefined ? location : `${matrixId}:${location}`;
  console.log(`\n[previous-browser-matrix:${scope}] $ ${command} ${args.join(' ')}`);
}

async function run(command, args, options) {
  displayCommand(command, args, options.cwd, options.matrixId);
  await new Promise((resolvePromise, rejectPromise) => {
    let timedOut = false;
    const processGroup = process.platform !== 'win32';
    const child = lifecycle.trackProcess(
      spawn(command, args, {
        cwd: options.cwd,
        detached: processGroup,
        env: options.env ?? process.env,
        stdio: 'inherit',
      }),
      processGroup,
    );
    const timeout =
      options.timeoutMs === undefined
        ? undefined
        : setTimeout(() => {
            timedOut = true;
            void lifecycle.stopProcess(child, processGroup).catch(rejectPromise);
          }, options.timeoutMs);
    child.once('error', error => {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
      rejectPromise(error);
    });
    child.once('exit', (code, signal) => {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
      if (timedOut) {
        rejectPromise(
          new Error(`${command} exceeded the ${String(options.timeoutMs)}ms command timeout`),
        );
        return;
      }
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(
        new Error(
          `${command} exited with ${code === null ? `signal ${signal ?? 'unknown'}` : `code ${code}`}`,
        ),
      );
    });
  });
}

async function availablePort() {
  const server = createServer();
  await new Promise((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise);
    server.listen(0, '127.0.0.1', resolvePromise);
  });
  const address = server.address();
  assert.notEqual(address, null);
  assert.notEqual(typeof address, 'string');
  const port = address.port;
  await new Promise((resolvePromise, rejectPromise) => {
    server.close(error => (error === undefined ? resolvePromise() : rejectPromise(error)));
  });
  return port;
}

async function waitForPreview(url, child) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    lifecycle.throwIfTerminationRequested();
    if (child.exitCode !== null) {
      throw new Error(`Vite preview exited before becoming ready: ${child.exitCode}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // The preview may not have bound its port yet.
    }
    await new Promise(resolvePromise => setTimeout(resolvePromise, 100));
  }
  throw new Error(`Vite preview did not become ready at ${url}`);
}

async function copyFixture(matrix, directory) {
  await mkdir(directory);
  await cp(join(matrix.fixture, 'package.json'), join(directory, 'package.json'));
  await cp(join(matrix.fixture, 'pnpm-lock.yaml'), join(directory, 'pnpm-lock.yaml'));
  const testDirectory = join(directory, 'e2e');
  const sourceFiles = await readdir(ROOT_E2E, { recursive: true });
  const specs = sourceFiles
    .filter(name => name.endsWith('.spec.ts') && !name.endsWith('performance.spec.ts'))
    .sort();
  assert.ok(specs.length > 0, 'Previous-browser matrix requires root E2E specs');
  await cp(ROOT_E2E, testDirectory, {
    recursive: true,
    filter: source => !relative(ROOT_E2E, source).endsWith('performance.spec.ts'),
  });
  return specs;
}

async function writeConfig(matrix, directory) {
  const projects = matrix.projects
    .map(project => `    { name: '${project.name}', use: { ...devices['${project.device}'] } },`)
    .join('\n');
  const config = `import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.TELLPLOT_PREVIOUS_BASE_URL ?? 'http://127.0.0.1:4174';
const retryDiagnostics = process.env.CI ? 'on-first-retry' : 'off';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: retryDiagnostics,
    video: retryDiagnostics,
  },
  projects: [
${projects}
  ],
  outputDir: './test-results',
});
`;
  await writeFile(join(directory, 'playwright.config.mjs'), config, 'utf8');
  const probe = `import assert from 'node:assert/strict';
import { chromium, firefox, webkit } from '@playwright/test';

const engine = process.env.TELLPLOT_BROWSER_ENGINE;
const expectedVersion = process.env.TELLPLOT_BROWSER_VERSION;
const browserType = { chromium, firefox, webkit }[engine];
assert.notEqual(browserType, undefined, \`\${engine} browser type must exist\`);
const browser = await browserType.launch();
try {
  const actualVersion = browser.version();
  assert.equal(actualVersion, expectedVersion, \`\${engine} runtime version must match\`);
  console.log(\`\${engine} runtime \${actualVersion}\`);
} finally {
  await browser.close();
}
`;
  await writeFile(join(directory, 'browser-version-probe.mjs'), probe, 'utf8');
}

async function installedVersion(directory, packageName) {
  const manifestPath = join(directory, 'node_modules', ...packageName.split('/'), 'package.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  return manifest.version;
}

async function resolvedPlaywrightManifests(directory) {
  const testManifest = await realpath(
    join(directory, 'node_modules/@playwright/test/package.json'),
  );
  const testRequire = createRequire(testManifest);
  const playwrightManifest = testRequire.resolve('playwright/package.json');
  const playwrightRequire = createRequire(playwrightManifest);
  const coreManifest = playwrightRequire.resolve('playwright-core/package.json');
  return {
    playwright: JSON.parse(await readFile(playwrightManifest, 'utf8')),
    playwrightCore: JSON.parse(await readFile(coreManifest, 'utf8')),
    playwrightCoreDirectory: dirname(coreManifest),
  };
}

async function linkCachedModules(matrix, directory, cachedModules) {
  assert.equal(
    collectOnly,
    true,
    `${matrix.cachedModulesEnvironment} is a local collect-only escape hatch, not a release gate`,
  );
  const modules = join(directory, 'node_modules');
  await mkdir(join(modules, '@playwright'), { recursive: true });
  await mkdir(join(modules, '@axe-core'), { recursive: true });
  const links = [
    [join(cachedModules, '@playwright/test'), join(modules, '@playwright/test')],
    [join(WORKSPACE, 'node_modules/@axe-core/playwright'), join(modules, '@axe-core/playwright')],
    [join(WORKSPACE, 'node_modules/axe-core'), join(modules, 'axe-core')],
  ];
  for (const [source, destination] of links) {
    await symlink(source, destination);
  }
  console.log(
    `[previous-browser-matrix:${matrix.id}] using cached modules for offline collection: ${cachedModules}`,
  );
}

async function installFixture(matrix, directory) {
  const cachedModules = process.env[matrix.cachedModulesEnvironment];
  if (cachedModules !== undefined && cachedModules.trim().length > 0) {
    await linkCachedModules(matrix, directory, cachedModules);
    return;
  }
  const installArgs = [
    'install',
    '--ignore-workspace',
    '--frozen-lockfile',
    '--strict-peer-dependencies',
  ];
  const matrixStore = process.env.TELLPLOT_PREVIOUS_MATRIX_STORE_DIR;
  if (matrixStore !== undefined && matrixStore.trim().length > 0) {
    installArgs.push('--store-dir', matrixStore);
  }
  await run('pnpm', installArgs, { cwd: directory, matrixId: matrix.id });
}

async function verifyBrowserMetadata(matrix, directory) {
  assert.equal(await installedVersion(directory, '@playwright/test'), matrix.playwrightVersion);
  const manifests = await resolvedPlaywrightManifests(directory);
  assert.equal(manifests.playwright.version, matrix.playwrightVersion);
  assert.equal(manifests.playwrightCore.version, matrix.playwrightVersion);
  const metadata = JSON.parse(
    await readFile(join(manifests.playwrightCoreDirectory, 'browsers.json'), 'utf8'),
  );
  for (const project of matrix.projects) {
    const browser = metadata.browsers.find(candidate => candidate.name === project.engine);
    assert.notEqual(browser, undefined, `Playwright metadata must include ${project.engine}`);
    assert.equal(browser.revision, project.revision, `${project.engine} revision must stay pinned`);
    assert.equal(
      browser.browserVersion,
      project.version,
      `${project.engine} version must stay pinned`,
    );
  }
  const versions = matrix.projects
    .map(project => `${project.engine} ${project.version} (${project.revision})`)
    .join(', ');
  console.log(
    `[previous-browser-matrix:${matrix.id}] Playwright ${matrix.playwrightVersion} metadata: ${versions}`,
  );
}

async function playwrightCommand(matrix, directory, args, options = {}) {
  await run(process.execPath, ['node_modules/@playwright/test/cli.js', ...args], {
    cwd: directory,
    env: options.env ?? process.env,
    matrixId: matrix.id,
    timeoutMs: options.timeoutMs,
  });
}

async function installBrowsers(matrix, directory) {
  const engines = [...new Set(matrix.projects.map(project => project.engine))];
  const installArgs = ['install'];
  if (process.platform === 'linux') {
    installArgs.push('--with-deps');
  }
  installArgs.push(...engines);
  await playwrightCommand(matrix, directory, installArgs, { timeoutMs: 10 * 60_000 });
}

async function verifyLaunchedBrowserVersions(matrix, directory) {
  for (const project of matrix.projects) {
    await run(process.execPath, ['browser-version-probe.mjs'], {
      cwd: directory,
      env: {
        ...process.env,
        TELLPLOT_BROWSER_ENGINE: project.engine,
        TELLPLOT_BROWSER_VERSION: project.version,
      },
      matrixId: `${matrix.id}:${project.engine}`,
      timeoutMs: 60_000,
    });
  }
}

async function preserveDiagnostics(matrix, directory) {
  const source = join(directory, 'test-results');
  const destination = join(WORKSPACE, 'test-results', 'previous-browser-matrix', matrix.id);
  try {
    await rm(destination, { force: true, recursive: true });
    await mkdir(dirname(destination), { recursive: true });
    await cp(source, destination, { recursive: true });
    console.log(`[previous-browser-matrix] preserved failure diagnostics at ${destination}`);
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function assertProjectNodeRuntime() {
  const expectedVersion = (await readFile(join(WORKSPACE, '.nvmrc'), 'utf8')).trim();
  assert.equal(
    process.versions.node,
    expectedVersion,
    `Playwright 1.52.0 compatibility tests require the project Node runtime from .nvmrc (${expectedVersion}); current runtime is ${process.versions.node}. Run \`nvm use\` before this command.`,
  );
}

async function prepareMatrix(matrix, temporaryRoot) {
  const directory = join(temporaryRoot, matrix.id);
  const specs = await copyFixture(matrix, directory);
  lifecycle.throwIfTerminationRequested();
  await writeConfig(matrix, directory);
  lifecycle.throwIfTerminationRequested();
  await installFixture(matrix, directory);
  lifecycle.throwIfTerminationRequested();
  await verifyBrowserMetadata(matrix, directory);
  lifecycle.throwIfTerminationRequested();
  return { directory, matrix, specs };
}

async function main() {
  await assertProjectNodeRuntime();
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'tellplot-previous-browser-matrix-'));
  const preparedMatrices = [];
  let preview;
  let cleanupPromise;
  const cleanup = () =>
    (cleanupPromise ??= (async () => {
      try {
        await lifecycle.stopActiveProcesses();
      } finally {
        await rm(temporaryRoot, {
          force: true,
          maxRetries: 5,
          recursive: true,
          retryDelay: 100,
        });
      }
    })());
  lifecycle.installSignalCleanup();
  try {
    for (const matrix of MATRIX_DEFINITIONS) {
      preparedMatrices.push(await prepareMatrix(matrix, temporaryRoot));
      lifecycle.throwIfTerminationRequested();
    }

    if (collectOnly) {
      for (const prepared of preparedMatrices) {
        await playwrightCommand(prepared.matrix, prepared.directory, [
          'test',
          '--config=playwright.config.mjs',
          '--list',
        ]);
        lifecycle.throwIfTerminationRequested();
        console.log(
          `[previous-browser-matrix:${prepared.matrix.id}] collected ${prepared.specs.length} non-performance specs with Playwright ${prepared.matrix.playwrightVersion}`,
        );
      }
      return;
    }

    if (process.env.TELLPLOT_PREVIOUS_SKIP_BROWSER_INSTALL !== '1') {
      for (const prepared of preparedMatrices) {
        await installBrowsers(prepared.matrix, prepared.directory);
        lifecycle.throwIfTerminationRequested();
      }
    }
    for (const prepared of preparedMatrices) {
      await verifyLaunchedBrowserVersions(prepared.matrix, prepared.directory);
      lifecycle.throwIfTerminationRequested();
    }
    await run('pnpm', ['build'], { cwd: WORKSPACE });
    lifecycle.throwIfTerminationRequested();

    const port = await availablePort();
    lifecycle.throwIfTerminationRequested();
    const baseURL = `http://127.0.0.1:${port}`;
    const previewProcessGroup = process.platform !== 'win32';
    preview = lifecycle.trackProcess(
      spawn(
        'pnpm',
        [
          '--filter',
          '@tellplot/playground',
          'exec',
          'vite',
          'preview',
          '--host',
          '127.0.0.1',
          '--port',
          String(port),
          '--strictPort',
        ],
        {
          cwd: WORKSPACE,
          detached: previewProcessGroup,
          env: process.env,
          stdio: 'inherit',
        },
      ),
      previewProcessGroup,
    );
    await waitForPreview(baseURL, preview);
    for (const prepared of preparedMatrices) {
      await playwrightCommand(
        prepared.matrix,
        prepared.directory,
        ['test', '--config=playwright.config.mjs'],
        { env: { ...process.env, TELLPLOT_PREVIOUS_BASE_URL: baseURL } },
      );
      lifecycle.throwIfTerminationRequested();
    }
  } catch (error) {
    if (lifecycle.receivedSignal === undefined) {
      for (const prepared of preparedMatrices) {
        await preserveDiagnostics(prepared.matrix, prepared.directory);
      }
      throw error;
    }
  } finally {
    try {
      await cleanup();
    } finally {
      lifecycle.finishCleanup();
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
