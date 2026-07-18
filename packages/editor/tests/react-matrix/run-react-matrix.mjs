import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = resolve(HERE, '../../../..');
const EDITOR_PACKAGE = join(WORKSPACE, 'packages/editor');
const CONSUMER_TEMPLATE = join(HERE, 'consumer');
const VITE_VERSION = '8.1.4';
const G2_VERSION = '5.4.8';
const REACT_MATRIX = [
  { id: 'react-18', react: '18.3.1', reactDom: '18.3.1' },
  { id: 'react-19', react: '19.2.7', reactDom: '19.2.7' },
];

function displayCommand(command, args, cwd) {
  const location = relative(WORKSPACE, cwd) || '.';
  console.log(`\n[react-matrix:${location}] $ ${command} ${args.join(' ')}`);
}

async function run(command, args, options) {
  displayCommand(command, args, options.cwd);
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: 'inherit',
    });
    child.once('error', rejectPromise);
    child.once('exit', (code, signal) => {
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

async function installedVersion(directory, packageName) {
  const manifestPath = join(directory, 'node_modules', ...packageName.split('/'), 'package.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  return manifest.version;
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
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(
        `Vite preview exited before becoming ready: ${child.exitCode ?? child.signalCode}`,
      );
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

async function stopProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  const signalTree = signal => {
    try {
      if (process.platform !== 'win32' && child.pid !== undefined) {
        process.kill(-child.pid, signal);
      } else {
        child.kill(signal);
      }
    } catch (error) {
      if (error?.code !== 'ESRCH') {
        throw error;
      }
    }
  };
  const waitForExit = timeoutMs => {
    if (child.exitCode !== null || child.signalCode !== null) {
      return Promise.resolve('exit');
    }
    return Promise.race([
      new Promise(resolvePromise => child.once('exit', () => resolvePromise('exit'))),
      new Promise(resolvePromise => setTimeout(resolvePromise, timeoutMs, 'timeout')),
    ]);
  };
  signalTree('SIGTERM');
  if (
    (await waitForExit(5_000)) === 'timeout' &&
    child.exitCode === null &&
    child.signalCode === null
  ) {
    signalTree('SIGKILL');
    await waitForExit(2_000);
  }
}

async function paintedPixelCount(canvas) {
  return canvas.evaluate(element => {
    if (!(element instanceof HTMLCanvasElement)) {
      return 0;
    }
    const context = element.getContext('2d');
    if (context === null || element.width === 0 || element.height === 0) {
      return 0;
    }
    const pixels = context.getImageData(0, 0, element.width, element.height).data;
    let painted = 0;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      const red = pixels[offset] ?? 255;
      const green = pixels[offset + 1] ?? 255;
      const blue = pixels[offset + 2] ?? 255;
      const alpha = pixels[offset + 3] ?? 0;
      if (alpha > 20 && (red < 242 || green < 242 || blue < 242)) {
        painted += 1;
      }
    }
    return painted;
  });
}

async function verifyConsumer(browser, consumer, directory) {
  const port = await availablePort();
  const url = `http://127.0.0.1:${port}`;
  const preview = spawn(
    'pnpm',
    ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      cwd: directory,
      detached: process.platform !== 'win32',
      env: process.env,
      stdio: 'inherit',
    },
  );
  try {
    await waitForPreview(url, preview);
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const runtimeErrors = [];
    page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
    page.on('console', message => {
      if (message.type() === 'error') {
        runtimeErrors.push(`console: ${message.text()}`);
      }
    });

    try {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(url);
      const editor = page.locator('[data-tellplot="editor"][data-editor-state="ready"]');
      await editor.waitFor({ state: 'visible', timeout: 30_000 });
      const canvas = page.locator('[data-testid="tellplot-chart"] canvas').first();
      await canvas.waitFor({ state: 'visible', timeout: 30_000 });

      const deadline = Date.now() + 30_000;
      let painted = 0;
      let previousPainted = -1;
      let stableSamples = 0;
      while (stableSamples < 2 && Date.now() < deadline) {
        painted = await paintedPixelCount(canvas);
        stableSamples = painted > 500 && painted === previousPainted ? stableSamples + 1 : 0;
        previousPainted = painted;
        await page.waitForTimeout(100);
      }
      assert.ok(painted > 500, `${consumer.id} must paint a nonblank G2 canvas`);
      assert.equal(stableSamples, 2, `${consumer.id} canvas must settle before matrix acceptance`);

      const runtime = await page.evaluate(() => {
        const matrix = globalThis.__tellplotReactMatrix;
        const editorElement = document.querySelector('.tp-editor');
        if (matrix === undefined || !(editorElement instanceof HTMLElement)) {
          return null;
        }
        const style = getComputedStyle(editorElement);
        return {
          reactVersion: matrix.reactVersion,
          boxSizing: style.boxSizing,
          display: style.display,
          background: style.backgroundColor,
          accent: style.getPropertyValue('--tp-accent').trim(),
        };
      });
      assert.notEqual(runtime, null, `${consumer.id} runtime probe must exist`);
      assert.equal(runtime.reactVersion, consumer.react);
      assert.equal(runtime.boxSizing, 'border-box');
      assert.equal(runtime.display, 'grid');
      assert.equal(runtime.background, 'rgb(243, 245, 244)');
      assert.equal(runtime.accent.toLowerCase(), '#126e57');

      await page.evaluate(() => globalThis.__tellplotReactMatrix?.unmount());
      await page.locator('#root[data-unmounted="true"]').waitFor({ state: 'attached' });
      assert.equal(await page.locator('[data-tellplot="editor"]').count(), 0);
      await page.waitForTimeout(50);
      assert.deepEqual(runtimeErrors, []);
      console.log(
        `[react-matrix:${consumer.id}] React ${runtime.reactVersion}, painted pixels ${painted}, clean unmount`,
      );
    } finally {
      await page.close();
    }
  } finally {
    await stopProcess(preview);
  }
}

async function main() {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'tellplot-react-matrix-'));
  let browser;
  try {
    const sourceManifest = JSON.parse(await readFile(join(EDITOR_PACKAGE, 'package.json'), 'utf8'));
    await run('pnpm', ['--filter', '@tellplot/editor', 'build'], { cwd: WORKSPACE });
    const packDirectory = join(temporaryRoot, 'package');
    await mkdir(packDirectory);
    await run('pnpm', ['pack', '--pack-destination', packDirectory], { cwd: EDITOR_PACKAGE });
    const archives = (await readdir(packDirectory)).filter(name => name.endsWith('.tgz'));
    assert.deepEqual(archives.length, 1, 'React matrix requires exactly one packed editor archive');
    const archive = join(packDirectory, archives[0]);

    browser = await chromium.launch();
    for (const consumer of REACT_MATRIX) {
      const directory = join(temporaryRoot, consumer.id);
      await cp(CONSUMER_TEMPLATE, directory, { recursive: true });
      await writeFile(
        join(directory, 'package.json'),
        `${JSON.stringify(
          {
            name: `tellplot-${consumer.id}-consumer`,
            private: true,
            type: 'module',
            scripts: { build: 'vite build' },
            dependencies: {
              '@antv/g2': G2_VERSION,
              '@tellplot/editor': `file:${archive}`,
              react: consumer.react,
              'react-dom': consumer.reactDom,
            },
            devDependencies: { vite: VITE_VERSION },
          },
          null,
          2,
        )}\n`,
        'utf8',
      );
      const installArgs = [
        'install',
        '--ignore-workspace',
        '--no-frozen-lockfile',
        '--strict-peer-dependencies',
      ];
      const matrixStore = process.env['TELLPLOT_MATRIX_STORE_DIR'];
      if (matrixStore !== undefined && matrixStore.trim().length > 0) {
        installArgs.push('--store-dir', matrixStore);
      }
      await run('pnpm', installArgs, { cwd: directory });
      assert.equal(await installedVersion(directory, 'react'), consumer.react);
      assert.equal(await installedVersion(directory, 'react-dom'), consumer.reactDom);
      assert.equal(await installedVersion(directory, '@antv/g2'), G2_VERSION);
      const installedManifest = JSON.parse(
        await readFile(join(directory, 'node_modules/@tellplot/editor/package.json'), 'utf8'),
      );
      assert.equal(installedManifest.name, '@tellplot/editor');
      assert.equal(installedManifest.version, sourceManifest.version);
      assert.equal(installedManifest.exports?.['./styles.css'], './dist/styles.css');
      await run('pnpm', ['run', 'build'], { cwd: directory });
      await verifyConsumer(browser, consumer, directory);
    }
  } finally {
    await browser?.close();
    await rm(temporaryRoot, { force: true, recursive: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
