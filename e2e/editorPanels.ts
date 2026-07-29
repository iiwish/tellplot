import { expect, type Page } from '@playwright/test';

export async function activateInspectorPanel(page: Page): Promise<void> {
  const tab = page.getByRole('tab', { name: '检查器' });
  if ((await tab.count()) === 0) {
    return;
  }
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

export async function activateOutlinePanel(page: Page): Promise<void> {
  const tab = page.getByRole('tab', { name: '结构大纲' });
  if ((await tab.count()) === 0) {
    return;
  }
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}
