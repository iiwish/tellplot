import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

import { activateInspectorPanel } from './editorPanels';

interface Viewport {
  readonly width: number;
  readonly height: number;
}

interface RenderedBarBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

const DESKTOP = { width: 1440, height: 900 } satisfies Viewport;
const COMPACT = { width: 1024, height: 768 } satisfies Viewport;
const MOBILE = { width: 390, height: 844 } satisfies Viewport;

async function openReadyEditor(page: Page, viewport: Viewport): Promise<void> {
  await page.setViewportSize(viewport);
  await page.goto('/playground');
  await expect(page.locator('[data-tellplot][data-editor-state="ready"]')).toBeVisible();
  await expect(page.getByTestId('tellplot-chart-stage')).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function paintedPixelCount(canvas: Locator): Promise<number> {
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

async function positiveBarBounds(canvas: Locator): Promise<readonly RenderedBarBounds[]> {
  const localBounds = await canvas.evaluate(element => {
    if (!(element instanceof HTMLCanvasElement)) {
      return [];
    }
    const context = element.getContext('2d');
    if (context === null) {
      return [];
    }
    const pixels = context.getImageData(0, 0, element.width, element.height).data;
    const columns: { readonly x: number; readonly minY: number; readonly maxY: number }[] = [];
    for (let x = 0; x < element.width; x += 1) {
      const ys: number[] = [];
      for (let y = 0; y < element.height; y += 1) {
        const offset = (y * element.width + x) * 4;
        const red = pixels[offset] ?? 0;
        const green = pixels[offset + 1] ?? 0;
        const blue = pixels[offset + 2] ?? 0;
        const alpha = pixels[offset + 3] ?? 0;
        if (
          alpha > 120 &&
          Math.abs(red - 18) <= 8 &&
          Math.abs(green - 183) <= 8 &&
          Math.abs(blue - 106) <= 8
        ) {
          ys.push(y);
        }
      }
      if (ys.length >= 3) {
        columns.push({ x, minY: Math.min(...ys), maxY: Math.max(...ys) });
      }
    }
    const clusters: { minX: number; minY: number; maxX: number; maxY: number }[] = [];
    for (const column of columns) {
      const current = clusters.at(-1);
      if (current === undefined || column.x > current.maxX + 1) {
        clusters.push({
          minX: column.x,
          minY: column.minY,
          maxX: column.x,
          maxY: column.maxY,
        });
      } else {
        current.maxX = column.x;
        current.minY = Math.min(current.minY, column.minY);
        current.maxY = Math.max(current.maxY, column.maxY);
      }
    }
    return clusters.filter(cluster => cluster.maxX - cluster.minX >= 3);
  });
  const box = await canvas.boundingBox();
  const size = await canvas.evaluate(element => ({
    width: element instanceof HTMLCanvasElement ? element.width : 0,
    height: element instanceof HTMLCanvasElement ? element.height : 0,
  }));
  if (box === null || size.width === 0 || size.height === 0) {
    return [];
  }
  return localBounds.map(bounds => ({
    minX: box.x + (bounds.minX / size.width) * box.width,
    minY: box.y + (bounds.minY / size.height) * box.height,
    maxX: box.x + (bounds.maxX / size.width) * box.width,
    maxY: box.y + (bounds.maxY / size.height) * box.height,
  }));
}

async function attachChromiumScreenshot(
  page: Page,
  browserName: string,
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  if (browserName !== 'chromium') {
    return;
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(
    () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  await testInfo.attach(name, {
    body: await page.screenshot({ animations: 'disabled', fullPage: true, type: 'png' }),
    contentType: 'image/png',
  });
}

test('renders a real nonblank G2 canvas in the desktop analytical plane', async ({
  browserName,
  page,
}, testInfo) => {
  await openReadyEditor(page, DESKTOP);

  const canvas = page.getByTestId('tellplot-chart').locator('canvas').first();
  await expect(canvas).toBeVisible();
  await expect.poll(() => paintedPixelCount(canvas)).toBeGreaterThan(500);

  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  expect(canvasBox?.width ?? 0).toBeGreaterThan(400);
  expect(canvasBox?.height ?? 0).toBeGreaterThan(360);

  const usageBox = await page
    .getByRole('complementary', { name: '在项目中使用 TellPlot' })
    .boundingBox();
  const chartBox = await page.getByTestId('tellplot-chart-stage').boundingBox();
  const railBox = await page
    .getByRole('complementary', { name: '结构大纲 / 检查器' })
    .boundingBox();
  expect(usageBox).not.toBeNull();
  expect(chartBox).not.toBeNull();
  expect(railBox).not.toBeNull();
  expect((usageBox?.x ?? 0) + (usageBox?.width ?? 0)).toBeLessThanOrEqual((chartBox?.x ?? 0) + 1);
  expect((chartBox?.x ?? 0) + (chartBox?.width ?? 0)).toBeLessThanOrEqual((railBox?.x ?? 0) + 1);
  await expectNoHorizontalOverflow(page);
  await attachChromiumScreenshot(page, browserName, testInfo, 'desktop-final.png');
});

test('keeps the chart visible and exposes the inspector tab at 1024px', async ({
  browserName,
  page,
}, testInfo) => {
  await openReadyEditor(page, COMPACT);

  const chartStage = page.getByTestId('tellplot-chart-stage');
  const chartBox = await chartStage.boundingBox();
  expect(chartBox).not.toBeNull();
  expect(chartBox?.width ?? 0).toBeGreaterThan(500);
  expect(chartBox?.height ?? 0).toBeGreaterThan(480);
  const canvas = page.getByTestId('tellplot-chart').locator('canvas').first();
  await expect(canvas).toBeVisible();
  await expect.poll(() => paintedPixelCount(canvas)).toBeGreaterThan(500);
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox?.width ?? 0).toBeGreaterThan(500);
  expect(canvasBox?.height ?? 0).toBeGreaterThan(430);
  await expect(page.getByRole('tree', { name: '结构大纲' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '检查器' })).toHaveAttribute('aria-selected', 'false');

  await page.getByRole('treeitem', { name: /销量增长/ }).click();
  await activateInspectorPanel(page);
  const inspector = page.getByRole('tabpanel', { name: '检查器' });
  await expect(inspector.getByRole('textbox', { name: '注释' })).toBeVisible();
  await expect(page.locator('[data-tellplot="editor"]')).not.toHaveAttribute(
    'data-overlay-open',
    'true',
  );
  const fileImport = page.getByRole('button', { name: '导入 ViewSpec', exact: true });
  expect(
    await fileImport.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      const hit = document.elementFromPoint(
        bounds.left + bounds.width / 2,
        bounds.top + bounds.height / 2,
      );
      return hit !== null && element.contains(hit);
    }),
  ).toBe(true);
  await expectNoHorizontalOverflow(page);
  await attachChromiumScreenshot(page, browserName, testInfo, 'compact-final.png');
});

test('keeps the mobile chart visible with reachable outline and inspector sheets', async ({
  browserName,
  page,
}, testInfo) => {
  await openReadyEditor(page, MOBILE);

  const chartBox = await page.getByTestId('tellplot-chart-stage').boundingBox();
  expect(chartBox).not.toBeNull();
  expect(chartBox?.width ?? 0).toBeGreaterThan(350);
  expect(chartBox?.height ?? 0).toBeGreaterThan(420);
  const canvas = page.getByTestId('tellplot-chart').locator('canvas').first();
  await expect(canvas).toBeVisible();
  await expect.poll(() => paintedPixelCount(canvas)).toBeGreaterThan(500);
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox?.width ?? 0).toBeGreaterThan(350);
  expect(canvasBox?.height ?? 0).toBeGreaterThan(420);
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: '打开结构大纲' }).click();
  const outlineSheet = page.getByRole('dialog', { name: '结构大纲' });
  await expect(outlineSheet).toBeVisible();
  const outlineBox = await outlineSheet.boundingBox();
  expect(outlineBox?.width ?? 0).toBeGreaterThanOrEqual(380);
  expect(outlineBox?.height ?? 0).toBeGreaterThanOrEqual(800);
  await outlineSheet.getByRole('treeitem', { name: /销量增长/ }).click();
  await page.getByRole('button', { name: '关闭结构大纲' }).click();
  await expect(outlineSheet).toBeHidden();

  await page.getByRole('button', { name: '打开检查器' }).click();
  const inspectorSheet = page.getByRole('dialog', { name: '检查器' });
  await expect(inspectorSheet).toBeVisible();
  const inspectorBox = await inspectorSheet.boundingBox();
  expect(inspectorBox?.width ?? 0).toBeGreaterThanOrEqual(380);
  expect(inspectorBox?.height ?? 0).toBeGreaterThanOrEqual(800);
  await expect(inspectorSheet.getByRole('textbox', { name: '注释' })).toBeVisible();
  await page.getByRole('button', { name: '关闭检查器' }).click();
  await expect(inspectorSheet).toBeHidden();

  await expect(page.getByTestId('tellplot-chart-stage')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await attachChromiumScreenshot(page, browserName, testInfo, 'mobile-final.png');

  const positiveBars = await positiveBarBounds(canvas);
  expect(positiveBars.length).toBeGreaterThanOrEqual(3);
  const priceBar = positiveBars[1];
  expect(priceBar).toBeDefined();
  if (priceBar === undefined) {
    return;
  }
  const width = priceBar.maxX - priceBar.minX;
  expect(width).toBeLessThan(32);
  const availablePadding = (32 - width) / 2;
  expect(availablePadding).toBeGreaterThan(1);
  await page.mouse.click(
    priceBar.minX - Math.min(6, availablePadding - 1),
    (priceBar.minY + priceBar.maxY) / 2,
  );
  await page.getByRole('button', { name: '打开检查器' }).click();
  const touchInspector = page.getByRole('dialog', { name: '检查器' });
  await expect(touchInspector.getByText('价格提升', { exact: true })).toBeVisible();
});
