import { expect, test, type Locator, type Page } from '@playwright/test';

const EDITOR = '[data-tellplot="editor"]';
const COMMAND_FEEDBACK = '.tp-command-feedback';
const EXPECTED_CHART_BAR_COUNT = 12;
const MULTI_SELECT_MODIFIER: 'Meta' | 'Control' =
  process.platform === 'darwin' ? 'Meta' : 'Control';

async function openEditor(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator(`${EDITOR}[data-editor-state="ready"]`)).toBeVisible();
}

async function rootOrder(page: Page): Promise<readonly string[]> {
  return page
    .getByRole('tree', { name: '结构大纲' })
    .locator('[role="treeitem"][aria-level="1"][data-node-id]')
    .evaluateAll(rows =>
      rows
        .map(row => row.getAttribute('data-node-id'))
        .filter((nodeId): nodeId is string => nodeId !== null),
    );
}

async function startOutlineDrag(page: Page): Promise<void> {
  const handle = page.getByRole('button', { name: '拖动 销量增长' });
  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) {
    return;
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 14, box.y + box.height / 2 + 8, {
    steps: 4,
  });
  await expect(page.locator(`${EDITOR}[data-interaction-state="dragging"]`)).toBeVisible();
  await expect(page.getByTestId('outline-drag-overlay')).toBeVisible();
}

async function expectCancelledAndReusable(
  page: Page,
  baselineOrder: readonly string[],
): Promise<void> {
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '0');
  await expect(page.locator(EDITOR)).toHaveAttribute('data-interaction-state', 'idle');
  await expect(page.getByTestId('outline-drag-overlay')).toHaveCount(0);
  await expect(page.locator('[data-drop-indicator]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '撤销' })).toBeDisabled();
  expect(await rootOrder(page)).toEqual(baselineOrder);
  await expect(page.locator(COMMAND_FEEDBACK)).toContainText('已取消');
  await page.mouse.up();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '0');

  const row = page.getByRole('treeitem', { name: /销量增长/ });
  await row.focus();
  await page.keyboard.press('Alt+ArrowDown');
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '1');
}

const outlineCancelCases: readonly {
  readonly name: string;
  readonly cancel: (page: Page) => Promise<void>;
}[] = [
  {
    name: 'Escape',
    cancel: page => page.keyboard.press('Escape'),
  },
  {
    name: 'window blur',
    cancel: async page => {
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    },
  },
  {
    name: 'pointercancel',
    cancel: async page => {
      await page.evaluate(() => {
        document.dispatchEvent(
          new PointerEvent('pointercancel', { bubbles: true, cancelable: true, pointerId: 1 }),
        );
      });
    },
  },
  {
    name: 'release outside every semantic target',
    cancel: async page => {
      await page.mouse.move(2, 2, { steps: 4 });
      await page.mouse.up();
    },
  },
];

for (const cancelCase of outlineCancelCases) {
  test(`active outline drag ${cancelCase.name} is identity-preserving and immediately reusable`, async ({
    page,
  }) => {
    await openEditor(page);
    const baselineOrder = await rootOrder(page);
    await startOutlineDrag(page);
    await cancelCase.cancel(page);
    await expectCancelledAndReusable(page, baselineOrder);
  });
}

