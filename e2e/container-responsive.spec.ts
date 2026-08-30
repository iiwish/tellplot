import { expect, test, type Locator } from '@playwright/test';

import { activateInspectorPanel } from './editorPanels';

const EDITOR = '[data-tellplot="editor"]';

async function applyConfigWithoutMovingFocus(
  configInput: Locator,
  config: unknown,
  hideFocusedHeading = false,
): Promise<void> {
  await configInput.evaluate(
    async (element, update) => {
      if (!(element instanceof HTMLTextAreaElement)) {
        throw new Error('Playground config input is unavailable.');
      }
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      setter?.call(element, update.serialized);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const apply = element.ownerDocument.querySelector<HTMLButtonElement>(
        'button[aria-label="立即应用图表配置"]',
      );
      if (apply === null) {
        throw new Error('Playground config apply control is unavailable.');
      }
      if (update.hideFocusedHeading) {
        const focusedHeading = element.ownerDocument.activeElement;
        const editor = focusedHeading?.closest<HTMLElement>('[data-tellplot="editor"]');
        if (
          !(focusedHeading instanceof HTMLElement) ||
          focusedHeading.dataset['focusKey'] !== 'chart-heading' ||
          editor === null ||
          editor === undefined
        ) {
          throw new Error('Focused comparison heading is unavailable.');
        }
        Object.defineProperty(editor.style, 'height', {
          configurable: true,
          get: () => editor.style.getPropertyValue('height'),
          set: value => {
            Reflect.deleteProperty(editor.style, 'height');
            editor.style.setProperty('height', value);
            focusedHeading.setAttribute('aria-hidden', 'true');
            focusedHeading.blur();
          },
        });
      }
      apply.click();
    },
    { hideFocusedHeading, serialized: JSON.stringify(config, null, 2) },
  );
}

test('responds to a narrow host container inside a wide viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/playground');

  const editor = page.locator(`${EDITOR}[data-editor-state="ready"]`);
  await expect(editor).toBeVisible();
  const host = page.locator('.tellplot-react-host');

  for (const width of [500, 360]) {
    await host.evaluate((element, hostWidth) => {
      if (element instanceof HTMLElement) {
        element.style.width = `${hostWidth}px`;
        element.style.maxWidth = 'none';
        element.style.flex = '0 0 auto';
      }
    }, width);

    await expect.poll(async () => (await editor.boundingBox())?.width).toBeCloseTo(width, 0);
    await expect(editor).toHaveAttribute('data-layout', 'narrow');
    await expect(editor.locator('[data-testid="tellplot-chart-stage"]')).toHaveAttribute(
      'data-render-state',
      'ready',
    );
    await expect(editor.locator('[data-testid="tellplot-chart"] canvas').first()).toBeVisible();
    await expect(editor.locator('.tp-outline-trigger')).toBeVisible();
    await expect(editor.locator('.tp-inspector-trigger')).toBeVisible();
    await expect(editor.locator('.tp-outline-static')).toBeHidden();
    await expect(editor.locator('.tp-inspector-static')).toBeHidden();

    const chartWidth = await editor
      .locator('.tp-chart-stage')
      .evaluate(element => element.getBoundingClientRect().width);
    expect(chartWidth).toBeGreaterThan(width - 4);
    const overflow = await editor.evaluate(element => element.scrollWidth - element.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const status = editor.locator('.tp-toolbar-status');
    await expect(status).toHaveAttribute('title', '已校验');
    await expect(status).not.toHaveAttribute('aria-label', /.+/);
    await expect(status.locator('.tp-toolbar-status-icon')).toBeVisible();
    await expect(status.locator('.tp-toolbar-status-label')).toBeHidden();
    const statusOverflow = await status.evaluate(
      element => element.scrollWidth - element.clientWidth,
    );
    expect(statusOverflow).toBeLessThanOrEqual(0);
  }

  await editor.locator('.tp-inspector-trigger').click();
  await expect(editor.getByRole('dialog', { name: '检查器' })).toBeVisible();
  await host.evaluate(element => {
    if (element instanceof HTMLElement) {
      element.style.width = '899px';
    }
  });
  await expect(editor).toHaveAttribute('data-layout', 'narrow');
  await expect(editor.getByRole('dialog', { name: '检查器' })).toBeVisible();

  await host.evaluate(element => {
    if (element instanceof HTMLElement) {
      element.style.width = '900px';
    }
  });
  await expect(editor).toHaveAttribute('data-layout', 'compact');
  await expect(editor.getByRole('dialog', { name: '检查器' })).toBeHidden();
  await expect(editor.locator('.tp-panel-rail-static')).toBeVisible();
  await expect(editor.locator('.tp-outline-trigger')).toBeHidden();
  await expect(editor.locator('.tp-inspector-trigger')).toBeHidden();
  const compactChartWidth = await editor
    .locator('.tp-chart-stage')
    .evaluate(element => element.getBoundingClientRect().width);
  expect(compactChartWidth).toBeGreaterThanOrEqual(590);

  await host.evaluate(element => {
    if (element instanceof HTMLElement) {
      element.style.width = '1280px';
    }
  });
  await expect(editor).toHaveAttribute('data-layout', 'wide');
  await expect(editor.locator('.tp-panel-rail-static')).toBeVisible();
  await expect(editor.locator('.tp-outline-trigger')).toBeHidden();
  await expect(editor.locator('.tp-inspector-trigger')).toBeHidden();
  await expect(editor.locator('[data-testid="tellplot-chart-stage"]')).toHaveAttribute(
    'data-render-state',
    'ready',
  );
});

