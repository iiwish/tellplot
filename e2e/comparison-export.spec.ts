import { readFile } from 'node:fs/promises';

import { expect, test, type Download, type Page } from '@playwright/test';

import { activateInspectorPanel, activateOutlinePanel } from './editorPanels';

const EDITOR = '[data-tellplot="editor"]';
const MULTI_SELECT_MODIFIER: 'Meta' | 'Control' =
  process.platform === 'darwin' ? 'Meta' : 'Control';
const palettes = {
  2: ['rgb(0, 114, 178)', 'rgb(213, 94, 0)'],
  4: ['rgb(0, 114, 178)', 'rgb(213, 94, 0)', 'rgb(0, 158, 115)', 'rgb(204, 121, 167)'],
} as const;

interface SvgBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function categoryCenter(box: SvgBox, chartType: 'bar' | 'column'): number {
  return chartType === 'column' ? box.x + box.width / 2 : box.y + box.height / 2;
}

function expectSameCategoryAnchor(label: SvgBox, interval: SvgBox, chartType: 'bar' | 'column') {
  expect(
    Math.abs(categoryCenter(label, chartType) - categoryCenter(interval, chartType)),
  ).toBeLessThanOrEqual(1.5);
}

function expectPositiveValueEndpointAnchor(
  label: SvgBox,
  interval: SvgBox,
  chartType: 'bar' | 'column',
) {
  const labelAnchor =
    chartType === 'column' ? label.y + label.height / 2 : label.x + label.width / 2;
  const intervalEndpoint = chartType === 'column' ? interval.y : interval.x + interval.width;
  expect(Math.abs(labelAnchor - intervalEndpoint)).toBeLessThanOrEqual(8);
}

