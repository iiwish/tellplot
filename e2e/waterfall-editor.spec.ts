import { expect, test, type Locator, type Page } from '@playwright/test';

import { activateInspectorPanel, activateOutlinePanel } from './editorPanels';

const EDITOR = '[data-tellplot="editor"]';
const COMMAND_FEEDBACK = '.tp-command-feedback';
const EXPECTED_CHART_BAR_COUNT = 12;
const MULTI_SELECT_MODIFIER: 'Meta' | 'Control' =
  process.platform === 'darwin' ? 'Meta' : 'Control';

interface BarPoint {
  readonly x: number;
  readonly y: number;
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

async function openEditor(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/playground');
  await expect(page.locator(`${EDITOR}[data-editor-state="ready"]`)).toBeVisible();
  await expect(page.getByTestId('tellplot-chart').locator('canvas').first()).toBeVisible();
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

async function serializedViewSpecBytes(page: Page): Promise<Buffer> {
  const guide = page.getByRole('complementary', { name: '在项目中使用 TellPlot' });
  await guide.getByRole('tab', { name: '视图状态' }).click();
  const input = page.getByRole('textbox', { name: 'TellPlot 视图状态' });
  await expect(input).toBeVisible();
  return Buffer.from(await input.inputValue());
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

async function canvasPixelHash(canvas: Locator): Promise<number> {
  return canvas.evaluate(element => {
    if (!(element instanceof HTMLCanvasElement)) {
      return 0;
    }
    const context = element.getContext('2d');
    if (context === null) {
      return 0;
    }
    const pixels = context.getImageData(0, 0, element.width, element.height).data;
    let hash = 2_166_136_261;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      hash ^= pixels[offset] ?? 0;
      hash = Math.imul(hash, 16_777_619);
      hash ^= pixels[offset + 1] ?? 0;
      hash = Math.imul(hash, 16_777_619);
      hash ^= pixels[offset + 2] ?? 0;
      hash = Math.imul(hash, 16_777_619);
      hash ^= pixels[offset + 3] ?? 0;
      hash = Math.imul(hash, 16_777_619);
    }
    return hash >>> 0;
  });
}

async function markCanvas(page: Page, token: string): Promise<Locator> {
  const canvas = page.getByTestId('tellplot-chart').locator('canvas').first();
  await expect(canvas).toBeVisible();
  await canvas.evaluate((element, identity) => {
    element.setAttribute('data-t106-canvas-identity', identity);
  }, token);
  return canvas;
}

async function expectCanvasRetained(canvas: Locator, token: string): Promise<void> {
  await expect(canvas).toHaveAttribute('data-t106-canvas-identity', token);
  await expect.poll(() => paintedPixelCount(canvas)).toBeGreaterThan(500);
}

async function dragOutlineAfter(
  page: Page,
  sourceLabel: string,
  targetLabel: string,
): Promise<void> {
  const source = page.getByRole('treeitem', { name: new RegExp(sourceLabel) });
  const target = page.getByRole('treeitem', { name: new RegExp(targetLabel) });
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();
  if (sourceBox === null || targetBox === null) {
    return;
  }

  const sourceBodyX = sourceBox.x + sourceBox.width * 0.62;
  await expect(source).toHaveCSS('cursor', 'grab');
  await page.mouse.move(sourceBodyX, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sourceBodyX + 12, sourceBox.y + sourceBox.height / 2, { steps: 3 });
  await expect(page.locator(`${EDITOR}[data-interaction-state="dragging"]`)).toBeVisible();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height - 3, {
    steps: 6,
  });
  await expect(target).toHaveAttribute('data-drop-indicator', 'after');
  const chartTarget = page.getByTestId('tellplot-chart');
  await expect(chartTarget).toHaveAttribute('data-drop-indicator', 'after');
  await expect(chartTarget).toHaveAttribute('data-preview-source', 'outline');
  expect(
    await chartTarget.evaluate(element =>
      element.style.getPropertyValue('--tp-chart-drop-x').trim(),
    ),
  ).not.toBe('');
  await page.mouse.up();
}

async function waterfallBarPoints(canvas: Locator): Promise<readonly BarPoint[]> {
  const localPoints = await canvas.evaluate((element, expectedBarCount) => {
    if (!(element instanceof HTMLCanvasElement)) {
      return [];
    }
    const context = element.getContext('2d');
    if (context === null || element.width === 0 || element.height === 0) {
      return [];
    }
    const palette = [
      [47, 124, 246],
      [18, 183, 106],
      [240, 68, 100],
      [20, 184, 166],
    ];
    const pixels = context.getImageData(0, 0, element.width, element.height).data;
    const ysByX: number[][] = Array.from({ length: element.width }, () => []);
    for (let y = 0; y < element.height; y += 1) {
      for (let x = 0; x < element.width; x += 1) {
        const offset = (y * element.width + x) * 4;
        const red = pixels[offset] ?? 0;
        const green = pixels[offset + 1] ?? 0;
        const blue = pixels[offset + 2] ?? 0;
        const alpha = pixels[offset + 3] ?? 0;
        const isBar =
          alpha > 120 &&
          palette.some(
            ([expectedRed, expectedGreen, expectedBlue]) =>
              Math.abs(red - expectedRed) <= 8 &&
              Math.abs(green - expectedGreen) <= 8 &&
              Math.abs(blue - expectedBlue) <= 8,
          );
        if (isBar) {
          ysByX[x]?.push(y);
        }
      }
    }

    const clusters: { minX: number; maxX: number; ys: number[] }[] = [];
    for (let x = 0; x < ysByX.length; x += 1) {
      const ys = ysByX[x] ?? [];
      if (ys.length < 3) {
        continue;
      }
      const current = clusters.at(-1);
      if (current === undefined || x > current.maxX + 1) {
        clusters.push({ minX: x, maxX: x, ys: [...ys] });
      } else {
        current.maxX = x;
        current.ys.push(...ys);
      }
    }

    const paintedClusters = clusters.filter(
      cluster => cluster.maxX - cluster.minX >= 4 && cluster.ys.length >= 20,
    );
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
      const minX = paintedXs[0];
      const maxX = paintedXs.at(-1);
      const sampleX = paintedXs[Math.floor(paintedXs.length / 2)];
      const sampleYs = sampleX === undefined ? undefined : ysByX[sampleX];
      if (
        minX === undefined ||
        maxX === undefined ||
        sampleX === undefined ||
        sampleYs === undefined ||
        sampleYs.length === 0
      ) {
        return undefined;
      }
      return {
        minX,
        maxX,
        minY: Math.min(...sampleYs),
        maxY: Math.max(...sampleYs),
        x: (minX + maxX) / 2,
        y: sampleYs[Math.floor(sampleYs.length / 2)] ?? 0,
      };
    }).filter(
      (
        point,
      ): point is {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
        x: number;
        y: number;
      } => point !== undefined,
    );
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
    minX: box.x + (point.minX / size.width) * box.width,
    maxX: box.x + (point.maxX / size.width) * box.width,
    minY: box.y + (point.minY / size.height) * box.height,
    maxY: box.y + (point.maxY / size.height) * box.height,
  }));
}