test('comparison focus fallback follows visible responsive surfaces only', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/playground');
  const editor = page.locator(EDITOR);
  await expect(editor).toHaveAttribute('data-editor-state', 'ready');
  const host = page.locator('.tellplot-react-host');
  const configInput = page.getByRole('textbox', { name: 'TellPlot 图表配置' });
  const comparisonConfig = {
    type: 'column',
    locale: 'en-US',
    data: {
      schemaVersion: '3.0.0',
      dataKind: 'categorical',
      datasetId: 'comparison-responsive-focus',
      currency: 'USD',
      series: [
        { id: 'current', label: 'Current' },
        { id: 'plan', label: 'Plan' },
      ],
      items: [
        {
          id: 'alpha',
          label: 'Alpha',
          values: [
            { seriesId: 'current', amount: 12 },
            { seriesId: 'plan', amount: 10 },
          ],
        },
        {
          id: 'beta',
          label: 'Beta',
          values: [
            { seriesId: 'current', amount: 8 },
            { seriesId: 'plan', amount: 11 },
          ],
        },
      ],
    },
    appearance: { legend: false, animation: { enabled: false } },
    editor: {
      panels: { outline: true, inspector: true, toolbar: true },
      outline: { placement: 'left' },
      inspector: { mode: 'static' },
    },
    height: '100%',
  };
  await configInput.fill(JSON.stringify(comparisonConfig, null, 2));
  await expect(page.getByRole('status', { name: '图表配置状态' })).toContainText('已同步');

  await host.evaluate(element => {
    if (element instanceof HTMLElement) {
      element.style.width = '1280px';
    }
  });
  await expect(editor).toHaveAttribute('data-layout', 'wide');
  const firstOutline = editor.getByRole('treeitem').first();
  await firstOutline.click();
  let inspector = await activateInspectorPanel(page);
  const annotation = inspector.getByRole('textbox', { name: /Annotation|注释/u });
  await annotation.fill('Responsive note');
  await inspector.getByRole('button', { name: /Save annotation|保存注释/u }).focus();

  await host.evaluate(element => {
    if (element instanceof HTMLElement) {
      element.style.width = '1000px';
    }
  });
  await expect(editor).toHaveAttribute('data-layout', 'compact');
  await expect(editor.locator('.tp-inspector-static')).toBeHidden();
  await expect(firstOutline).toBeFocused();

  await host.evaluate(element => {
    if (element instanceof HTMLElement) {
      element.style.width = '500px';
    }
  });
  await expect(editor).toHaveAttribute('data-layout', 'narrow');
  await editor.locator('.tp-inspector-trigger').click();
  inspector = await activateInspectorPanel(page);
  await inspector.getByRole('textbox', { name: /Annotation|注释/u }).focus();
  await host.evaluate(element => {
    if (element instanceof HTMLElement) {
      element.style.width = '1000px';
    }
  });
  await expect(editor).toHaveAttribute('data-layout', 'compact');
  await expect(editor.getByRole('dialog', { name: 'Inspector' })).toBeHidden();
  await expect(firstOutline).toBeFocused();

  await host.evaluate(element => {
    if (element instanceof HTMLElement) {
      element.style.width = '500px';
    }
  });
  const hiddenAfterResize = editor.locator('.tp-inspector-trigger');
  await hiddenAfterResize.focus();
  await expect(hiddenAfterResize).toBeFocused();
  await host.evaluate(element => {
    if (element instanceof HTMLElement) {
      element.style.width = '1280px';
    }
  });
  await expect(editor).toHaveAttribute('data-layout', 'wide');
  await expect(hiddenAfterResize).toBeHidden();
  await expect(firstOutline).toBeFocused();

  await firstOutline.focus();
  await applyConfigWithoutMovingFocus(configInput, {
    ...comparisonConfig,
    editor: {
      ...comparisonConfig.editor,
      panels: { outline: false, inspector: true, toolbar: true },
    },
  });
  await expect(page.getByRole('status', { name: '图表配置状态' })).toContainText('已同步');
  await expect(editor.locator('[data-focus-key="chart-heading"]')).toBeFocused();
  await expect(editor.locator('.tp-inspector-trigger')).toBeHidden();

  await host.evaluate(element => {
    if (element instanceof HTMLElement) {
      element.style.width = '500px';
    }
  });
  await editor.locator('.tp-inspector-trigger').click();
  inspector = await activateInspectorPanel(page);
  await inspector.getByRole('textbox', { name: /Annotation|注释/u }).focus();
  await applyConfigWithoutMovingFocus(configInput, {
    ...comparisonConfig,
    data: { ...comparisonConfig.data, datasetId: 'comparison-responsive-empty', items: [] },
    editor: {
      ...comparisonConfig.editor,
      panels: { outline: false, inspector: false, toolbar: false },
    },
  });
  await expect(editor).toHaveAttribute('data-editor-state', 'empty');
  await expect(editor.getByRole('region', { name: 'Chart summary' })).toContainText(
    '0 visible clusters and 2 series',
  );
  const emptyHeading = editor.getByRole('heading', { name: 'Category column chart' });
  await expect(emptyHeading).toBeFocused();
  await applyConfigWithoutMovingFocus(
    configInput,
    {
      ...comparisonConfig,
      data: { ...comparisonConfig.data, datasetId: 'comparison-responsive-empty', items: [] },
      editor: {
        ...comparisonConfig.editor,
        panels: { outline: false, inspector: false, toolbar: false },
      },
      height: 721,
    },
    true,
  );
  await expect(page.getByRole('status', { name: '图表配置状态' })).toContainText('已同步');
  await expect(editor).toBeFocused();
});
