import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

import { resolvePerformanceP95BudgetMs } from './performanceBudget';

const EDITOR = '[data-tellplot="editor"]';
const SAMPLE_COUNT = 30;
const PERFORMANCE_P95_BUDGET_MS = resolvePerformanceP95BudgetMs(
  process.env['TELLPLOT_PERFORMANCE_P95_BUDGET_MS'],
);

interface BarSlot {
  readonly x: number;
  readonly minX: number;
  readonly maxX: number;
}

interface CanvasSignatureRegion {
  readonly minXRatio: number;
  readonly maxXRatio: number;
}

interface ExpectedEditorState {
  readonly expectedRevision: number;
  readonly expectedPrefix: readonly string[];
  readonly expectedKey: 'ArrowDown' | 'ArrowUp';
}

interface ComparisonPaintSample {
  readonly sampleIndex: number;
  readonly elapsedMs: number;
  readonly expectedRevision: number;
  readonly paintedRevision: number;
  readonly expectedOrderOrdinals: readonly number[];
  readonly paintedOrderOrdinals: readonly number[];
}

interface PerformanceWindow extends Window {
  __tellplotAnimationFrames?: number;
  __tellplotRootCommits?: number;
  __tellplotPointerMoves?: number;
  __tellplotPerf?: {
    samples: number[];
    pending: Promise<number> | null;
  };
  __tellplotPointerLifecycle?: string[];
  __tellplotComparisonPerf?: {
    samples: ComparisonPaintSample[];
    pending: Promise<ComparisonPaintSample> | null;
  };
  __tellplotRafCoalescing?: {
    requested: number;
    cancelled: number;
    callbacks: number;
  };
}

async function installReactCommitProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const performanceWindow = window as PerformanceWindow;
    performanceWindow.__tellplotRootCommits = 0;
    let rendererId = 0;

    const objectValue = (value: unknown): Record<string, unknown> | null =>
      typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;

    const containsEditorFiber = (root: unknown): boolean => {
      const rootObject = objectValue(root);
      const current = objectValue(rootObject?.current);
      if (current === null) {
        return false;
      }
      const stack: Record<string, unknown>[] = [current];
      while (stack.length > 0) {
        const fiber = stack.pop();
        if (fiber === undefined) {
          continue;
        }
        const type = fiber.type;
        const typeObject = objectValue(type);
        const render = typeObject?.render;
        const name =
          typeof type === 'function'
            ? type.name
            : typeof typeObject?.displayName === 'string'
              ? typeObject.displayName
              : typeof typeObject?.name === 'string'
                ? typeObject.name
                : typeof render === 'function'
                  ? render.name
                  : '';
        if (name === 'TellPlotChartEditor' || name === 'ChartEditor') {
          return true;
        }
        const child = objectValue(fiber.child);
        const sibling = objectValue(fiber.sibling);
        if (child !== null) {
          stack.push(child);
        }
        if (sibling !== null) {
          stack.push(sibling);
        }
      }
      return false;
    };

    const hook = {
      supportsFiber: true,
      renderers: new Map<number, unknown>(),
      inject(renderer: unknown): number {
        rendererId += 1;
        this.renderers.set(rendererId, renderer);
        return rendererId;
      },
      onCommitFiberRoot(_id: number, root: unknown): void {
        if (containsEditorFiber(root)) {
          performanceWindow.__tellplotRootCommits =
            (performanceWindow.__tellplotRootCommits ?? 0) + 1;
        }
      },
      onCommitFiberUnmount(): void {
        return;
      },
      onPostCommitFiberRoot(): void {
        return;
      },
    };
    Object.defineProperty(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
      configurable: true,
      value: hook,
    });
  });
}

