import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

const USER = 'openclaw-test';
const PASS = 't3stt3st';

test.describe('Authentication', () => {
  test('login with valid credentials lands on dashboard', async ({ page }) => {
    await loginAs(page, USER, PASS);
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Dashboard').first()).toBeVisible();
  });

  test('login with wrong password stays on login page', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Enter username').fill(USER);
    await page.getByPlaceholder('Enter password').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    // The 401 interceptor forces a page reload to /login — user is NOT navigated to dashboard
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/login/);
    // Should still show the login form (not the dashboard)
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('logout redirects to /login', async ({ page }) => {
    await loginAs(page, USER, PASS);
    await page.getByText('Sign Out').click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('access protected route when logged out redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login only requires one submit (no double-login bug)', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Enter username').fill(USER);
    await page.getByPlaceholder('Enter password').fill(PASS);
    const clickPromise = page.getByRole('button', { name: /sign in/i }).click();
    await clickPromise;
    // Should land on dashboard after single click, no second login needed
    await page.waitForURL('/', { timeout: 10_000 });
    await expect(page).toHaveURL('/');
  });
});
