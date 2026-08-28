import { expect, type Locator, type Page } from '@playwright/test';

export async function activateInspectorPanel(page: Page): Promise<Locator> {
  const container = page
    .locator(
      [
        '[role="complementary"][aria-label="检查器"]:visible',
        '[role="complementary"][aria-label="Inspector"]:visible',
        '[role="tabpanel"][aria-label="检查器"]:visible',
        '[role="tabpanel"][aria-label="Inspector"]:visible',
        '[role="dialog"][aria-label="检查器"]:visible',
        '[role="dialog"][aria-label="Inspector"]:visible',
      ].join(', '),
    )
    .first();
  if ((await container.count()) > 0) {
    return container;
  }

  const tab = page
    .locator('[role="tab"]:visible')
    .filter({ hasText: /^(检查器|Inspector)$/u })
    .first();
  if ((await tab.count()) > 0) {
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
  } else {
    const trigger = page
      .locator(
        'button[aria-label="打开检查器"]:visible, button[aria-label="Open inspector"]:visible',
      )
      .first();
    await expect(trigger).toBeVisible();
    await trigger.click();
  }
  await expect(container).toBeVisible();
  return container;
}

export async function activateOutlinePanel(page: Page): Promise<void> {
  const tab = page.getByRole('tab', { name: '结构大纲' });
  if ((await tab.count()) === 0) {
    return;
  }
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}
