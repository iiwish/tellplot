import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  expect,
  test,
  type Download,
  type Locator,
  type Page,
  type TestInfo,
} from '@playwright/test';

import { activateInspectorPanel } from './editorPanels';

const EDITOR = '[data-tellplot="editor"]';
const PALETTE = ['#0072B2', '#D55E00', '#009E73', '#CC79A7'] as const;
const SERIES_IDS = [
  'responsive-series-1',
  'responsive-series-2',
  'responsive-series-3',
  'responsive-series-4',
] as const;

interface Rectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface PaintedComponent extends Rectangle {
  readonly color: string;
  readonly area: number;
  readonly centerX: number;
  readonly centerY: number;
}

interface MatrixCellReceipt {
  readonly id: string;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly locale: 'zh-CN' | 'en-US';
  readonly state: 'idle' | 'hover' | 'active-drag';
  readonly canvas: {
    readonly width: number;
    readonly height: number;
    readonly paintedPixels: number;
    readonly expectedVisibleMarks: 200;
    readonly rasterDistinctColoredComponents: number;
  };
  readonly screen: {
    readonly pageHorizontalOverflow: number;
    readonly plotRect: Rectangle;
    readonly legendRect: Rectangle;
    readonly toolbarRect: Rectangle;
    readonly layoutIntersections: number;
    readonly requiredTextIntersections: number;
    readonly transientKind: 'none' | 'tooltip' | 'drag-overlay';
    readonly transientRect: Rectangle | null;
    readonly transientOcclusions: number;
    readonly transientTargetIntersection: boolean;
    readonly dropIndicator: boolean;
  };
  readonly svg: {
    readonly localBBox: Rectangle;
    readonly clientRect: Rectangle;
    readonly visibleTextCount: number;
    readonly textIntersections: number;
    readonly textIntersectionKinds: readonly string[];
    readonly intervalCount: number;
    readonly automaticValueLabelCount: number;
    readonly annotationLabelCount: number;
    readonly unsafeElementCount: number;
    readonly externalReferenceCount: number;
    readonly transientElementCount: number;
  };
  readonly accessible: {
    readonly outlineCategoryCount: number;
    readonly outlineSourceOrderMatched: boolean;
    readonly tooltipSeriesCount: number;
    readonly tooltipSourceOrderMatched: boolean;
    readonly inspectorSeriesCount: number;
    readonly inspectorSourceOrderMatched: boolean;
    readonly categoryEditCommitted: boolean;
  };
  readonly screenshot: string;
}

function zhCategoryLabel(index: number): string {
  return `分类项目第${String(index + 1).padStart(3, '0')}号样本项`;
}

function enCategoryLabel(index: number): string {
  const label = `Comparison category ${String(index + 1).padStart(3, '0')}`;
  return index === 0 ? `${label}x` : label;
}

const families = [
  {
    id: 'zh-CN',
    fixture: 'comparison-responsive-zh',
    categoryLabels: Array.from({ length: 50 }, (_, index) => zhCategoryLabel(index)),
    seriesLabels: ['方案甲', '方案乙', '方案丙', '方案丁'],
  },
  {
    id: 'en-US',
    fixture: 'comparison-responsive-en',
    categoryLabels: Array.from({ length: 50 }, (_, index) => enCategoryLabel(index)),
    seriesLabels: ['Scenario A', 'Scenario B', 'Scenario C', 'Scenario D'],
  },
] as const;

const viewports = [
  { id: 'wide', width: 1280, height: 720 },
  { id: 'compact', width: 640, height: 480 },
] as const;

const states = ['idle', 'hover', 'active-drag'] as const;

function intersects(left: Rectangle, right: Rectangle, tolerance = 0.5): boolean {
  return (
    left.x + tolerance < right.x + right.width &&
    right.x + tolerance < left.x + left.width &&
    left.y + tolerance < right.y + right.height &&
    right.y + tolerance < left.y + left.height
  );
}

