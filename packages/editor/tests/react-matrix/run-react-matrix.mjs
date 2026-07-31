import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

import { createProcessLifecycle } from '../helpers/processLifecycle.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = resolve(HERE, '../../../..');
const PACKAGE_DIRECTORIES = ['core', 'editor', 'react', 'vue'];
const REACT_CONSUMER_TEMPLATE = join(HERE, 'consumer');
const VUE_CONSUMER_TEMPLATE = join(HERE, 'vue-consumer');
const IMPERATIVE_CONSUMER_TEMPLATE = join(HERE, 'imperative-consumer');
const VITE_VERSION = '8.1.4';
const ROLLDOWN_VERSION = '1.1.5';
const NAPI_WASM_RUNTIME_VERSION = '1.1.6';
const G2_VERSION = '5.4.8';
const lifecycle = createProcessLifecycle('framework-matrix');
const FRAMEWORK_MATRIX = [
  {
    id: 'imperative-dom',
    framework: 'Imperative DOM',
    frameworkVersion: 'imperative',
    template: IMPERATIVE_CONSUMER_TEMPLATE,
    adapterName: undefined,
    dependencies: {},
  },
  {
    id: 'react-18',
    framework: 'React',
    frameworkVersion: '18.3.1',
    template: REACT_CONSUMER_TEMPLATE,
    adapterName: '@tellplot/react',
    dependencies: { react: '18.3.1', 'react-dom': '18.3.1' },
  },
  {
    id: 'react-19',
    framework: 'React',
    frameworkVersion: '19.2.7',
    template: REACT_CONSUMER_TEMPLATE,
    adapterName: '@tellplot/react',
    dependencies: { react: '19.2.7', 'react-dom': '19.2.7' },
  },
  {
    id: 'vue-3',
    framework: 'Vue',
    frameworkVersion: '3.5.27',
    template: VUE_CONSUMER_TEMPLATE,
    adapterName: '@tellplot/vue',
    dependencies: { vue: '3.5.27' },
  },
];
const VITE_CONFIG = `import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'g2-runtime',
              test: /node_modules[\\\\/]@antv[\\\\/]g2[\\\\/]/,
              priority: 10,
              minSize: 96 * 1024,
              maxSize: 1_300 * 1024,
            },
          ],
        },
      },
    },
  },
});
`;

function displayCommand(command, args, cwd) {
  const location = relative(WORKSPACE, cwd) || '.';
  console.log(`\n[framework-matrix:${location}] $ ${command} ${args.join(' ')}`);
}

