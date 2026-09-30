import { expect, test } from "@playwright/test";

test("PlayCanvas renderer probe boots from the shared toy domain", async ({ page }) => {
  await page.goto("http://127.0.0.1:4174/playcanvas.html");

  await expect(page).toHaveTitle("Drakeshard PlayCanvas Renderer Probe");
  await expect(page.getByTestId("playcanvas-probe-status")).toHaveText("playcanvas-probe-ready");

  const canvas = page.locator("#playcanvas-probe canvas");
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveAttribute("width", "640");
  await expect(canvas).toHaveAttribute("height", "480");

  await expect(page.getByTestId("playcanvas-domain-state")).toContainText('"id":"probe"');

  await page.getByTestId("playcanvas-rebuild").click();
  await expect(page.getByTestId("playcanvas-rebuild-count")).toHaveText("1");
  await expect(canvas).toHaveCount(1);
});
