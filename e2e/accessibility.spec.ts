import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { activateInspectorPanel, activateOutlinePanel } from './editorPanels';

const EDITOR = '[data-tellplot="editor"]';
const COMMAND_FEEDBACK = '.tp-command-feedback';
const MULTI_SELECT_MODIFIER: 'Meta' | 'Control' =
  process.platform === 'darwin' ? 'Meta' : 'Control';

async function openEditor(page: Page, mobile = false): Promise<void> {
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  await page.goto('/playground');
  await expect(page.locator(`${EDITOR}[data-editor-state="ready"]`)).toBeVisible();
}

async function expectNoSeriousOrCritical(page: Page, state: string): Promise<void> {
  const result = await new AxeBuilder({ page }).analyze();
  const blocking = result.violations.filter(
    violation => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(
    blocking.map(violation => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map(node => node.target),
    })),
    `${state} must have zero serious or critical axe violations`,
  ).toEqual([]);
}

async function startOutlineDrag(page: Page): Promise<void> {
  const handle = page.getByRole('button', { name: '拖动 销量增长' });
  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) {
    return;
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 14, box.y + box.height / 2 + 8, {
    steps: 4,
  });
  await expect(page.locator(`${EDITOR}[data-interaction-state="dragging"]`)).toBeVisible();
}

async function createGroup(page: Page): Promise<void> {
  await page.getByRole('treeitem', { name: /销量增长/ }).click();
  await page
    .getByRole('treeitem', { name: /价格提升/ })
    .click({ modifiers: [MULTI_SELECT_MODIFIER] });
  await activateInspectorPanel(page);
  await page.getByRole('textbox', { name: '分组名称' }).fill('增长驱动');
  await page.getByRole('button', { name: '创建分组' }).click();
  await activateOutlinePanel(page);
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '1');
}

test('ready workbench has no serious or critical violations and exposes a real multiselect tree', async ({
  page,
}) => {
  await openEditor(page);
  await expectNoSeriousOrCritical(page, 'ready');

  const tree = page.getByRole('tree', { name: '结构大纲' });
  await expect(tree).toHaveAttribute('aria-multiselectable', 'true');
  const firstContribution = page.getByRole('treeitem', { name: /销量增长/ });
  await expect(firstContribution).toHaveAttribute('aria-level', '1');
  await expect(firstContribution).toHaveAttribute('aria-selected', 'false');
  await firstContribution.focus();
  await expect(firstContribution).toBeFocused();
  const outline = await firstContribution.evaluate(
    element => getComputedStyle(element).outlineStyle,
  );
  expect(outline).not.toBe('none');
});

