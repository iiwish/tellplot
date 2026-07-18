import { readFile } from 'node:fs/promises';

import { expect, test, type Download, type Page } from '@playwright/test';

const EDITOR = '[data-tellplot="editor"]';
const MULTI_SELECT_MODIFIER: 'Meta' | 'Control' =
  process.platform === 'darwin' ? 'Meta' : 'Control';

async function openEditor(page: Page, mobile = false): Promise<void> {
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator(`${EDITOR}[data-editor-state="ready"]`)).toBeVisible();
  await expect(page.getByTestId('tellplot-chart').locator('canvas').first()).toBeVisible();
}

async function chooseExport(page: Page, name: 'SVG 图像' | 'PNG 图像' | 'ViewSpec JSON') {
  await page.getByRole('button', { name: '导出' }).click();
  const item = page.getByRole('menuitem', { name });
  await expect(item).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await item.click();
  return downloadPromise;
}

async function readDownload(download: Download): Promise<Buffer> {
  const path = await download.path();
  expect(path).not.toBeNull();
  if (path === null) {
    throw new Error('Expected a local download path');
  }
  return readFile(path);
}

test('ViewSpec JSON export and import preserve the current controlled view', async ({ page }) => {
  await openEditor(page);
  const sales = page.getByRole('treeitem', { name: /销量增长/ });
  await sales.focus();
  await page.keyboard.press('Alt+ArrowDown');
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '1');
  await sales.click();
  const annotationText = '董事会口径：剔除一次性项目';
  await page.getByRole('textbox', { name: '注释' }).fill(annotationText);
  await page.getByRole('button', { name: '保存注释' }).click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '2');
  await expect(page.getByText('注释已保存')).toBeVisible();

  const download = await chooseExport(page, 'ViewSpec JSON');
  await expect(page.getByRole('status', { name: '文件状态' })).toContainText('JSON_EXPORTED');
  expect(download.suggestedFilename()).toBe('2026-h1-operating-profit-bridge-view.json');
  const json = (await readDownload(download)).toString('utf8');
  expect(json).toContain('"schemaVersion":"1.0.0"');
  expect(json).not.toContain('sourceRef');
  const exported = JSON.parse(json) as {
    readonly revision: number;
    readonly rootOrder: string[];
    readonly annotations: Readonly<Record<string, string>>;
  };
  expect(exported.revision).toBe(2);
  expect(exported.rootOrder.slice(0, 2)).toEqual(['price-impact', 'sales-volume']);
  expect(exported.annotations['sales-volume']).toBe(annotationText);

  await page.reload();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '0');
  await page.getByLabel('导入 ViewSpec 文件').setInputFiles({
    name: 'saved-view.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json),
  });
  await expect(page.getByRole('status', { name: '文件状态' })).toContainText('VIEW_IMPORTED');
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '2');
  const order = await page
    .getByRole('tree', { name: '结构大纲' })
    .locator('[role="treeitem"][aria-level="1"][data-node-id]')
    .evaluateAll(rows => rows.map(row => row.getAttribute('data-node-id')));
  expect(order.slice(1, 3)).toEqual(['price-impact', 'sales-volume']);
  await page.getByRole('treeitem', { name: /销量增长/ }).click();
  await expect(page.getByRole('textbox', { name: '注释' })).toHaveValue(annotationText);
});

test('saving an annotation repaints the visible G2 canvas before image export', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openEditor(page);
  const canvas = page.getByTestId('tellplot-chart').locator('canvas').first();
  const canvasImage = (): Promise<string> =>
    canvas.evaluate(element => {
      if (!(element instanceof HTMLCanvasElement)) {
        throw new Error('Expected the visible G2 canvas');
      }
      return element.toDataURL('image/png');
    });
  const before = await canvasImage();

  await page.getByRole('treeitem', { name: /销量增长/ }).click();
  await page.getByRole('textbox', { name: '注释' }).fill('董事会复核');
  await page.getByRole('button', { name: '保存注释' }).click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '1');
  await expect.poll(canvasImage).not.toBe(before);
});

