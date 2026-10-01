import { expect, type Page, test } from "@playwright/test";

const databaseName = "drakeshard-browser-service-test";

test("browser input reaches deterministic tick handoff", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("lifecycle-state")).toHaveText("active");

  await page.keyboard.down("q");
  await page.getByTestId("consume-tick").click();

  await expect
    .poll(async () => readJson(page, "tick-snapshot"))
    .toMatchObject({
      actions: [
        {
          context: "gameplay",
          action: "action.primary",
          held: true,
          pressed: true,
          released: false,
        },
      ],
      transitions: [
        {
          context: "gameplay",
          action: "action.primary",
          phase: "pressed",
        },
      ],
    });

  await page.keyboard.up("q");
});

test("IndexedDB save envelope survives page reload", async ({ page }) => {
  await page.goto("/");
  await deleteDatabase(page, databaseName);
  await page.reload();

  await page.getByTestId("save-service-save").click();
  await expect
    .poll(async () => readJson(page, "save-service-result"))
    .toEqual({ ok: true });

  await page.reload();
  await page.getByTestId("save-service-load").click();
  await expect
    .poll(async () => readJson(page, "save-service-result"))
    .toEqual({
      ok: true,
      value: { hp: 12, party: ["mage", "guard"] },
    });
});

test("Phaser Canvas probe boots from renderer-neutral state", async ({ page }) => {
  await page.goto("http://127.0.0.1:4174/");

  await expect(page.getByTestId("renderer-probe-status")).toHaveText("phaser-probe-ready");
  await expect(page.locator("#renderer-probe canvas")).toHaveCount(1);
  await expect(page.getByTestId("domain-state")).toContainText('"id":"probe"');
});

async function readJson(page: Page, testId: string): Promise<unknown> {
  const text = (await page.getByTestId(testId).textContent()) ?? "";
  return text === "" ? null : JSON.parse(text);
}

async function deleteDatabase(page: Page, name: string): Promise<void> {
  await page.evaluate(
    (database) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(database);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error("Database deletion blocked"));
      }),
    name,
  );
}