test('export menu supports roving keyboard focus and returns focus on Escape', async ({ page }) => {
  await openEditor(page);
  const trigger = page.getByRole('button', { name: '导出' });
  await trigger.focus();
  await trigger.click();

  const svg = page.getByRole('menuitem', { name: 'SVG 图像' });
  const png = page.getByRole('menuitem', { name: 'PNG 图像' });
  await expect(svg).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(png).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('menuitem', { name: 'ViewSpec JSON' })).toBeFocused();
  await expectNoSeriousOrCritical(page, 'open export menu');

  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu', { name: '导出格式' })).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('desktop usage code and right panel rail are visible by default', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          document.documentElement.dataset['copiedText'] = value;
        },
      },
    });
  });
  await openEditor(page);

  const trigger = page.getByRole('button', { name: '隐藏使用代码' });
  const guide = page.getByRole('complementary', { name: '在项目中使用 TellPlot' });
  const chart = page.getByTestId('tellplot-chart-stage');
  const editorRail = page.getByRole('complementary', { name: '结构大纲 / 检查器' });
  await expect(guide).toBeVisible();
  await expect(guide.getByRole('textbox', { name: 'TellPlot 图表配置' })).toBeVisible();
  await guide.getByRole('tab', { name: '接入示例' }).click();
  await expect(guide.getByRole('tabpanel', { name: '安装' })).toContainText('pnpm add tellplot');

  const guideBox = await guide.boundingBox();
  const chartBox = await chart.boundingBox();
  const railBox = await editorRail.boundingBox();
  expect((guideBox?.x ?? 0) + (guideBox?.width ?? 0)).toBeLessThanOrEqual(chartBox?.x ?? 0);
  expect(railBox?.x ?? 0).toBeGreaterThanOrEqual((chartBox?.x ?? 0) + (chartBox?.width ?? 0) - 1);

  await guide.getByRole('tab', { name: 'React' }).click();
  await expect(guide.getByRole('tabpanel', { name: 'React' })).toContainText('ChartEditor');
  await expect(guide.getByRole('tabpanel', { name: 'React' })).toContainText(
    "import 'tellplot/styles.css'",
  );

  await guide.getByRole('tab', { name: '配置', exact: true }).click();
  const configPanel = guide.getByRole('tabpanel', { name: '配置', exact: true });
  await expect(configPanel).toContainText('appearance');
  await expect(configPanel).toContainText('colors');
  await expect(configPanel).toContainText('groupRegion');
  await configPanel.getByRole('button', { name: '复制配置代码' }).click();
  await expect(guide.getByRole('status', { name: '代码复制状态' })).toHaveText('已复制');
  await expect(page.locator('html')).toHaveAttribute('data-copied-text', /appearance/);
  const inspectorTab = editorRail.getByRole('tab', { name: '检查器' });
  await inspectorTab.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(editorRail.getByRole('tab', { name: '结构大纲' })).toBeFocused();
  await expectNoSeriousOrCritical(page, 'desktop developer layout');

  await trigger.click();
  await expect(guide).toBeHidden();
  await expect(page.getByRole('button', { name: '显示使用代码' })).toBeFocused();
});

test('usage guide stays inside the mobile viewport', async ({ page }) => {
  await openEditor(page, true);
  const trigger = page.getByRole('button', { name: '显示使用代码' });
  const triggerBox = await trigger.boundingBox();
  expect(triggerBox?.width ?? 0).toBeGreaterThanOrEqual(32);
  expect(triggerBox?.height ?? 0).toBeGreaterThanOrEqual(32);

  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '在项目中使用 TellPlot' });
  const dialogBox = await dialog.boundingBox();
  expect(dialogBox).not.toBeNull();
  expect(dialogBox?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect(dialogBox?.y ?? -1).toBeGreaterThanOrEqual(0);
  expect((dialogBox?.x ?? 0) + (dialogBox?.width ?? 0)).toBeLessThanOrEqual(390);
  expect((dialogBox?.y ?? 0) + (dialogBox?.height ?? 0)).toBeLessThanOrEqual(844);
  await expect(dialog.getByRole('textbox', { name: 'TellPlot 图表配置' })).toBeVisible();
  await dialog.getByRole('tab', { name: '接入示例' }).click();
  await expect(dialog.getByRole('tab', { name: '配置', exact: true })).toBeVisible();
  await expectNoSeriousOrCritical(page, 'mobile usage guide');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('active drag target keeps one accessible row and a polite live status', async ({ page }) => {
  await openEditor(page);
  await startOutlineDrag(page);
  await expect(page.locator(COMMAND_FEEDBACK)).toContainText('正在移动');
  await expect(page.locator(COMMAND_FEEDBACK)).toHaveAttribute('aria-live', 'polite');
  await expect(page.getByRole('status', { name: '文件状态' })).toHaveAttribute(
    'aria-live',
    'polite',
  );
  await expect(page.getByRole('treeitem', { name: /销量增长/ })).toHaveCount(1);
  await expectNoSeriousOrCritical(page, 'active drag');
  await page.keyboard.press('Escape');
});

test('expanded and collapsed groups keep disclosure semantics and meaningful focus', async ({
  page,
}) => {
  await openEditor(page);
  await createGroup(page);
  const groupRow = page.getByRole('treeitem', { name: /增长驱动/ });
  await expect(groupRow).toHaveAttribute('aria-expanded', 'true');
  const collapse = page.getByRole('button', { name: '折叠 增长驱动' });
  await expect(collapse).toHaveAttribute('aria-expanded', 'true');
  await expectNoSeriousOrCritical(page, 'expanded group');

  await collapse.focus();
  await page.keyboard.press('Enter');
  const expand = page.getByRole('button', { name: '展开 增长驱动' });
  await expect(expand).toHaveAttribute('aria-expanded', 'false');
  await expect(groupRow).toHaveAttribute('aria-expanded', 'false');
  await expect(expand).toBeFocused();
  await expect(page.getByRole('treeitem', { name: /销量增长/ })).toBeHidden();
  await expectNoSeriousOrCritical(page, 'collapsed group');
});

test('inline rejection is announced without leaking source content', async ({ page }) => {
  await openEditor(page);
  const fixedRow = page.getByRole('treeitem', { name: /期初营业利润/ });
  await fixedRow.focus();
  await page.keyboard.press('Alt+ArrowDown');

  const status = page.locator(COMMAND_FEEDBACK);
  await expect(status).toContainText('ITEM_LOCKED');
  await expect(status).not.toContainText('期初营业利润');
  await expect(status).not.toContainText('3,200');
  await expect(status).toHaveAttribute('aria-live', 'polite');
  await expectNoSeriousOrCritical(page, 'inline rejection');
});

test('invalid imported ViewSpec remains accessible and exposes only stable diagnostics', async ({
  page,
}) => {
  await openEditor(page);
  await page.getByLabel('导入 ViewSpec 文件').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schemaVersion":"2.0.0"}'),
  });

  const status = page.getByRole('status', { name: '文件状态' });
  await expect(status).toContainText('SOURCE_CONFLICT');
  await expect(status).toContainText('/schemaVersion');
  await expect(status).not.toContainText('销量增长');
  await expectNoSeriousOrCritical(page, 'invalid ViewSpec import');
});