async function dragChartContributionAfter(page: Page): Promise<void> {
  const canvas = page.getByTestId('tellplot-chart').locator('canvas').first();
  await expect.poll(() => waterfallBarPoints(canvas)).toHaveLength(12);
  const points = await waterfallBarPoints(canvas);
  const source = points[1];
  const target = points[2];
  expect(source).toBeDefined();
  expect(target).toBeDefined();
  if (source === undefined || target === undefined) {
    return;
  }

  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  if (canvasBox === null) {
    return;
  }
  const pointerX = source.x + (target.minX - source.maxX) + 1;
  const pointerY = [canvasBox.y + 8, canvasBox.y + canvasBox.height - 8].find(
    y => y < target.minY || y > target.maxY,
  );
  expect(pointerX).toBeLessThan(target.minX);
  expect(pointerY).toBeDefined();
  if (pointerY === undefined) {
    return;
  }
  expect(pointerY < target.minY || pointerY > target.maxY).toBe(true);

  await page.mouse.move(source.x, source.y);
  await page.mouse.down();
  await page.mouse.move(pointerX, pointerY, { steps: 8 });
  await expect(page.locator(`${EDITOR}[data-interaction-state="dragging"]`)).toBeVisible();
  await expect(page.getByTestId('tellplot-chart')).toHaveAttribute('data-drop-indicator', 'after');
  await expect(page.getByRole('treeitem', { name: /价格提升/ })).toHaveAttribute(
    'data-drop-indicator',
    'after',
  );
  await page.mouse.up();
}

