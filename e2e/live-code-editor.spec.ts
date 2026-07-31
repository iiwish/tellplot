import { expect, test, type Page } from '@playwright/test';

const EDITOR = '[data-tellplot="editor"]';
const MULTI_SELECT_MODIFIER: 'Meta' | 'Control' =
  process.platform === 'darwin' ? 'Meta' : 'Control';

async function openEditor(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/playground');
  await expect(page.locator(`${EDITOR}[data-editor-state="ready"]`)).toBeVisible();
}

async function replaceConfig(
  page: Page,
  update: (config: Record<string, unknown>) => void,
): Promise<void> {
  const input = page.getByRole('textbox', { name: 'TellPlot 图表配置' });
  const config = JSON.parse(await input.inputValue()) as Record<string, unknown>;
  update(config);
  await input.fill(JSON.stringify(config, null, 2));
  await expect(page.getByRole('status', { name: '图表配置状态' })).toContainText('已同步');
}

test('valid public config edits update the chart without executing JavaScript', async ({
  page,
}) => {
  await openEditor(page);
  const input = page.getByRole('textbox', { name: 'TellPlot 图表配置' });
  await expect(input).toBeVisible();
  await expect(page.locator('textarea[aria-label="TellPlot 视图状态"]')).toBeHidden();
  await expect(input).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(input).not.toHaveValue(/documentVersion/u);
  await expect(input).not.toHaveValue(/viewSpec/u);

  await replaceConfig(page, config => {
    const appearance = config['appearance'] as Record<string, unknown>;
    appearance['title'] = '代码驱动的经营图';
    const data = config['data'] as { items: Record<string, unknown>[] };
    const sales = data.items.find(item => item['id'] === 'sales-volume');
    if (sales !== undefined) {
      sales['label'] = '渠道销量增长';
    }
  });

  await expect(page.getByRole('heading', { name: '代码驱动的经营图' })).toBeVisible();
  await expect(page.getByRole('treeitem', { name: /渠道销量增长/ })).toBeVisible();
  await expect(input).toBeFocused();
});

test('invalid drafts stay editable and preserve the last valid chart', async ({ page }) => {
  await openEditor(page);
  const input = page.getByRole('textbox', { name: 'TellPlot 图表配置' });
  const revisionBefore = await page.locator(EDITOR).getAttribute('data-view-revision');
  await input.fill('{');

  await expect(page.getByRole('status', { name: '图表配置状态' })).toContainText('INVALID_JSON');
  await expect(input).toHaveValue('{');
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', revisionBefore ?? '0');
  await expect(page.getByRole('heading', { name: '经营变动瀑布图' })).toBeVisible();
});

test('right-side commands write the resulting ViewSpec to the separate public view file', async ({
  page,
}) => {
  await openEditor(page);
  await page.getByRole('treeitem', { name: /销量增长/ }).click();
  await page
    .getByRole('treeitem', { name: /价格提升/ })
    .click({ modifiers: [MULTI_SELECT_MODIFIER] });
  await page.getByRole('tab', { name: '检查器' }).click();
  await page.getByRole('textbox', { name: '分组名称' }).fill('增长驱动');
  await page.getByRole('button', { name: '创建分组' }).click();
  await expect(page.locator(EDITOR)).toHaveAttribute('data-view-revision', '1');

  const guide = page.getByRole('complementary', { name: '在项目中使用 TellPlot' });
  await guide.getByRole('tab', { name: '视图状态' }).click();
  const input = page.getByRole('textbox', { name: 'TellPlot 视图状态' });
  await expect
    .poll(async () => {
      const view = JSON.parse(await input.inputValue()) as {
        revision: number;
        groups: Record<string, { label: string; childIds: string[] }>;
      };
      return {
        revision: view.revision,
        groups: Object.values(view.groups).map(group => ({
          label: group.label,
          childIds: group.childIds,
        })),
      };
    })
    .toEqual({
      revision: 1,
      groups: [{ label: '增长驱动', childIds: ['sales-volume', 'price-impact'] }],
    });
});

test('integration examples remain available beside the live public files', async ({ page }) => {
  await openEditor(page);
  const guide = page.getByRole('complementary', { name: '在项目中使用 TellPlot' });
  await guide.getByRole('tab', { name: '接入示例' }).click();
  await expect(guide.getByRole('tabpanel', { name: '安装' })).toContainText(
    'pnpm add @tellplot/core @tellplot/editor @tellplot/react @antv/g2@5.4.8 react react-dom',
  );
  await guide.getByRole('tab', { name: 'React' }).click();
  await expect(guide.getByRole('tabpanel', { name: 'React' })).toContainText(
    "import '@tellplot/react/styles.css'",
  );
  await expect(guide.getByRole('tabpanel', { name: 'React' })).toContainText(
    '<ChartEditor config={config} />',
  );
});