test('mobile outline sheet keeps the interaction controls reachable', async ({ page }) => {
  await openEditor(page, true);
  const importButton = page.locator('button[aria-label="导入 ViewSpec"]');
  const exportButton = page.getByRole('button', { name: '导出' });
  for (const control of [importButton, exportButton]) {
    const box = await control.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(32);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(32);
  }
  await exportButton.click();
  const exportMenu = page.getByRole('menu', { name: '导出格式' });
  const exportMenuBox = await exportMenu.boundingBox();
  expect(exportMenuBox).not.toBeNull();
  expect(exportMenuBox?.x ?? -1).toBeGreaterThanOrEqual(0);
  expect(exportMenuBox?.y ?? -1).toBeGreaterThanOrEqual(0);
  expect((exportMenuBox?.x ?? 0) + (exportMenuBox?.width ?? 0)).toBeLessThanOrEqual(390);
  expect((exportMenuBox?.y ?? 0) + (exportMenuBox?.height ?? 0)).toBeLessThanOrEqual(844);
  await expectNoSeriousOrCritical(page, 'mobile export menu');
  await page.keyboard.press('Escape');

  const outlineTrigger = page.getByRole('button', { name: '打开结构大纲' });
  await outlineTrigger.click();
  const outlineSheet = page.getByRole('dialog', { name: '结构大纲' });
  await expect(outlineSheet).toBeVisible();
  await expect(outlineSheet.getByRole('button', { name: '关闭结构大纲' })).toBeFocused();
  await expect(outlineSheet.getByRole('button', { name: '拖动 销量增长' })).toBeVisible();
  const salesSelection = outlineSheet.getByRole('checkbox', { name: '选择 销量增长' });
  const priceSelection = outlineSheet.getByRole('checkbox', { name: '选择 价格提升' });
  await salesSelection.click();
  await priceSelection.click();
  await expect(salesSelection).toBeChecked();
  await expect(priceSelection).toBeChecked();
  const touchTarget = await salesSelection.locator('..').boundingBox();
  expect(touchTarget?.width ?? 0).toBeGreaterThanOrEqual(32);
  expect(touchTarget?.height ?? 0).toBeGreaterThanOrEqual(32);
  await expectNoSeriousOrCritical(page, 'mobile outline sheet');
  await page.keyboard.press('Escape');
  await expect(outlineSheet).toBeHidden();
  await expect(outlineTrigger).toBeFocused();

  const inspectorTrigger = page.getByRole('button', { name: '打开检查器' });
  await inspectorTrigger.click();
  const inspectorSheet = page.getByRole('dialog', { name: '检查器' });
  await expect(inspectorSheet).toBeVisible();
  await expect(inspectorSheet.getByRole('button', { name: '关闭检查器' })).toBeFocused();
  const groupLabel = inspectorSheet.getByRole('textbox', { name: '分组名称' });
  await groupLabel.fill('增长驱动');
  const createGroupButton = inspectorSheet.getByRole('button', { name: '创建分组' });
  await expect(createGroupButton).toBeEnabled();
  expect(
    await createGroupButton.evaluate(element => ({
      color: getComputedStyle(element).color,
      background: getComputedStyle(element).backgroundColor,
    })),
  ).toEqual({ color: 'rgb(255, 255, 255)', background: 'rgb(18, 103, 229)' });
  await expectNoSeriousOrCritical(page, 'mobile enabled group action');
  await createGroupButton.click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '1');
  expect(await inspectorSheet.evaluate(element => element.contains(document.activeElement))).toBe(
    true,
  );
});