test('chart, outline, and keyboard produce the same post-removal move result', async ({ page }) => {
  await openEditor(page);
  const baselineOrder = await rootOrder(page);
  const outlineCanvas = await markCanvas(page, 'outline');
  await dragOutlineAfter(page, '销量增长', '价格提升');
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '1');
  await expectCanvasRetained(outlineCanvas, 'outline');
  const outlineOrder = await rootOrder(page);
  const outlineViewSpec = await serializedViewSpecBytes(page);

  await openEditor(page);
  const keyboardCanvas = await markCanvas(page, 'keyboard');
  const salesRow = page.getByRole('treeitem', { name: /销量增长/ });
  await salesRow.focus();
  await page.keyboard.press('Alt+ArrowDown');
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '1');
  await expectCanvasRetained(keyboardCanvas, 'keyboard');
  const keyboardOrder = await rootOrder(page);
  const keyboardViewSpec = await serializedViewSpecBytes(page);

  await openEditor(page);
  const chartCanvas = await markCanvas(page, 'chart');
  await dragChartContributionAfter(page);
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '1');
  await expectCanvasRetained(chartCanvas, 'chart');
  const chartOrder = await rootOrder(page);
  const chartViewSpec = await serializedViewSpecBytes(page);

  expect(outlineOrder).toEqual(keyboardOrder);
  expect(chartOrder).toEqual(keyboardOrder);
  expect(outlineViewSpec.equals(keyboardViewSpec)).toBe(true);
  expect(chartViewSpec.equals(keyboardViewSpec)).toBe(true);
  expect(keyboardOrder.indexOf('price-impact')).toBeLessThan(keyboardOrder.indexOf('sales-volume'));
  await expect(page.locator(COMMAND_FEEDBACK)).toContainText('已移动');

  await page.getByRole('button', { name: '撤销' }).click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '2');
  expect(await rootOrder(page)).toEqual(baselineOrder);
  await expectCanvasRetained(chartCanvas, 'chart');

  await page.getByRole('button', { name: '重做' }).click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '3');
  expect(await rootOrder(page)).toEqual(chartOrder);
  await expectCanvasRetained(chartCanvas, 'chart');
});

test('creates, collapses, expands, and ungroups a conserved group from the real outline', async ({
  page,
}) => {
  await openEditor(page);
  const canvas = await markCanvas(page, 'group-flow');
  const baselineOrder = await rootOrder(page);

  await page.getByRole('treeitem', { name: /销量增长/ }).click();
  await page
    .getByRole('treeitem', { name: /价格提升/ })
    .click({ modifiers: [MULTI_SELECT_MODIFIER] });
  await activateInspectorPanel(page);
  await page.getByRole('textbox', { name: '分组名称' }).fill('增长驱动');
  await page.getByRole('button', { name: '创建分组' }).click();
  await activateOutlinePanel(page);
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '1');
  await expectCanvasRetained(canvas, 'group-flow');

  const groupRow = page.getByRole('treeitem', { name: /增长驱动/ });
  await expect(groupRow).toHaveAttribute('data-source-count', '2');
  await page.getByRole('button', { name: '折叠 增长驱动' }).click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '2');
  await expectCanvasRetained(canvas, 'group-flow');
  await expect(page.getByRole('button', { name: '展开 增长驱动' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(page.getByRole('treeitem', { name: /销量增长/ })).toBeHidden();
  await expect(groupRow).toContainText('1,520');

  await page.getByRole('button', { name: '展开 增长驱动' }).click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '3');
  await expectCanvasRetained(canvas, 'group-flow');
  await expect(page.getByRole('treeitem', { name: /销量增长/ })).toBeVisible();
  await groupRow.click();
  await activateInspectorPanel(page);
  await page.getByRole('button', { name: '取消分组' }).click();
  await activateOutlinePanel(page);
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '4');
  await expectCanvasRetained(canvas, 'group-flow');
  await expect(page.getByRole('treeitem', { name: /增长驱动/ })).toHaveCount(0);
  expect(await rootOrder(page)).toEqual(baselineOrder);
  await expect(page.getByRole('treeitem', { name: /期末净利润/ })).toContainText('3,440');
});

