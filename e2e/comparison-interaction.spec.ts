import { expect, test, type Locator, type Page } from '@playwright/test';

const EDITOR = '[data-tellplot="editor"]';
const PALETTE = ['#0072B2', '#D55E00'] as const;
type ComparisonMode =
  'positive' | 'zero-negative' | 'zero-positive' | 'positive-three' | 'global-zero';

interface PaintedComponent {
  readonly color: string;
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly area: number;
}

function rasterPixelSpan(
  min: number,
  max: number,
  scale: number,
  offset: number,
): { readonly min: number; readonly max: number; readonly center: number } {
  return {
    min: offset + min * scale,
    max: offset + (max + 1) * scale,
    center: offset + ((min + max + 1) / 2) * scale,
  };
}

function config(
  chartType: 'bar' | 'column',
  mode: ComparisonMode = 'positive',
  options: { readonly datasetSuffix?: string; readonly tooltip?: boolean } = {},
): Record<string, unknown> {
  return {
    type: chartType,
    data: {
      schemaVersion: '3.0.0',
      dataKind: 'categorical',
      datasetId: `comparison-interaction-${chartType}-${mode}${options.datasetSuffix ?? ''}`,
      series: [
        { id: 'actual', label: 'Actual' },
        { id: 'budget', label: 'Budget' },
      ],
      items: [
        {
          id: 'alpha',
          label: 'Alpha',
          values: [
            {
              seriesId: 'actual',
              amount: mode === 'positive' || mode === 'positive-three' ? 80 : 0,
            },
            {
              seriesId: 'budget',
              amount: mode === 'positive' || mode === 'positive-three' ? 60 : 0,
            },
          ],
        },
        {
          id: 'beta',
          label: 'Beta',
          values: [
            {
              seriesId: 'actual',
              amount: mode === 'global-zero' ? 0 : mode === 'zero-negative' ? -80 : 45,
            },
            {
              seriesId: 'budget',
              amount: mode === 'global-zero' ? 0 : mode === 'zero-negative' ? -60 : 30,
            },
          ],
        },
        ...(mode !== 'positive'
          ? [
              {
                id: 'gamma',
                label: 'Gamma',
                values: [
                  {
                    seriesId: 'actual',
                    amount: mode === 'global-zero' ? 0 : mode === 'zero-negative' ? -45 : 25,
                  },
                  {
                    seriesId: 'budget',
                    amount: mode === 'global-zero' ? 0 : mode === 'zero-negative' ? -30 : 15,
                  },
                ],
              },
            ]
          : []),
      ],
    },
    appearance: {
      colors: {
        series: [
          { seriesId: 'actual', color: PALETTE[0] },
          { seriesId: 'budget', color: PALETTE[1] },
        ],
      },
      axes: { category: false, value: false },
      labels: { value: 'never', group: 'never' },
      legend: false,
      tooltip: options.tooltip ?? false,
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

function categoryClusters(
  components: readonly PaintedComponent[],
  chartType: 'bar' | 'column',
): readonly { readonly center: number; readonly area: number }[] {
  const ordered = [...components].sort((left, right) =>
    chartType === 'column' ? left.centerX - right.centerX : left.centerY - right.centerY,
  );
  const result: { center: number; area: number }[] = [];
  for (let index = 0; index < ordered.length; index += 2) {
    const pair = ordered.slice(index, index + 2);
    if (pair.length !== 2) {
      return [];
    }
    result.push({
      center:
        pair.reduce(
          (sum, component) =>
            sum + (chartType === 'column' ? component.centerX : component.centerY),
          0,
        ) / pair.length,
      area: pair.reduce((sum, component) => sum + component.area, 0),
    });
  }
  return result;
}

function sourceOrderedCategoryClusters(
  clusters: readonly { readonly center: number; readonly area: number }[],
): readonly { readonly center: number; readonly area: number }[] {
  return [...clusters].sort((left, right) => left.center - right.center);
}

function valueAxisPoint(
  chartType: 'bar' | 'column',
  category: number,
  baseline: number,
  direction: 1 | -1,
  distance: number,
): { readonly x: number; readonly y: number } {
  return chartType === 'column'
    ? { x: category, y: baseline + direction * distance }
    : { x: baseline + direction * distance, y: category };
}

function paintedZeroBaseline(
  components: readonly PaintedComponent[],
  chartType: 'bar' | 'column',
  domain: 'negative' | 'positive',
): number {
  return chartType === 'column'
    ? domain === 'negative'
      ? Math.min(...components.map(component => component.minY))
      : Math.max(...components.map(component => component.maxY))
    : domain === 'negative'
      ? Math.max(...components.map(component => component.maxX)) + 1
      : Math.min(...components.map(component => component.minX)) - 1;
}

async function openEditor(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/playground');
  await expect(page.locator(`${EDITOR}[data-editor-state="ready"]`)).toBeVisible();
}

async function applyConfig(page: Page, value: Record<string, unknown>): Promise<Locator> {
  const input = page.getByRole('textbox', { name: 'TellPlot 图表配置' });
  await input.fill(JSON.stringify(value, null, 2));
  await expect(page.getByRole('status', { name: '图表配置状态' })).toContainText('已同步');
  const stage = page.getByTestId('tellplot-chart-stage');
  await expect(stage).toHaveAttribute('data-render-state', 'ready');
  const canvas = page.getByTestId('tellplot-chart').locator('canvas').first();
  await expect(canvas).toBeVisible();
  await page.evaluate(
    () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  return canvas;
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
    const requested = colors.map(color => ({
      color,
      red: Number.parseInt(color.slice(1, 3), 16),
      green: Number.parseInt(color.slice(3, 5), 16),
      blue: Number.parseInt(color.slice(5, 7), 16),
    }));
    const pixels = context.getImageData(0, 0, element.width, element.height).data;
    const result: PaintedComponent[] = [];
    for (const target of requested) {
      const matching = new Uint8Array(element.width * element.height);
      for (let index = 0; index < matching.length; index += 1) {
        const offset = index * 4;
        if (
          (pixels[offset + 3] ?? 0) > 120 &&
          Math.abs((pixels[offset] ?? 0) - target.red) <= 6 &&
          Math.abs((pixels[offset + 1] ?? 0) - target.green) <= 6 &&
          Math.abs((pixels[offset + 2] ?? 0) - target.blue) <= 6
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
          const neighbors = [index - 1, index + 1, index - element.width, index + element.width];
          for (const neighbor of neighbors) {
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
        if (area >= 2) {
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
  }, PALETTE);
  const box = await canvas.boundingBox();
  const pixels = await canvas.evaluate(element => ({
    width: element instanceof HTMLCanvasElement ? element.width : 0,
    height: element instanceof HTMLCanvasElement ? element.height : 0,
  }));
  if (box === null || pixels.width <= 0 || pixels.height <= 0) {
    return [];
  }
  const scaleX = box.width / pixels.width;
  const scaleY = box.height / pixels.height;
  return local.map(component => {
    const x = rasterPixelSpan(component.minX, component.maxX, scaleX, box.x);
    const y = rasterPixelSpan(component.minY, component.maxY, scaleY, box.y);
    return {
      ...component,
      minX: x.min,
      minY: y.min,
      maxX: x.max,
      maxY: y.max,
      centerX: x.center,
      centerY: y.center,
    };
  });
}

function substantialIntervals(
  components: readonly PaintedComponent[],
): readonly PaintedComponent[] {
  return components.filter(
    component =>
      component.area > 100 &&
      component.maxX - component.minX > 2 &&
      component.maxY - component.minY > 2,
  );
}

async function rootOrder(page: Page): Promise<readonly string[]> {
  let tree = page.locator('[role="tree"]:visible').first();
  if ((await tree.count()) === 0) {
    await page.getByRole('button', { name: /打开结构大纲|Open structure outline/ }).click();
    tree = page.locator('[role="tree"]:visible').first();
    await expect(tree).toBeVisible();
  }
  return tree
    .locator('[role="treeitem"][aria-level="1"][data-node-id]')
    .evaluateAll(rows =>
      rows
        .map(row => row.getAttribute('data-node-id'))
        .filter((nodeId): nodeId is string => nodeId !== null),
    );
}

test('maps inclusive raster pixel indexes to CSS pixel cell edges', () => {
  expect(rasterPixelSpan(2, 4, 2, 10)).toEqual({ min: 14, max: 20, center: 17 });
});

test('keeps visible category clusters in source-axis order independent of area', () => {
  expect(
    sourceOrderedCategoryClusters([
      { center: 100, area: 10 },
      { center: 200, area: 100 },
    ]).map(cluster => cluster.center),
  ).toEqual([100, 200]);
});

test('recovers the transposed zero baseline from the baseline-facing painted edge', () => {
  const components = [
    {
      color: PALETTE[0],
      minX: 451,
      minY: 100,
      maxX: 700,
      maxY: 140,
      centerX: 575.5,
      centerY: 120,
      area: 1_000,
    },
  ];
  expect(paintedZeroBaseline(components, 'bar', 'positive')).toBe(450);
  expect(paintedZeroBaseline(components, 'bar', 'negative')).toBe(701);
});

async function probeComparisonHit(
  page: Page,
  chartType: 'bar' | 'column',
  point: { readonly x: number; readonly y: number },
  expected: 'hit' | 'padding' | 'outside',
): Promise<void> {
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  const state = (): Promise<string | null> =>
    page.locator(EDITOR).getAttribute('data-interaction-state');
  const message = `${chartType} ${expected} probe at (${point.x}, ${point.y})`;
  if (expected === 'hit') {
    await page.mouse.move(
      point.x + (chartType === 'column' ? 6 : 0),
      point.y + (chartType === 'bar' ? 6 : 0),
      { steps: 3 },
    );
    await expect.poll(state, { message }).toBe('dragging');
  } else {
    if (expected === 'padding') {
      await expect.poll(state, { message }).toBe('selecting');
    } else {
      await expect.poll(state, { message }).not.toBe('dragging');
    }
  }
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-interaction-state', 'idle');
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '0');
  await expect(page.getByTestId('tellplot-chart-stage')).toHaveAttribute(
    'data-render-state',
    'ready',
  );
  await page.evaluate(
    () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

for (const chartType of ['column', 'bar'] as const) {
  test(`${chartType} maps each series interval to the same category move`, async ({ page }) => {
    await openEditor(page);
    for (const seriesIndex of [0, 1] as const) {
      const canvas = await applyConfig(
        page,
        config(chartType, 'positive', { datasetSuffix: `-series-${seriesIndex}` }),
      );
      await expect
        .poll(async () => substantialIntervals(await paintedComponents(canvas)))
        .toHaveLength(4);
      const components = substantialIntervals(await paintedComponents(canvas));
      const ordered = [...components].sort((left, right) =>
        chartType === 'column' ? left.centerX - right.centerX : left.centerY - right.centerY,
      );
      expect(ordered).toHaveLength(4);
      const source = ordered[seriesIndex];
      const target = ordered[2];
      expect(source).toBeDefined();
      expect(target).toBeDefined();
      if (source === undefined || target === undefined) {
        return;
      }

      await page.mouse.move(source.centerX, source.centerY);
      await page.mouse.down();
      await page.mouse.move(target.centerX, target.centerY, { steps: 8 });
      await expect(page.locator(`${EDITOR}[data-interaction-state="dragging"]`)).toBeVisible();
      await expect(page.getByTestId('chart-drag-overlay')).toBeVisible();
      await page.mouse.up();

      await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '1');
      expect(await rootOrder(page)).toEqual(['beta', 'alpha']);
      const undo = page.getByRole('button', { name: /撤销|Undo/ });
      await expect(undo).toBeEnabled();
      await undo.click();
      expect(await rootOrder(page)).toEqual(['alpha', 'beta']);
    }
  });
}

test('comparison drag survives valid to invalid to valid preview and commits once', async ({
  page,
}) => {
  await openEditor(page);
  const canvas = await applyConfig(
    page,
    config('column', 'positive', { datasetSuffix: '-reentry' }),
  );
  await expect.poll(() => paintedComponents(canvas)).toHaveLength(4);
  const components = [...(await paintedComponents(canvas))]
    .filter(component => component.area > 100)
    .sort((left, right) => left.centerX - right.centerX);
  const source = components[0];
  const target = components[2];
  expect(source).toBeDefined();
  expect(target).toBeDefined();
  if (source === undefined || target === undefined) {
    return;
  }

  await page.mouse.move(source.centerX, source.centerY);
  await page.mouse.down();
  await page.mouse.move(target.centerX, target.centerY, { steps: 8 });
  await expect(page.locator(`${EDITOR}[data-interaction-state="dragging"]`)).toBeVisible();

  await page.mouse.move(source.centerX + 8, source.centerY, { steps: 6 });
  await expect(page.locator(`${EDITOR}[data-interaction-state="dragging"]`)).toBeVisible();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '0');

  await page.mouse.move(target.centerX, target.centerY, { steps: 8 });
  await expect(page.locator(`${EDITOR}[data-interaction-state="dragging"]`)).toBeVisible();
  await page.mouse.up();

  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '1');
  expect(await rootOrder(page)).toEqual(['beta', 'alpha']);
  const undo = page.getByRole('button', { name: /撤销|Undo/ });
  await expect(undo).toBeEnabled();
  await undo.click();
  expect(await rootOrder(page)).toEqual(['alpha', 'beta']);
  await expect(undo).toBeDisabled();
});

test('comparison marquee deduplicates both series rectangles into category selection', async ({
  page,
}) => {
  await openEditor(page);
  const canvas = await applyConfig(page, config('column'));
  await expect.poll(() => paintedComponents(canvas)).toHaveLength(4);
  const components = (await paintedComponents(canvas)).filter(component => component.area > 100);
  expect(components).toHaveLength(4);
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (box === null || components.length !== 4) {
    return;
  }
  const start = {
    x: Math.max(box.x + 2, Math.min(...components.map(component => component.minX)) - 8),
    y: Math.max(box.y + 2, Math.min(...components.map(component => component.minY)) - 8),
  };
  const end = {
    x: Math.min(
      box.x + box.width - 2,
      Math.max(...components.map(component => component.maxX)) + 8,
    ),
    y: Math.min(
      box.y + box.height - 2,
      Math.max(...components.map(component => component.maxY)) + 8,
    ),
  };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await expect(page.getByTestId('chart-marquee')).toBeVisible();
  await page.mouse.up();

  await expect(
    page.getByRole('dialog', { name: /创建折叠分组|Create collapsed group/ }),
  ).toBeVisible();
  const selectedIds = await page
    .getByRole('tree')
    .locator('[role="treeitem"][aria-selected="true"][data-node-id]')
    .evaluateAll(rows => rows.map(row => row.getAttribute('data-node-id')));
  expect(selectedIds).toEqual(['alpha', 'beta']);
});

test('comparison Tooltip is dismissed by resize and update and can show again', async ({
  page,
}) => {
  await openEditor(page);
  const canvas = await applyConfig(page, config('column', 'positive', { tooltip: true }));
  await expect.poll(() => paintedComponents(canvas)).toHaveLength(4);
  const components = (await paintedComponents(canvas)).filter(component => component.area > 100);
  const first = components[0];
  const second = components[1];
  expect(first).toBeDefined();
  expect(second).toBeDefined();
  if (first === undefined || second === undefined) {
    return;
  }
  const visibleTooltip = page.locator('.g2-tooltip').filter({ visible: true });

  await page.mouse.move(first.centerX, first.centerY);
  await expect(visibleTooltip).toBeVisible();
  await page.setViewportSize({ width: 1200, height: 760 });
  await expect(visibleTooltip).toHaveCount(0);

  await expect.poll(() => paintedComponents(canvas)).toHaveLength(4);
  const resized = (await paintedComponents(canvas)).filter(component => component.area > 100)[1];
  expect(resized).toBeDefined();
  if (resized === undefined) {
    return;
  }
  await page.mouse.move(2, 2);
  await page.mouse.move(resized.centerX, resized.centerY);
  await expect(visibleTooltip).toBeVisible();
  await applyConfig(
    page,
    config('column', 'positive', { datasetSuffix: '-updated', tooltip: true }),
  );
  await expect(visibleTooltip).toHaveCount(0);
});

for (const chartType of ['column', 'bar'] as const) {
  for (const domain of ['negative', 'positive'] as const) {
    test(`${chartType} all-${domain} renderer band exposes only the local all-zero 32px target`, async ({
      page,
    }) => {
      await openEditor(page);
      const canvas = await applyConfig(
        page,
        config(chartType, domain === 'negative' ? 'zero-negative' : 'zero-positive'),
      );
      await expect
        .poll(async () => substantialIntervals(await paintedComponents(canvas)))
        .toHaveLength(4);
      const components = substantialIntervals(await paintedComponents(canvas));
      const clusters = sourceOrderedCategoryClusters(categoryClusters(components, chartType));
      expect(clusters).toHaveLength(2);
      const beta = clusters[0];
      const gamma = clusters[1];
      expect(beta).toBeDefined();
      expect(gamma).toBeDefined();
      if (beta === undefined || gamma === undefined) {
        return;
      }
      const alphaCenter = beta.center + (beta.center - gamma.center);
      const baseline = paintedZeroBaseline(components, chartType, domain);
      const direction: 1 | -1 =
        chartType === 'column' ? (domain === 'negative' ? 1 : -1) : domain === 'negative' ? -1 : 1;
      const stripCenterDistance = 16;
      for (const distance of [stripCenterDistance - 15, stripCenterDistance + 15]) {
        await test.step(`hit at strip distance ${distance}`, async () =>
          probeComparisonHit(
            page,
            chartType,
            valueAxisPoint(chartType, alphaCenter, baseline, direction, distance),
            'hit',
          ));
      }
      for (const distance of [stripCenterDistance - 17, stripCenterDistance + 17]) {
        await test.step(`${distance < 0 ? 'outside' : 'padding'} at strip distance ${distance}`, async () =>
          probeComparisonHit(
            page,
            chartType,
            valueAxisPoint(chartType, alphaCenter, baseline, direction, distance),
            distance < 0 ? 'outside' : 'padding',
          ));
      }
      await test.step('padding at adjacent category midpoint', async () =>
        probeComparisonHit(
          page,
          chartType,
          valueAxisPoint(
            chartType,
            (alphaCenter + beta.center) / 2,
            baseline,
            direction,
            stripCenterDistance,
          ),
          'padding',
        ));
    });
  }
}

for (const chartType of ['column', 'bar'] as const) {
  test(`${chartType} global all-zero target keeps the renderer category gap inactive`, async ({
    page,
  }) => {
    await openEditor(page);
    let canvas = await applyConfig(page, config(chartType, 'positive-three'));
    await expect
      .poll(async () => substantialIntervals(await paintedComponents(canvas)))
      .toHaveLength(6);
    const components = substantialIntervals(await paintedComponents(canvas));
    const clusters = sourceOrderedCategoryClusters(categoryClusters(components, chartType));
    expect(clusters).toHaveLength(3);
    const alphaCluster = clusters[0];
    const betaCluster = clusters[1];
    expect(alphaCluster).toBeDefined();
    expect(betaCluster).toBeDefined();
    if (alphaCluster === undefined || betaCluster === undefined) {
      return;
    }
    const baseline = paintedZeroBaseline(components, chartType, 'positive');
    const direction: 1 | -1 = chartType === 'column' ? -1 : 1;

    canvas = await applyConfig(page, config(chartType, 'global-zero'));
    await expect
      .poll(async () => substantialIntervals(await paintedComponents(canvas)))
      .toHaveLength(0);
    const stripCenterDistance = 16;
    for (const distance of [stripCenterDistance - 15, stripCenterDistance + 15]) {
      await probeComparisonHit(
        page,
        chartType,
        valueAxisPoint(chartType, alphaCluster.center, baseline, direction, distance),
        'hit',
      );
    }
    for (const distance of [stripCenterDistance - 17, stripCenterDistance + 17]) {
      await probeComparisonHit(
        page,
        chartType,
        valueAxisPoint(chartType, alphaCluster.center, baseline, direction, distance),
        distance < 0 ? 'outside' : 'padding',
      );
    }
    await probeComparisonHit(
      page,
      chartType,
      valueAxisPoint(
        chartType,
        (alphaCluster.center + betaCluster.center) / 2,
        baseline,
        direction,
        stripCenterDistance,
      ),
      'padding',
    );
  });
}

test('resize invalidates an active comparison drag without command or history', async ({
  page,
}) => {
  await openEditor(page);
  const canvas = await applyConfig(page, config('column'));
  await expect.poll(() => paintedComponents(canvas)).toHaveLength(4);
  const components = [...(await paintedComponents(canvas))]
    .filter(component => component.area > 100)
    .sort((left, right) => left.centerX - right.centerX);
  const source = components[1];
  const target = components[3];
  expect(source).toBeDefined();
  expect(target).toBeDefined();
  if (source === undefined || target === undefined) {
    return;
  }
  await page.mouse.move(source.centerX, source.centerY);
  await page.mouse.down();
  await page.mouse.move(target.centerX, target.centerY, { steps: 6 });
  await expect(page.locator(`${EDITOR}[data-interaction-state="dragging"]`)).toBeVisible();

  await page.setViewportSize({ width: 1200, height: 760 });

  await expect(page.locator(EDITOR)).toHaveAttribute('data-interaction-state', 'idle');
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '0');
  await expect(page.getByTestId('chart-drag-overlay')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /撤销|Undo/ })).toBeDisabled();
  expect(await rootOrder(page)).toEqual(['alpha', 'beta']);
  await page.mouse.up();
});