for (const layout of ['column', 'bar'] as const) {
  test(`categorical ${layout} keeps ordered keyboard, summary, and live-region equivalents`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/playground?fixture=categorical-${layout}`);
    await expect(
      page.locator(`${EDITOR}[data-editor-state="ready"][data-chart-type="${layout}"]`),
    ).toBeVisible();
    await expectNoSeriousOrCritical(page, `categorical ${layout}`);

    const tree = page.getByRole('tree', { name: '结构大纲' });
    await expect(tree.getByRole('treeitem')).toHaveCount(8);
    const first = tree.getByRole('treeitem', { name: /企业订阅/ });
    await expect(first).toHaveAttribute('aria-level', '1');
    await expect(first).toHaveAttribute('aria-selected', 'false');
    await first.focus();
    await expect(first).toBeFocused();

    const summary = page.getByRole('region', { name: '图表摘要' });
    await expect(summary).toContainText(layout === 'bar' ? '分类条形图' : '分类柱状图');
    const summaryLabels = await summary
      .locator('li')
      .evaluateAll(items => items.map(item => item.textContent?.split(',')[0] ?? ''));
    expect(summaryLabels.slice(0, 3)).toEqual(['企业订阅', '个人订阅', '专业服务']);

    await page.keyboard.press('Alt+ArrowDown');
    await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '1');
    await expect(page.locator(COMMAND_FEEDBACK)).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator(COMMAND_FEEDBACK)).toContainText('已移动');
    const reorderedLabels = await summary
      .locator('li')
      .evaluateAll(items => items.map(item => item.textContent?.split(',')[0] ?? ''));
    expect(reorderedLabels.slice(0, 3)).toEqual(['个人订阅', '企业订阅', '专业服务']);
    await expectNoSeriousOrCritical(page, `categorical ${layout} reordered`);
  });
}

test('comparison Workbench exposes source-ordered Inspector and complete narrative semantics', async ({
  page,
}) => {
  await openEditor(page);
  const comparisonConfig = {
    type: 'column',
    locale: 'en-US',
    data: {
      schemaVersion: '3.0.0',
      dataKind: 'categorical',
      datasetId: 'comparison-accessibility',
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
        {
          id: 'gamma',
          label: 'Gamma',
          values: [
            { seriesId: 'current', amount: 5 },
            { seriesId: 'plan', amount: 7 },
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
  const configInput = page.getByRole('textbox', { name: 'TellPlot 图表配置' });
  await configInput.fill(JSON.stringify(comparisonConfig, null, 2));
  await expect(page.getByRole('status', { name: '图表配置状态' })).toContainText('已同步');
  await page.getByLabel('导入 ViewSpec 文件').setInputFiles({
    name: 'comparison-view.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        schemaVersion: '3.0.0',
        datasetId: 'comparison-accessibility',
        chartType: 'column',
        revision: 0,
        rootOrder: ['group', 'gamma'],
        groups: { group: { id: 'group', label: 'Alpha and Beta', childIds: ['alpha', 'beta'] } },
        collapsedGroupIds: [],
        pinnedItemIds: ['gamma'],
        annotations: { group: 'Regional context', gamma: 'Pinned context' },
        emphasis: { group: 'muted', gamma: 'highlight' },
      }),
    ),
  });
  await expect(page.getByRole('status', { name: '文件状态' })).toContainText('VIEW_IMPORTED');

  const tree = page.getByRole('tree', { name: 'Structure outline' });
  await expect(tree.getByRole('treeitem')).toHaveCount(4);
  await expect(tree.locator('[data-series-id]')).toHaveCount(0);
  await expect(tree.getByRole('treeitem').first()).toContainText('2 series');
  await tree.locator('[data-node-id="gamma"]').click();
  const inspector = await activateInspectorPanel(page);
  await expect(inspector.locator('[data-inspector-kind="category"]')).toBeVisible();
  await expect(inspector.locator('[data-series-id]')).toHaveCount(2);
  await expect(inspector.locator('[data-series-id]').nth(0)).toContainText('Current');
  await expect(inspector.locator('[data-series-id]').nth(1)).toContainText('Plan');
  await expect(inspector.getByRole('textbox', { name: /Annotation|注释/u })).toHaveValue(
    'Pinned context',
  );
  await expect(inspector).toContainText('Pinned');
  await expect(inspector).toContainText('Highlighted');
  await expect(inspector).toContainText('Locked');

  let summary = page.getByRole('region', { name: 'Chart summary' });
  await expect(summary.locator('[data-summary-kind="series-registry"]')).toHaveText(
    'Series registry: Current, Plan.',
  );
  expect(
    await summary
      .locator('[data-summary-node-id]')
      .evaluateAll(nodes =>
        nodes.map(node => [
          node.getAttribute('data-summary-node-id'),
          node.getAttribute('data-summary-node-kind'),
        ]),
      ),
  ).toEqual([
    ['group', 'expanded-group'],
    ['alpha', 'category'],
    ['beta', 'category'],
    ['gamma', 'category'],
  ]);
  await expect(summary).toContainText('Regional context');
  await expect(summary).toContainText('muted');
  await expect(summary).toContainText('pinned');
  await expectNoSeriousOrCritical(page, 'comparison narrative Workbench');

  const emptyConfig = {
    ...comparisonConfig,
    data: { ...comparisonConfig.data, datasetId: 'comparison-accessibility-empty', items: [] },
  };
  await page.getByRole('button', { name: 'Inspector backdrop' }).click();
  await configInput.fill(JSON.stringify(emptyConfig, null, 2));
  await expect(page.getByRole('status', { name: '文件状态' })).toContainText('CONFIG_APPLIED');
  summary = page.getByRole('region', { name: 'Chart summary' });
  await expect(summary.locator('[data-summary-kind="intro"]')).toContainText(
    '0 visible clusters and 2 series',
  );
  await expect(summary.locator('[data-summary-kind="series-registry"]')).toHaveText(
    'Series registry: Current, Plan.',
  );
  await expect(summary.locator('[data-summary-node-id]')).toHaveCount(0);
});

for (const websitePage of [
  { path: '/', heading: 'TellPlot', state: 'showcase home' },
  { path: '/examples', heading: '图表示例', state: 'showcase examples' },
  { path: '/docs', heading: '开发者文档', state: 'showcase docs' },
] as const) {
  test(`${websitePage.state} has no serious or critical violations`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(websitePage.path);
    await expect(page.getByRole('heading', { level: 1, name: websitePage.heading })).toBeVisible();
    await expectNoSeriousOrCritical(page, websitePage.state);
  });
}

test('showcase mobile navigation remains accessible when expanded', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '打开导航菜单' }).click();
  await expect(page.getByRole('navigation', { name: '移动导航' })).toBeVisible();
  await expectNoSeriousOrCritical(page, 'showcase mobile navigation');
});