async function paintedPixelCount(canvas: Locator): Promise<number> {
  return canvas.evaluate(element => {
    if (!(element instanceof HTMLCanvasElement)) {
      return 0;
    }
    const context = element.getContext('2d');
    if (context === null) {
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

async function barSlots(canvas: Locator): Promise<readonly BarSlot[]> {
  const localSlots = await canvas.evaluate(element => {
    if (!(element instanceof HTMLCanvasElement)) {
      return [];
    }
    const context = element.getContext('2d');
    if (context === null) {
      return [];
    }
    const colors = [
      [47, 124, 246],
      [18, 183, 106],
      [240, 68, 100],
      [20, 184, 166],
    ];
    const pixels = context.getImageData(0, 0, element.width, element.height).data;
    const populated: { readonly colorIndex: number; readonly x: number }[] = [];
    for (let x = 0; x < element.width; x += 1) {
      const matches = colors.map(() => 0);
      for (let y = 0; y < element.height; y += 1) {
        const offset = (y * element.width + x) * 4;
        const red = pixels[offset] ?? 0;
        const green = pixels[offset + 1] ?? 0;
        const blue = pixels[offset + 2] ?? 0;
        const alpha = pixels[offset + 3] ?? 0;
        if (alpha <= 120) {
          continue;
        }
        const colorIndex = colors.findIndex(
          ([r, g, b]) =>
            Math.abs(red - r) <= 8 && Math.abs(green - g) <= 8 && Math.abs(blue - b) <= 8,
        );
        if (colorIndex >= 0) {
          matches[colorIndex] = (matches[colorIndex] ?? 0) + 1;
        }
      }
      const strongestMatch = Math.max(...matches);
      if (strongestMatch >= 2) {
        populated.push({ colorIndex: matches.indexOf(strongestMatch), x });
      }
    }
    const clusters: { colorIndex: number; minX: number; maxX: number }[] = [];
    for (const point of populated) {
      const current = clusters.at(-1);
      if (
        current === undefined ||
        point.x > current.maxX + 1 ||
        point.colorIndex !== current.colorIndex
      ) {
        clusters.push({
          colorIndex: point.colorIndex,
          minX: point.x,
          maxX: point.x,
        });
      } else {
        current.maxX = point.x;
      }
    }
    return clusters.map(cluster => ({
      x: (cluster.minX + cluster.maxX) / 2,
      minX: cluster.minX,
      maxX: cluster.maxX,
    }));
  });
  const box = await canvas.boundingBox();
  const width = await canvas.evaluate(element =>
    element instanceof HTMLCanvasElement ? element.width : 0,
  );
  if (box === null || width === 0) {
    return [];
  }
  return localSlots.map(slot => ({
    x: box.x + (slot.x / width) * box.width,
    minX: box.x + (slot.minX / width) * box.width,
    maxX: box.x + (slot.maxX / width) * box.width,
  }));
}

async function yInsideBar(canvas: Locator, cssX: number): Promise<number> {
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) {
    return 0;
  }
  const localY = await canvas.evaluate(
    (element, ratioX) => {
      if (!(element instanceof HTMLCanvasElement)) {
        return 0;
      }
      const context = element.getContext('2d');
      if (context === null) {
        return 0;
      }
      const x = Math.max(0, Math.min(element.width - 1, Math.round(ratioX * element.width)));
      const pixels = context.getImageData(x, 0, 1, element.height).data;
      const colors = [
        [47, 124, 246],
        [18, 183, 106],
        [240, 68, 100],
        [20, 184, 166],
      ];
      const matches: number[] = [];
      for (let y = 0; y < element.height; y += 1) {
        const offset = y * 4;
        const red = pixels[offset] ?? 0;
        const green = pixels[offset + 1] ?? 0;
        const blue = pixels[offset + 2] ?? 0;
        const alpha = pixels[offset + 3] ?? 0;
        if (
          alpha > 120 &&
          colors.some(
            ([r, g, b]) =>
              Math.abs(red - r) <= 8 && Math.abs(green - g) <= 8 && Math.abs(blue - b) <= 8,
          )
        ) {
          matches.push(y);
        }
      }
      return matches[Math.floor(matches.length / 2)] ?? 0;
    },
    (cssX - box.x) / box.width,
  );
  const height = await canvas.evaluate(element =>
    element instanceof HTMLCanvasElement ? element.height : 0,
  );
  return box.y + (localY / height) * box.height;
}

async function installLatencyProbe(page: Page): Promise<void> {
  await page.evaluate(() => {
    const performanceWindow = window as PerformanceWindow;
    performanceWindow.__tellplotPerf = {
      samples: [],
      pending: null,
    };
  });
}

async function canvasPixelSignature(
  canvas: Locator,
  region: CanvasSignatureRegion,
): Promise<number> {
  return canvas.evaluate((element, targetRegion) => {
    if (!(element instanceof HTMLCanvasElement)) {
      return 0;
    }
    const context = element.getContext('2d');
    if (context === null) {
      return 0;
    }
    const minX = Math.max(0, Math.floor(targetRegion.minXRatio * element.width));
    const maxX = Math.min(element.width - 1, Math.ceil(targetRegion.maxXRatio * element.width));
    const pixels = context.getImageData(minX, 0, Math.max(1, maxX - minX + 1), element.height).data;
    let hash = 2166136261;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      hash ^= pixels[offset] ?? 0;
      hash = Math.imul(hash, 16777619);
      hash ^= pixels[offset + 1] ?? 0;
      hash = Math.imul(hash, 16777619);
      hash ^= pixels[offset + 2] ?? 0;
      hash = Math.imul(hash, 16777619);
      hash ^= pixels[offset + 3] ?? 0;
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }, region);
}

async function waitForStableCanvas(
  canvas: Locator,
  region: CanvasSignatureRegion,
): Promise<number> {
  return canvas.evaluate(
    (element, targetRegion) =>
      new Promise<number>((resolve, reject) => {
        if (!(element instanceof HTMLCanvasElement)) {
          reject(new Error('Performance target is not a canvas'));
          return;
        }
        const context = element.getContext('2d');
        if (context === null) {
          reject(new Error('Performance canvas does not expose a 2D context'));
          return;
        }
        const minX = Math.max(0, Math.floor(targetRegion.minXRatio * element.width));
        const maxX = Math.min(element.width - 1, Math.ceil(targetRegion.maxXRatio * element.width));
        const signature = (): number => {
          const pixels = context.getImageData(
            minX,
            0,
            Math.max(1, maxX - minX + 1),
            element.height,
          ).data;
          let hash = 2166136261;
          for (let offset = 0; offset < pixels.length; offset += 4) {
            hash ^= pixels[offset] ?? 0;
            hash = Math.imul(hash, 16777619);
            hash ^= pixels[offset + 1] ?? 0;
            hash = Math.imul(hash, 16777619);
            hash ^= pixels[offset + 2] ?? 0;
            hash = Math.imul(hash, 16777619);
            hash ^= pixels[offset + 3] ?? 0;
            hash = Math.imul(hash, 16777619);
          }
          return hash >>> 0;
        };
        const deadline = performance.now() + 2_000;
        let previousSignature = signature();
        let stableFrameCount = 0;
        const inspect = (): void => {
          const inspectedAt = performance.now();
          const currentSignature = signature();
          if (currentSignature === previousSignature) {
            stableFrameCount += 1;
          } else {
            previousSignature = currentSignature;
            stableFrameCount = 0;
          }
          if (stableFrameCount >= 4) {
            resolve(currentSignature);
            return;
          }
          if (inspectedAt >= deadline) {
            reject(new Error('Canvas did not remain stable across four animation frames'));
            return;
          }
          requestAnimationFrame(inspect);
        };
        requestAnimationFrame(inspect);
      }),
    region,
  );
}

async function armFirstVisibleCanvasUpdate(
  canvas: Locator,
  previousSignature: number,
  region: CanvasSignatureRegion,
  expectedState: ExpectedEditorState,
): Promise<void> {
  await canvas.evaluate(
    (element, input) => {
      if (!(element instanceof HTMLCanvasElement)) {
        throw new Error('Performance target is not a canvas');
      }
      const context = element.getContext('2d');
      const metric = (window as PerformanceWindow).__tellplotPerf;
      if (context === null || metric === undefined || metric.pending !== null) {
        throw new Error('Visible performance probe is not initialized');
      }
      const minX = Math.max(0, Math.floor(input.region.minXRatio * element.width));
      const maxX = Math.min(element.width - 1, Math.ceil(input.region.maxXRatio * element.width));
      const signature = (): number => {
        const pixels = context.getImageData(
          minX,
          0,
          Math.max(1, maxX - minX + 1),
          element.height,
        ).data;
        let hash = 2166136261;
        for (let offset = 0; offset < pixels.length; offset += 4) {
          hash ^= pixels[offset] ?? 0;
          hash = Math.imul(hash, 16777619);
          hash ^= pixels[offset + 1] ?? 0;
          hash = Math.imul(hash, 16777619);
          hash ^= pixels[offset + 2] ?? 0;
          hash = Math.imul(hash, 16777619);
          hash ^= pixels[offset + 3] ?? 0;
          hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
      };
      const targetStateMatches = (): boolean => {
        const editor = document.querySelector(input.editorSelector);
        if (
          !(editor instanceof HTMLElement) ||
          editor.getAttribute('data-view-revision') !== String(input.expectedRevision)
        ) {
          return false;
        }
        const rootPrefix = [
          ...editor.querySelectorAll(
            '[role="treeitem"][aria-level="1"][data-node-kind="contribution"]',
          ),
        ]
          .slice(0, input.expectedPrefix.length)
          .map(row => row.getAttribute('data-node-id') ?? 'missing-node-id');
        return input.expectedPrefix.every((nodeId, index) => rootPrefix[index] === nodeId);
      };
      const pending = new Promise<number>((resolve, reject) => {
        const armDeadline = window.setTimeout(() => {
          document.removeEventListener('keydown', handleKeyDown, true);
          reject(new Error('Performance command keydown was not observed within 1000ms'));
        }, 1_000);
        const handleKeyDown = (event: KeyboardEvent): void => {
          if (!event.altKey || event.key !== input.expectedKey) {
            return;
          }
          window.clearTimeout(armDeadline);
          document.removeEventListener('keydown', handleKeyDown, true);
          const startedAt = performance.now();
          const deadline = startedAt + 1_000;
          const inspect = (): void => {
            const inspectedAt = performance.now();
            if (signature() !== input.expectedSignature && targetStateMatches()) {
              const elapsed = inspectedAt - startedAt;
              metric.samples.push(elapsed);
              resolve(elapsed);
              return;
            }
            if (inspectedAt >= deadline) {
              reject(new Error('Canvas did not expose a new painted frame within 1000ms'));
              return;
            }
            requestAnimationFrame(inspect);
          };
          queueMicrotask(() => requestAnimationFrame(inspect));
        };
        document.addEventListener('keydown', handleKeyDown, true);
      });
      void pending.catch(() => undefined);
      metric.pending = pending;
    },
    {
      editorSelector: EDITOR,
      expectedKey: expectedState.expectedKey,
      expectedPrefix: expectedState.expectedPrefix,
      expectedRevision: expectedState.expectedRevision,
      expectedSignature: previousSignature,
      region,
    },
  );
}

async function waitForFirstVisibleCanvasUpdate(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const metric = (window as PerformanceWindow).__tellplotPerf;
    if (metric === undefined || metric.pending === null) {
      throw new Error('Visible performance probe is not armed');
    }
    const pending = metric.pending;
    try {
      return await pending;
    } finally {
      metric.pending = null;
    }
  });
}

async function rootContributionPrefix(page: Page): Promise<readonly string[]> {
  return page
    .getByRole('tree', { name: '结构大纲' })
    .locator('[role="treeitem"][aria-level="1"][data-node-kind="contribution"]')
    .evaluateAll(rows =>
      rows.slice(0, 3).map(row => row.getAttribute('data-node-id') ?? 'missing-node-id'),
    );
}

async function comparisonIntervalSlots(canvas: Locator): Promise<readonly BarSlot[]> {
  const localSlots = await canvas.evaluate(element => {
    if (!(element instanceof HTMLCanvasElement)) {
      return [];
    }
    const context = element.getContext('2d');
    if (context === null) {
      return [];
    }
    const colors = [
      [0, 114, 178],
      [213, 94, 0],
    ];
    const pixels = context.getImageData(0, 0, element.width, element.height).data;
    const startY = Math.floor(element.height * 0.18);
    const populated: { readonly colorIndex: number; readonly x: number }[] = [];
    for (let x = 0; x < element.width; x += 1) {
      const matches = colors.map(() => 0);
      for (let y = startY; y < element.height; y += 1) {
        const offset = (y * element.width + x) * 4;
        const red = pixels[offset] ?? 0;
        const green = pixels[offset + 1] ?? 0;
        const blue = pixels[offset + 2] ?? 0;
        const alpha = pixels[offset + 3] ?? 0;
        if (alpha <= 120) {
          continue;
        }
        const colorIndex = colors.findIndex(
          ([r, g, b]) =>
            Math.abs(red - r) <= 8 && Math.abs(green - g) <= 8 && Math.abs(blue - b) <= 8,
        );
        if (colorIndex >= 0) {
          matches[colorIndex] = (matches[colorIndex] ?? 0) + 1;
        }
      }
      const strongestMatch = Math.max(...matches);
      if (strongestMatch >= 4) {
        populated.push({ colorIndex: matches.indexOf(strongestMatch), x });
      }
    }
    const clusters: { colorIndex: number; minX: number; maxX: number }[] = [];
    for (const point of populated) {
      const current = clusters.at(-1);
      if (
        current === undefined ||
        point.x > current.maxX + 1 ||
        point.colorIndex !== current.colorIndex
      ) {
        clusters.push({ colorIndex: point.colorIndex, minX: point.x, maxX: point.x });
      } else {
        current.maxX = point.x;
      }
    }
    return clusters.map(cluster => ({
      x: (cluster.minX + cluster.maxX) / 2,
      minX: cluster.minX,
      maxX: cluster.maxX,
    }));
  });
  const box = await canvas.boundingBox();
  const width = await canvas.evaluate(element =>
    element instanceof HTMLCanvasElement ? element.width : 0,
  );
  if (box === null || width === 0) {
    return [];
  }
  return localSlots.map(slot => ({
    x: box.x + (slot.x / width) * box.width,
    minX: box.x + (slot.minX / width) * box.width,
    maxX: box.x + (slot.maxX / width) * box.width,
  }));
}

async function comparisonCategoryPrefix(page: Page): Promise<readonly string[]> {
  return page
    .locator('[role="tree"]:visible')
    .first()
    .locator('[role="treeitem"][aria-level="1"][data-node-id]')
    .evaluateAll(rows =>
      rows.slice(0, 3).map(row => row.getAttribute('data-node-id') ?? 'missing-node-id'),
    );
}

async function yInsideComparisonInterval(canvas: Locator, cssX: number): Promise<number> {
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) {
    return 0;
  }
  const localY = await canvas.evaluate(
    (element, ratioX) => {
      if (!(element instanceof HTMLCanvasElement)) return -1;
      const context = element.getContext('2d');
      if (context === null) return -1;
      const x = Math.max(0, Math.min(element.width - 1, Math.round(ratioX * element.width)));
      const pixels = context.getImageData(x, 0, 1, element.height).data;
      const colors = [
        [0, 114, 178],
        [213, 94, 0],
      ];
      const matches: number[] = [];
      for (let y = 0; y < element.height; y += 1) {
        const offset = y * 4;
        if (
          (pixels[offset + 3] ?? 0) > 120 &&
          colors.some(
            ([red, green, blue]) =>
              Math.abs((pixels[offset] ?? 0) - red) <= 8 &&
              Math.abs((pixels[offset + 1] ?? 0) - green) <= 8 &&
              Math.abs((pixels[offset + 2] ?? 0) - blue) <= 8,
          )
        ) {
          matches.push(y);
        }
      }
      return matches[Math.floor(matches.length / 2)] ?? -1;
    },
    (cssX - box.x) / box.width,
  );
  expect(localY).toBeGreaterThanOrEqual(0);
  const height = await canvas.evaluate(element =>
    element instanceof HTMLCanvasElement ? element.height : 0,
  );
  return box.y + (localY / height) * box.height;
}

async function findComparisonDirectHit(
  page: Page,
  slotX: number,
  slotY: number,
  probeTargetX: number,
): Promise<{ readonly x: number; readonly y: number }> {
  for (const xOffset of [-1.5, -1, -0.5, 0, 0.5, 1, 1.5]) {
    for (const yOffset of [-6, -3, 0, 3, 6]) {
      const point = { x: slotX + xOffset, y: slotY + yOffset };
      await page.mouse.move(point.x, point.y);
      await page.mouse.down();
      await page.mouse.move(probeTargetX, point.y, { steps: 2 });
      const state = await page.locator(EDITOR).getAttribute('data-interaction-state');
      await page.keyboard.press('Escape');
      await page.mouse.up();
      await expect(page.locator(EDITOR)).toHaveAttribute('data-interaction-state', 'idle');
      if (state === 'dragging') {
        return point;
      }
    }
  }
  throw new Error('No exact G2 comparison interval hit was found near the painted slot');
}

async function installComparisonLatencyProbe(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as PerformanceWindow).__tellplotComparisonPerf = { samples: [], pending: null };
  });
}

