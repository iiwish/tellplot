import { expect, test, type Locator, type Page } from '@playwright/test';

const EDITOR = '[data-tellplot="editor"]';
const PALETTE = ['#0072B2', '#D55E00', '#009E73', '#CC79A7'] as const;
const LABEL_BACKGROUND = '#FF00FF';

interface ColorComponent {
  readonly color: string;
  readonly area: number;
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly centerX: number;
  readonly centerY: number;
}

function comparisonConfig(
  chartType: 'bar' | 'column',
  seriesCount: 2 | 4,
  mode: 'mixed' | 'all-zero' | 'zero-positive-domain' | 'zero-negative-domain',
  order = Array.from({ length: seriesCount }, (_, index) => index),
): Record<string, unknown> {
  const allSeries = Array.from({ length: seriesCount }, (_, index) => ({
    id: `series-${index + 1}`,
    label: `Series ${index + 1}`,
  }));
  const sourceSeries = order.map(index => allSeries[index]);
  const amounts = (categoryIndex: number): readonly number[] => {
    if (mode === 'all-zero') {
      return Array.from({ length: seriesCount }, () => 0);
    }
    if (mode === 'zero-positive-domain') {
      return categoryIndex === 0
        ? Array.from({ length: seriesCount }, () => 0)
        : Array.from({ length: seriesCount }, (_, index) => 45 + index * 12);
    }
    if (mode === 'zero-negative-domain') {
      return categoryIndex === 0
        ? Array.from({ length: seriesCount }, () => 0)
        : Array.from({ length: seriesCount }, (_, index) => -(45 + index * 12));
    }
    return Array.from({ length: seriesCount }, (_, index) =>
      categoryIndex === 0 ? 90 - index * 12 : -(70 - index * 10),
    );
  };
  return {
    type: chartType,
    data: {
      schemaVersion: '3.0.0',
      dataKind: 'categorical',
      datasetId: `comparison-${chartType}-${seriesCount}-${mode}`,
      currency: 'USD',
      series: sourceSeries,
      items: ['alpha', 'beta'].map((id, categoryIndex) => ({
        id,
        label: categoryIndex === 0 ? 'Alpha' : 'Beta',
        values: order.map(index => ({
          seriesId: `series-${index + 1}`,
          amount: amounts(categoryIndex)[index],
        })),
      })),
    },
    appearance: {
      title: 'Comparison characterization',
      colors: {
        series: allSeries.map((series, index) => ({
          seriesId: series.id,
          color: PALETTE[index],
        })),
      },
      axes: { category: false, value: false },
      labels: {
        value: {
          display: 'always',
          placement: 'outside',
          offset: 5,
          color: '#111111',
          fontSize: 11,
          background: true,
          backgroundColor: LABEL_BACKGROUND,
          backgroundOpacity: 1,
        },
        group: 'never',
      },
      legend: true,
      tooltip: true,
      animation: { enabled: false },
    },
    editor: {
      readOnly: false,
      panels: { outline: true, inspector: true, toolbar: true },
      outline: { placement: 'right' },
      inspector: { mode: 'tabs' },
    },
    locale: 'en-US',
    height: '100%',
  };
}

async function openEditor(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/playground');
  await expect(page.locator(`${EDITOR}[data-editor-state="ready"]`)).toBeVisible();
}

async function applyConfig(page: Page, config: Record<string, unknown>): Promise<Locator> {
  const input = page.getByRole('textbox', { name: 'TellPlot 图表配置' });
  await input.fill(JSON.stringify(config, null, 2));
  await expect(page.getByRole('status', { name: '图表配置状态' })).toContainText('已同步');
  const stage = page.getByTestId('tellplot-chart-stage');
  await expect(stage).toHaveAttribute('data-chart-type', String(config['type']));
  await expect(stage).toHaveAttribute('data-render-state', 'ready');
  const canvas = page.getByTestId('tellplot-chart').locator('canvas').first();
  await expect(canvas).toBeVisible();
  await page.evaluate(
    () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  return canvas;
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
      if (
        (pixels[offset + 3] ?? 0) > 20 &&
        ((pixels[offset] ?? 255) < 242 ||
          (pixels[offset + 1] ?? 255) < 242 ||
          (pixels[offset + 2] ?? 255) < 242)
      ) {
        painted += 1;
      }
    }
    return painted;
  });
}

