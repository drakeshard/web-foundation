import { expect, type Page, test } from "@playwright/test";

const databaseName = "drakeshard-browser-service-test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await deleteDatabase(page, databaseName);
  await page.reload();
});

test("save envelope round-trips through real IndexedDB and survives reload", async ({ page }) => {
  await page.getByTestId("save-service-save").click();
  await expectResult(page, { ok: true });

  await page.getByTestId("save-service-inspect").click();
  await expect
    .poll(() => readResult(page))
    .toEqual({
      ok: true,
      value: {
        gameId: "browser-game",
        saveFormatVersion: 3,
        gameVersion: "1.0.0",
        contentVersion: "base",
        createdAt: "2026-09-30T12:00:00.000Z",
        updatedAt: "2026-09-30T12:00:00.000Z",
        payload: { hp: 12, party: ["mage", "guard"] },
      },
    });

  await page.reload();
  await page.getByTestId("save-service-load").click();
  await expect
    .poll(() => readResult(page))
    .toEqual({
      ok: true,
      value: { hp: 12, party: ["mage", "guard"] },
    });
});

test("real browser load applies a multi-step migration without replacing the source", async ({
  page,
}) => {
  await page.getByTestId("save-service-seed-legacy").click();
  await expectResult(page, { ok: true });

  await page.getByTestId("save-service-load").click();
  await expect
    .poll(() => readResult(page))
    .toEqual({
      ok: true,
      value: { hp: 10, mana: 5, armor: 2 },
    });

  await page.getByTestId("save-service-inspect").click();
  await expect
    .poll(() => readResult(page))
    .toMatchObject({
      ok: true,
      value: {
        saveFormatVersion: 1,
        payload: { hp: 10 },
      },
    });
});

test("corrupt and unsupported future saves produce structured failures", async ({ page }) => {
  await page.getByTestId("save-service-seed-corrupt").click();
  await expectResult(page, { ok: true });

  await page.getByTestId("save-service-load").click();
  await expect
    .poll(() => readResult(page))
    .toMatchObject({
      ok: false,
      error: { kind: "corrupt-data", operation: "decode" },
    });

  await page.getByTestId("save-service-seed-future").click();
  await expectResult(page, { ok: true });

  await page.getByTestId("save-service-load").click();
  await expect
    .poll(() => readResult(page))
    .toMatchObject({
      ok: false,
      error: { kind: "unsupported-version", operation: "migrate" },
    });
});

test("failed migration leaves the browser source save unchanged", async ({ page }) => {
  await page.getByTestId("save-service-seed-legacy").click();
  await expectResult(page, { ok: true });

  await page.getByTestId("save-service-load-failing").click();
  await expect
    .poll(() => readResult(page))
    .toMatchObject({
      ok: false,
      error: {
        kind: "migration-failed",
        operation: "migrate",
        diagnostic: { message: "fixture migration failure" },
      },
    });

  await page.getByTestId("save-service-inspect").click();
  await expect
    .poll(() => readResult(page))
    .toMatchObject({
    ok: true,
    value: {
      saveFormatVersion: 1,
      payload: { hp: 10 },
    },
  });
});

async function expectResult(page: Page, expected: unknown): Promise<void> {
  await expect.poll(() => readResult(page)).toEqual(expected);
}

async function readResult(page: Page): Promise<unknown> {
  const text = (await page.getByTestId("save-service-result").textContent()) ?? "";
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
