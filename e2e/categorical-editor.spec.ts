import { readFile } from 'node:fs/promises';

import { expect, test, type Download, type Locator, type Page } from '@playwright/test';

import { activateInspectorPanel, activateOutlinePanel } from './editorPanels';

const EDITOR = '[data-tellplot="editor"]';
const MULTI_SELECT_MODIFIER: 'Meta' | 'Control' =
  process.platform === 'darwin' ? 'Meta' : 'Control';
const INITIAL_ORDER = [
  'enterprise',
  'consumer',
  'services',
  'marketplace',
  'support',
  'infrastructure',
  'research',
  'other',
] as const;

type CategoricalLayout = 'bar' | 'column';

interface MarkBand {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly kind: 'negative' | 'positive';
}

async function openCategorical(page: Page, layout: CategoricalLayout): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/playground?fixture=categorical-${layout}`);
  await expect(
    page.locator(`${EDITOR}[data-editor-state="ready"][data-chart-type="${layout}"]`),
  ).toBeVisible();
  await expect(page.getByTestId('tellplot-chart').locator('canvas').first()).toBeVisible();
}

async function readDownload(download: Download): Promise<Buffer> {
  const path = await download.path();
  expect(path).not.toBeNull();
  if (path === null) {
    throw new Error('Expected a local download path');
  }
  return readFile(path);
}

async function chooseExport(page: Page, name: 'PNG 图像' | 'SVG 图像'): Promise<Download> {
  await page.getByRole('button', { name: '导出' }).click();
  const item = page.getByRole('menuitem', { name });
  await expect(item).toBeVisible();
  const download = page.waitForEvent('download');
  await item.click();
  return download;
}

async function rootOrder(page: Page): Promise<readonly string[]> {
  return page
    .getByRole('tree', { name: '结构大纲' })
    .locator('[role="treeitem"][aria-level="1"][data-node-id]')
    .evaluateAll(rows => rows.map(row => row.getAttribute('data-node-id') ?? 'missing-node-id'));
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

async function categoricalMarkBands(
  canvas: Locator,
  layout: CategoricalLayout,
): Promise<readonly MarkBand[]> {
  const localBands = await canvas.evaluate((element, currentLayout) => {
    if (!(element instanceof HTMLCanvasElement)) {
      return [];
    }
    const context = element.getContext('2d');
    if (context === null) {
      return [];
    }
    const pixels = context.getImageData(0, 0, element.width, element.height).data;
    const coordinateCount = currentLayout === 'column' ? element.width : element.height;
    const crossCount = currentLayout === 'column' ? element.height : element.width;
    const populated: {
      kind: 'negative' | 'positive';
      coordinate: number;
      crossMin: number;
      crossMax: number;
    }[] = [];
    for (let coordinate = 0; coordinate < coordinateCount; coordinate += 1) {
      const positive: number[] = [];
      const negative: number[] = [];
      for (let cross = 0; cross < crossCount; cross += 1) {
        const x = currentLayout === 'column' ? coordinate : cross;
        const y = currentLayout === 'column' ? cross : coordinate;
        const offset = (y * element.width + x) * 4;
        const red = pixels[offset] ?? 0;
        const green = pixels[offset + 1] ?? 0;
        const blue = pixels[offset + 2] ?? 0;
        const alpha = pixels[offset + 3] ?? 0;
        if (alpha <= 120) {
          continue;
        }
        if (Math.abs(red - 18) <= 8 && Math.abs(green - 183) <= 8 && Math.abs(blue - 106) <= 8) {
          positive.push(cross);
        }
        if (Math.abs(red - 240) <= 8 && Math.abs(green - 68) <= 8 && Math.abs(blue - 100) <= 8) {
          negative.push(cross);
        }
      }
      const matches = positive.length >= 3 ? positive : negative;
      if (matches.length >= 3) {
        populated.push({
          kind: positive.length >= 3 ? 'positive' : 'negative',
          coordinate,
          crossMin: Math.min(...matches),
          crossMax: Math.max(...matches),
        });
      }
    }
    const bands: {
      kind: 'negative' | 'positive';
      coordinateMin: number;
      coordinateMax: number;
      crossMin: number;
      crossMax: number;
    }[] = [];
    for (const point of populated) {
      const current = bands.at(-1);
      if (
        current === undefined ||
        point.kind !== current.kind ||
        point.coordinate > current.coordinateMax + 1
      ) {
        bands.push({
          kind: point.kind,
          coordinateMin: point.coordinate,
          coordinateMax: point.coordinate,
          crossMin: point.crossMin,
          crossMax: point.crossMax,
        });
      } else {
        current.coordinateMax = point.coordinate;
        current.crossMin = Math.min(current.crossMin, point.crossMin);
        current.crossMax = Math.max(current.crossMax, point.crossMax);
      }
    }
    return bands
      .filter(band => band.coordinateMax - band.coordinateMin >= 3)
      .map(band =>
        currentLayout === 'column'
          ? {
              minX: band.coordinateMin,
              maxX: band.coordinateMax,
              minY: band.crossMin,
              maxY: band.crossMax,
              kind: band.kind,
            }
          : {
              minX: band.crossMin,
              maxX: band.crossMax,
              minY: band.coordinateMin,
              maxY: band.coordinateMax,
              kind: band.kind,
            },
      );
  }, layout);
  const box = await canvas.boundingBox();
  const size = await canvas.evaluate(element => ({
    width: element instanceof HTMLCanvasElement ? element.width : 0,
    height: element instanceof HTMLCanvasElement ? element.height : 0,
  }));
  if (box === null || size.width === 0 || size.height === 0) {
    return [];
  }
  return localBands.map(band => ({
    minX: box.x + (band.minX / size.width) * box.width,
    maxX: box.x + (band.maxX / size.width) * box.width,
    minY: box.y + (band.minY / size.height) * box.height,
    maxY: box.y + (band.maxY / size.height) * box.height,
    kind: band.kind,
  }));
}

async function dragFirstAfterSecond(page: Page, layout: CategoricalLayout): Promise<void> {
  const canvas = page.getByTestId('tellplot-chart').locator('canvas').first();
  await expect.poll(() => categoricalMarkBands(canvas, layout)).toHaveLength(INITIAL_ORDER.length);
  const bands = await categoricalMarkBands(canvas, layout);
  const source = bands[0];
  const target = bands[1];
  expect(source).toBeDefined();
  expect(target).toBeDefined();
  if (source === undefined || target === undefined) {
    return;
  }
  const sourceX = (source.minX + source.maxX) / 2;
  const sourceY = (source.minY + source.maxY) / 2;
  const targetCoordinate =
    layout === 'column'
      ? sourceX + (target.minX - source.maxX) + 1
      : sourceY + (target.minY - source.maxY) + 1;

  await page.mouse.move(sourceX, sourceY);
  await page.mouse.down();
  await page.mouse.move(
    layout === 'column' ? targetCoordinate : sourceX,
    layout === 'bar' ? targetCoordinate : sourceY,
    { steps: 8 },
  );
  await expect(page.locator(`${EDITOR}[data-interaction-state="dragging"]`)).toBeVisible();
  await expect(page.getByTestId('tellplot-chart')).toHaveAttribute('data-drop-indicator', 'after');
  await expect(page.getByTestId('tellplot-chart')).toHaveAttribute('data-drop-node-id', 'consumer');
  await page.mouse.up();
}

async function createAndCollapseGroup(page: Page): Promise<void> {
  await page.getByRole('treeitem', { name: /企业订阅/ }).click();
  await page
    .getByRole('treeitem', { name: /个人订阅/ })
    .click({ modifiers: [MULTI_SELECT_MODIFIER] });
  await activateInspectorPanel(page);
  await page.getByRole('textbox', { name: '分组名称' }).fill('订阅业务');
  await page.getByRole('button', { name: '创建分组' }).click();
  await activateOutlinePanel(page);
  await page.getByRole('button', { name: '折叠 订阅业务' }).click();
  await expect(page.getByRole('treeitem', { name: /订阅业务/ })).toContainText('2,900');
}

for (const layout of ['column', 'bar'] as const) {
  test(`${layout} renders ordered G2 marks and commits the same direct reorder`, async ({
    browserName,
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openCategorical(page, layout);
    const canvas = page.getByTestId('tellplot-chart').locator('canvas').first();
    await expect.poll(() => paintedPixelCount(canvas)).toBeGreaterThan(500);
    await expect
      .poll(() => categoricalMarkBands(canvas, layout))
      .toHaveLength(INITIAL_ORDER.length);
    const bands = await categoricalMarkBands(canvas, layout);
    expect(bands.map(band => band.kind)).toEqual([
      'positive',
      'positive',
      'positive',
      'positive',
      'negative',
      'negative',
      'negative',
      'positive',
    ]);
    expect(await rootOrder(page)).toEqual(INITIAL_ORDER);
    const summaryLabels = await page
      .getByRole('region', { name: '图表摘要' })
      .locator('li')
      .evaluateAll(items => items.map(item => item.textContent?.split(',')[0] ?? ''));
    expect(summaryLabels).toEqual([
      '企业订阅',
      '个人订阅',
      '专业服务',
      '应用市场',
      '客户支持投入',
      '基础设施投入',
      '研发投入',
      '其他经营项目',
    ]);

    if (browserName === 'chromium') {
      await testInfo.attach(`${layout}-ready.png`, {
        body: await page.screenshot({ animations: 'disabled', fullPage: true }),
        contentType: 'image/png',
      });
    }

    await dragFirstAfterSecond(page, layout);
    await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '1');
    expect((await rootOrder(page)).slice(0, 3)).toEqual(['consumer', 'enterprise', 'services']);
    await page.getByRole('button', { name: '撤销' }).click();
    await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '2');
    expect(await rootOrder(page)).toEqual(INITIAL_ORDER);
    await page.getByRole('button', { name: '重做' }).click();
    await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '3');
    expect((await rootOrder(page)).slice(0, 3)).toEqual(['consumer', 'enterprise', 'services']);
  });

  test(`${layout} exports the canonical collapsed projection as nonblank SVG and PNG`, async ({
    browserName,
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openCategorical(page, layout);
    await createAndCollapseGroup(page);
    await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '2');

    const svgDownload = await chooseExport(page, 'SVG 图像');
    const svg = (await readDownload(svgDownload)).toString('utf8');
    expect(svgDownload.suggestedFilename()).toBe('2026-h1-category-performance.svg');
    expect(svg).toContain('<svg');
    expect(svg).toContain(layout === 'bar' ? '分类条形图' : '分类柱状图');
    expect(svg).toContain('订阅业务');
    expect(svg).not.toContain('企业订阅');
    expect(svg).not.toContain('个人订阅');
    expect(svg.indexOf('订阅业务')).toBeLessThan(svg.indexOf('专业服务'));
    expect(svg).not.toMatch(
      /<script|foreignObject|javascript:|(?:href|xlink:href)=["']https?:|sourceRef|metadata/iu,
    );

    const pngDownload = await chooseExport(page, 'PNG 图像');
    const png = await readDownload(pngDownload);
    expect(pngDownload.suggestedFilename()).toBe('2026-h1-category-performance.png');
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
    const pixels = await page.evaluate(async base64 => {
      const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      if (context === null) {
        return { width: 0, height: 0, painted: 0 };
      }
      context.drawImage(bitmap, 0, 0);
      const data = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
      let painted = 0;
      for (let offset = 0; offset < data.length; offset += 4) {
        if (
          (data[offset + 3] ?? 0) > 20 &&
          ((data[offset] ?? 255) < 242 ||
            (data[offset + 1] ?? 255) < 242 ||
            (data[offset + 2] ?? 255) < 242)
        ) {
          painted += 1;
        }
      }
      return { width: bitmap.width, height: bitmap.height, painted };
    }, png.toString('base64'));
    expect(pixels.width).toBeGreaterThan(500);
    expect(pixels.height).toBeGreaterThan(300);
    expect(pixels.painted).toBeGreaterThan(500);
    if (browserName === 'chromium') {
      await testInfo.attach(`${layout}-collapsed-screen.png`, {
        body: await page.screenshot({ animations: 'disabled', fullPage: true }),
        contentType: 'image/png',
      });
      await testInfo.attach(`${layout}-collapsed-export.svg`, {
        body: Buffer.from(svg),
        contentType: 'image/svg+xml',
      });
      await testInfo.attach(`${layout}-collapsed-export.png`, {
        body: png,
        contentType: 'image/png',
      });
    }
  });
}

test('categorical group, pin, and history share one editor session', async ({
  browserName,
  page,
}, testInfo) => {
  await openCategorical(page, 'column');
  const pinnedView = {
    schemaVersion: '2.0.0',
    datasetId: '2026-h1-category-performance',
    chartType: 'column',
    revision: 0,
    rootOrder: [...INITIAL_ORDER],
    groups: {},
    collapsedGroupIds: [],
    pinnedItemIds: ['enterprise'],
    annotations: {},
    emphasis: {},
  };
  await page.getByLabel('导入 ViewSpec 文件').setInputFiles({
    name: 'pinned-categorical.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(pinnedView)),
  });
  const enterprise = page.getByRole('treeitem', { name: /企业订阅/ });
  await enterprise.focus();
  await page.keyboard.press('Alt+ArrowDown');
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '0');
  await expect(page.locator('.tp-command-feedback')).toContainText('ITEM_LOCKED');

  await page.reload();
  await expect(page.locator(`${EDITOR}[data-editor-state="ready"]`)).toBeVisible();
  await createAndCollapseGroup(page);
  const collapsedOrder = await rootOrder(page);
  expect(collapsedOrder[0]).not.toBe('enterprise');
  expect(collapsedOrder[0]).not.toBe('consumer');
  const groupRow = page.getByRole('treeitem', { name: /订阅业务/ });
  await expect(groupRow).toHaveAttribute('data-source-count', '2');
  await expect(page.getByRole('region', { name: '图表摘要' })).toContainText('订阅业务');
  if (browserName === 'chromium') {
    await testInfo.attach('categorical-group-collapsed.png', {
      body: await page.screenshot({ animations: 'disabled', fullPage: true }),
      contentType: 'image/png',
    });
  }
  await page.getByRole('button', { name: '展开 订阅业务' }).click();
  await groupRow.click();
  await activateInspectorPanel(page);
  await page.getByRole('button', { name: '取消分组' }).click();
  await activateOutlinePanel(page);
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '4');
  expect(await rootOrder(page)).toEqual(INITIAL_ORDER);
  await page.getByRole('button', { name: '撤销' }).click();
  await expect(page.getByRole('treeitem', { name: /订阅业务/ })).toBeVisible();
  await page.getByRole('button', { name: '重做' }).click();
  await expect(page.getByRole('treeitem', { name: /订阅业务/ })).toHaveCount(0);
});

test('categorical empty and invalid fixtures expose stable non-leaking states', async ({
  browserName,
  page,
}, testInfo) => {
  await page.goto('/playground?fixture=categorical-empty');
  await expect(page.locator(`${EDITOR}[data-editor-state="empty"]`)).toBeVisible();
  await expect(page.getByText('暂无分类项')).toBeVisible();
  await expect(page.getByRole('region', { name: '图表摘要' })).toContainText('0 个可见节点');
  if (browserName === 'chromium') {
    await testInfo.attach('categorical-empty.png', {
      body: await page.screenshot({ animations: 'disabled', fullPage: true }),
      contentType: 'image/png',
    });
  }

  await page.goto('/playground?fixture=categorical-invalid');
  await expect(page.locator(`${EDITOR}[data-editor-state="invalid"]`)).toBeVisible();
  const issues = page.getByRole('alert');
  await expect(issues).toContainText('INVALID_SOURCE_DATA');
  await expect(issues).toContainText('/data/items/5/amount');
  await expect(issues).not.toContainText('基础设施投入');
  await expect(issues).not.toContainText('Infinity');
  await expect(page.getByTestId('tellplot-chart').locator('canvas')).toHaveCount(0);
  if (browserName === 'chromium') {
    await testInfo.attach('categorical-invalid.png', {
      body: await page.screenshot({ animations: 'disabled', fullPage: true }),
      contentType: 'image/png',
    });
  }
});
