import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

const USER = 'openclaw-test';
const PASS = 't3stt3st';

test.describe('Console', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USER, PASS);
    await page.goto('/server/2');
    // Click Console tab if not already active
    const consoleTab = page.getByRole('button', { name: /Console/i }).first();
    await consoleTab.click();
  });

  test('console connects to server', async ({ page }) => {
    await expect(page.getByText(/connected/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('type a command and send it', async ({ page }) => {
    // Wait for the console to connect
    await expect(page.getByText(/connected/i).first()).toBeVisible({ timeout: 15_000 });
    const input = page.getByPlaceholder(/enter rcon command/i);
    await expect(input).toBeVisible();
    await input.fill('help');
    await input.press('Enter');
  });

  test('response appears in terminal output', async ({ page }) => {
    await expect(page.getByText(/connected/i).first()).toBeVisible({ timeout: 15_000 });
    const input = page.getByPlaceholder(/enter rcon command/i);
    await input.fill('help');
    // Press Escape to dismiss autocomplete, then Enter to send
    await input.press('Escape');
    await input.press('Enter');
    // Wait for a response line — console shows "Connected to server console." and command output
    // Look for the command echo "> help" or any response text beyond the initial connect message
    await page.waitForTimeout(3000);
    const consoleLines = page.locator('text=help').first();
    await expect(consoleLines).toBeVisible({ timeout: 10_000 });
  });
});
