import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Visual regression", () => {
  test("login page", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL("**/login");
    await expect(page).toHaveScreenshot("login-page.png", { maxDiffPixels: 100 });
  });

  test("dashboard", async ({ page }) => {
    await loginAs(page, "openclaw-test", "t3stt3st");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("dashboard.png", { maxDiffPixels: 2000 });
  });

  test("plugins page", async ({ page }) => {
    await loginAs(page, "openclaw-test", "t3stt3st");
    await page.goto("/plugins");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("plugins.png", { maxDiffPixels: 100 });
  });

  test("users page", async ({ page }) => {
    await loginAs(page, "openclaw-test", "t3stt3st");
    await page.goto("/users");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("users.png", { maxDiffPixels: 100 });
  });

  test("PZ server detail — Console tab", async ({ page }) => {
    await loginAs(page, "openclaw-test", "t3stt3st");
    await page.goto("/server/2");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500); // wait for WS connect
    await expect(page).toHaveScreenshot("pz-console.png", { maxDiffPixels: 200 });
  });

  test("PZ server detail — Players tab", async ({ page }) => {
    await loginAs(page, "openclaw-test", "t3stt3st");
    await page.goto("/server/2");
    await page.waitForLoadState("networkidle");
    await page.locator("button").filter({ hasText: /^Players$/i }).first().click();
    await page.waitForTimeout(800);
    await expect(page).toHaveScreenshot("pz-players.png", { maxDiffPixels: 100 });
  });

  test("PZ server detail — Chat tab", async ({ page }) => {
    await loginAs(page, "openclaw-test", "t3stt3st");
    await page.goto("/server/2");
    await page.waitForLoadState("networkidle");
    await page.locator("button").filter({ hasText: /^Chat$/i }).first().click();
    await page.waitForTimeout(800);
    await expect(page).toHaveScreenshot("pz-chat.png", { maxDiffPixels: 100 });
  });

  test("PZ server detail — Activity tab", async ({ page }) => {
    await loginAs(page, "openclaw-test", "t3stt3st");
    await page.goto("/server/2");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    const activityBtn = page.locator("button").filter({ hasText: /^Activity$/i }).first();
    await activityBtn.waitFor({ state: "visible", timeout: 10000 });
    await activityBtn.click();
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot("pz-activity.png", { maxDiffPixels: 5000 });
  });

  test("PZ server detail — Settings tab", async ({ page }) => {
    await loginAs(page, "openclaw-test", "t3stt3st");
    await page.goto("/server/2");
    await page.waitForLoadState("networkidle");
    await page.locator("button").filter({ hasText: /^Settings$/i }).first().click();
    await page.waitForTimeout(800);
    await expect(page).toHaveScreenshot("pz-settings.png", { maxDiffPixels: 100 });
  });

  test("HLL server detail", async ({ page }) => {
    await loginAs(page, "openclaw-test", "t3stt3st");
    await page.goto("/server/5");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot("hll-detail.png", { maxDiffPixels: 200 });
  });

  test("DayZ server detail", async ({ page }) => {
    await loginAs(page, "openclaw-test", "t3stt3st");
    await page.goto("/server/6");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot("dayz-detail.png", { maxDiffPixels: 200 });
  });

  test("Factorio server detail", async ({ page }) => {
    await loginAs(page, "openclaw-test", "t3stt3st");
    await page.goto("/server/1");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await expect(page).toHaveScreenshot("factorio-detail.png", { maxDiffPixels: 200 });
  });
});