test('invalid ViewSpec import reports code and path without changing the current view', async ({
  page,
}) => {
  await openEditor(page);
  const before = await page.locator(EDITOR).getAttribute('data-view-revision');
  await page.getByLabel('导入 ViewSpec 文件').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schemaVersion":"2.0.0"}'),
  });

  const status = page.getByRole('status', { name: '文件状态' });
  await expect(status).toContainText('UNSUPPORTED_SCHEMA_VERSION');
  await expect(status).toContainText('/schemaVersion');
  await expect(status).not.toContainText('销量增长');
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', before ?? '0');
});

test('SVG export renders imported highlight and muted emphasis through the shared chart spec', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openEditor(page);
  const jsonDownload = await chooseExport(page, 'ViewSpec JSON');
  const exported = JSON.parse((await readDownload(jsonDownload)).toString('utf8')) as Record<
    string,
    unknown
  >;
  const emphasized = JSON.stringify({
    ...exported,
    emphasis: {
      'sales-volume': 'highlight',
      'price-impact': 'muted',
    },
  });
  await page.getByLabel('导入 ViewSpec 文件').setInputFiles({
    name: 'emphasized-view.json',
    mimeType: 'application/json',
    buffer: Buffer.from(emphasized),
  });
  await expect(page.getByRole('status', { name: '文件状态' })).toContainText('VIEW_IMPORTED');
  await page.evaluate(
    () =>
      new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );

  const svgDownload = await chooseExport(page, 'SVG 图像');
  const svg = (await readDownload(svgDownload)).toString('utf8');
  const elementStyles = await page.evaluate(text => {
    const parsed = new DOMParser().parseFromString(text, 'image/svg+xml');
    return [...parsed.querySelectorAll('path.element')].map(element => ({
      fillOpacity: element.getAttribute('fill-opacity'),
      stroke: element.getAttribute('stroke'),
      strokeWidth: element.getAttribute('stroke-width'),
    }));
  }, svg);
  expect(elementStyles).toContainEqual({
    fillOpacity: null,
    stroke: 'rgba(24,33,29,1)',
    strokeWidth: '3',
  });
  expect(elementStyles).toContainEqual({
    fillOpacity: '0.28',
    stroke: 'rgba(255,255,255,1)',
    strokeWidth: '1',
  });
});

test('PNG export is a nonempty double-density image and revokes its object URL', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = URL.revokeObjectURL.bind(URL);
    Object.defineProperty(window, '__tellplotRevokedUrls', { value: [], writable: false });
    URL.revokeObjectURL = url => {
      (window as Window & { readonly __tellplotRevokedUrls: string[] }).__tellplotRevokedUrls.push(
        url,
      );
      original(url);
    };
  });
  await openEditor(page);
  const plotBox = await page.getByTestId('tellplot-chart').boundingBox();
  expect(plotBox).not.toBeNull();
  const download = await chooseExport(page, 'PNG 图像');
  await expect(page.getByRole('status', { name: '文件状态' })).toContainText('PNG_EXPORTED');
  expect(download.suggestedFilename()).toBe('2026-h1-operating-profit-bridge.png');
  const png = await readDownload(download);
  expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');

  const pixels = await page.evaluate(async base64 => {
    const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    if (context === null) {
      return { width: 0, height: 0, painted: 0, titlePixels: 0 };
    }
    context.drawImage(bitmap, 0, 0);
    const data = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let painted = 0;
    let titlePixels = 0;
    const titleBandEnd = Math.floor(bitmap.height * 0.12);
    for (let offset = 0; offset < data.length; offset += 4) {
      if ((data[offset + 3] ?? 0) > 20) {
        painted += 1;
      }
      const pixelIndex = offset / 4;
      const y = Math.floor(pixelIndex / bitmap.width);
      if (
        y < titleBandEnd &&
        (data[offset] ?? 255) < 90 &&
        (data[offset + 1] ?? 255) < 90 &&
        (data[offset + 2] ?? 255) < 90 &&
        (data[offset + 3] ?? 0) > 80
      ) {
        titlePixels += 1;
      }
    }
    return { width: bitmap.width, height: bitmap.height, painted, titlePixels };
  }, png.toString('base64'));
  expect(pixels.width).toBeGreaterThanOrEqual(Math.floor((plotBox?.width ?? 1) * 1.9));
  expect(pixels.height).toBeGreaterThanOrEqual(Math.floor((plotBox?.height ?? 1) * 1.9));
  expect(pixels.painted).toBeGreaterThan(500);
  expect(pixels.titlePixels).toBeGreaterThan(25);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { readonly __tellplotRevokedUrls: string[] }).__tellplotRevokedUrls
            .length,
      ),
    )
    .toBeGreaterThan(0);
});

