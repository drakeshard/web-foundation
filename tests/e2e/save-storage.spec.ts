import { expect, test } from "@playwright/test";

const databaseName = "drakeshard-browser-save-test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(
    (name) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(name);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error("Database deletion blocked"));
      }),
    databaseName,
  );
  await page.reload();
});

test("IndexedDB save survives reload and a new page in the same browser context", async ({
  context,
  page,
}) => {
  await page.getByTestId("save-storage-write").click();
  await expect(page.getByTestId("save-storage-result")).toHaveText(JSON.stringify({ ok: true }));

  await page.reload();
  await page.getByTestId("save-storage-read").click();
  await expect(page.getByTestId("save-storage-result")).toHaveText(
    JSON.stringify({ ok: true, value: '{"fixture":"beta"}' }),
  );

  const secondPage = await context.newPage();
  await secondPage.goto("/");
  await secondPage.getByTestId("save-storage-read").click();
  await expect(secondPage.getByTestId("save-storage-result")).toHaveText(
    JSON.stringify({ ok: true, value: '{"fixture":"beta"}' }),
  );
  await secondPage.close();
});

test("list is stable and delete reports existing versus missing slots", async ({ page }) => {
  await page.getByTestId("save-storage-write").click();
  await page.getByTestId("save-storage-write-a").click();
  await page.getByTestId("save-storage-list").click();

  await expect(page.getByTestId("save-storage-result")).toHaveText(
    JSON.stringify({ ok: true, value: ["slot-a", "slot-b"] }),
  );

  await page.getByTestId("save-storage-delete").click();
  await expect(page.getByTestId("save-storage-result")).toHaveText(
    JSON.stringify({ ok: true, value: true }),
  );

  await page.getByTestId("save-storage-delete").click();
  await expect(page.getByTestId("save-storage-result")).toHaveText(
    JSON.stringify({ ok: true, value: false }),
  );
});
