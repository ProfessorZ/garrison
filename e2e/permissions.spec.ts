import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

const USER = 'openclaw-test';
const PASS = 't3stt3st';

test.describe('Permissions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, USER, PASS);
    await page.goto('/server/2');
  });

  test('settings tab is visible and accessible', async ({ page }) => {
    const settingsTab = page.getByRole('button', { name: /Settings/i });
    await expect(settingsTab).toBeVisible({ timeout: 10_000 });
    await settingsTab.click();
    await page.waitForTimeout(1000);
  });

  test('permissions section visible on access tab', async ({ page }) => {
    const accessTab = page.getByRole('button', { name: /Access/i });
    await expect(accessTab).toBeVisible({ timeout: 10_000 });
    await accessTab.click();
    await expect(page.getByText(/permission/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('search for openclaw in user search via Add User', async ({ page }) => {
    const accessTab = page.getByRole('button', { name: /Access/i });
    await expect(accessTab).toBeVisible({ timeout: 10_000 });
    await accessTab.click();
    await page.waitForTimeout(1000);
    // Click "Add User" button to reveal the search input
    const addUserBtn = page.getByText('Add User');
    await expect(addUserBtn).toBeVisible({ timeout: 5_000 });
    await addUserBtn.click();
    await page.waitForTimeout(500);
    // Search for openclaw in the user search input
    const searchInput = page.getByPlaceholder(/search users/i);
    await expect(searchInput).toBeVisible({ timeout: 5_000 });
    await searchInput.fill('openclaw');
    await page.waitForTimeout(1000);
    await expect(page.getByText(/openclaw/i).first()).toBeVisible({ timeout: 5_000 });
  });
});
