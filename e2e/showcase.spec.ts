import { expect, test } from '@playwright/test';

test.describe('TellPlot 开源官网', () => {
  test('首页以真实图表呈现产品并切换图表家族', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: 'TellPlot' })).toBeVisible();
    await expect(page.locator('.site-desktop-nav a')).toHaveCount(2);
    await expect(page.locator('.site-home-hero__actions a')).toHaveCount(1);
    await expect(page.locator('.site-home-hero__actions a')).toHaveAttribute(
      'href',
      '#quick-start',
    );
    await expect(page.getByRole('group', { name: '选择图表家族' }).getByRole('button')).toHaveCount(
      3,
    );
    const showcase = page.getByTestId('showcase-chart');
    const editor = showcase.locator('[data-tellplot="editor"]');
    await expect(showcase).toHaveAttribute('data-interactive', 'true');
    await expect(showcase).toHaveAttribute('data-default-group', '增长驱动');
    await expect(showcase).not.toHaveAttribute('inert', '');
    await expect(editor).toHaveAttribute('data-chart-type', 'waterfall');
    await expect(editor).toHaveAttribute('data-read-only', 'false');
    await expect(editor).toHaveAttribute('data-view-revision', '0');
    await expect(showcase.locator('.tp-toolbar')).toBeHidden();
    await expect(showcase.locator('.tp-toolbar')).toHaveCSS('display', 'none');
    await expect(page.getByRole('heading', { name: '一个配置，直接开始' })).toBeVisible();
    await expect(page.locator('.site-home-code code')).toContainText('const config = {');
    await expect(page.locator('.site-home-developer__flow li')).toHaveCount(4);
    await expect(page.getByRole('heading', { name: '图表负责表达，视图负责编辑' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '一份配置，贯穿渲染、编辑与导出' })).toHaveCount(
      0,
    );
    await expect(page.getByRole('link', { name: /在工作台打开.+/ })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: '页脚导航' })).toHaveCount(0);

    await page.locator('.site-home-hero__actions a').click();
    await expect(page).toHaveURL(/#quick-start$/);

    await page.getByRole('button', { name: '分类条形图' }).click();
    await expect(
      page.getByTestId('showcase-chart').locator('[data-tellplot="editor"]'),
    ).toHaveAttribute('data-chart-type', 'bar');
    await expect(
      page.getByTestId('showcase-chart').locator('[data-tellplot="editor"]'),
    ).toHaveAttribute('data-read-only', 'false');
    await expect(page.getByText('横向扫描业务项目的正负规模，长标签依然清晰。')).toBeVisible();
  });

  test('示例中心将每个真实示例带入对应工作台', async ({ page }) => {
    await page.goto('/examples');

    await expect(page.getByRole('heading', { level: 1, name: '图表示例' })).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(3);

    await page.getByRole('link', { name: '打开分类柱状图工作台' }).click();
    await expect(page).toHaveURL(/\/playground\?fixture=categorical-column$/);
    await expect(page.locator('[data-tellplot="editor"]')).toHaveAttribute(
      'data-chart-type',
      'column',
    );
    await expect(page.getByRole('main', { name: 'TellPlot 参考编辑器' })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/examples$/);
    await expect(page.getByRole('heading', { level: 1, name: '图表示例' })).toBeVisible();
  });

  test('示例中心可以按分类与关键词筛选真实图表', async ({ page }) => {
    await page.goto('/examples');

    await page.getByRole('button', { name: '分类比较 2' }).click();
    await expect(page.getByRole('article')).toHaveCount(2);
    await expect(page.getByRole('heading', { name: '经营变动瀑布图' })).toBeHidden();

    await page.getByRole('searchbox', { name: '搜索图表示例' }).fill('条形');
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: '分类条形图' })).toBeVisible();

    await page.getByRole('button', { name: '清空搜索' }).click();
    await expect(page.getByRole('article')).toHaveCount(2);
  });

  test('文档页提供安装、模型与配置入口', async ({ page }) => {
    await page.goto('/docs');

    await expect(page.getByRole('heading', { level: 1, name: '开发者文档' })).toBeVisible();
    await expect(page).toHaveTitle('开发者文档 | TellPlot');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://tellplot.com/docs',
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      'https://tellplot.com/docs',
    );
    await expect(page.getByRole('heading', { name: '安装' })).toBeVisible();
    await expect(
      page.locator('pre').filter({
        hasText: 'pnpm add tellplot',
      }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'SourceData 与 ViewSpec' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '安全配置边界' })).toBeVisible();
  });

  test('移动导航可以展开、导航并用 Escape 关闭', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const menuButton = page.getByRole('button', { name: '打开导航菜单' });
    await menuButton.click();
    await expect(page.getByRole('navigation', { name: '移动导航' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('navigation', { name: '移动导航' })).toBeHidden();
    await expect(menuButton).toBeFocused();

    await menuButton.click();
    await page
      .getByRole('navigation', { name: '移动导航' })
      .getByRole('link', { name: '文档' })
      .click();
    await expect(page).toHaveURL(/\/docs$/);
    await expect(page.getByRole('heading', { level: 1, name: '开发者文档' })).toBeVisible();
  });
});
