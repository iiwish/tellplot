import { expect, test, type Locator, type Page } from '@playwright/test';

const EDITOR = '[data-tellplot="editor"]';
const SAMPLE_COUNT = 30;

interface BarSlot {
  readonly x: number;
  readonly minX: number;
  readonly maxX: number;
}

interface CanvasSignatureRegion {
  readonly minXRatio: number;
  readonly maxXRatio: number;
}

interface PerformanceWindow extends Window {
  __tellplotRootCommits?: number;
  __tellplotPointerMoves?: number;
  __tellplotPerf?: {
    samples: number[];
    start: number | null;
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
        const name =
          typeof type === 'function'
            ? type.name
            : typeof typeObject?.displayName === 'string'
              ? typeObject.displayName
              : typeof typeObject?.name === 'string'
                ? typeObject.name
                : '';
        if (name === 'FinancialChartEditor') {
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
      [95, 107, 101],
      [22, 131, 99],
      [213, 82, 74],
      [49, 92, 140],
      [164, 104, 18],
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
        [95, 107, 101],
        [22, 131, 99],
        [213, 82, 74],
        [49, 92, 140],
        [164, 104, 18],
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
      start: null,
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

async function recordFirstVisibleCanvasUpdate(
  canvas: Locator,
  previousSignature: number,
  region: CanvasSignatureRegion,
): Promise<number> {
  return canvas.evaluate(
    (element, input) => {
      if (!(element instanceof HTMLCanvasElement)) {
        throw new Error('Performance target is not a canvas');
      }
      const context = element.getContext('2d');
      const metric = (window as PerformanceWindow).__tellplotPerf;
      if (context === null || metric === undefined || metric.start === null) {
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
      const startedAt = metric.start;
      return new Promise<number>((resolve, reject) => {
        const deadline = startedAt + 1_000;
        const inspect = (): void => {
          const inspectedAt = performance.now();
          if (signature() !== input.expectedSignature) {
            const elapsed = inspectedAt - startedAt;
            metric.samples.push(elapsed);
            metric.start = null;
            resolve(elapsed);
            return;
          }
          if (inspectedAt >= deadline) {
            reject(new Error('Canvas did not expose a new painted frame within 1000ms'));
            return;
          }
          requestAnimationFrame(inspect);
        };
        requestAnimationFrame(inspect);
      });
    },
    { expectedSignature: previousSignature, region },
  );
}

async function rootContributionPrefix(page: Page): Promise<readonly string[]> {
  return page
    .getByRole('tree', { name: '结构大纲' })
    .locator('[role="treeitem"][aria-level="1"][data-node-kind="contribution"]')
    .evaluateAll(rows =>
      rows.slice(0, 3).map(row => row.getAttribute('data-node-id') ?? 'missing-node-id'),
    );
}

test('200-item chart keeps pointer feedback outside React and meets commit p95', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await installReactCommitProbe(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?fixture=performance');
  await expect(page.locator(`${EDITOR}[data-editor-state="ready"]`)).toBeVisible();

  const handles = page.locator('[data-node-kind="contribution"] button[aria-label^="拖动 "]');
  await expect(handles).toHaveCount(200);
  const canvas = page.getByTestId('tellplot-chart').locator('canvas').first();
  await expect(canvas).toBeVisible();
  await expect.poll(() => paintedPixelCount(canvas)).toBeGreaterThan(500);
  await expect.poll(() => barSlots(canvas)).toHaveLength(202);
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
  await page.waitForTimeout(180);
  await expect.poll(() => barSlots(canvas)).toHaveLength(202);

  await installLatencyProbe(page);
  const keyboardMover = page.locator('[role="treeitem"][data-node-id="perf-001"]');
  for (let sample = 0; sample < SAMPLE_COUNT; sample += 1) {
    const expectsSwappedOrder = sample % 2 === 0;
    const nextRevision = sample + 1;

    await keyboardMover.focus();
    const previousSignature = await canvasPixelSignature(canvas, signatureRegion);
    await page.evaluate(() => {
      const metric = (window as PerformanceWindow).__tellplotPerf;
      if (metric !== undefined) {
        metric.start = performance.now();
      }
    });
    await page.keyboard.press(expectsSwappedOrder ? 'Alt+ArrowDown' : 'Alt+ArrowUp');
    await recordFirstVisibleCanvasUpdate(canvas, previousSignature, signatureRegion);
    await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', String(nextRevision));
    const expectedPrefix = expectsSwappedOrder
      ? ['perf-002', 'perf-001', 'perf-003']
      : ['perf-001', 'perf-002', 'perf-003'];
    expect(await rootContributionPrefix(page)).toEqual(expectedPrefix);
    expect(
      await page.evaluate(() => (window as PerformanceWindow).__tellplotPerf?.samples.length ?? 0),
    ).toBe(nextRevision);
    await page.waitForTimeout(180);
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
          sameTargetRootCommitDelta: commitsAfter - commitsBefore,
        },
        null,
        2,
      ),
    ),
    contentType: 'application/json',
  });
  console.log(
    `[performance] visible-canvas p95=${String(p95)}ms, samples=${samples.length}, same-target-root-commit-delta=${commitsAfter - commitsBefore}`,
  );
  expect(p95 ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(150);
});