async function chartBarPoints(canvas: Locator): Promise<readonly { x: number; y: number }[]> {
  const localPoints = await canvas.evaluate((element, expectedBarCount) => {
    if (!(element instanceof HTMLCanvasElement)) {
      return [];
    }
    const context = element.getContext('2d');
    if (context === null) {
      return [];
    }
    const palette = [
      [95, 107, 101],
      [22, 131, 99],
      [213, 82, 74],
      [49, 92, 140],
      [164, 104, 18],
    ];
    const pixels = context.getImageData(0, 0, element.width, element.height).data;
    const ysByX: number[][] = Array.from({ length: element.width }, () => []);
    for (let x = 0; x < element.width; x += 1) {
      for (let y = 0; y < element.height; y += 1) {
        const offset = (y * element.width + x) * 4;
        const red = pixels[offset] ?? 0;
        const green = pixels[offset + 1] ?? 0;
        const blue = pixels[offset + 2] ?? 0;
        const alpha = pixels[offset + 3] ?? 0;
        if (
          alpha > 120 &&
          palette.some(
            ([r, g, b]) =>
              Math.abs(red - r) <= 8 && Math.abs(green - g) <= 8 && Math.abs(blue - b) <= 8,
          )
        ) {
          ysByX[x]?.push(y);
        }
      }
    }
    const clusters: { minX: number; maxX: number }[] = [];
    for (let x = 0; x < ysByX.length; x += 1) {
      if ((ysByX[x]?.length ?? 0) < 3) {
        continue;
      }
      const current = clusters.at(-1);
      if (current === undefined || x > current.maxX + 1) {
        clusters.push({ minX: x, maxX: x });
      } else {
        current.maxX = x;
      }
    }
    const paintedClusters = clusters.filter(cluster => cluster.maxX - cluster.minX >= 4);
    const first = paintedClusters[0];
    const last = paintedClusters.at(-1);
    if (first === undefined || last === undefined) {
      return [];
    }
    const firstCenter = (first.minX + first.maxX) / 2;
    const lastCenter = (last.minX + last.maxX) / 2;
    const spacing = (lastCenter - firstCenter) / (expectedBarCount - 1);

    return Array.from({ length: expectedBarCount }, (_, index) => {
      const center = firstCenter + spacing * index;
      const minBandX = Math.max(0, Math.floor(center - spacing / 2));
      const maxBandX = Math.min(ysByX.length - 1, Math.ceil(center + spacing / 2));
      const paintedXs: number[] = [];
      for (let x = minBandX; x <= maxBandX; x += 1) {
        if ((ysByX[x]?.length ?? 0) >= 3) {
          paintedXs.push(x);
        }
      }
      const x = paintedXs[Math.floor(paintedXs.length / 2)];
      const ys = x === undefined ? undefined : ysByX[x];
      if (x === undefined || ys === undefined || ys.length === 0) {
        return undefined;
      }
      return { x, y: ys[Math.floor(ys.length / 2)] ?? 0 };
    }).filter((point): point is { x: number; y: number } => point !== undefined);
  }, EXPECTED_CHART_BAR_COUNT);
  const box = await canvas.boundingBox();
  const size = await canvas.evaluate(element => ({
    width: element instanceof HTMLCanvasElement ? element.width : 0,
    height: element instanceof HTMLCanvasElement ? element.height : 0,
  }));
  if (box === null || size.width === 0 || size.height === 0) {
    return [];
  }
  return localPoints.map(point => ({
    x: box.x + (point.x / size.width) * box.width,
    y: box.y + (point.y / size.height) * box.height,
  }));
}

interface ActiveChartDrag {
  readonly canvas: Locator;
  readonly pointerId: number;
}

async function startChartDrag(page: Page): Promise<ActiveChartDrag> {
  const canvas = page.getByTestId('tellplot-chart').locator('canvas').first();
  await expect.poll(() => chartBarPoints(canvas)).toHaveLength(12);
  const points = await chartBarPoints(canvas);
  const source = points[1];
  const target = points[2];
  expect(source).toBeDefined();
  expect(target).toBeDefined();
  if (source === undefined || target === undefined) {
    return { canvas, pointerId: 1 };
  }

  await canvas.evaluate(element => {
    element.addEventListener(
      'pointerdown',
      event => {
        element.dataset['testPointerId'] = String(event.pointerId);
      },
      { capture: true, once: true },
    );
  });
  await page.mouse.move(source.x, source.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 6 });
  await expect(page.locator(`${EDITOR}[data-interaction-state="dragging"]`)).toBeVisible();
  const pointerId = Number(await canvas.getAttribute('data-test-pointer-id'));
  expect(Number.isInteger(pointerId)).toBe(true);
  return { canvas, pointerId };
}

const chartCancelCases: readonly {
  readonly name: string;
  readonly cancel: (page: Page, drag: ActiveChartDrag) => Promise<void>;
}[] = [
  { name: 'Escape', cancel: page => page.keyboard.press('Escape') },
  {
    name: 'window blur',
    cancel: async page => {
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    },
  },
  {
    name: 'pointercancel',
    cancel: async (_page, drag) => {
      await drag.canvas.dispatchEvent('pointercancel', { pointerId: drag.pointerId });
    },
  },
  {
    name: 'release without a semantic target',
    cancel: async page => {
      await page.mouse.move(2, 2, { steps: 4 });
      await page.mouse.up();
    },
  },
];

for (const cancelCase of chartCancelCases) {
  test(`active chart drag ${cancelCase.name} releases capture without mutation`, async ({
    page,
  }) => {
    await openEditor(page);
    const baselineOrder = await rootOrder(page);
    const drag = await startChartDrag(page);
    await cancelCase.cancel(page, drag);
    await expect(page.locator(EDITOR)).toHaveAttribute('data-interaction-state', 'idle');
    await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '0');
    await expect(page.getByTestId('chart-drag-overlay')).toHaveCount(0);
    await expect(page.locator('[data-drop-indicator]')).toHaveCount(0);
    expect(await rootOrder(page)).toEqual(baselineOrder);
    await expect
      .poll(() =>
        drag.canvas.evaluate(
          (element, pointerId) => !element.hasPointerCapture(pointerId),
          drag.pointerId,
        ),
      )
      .toBe(true);
    await page.mouse.up();
    await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '0');

    await page.getByRole('treeitem', { name: /销量增长/ }).focus();
    await page.keyboard.press('Alt+ArrowDown');
    await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '1');
  });
}