async function run(command, args, options) {
  displayCommand(command, args, options.cwd);
  await new Promise((resolvePromise, rejectPromise) => {
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

async function packageInstalled(directory, packageName) {
  try {
    await installedVersion(directory, packageName);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
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

async function canvasPixelSignature(canvas) {
  return canvas.evaluate(element => {
    if (!(element instanceof HTMLCanvasElement)) {
      return 0;
    }
    const context = element.getContext('2d');
    if (context === null || element.width === 0 || element.height === 0) {
      return 0;
    }
    const pixels = context.getImageData(0, 0, element.width, element.height).data;
    let signature = 2_166_136_261;
    for (let offset = 0; offset < pixels.length; offset += 16) {
      signature ^= pixels[offset] ?? 0;
      signature = Math.imul(signature, 16_777_619);
      signature ^= pixels[offset + 1] ?? 0;
      signature = Math.imul(signature, 16_777_619);
      signature ^= pixels[offset + 2] ?? 0;
      signature = Math.imul(signature, 16_777_619);
      signature ^= pixels[offset + 3] ?? 0;
      signature = Math.imul(signature, 16_777_619);
    }
    return signature >>> 0;
  });
}

async function svgSemantics(page, exported) {
  return page.evaluate(value => {
    const parsed = new DOMParser().parseFromString(value.svg, 'image/svg+xml');
    const svg = parsed.documentElement;
    const count = selector => svg.querySelectorAll(selector).length;
    return {
      mimeType: value.mimeType,
      suggestedFilename: value.suggestedFilename,
      width: value.width,
      height: value.height,
      rootName: svg.localName,
      rootWidth: svg.getAttribute('width'),
      rootHeight: svg.getAttribute('height'),
      viewBox: svg.getAttribute('viewBox'),
      elements: {
        circle: count('circle'),
        line: count('line'),
        path: count('path'),
        rect: count('rect'),
        text: count('text'),
      },
      text: Array.from(svg.querySelectorAll('text'))
        .map(element => element.textContent?.trim() ?? '')
        .filter(Boolean),
      unsafeElements: count('script, foreignObject, iframe, object, embed, image, use'),
      externalReferences: Array.from(svg.querySelectorAll('*')).filter(element =>
        Array.from(element.attributes).some(attribute =>
          /(?:https?:|javascript:|data:)/iu.test(attribute.value),
        ),
      ).length,
    };
  }, exported);
}

async function verifyConsumer(browser, consumer, directory) {
  const port = await availablePort();
  const url = `http://127.0.0.1:${port}`;
  const previewProcessGroup = process.platform !== 'win32';
  const preview = lifecycle.trackProcess(
    spawn(
      'pnpm',
      ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
      {
        cwd: directory,
        detached: previewProcessGroup,
        env: process.env,
        stdio: 'inherit',
      },
    ),
    previewProcessGroup,
  );
  try {
    await waitForPreview(url, preview);
    lifecycle.throwIfTerminationRequested();
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
        lifecycle.throwIfTerminationRequested();
        painted = await paintedPixelCount(canvas);
        stableSamples = painted > 500 && painted === previousPainted ? stableSamples + 1 : 0;
        previousPainted = painted;
        await page.waitForTimeout(100);
      }
      assert.ok(painted > 500, `${consumer.id} must paint a nonblank G2 canvas`);
      assert.equal(stableSamples, 2, `${consumer.id} canvas must settle before matrix acceptance`);

      const runtime = await page.evaluate(() => {
        const matrix = globalThis.__tellplotFrameworkMatrix;
        const editorElement = document.querySelector('.tp-editor');
        const adapterHost = document.querySelector('.tellplot-react-host, .tellplot-vue-host');
        if (matrix === undefined || !(editorElement instanceof HTMLElement)) {
          return null;
        }
        const style = getComputedStyle(editorElement);
        return {
          frameworkVersion: matrix.frameworkVersion,
          boxSizing: style.boxSizing,
          display: style.display,
          background: style.backgroundColor,
          accent: style.getPropertyValue('--tp-accent').trim(),
          editorHeight: editorElement.getBoundingClientRect().height,
          adapterHostHeight:
            adapterHost instanceof HTMLElement ? adapterHost.getBoundingClientRect().height : null,
        };
      });
      assert.notEqual(runtime, null, `${consumer.id} runtime probe must exist`);
      assert.equal(runtime.frameworkVersion, consumer.frameworkVersion);
      assert.equal(runtime.boxSizing, 'border-box');
      assert.equal(runtime.display, 'grid');
      assert.equal(runtime.background, 'rgb(243, 245, 244)');
      assert.equal(runtime.accent.toLowerCase(), '#126e57');
      assert.ok(runtime.editorHeight > 0, `${consumer.id} editor must have a visible height`);
      if (consumer.adapterName !== undefined) {
        assert.ok(
          runtime.adapterHostHeight >= runtime.editorHeight,
          `${consumer.id} adapter host must not collapse in an auto-sized flex/grid parent`,
        );
      }

      const defaultSignature = await canvasPixelSignature(canvas);
      await page.evaluate(() => globalThis.__tellplotFrameworkMatrix?.configure());
      await page.waitForFunction(
        () => document.querySelector('.tp-chart-stage__title')?.textContent === 'Configured bridge',
      );

      const configuredDeadline = Date.now() + 30_000;
      let configuredPainted = 0;
      let configuredSignature = defaultSignature;
      while (Date.now() < configuredDeadline) {
        lifecycle.throwIfTerminationRequested();
        configuredPainted = await paintedPixelCount(canvas);
        configuredSignature = await canvasPixelSignature(canvas);
        if (configuredPainted > 500 && configuredSignature !== defaultSignature) {
          break;
        }
        await page.waitForTimeout(100);
      }
      assert.ok(configuredPainted > 500, `${consumer.id} configured canvas must remain nonblank`);
      assert.notEqual(
        configuredSignature,
        defaultSignature,
        `${consumer.id} public appearance config must update the real G2 canvas`,
      );
      assert.equal(await page.locator('[data-tellplot="editor"]').count(), 1);

      const scenario = await page.evaluate(() =>
        globalThis.__tellplotFrameworkMatrix?.runScenario(),
      );
      assert.notEqual(scenario, null, `${consumer.id} shared scenario must return a result`);
      assert.notEqual(scenario, undefined, `${consumer.id} shared scenario must return a result`);
      assert.deepEqual(scenario.view, scenario.callbackView);
      assert.equal(scenario.view.datasetId, 'framework-matrix');
      assert.equal(scenario.view.revision, 1);
      assert.deepEqual(scenario.view.rootOrder, ['cost-pressure', 'sales-growth']);
      assert.deepEqual(scenario.command, {
        commandId: 'tp-keyboard-1',
        type: 'moveItem',
        source: 'keyboard',
        previousRevision: 0,
        nextRevision: 1,
        affectedNodeIds: ['sales-growth'],
        noOp: false,
      });
      assert.deepEqual(scenario.undoView, scenario.undoCallbackView);
      assert.equal(scenario.undoView.revision, 2);
      assert.deepEqual(scenario.undoView.rootOrder, ['sales-growth', 'cost-pressure']);
      assert.deepEqual(scenario.undoCommand, {
        commandId: 'tp-direct-2',
        type: 'undo',
        source: 'direct',
        previousRevision: 1,
        nextRevision: 2,
        affectedNodeIds: ['sales-growth'],
        noOp: false,
      });

      const exported = await page.evaluate(() => globalThis.__tellplotFrameworkMatrix?.exportSvg());
      assert.notEqual(exported, null, `${consumer.id} SVG export must return a result`);
      assert.notEqual(exported, undefined, `${consumer.id} SVG export must return a result`);
      const semantics = await svgSemantics(page, exported);
      assert.equal(semantics.mimeType, 'image/svg+xml');
      assert.equal(semantics.rootName, 'svg');
      assert.equal(semantics.unsafeElements, 0);
      assert.equal(semantics.externalReferences, 0);
      assert.ok(semantics.elements.path + semantics.elements.rect > 0);

      await page.evaluate(() => globalThis.__tellplotFrameworkMatrix?.unmount());
      await page.locator('#root[data-unmounted="true"]').waitFor({ state: 'attached' });
      assert.equal(await page.locator('[data-tellplot="editor"]').count(), 0);
      await page.waitForTimeout(50);
      assert.deepEqual(runtimeErrors, []);
      console.log(
        `[framework-matrix:${consumer.id}] ${consumer.framework} ${runtime.frameworkVersion}, controlled move ${scenario.view.revision}, undo ${scenario.undoView.revision}, SVG ${semantics.width}x${semantics.height}, clean unmount`,
      );
      return { scenario, semantics };
    } finally {
      await page.close();
    }
  } finally {
    await lifecycle.stopProcess(preview, previewProcessGroup);
  }
}

async function main() {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'tellplot-framework-matrix-'));
  let browser;
  let cleanupPromise;
  const cleanup = () =>
    (cleanupPromise ??= (async () => {
      try {
        await lifecycle.stopActiveProcesses();
      } finally {
        try {
          await browser?.close();
        } finally {
          await rm(temporaryRoot, {
            force: true,
            maxRetries: 5,
            recursive: true,
            retryDelay: 100,
          });
        }
      }
    })());
  lifecycle.installSignalCleanup();
  try {
    const packDirectory = join(temporaryRoot, 'package');
    await mkdir(packDirectory);
    lifecycle.throwIfTerminationRequested();
    const packedPackages = {};
    for (const packageDirectory of PACKAGE_DIRECTORIES) {
      const packageRoot = join(WORKSPACE, 'packages', packageDirectory);
      const sourceManifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
      await run('pnpm', ['build'], { cwd: packageRoot });
      await run('pnpm', ['pack', '--pack-destination', packDirectory], { cwd: packageRoot });
      lifecycle.throwIfTerminationRequested();
      const filename = `${sourceManifest.name
        .replace(/^@/u, '')
        .replaceAll('/', '-')}-${sourceManifest.version}.tgz`;
      packedPackages[sourceManifest.name] = {
        archive: join(packDirectory, filename),
        manifest: sourceManifest,
      };
    }
    const archives = (await readdir(packDirectory)).filter(name => name.endsWith('.tgz'));
    lifecycle.throwIfTerminationRequested();
    assert.deepEqual(archives.length, 4, 'Framework matrix requires all four packed packages');

    browser = await chromium.launch();
    lifecycle.throwIfTerminationRequested();
    let sharedBaseline;
    for (const consumer of FRAMEWORK_MATRIX) {
      const directory = join(temporaryRoot, consumer.id);
      await cp(consumer.template, directory, { recursive: true });
      lifecycle.throwIfTerminationRequested();
      const localDependencies = {
        '@tellplot/core': `file:${packedPackages['@tellplot/core'].archive}`,
        '@tellplot/editor': `file:${packedPackages['@tellplot/editor'].archive}`,
        ...(consumer.adapterName === undefined
          ? {}
          : { [consumer.adapterName]: `file:${packedPackages[consumer.adapterName].archive}` }),
      };
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
              ...localDependencies,
              ...consumer.dependencies,
            },
            devDependencies: { vite: VITE_VERSION },
          },
          null,
          2,
        )}\n`,
        'utf8',
      );
      await writeFile(join(directory, 'vite.config.mjs'), VITE_CONFIG, 'utf8');
      await writeFile(
        join(directory, 'pnpm-workspace.yaml'),
        `overrides:\n  '@tellplot/core': 'file:${packedPackages['@tellplot/core'].archive}'\n  '@tellplot/editor': 'file:${packedPackages['@tellplot/editor'].archive}'\n  '@napi-rs/wasm-runtime': '${NAPI_WASM_RUNTIME_VERSION}'\n  rolldown: '${ROLLDOWN_VERSION}'\n`,
        'utf8',
      );
      lifecycle.throwIfTerminationRequested();
      const installArgs = ['install', '--no-frozen-lockfile', '--strict-peer-dependencies'];
      const matrixStore = process.env['TELLPLOT_MATRIX_STORE_DIR'];
      if (matrixStore !== undefined && matrixStore.trim().length > 0) {
        installArgs.push('--store-dir', matrixStore);
      }
      await run('pnpm', installArgs, { cwd: directory });
      lifecycle.throwIfTerminationRequested();
      for (const [dependency, version] of Object.entries(consumer.dependencies)) {
        assert.equal(await installedVersion(directory, dependency), version);
      }
      assert.equal(await installedVersion(directory, '@antv/g2'), G2_VERSION);
      if (consumer.adapterName === undefined) {
        assert.equal(await packageInstalled(directory, 'react'), false);
        assert.equal(await packageInstalled(directory, 'react-dom'), false);
        assert.equal(await packageInstalled(directory, 'vue'), false);
      }
      const installedTellPlotPackages = [
        '@tellplot/core',
        '@tellplot/editor',
        ...(consumer.adapterName === undefined ? [] : [consumer.adapterName]),
      ];
      for (const packageName of installedTellPlotPackages) {
        const installedManifest = JSON.parse(
          await readFile(
            join(directory, 'node_modules', ...packageName.split('/'), 'package.json'),
            'utf8',
          ),
        );
        assert.equal(installedManifest.name, packageName);
        assert.equal(installedManifest.version, packedPackages[packageName].manifest.version);
      }
      const styledPackage = consumer.adapterName ?? '@tellplot/editor';
      assert.ok(packedPackages[styledPackage].manifest.exports?.['./styles.css']);
      await run('pnpm', ['run', 'build'], { cwd: directory });
      lifecycle.throwIfTerminationRequested();
      const verified = await verifyConsumer(browser, consumer, directory);
      lifecycle.throwIfTerminationRequested();
      if (sharedBaseline === undefined) {
        sharedBaseline = verified;
      } else {
        assert.deepEqual(
          verified,
          sharedBaseline,
          `${consumer.id} must match imperative ViewSpec, command event and SVG semantics`,
        );
      }
    }
  } catch (error) {
    if (lifecycle.receivedSignal === undefined) {
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