test('PNG export snapshots the latest revision without reading a stale visible canvas', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openEditor(page);
  const baseline = await readDownload(await chooseExport(page, 'PNG 图像'));

  const sales = page.getByRole('treeitem', { name: /销量增长/ });
  await sales.focus();
  await page.keyboard.press('Alt+ArrowDown');
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '1');
  await sales.click();
  await page.getByRole('textbox', { name: '注释' }).fill('立即导出的最新口径');
  await page.getByRole('button', { name: '保存注释' }).click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '2');

  await page.getByRole('button', { name: '导出' }).click();
  const pngItem = page.getByRole('menuitem', { name: 'PNG 图像' });
  await expect(pngItem).toBeVisible();
  await page
    .getByTestId('tellplot-chart')
    .locator('canvas')
    .first()
    .evaluate(element => {
      if (!(element instanceof HTMLCanvasElement)) {
        throw new Error('Expected the visible G2 canvas');
      }
      const context = element.getContext('2d');
      if (context === null) {
        throw new Error('Expected a visible canvas context');
      }
      context.fillStyle = '#ff00ff';
      context.fillRect(0, 0, element.width, element.height);
    });
  const downloadPromise = page.waitForEvent('download');
  await pngItem.click();
  const latest = await readDownload(await downloadPromise);

  const evidence = await page.evaluate(
    async ({ baselineBase64, latestBase64 }) => {
      const pixels = async (base64: string): Promise<ImageData> => {
        const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
        const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext('2d');
        if (context === null) {
          throw new Error('Expected an export analysis context');
        }
        context.drawImage(bitmap, 0, 0);
        return context.getImageData(0, 0, bitmap.width, bitmap.height);
      };
      const before = await pixels(baselineBase64);
      const after = await pixels(latestBase64);
      let changed = 0;
      let magenta = 0;
      let chartColor = 0;
      for (let offset = 0; offset < after.data.length; offset += 4) {
        if (
          Math.abs((before.data[offset] ?? 0) - (after.data[offset] ?? 0)) > 8 ||
          Math.abs((before.data[offset + 1] ?? 0) - (after.data[offset + 1] ?? 0)) > 8 ||
          Math.abs((before.data[offset + 2] ?? 0) - (after.data[offset + 2] ?? 0)) > 8 ||
          Math.abs((before.data[offset + 3] ?? 0) - (after.data[offset + 3] ?? 0)) > 8
        ) {
          changed += 1;
        }
        const red = after.data[offset] ?? 0;
        const green = after.data[offset + 1] ?? 0;
        const blue = after.data[offset + 2] ?? 0;
        const alpha = after.data[offset + 3] ?? 0;
        if (red > 240 && green < 20 && blue > 240 && alpha > 240) {
          magenta += 1;
        }
        if (
          alpha > 200 &&
          ((green > red * 1.5 && green > blue * 1.15) ||
            (red > green * 1.35 && red > blue * 1.2) ||
            (blue > red * 1.25 && blue > green * 1.05))
        ) {
          chartColor += 1;
        }
      }
      return { changed, magenta, chartColor };
    },
    {
      baselineBase64: baseline.toString('base64'),
      latestBase64: latest.toString('base64'),
    },
  );

  expect(evidence.changed).toBeGreaterThan(500);
  expect(evidence.magenta).toBeLessThan(10);
  expect(evidence.chartColor).toBeGreaterThan(500);
});

