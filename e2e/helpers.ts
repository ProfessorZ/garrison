import { Page, expect } from '@playwright/test';

export async function loginAs(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.getByPlaceholder('Enter username').fill(username);
  await page.getByPlaceholder('Enter password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('/', { timeout: 10_000 });
}
