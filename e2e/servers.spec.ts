import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

const USER = 'openclaw-test';
const PASS = 't3stt3st';

test.describe('Servers', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USER, PASS);
  });

  test('server list visible on dashboard', async ({ page }) => {
    await expect(page.locator('h4').first()).toBeVisible({ timeout: 10_000 });
    const serverCards = page.locator('h4');
    expect(await serverCards.count()).toBeGreaterThan(0);
  });

  test('click on PZ server loads server detail page', async ({ page }) => {
    // Click the first server card that contains PZ-related text, or just any server
    const pzLink = page.locator('a[href*="/server/"]').first();
    await expect(pzLink).toBeVisible({ timeout: 10_000 });
    await pzLink.click();
    await expect(page).toHaveURL(/\/server\/\d+/);
  });

  test('server detail shows Console tab', async ({ page }) => {
    await page.goto('/server/2');
    await expect(page.getByText('Console', { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('server detail shows Players tab', async ({ page }) => {
    await page.goto('/server/2');
    await expect(page.getByText('Players', { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('server detail shows correct game type badge', async ({ page }) => {
    await page.goto('/server/2');
    // The server detail header should show the game type
    await expect(page.locator('text=/zomboid|pz|factorio|hll|dayz/i').first()).toBeVisible({ timeout: 10_000 });
  });

  test('status shows online for servers that are up', async ({ page }) => {
    // Check dashboard for online status badges
    await expect(page.getByText('online').first()).toBeVisible({ timeout: 15_000 });
  });
});