test('chart click retains group actions while a boundary drag moves one child out', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openEditor(page);
  await page.getByRole('treeitem', { name: /销量增长/ }).click();
  await page
    .getByRole('treeitem', { name: /价格提升/ })
    .click({ modifiers: [MULTI_SELECT_MODIFIER] });
  await page
    .getByRole('treeitem', { name: /产品结构/ })
    .click({ modifiers: [MULTI_SELECT_MODIFIER] });
  await activateInspectorPanel(page);
  await page.getByRole('textbox', { name: '分组名称' }).fill('增长驱动');
  await page.getByRole('button', { name: '创建分组' }).click();
  await activateOutlinePanel(page);
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '1');

  const groupRow = page.getByRole('treeitem', { name: /增长驱动/ });
  const groupId = await groupRow.getAttribute('data-node-id');
  expect(groupId).not.toBeNull();
  await expect(groupRow).toHaveAttribute('data-source-count', '3');

  const canvas = page.getByTestId('tellplot-chart').locator('canvas').first();
  await expect.poll(() => waterfallBarPoints(canvas)).toHaveLength(EXPECTED_CHART_BAR_COUNT);
  const points = await waterfallBarPoints(canvas);
  const groupedCanvasHash = await canvasPixelHash(canvas);
  const firstChild = points[1];
  const lastChild = points[3];
  expect(firstChild).toBeDefined();
  expect(lastChild).toBeDefined();
  if (firstChild === undefined || lastChild === undefined || groupId === null) {
    return;
  }

  await page.mouse.move(firstChild.x, firstChild.y);
  await expect(page.getByRole('button', { name: '折叠分组: 增长驱动' })).toBeVisible();
  await expect(page.getByRole('button', { name: '取消分组: 增长驱动' })).toBeVisible();
  const chartActions = page.locator('.tp-chart-group-actions');
  await expect(chartActions).toHaveAttribute('data-axis', 'x');
  await expect(chartActions).toHaveAttribute('data-placement', 'bottom-right');
  await expect(chartActions.locator('button')).toHaveText(['', '']);
  await expect(chartActions.locator('.tp-chart-group-action-icon[aria-hidden="true"]')).toHaveCount(
    2,
  );
  const actionBox = await chartActions.boundingBox();
  const tooltip = page.locator('.g2-tooltip');
  await expect(tooltip).toBeHidden();
  expect(actionBox).not.toBeNull();
  if (actionBox !== null) {
    expect(actionBox.width).toBeLessThanOrEqual(45);
    expect(actionBox.height).toBeLessThanOrEqual(45);
    expect(actionBox.x + actionBox.width).toBeGreaterThanOrEqual(firstChild.maxX - 9);
    expect(actionBox.x + actionBox.width).toBeLessThanOrEqual(firstChild.maxX + 2);
    expect(actionBox.y + actionBox.height).toBeGreaterThanOrEqual(firstChild.maxY - 9);
    expect(actionBox.y + actionBox.height).toBeLessThanOrEqual(firstChild.maxY + 2);
  }
  const openingBar = points[0];
  expect(openingBar).toBeDefined();
  if (openingBar !== undefined) {
    await page.mouse.move(openingBar.x, openingBar.y);
    await expect(chartActions).toBeHidden();
    await expect(tooltip).toBeVisible();
    await page.mouse.move(firstChild.x, firstChild.y);
    await expect(chartActions).toBeVisible();
    await expect(tooltip).toBeHidden();
  }
  await page.mouse.click(firstChild.x, firstChild.y);
  await expect(page.getByRole('button', { name: '折叠分组: 增长驱动' })).toBeVisible();
  await expect(page.getByRole('button', { name: '取消分组: 增长驱动' })).toBeVisible();

  await page.mouse.move(lastChild.x, lastChild.y);
  await page.mouse.down();
  await page.mouse.move(lastChild.maxX + 2, lastChild.y, { steps: 6 });
  await expect(page.locator(`${EDITOR}[data-interaction-state="dragging"]`)).toBeVisible();
  await expect(page.locator('.tp-chart-group-actions')).toHaveCount(0);
  await expect(page.getByTestId('tellplot-chart')).toHaveAttribute('data-drop-indicator', 'after');
  await expect(page.getByTestId('tellplot-chart')).toHaveAttribute('data-drop-node-id', groupId);
  await expect.poll(() => canvasPixelHash(canvas)).not.toBe(groupedCanvasHash);
  const previewCanvasHash = await canvasPixelHash(canvas);
  await page.mouse.up();

  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '2');
  await expect(groupRow).toHaveAttribute('data-source-count', '2');
  await expect(page.getByRole('treeitem', { name: /产品结构/ })).toHaveAttribute('aria-level', '1');
  await expect(page.getByRole('treeitem', { name: /销量增长/ })).toHaveAttribute('aria-level', '2');
  await expect.poll(() => canvasPixelHash(canvas)).toBe(previewCanvasHash);
});