test('start, operating subtotal, and end chart marks never open a pointer session', async ({
  page,
}) => {
  const consoleMessages: string[] = [];
  page.on('console', message => consoleMessages.push(message.text()));
  const anchors = [
    { name: 'start', index: 0 },
    { name: 'operating subtotal', index: 7 },
    { name: 'end', index: 11 },
  ] as const;

  for (const anchor of anchors) {
    await test.step(`${anchor.name} independently reports ITEM_LOCKED`, async () => {
      await openEditor(page);
      const canvas = page.getByTestId('tellplot-chart').locator('canvas').first();
      await expect.poll(() => chartBarPoints(canvas)).toHaveLength(12);
      const points = await chartBarPoints(canvas);
      const fixedMark = points[anchor.index];
      expect(fixedMark).toBeDefined();
      if (fixedMark === undefined) {
        return;
      }

      await expect(page.locator(COMMAND_FEEDBACK)).not.toContainText('ITEM_LOCKED');
      await page.mouse.move(fixedMark.x, fixedMark.y);
      await page.mouse.down();
      await page.mouse.move(fixedMark.x + 6, fixedMark.y, { steps: 3 });
      await page.mouse.up();

      await expect(page.locator(COMMAND_FEEDBACK)).toContainText('ITEM_LOCKED');
      await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '0');
      await expect(page.locator(EDITOR)).toHaveAttribute('data-interaction-state', 'idle');
      await expect(page.getByTestId('chart-drag-overlay')).toHaveCount(0);
    });
  }
  const logged = consoleMessages.join('\n');
  expect(logged).not.toContain('期初营业利润');
  expect(logged).not.toContain('3,200');
  expect(logged).not.toContain('sourceRef');
});

test('fixed and cross-segment keyboard attempts reject privately without a commit', async ({
  page,
}) => {
  const consoleMessages: string[] = [];
  page.on('console', message => consoleMessages.push(message.text()));
  await openEditor(page);
  const baselineOrder = await rootOrder(page);

  const opening = page.getByRole('treeitem', { name: /期初营业利润/ });
  await opening.focus();
  await expect(opening).toBeFocused();
  await opening.press('Alt+ArrowDown');
  await expect(page.locator(COMMAND_FEEDBACK)).toContainText('ITEM_LOCKED');
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '0');

  const labor = page.getByRole('treeitem', { name: /人工成本/ });
  await labor.focus();
  await expect(labor).toBeFocused();
  await labor.press('Alt+ArrowDown');
  await expect(page.locator(COMMAND_FEEDBACK)).toContainText('INVALID_DROP_TARGET');
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '0');
  expect(await rootOrder(page)).toEqual(baselineOrder);

  const logged = consoleMessages.join('\n');
  expect(logged).not.toContain('期初营业利润');
  expect(logged).not.toContain('人工成本');
  expect(logged).not.toContain('3,200');
  expect(logged).not.toContain('sourceRef');
  await expect(page.locator(COMMAND_FEEDBACK)).not.toContainText('人工成本');
});

test('cross-segment outline pointer drop is rejected without a history entry', async ({ page }) => {
  await openEditor(page);
  const baselineOrder = await rootOrder(page);
  const handle = page.getByRole('button', { name: '拖动 人工成本' });
  const target = page.getByRole('treeitem', { name: /汇率影响/ });
  const handleBox = await handle.boundingBox();
  const targetBox = await target.boundingBox();
  expect(handleBox).not.toBeNull();
  expect(targetBox).not.toBeNull();
  if (handleBox === null || targetBox === null) {
    return;
  }

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height - 3, {
    steps: 8,
  });
  await expect(target).toHaveAttribute('data-drop-indicator', 'after');
  await expect(page.getByTestId('tellplot-chart')).toHaveAttribute('data-drop-indicator', 'after');
  await page.mouse.up();

  await expect(page.locator(COMMAND_FEEDBACK)).toContainText('INVALID_DROP_TARGET');
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '0');
  await expect(page.getByRole('button', { name: '撤销' })).toBeDisabled();
  expect(await rootOrder(page)).toEqual(baselineOrder);
});

test('moving a child out of a two-item group is rejected without weakening the group', async ({
  page,
}) => {
  await openEditor(page);
  await page.getByRole('treeitem', { name: /销量增长/ }).click();
  await page
    .getByRole('treeitem', { name: /价格提升/ })
    .click({ modifiers: [MULTI_SELECT_MODIFIER] });
  await page.getByRole('textbox', { name: '分组名称' }).fill('增长驱动');
  await page.getByRole('button', { name: '创建分组' }).click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '1');
  const groupedOrder = await rootOrder(page);

  const priceRow = page.getByRole('treeitem', { name: /价格提升/ });
  await priceRow.focus();
  await page.keyboard.press('Alt+ArrowLeft');
  await expect(page.locator(COMMAND_FEEDBACK)).toContainText('INVALID_DROP_TARGET');
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '1');
  expect(await rootOrder(page)).toEqual(groupedOrder);
  await expect(page.getByRole('treeitem', { name: /增长驱动/ })).toHaveAttribute(
    'data-source-count',
    '2',
  );
});