async function armComparisonPaintUpdate(
  canvas: Locator,
  previousSignature: number,
  region: CanvasSignatureRegion,
  input: {
    readonly sampleIndex: number;
    readonly expectedRevision: number;
    readonly expectedPrefix: readonly string[];
  },
): Promise<void> {
  await canvas.evaluate(
    (element, target) => {
      if (!(element instanceof HTMLCanvasElement)) {
        throw new Error('Comparison performance target is not a canvas');
      }
      const context = element.getContext('2d');
      const metric = (window as PerformanceWindow).__tellplotComparisonPerf;
      const editor = document.querySelector(target.editorSelector);
      if (
        context === null ||
        metric === undefined ||
        metric.pending !== null ||
        !(editor instanceof HTMLElement)
      ) {
        throw new Error('Comparison painted-frame probe is not initialized');
      }
      const minX = Math.max(0, Math.floor(target.region.minXRatio * element.width));
      const maxX = Math.min(element.width - 1, Math.ceil(target.region.maxXRatio * element.width));
      const signature = (): number => {
        const pixels = context.getImageData(
          minX,
          0,
          Math.max(1, maxX - minX + 1),
          element.height,
        ).data;
        let hash = 2166136261;
        for (let offset = 0; offset < pixels.length; offset += 4) {
          hash ^= pixels[offset] ?? 0;
          hash = Math.imul(hash, 16777619);
          hash ^= pixels[offset + 1] ?? 0;
          hash = Math.imul(hash, 16777619);
          hash ^= pixels[offset + 2] ?? 0;
          hash = Math.imul(hash, 16777619);
          hash ^= pixels[offset + 3] ?? 0;
          hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
      };
      const prefix = (): readonly string[] =>
        [...editor.querySelectorAll('[role="treeitem"][aria-level="1"][data-node-id]')]
          .slice(0, target.expectedPrefix.length)
          .map(row => row.getAttribute('data-node-id') ?? 'missing-node-id');
      const ordinal = (nodeId: string): number => {
        const suffix = /([0-9]+)$/u.exec(nodeId)?.[1];
        return suffix === undefined ? -1 : Number.parseInt(suffix, 10);
      };
      const pending = new Promise<ComparisonPaintSample>((resolve, reject) => {
        const armedAt = performance.now();
        let startedAt: number | undefined;
        const rejectTimer = window.setTimeout(() => {
          observer.disconnect();
          reject(new Error('Comparison command was not committed and painted within 1500ms'));
        }, 1_500);
        const inspect = (): void => {
          if (startedAt === undefined) {
            return;
          }
          const paintedPrefix = prefix();
          const revision = Number.parseInt(editor.dataset['viewRevision'] ?? '-1', 10);
          if (
            revision === target.expectedRevision &&
            signature() !== target.previousSignature &&
            target.expectedPrefix.every((nodeId, index) => paintedPrefix[index] === nodeId)
          ) {
            window.clearTimeout(rejectTimer);
            const receipt: ComparisonPaintSample = {
              sampleIndex: target.sampleIndex,
              elapsedMs: performance.now() - startedAt,
              expectedRevision: target.expectedRevision,
              paintedRevision: revision,
              expectedOrderOrdinals: target.expectedPrefix.map(ordinal),
              paintedOrderOrdinals: paintedPrefix.map(ordinal),
            };
            metric.samples.push(receipt);
            resolve(receipt);
            return;
          }
          requestAnimationFrame(inspect);
        };
        const beginAtAcceptedCommit = (): void => {
          if (
            startedAt !== undefined ||
            editor.dataset['viewRevision'] !== String(target.expectedRevision)
          ) {
            return;
          }
          observer.disconnect();
          startedAt = performance.now();
          requestAnimationFrame(inspect);
        };
        const observer = new MutationObserver(beginAtAcceptedCommit);
        observer.observe(editor, { attributes: true, attributeFilter: ['data-view-revision'] });
        beginAtAcceptedCommit();
        if (performance.now() - armedAt >= 1_500) {
          window.clearTimeout(rejectTimer);
          observer.disconnect();
          reject(new Error('Comparison painted-frame probe could not be armed'));
        }
      });
      void pending.catch(() => undefined);
      metric.pending = pending;
    },
    {
      editorSelector: EDITOR,
      expectedPrefix: input.expectedPrefix,
      expectedRevision: input.expectedRevision,
      previousSignature,
      region,
      sampleIndex: input.sampleIndex,
    },
  );
}

async function waitForComparisonPaintUpdate(page: Page): Promise<ComparisonPaintSample> {
  return page.evaluate(async () => {
    const metric = (window as PerformanceWindow).__tellplotComparisonPerf;
    if (metric === undefined || metric.pending === null) {
      throw new Error('Comparison painted-frame probe is not armed');
    }
    const pending = metric.pending;
    try {
      return await pending;
    } finally {
      metric.pending = null;
    }
  });
}

test('latency probe waits for an unfinished prior canvas animation to settle', async ({ page }) => {
  await page.setContent('<canvas width="48" height="24"></canvas>');
  const canvas = page.locator('canvas');
  const signatureRegion: CanvasSignatureRegion = {
    minXRatio: 0,
    maxXRatio: 1,
  };
  await page.evaluate(() => {
    const canvasElement = document.querySelector('canvas');
    if (!(canvasElement instanceof HTMLCanvasElement)) {
      throw new Error('Animation regression canvas is missing');
    }
    const context = canvasElement.getContext('2d');
    if (context === null) {
      throw new Error('Animation regression canvas does not expose a 2D context');
    }
    const performanceWindow = window as PerformanceWindow;
    performanceWindow.__tellplotAnimationFrames = 0;
    const animate = (): void => {
      const frame = (performanceWindow.__tellplotAnimationFrames ?? 0) + 1;
      performanceWindow.__tellplotAnimationFrames = frame;
      context.fillStyle = `rgb(${String(frame * 20)}, ${String(frame * 10)}, ${String(frame * 5)})`;
      context.fillRect(0, 0, canvasElement.width, canvasElement.height);
      if (frame < 8) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  });

  const stableSignature = await waitForStableCanvas(canvas, signatureRegion);

  expect(
    await page.evaluate(() => (window as PerformanceWindow).__tellplotAnimationFrames ?? 0),
  ).toBe(8);
  expect(stableSignature).toBe(await canvasPixelSignature(canvas, signatureRegion));
});

test('200-item chart keeps pointer feedback outside React and meets commit p95', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await installReactCommitProbe(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/playground?fixture=performance');
  await expect(page.locator(`${EDITOR}[data-editor-state="ready"]`)).toBeVisible();
  await page.getByRole('button', { name: '隐藏使用代码' }).click();

  const handles = page.locator('[data-node-kind="contribution"] button[aria-label^="拖动 "]');
  await expect(handles).toHaveCount(200);
  const canvas = page.getByTestId('tellplot-chart').locator('canvas').first();
  await expect(canvas).toBeVisible();
  await expect.poll(() => paintedPixelCount(canvas)).toBeGreaterThan(500);
  await expect.poll(() => barSlots(canvas)).toHaveLength(202);
  await page.waitForTimeout(180); // Exclude the default 160ms entrance transition from hit testing.
  const slots = await barSlots(canvas);
  const first = slots[1];
  const second = slots[2];
  const third = slots[3];
  expect(first).toBeDefined();
  expect(second).toBeDefined();
  expect(third).toBeDefined();
  if (first === undefined || second === undefined || third === undefined) {
    return;
  }
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  if (canvasBox === null || canvasBox.width <= 0) {
    return;
  }
  const signatureRegion: CanvasSignatureRegion = {
    minXRatio: Math.max(0, (first.minX - canvasBox.x - 2) / canvasBox.width),
    maxXRatio: Math.min(1, (third.maxX - canvasBox.x + 2) / canvasBox.width),
  };

  const firstY = await yInsideBar(canvas, first.x);
  const secondY = await yInsideBar(canvas, second.x);
  const slotSpacing = second.x - first.x;
  expect(slotSpacing).toBeGreaterThan(0);
  const secondCollisionDelta = Math.max(4.5, second.minX - first.maxX + 0.5);
  const thirdCollisionX = first.x + (third.minX - first.maxX);
  const stableAfterStartX = first.x + secondCollisionDelta;
  const stableAfterEndX = Math.min(stableAfterStartX + 0.5, thirdCollisionX - 0.25);
  expect(stableAfterEndX).toBeGreaterThan(stableAfterStartX);
  await page.mouse.move(first.x, firstY);
  await page.mouse.down();
  await page.mouse.move(stableAfterStartX, secondY, { steps: 8 });
  await expect(page.getByTestId('tellplot-chart')).toHaveAttribute('data-drop-indicator', 'after');
  const overlay = page.getByTestId('chart-drag-overlay');
  await expect(overlay).toBeVisible();
  const transformBefore = await overlay.evaluate(element => getComputedStyle(element).transform);
  await page.waitForTimeout(180);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  const commitsBefore = await page.evaluate(
    () => (window as PerformanceWindow).__tellplotRootCommits ?? -1,
  );
  expect(commitsBefore).toBeGreaterThan(0);
  await page.evaluate(() => {
    const performanceWindow = window as PerformanceWindow;
    performanceWindow.__tellplotPointerMoves = 0;
    document.addEventListener(
      'pointermove',
      () => {
        performanceWindow.__tellplotPointerMoves =
          (performanceWindow.__tellplotPointerMoves ?? 0) + 1;
      },
      { capture: true },
    );
  });

  await page.mouse.move(stableAfterEndX, secondY, { steps: 100 });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  const commitsAfter = await page.evaluate(
    () => (window as PerformanceWindow).__tellplotRootCommits ?? -1,
  );
  const transformAfter = await overlay.evaluate(element => getComputedStyle(element).transform);
  const pointerMoves = await page.evaluate(
    () => (window as PerformanceWindow).__tellplotPointerMoves ?? 0,
  );
  expect(transformAfter).not.toBe(transformBefore);
  expect(pointerMoves).toBeGreaterThanOrEqual(100);
  expect(commitsAfter - commitsBefore).toBe(0);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '0');
  await expect(page.getByTestId('tellplot-chart-stage')).toHaveAttribute(
    'data-render-state',
    'ready',
  );
  await page.waitForTimeout(180);
  await expect.poll(() => barSlots(canvas)).toHaveLength(202);

  await installLatencyProbe(page);
  const keyboardMover = page.locator('[role="treeitem"][data-node-id="perf-001"]');
  for (let sample = 0; sample < SAMPLE_COUNT; sample += 1) {
    const expectsSwappedOrder = sample % 2 === 0;
    const nextRevision = sample + 1;
    const expectedPrefix = expectsSwappedOrder
      ? ['perf-002', 'perf-001', 'perf-003']
      : ['perf-001', 'perf-002', 'perf-003'];

    await keyboardMover.focus();
    const previousSignature = await waitForStableCanvas(canvas, signatureRegion);
    await armFirstVisibleCanvasUpdate(canvas, previousSignature, signatureRegion, {
      expectedRevision: nextRevision,
      expectedPrefix,
      expectedKey: expectsSwappedOrder ? 'ArrowDown' : 'ArrowUp',
    });
    await page.keyboard.press(expectsSwappedOrder ? 'Alt+ArrowDown' : 'Alt+ArrowUp');
    await waitForFirstVisibleCanvasUpdate(page);
    await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', String(nextRevision));
    expect(await rootContributionPrefix(page)).toEqual(expectedPrefix);
    expect(
      await page.evaluate(() => (window as PerformanceWindow).__tellplotPerf?.samples.length ?? 0),
    ).toBe(nextRevision);
    await expect(page.getByTestId('tellplot-chart-stage')).toHaveAttribute(
      'data-render-state',
      'ready',
    );
  }

  const samples = await page.evaluate(
    () => (window as PerformanceWindow).__tellplotPerf?.samples ?? [],
  );
  expect(samples).toHaveLength(SAMPLE_COUNT);
  const sorted = [...samples].sort((left, right) => left - right);
  const p95 = sorted[Math.ceil(0.95 * sorted.length) - 1];
  expect(p95).toBeDefined();
  await test.info().attach('performance-samples.json', {
    body: Buffer.from(
      JSON.stringify(
        {
          visibleContributions: 200,
          sampleCount: samples.length,
          formula: 'sorted[ceil(.95*n)-1]',
          samples,
          p95,
          p95BudgetMs: PERFORMANCE_P95_BUDGET_MS,
          sameTargetRootCommitDelta: commitsAfter - commitsBefore,
        },
        null,
        2,
      ),
    ),
    contentType: 'application/json',
  });
  console.log(
    `[performance] visible-canvas p95=${String(p95)}ms, budget=${String(PERFORMANCE_P95_BUDGET_MS)}ms, samples=${samples.length}, same-target-root-commit-delta=${commitsAfter - commitsBefore}`,
  );
  expect(p95 ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(PERFORMANCE_P95_BUDGET_MS);
});

test('200-item categorical G2 chart keeps direct feedback outside React and meets commit p95', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await installReactCommitProbe(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/playground?fixture=categorical-performance');
  await expect(
    page.locator(`${EDITOR}[data-editor-state="ready"][data-chart-type="column"]`),
  ).toBeVisible();
  await page.getByRole('button', { name: '隐藏使用代码' }).click();

  const handles = page.locator('[data-node-kind="contribution"] button[aria-label^="拖动 "]');
  await expect(handles).toHaveCount(200);
  const canvas = page.getByTestId('tellplot-chart').locator('canvas').first();
  await expect(canvas).toBeVisible();
  await expect.poll(() => paintedPixelCount(canvas)).toBeGreaterThan(500);
  await expect.poll(() => barSlots(canvas)).toHaveLength(200);
  await page.waitForTimeout(180); // Exclude the default 160ms entrance transition from hit testing.
  await page.evaluate(() => {
    const performanceWindow = window as PerformanceWindow;
    performanceWindow.__tellplotPointerLifecycle = [];
    for (const type of ['lostpointercapture', 'pointercancel', 'pointerup'] as const) {
      document.addEventListener(
        type,
        event => {
          performanceWindow.__tellplotPointerLifecycle?.push(
            `${type}:${String(event.pointerId)}:${String(event.buttons)}:${(event.target as Element | null)?.tagName ?? 'none'}`,
          );
        },
        { capture: true },
      );
    }
  });
  const slots = await barSlots(canvas);
  const first = slots[0];
  const second = slots[1];
  const third = slots[2];
  expect(first).toBeDefined();
  expect(second).toBeDefined();
  expect(third).toBeDefined();
  if (first === undefined || second === undefined || third === undefined) {
    return;
  }
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  if (canvasBox === null || canvasBox.width <= 0) {
    return;
  }
  const signatureRegion: CanvasSignatureRegion = {
    minXRatio: Math.max(0, (first.minX - canvasBox.x - 2) / canvasBox.width),
    maxXRatio: Math.min(1, (third.maxX - canvasBox.x + 2) / canvasBox.width),
  };

  const firstY = await yInsideBar(canvas, first.x);
  const secondCollisionDelta = Math.max(4.5, second.minX - first.maxX + 0.5);
  const thirdCollisionX = first.x + (third.minX - first.maxX);
  const stableAfterStartX = first.x + secondCollisionDelta;
  const stableAfterEndX = Math.min(stableAfterStartX + 0.5, thirdCollisionX - 0.25);
  expect(stableAfterEndX).toBeGreaterThan(stableAfterStartX);
  await page.mouse.move(first.x, firstY);
  await page.mouse.down();
  await page.mouse.move(stableAfterStartX, firstY, { steps: 8 });
  await expect(page.getByTestId('tellplot-chart')).toHaveAttribute('data-drop-indicator', 'after');
  const overlay = page.getByTestId('chart-drag-overlay');
  await expect(overlay).toBeVisible();
  const transformBefore = await overlay.evaluate(element => getComputedStyle(element).transform);
  await page.waitForTimeout(180);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  const commitsBefore = await page.evaluate(
    () => (window as PerformanceWindow).__tellplotRootCommits ?? -1,
  );
  expect(commitsBefore).toBeGreaterThan(0);
  await page.mouse.move(stableAfterEndX, firstY, { steps: 100 });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  const commitsAfter = await page.evaluate(
    () => (window as PerformanceWindow).__tellplotRootCommits ?? -1,
  );
  const lifecycle = await page.evaluate(
    () => (window as PerformanceWindow).__tellplotPointerLifecycle ?? [],
  );
  expect(await overlay.count(), `active overlay lifecycle: ${JSON.stringify(lifecycle)}`).toBe(1);
  const transformAfter = await overlay.evaluate(element => getComputedStyle(element).transform);
  expect(transformAfter).not.toBe(transformBefore);
  expect(commitsAfter - commitsBefore).toBe(0);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '0');
  await expect(page.getByTestId('tellplot-chart-stage')).toHaveAttribute(
    'data-render-state',
    'ready',
  );

  await installLatencyProbe(page);
  const keyboardMover = page.locator('[role="treeitem"][data-node-id="category-001"]');
  for (let sample = 0; sample < SAMPLE_COUNT; sample += 1) {
    const expectsSwappedOrder = sample % 2 === 0;
    const nextRevision = sample + 1;
    const expectedPrefix = expectsSwappedOrder
      ? ['category-002', 'category-001', 'category-003']
      : ['category-001', 'category-002', 'category-003'];
    await keyboardMover.focus();
    const previousSignature = await waitForStableCanvas(canvas, signatureRegion);
    await armFirstVisibleCanvasUpdate(canvas, previousSignature, signatureRegion, {
      expectedRevision: nextRevision,
      expectedPrefix,
      expectedKey: expectsSwappedOrder ? 'ArrowDown' : 'ArrowUp',
    });
    await page.keyboard.press(expectsSwappedOrder ? 'Alt+ArrowDown' : 'Alt+ArrowUp');
    await waitForFirstVisibleCanvasUpdate(page);
    await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', String(nextRevision));
    expect(await rootContributionPrefix(page)).toEqual(expectedPrefix);
    await expect(page.getByTestId('tellplot-chart-stage')).toHaveAttribute(
      'data-render-state',
      'ready',
    );
  }

  const samples = await page.evaluate(
    () => (window as PerformanceWindow).__tellplotPerf?.samples ?? [],
  );
  expect(samples).toHaveLength(SAMPLE_COUNT);
  const sorted = [...samples].sort((left, right) => left - right);
  const p95 = sorted[Math.ceil(0.95 * sorted.length) - 1];
  await test.info().attach('categorical-performance-samples.json', {
    body: Buffer.from(
      JSON.stringify(
        {
          chartFamily: 'categorical',
          visibleCategories: 200,
          sampleCount: samples.length,
          formula: 'sorted[ceil(.95*n)-1]',
          samples,
          p95,
          p95BudgetMs: PERFORMANCE_P95_BUDGET_MS,
          sameTargetRootCommitDelta: commitsAfter - commitsBefore,
          pointerLifecycle: lifecycle,
        },
        null,
        2,
      ),
    ),
    contentType: 'application/json',
  });
  console.log(
    `[performance] categorical-canvas p95=${String(p95)}ms, budget=${String(PERFORMANCE_P95_BUDGET_MS)}ms, samples=${samples.length}, same-target-root-commit-delta=${commitsAfter - commitsBefore}`,
  );
  expect(p95 ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(PERFORMANCE_P95_BUDGET_MS);
});

test('200x2 comparison records keyboard and direct commit-to-painted-frame p95', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await installReactCommitProbe(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/playground?fixture=comparison-performance');
  await expect(
    page.locator(`${EDITOR}[data-editor-state="ready"][data-chart-type="column"]`),
  ).toBeVisible();
  await page.getByRole('button', { name: '隐藏使用代码' }).click();

  const handles = page.locator('[role="treeitem"][aria-level="1"] button[aria-label^="拖动 "]');
  await expect(handles).toHaveCount(200);
  const canvas = page.getByTestId('tellplot-chart').locator('canvas').first();
  await expect(canvas).toBeVisible();
  await expect.poll(() => paintedPixelCount(canvas)).toBeGreaterThan(500);
  await expect
    .poll(async () => (await comparisonIntervalSlots(canvas)).length)
    .toBeGreaterThanOrEqual(6);
  await page.waitForTimeout(200); // Keep the required initial G2 animation outside samples.

  const initialSlots = await comparisonIntervalSlots(canvas);
  const first = initialSlots[0];
  const secondCategory = initialSlots[2];
  const thirdCategory = initialSlots[4];
  expect(first).toBeDefined();
  expect(secondCategory).toBeDefined();
  expect(thirdCategory).toBeDefined();
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  if (
    first === undefined ||
    secondCategory === undefined ||
    thirdCategory === undefined ||
    canvasBox === null ||
    canvasBox.width <= 0
  ) {
    return;
  }
  const signatureRegion: CanvasSignatureRegion = {
    minXRatio: Math.max(0, (first.minX - canvasBox.x - 2) / canvasBox.width),
    maxXRatio: Math.min(1, (thirdCategory.maxX - canvasBox.x + 2) / canvasBox.width),
  };
  await waitForStableCanvas(canvas, signatureRegion);

  const mover = page.locator(
    '[role="treeitem"][aria-level="1"][data-node-id="comparison-perf-001"]',
  );
  await mover.focus();
  await page.keyboard.press('Alt+ArrowDown'); // Required warm-up before collection.
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '1');
  await expect
    .poll(() => comparisonCategoryPrefix(page))
    .toEqual(['comparison-perf-002', 'comparison-perf-001', 'comparison-perf-003']);
  await waitForStableCanvas(canvas, signatureRegion);

  await installComparisonLatencyProbe(page);
  const keyboardReceipts: ComparisonPaintSample[] = [];
  for (let sampleIndex = 0; sampleIndex < SAMPLE_COUNT; sampleIndex += 1) {
    const restoreSourceOrder = sampleIndex % 2 === 0;
    const expectedPrefix = restoreSourceOrder
      ? ['comparison-perf-001', 'comparison-perf-002', 'comparison-perf-003']
      : ['comparison-perf-002', 'comparison-perf-001', 'comparison-perf-003'];
    const expectedRevision = sampleIndex + 2;
    await mover.focus();
    const comparisonPreviousSignature = await waitForStableCanvas(canvas, signatureRegion);
    await armComparisonPaintUpdate(canvas, comparisonPreviousSignature, signatureRegion, {
      sampleIndex,
      expectedRevision,
      expectedPrefix,
    });
    await page.keyboard.press(restoreSourceOrder ? 'Alt+ArrowUp' : 'Alt+ArrowDown');
    keyboardReceipts.push(await waitForComparisonPaintUpdate(page));
    await expect(page.locator(EDITOR)).toHaveAttribute(
      'data-view-revision',
      String(expectedRevision),
    );
  }

  const slots = await comparisonIntervalSlots(canvas);
  const firstPosition = slots[0];
  const secondPosition = slots[2];
  const farPosition = slots[20];
  expect(firstPosition).toBeDefined();
  expect(secondPosition).toBeDefined();
  expect(farPosition).toBeDefined();
  if (firstPosition === undefined || secondPosition === undefined || farPosition === undefined) {
    return;
  }
  const sourceY = await yInsideComparisonInterval(canvas, secondPosition.x);
  const sourceHit = await findComparisonDirectHit(page, secondPosition.x, sourceY, farPosition.x);
  const categorySpacing = secondPosition.x - firstPosition.x;
  await expect(page.getByTestId('tellplot-chart-stage')).toHaveAttribute(
    'data-render-state',
    'ready',
  );
  await waitForStableCanvas(canvas, signatureRegion);
  await page.mouse.move(sourceHit.x, sourceHit.y);
  await page.mouse.down();
  await page.mouse.move(farPosition.x, sourceHit.y, { steps: 3 });
  await page.mouse.move(firstPosition.x, sourceHit.y, { steps: 3 });
  await expect(page.locator(`${EDITOR}[data-interaction-state="dragging"]`)).toBeVisible();
  await waitForStableCanvas(canvas, signatureRegion);
  const rootCommitsBeforePreview = await page.evaluate(
    () => (window as PerformanceWindow).__tellplotRootCommits ?? -1,
  );
  expect(rootCommitsBeforePreview).toBeGreaterThan(0);
  await page.evaluate(() => {
    const performanceWindow = window as PerformanceWindow;
    const nativeRequest = window.requestAnimationFrame.bind(window);
    const nativeCancel = window.cancelAnimationFrame.bind(window);
    performanceWindow.__tellplotRafCoalescing = { requested: 0, cancelled: 0, callbacks: 0 };
    window.requestAnimationFrame = callback => {
      const receipt = performanceWindow.__tellplotRafCoalescing;
      if (receipt !== undefined) receipt.requested += 1;
      return nativeRequest(timestamp => {
        if (receipt !== undefined) receipt.callbacks += 1;
        callback(timestamp);
      });
    };
    window.cancelAnimationFrame = handle => {
      const receipt = performanceWindow.__tellplotRafCoalescing;
      if (receipt !== undefined) receipt.cancelled += 1;
      nativeCancel(handle);
    };
  });
  await page.evaluate(
    ({ x, y }) => {
      for (let index = 0; index < 48; index += 1) {
        document.dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            buttons: 1,
            clientX: x + ((index % 3) - 1) * 0.2,
            clientY: y,
            pointerId: 1,
            pointerType: 'mouse',
          }),
        );
      }
    },
    { x: firstPosition.x, y: sourceHit.y },
  );
  await page.waitForTimeout(50);
  const rootCommitsAfterPreview = await page.evaluate(
    () => (window as PerformanceWindow).__tellplotRootCommits ?? -1,
  );
  const rafCoalescing = await page.evaluate(
    () => (window as PerformanceWindow).__tellplotRafCoalescing,
  );
  expect(rootCommitsAfterPreview - rootCommitsBeforePreview).toBe(0);
  expect(rafCoalescing?.requested ?? 0).toBeGreaterThanOrEqual(48);
  expect(rafCoalescing?.cancelled ?? 0).toBeGreaterThan(0);
  expect(rafCoalescing?.callbacks ?? Number.POSITIVE_INFINITY).toBeLessThan(
    rafCoalescing?.requested ?? 0,
  );
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '31');
  await waitForStableCanvas(canvas, signatureRegion);

  await installComparisonLatencyProbe(page);
  const directReceipts: ComparisonPaintSample[] = [];
  for (let sampleIndex = 0; sampleIndex < SAMPLE_COUNT; sampleIndex += 1) {
    const restoreSourceOrder = sampleIndex % 2 === 0;
    const sourceX = restoreSourceOrder ? sourceHit.x : sourceHit.x - categorySpacing;
    const target = restoreSourceOrder ? firstPosition : secondPosition;
    const expectedPrefix = restoreSourceOrder
      ? ['comparison-perf-001', 'comparison-perf-002', 'comparison-perf-003']
      : ['comparison-perf-002', 'comparison-perf-001', 'comparison-perf-003'];
    const expectedRevision = sampleIndex + 32;
    await expect(page.getByTestId('tellplot-chart-stage')).toHaveAttribute(
      'data-render-state',
      'ready',
    );
    const comparisonPreviousSignature = await waitForStableCanvas(canvas, signatureRegion);
    await armComparisonPaintUpdate(canvas, comparisonPreviousSignature, signatureRegion, {
      sampleIndex,
      expectedRevision,
      expectedPrefix,
    });
    await page.mouse.move(sourceX, sourceHit.y);
    await page.mouse.down();
    await page.mouse.move(farPosition.x, sourceHit.y, { steps: 2 });
    await page.mouse.move(target.x, sourceHit.y, { steps: 2 });
    await expect(page.locator(`${EDITOR}[data-interaction-state="dragging"]`)).toBeVisible();
    await page.mouse.up();
    directReceipts.push(await waitForComparisonPaintUpdate(page));
    await expect(page.locator(EDITOR)).toHaveAttribute(
      'data-view-revision',
      String(expectedRevision),
    );
  }

  const keyboardSamples = keyboardReceipts.map(receipt => receipt.elapsedMs);
  const directSamples = directReceipts.map(receipt => receipt.elapsedMs);
  const p95 = (samples: readonly number[]): number | undefined =>
    [...samples].sort((left, right) => left - right)[Math.ceil(0.95 * samples.length) - 1];
  const keyboardP95 = p95(keyboardSamples);
  const directP95 = p95(directSamples);
  expect(keyboardSamples).toHaveLength(SAMPLE_COUNT);
  expect(directSamples).toHaveLength(SAMPLE_COUNT);
  expect(keyboardP95 ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(PERFORMANCE_P95_BUDGET_MS);
  expect(directP95 ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(PERFORMANCE_P95_BUDGET_MS);

  const evidence = {
    schemaVersion: 1,
    chartFamily: 'categorical-comparison',
    fixtureShape: {
      categories: 200,
      series: 2,
      visibleMarks: 400,
      rasterDistinctColoredSlots: (await comparisonIntervalSlots(canvas)).length,
    },
    viewport: { width: 1440, height: 900 },
    runtime: process.version,
    project: test.info().project.name,
    warmupCommands: 1,
    formula: 'sorted[ceil(.95*n)-1]',
    budgetMs: PERFORMANCE_P95_BUDGET_MS,
    preview: {
      rootCommitDelta: rootCommitsAfterPreview - rootCommitsBeforePreview,
      raf: rafCoalescing,
    },
    groups: [
      {
        input: 'keyboard',
        sampleCount: keyboardSamples.length,
        samplesMs: keyboardSamples,
        p95Ms: keyboardP95,
        paintedReceipts: keyboardReceipts,
      },
      {
        input: 'direct-pointer',
        sampleCount: directSamples.length,
        samplesMs: directSamples,
        p95Ms: directP95,
        paintedReceipts: directReceipts,
      },
    ],
  };
  const evidencePath = process.env['TELLPLOT_T141_PERFORMANCE_EVIDENCE_PATH'];
  if (evidencePath !== undefined) {
    await writeFile(resolve(process.cwd(), evidencePath), `${JSON.stringify(evidence, null, 2)}\n`);
  }
  await test.info().attach('comparison-performance-samples.json', {
    body: Buffer.from(JSON.stringify(evidence, null, 2)),
    contentType: 'application/json',
  });
  console.log(
    `[performance] comparison keyboard-p95=${String(keyboardP95)}ms direct-p95=${String(directP95)}ms budget=${String(PERFORMANCE_P95_BUDGET_MS)}ms samples=${SAMPLE_COUNT}+${SAMPLE_COUNT} preview-root-commit-delta=${rootCommitsAfterPreview - rootCommitsBeforePreview}`,
  );
});
