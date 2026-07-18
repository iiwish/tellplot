import { readFile } from 'node:fs/promises';

import { expect, test, type Download, type Locator, type Page } from '@playwright/test';

const EDITOR = '[data-tellplot="editor"]';
const COMMAND_FEEDBACK = '.tp-command-feedback';
const EXPECTED_CHART_BAR_COUNT = 12;

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
  await page.goto('/');
  await expect(page.locator(`${EDITOR}[data-editor-state="ready"]`)).toBeVisible();
  await expect(page.getByTestId('tellplot-chart').locator('canvas').first()).toBeVisible();
}

async function chooseExport(
  page: Page,
  name: 'SVG 图像' | 'PNG 图像' | 'ViewSpec JSON',
): Promise<Download> {
  await page.getByRole('button', { name: '导出' }).click();
  const item = page.getByRole('menuitem', { name });
  await expect(item).toBeVisible();
  const download = page.waitForEvent('download');
  await item.click();
  return download;
}

async function readDownload(download: Download): Promise<Buffer> {
  const path = await download.path();
  expect(path).not.toBeNull();
  if (path === null) {
    throw new Error('Expected a local download path');
  }
  return readFile(path);
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

async function visibleTreeOrder(page: Page): Promise<readonly string[]> {
  return page
    .getByRole('tree', { name: '结构大纲' })
    .locator('[role="treeitem"][data-node-id]')
    .evaluateAll(rows =>
      rows
        .filter(row => row instanceof HTMLElement && row.offsetParent !== null)
        .map(row => row.getAttribute('data-node-id'))
        .filter((nodeId): nodeId is string => nodeId !== null),
    );
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
      [95, 107, 101],
      [22, 131, 99],
      [213, 82, 74],
      [49, 92, 140],
      [164, 104, 18],
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

async function chartPoints(page: Page): Promise<{
  readonly canvas: Locator;
  readonly points: readonly BarPoint[];
}> {
  const canvas = page.getByTestId('tellplot-chart').locator('canvas').first();
  await expect.poll(() => waterfallBarPoints(canvas)).toHaveLength(EXPECTED_CHART_BAR_COUNT);
  return { canvas, points: await waterfallBarPoints(canvas) };
}

async function groupBarContrastPixels(page: Page): Promise<number> {
  return page
    .getByTestId('tellplot-chart')
    .locator('canvas')
    .first()
    .evaluate(element => {
      if (!(element instanceof HTMLCanvasElement)) {
        return 0;
      }
      const context = element.getContext('2d');
      if (context === null) {
        return 0;
      }
      const pixels = context.getImageData(0, 0, element.width, element.height).data;
      const group = [164, 104, 18] as const;
      const matchesGroup = (offset: number): boolean =>
        Math.abs((pixels[offset] ?? 0) - group[0]) <= 10 &&
        Math.abs((pixels[offset + 1] ?? 0) - group[1]) <= 10 &&
        Math.abs((pixels[offset + 2] ?? 0) - group[2]) <= 10 &&
        (pixels[offset + 3] ?? 0) > 120;
      let minX = element.width;
      let maxX = -1;
      let minY = element.height;
      let maxY = -1;
      for (let y = 0; y < element.height; y += 1) {
        for (let x = 0; x < element.width; x += 1) {
          if (matchesGroup((y * element.width + x) * 4)) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
      }
      if (maxX - minX < 8 || maxY - minY < 8) {
        return 0;
      }
      let contrast = 0;
      for (let y = minY + 3; y <= maxY - 3; y += 1) {
        for (let x = minX + 3; x <= maxX - 3; x += 1) {
          const offset = (y * element.width + x) * 4;
          if (!matchesGroup(offset)) {
            contrast += 1;
          }
        }
      }
      return contrast;
    });
}

async function dragChartContributionBefore(
  page: Page,
  sourceIndex: number,
  targetIndex: number,
  targetLabel: string,
): Promise<void> {
  const { canvas, points } = await chartPoints(page);
  const source = points[sourceIndex];
  const target = points[targetIndex];
  const canvasBox = await canvas.boundingBox();
  expect(source).toBeDefined();
  expect(target).toBeDefined();
  expect(canvasBox).not.toBeNull();
  if (source === undefined || target === undefined || canvasBox === null) {
    return;
  }

  const pointerX = source.x + (target.maxX - source.minX) - 1;
  const pointerY = [canvasBox.y + 8, canvasBox.y + canvasBox.height - 8].find(
    y => y < target.minY || y > target.maxY,
  );
  expect(pointerX).toBeGreaterThan(target.maxX);
  expect(pointerX).toBeLessThan(source.minX);
  expect(pointerY).toBeDefined();
  if (pointerY === undefined) {
    return;
  }

  await page.mouse.move(source.x, source.y);
  await page.mouse.down();
  await page.mouse.move(pointerX, pointerY, { steps: 8 });
  await expect(page.locator(`${EDITOR}[data-interaction-state="dragging"]`)).toBeVisible();
  await expect(page.getByTestId('tellplot-chart')).toHaveAttribute('data-drop-indicator', 'before');
  await expect(page.getByRole('treeitem', { name: new RegExp(targetLabel) })).toHaveAttribute(
    'data-drop-indicator',
    'before',
  );
  await page.mouse.up();
}

async function createCostPressureMarquee(page: Page): Promise<void> {
  const { canvas, points } = await chartPoints(page);
  const material = points[4];
  const labor = points[6];
  const box = await canvas.boundingBox();
  expect(material).toBeDefined();
  expect(labor).toBeDefined();
  expect(box).not.toBeNull();
  if (material === undefined || labor === undefined || box === null) {
    return;
  }

  await page.mouse.move(material.minX - 4, box.y + 8);
  await page.mouse.down();
  await page.mouse.move(labor.maxX + 4, box.y + box.height - 36, { steps: 8 });
  await expect(page.getByTestId('chart-marquee')).toBeVisible();
  await page.mouse.up();

  const dialog = page.getByRole('dialog', { name: '创建折叠分组' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox', { name: '分组名称' }).fill('成本压力');
  await dialog.getByRole('button', { name: '创建分组' }).click();
}

async function expectLockedAnchorDoesNotStartSession(
  page: Page,
  index: number,
  expectedRevision: number,
  expectedRootOrder: readonly string[],
  expectedTreeOrder: readonly string[],
): Promise<void> {
  const { points } = await chartPoints(page);
  const anchor = points[index];
  expect(anchor).toBeDefined();
  if (anchor === undefined) {
    return;
  }

  await page.mouse.move(anchor.x, anchor.y);
  await page.mouse.down();
  await page.mouse.move(anchor.x + 6, anchor.y, { steps: 3 });
  await expect(page.locator(EDITOR)).toHaveAttribute('data-interaction-state', 'idle');
  await expect(page.getByTestId('chart-drag-overlay')).toHaveCount(0);
  await expect(page.locator(COMMAND_FEEDBACK)).toContainText('ITEM_LOCKED');
  await page.mouse.up();

  await expect(page.locator(EDITOR)).toHaveAttribute(
    'data-view-revision',
    String(expectedRevision),
  );
  expect(await rootOrder(page)).toEqual(expectedRootOrder);
  expect(await visibleTreeOrder(page)).toEqual(expectedTreeOrder);
}

test('canonical quickstart survives the exact production-preview workflow', async ({
  browserName,
  page,
}, testInfo) => {
  await openEditor(page);
  const initialOrder = await rootOrder(page);
  expect(initialOrder).toEqual([
    'opening-profit',
    'sales-volume',
    'price-impact',
    'product-mix',
    'material-cost',
    'freight-cost',
    'labor-cost',
    'operating-subtotal',
    'exchange-impact',
    'tax-impact',
    'one-off-income',
    'ending-profit',
  ]);
  await expect(page.getByRole('treeitem', { name: /期末净利润/ })).toContainText('3,440');

  await dragChartContributionBefore(page, 9, 8, '汇率影响');
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '1');
  const reordered = await rootOrder(page);
  expect(reordered.indexOf('tax-impact')).toBeLessThan(reordered.indexOf('exchange-impact'));
  await expect(page.getByRole('treeitem', { name: /期末净利润/ })).toContainText('3,440');

  await page.getByRole('button', { name: '撤销' }).click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '2');
  expect(await rootOrder(page)).toEqual(initialOrder);
  await page.getByRole('button', { name: '重做' }).click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '3');
  expect(await rootOrder(page)).toEqual(reordered);

  await createCostPressureMarquee(page);
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '4');
  const costPressure = page.getByRole('treeitem', { name: /成本压力/ });
  await expect(costPressure).toHaveAttribute('data-source-count', '3');
  await expect(costPressure).toContainText('-¥950');
  await expect(page.getByRole('button', { name: '展开 成本压力' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(page.getByRole('treeitem', { name: /原材料成本/ })).toBeHidden();
  await expect(page.getByRole('treeitem', { name: /运输费用/ })).toBeHidden();
  await expect(page.getByRole('treeitem', { name: /人工成本/ })).toBeHidden();
  const costPressureId = await costPressure.getAttribute('data-node-id');
  expect(costPressureId).not.toBeNull();
  if (costPressureId === null) {
    return;
  }

  await page.getByRole('button', { name: '展开 成本压力' }).click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '5');
  await expect(page.getByRole('treeitem', { name: /原材料成本/ })).toBeVisible();
  await page.getByRole('checkbox', { name: '选择 产品结构' }).click();
  await page.getByRole('textbox', { name: '分组名称' }).fill('经营成本桥');
  const createOuterGroup = page.getByRole('button', { name: '创建分组' });
  await expect(createOuterGroup).toBeEnabled();
  await createOuterGroup.click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '6');

  const outer = page.getByRole('treeitem', { name: /经营成本桥/ });
  const outerId = await outer.getAttribute('data-node-id');
  expect(outerId).not.toBeNull();
  if (outerId === null) {
    return;
  }
  await expect(outer).toHaveAttribute('data-source-count', '4');
  await expect(outer).toHaveAttribute('aria-level', '1');
  await expect(page.getByRole('treeitem', { name: /产品结构/ })).toHaveAttribute('aria-level', '2');
  await expect(costPressure).toHaveAttribute('aria-level', '2');
  await expect(page.getByRole('treeitem', { name: /原材料成本/ })).toHaveAttribute(
    'aria-level',
    '3',
  );

  await page.getByRole('button', { name: '折叠 经营成本桥' }).click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '7');
  await expect(costPressure).toBeHidden();
  await expect(page.getByRole('treeitem', { name: /产品结构/ })).toBeHidden();
  await expect(outer).toContainText('-¥790');

  await page.getByRole('button', { name: '展开 经营成本桥' }).click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '8');
  await expect(page.getByRole('button', { name: '折叠 成本压力' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(page.getByRole('treeitem', { name: /原材料成本/ })).toBeVisible();
  const finalRootOrder = [
    'opening-profit',
    'sales-volume',
    'price-impact',
    outerId,
    'operating-subtotal',
    'tax-impact',
    'exchange-impact',
    'one-off-income',
    'ending-profit',
  ];
  const finalTreeOrder = [
    'opening-profit',
    'sales-volume',
    'price-impact',
    outerId,
    'product-mix',
    costPressureId,
    'material-cost',
    'freight-cost',
    'labor-cost',
    'operating-subtotal',
    'tax-impact',
    'exchange-impact',
    'one-off-income',
    'ending-profit',
  ];
  expect(await rootOrder(page)).toEqual(finalRootOrder);
  expect(await visibleTreeOrder(page)).toEqual(finalTreeOrder);
  await expect(page.getByRole('treeitem', { name: /期末净利润/ })).toContainText('3,440');

  await expectLockedAnchorDoesNotStartSession(page, 0, 8, finalRootOrder, finalTreeOrder);
  await expectLockedAnchorDoesNotStartSession(page, 7, 8, finalRootOrder, finalTreeOrder);
  await expectLockedAnchorDoesNotStartSession(page, 11, 8, finalRootOrder, finalTreeOrder);

  await page.getByRole('button', { name: '折叠 成本压力' }).click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '9');
  const annotationText = '成本口径已复核';
  await costPressure.click();
  await page.getByRole('textbox', { name: '注释' }).fill(annotationText);
  await page.getByRole('button', { name: '保存注释' }).click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '10');
  await expect.poll(() => groupBarContrastPixels(page)).toBeGreaterThan(20);
  if (browserName === 'chromium') {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(
      () =>
        new Promise<void>(resolve =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await testInfo.attach('annotation-workflow.png', {
      body: await page.screenshot({ animations: 'disabled', fullPage: true, type: 'png' }),
      contentType: 'image/png',
    });
  }

  const svgDownload = await chooseExport(page, 'SVG 图像');
  const svg = (await readDownload(svgDownload)).toString('utf8');
  expect(svg.length).toBeGreaterThan(10_000);
  expect(svg).toContain('成本压力');
  expect(svg).toContain(annotationText);
  expect(svg.indexOf('所得税影响')).toBeLessThan(svg.indexOf('汇率影响'));

  const pngDownload = await chooseExport(page, 'PNG 图像');
  expect((await readDownload(pngDownload)).byteLength).toBeGreaterThan(10_000);

  const jsonDownload = await chooseExport(page, 'ViewSpec JSON');
  const json = (await readDownload(jsonDownload)).toString('utf8');
  const exported = JSON.parse(json) as {
    readonly revision: number;
    readonly rootOrder: readonly string[];
    readonly collapsedGroupIds: readonly string[];
    readonly annotations: Readonly<Record<string, string>>;
  };
  expect(exported.revision).toBe(10);
  expect(exported.rootOrder).toEqual(
    finalRootOrder.filter(
      nodeId =>
        nodeId !== 'opening-profit' &&
        nodeId !== 'operating-subtotal' &&
        nodeId !== 'ending-profit',
    ),
  );
  expect(exported.collapsedGroupIds).toEqual([costPressureId]);
  expect(exported.annotations[costPressureId]).toBe(annotationText);

  await page.reload();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '0');
  await page.getByLabel('导入 ViewSpec 文件').setInputFiles({
    name: 'canonical-quickstart.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  });
  await expect(page.getByRole('status', { name: '文件状态' })).toContainText('VIEW_IMPORTED');
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '10');
  expect(await rootOrder(page)).toEqual(finalRootOrder);
  await expect(page.getByRole('button', { name: '展开 成本压力' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await page.getByRole('treeitem', { name: /成本压力/ }).click();
  await expect(page.getByRole('textbox', { name: '注释' })).toHaveValue(annotationText);

  const tax = page.getByRole('treeitem', { name: /所得税影响/ });
  await tax.focus();
  await page.keyboard.press('Alt+ArrowDown');
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '11');
  expect((await rootOrder(page)).indexOf('exchange-impact')).toBeLessThan(
    (await rootOrder(page)).indexOf('tax-impact'),
  );
  await expect(tax).toBeFocused();
  const undo = page.getByRole('button', { name: '撤销' });
  await undo.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '12');
  expect(await rootOrder(page)).toEqual(finalRootOrder);
  await expect(page.locator(COMMAND_FEEDBACK)).toContainText('已撤销上一项修改');
  await expect(page.getByRole('treeitem', { name: /期末净利润/ })).toContainText('3,440');
});