async function colorComponents(
  canvas: Locator,
  colors: readonly string[],
): Promise<readonly ColorComponent[]> {
  const local = await canvas.evaluate((element, requestedColors) => {
    if (!(element instanceof HTMLCanvasElement)) {
      return [];
    }
    const context = element.getContext('2d');
    if (context === null) {
      return [];
    }
    const parsed = requestedColors.map(color => ({
      color,
      red: Number.parseInt(color.slice(1, 3), 16),
      green: Number.parseInt(color.slice(3, 5), 16),
      blue: Number.parseInt(color.slice(5, 7), 16),
    }));
    const { width, height } = element;
    const pixels = context.getImageData(0, 0, width, height).data;
    const result: ColorComponent[] = [];
    for (const target of parsed) {
      const matches = new Uint8Array(width * height);
      for (let index = 0; index < width * height; index += 1) {
        const offset = index * 4;
        if (
          (pixels[offset + 3] ?? 0) > 140 &&
          Math.abs((pixels[offset] ?? 0) - target.red) <= 5 &&
          Math.abs((pixels[offset + 1] ?? 0) - target.green) <= 5 &&
          Math.abs((pixels[offset + 2] ?? 0) - target.blue) <= 5
        ) {
          matches[index] = 1;
        }
      }
      const stack: number[] = [];
      for (let start = 0; start < matches.length; start += 1) {
        if (matches[start] !== 1) {
          continue;
        }
        stack.push(start);
        matches[start] = 2;
        let area = 0;
        let minX = width;
        let minY = height;
        let maxX = 0;
        let maxY = 0;
        while (stack.length > 0) {
          const current = stack.pop();
          if (current === undefined) {
            break;
          }
          const x = current % width;
          const y = Math.floor(current / width);
          area += 1;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          const neighbors = [
            x > 0 ? current - 1 : -1,
            x + 1 < width ? current + 1 : -1,
            y > 0 ? current - width : -1,
            y + 1 < height ? current + width : -1,
          ];
          for (const neighbor of neighbors) {
            if (neighbor >= 0 && matches[neighbor] === 1) {
              matches[neighbor] = 2;
              stack.push(neighbor);
            }
          }
        }
        if (area >= 4) {
          result.push({
            color: target.color,
            area,
            minX,
            minY,
            maxX,
            maxY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2,
          });
        }
      }
    }
    return result;
  }, colors);
  const box = await canvas.boundingBox();
  const size = await canvas.evaluate(element => ({
    width: element instanceof HTMLCanvasElement ? element.width : 0,
    height: element instanceof HTMLCanvasElement ? element.height : 0,
  }));
  if (box === null || size.width === 0 || size.height === 0) {
    return [];
  }
  return local.map(component => ({
    ...component,
    minX: box.x + (component.minX / size.width) * box.width,
    maxX: box.x + (component.maxX / size.width) * box.width,
    minY: box.y + (component.minY / size.height) * box.height,
    maxY: box.y + (component.maxY / size.height) * box.height,
    centerX: box.x + (component.centerX / size.width) * box.width,
    centerY: box.y + (component.centerY / size.height) * box.height,
  }));
}

function legendOrder(
  components: readonly ColorComponent[],
  colors: readonly string[],
): readonly string[] {
  return colors
    .map(
      color =>
        components
          .filter(component => component.color === color)
          .sort((left, right) => left.minY - right.minY || left.area - right.area)[0],
    )
    .filter((component): component is ColorComponent => component !== undefined)
    .sort((left, right) => left.centerX - right.centerX)
    .map(component => component.color);
}

function isVisibleInterval(component: ColorComponent, colors: readonly string[]): boolean {
  return (
    colors.includes(component.color) &&
    component.maxX - component.minX > 12 &&
    component.maxY - component.minY > 12
  );
}

