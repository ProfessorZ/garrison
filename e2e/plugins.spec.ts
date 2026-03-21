import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

const USER = 'openclaw-test';
const PASS = 't3stt3st';

test.describe('Plugins', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USER, PASS);
  });

  test('navigate to /plugins', async ({ page }) => {
    await page.goto('/plugins');
    await expect(page).toHaveURL(/\/plugins/);
  });

  test('plugin list loads with expected plugins', async ({ page }) => {
    await page.goto('/plugins');
    await page.waitForTimeout(2000);
    // Should show at least some of: zomboid, factorio, hll, dayz
    const pluginTexts = await page.locator('body').textContent();
    const found = ['zomboid', 'factorio', 'hll', 'dayz'].filter(
      (p) => pluginTexts?.toLowerCase().includes(p)
    );
    expect(found.length).toBeGreaterThanOrEqual(1);
  });
});
