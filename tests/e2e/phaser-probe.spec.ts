import { expect, test } from "@playwright/test";

test("Phaser renderer probe boots from toy-domain state", async ({ page }) => {
  await page.goto("http://127.0.0.1:4174");

  await expect(page).toHaveTitle("Drakeshard Phaser Renderer Probe");
  await expect(page.getByTestId("renderer-probe-status")).toHaveText("phaser-probe-ready");

  const canvas = page.locator("#renderer-probe canvas");
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveAttribute("width", "320");
  await expect(canvas).toHaveAttribute("height", "320");
});