async function openComparison(
  page: Page,
  fixture: string,
  chartType: 'bar' | 'column',
  editorState: 'ready' | 'empty' = 'ready',
) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/playground?fixture=${fixture}${chartType === 'bar' ? '&chart=bar' : ''}`);
  const editor = page.locator(EDITOR);
  await expect(editor).toHaveAttribute('data-editor-state', editorState);
  await expect(editor).toHaveAttribute('data-chart-type', chartType);
  if (editorState === 'ready') {
    await expect(page.getByTestId('tellplot-chart-stage')).toHaveAttribute(
      'data-render-state',
      'ready',
    );
  } else {
    await expect(page.getByText('暂无分类项')).toBeVisible();
  }
}

async function chooseExport(
  page: Page,
  name: 'SVG 图像' | 'PNG 图像' | 'ViewSpec JSON',
): Promise<Download> {
  await page.getByRole('button', { name: '导出' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('menuitem', { name }).click();
  return download;
}

async function readDownload(download: Download): Promise<Buffer> {
  const path = await download.path();
  if (path === null) throw new Error('Expected a local export download.');
  return readFile(path);
}

async function inspectSvg(
  page: Page,
  svgSource: string,
  labels: readonly string[],
  colors: readonly string[],
) {
  return page.evaluate(
    value => {
      const host = document.createElement('div');
      host.style.position = 'fixed';
      host.style.inset = '0 auto auto 0';
      host.style.background = '#ffffff';
      host.innerHTML = value.svgSource;
      document.body.append(host);
      try {
        const svg = host.querySelector('svg');
        if (!(svg instanceof SVGSVGElement)) return null;
        const all = Array.from(svg.querySelectorAll('*'));
        const texts = Array.from(svg.querySelectorAll('text'));
        const svgBox = svg.getBoundingClientRect();
        const boxOf = (node: SVGGraphicsElement) => {
          const localBox = node.getBBox();
          const box = node.getBoundingClientRect();
          return {
            x: box.left - svgBox.left,
            y: box.top - svgBox.top,
            width: box.width,
            height: box.height,
            localWidth: localBox.width,
            localHeight: localBox.height,
          };
        };
        const legend = value.labels.map(label => {
          const node = texts.find(text => text.textContent?.trim() === label);
          if (!(node instanceof SVGGraphicsElement)) return null;
          return { label, ...boxOf(node) };
        });
        const palette = value.colors.map(color => {
          const boxes = all.flatMap(element => {
            const style = getComputedStyle(element);
            if (style.fill !== color && style.stroke !== color) return [];
            if (!(element instanceof SVGGraphicsElement)) return [];
            return [boxOf(element)];
          });
          return { color, boxes };
        });
        const textBoxes = texts.flatMap(text => {
          const content = text.textContent?.trim() ?? '';
          if (content === '' || !(text instanceof SVGGraphicsElement)) return [];
          return [{ text: content, ...boxOf(text) }];
        });
        const intervals = all.flatMap(element => {
          if (!(element instanceof SVGGraphicsElement)) return [];
          const color = getComputedStyle(element).fill;
          if (
            !element.classList.contains('element') ||
            element.closest('g.main-layer') === null ||
            !value.colors.includes(color)
          ) {
            return [];
          }
          return [{ color, ...boxOf(element) }];
        });
        const helperLabels = texts.flatMap(text => {
          const content = text.textContent?.trim() ?? '';
          if (
            content === '' ||
            !(text instanceof SVGGraphicsElement) ||
            text.closest('g.label') === null ||
            text.classList.contains('g2-axis-label-item') ||
            text.classList.contains('g2-legend-label')
          ) {
            return [];
          }
          return [{ text: content, ...boxOf(text) }];
        });
        return {
          width: svg.getAttribute('width'),
          height: svg.getAttribute('height'),
          viewBox: svg.getAttribute('viewBox'),
          background: all.some(element => getComputedStyle(element).fill === 'rgb(255, 255, 255)'),
          legend,
          palette,
          textBoxes,
          intervals,
          helperLabels,
          text: texts.map(text => text.textContent?.trim() ?? '').filter(Boolean),
          unsafe: svg.querySelectorAll(
            'script,foreignObject,iframe,object,embed,image,use,animate,animateMotion,animateTransform,set',
          ).length,
          external: all.filter(element =>
            Array.from(element.attributes).some(attribute =>
              /(?:https?:|javascript:|data:|file:|ftp:)/iu.test(attribute.value),
            ),
          ).length,
          interactive: all.filter(element =>
            Array.from(element.attributes).some(
              attribute => attribute.name.startsWith('on') || attribute.name.startsWith('data-'),
            ),
          ).length,
        };
      } finally {
        host.remove();
      }
    },
    { svgSource, labels, colors },
  );
}

async function setComparisonLegend(page: Page, legend: boolean) {
  const input = page.getByRole('textbox', { name: 'TellPlot 图表配置' });
  const config = JSON.parse(await input.inputValue()) as {
    appearance?: { legend?: boolean };
  };
  config.appearance = { ...config.appearance, legend };
  await input.fill(JSON.stringify(config, null, 2));
  await page.getByRole('button', { name: '立即应用图表配置' }).click();
  await expect(page.getByRole('status', { name: '图表配置状态' })).toContainText('LIVE_SYNCED');
  await expect(page.locator(EDITOR)).toHaveAttribute('data-editor-state', 'empty');
}

async function inspectPng(page: Page, png: Buffer) {
  return page.evaluate(async base64 => {
    const response = await fetch(`data:image/png;base64,${base64}`);
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    if (context === null) return null;
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let nonwhite = 0;
    let opaque = 0;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      const red = pixels[offset] ?? 255;
      const green = pixels[offset + 1] ?? 255;
      const blue = pixels[offset + 2] ?? 255;
      const alpha = pixels[offset + 3] ?? 0;
      if (alpha === 255) opaque += 1;
      if (alpha > 0 && (red < 245 || green < 245 || blue < 245)) nonwhite += 1;
    }
    return { width: canvas.width, height: canvas.height, nonwhite, opaque };
  }, png.toString('base64'));
}

const matrix = [
  { fixture: 'comparison-actual-budget', series: 2, sign: 'mixed' },
  { fixture: 'comparison-four-series', series: 4, sign: 'mixed' },
  { fixture: 'comparison-all-zero', series: 2, sign: 'all-zero' },
  { fixture: 'comparison-four-series-zero', series: 4, sign: 'all-zero' },
] as const;

for (const chartType of ['column', 'bar'] as const) {
  test(`${chartType} canonical comparison axis keeps real category labels`, async ({ page }) => {
    await openComparison(page, 'comparison-actual-budget', chartType);

    const svg = (await readDownload(await chooseExport(page, 'SVG 图像'))).toString('utf8');
    const receipt = await inspectSvg(page, svg, ['企业业务', '消费者业务'], []);

    expect(
      receipt?.legend.every(label => label !== null && label.width > 0 && label.height > 0),
    ).toBe(true);
  });
}

for (const chartType of ['column', 'bar'] as const) {
  for (const scenario of matrix) {
    test(`${chartType} ${scenario.series}-series ${scenario.sign} exports real SVG and PNG`, async ({
      page,
    }) => {
      await openComparison(page, scenario.fixture, chartType);
      const labels =
        scenario.series === 2 ? ['实际', '预算'] : ['实际', '预算', '预测', '挑战目标'];
      const colors = palettes[scenario.series];

      const svg = (await readDownload(await chooseExport(page, 'SVG 图像'))).toString('utf8');
      const receipt = await inspectSvg(page, svg, labels, colors);
      expect(receipt).not.toBeNull();
      expect(receipt).toMatchObject({ background: true, unsafe: 0, external: 0, interactive: 0 });
      expect(receipt?.width).toMatch(/^\d+$/u);
      expect(receipt?.height).toMatch(/^\d+$/u);
      expect(
        receipt?.legend.every(label => label !== null && label.width > 0 && label.height > 0),
      ).toBe(true);
      expect(receipt?.palette.every(entry => entry.boxes.length > 0)).toBe(true);
      expect(receipt?.intervals).toHaveLength(4 * scenario.series);
      expect(receipt?.helperLabels).toHaveLength(4 * scenario.series);
      expect(
        receipt?.intervals.every(interval => interval.localWidth + interval.localHeight > 0),
      ).toBe(true);
      expect(
        receipt?.helperLabels.every(label => label.localWidth > 0 && label.localHeight > 0),
      ).toBe(true);
      for (let index = 0; index < 4 * scenario.series; index += 1) {
        const interval = receipt?.intervals[index];
        const label = receipt?.helperLabels[index];
        expect(interval?.color).toBe(colors[index % scenario.series]);
        expect(label).toBeDefined();
        if (interval !== undefined && label !== undefined) {
          expectSameCategoryAnchor(label, interval, chartType);
        }
      }
      if (scenario.sign === 'mixed') {
        expect(
          receipt?.palette.every(entry => entry.boxes.some(box => box.width * box.height > 40)),
        ).toBe(true);
      } else {
        expect(receipt?.text.some(text => /(?:^|\D)0(?:\D|$)/u.test(text))).toBe(true);
      }

      const png = await readDownload(await chooseExport(page, 'PNG 图像'));
      expect(png.subarray(0, 8)).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      );
      const pngReceipt = await inspectPng(page, png);
      expect(pngReceipt).not.toBeNull();
      expect(pngReceipt?.width).toBeGreaterThan(600);
      expect(pngReceipt?.height).toBeGreaterThan(500);
      expect(pngReceipt?.opaque).toBe(pngReceipt?.width * pngReceipt?.height);
      expect(pngReceipt?.nonwhite).toBeGreaterThan(500);
    });
  }
}

for (const journey of [
  { fixture: 'comparison-actual-budget', series: 2 },
  { fixture: 'comparison-four-series', series: 4 },
] as const) {
  test(`public ${journey.series}-series workbench completes edit, collapse, ViewSpec, SVG and PNG`, async ({
    page,
  }) => {
    const groupLabel = `核心业务 ${journey.series}序列`;
    const annotation = `已复核 ${journey.series}序列比较口径`;
    await openComparison(page, journey.fixture, 'column');
    await activateOutlinePanel(page);
    await page.getByRole('treeitem', { name: /企业业务/ }).click();
    await page
      .getByRole('treeitem', { name: /消费者业务/ })
      .click({ modifiers: [MULTI_SELECT_MODIFIER] });
    const inspector = await activateInspectorPanel(page);
    await inspector.getByRole('textbox', { name: '分组名称' }).fill(groupLabel);
    await inspector.getByRole('button', { name: '创建分组' }).click();
    await activateOutlinePanel(page);
    const group = page.getByRole('treeitem', { name: new RegExp(groupLabel, 'u') });
    await expect(group).toBeVisible();
    const disclosure = group.getByRole('button', { name: /展开|折叠/ });
    if ((await disclosure.getAttribute('aria-expanded')) === 'false') await disclosure.click();
    await expect(disclosure).toHaveAttribute('aria-expanded', 'true');

    const labels = journey.series === 2 ? ['实际', '预算'] : ['实际', '预算', '预测', '挑战目标'];
    const expandedSvg = (await readDownload(await chooseExport(page, 'SVG 图像'))).toString('utf8');
    const expandedReceipt = await inspectSvg(page, expandedSvg, labels, palettes[journey.series]);
    const expandedGroupLabel = expandedReceipt?.helperLabels.find(
      label => label.text === groupLabel,
    );
    const firstMemberCluster = expandedReceipt?.intervals.slice(0, journey.series);
    expect(expandedGroupLabel).toBeDefined();
    expect(expandedGroupLabel?.localWidth).toBeGreaterThan(0);
    expect(expandedGroupLabel?.localHeight).toBeGreaterThan(0);
    expect(firstMemberCluster).toHaveLength(journey.series);
    if (expandedGroupLabel !== undefined && firstMemberCluster !== undefined) {
      const clusterCenter =
        firstMemberCluster.reduce((sum, interval) => sum + categoryCenter(interval, 'column'), 0) /
        firstMemberCluster.length;
      expect(
        Math.abs(categoryCenter(expandedGroupLabel, 'column') - clusterCenter),
      ).toBeLessThanOrEqual(1.5);
      const valueInterval = firstMemberCluster[journey.series === 2 ? 0 : 2];
      expect(valueInterval).toBeDefined();
      if (valueInterval !== undefined) {
        expectPositiveValueEndpointAnchor(expandedGroupLabel, valueInterval, 'column');
      }
    }
    expect(expandedSvg).not.toContain('data-node-id');

    await disclosure.click();
    await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    await group.click();
    const activeInspector = await activateInspectorPanel(page);
    await activeInspector.getByRole('textbox', { name: '注释' }).fill(annotation);
    await activeInspector.getByRole('button', { name: '保存注释' }).click();

    const guide = page.getByRole('complementary', { name: '在项目中使用 TellPlot' });
    await guide.getByRole('tab', { name: '视图状态' }).click();
    await expect(page.getByRole('textbox', { name: 'TellPlot 视图状态' })).toHaveValue(
      new RegExp(annotation, 'u'),
    );

    const viewJson = (await readDownload(await chooseExport(page, 'ViewSpec JSON'))).toString(
      'utf8',
    );
    const exportedView = JSON.parse(viewJson) as {
      readonly schemaVersion: string;
      readonly groups: Readonly<Record<string, { readonly label: string }>>;
      readonly collapsedGroupIds: readonly string[];
      readonly annotations: Readonly<Record<string, string>>;
    };
    const [groupId] = exportedView.collapsedGroupIds;
    expect(exportedView.schemaVersion).toBe('3.0.0');
    expect(groupId).toBeDefined();
    expect(groupId === undefined ? undefined : exportedView.groups[groupId]?.label).toBe(
      groupLabel,
    );
    expect(groupId === undefined ? undefined : exportedView.annotations[groupId]).toBe(annotation);

    await activateOutlinePanel(page);
    const changedGroup = page.getByRole('treeitem', { name: new RegExp(groupLabel, 'u') });
    const changedDisclosure = changedGroup.getByRole('button', { name: /展开|折叠/ });
    await changedDisclosure.click();
    await expect(changedDisclosure).toHaveAttribute('aria-expanded', 'true');
    await changedGroup.click();
    const changedInspector = await activateInspectorPanel(page);
    await changedInspector
      .getByRole('textbox', { name: '注释' })
      .fill(`临时覆盖 ${journey.series}序列`);
    await changedInspector.getByRole('button', { name: '保存注释' }).click();

    await page.getByLabel('导入 ViewSpec 文件').setInputFiles({
      name: `comparison-${journey.series}-series-view.json`,
      mimeType: 'application/json',
      buffer: Buffer.from(viewJson),
    });
    await expect(page.getByRole('status', { name: '文件状态' })).toContainText('VIEW_IMPORTED');

    await activateOutlinePanel(page);
    const restoredGroup = page.getByRole('treeitem', { name: new RegExp(groupLabel, 'u') });
    const restoredDisclosure = restoredGroup.getByRole('button', { name: /展开|折叠/ });
    await expect(restoredDisclosure).toHaveAttribute('aria-expanded', 'false');
    await restoredGroup.click();
    const restoredInspector = await activateInspectorPanel(page);
    await expect(restoredInspector.getByRole('textbox', { name: '注释' })).toHaveValue(annotation);
    const restoredViewJson = (
      await readDownload(await chooseExport(page, 'ViewSpec JSON'))
    ).toString('utf8');
    expect(restoredViewJson).toBe(viewJson);

    const svg = (await readDownload(await chooseExport(page, 'SVG 图像'))).toString('utf8');
    const receipt = await inspectSvg(page, svg, labels, palettes[journey.series]);
    const annotationBox = receipt?.helperLabels.find(box => box.text === annotation);
    expect(annotationBox).toMatchObject({ width: expect.any(Number), height: expect.any(Number) });
    expect(annotationBox?.width).toBeGreaterThan(0);
    expect(annotationBox?.height).toBeGreaterThan(0);
    expect(annotationBox?.localWidth).toBeGreaterThan(0);
    expect(annotationBox?.localHeight).toBeGreaterThan(0);
    expect(receipt?.intervals).toHaveLength(3 * journey.series);
    const annotatedInterval = receipt?.intervals[journey.series === 2 ? 0 : 3];
    expect(annotatedInterval?.color).toBe(palettes[journey.series][journey.series === 2 ? 0 : 3]);
    if (annotationBox !== undefined && annotatedInterval !== undefined) {
      expectSameCategoryAnchor(annotationBox, annotatedInterval, 'column');
      expectPositiveValueEndpointAnchor(annotationBox, annotatedInterval, 'column');
      for (const interval of receipt?.intervals.slice(0, journey.series) ?? []) {
        if (interval === annotatedInterval) continue;
        expect(
          Math.abs(categoryCenter(annotationBox, 'column') - categoryCenter(interval, 'column')),
        ).toBeGreaterThan(5);
      }
    }
    expect(svg).not.toContain('data-node-id');

    const png = await readDownload(await chooseExport(page, 'PNG 图像'));
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    const pngReceipt = await inspectPng(page, png);
    expect(pngReceipt?.width).toBeGreaterThan(600);
    expect(pngReceipt?.height).toBeGreaterThan(500);
    expect(pngReceipt?.nonwhite).toBeGreaterThan(500);
  });
}

for (const legend of [true, false] as const) {
  test(`legal empty comparison exports real SVG and PNG with legend=${legend}`, async ({
    page,
  }) => {
    await openComparison(page, 'comparison-empty', 'column', 'empty');
    if (!legend) await setComparisonLegend(page, false);

    const svg = (await readDownload(await chooseExport(page, 'SVG 图像'))).toString('utf8');
    const receipt = await inspectSvg(page, svg, ['实际', '预算'], palettes[2]);
    expect(receipt).toMatchObject({ background: true, unsafe: 0, external: 0, interactive: 0 });
    expect(receipt?.text).toContain('实际与预算');
    expect(receipt?.legend.every(label => (legend ? label !== null : label === null))).toBe(true);

    const png = await readDownload(await chooseExport(page, 'PNG 图像'));
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    const pngReceipt = await inspectPng(page, png);
    expect(pngReceipt?.width).toBeGreaterThan(600);
    expect(pngReceipt?.height).toBeGreaterThan(500);
    expect(pngReceipt?.opaque).toBe(pngReceipt?.width * pngReceipt?.height);
    expect(pngReceipt?.nonwhite).toBeGreaterThan(100);
  });
}