function unionRectangles(rectangles: readonly Rectangle[]): Rectangle | null {
  if (rectangles.length === 0) {
    return null;
  }
  const minX = Math.min(...rectangles.map(rectangle => rectangle.x));
  const minY = Math.min(...rectangles.map(rectangle => rectangle.y));
  const maxX = Math.max(...rectangles.map(rectangle => rectangle.x + rectangle.width));
  const maxY = Math.max(...rectangles.map(rectangle => rectangle.y + rectangle.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

async function chooseSvgExport(page: Page): Promise<Download> {
  await page.getByRole('button', { name: '导出' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name: 'SVG 图像' }).click();
  return download;
}

async function readDownload(download: Download): Promise<string> {
  const path = await download.path();
  if (path === null) {
    throw new Error('Responsive SVG download has no local path');
  }
  return (await readFile(path)).toString('utf8');
}

async function paintedComponents(canvas: Locator): Promise<readonly PaintedComponent[]> {
  const local = await canvas.evaluate((element, colors) => {
    if (!(element instanceof HTMLCanvasElement)) {
      return [];
    }
    const context = element.getContext('2d');
    if (context === null) {
      return [];
    }
    const targets = colors.map(color => ({
      color,
      red: Number.parseInt(color.slice(1, 3), 16),
      green: Number.parseInt(color.slice(3, 5), 16),
      blue: Number.parseInt(color.slice(5, 7), 16),
    }));
    const pixels = context.getImageData(0, 0, element.width, element.height).data;
    const result: {
      color: string;
      area: number;
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    }[] = [];
    for (const target of targets) {
      const matching = new Uint8Array(element.width * element.height);
      for (let index = 0; index < matching.length; index += 1) {
        const offset = index * 4;
        if (
          (pixels[offset + 3] ?? 0) > 120 &&
          Math.abs((pixels[offset] ?? 0) - target.red) <= 8 &&
          Math.abs((pixels[offset + 1] ?? 0) - target.green) <= 8 &&
          Math.abs((pixels[offset + 2] ?? 0) - target.blue) <= 8
        ) {
          matching[index] = 1;
        }
      }
      const visited = new Uint8Array(matching.length);
      for (let start = 0; start < matching.length; start += 1) {
        if (matching[start] !== 1 || visited[start] === 1) {
          continue;
        }
        visited[start] = 1;
        const queue = [start];
        let area = 0;
        let minX = element.width;
        let minY = element.height;
        let maxX = 0;
        let maxY = 0;
        while (queue.length > 0) {
          const index = queue.pop();
          if (index === undefined) {
            break;
          }
          const x = index % element.width;
          const y = Math.floor(index / element.width);
          area += 1;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          for (const neighbor of [
            index - 1,
            index + 1,
            index - element.width,
            index + element.width,
          ]) {
            if (
              neighbor >= 0 &&
              neighbor < matching.length &&
              matching[neighbor] === 1 &&
              visited[neighbor] === 0 &&
              Math.abs((neighbor % element.width) - x) <= 1
            ) {
              visited[neighbor] = 1;
              queue.push(neighbor);
            }
          }
        }
        if (area >= 3) {
          result.push({ color: target.color, area, minX, minY, maxX, maxY });
        }
      }
    }
    return {
      components: result,
      width: element.width,
      height: element.height,
    };
  }, PALETTE);
  const box = await canvas.boundingBox();
  if (box === null || Array.isArray(local) || local.width <= 0 || local.height <= 0) {
    return [];
  }
  const scaleX = box.width / local.width;
  const scaleY = box.height / local.height;
  return local.components.map(component => {
    const x = box.x + component.minX * scaleX;
    const y = box.y + component.minY * scaleY;
    const width = (component.maxX - component.minX + 1) * scaleX;
    const height = (component.maxY - component.minY + 1) * scaleY;
    return {
      color: component.color,
      area: component.area,
      x,
      y,
      width,
      height,
      centerX: x + width / 2,
      centerY: y + height / 2,
    };
  });
}

async function paintedPixelCount(canvas: Locator): Promise<number> {
  return canvas.evaluate(element => {
    if (!(element instanceof HTMLCanvasElement)) return 0;
    const context = element.getContext('2d');
    if (context === null) return 0;
    const pixels = context.getImageData(0, 0, element.width, element.height).data;
    let count = 0;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      if (
        (pixels[offset + 3] ?? 0) > 20 &&
        ((pixels[offset] ?? 255) < 242 ||
          (pixels[offset + 1] ?? 255) < 242 ||
          (pixels[offset + 2] ?? 255) < 242)
      ) {
        count += 1;
      }
    }
    return count;
  });
}

async function hoverPaintedTooltip(
  page: Page,
  components: readonly PaintedComponent[],
): Promise<{
  readonly component: PaintedComponent;
  readonly point: { readonly x: number; readonly y: number };
  readonly tooltip: Locator;
}> {
  const tooltip = page.locator('.g2-tooltip').filter({ visible: true });
  for (const component of [...components].sort((left, right) => right.area - left.area)) {
    await page.mouse.move(component.centerX, component.centerY);
    await page.evaluate(
      () => new Promise<void>(resolveFrame => requestAnimationFrame(() => resolveFrame())),
    );
    if (await tooltip.isVisible()) {
      return { component, point: { x: component.centerX, y: component.centerY }, tooltip };
    }
  }
  throw new Error('No exact G2 comparison tooltip hit was found in the painted intervals');
}

async function openFamily(
  page: Page,
  viewport: (typeof viewports)[number],
  family: (typeof families)[number],
): Promise<Locator> {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(`/playground?fixture=${family.fixture}`);
  const editor = page.locator(EDITOR);
  await expect(editor).toHaveAttribute('data-editor-state', 'ready');
  await expect(editor).toHaveAttribute('data-chart-type', 'column');
  let input = page.getByRole('textbox', { name: 'TellPlot 图表配置' });
  if (!(await input.isVisible())) {
    await page.getByRole('button', { name: '显示使用代码' }).click();
    input = page.getByRole('textbox', { name: 'TellPlot 图表配置' });
    await expect(input).toBeVisible();
  }
  const config = JSON.parse(await input.inputValue()) as {
    locale?: string;
    appearance?: Record<string, unknown>;
  };
  config.locale = family.id;
  config.appearance = {
    ...config.appearance,
    animation: { enabled: false },
    legend: true,
    labels: { value: { display: 'auto', placement: 'outside', offset: 6 }, group: 'auto' },
    tooltip: true,
  };
  await input.fill(JSON.stringify(config, null, 2));
  await expect(page.getByRole('status', { name: '图表配置状态' })).toContainText('LIVE_SYNCED');
  const closeUsage = page.getByRole('button', { name: '关闭使用说明' });
  if (await closeUsage.isVisible()) {
    await closeUsage.click();
  } else {
    const usageToggle = page.getByRole('button', { name: '隐藏使用代码' });
    if (await usageToggle.isVisible()) {
      await usageToggle.click();
    }
  }
  await expect(page.getByTestId('tellplot-chart-stage')).toHaveAttribute(
    'data-render-state',
    'ready',
  );
  const canvas = page.getByTestId('tellplot-chart').locator('canvas').first();
  await expect(canvas).toBeVisible();
  await expect.poll(() => paintedPixelCount(canvas)).toBeGreaterThan(500);
  await page.evaluate(
    () =>
      new Promise<void>(resolveFrame =>
        requestAnimationFrame(() => requestAnimationFrame(resolveFrame)),
      ),
  );
  return canvas;
}

async function ensureOutline(page: Page): Promise<Locator> {
  let tree = page.locator('[role="tree"]:visible').first();
  if ((await tree.count()) > 0) {
    return tree;
  }
  const tab = page
    .locator('[role="tab"]:visible')
    .filter({ hasText: /^(结构大纲|Structure outline)$/u })
    .first();
  if ((await tab.count()) > 0) {
    await tab.click();
  } else {
    await page.getByRole('button', { name: /打开结构大纲|Open structure outline/ }).click();
  }
  tree = page.locator('[role="tree"]:visible').first();
  await expect(tree).toBeVisible();
  return tree;
}

async function dismissOverlayPanels(page: Page): Promise<void> {
  const close = page
    .getByRole('button', {
      name: /关闭结构大纲|Close structure outline|关闭检查器|Close inspector/,
    })
    .filter({ visible: true })
    .first();
  if ((await close.count()) > 0) {
    await close.click();
  }
}

async function verifyAccessiblePaths(
  page: Page,
  canvas: Locator,
  family: (typeof families)[number],
): Promise<MatrixCellReceipt['accessible']> {
  const tree = await ensureOutline(page);
  const rows = tree.locator('[role="treeitem"][aria-level="1"][data-node-id]');
  await expect(rows).toHaveCount(50);
  const outlineLabels = await rows.locator('.tp-row-label').allTextContents();
  const outlineSourceOrderMatched = outlineLabels.every(
    (label, index) => label.trim() === family.categoryLabels[index],
  );
  expect(outlineSourceOrderMatched).toBe(true);
  await rows.first().click();
  await dismissOverlayPanels(page);

  const inspector = await activateInspectorPanel(page);
  const inspectorValues = inspector.locator('[data-series-id]');
  await expect(inspectorValues).toHaveCount(4);
  const inspectorOrder = await inspectorValues.evaluateAll(values =>
    values.map(value => value.getAttribute('data-series-id')),
  );
  expect(inspectorOrder).toEqual(SERIES_IDS);
  const revisionBefore = Number.parseInt(
    (await page.locator(EDITOR).getAttribute('data-view-revision')) ?? '-1',
    10,
  );
  const annotation = inspector.getByRole('textbox', { name: /注释|Annotation/ });
  await annotation.fill(`responsive-${family.id}`);
  await inspector.getByRole('button', { name: /保存注释|Save annotation/ }).click();
  await expect(page.locator(EDITOR)).toHaveAttribute(
    'data-view-revision',
    String(revisionBefore + 1),
  );
  await dismissOverlayPanels(page);

  const components = (await paintedComponents(canvas)).filter(component => component.height > 8);
  if (components.length === 0) {
    throw new Error('Responsive accessible path has no painted interval');
  }
  const { tooltip } = await hoverPaintedTooltip(page, components);
  await expect(tooltip).toBeVisible();
  const tooltipOrder = (await tooltip.locator('.g2-tooltip-list-item-name').allTextContents()).map(
    text => text.trim(),
  );
  expect(tooltipOrder).toEqual(family.seriesLabels);
  await page.mouse.move(1, 1);
  await expect(tooltip).toHaveCount(0);

  return {
    outlineCategoryCount: outlineLabels.length,
    outlineSourceOrderMatched,
    tooltipSeriesCount: tooltipOrder.length,
    tooltipSourceOrderMatched: true,
    inspectorSeriesCount: inspectorOrder.length,
    inspectorSourceOrderMatched: true,
    categoryEditCommitted: true,
  };
}

async function inspectMountedSvg(
  page: Page,
  svgSource: string,
  annotationText: string,
): Promise<MatrixCellReceipt['svg']> {
  const receipt = await page.evaluate(
    ({ source, colors, annotation }) => {
      const host = document.createElement('div');
      host.style.position = 'fixed';
      host.style.inset = '0 auto auto 0';
      host.style.zIndex = '2147483647';
      host.style.background = '#ffffff';
      host.innerHTML = source;
      document.body.append(host);
      try {
        const svg = host.querySelector('svg');
        if (!(svg instanceof SVGSVGElement)) {
          return null;
        }
        const local = svg.getBBox();
        const client = svg.getBoundingClientRect();
        const all = Array.from(svg.querySelectorAll('*'));
        const visibleTexts = Array.from(svg.querySelectorAll('text')).flatMap(textNode => {
          if (!(textNode instanceof SVGGraphicsElement)) return [];
          const style = getComputedStyle(textNode);
          const localBox = textNode.getBBox();
          const clientBox = textNode.getBoundingClientRect();
          if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            Number.parseFloat(style.opacity || '1') <= 0 ||
            localBox.width <= 0 ||
            localBox.height <= 0 ||
            clientBox.width <= 0 ||
            clientBox.height <= 0
          ) {
            return [];
          }
          return [
            {
              x: clientBox.x,
              y: clientBox.y,
              width: clientBox.width,
              height: clientBox.height,
              kind: `${textNode.getAttribute('class') ?? 'text'}|${textNode.parentElement?.getAttribute('class') ?? 'parent'}`,
            },
          ];
        });
        let textIntersections = 0;
        const textIntersectionKinds: string[] = [];
        for (let left = 0; left < visibleTexts.length; left += 1) {
          for (let right = left + 1; right < visibleTexts.length; right += 1) {
            const a = visibleTexts[left];
            const b = visibleTexts[right];
            if (
              a !== undefined &&
              b !== undefined &&
              a.x + 0.5 < b.x + b.width &&
              b.x + 0.5 < a.x + a.width &&
              a.y + 0.5 < b.y + b.height &&
              b.y + 0.5 < a.y + a.height
            ) {
              textIntersections += 1;
              textIntersectionKinds.push(
                `${a.kind}@${String(a.x)},${String(a.y)},${String(a.width)},${String(a.height)} <> ${b.kind}@${String(b.x)},${String(b.y)},${String(b.width)},${String(b.height)} overlap=${String(
                  Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
                )}x${String(Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))}`,
              );
            }
          }
        }
        const intervals = all.filter(element => {
          if (!(element instanceof SVGGraphicsElement)) return false;
          return (
            element.classList.contains('element') &&
            element.closest('g.main-layer') !== null &&
            colors.includes(getComputedStyle(element).fill)
          );
        });
        const automaticValueLabels = Array.from(svg.querySelectorAll('text')).filter(text => {
          return (
            text.closest('g.label') !== null &&
            !text.classList.contains('g2-axis-label-item') &&
            !text.classList.contains('g2-legend-label') &&
            text.textContent?.trim() !== annotation
          );
        });
        const annotationLabels = Array.from(svg.querySelectorAll('text')).filter(
          text => text.closest('g.label') !== null && text.textContent?.trim() === annotation,
        );
        return {
          localBBox: { x: local.x, y: local.y, width: local.width, height: local.height },
          clientRect: { x: client.x, y: client.y, width: client.width, height: client.height },
          visibleTextCount: visibleTexts.length,
          textIntersections,
          textIntersectionKinds,
          intervalCount: intervals.length,
          automaticValueLabelCount: automaticValueLabels.length,
          annotationLabelCount: annotationLabels.length,
          unsafeElementCount: svg.querySelectorAll(
            'script,foreignObject,iframe,object,embed,image,use,animate,animateMotion,animateTransform,set',
          ).length,
          externalReferenceCount: all.filter(element =>
            Array.from(element.attributes).some(attribute =>
              /(?:https?:|javascript:|data:|file:|ftp:)/iu.test(attribute.value),
            ),
          ).length,
          transientElementCount: svg.querySelectorAll(
            '.g2-tooltip,[data-testid="chart-drag-overlay"],[data-drop-indicator]',
          ).length,
        };
      } finally {
        host.remove();
      }
    },
    {
      source: svgSource,
      annotation: annotationText,
      colors: PALETTE.map(color => {
        const red = Number.parseInt(color.slice(1, 3), 16);
        const green = Number.parseInt(color.slice(3, 5), 16);
        const blue = Number.parseInt(color.slice(5, 7), 16);
        return `rgb(${red}, ${green}, ${blue})`;
      }),
    },
  );
  expect(receipt).not.toBeNull();
  if (receipt === null) {
    throw new Error('Responsive public SVG did not mount');
  }
  expect(receipt.localBBox.width).toBeGreaterThan(0);
  expect(receipt.localBBox.height).toBeGreaterThan(0);
  expect(receipt.clientRect.width).toBeGreaterThan(0);
  expect(receipt.clientRect.height).toBeGreaterThan(0);
  expect(receipt.visibleTextCount).toBeGreaterThan(0);
  expect(receipt.textIntersections, JSON.stringify(receipt.textIntersectionKinds)).toBe(0);
  expect(receipt.intervalCount).toBe(200);
  expect(receipt.automaticValueLabelCount).toBe(0);
  expect(receipt.annotationLabelCount).toBe(1);
  expect(receipt.unsafeElementCount).toBe(0);
  expect(receipt.externalReferenceCount).toBe(0);
  expect(receipt.transientElementCount).toBe(0);
  return receipt;
}

async function screenshotCell(page: Page, testInfo: TestInfo, cellId: string): Promise<string> {
  const filename = `${cellId}.png`;
  const evidenceDirectory = process.env['TELLPLOT_T141_RESPONSIVE_EVIDENCE_DIR'];
  const path =
    evidenceDirectory === undefined
      ? testInfo.outputPath(filename)
      : resolve(process.cwd(), evidenceDirectory, filename);
  if (evidenceDirectory !== undefined) {
    await mkdir(resolve(process.cwd(), evidenceDirectory), { recursive: true });
  }
  await page.screenshot({ path });
  await testInfo.attach(filename, { path, contentType: 'image/png' });
  return `responsive-screenshots/${filename}`;
}

async function screenReceipt(
  page: Page,
  canvas: Locator,
  state: (typeof states)[number],
  components: readonly PaintedComponent[],
  currentTarget: PaintedComponent | undefined,
): Promise<MatrixCellReceipt['screen']> {
  const canvasBox = await canvas.boundingBox();
  const toolbarBox = await page.getByRole('toolbar').boundingBox();
  expect(canvasBox).not.toBeNull();
  expect(toolbarBox).not.toBeNull();
  const intervalComponents = components.filter(component => component.height > 16);
  const legendComponents = components.filter(
    component =>
      canvasBox !== null &&
      component.centerY < canvasBox.y + canvasBox.height * 0.18 &&
      component.height <= 16,
  );
  const plotRect = unionRectangles(intervalComponents);
  const legendRect = unionRectangles(legendComponents);
  expect(plotRect).not.toBeNull();
  expect(legendRect).not.toBeNull();
  if (plotRect === null || legendRect === null || toolbarBox === null) {
    throw new Error('Responsive layout rectangles are incomplete');
  }
  const layoutIntersections = [
    intersects(plotRect, legendRect),
    intersects(plotRect, toolbarBox),
    intersects(legendRect, toolbarBox),
  ].filter(Boolean).length;
  expect(layoutIntersections).toBe(0);
  const requiredTextRects = await page.locator('.tp-toolbar button:visible').evaluateAll(elements =>
    elements.map(element => {
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    }),
  );
  let requiredTextIntersections = 0;
  for (let left = 0; left < requiredTextRects.length; left += 1) {
    for (let right = left + 1; right < requiredTextRects.length; right += 1) {
      const a = requiredTextRects[left];
      const b = requiredTextRects[right];
      if (a !== undefined && b !== undefined && intersects(a, b)) {
        requiredTextIntersections += 1;
      }
    }
  }
  expect(requiredTextIntersections).toBe(0);
  const transient =
    state === 'hover'
      ? page.locator('.g2-tooltip').filter({ visible: true })
      : state === 'active-drag'
        ? page.getByTestId('chart-drag-overlay')
        : null;
  const transientRect = transient === null ? null : await transient.boundingBox();
  if (state === 'idle') {
    expect(transientRect).toBeNull();
  } else {
    expect(transientRect).not.toBeNull();
  }
  const transientTargetIntersection =
    transientRect !== null &&
    currentTarget !== undefined &&
    intersects(transientRect, currentTarget);
  const transientOcclusions =
    transientRect === null
      ? 0
      : [legendRect, toolbarBox, ...requiredTextRects].filter(rectangle =>
          intersects(transientRect, rectangle),
        ).length;
  if (state !== 'idle') {
    expect(transientOcclusions).toBe(0);
  }
  if (state === 'active-drag') {
    expect(transientTargetIntersection).toBe(false);
  }
  const pageHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(pageHorizontalOverflow).toBeLessThanOrEqual(1);
  return {
    pageHorizontalOverflow,
    plotRect,
    legendRect,
    toolbarRect: toolbarBox,
    layoutIntersections,
    requiredTextIntersections,
    transientKind: state === 'idle' ? 'none' : state === 'hover' ? 'tooltip' : 'drag-overlay',
    transientRect,
    transientOcclusions,
    transientTargetIntersection,
    dropIndicator:
      state === 'active-drag' &&
      ((await page.getByTestId('tellplot-chart').getAttribute('data-drop-indicator')) !== null ||
        (await page.getByTestId('tellplot-chart').getAttribute('data-drop-inside')) !== null),
  };
}

for (const viewport of viewports) {
  for (const family of families) {
    test(`50x4 responsive matrix ${viewport.id} ${family.id}`, async ({ page }, testInfo) => {
      test.setTimeout(120_000);
      const canvas = await openFamily(page, viewport, family);
      const accessible = await verifyAccessiblePaths(page, canvas, family);
      const receipts: MatrixCellReceipt[] = [];

      for (const state of states) {
        await page.mouse.move(1, 1);
        await expect(page.locator(`${EDITOR}[data-interaction-state="idle"]`)).toBeVisible();
        const components = (await paintedComponents(canvas)).sort(
          (left, right) => left.centerX - right.centerX,
        );
        const intervals = components.filter(component => component.height > 16);
        expect(intervals.length).toBeGreaterThanOrEqual(200);
        const activeViewport = page.viewportSize();
        const interactiveIntervals = intervals.filter(
          component =>
            activeViewport !== null &&
            component.centerX >= 0 &&
            component.centerX <= activeViewport.width &&
            component.centerY >= 0 &&
            component.centerY <= activeViewport.height,
        );
        expect(interactiveIntervals.length).toBeGreaterThanOrEqual(2);
        let currentTarget: PaintedComponent | undefined;
        if (state === 'hover') {
          ({ component: currentTarget } = await hoverPaintedTooltip(page, interactiveIntervals));
        } else if (state === 'active-drag') {
          const { component: sourceComponent, point: source } = await hoverPaintedTooltip(
            page,
            interactiveIntervals,
          );
          const target = [...interactiveIntervals].sort(
            (left, right) => Math.abs(right.centerX - source.x) - Math.abs(left.centerX - source.x),
          )[0];
          if (target === undefined) {
            throw new Error('Responsive interaction intervals are incomplete');
          }
          currentTarget = sourceComponent;
          await page.mouse.move(1, 1);
          await expect(page.locator('.g2-tooltip').filter({ visible: true })).toHaveCount(0);
          await page.mouse.move(source.x, source.y);
          await page.mouse.down();
          await page.mouse.move(target.centerX, target.centerY, { steps: 6 });
          await expect(page.locator(`${EDITOR}[data-interaction-state="dragging"]`)).toBeVisible();
          await expect(page.getByTestId('chart-drag-overlay')).toBeVisible();
        }

        const cellId = `${viewport.id}-${family.id}-${state}`;
        const screen = await screenReceipt(
          page,
          canvas,
          state,
          await paintedComponents(canvas),
          currentTarget,
        );
        if (state === 'active-drag') {
          expect(screen.dropIndicator).toBe(true);
        }
        const screenshot = await screenshotCell(page, testInfo, cellId);
        if (state === 'active-drag') {
          await page.keyboard.press('Escape');
          await page.mouse.up();
          await expect(page.locator(`${EDITOR}[data-interaction-state="idle"]`)).toBeVisible();
        } else if (state === 'hover') {
          await page.mouse.move(1, 1);
        }
        const svg = await inspectMountedSvg(
          page,
          await readDownload(await chooseSvgExport(page)),
          `responsive-${family.id}`,
        );
        receipts.push({
          id: cellId,
          viewport: { width: viewport.width, height: viewport.height },
          locale: family.id,
          state,
          canvas: {
            width: (await canvas.boundingBox())?.width ?? 0,
            height: (await canvas.boundingBox())?.height ?? 0,
            paintedPixels: await paintedPixelCount(canvas),
            expectedVisibleMarks: 200,
            rasterDistinctColoredComponents: intervals.length,
          },
          screen,
          svg,
          accessible,
          screenshot,
        });
      }

      expect(receipts).toHaveLength(3);
      await testInfo.attach(`responsive-${viewport.id}-${family.id}.json`, {
        body: Buffer.from(JSON.stringify(receipts, null, 2)),
        contentType: 'application/json',
      });
      const receiptDirectory = process.env['TELLPLOT_T141_RESPONSIVE_RECEIPT_DIR'];
      if (receiptDirectory !== undefined) {
        const directory = resolve(process.cwd(), receiptDirectory);
        await mkdir(directory, { recursive: true });
        await writeFile(
          resolve(directory, `${viewport.id}-${family.id}.json`),
          `${JSON.stringify(receipts, null, 2)}\n`,
        );
      }
      console.log(
        `[responsive] viewport=${viewport.width}x${viewport.height} locale=${family.id} cells=${receipts.length} canvas=real svg=getBBox labels=0`,
      );
    });
  }
}