test('creates a nested group from contiguous sibling nodes and preserves recursive levels', async ({
  page,
}) => {
  await openEditor(page);
  await page.getByRole('treeitem', { name: /销量增长/ }).click();
  await page
    .getByRole('treeitem', { name: /价格提升/ })
    .click({ modifiers: [MULTI_SELECT_MODIFIER] });
  await activateInspectorPanel(page);
  await page.getByRole('textbox', { name: '分组名称' }).fill('增长驱动');
  await page.getByRole('button', { name: '创建分组' }).click();

  await activateOutlinePanel(page);
  await page.getByRole('checkbox', { name: '选择 产品结构' }).click();
  await activateInspectorPanel(page);
  await page.getByRole('textbox', { name: '分组名称' }).fill('经营桥');
  await page.getByRole('button', { name: '创建分组' }).click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '2');
  await activateOutlinePanel(page);

  const outer = page.getByRole('treeitem', { name: /经营桥/ });
  const inner = page.getByRole('treeitem', { name: /增长驱动/ });
  const sales = page.getByRole('treeitem', { name: /销量增长/ });
  await expect(outer).toHaveAttribute('aria-level', '1');
  await expect(inner).toHaveAttribute('aria-level', '2');
  await expect(sales).toHaveAttribute('aria-level', '3');

  await page.getByRole('button', { name: '折叠 经营桥' }).click();
  await expect(inner).toBeHidden();
  await page.getByRole('button', { name: '展开 经营桥' }).click();
  await expect(inner).toBeVisible();
  await expect(sales).toBeVisible();
});

test('marquee across an expanded group promotes its complete boundary into an outer group', async ({
  page,
}) => {
  await openEditor(page);
  await page.getByRole('treeitem', { name: /销量增长/ }).click();
  await page
    .getByRole('treeitem', { name: /价格提升/ })
    .click({ modifiers: [MULTI_SELECT_MODIFIER] });
  await page
    .getByRole('treeitem', { name: /产品结构/ })
    .click({ modifiers: [MULTI_SELECT_MODIFIER] });
  await activateInspectorPanel(page);
  await page.getByRole('textbox', { name: '分组名称' }).fill('增长驱动');
  await page.getByRole('button', { name: '创建分组' }).click();

  await expect(page.getByTestId('tellplot-chart-stage')).toHaveAttribute(
    'data-render-state',
    'ready',
  );
  const canvas = page.getByTestId('tellplot-chart').locator('canvas').first();
  await expect.poll(() => waterfallBarPoints(canvas)).toHaveLength(EXPECTED_CHART_BAR_COUNT);
  const points = await waterfallBarPoints(canvas);
  const box = await canvas.boundingBox();
  const selectedChild = points[3];
  const outsideItem = points[4];
  expect(box).not.toBeNull();
  expect(selectedChild).toBeDefined();
  expect(outsideItem).toBeDefined();
  if (box === null || selectedChild === undefined || outsideItem === undefined) {
    return;
  }

  await page.mouse.move(selectedChild.minX - 4, box.y + 8);
  await page.mouse.down();
  await page.mouse.move(outsideItem.maxX + 4, box.y + box.height - 36, { steps: 8 });
  await page.mouse.up();

  const dialog = page.getByRole('dialog', { name: '创建折叠分组' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-selection-mode="lifted"]')).toContainText('按分组边界');
  await dialog.getByRole('textbox', { name: '分组名称' }).fill('经营桥');
  await dialog.getByRole('button', { name: '创建分组' }).click();

  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '2');
  await activateOutlinePanel(page);
  const outer = page.getByRole('treeitem', { name: /经营桥/ });
  await expect(outer).toHaveAttribute('data-source-count', '4');
  await expect(page.getByRole('button', { name: '展开 经营桥' })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: /增长驱动/ })).toBeHidden();

  await page.getByRole('button', { name: '展开 经营桥' }).click();
  await expect(page.getByRole('treeitem', { name: /增长驱动/ })).toHaveAttribute('aria-level', '2');
  await expect(page.getByRole('treeitem', { name: /原材料成本/ })).toHaveAttribute(
    'aria-level',
    '2',
  );
});

