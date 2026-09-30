import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
});

test("settings persist through browser reload and remain JSON data", async ({ page }) => {
  await page.getByTestId("settings-write").click();
  await expect(page.getByTestId("settings-result")).toHaveText(
    JSON.stringify({ ok: true }),
  );

  await page.reload();
  await page.getByTestId("settings-read").click();
  await expect(page.getByTestId("settings-result")).toHaveText(
    JSON.stringify({
      ok: true,
      value: { volume: 0.6, mode: "windowed" },
    }),
  );
});

test("malformed localStorage values return a structured corruption result", async ({ page }) => {
  await page.getByTestId("settings-write").click();
  await page.getByTestId("settings-corrupt").click();

  const result = JSON.parse((await page.getByTestId("settings-result").textContent()) ?? "{}");
  expect(result).toMatchObject({
    ok: false,
    error: {
      kind: "corrupt-data",
      operation: "decode",
    },
  });
});