test('renders the fixed bar/column by 2/4-series by mixed/all-zero Canvas matrix', async ({
  page,
}) => {
  await openEditor(page);
  for (const chartType of ['column', 'bar'] as const) {
    for (const seriesCount of [2, 4] as const) {
      for (const mode of ['mixed', 'all-zero'] as const) {
        const canvas = await applyConfig(page, comparisonConfig(chartType, seriesCount, mode));
        await expect.poll(() => paintedPixelCount(canvas)).toBeGreaterThan(400);
        const components = await colorComponents(canvas, [
          ...PALETTE.slice(0, seriesCount),
          LABEL_BACKGROUND,
        ]);
        expect(legendOrder(components, PALETTE.slice(0, seriesCount))).toEqual(
          PALETTE.slice(0, seriesCount),
        );
        const labels = components.filter(
          component =>
            component.color === LABEL_BACKGROUND &&
            component.area >= 20 &&
            component.maxX - component.minX >= 4 &&
            component.maxY - component.minY >= 4,
        );
        expect(labels).toHaveLength(seriesCount * 2);

        if (mode === 'mixed') {
          const intervals = components.filter(component =>
            isVisibleInterval(component, PALETTE.slice(0, seriesCount)),
          );
          expect(intervals).toHaveLength(seriesCount * 2);
          const axis = chartType === 'column' ? 'centerX' : 'centerY';
          const orderedLabels = [...labels].sort((left, right) => left[axis] - right[axis]);
          const orderedIntervals = [...intervals].sort((left, right) => left[axis] - right[axis]);
          for (let start = 0; start < orderedIntervals.length; start += seriesCount) {
            const clusterIntervals = orderedIntervals.slice(start, start + seriesCount);
            const clusterLabels = orderedLabels.slice(start, start + seriesCount);
            expect(clusterIntervals.map(interval => interval.color)).toEqual(
              PALETTE.slice(0, seriesCount),
            );
            expect(clusterLabels).toHaveLength(clusterIntervals.length);
            for (let index = 0; index < clusterIntervals.length; index += 1) {
              const interval = clusterIntervals[index];
              const label = clusterLabels[index];
              if (interval === undefined || label === undefined) {
                throw new Error('Expected one comparison label for every interval');
              }
              expect(Math.abs(label[axis] - interval[axis])).toBeLessThanOrEqual(6);
            }
          }
        }
      }
    }
  }
});

test('keeps the source-ordered legend visible for an empty category set', async ({ page }) => {
  await openEditor(page);
  const config = comparisonConfig('column', 4, 'all-zero');
  const data = config['data'];
  if (typeof data !== 'object' || data === null) {
    throw new Error('Expected comparison source data');
  }
  const canvas = await applyConfig(page, {
    ...config,
    data: { ...data, items: [] },
  });
  expect(legendOrder(await colorComponents(canvas, PALETTE), PALETTE)).toEqual(PALETTE);
});

test('keeps all-zero labels visible inside positive-only and negative-only value domains', async ({
  page,
}) => {
  await openEditor(page);
  for (const mode of ['zero-positive-domain', 'zero-negative-domain'] as const) {
    const canvas = await applyConfig(page, comparisonConfig('column', 4, mode));
    const labels = (await colorComponents(canvas, [LABEL_BACKGROUND])).filter(
      component => component.color === LABEL_BACKGROUND,
    );
    expect(labels.length).toBeGreaterThanOrEqual(8);
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    for (const label of labels) {
      expect(label.minY).toBeGreaterThanOrEqual(box?.y ?? 0);
      expect(label.maxY).toBeLessThanOrEqual((box?.y ?? 0) + (box?.height ?? 0));
    }
  }
});

test('recreates the Canvas and visibly reorders legend markers and shared Tooltip items', async ({
  page,
}) => {
  await openEditor(page);
  let canvas = await applyConfig(page, comparisonConfig('column', 4, 'mixed'));
  const oldCanvas = canvas;
  await oldCanvas.evaluate(element => element.setAttribute('data-comparison-old-canvas', 'true'));
  expect(legendOrder(await colorComponents(canvas, PALETTE), PALETTE)).toEqual(PALETTE);

  const reversedOrder = [3, 2, 1, 0];
  canvas = await applyConfig(page, comparisonConfig('column', 4, 'mixed', reversedOrder));
  await expect(page.locator('canvas[data-comparison-old-canvas="true"]')).toHaveCount(0);
  expect(legendOrder(await colorComponents(canvas, PALETTE), PALETTE)).toEqual(
    [...PALETTE].reverse(),
  );

  const intervalComponents = (await colorComponents(canvas, PALETTE))
    .filter(component => isVisibleInterval(component, PALETTE))
    .sort((left, right) => right.area - left.area);
  const target = intervalComponents[0];
  if (target === undefined) {
    throw new Error('Expected a visible comparison interval');
  }
  await page.mouse.move(target.centerX, target.centerY);
  const tooltip = page.locator('.g2-tooltip').filter({ visible: true });
  await expect(tooltip).toBeVisible();
  await expect
    .poll(async () =>
      (await tooltip.locator('.g2-tooltip-list-item-name').allTextContents()).map(text =>
        text.trim(),
      ),
    )
    .toEqual(['Series 4', 'Series 3', 'Series 2', 'Series 1']);
});
