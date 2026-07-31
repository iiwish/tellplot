import { expect, test } from '@playwright/test';

const EDITOR = '[data-tellplot="editor"]';

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
