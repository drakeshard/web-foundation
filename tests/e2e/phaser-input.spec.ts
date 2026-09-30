import { expect, type Locator, type Page, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("http://127.0.0.1:4174");
  await expect(page.getByTestId("renderer-probe-status")).toHaveText("phaser-probe-ready");
});

test("keyboard input crosses Foundation mapping before becoming a toy-domain move", async ({
  page,
}) => {
  await page.keyboard.down("d");
  await page.getByTestId("consume-input").click();

  expect(await readDomainState(page)).toMatchObject({
    tick: 1,
    probe: {
      position: { x: 4, y: 3 },
    },
  });

  await page.keyboard.up("d");
});

test("pointer input is converted from client coordinates only in the probe app layer", async ({
  page,
}) => {
  const canvas = page.locator("#renderer-probe canvas");
  const box = await requiredBox(canvas);

  await page.mouse.click(box.x + 6.5 * 40, box.y + 5.5 * 40);
  await page.getByTestId("consume-input").click();

  expect(await readDomainState(page)).toMatchObject({
    tick: 1,
    marker: {
      position: { x: 6, y: 5 },
    },
  });
});

test("modal input context consumes gameplay actions before domain-command translation", async ({
  page,
}) => {
  await page.getByTestId("activate-modal").click();
  await expect(page.getByTestId("input-contexts")).toHaveText('["modal","gameplay"]');

  await page.keyboard.down("d");
  await page.getByTestId("consume-input").click();

  expect(await readDomainState(page)).toMatchObject({
    tick: 0,
    probe: {
      position: { x: 3, y: 3 },
    },
  });

  await page.keyboard.up("d");
  await page.getByTestId("deactivate-modal").click();
});

async function readDomainState(page: Page): Promise<unknown> {
  return readJson(page.getByTestId("domain-state"));
}

async function readJson(locator: Locator): Promise<unknown> {
  return JSON.parse((await locator.textContent()) ?? "null");
}

async function requiredBox(locator: Locator): Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
}> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Expected Phaser canvas to have a browser bounding box");
  return box;
}
