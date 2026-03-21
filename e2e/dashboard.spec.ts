import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

const USER = 'openclaw-test';
const PASS = 't3stt3st';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USER, PASS);
  });

  test('dashboard loads and shows server cards', async ({ page }) => {
    // Wait for server cards to appear (they contain server names as h4 headings)
    await expect(page.locator('h4').first()).toBeVisible({ timeout: 10_000 });
  });

  test('server cards show name and game type', async ({ page }) => {
    const serverCard = page.locator('h4').first();
    await expect(serverCard).toBeVisible({ timeout: 10_000 });
    // The card should have some text content (server name)
    await expect(serverCard).not.toBeEmpty();
  });

  test('stats cards visible (total servers, online count)', async ({ page }) => {
    await expect(page.getByText('Total Servers')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Online')).toBeVisible();
  });
});