test('SVG export reflects collapsed state and contains no executable or source metadata', async ({
  page,
}) => {
  await openEditor(page);
  await page.getByRole('treeitem', { name: /销量增长/ }).click();
  await page
    .getByRole('treeitem', { name: /价格提升/ })
    .click({ modifiers: [MULTI_SELECT_MODIFIER] });
  await page.getByRole('textbox', { name: '分组名称' }).fill('增长驱动');
  await page.getByRole('button', { name: '创建分组' }).click();
  await page.getByRole('button', { name: '折叠 增长驱动' }).click();

  const download = await chooseExport(page, 'SVG 图像');
  await expect(page.getByRole('status', { name: '文件状态' })).toContainText('SVG_EXPORTED');
  expect(download.suggestedFilename()).toBe('2026-h1-operating-profit-bridge.svg');
  const svg = (await readDownload(download)).toString('utf8');
  expect(svg).toContain('<svg');
  expect(svg).toContain('经营变动瀑布图');
  expect(svg).toContain('增长驱动');
  expect(svg).not.toContain('销量增长');
  expect(svg).not.toContain('价格提升');
  expect(svg).not.toMatch(
    /<script|foreignObject|javascript:|(?:href|xlink:href)=["']https?:|url\(["']?https?:|sourceRef|ledger:/iu,
  );
  expect(svg.indexOf('期初营业利润')).toBeLessThan(svg.indexOf('增长驱动'));
  expect(svg.indexOf('增长驱动')).toBeLessThan(svg.indexOf('期末净利润'));
  await expect(page.locator('body > div[aria-hidden="true"][style*="-10000px"]')).toHaveCount(0);
});

test('nested JSON preserves the recursive view and SVG exports only its visible projection', async ({
  page,
}) => {
  await openEditor(page);
  await page.getByRole('treeitem', { name: /销量增长/ }).click();
  await page
    .getByRole('treeitem', { name: /价格提升/ })
    .click({ modifiers: [MULTI_SELECT_MODIFIER] });
  await page.getByRole('textbox', { name: '分组名称' }).fill('增长驱动');
  await page.getByRole('button', { name: '创建分组' }).click();
  await page.getByRole('checkbox', { name: '选择 产品结构' }).click();
  await page.getByRole('textbox', { name: '分组名称' }).fill('经营桥');
  await page.getByRole('button', { name: '创建分组' }).click();
  await page.getByRole('button', { name: '折叠 经营桥' }).click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '3');

  const jsonDownload = await chooseExport(page, 'ViewSpec JSON');
  await expect(page.getByRole('status', { name: '文件状态' })).toContainText('JSON_EXPORTED');
  const json = (await readDownload(jsonDownload)).toString('utf8');
  const exported = JSON.parse(json) as {
    readonly revision: number;
    readonly rootOrder: readonly string[];
    readonly groups: Readonly<
      Record<string, { readonly id: string; readonly label: string; readonly childIds: string[] }>
    >;
    readonly collapsedGroupIds: readonly string[];
  };
  const inner = Object.values(exported.groups).find(group => group.label === '增长驱动');
  const outer = Object.values(exported.groups).find(group => group.label === '经营桥');
  expect(inner).toBeDefined();
  expect(outer).toBeDefined();
  expect(inner?.childIds).toEqual(['sales-volume', 'price-impact']);
  expect(outer?.childIds).toEqual([inner?.id, 'product-mix']);
  expect(exported.rootOrder).toContain(outer?.id);
  expect(exported.rootOrder).not.toContain(inner?.id);
  expect(exported.collapsedGroupIds).toEqual([outer?.id]);
  expect(exported.revision).toBe(3);
  expect(json).not.toMatch(/"(?:amount|sourceRef|metadata)"|ledger:/u);
  expect(json).not.toContain('销量增长');
  expect(json).not.toContain('价格提升');

  const svgDownload = await chooseExport(page, 'SVG 图像');
  await expect(page.getByRole('status', { name: '文件状态' })).toContainText('SVG_EXPORTED');
  const svg = (await readDownload(svgDownload)).toString('utf8');
  expect(svg).toContain('经营桥');
  expect(svg).not.toContain('增长驱动');
  expect(svg).not.toContain('销量增长');
  expect(svg).not.toContain('价格提升');
  expect(svg).not.toContain('产品结构');
  expect(svg).not.toMatch(
    /sales-volume|price-impact|product-mix|<script|foreignObject|javascript:|sourceRef|metadata|ledger:/iu,
  );
  expect(svg.indexOf('期初营业利润')).toBeLessThan(svg.indexOf('经营桥'));
  expect(svg.indexOf('经营桥')).toBeLessThan(svg.indexOf('经营利润小计'));
  await expect(page.locator('body > div[aria-hidden="true"][style*="-10000px"]')).toHaveCount(0);
});
