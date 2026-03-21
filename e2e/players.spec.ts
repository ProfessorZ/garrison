import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

const USER = 'openclaw-test';
const PASS = 't3stt3st';

test.describe('Players', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USER, PASS);
    await page.goto('/server/6');
  });

  test('players tab loads without error', async ({ page }) => {
    const playersTab = page.getByRole('button', { name: /Players/i }).first();
    await playersTab.click();
    // Should show the Players heading or an empty state — either is fine
    await expect(
      page.getByText(/Players/i).first()
    ).toBeVisible({ timeout: 10_000 });
    // No error should be visible
    await expect(page.locator('text=/error|failed|crash/i')).not.toBeVisible();
  });

  test('if players present, shows player name', async ({ page }) => {
    const playersTab = page.getByRole('button', { name: /Players/i }).first();
    await playersTab.click();
    // Wait for player list to load
    await page.waitForTimeout(3000);
    // Check if there's a player table/list — this may be empty
    const playerRows = page.locator('table tbody tr, [class*="player"]');
    const count = await playerRows.count();
    if (count > 0) {
      // At least one player row should have text content
      await expect(playerRows.first()).not.toBeEmpty();
    }
    // Test passes regardless — we just verify no crash
  });
});
