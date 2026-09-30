import { expect, test } from "@playwright/test";

test("browser smoke fixture boots", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Drakeshard Browser Smoke");
  await expect(page.getByTestId("smoke-root")).toHaveText("browser-smoke-ready");
});