test('blank-chart marquee creates one initially collapsed direct group', async ({ page }) => {
  await openEditor(page);
  const canvas = page.getByTestId('tellplot-chart').locator('canvas').first();
  await expect.poll(() => waterfallBarPoints(canvas)).toHaveLength(EXPECTED_CHART_BAR_COUNT);
  const points = await waterfallBarPoints(canvas);
  const box = await canvas.boundingBox();
  const first = points[1];
  const second = points[2];
  expect(box).not.toBeNull();
  expect(first).toBeDefined();
  expect(second).toBeDefined();
  if (box === null || first === undefined || second === undefined) {
    return;
  }

  await page.mouse.move(first.minX - 4, box.y + 8);
  await page.mouse.down();
  await page.mouse.move(second.maxX + 4, box.y + box.height - 36, { steps: 8 });
  await expect(page.getByTestId('chart-marquee')).toBeVisible();
  await page.mouse.up();

  const dialog = page.getByRole('dialog', { name: '创建折叠分组' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox', { name: '分组名称' }).fill('图表框选组');
  await dialog.getByRole('button', { name: '创建分组' }).click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '1');
  await expect(page.getByRole('button', { name: '展开 图表框选组' })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: /销量增长/ })).toBeHidden();
  await expect(page.getByRole('treeitem', { name: /价格提升/ })).toBeHidden();
  await expect(page.locator(COMMAND_FEEDBACK)).toContainText('分组已创建');

  await page.getByRole('button', { name: '撤销' }).click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '2');
  await expect(page.getByRole('treeitem', { name: /图表框选组/ })).toHaveCount(0);
  await expect(page.getByRole('treeitem', { name: /销量增长/ })).toBeVisible();
  await expect(page.locator(COMMAND_FEEDBACK)).toContainText('已撤销上一项修改');

  await page.getByRole('button', { name: '重做' }).click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '3');
  await expect(page.getByRole('button', { name: '展开 图表框选组' })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: /销量增长/ })).toBeHidden();
  await expect(page.locator(COMMAND_FEEDBACK)).toContainText('已恢复上一项修改');
});

test('keeps target information while reduced motion removes the 80/160ms transitions', async ({
  page,
}) => {
  await openEditor(page);
  const row = page.getByRole('treeitem', { name: /销量增长/ });
  const normalRowDuration = await row.evaluate(
    element => getComputedStyle(element).transitionDuration,
  );
  expect(normalRowDuration.split(',').map(value => value.trim())).toContain('0.16s');

  const handle = page.getByRole('button', { name: '拖动 销量增长' });
  const target = page.getByRole('treeitem', { name: /价格提升/ });
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
    steps: 6,
  });
  const indicator = target;
  await expect(indicator).toHaveAttribute('data-drop-indicator', 'after');
  await expect(indicator).toBeVisible();
  const normalIndicatorDuration = await indicator.evaluate(
    element => getComputedStyle(element, '::before').transitionDuration,
  );
  expect(normalIndicatorDuration.split(',').map(value => value.trim())).toContain('0.08s');
  await page.keyboard.press('Escape');
  await page.mouse.up();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openEditor(page);
  const reducedRow = page.getByRole('treeitem', { name: /销量增长/ });
  const reducedRowDuration = await reducedRow.evaluate(
    element => getComputedStyle(element).transitionDuration,
  );
  expect(reducedRowDuration.split(',').every(value => value.trim() === '0s')).toBe(true);

  const reducedHandle = page.getByRole('button', { name: '拖动 销量增长' });
  const reducedTarget = page.getByRole('treeitem', { name: /价格提升/ });
  const reducedHandleBox = await reducedHandle.boundingBox();
  const reducedTargetBox = await reducedTarget.boundingBox();
  expect(reducedHandleBox).not.toBeNull();
  expect(reducedTargetBox).not.toBeNull();
  if (reducedHandleBox === null || reducedTargetBox === null) {
    return;
  }
  await page.mouse.move(
    reducedHandleBox.x + reducedHandleBox.width / 2,
    reducedHandleBox.y + reducedHandleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    reducedTargetBox.x + reducedTargetBox.width / 2,
    reducedTargetBox.y + reducedTargetBox.height - 3,
    { steps: 6 },
  );
  const reducedIndicator = reducedTarget;
  await expect(reducedIndicator).toHaveAttribute('data-drop-indicator', 'after');
  await expect(reducedIndicator).toBeVisible();
  await expect(page.locator(COMMAND_FEEDBACK)).toContainText('正在移动');
  expect(
    await reducedIndicator.evaluate(
      element => getComputedStyle(element, '::before').transitionDuration,
    ),
  ).toBe('0s');
  await page.keyboard.press('Escape');
  await page.mouse.up();
});
