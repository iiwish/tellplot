import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const EDITOR = '[data-tellplot="editor"]';
const COMMAND_FEEDBACK = '.tp-command-feedback';
const MULTI_SELECT_MODIFIER: 'Meta' | 'Control' =
  process.platform === 'darwin' ? 'Meta' : 'Control';

async function openEditor(page: Page, mobile = false): Promise<void> {
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
  await page.goto('/');
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
  await page.getByRole('textbox', { name: '分组名称' }).fill('增长驱动');
  await page.getByRole('button', { name: '创建分组' }).click();
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
  await expect(status).toContainText('UNSUPPORTED_SCHEMA_VERSION');
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
  ).toEqual({ color: 'rgb(255, 255, 255)', background: 'rgb(18, 110, 87)' });
  await expectNoSeriousOrCritical(page, 'mobile enabled group action');
  await createGroupButton.click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '1');
  expect(await inspectorSheet.evaluate(element => element.contains(document.activeElement))).toBe(
    true,
  );
});
