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
const PACKAGE_DIRECTORIES = ['tellplot'];
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
    adapterName: 'tellplot/react',
    dependencies: { react: '18.3.1', 'react-dom': '18.3.1' },
  },
  {
    id: 'react-19',
    framework: 'React',
    frameworkVersion: '19.2.7',
    template: REACT_CONSUMER_TEMPLATE,
    adapterName: 'tellplot/react',
    dependencies: { react: '19.2.7', 'react-dom': '19.2.7' },
  },
  {
    id: 'vue-3',
    framework: 'Vue',
    frameworkVersion: '3.5.27',
    template: VUE_CONSUMER_TEMPLATE,
    adapterName: 'tellplot/vue',
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

async function canvasPaletteReceipt(canvas, colors) {
  return canvas.evaluate((element, expected) => {
    if (!(element instanceof HTMLCanvasElement)) {
      return [];
    }
    const context = element.getContext('2d');
    if (context === null || element.width === 0 || element.height === 0) {
      return [];
    }
    const pixels = context.getImageData(0, 0, element.width, element.height).data;
    return expected.map(color => {
      let count = 0;
      let minX = element.width;
      let minY = element.height;
      for (let offset = 0; offset < pixels.length; offset += 4) {
        const red = pixels[offset] ?? 0;
        const green = pixels[offset + 1] ?? 0;
        const blue = pixels[offset + 2] ?? 0;
        const alpha = pixels[offset + 3] ?? 0;
        if (
          alpha > 160 &&
          Math.abs(red - color[0]) <= 5 &&
          Math.abs(green - color[1]) <= 5 &&
          Math.abs(blue - color[2]) <= 5
        ) {
          count += 1;
          const pixel = offset / 4;
          minX = Math.min(minX, pixel % element.width);
          minY = Math.min(minY, Math.floor(pixel / element.width));
        }
      }
      return { count, minX, minY };
    });
  }, colors);
}

async function settledCanvasReceipt(canvas, previousSignature) {
  const deadline = Date.now() + 30_000;
  let previousSample = -1;
  let stableSamples = 0;
  let painted = 0;
  let signature = 0;
  while (stableSamples < 2 && Date.now() < deadline) {
    lifecycle.throwIfTerminationRequested();
    painted = await paintedPixelCount(canvas);
    signature = await canvasPixelSignature(canvas);
    const eligible =
      painted > 500 && (previousSignature === undefined || signature !== previousSignature);
    stableSamples = eligible && signature === previousSample ? stableSamples + 1 : 0;
    previousSample = signature;
    await canvas.page().waitForTimeout(16);
  }
  assert.ok(painted > 500, 'comparison canvas must remain nonblank');
  assert.equal(stableSamples, 2, 'comparison canvas must settle on a fresh signature');
  return { painted, signature };
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

async function visibleSvgReceipt(page, exported, labels, colors) {
  return page.evaluate(
    value => {
      const host = document.createElement('div');
      host.style.position = 'fixed';
      host.style.left = '0';
      host.style.top = '0';
      host.style.width = `${value.exported.width}px`;
      host.style.height = `${value.exported.height}px`;
      host.style.background = '#ffffff';
      host.innerHTML = value.exported.svg;
      document.body.append(host);
      try {
        const svg = host.querySelector('svg');
        if (!(svg instanceof SVGSVGElement)) return null;
        const texts = Array.from(svg.querySelectorAll('text'));
        const legend = value.labels.map(label => {
          const element = texts.find(text => text.textContent?.trim() === label);
          if (!(element instanceof SVGGraphicsElement)) return null;
          const box = element.getBBox();
          return { label, x: box.x, y: box.y, width: box.width, height: box.height };
        });
        const elements = Array.from(svg.querySelectorAll('*'));
        const paintCounts = value.colors.map(
          color =>
            elements.filter(element => {
              const style = getComputedStyle(element);
              return style.fill === color || style.stroke === color;
            }).length,
        );
        return { legend, paintCounts };
      } finally {
        host.remove();
      }
    },
    { exported, labels, colors },
  );
}

async function assertComparisonSvg(page, consumerId, labels, colors) {
  const exported = await page.evaluate(() =>
    globalThis.__tellplotFrameworkMatrix?.exportComparisonSvg(),
  );
  assert.notEqual(exported, null, `${consumerId} comparison SVG must return a result`);
  assert.notEqual(exported, undefined, `${consumerId} comparison SVG must return a result`);
  const semantics = await svgSemantics(page, exported);
  assert.equal(semantics.mimeType, 'image/svg+xml');
  assert.equal(semantics.rootName, 'svg');
  assert.equal(semantics.unsafeElements, 0);
  assert.equal(semantics.externalReferences, 0);
  const visible = await visibleSvgReceipt(page, exported, labels, colors);
  assert.notEqual(visible, null, `${consumerId} comparison SVG must mount visibly`);
  assert.ok(
    visible.legend.every(receipt => receipt !== null && receipt.width > 0 && receipt.height > 0),
    `${consumerId} comparison legend labels must have visible SVG bboxes`,
  );
  const ordered = visible.legend.map(receipt => [receipt.y, receipt.x]);
  assert.deepEqual(
    [...ordered].sort((left, right) => left[0] - right[0] || left[1] - right[1]),
    ordered,
    `${consumerId} comparison legend must retain source order`,
  );
  assert.ok(
    visible.paintCounts.every(count => count > 0),
    `${consumerId} comparison SVG palette must be visible`,
  );
  return { semantics, visible };
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

      const comparison = await page.evaluate(() =>
        globalThis.__tellplotFrameworkMatrix?.beginComparisonScenario(),
      );
      assert.notEqual(comparison, null, `${consumer.id} comparison scenario must return a result`);
      assert.notEqual(
        comparison,
        undefined,
        `${consumer.id} comparison scenario must return a result`,
      );
      assert.deepEqual(comparison.movedOrder, ['beta', 'alpha']);
      assert.deepEqual(comparison.undoOrder, ['alpha', 'beta']);
      assert.deepEqual(comparison.beforeDefaultUpdate, comparison.afterDefaultUpdate);
      assert.deepEqual(comparison.controlledView, comparison.afterDefaultUpdate);
      assert.equal(comparison.standaloneView.annotations.alpha, 'Host controlled note');
      assert.deepEqual(comparison.uncontrolledView, comparison.standaloneView);
      assert.equal(comparison.callbackView.revision, 2);
      assert.equal(comparison.callbackCommand.type, 'undo');
      assert.match(comparison.registry, /Current(?:,|、)\s*Plan/u);
      await page.waitForFunction(
        () =>
          document.querySelector('[data-chart-type="column"] canvas') instanceof HTMLCanvasElement,
      );
      const comparisonCanvas = page.locator('[data-chart-type="column"] canvas').first();
      const initialComparison = await settledCanvasReceipt(comparisonCanvas, configuredSignature);
      const twoSeriesPalette = await canvasPaletteReceipt(comparisonCanvas, [
        [0, 114, 178],
        [213, 94, 0],
      ]);
      assert.ok(
        twoSeriesPalette.every(receipt => receipt.count > 0),
        `${consumer.id} initial comparison palette must be visible on Canvas`,
      );
      const initialSvg = await assertComparisonSvg(
        page,
        consumer.id,
        ['Current', 'Plan'],
        ['rgb(0, 114, 178)', 'rgb(213, 94, 0)'],
      );

      const reordered = await page.evaluate(() =>
        globalThis.__tellplotFrameworkMatrix?.reorderComparisonRegistry(),
      );
      assert.match(reordered.registry, /Plan(?:,|、)\s*Current/u);
      assert.deepEqual(reordered.inspectorOrder, ['plan', 'current']);
      assert.deepEqual(reordered.view, comparison.uncontrolledView);
      const reorderedComparison = await settledCanvasReceipt(
        comparisonCanvas,
        initialComparison.signature,
      );
      const reorderedPalette = await canvasPaletteReceipt(comparisonCanvas, [
        [0, 114, 178],
        [213, 94, 0],
      ]);
      assert.ok(
        reorderedPalette.every(receipt => receipt.count > 0),
        `${consumer.id} reordered comparison palette and legend must remain visible`,
      );
      const reorderedSvg = await assertComparisonSvg(
        page,
        consumer.id,
        ['Plan', 'Current'],
        ['rgb(0, 114, 178)', 'rgb(213, 94, 0)'],
      );

      const fourSeries = await page.evaluate(() =>
        globalThis.__tellplotFrameworkMatrix?.expandComparisonRegistry(),
      );
      assert.match(
        fourSeries.registry,
        /Plan(?:,|、)\s*Current(?:,|、)\s*Forecast(?:,|、)\s*Stretch/u,
      );
      assert.deepEqual(fourSeries.inspectorOrder, ['plan', 'current', 'forecast', 'stretch']);
      assert.equal(fourSeries.seriesCount, 4);
      assert.deepEqual(fourSeries.view, reordered.view);
      const fourSeriesComparison = await settledCanvasReceipt(
        comparisonCanvas,
        reorderedComparison.signature,
      );
      const fourSeriesPalette = await canvasPaletteReceipt(comparisonCanvas, [
        [0, 114, 178],
        [213, 94, 0],
        [0, 158, 115],
        [204, 121, 167],
      ]);
      assert.ok(
        fourSeriesPalette.every(receipt => receipt.count > 0),
        `${consumer.id} four-series palette and legend must be visible on Canvas`,
      );
      const fourSeriesSvg = await assertComparisonSvg(
        page,
        consumer.id,
        ['Plan', 'Current', 'Forecast', 'Stretch'],
        ['rgb(0, 114, 178)', 'rgb(213, 94, 0)', 'rgb(0, 158, 115)', 'rgb(204, 121, 167)'],
      );

      const empty = await page.evaluate(() =>
        globalThis.__tellplotFrameworkMatrix?.emptyComparison(),
      );
      assert.deepEqual(empty.view.rootOrder, []);
      const emptySvg = await assertComparisonSvg(
        page,
        consumer.id,
        ['Plan', 'Current', 'Forecast', 'Stretch'],
        ['rgb(0, 114, 178)', 'rgb(213, 94, 0)', 'rgb(0, 158, 115)', 'rgb(204, 121, 167)'],
      );

      await page.evaluate(() => globalThis.__tellplotFrameworkMatrix?.unmount());
      await page.locator('#root[data-unmounted="true"]').waitFor({ state: 'attached' });
      assert.equal(await page.locator('[data-tellplot="editor"]').count(), 0);
      await page.waitForFunction(() => document.querySelector('[data-tellplot="editor"]') === null);
      assert.deepEqual(runtimeErrors, []);
      console.log(
        `[framework-matrix:${consumer.id}] ${consumer.framework} ${runtime.frameworkVersion}, legacy move/undo and SVG ${semantics.width}x${semantics.height}, v3 2/reordered/4-series/empty SVG parity on real G2, clean unmount`,
      );
      return {
        scenario,
        semantics,
        comparison,
        reordered,
        fourSeries,
        comparisonSvg: { initialSvg, reorderedSvg, fourSeriesSvg, emptySvg },
        signatures: {
          initial: initialComparison.signature,
          reordered: reorderedComparison.signature,
          fourSeries: fourSeriesComparison.signature,
        },
      };
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
    assert.deepEqual(archives.length, 1, 'Framework matrix requires one packed tellplot package');

    browser = await chromium.launch();
    lifecycle.throwIfTerminationRequested();
    let sharedBaseline;
    for (const consumer of FRAMEWORK_MATRIX) {
      const directory = join(temporaryRoot, consumer.id);
      await cp(consumer.template, directory, { recursive: true });
      lifecycle.throwIfTerminationRequested();
      const localDependencies = {
        tellplot: `file:${packedPackages['tellplot'].archive}`,
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
        `overrides:\n  '@napi-rs/wasm-runtime': '${NAPI_WASM_RUNTIME_VERSION}'\n  rolldown: '${ROLLDOWN_VERSION}'\n`,
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
      if (consumer.adapterName === undefined) {
        assert.equal(await packageInstalled(directory, 'react'), false);
        assert.equal(await packageInstalled(directory, 'react-dom'), false);
        assert.equal(await packageInstalled(directory, 'vue'), false);
      }
      const installedManifest = JSON.parse(
        await readFile(join(directory, 'node_modules', 'tellplot', 'package.json'), 'utf8'),
      );
      assert.equal(installedManifest.name, 'tellplot');
      assert.equal(installedManifest.version, packedPackages['tellplot'].manifest.version);
      assert.equal(installedManifest.dependencies?.['@antv/g2'], G2_VERSION);
      assert.ok(installedManifest.exports?.['./styles.css']);
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
