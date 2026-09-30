import { expect, type Locator, test } from "@playwright/test";

test("PlayCanvas renderer probe boots from the shared toy domain", async ({ page }) => {
  await page.goto("http://127.0.0.1:4174/playcanvas.html");

  await expect(page).toHaveTitle("Drakeshard PlayCanvas Renderer Probe");
  await expect(page.getByTestId("playcanvas-probe-status")).toHaveText("playcanvas-probe-ready");

  const canvas = page.locator("#playcanvas-probe canvas");
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toHaveAttribute("width", "640");
  await expect(canvas).toHaveAttribute("height", "480");

  await expect(page.getByTestId("playcanvas-domain-state")).toContainText('"id":"probe"');
  await expect(page.getByTestId("playcanvas-input-contexts")).toHaveText('["playcanvas-gameplay"]');
  await expect(page.getByTestId("playcanvas-presentation-sync")).toHaveText(
    '{"created":2,"updated":0,"destroyed":0,"viewIds":["probe:probe","marker"]}',
  );

  await page.getByTestId("playcanvas-sync").click();
  await expect(page.getByTestId("playcanvas-presentation-sync")).toHaveText(
    '{"created":0,"updated":2,"destroyed":0,"viewIds":["probe:probe","marker"]}',
  );

  await page.getByTestId("playcanvas-rebuild").click();
  await expect(page.getByTestId("playcanvas-rebuild-count")).toHaveText("1");
  await expect(page.getByTestId("playcanvas-presentation-sync")).toHaveText(
    '{"created":2,"updated":0,"destroyed":0,"viewIds":["probe:probe","marker"]}',
  );
  await expect(canvas).toHaveCount(1);
});

test("PlayCanvas elevation demo moves deterministically from low through ramp to high", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4174/playcanvas.html");
  await expect(page.getByTestId("playcanvas-probe-status")).toHaveText("playcanvas-probe-ready");

  const elevationState = page.getByTestId("playcanvas-elevation-demo-state");
  const advance = page.getByTestId("playcanvas-elevation-demo-advance");

  await expect(elevationState).toHaveText(
    '{"tick":0,"position":{"x":3,"y":3},"elevation":0.5}',
  );

  await advance.click();
  await expect(elevationState).toHaveText(
    '{"tick":1,"position":{"x":2,"y":3},"elevation":0}',
  );

  await advance.click();
  await expect(elevationState).toHaveText(
    '{"tick":2,"position":{"x":3,"y":3},"elevation":0.5}',
  );

  await advance.click();
  await expect(elevationState).toHaveText(
    '{"tick":3,"position":{"x":4,"y":3},"elevation":1}',
  );
  await expect(page.getByTestId("playcanvas-domain-state")).toContainText(
    '"position":{"x":4,"y":3}',
  );
  await expect(page.getByTestId("playcanvas-presentation-sync")).toContainText('"updated":2');
});

test("PlayCanvas camera zoom and pointer selection stay presentation-local", async ({ page }) => {
  await page.goto("http://127.0.0.1:4174/playcanvas.html");
  await expect(page.getByTestId("playcanvas-probe-status")).toHaveText("playcanvas-probe-ready");

  const canvas = page.locator("#playcanvas-probe canvas");
  const cameraState = page.getByTestId("playcanvas-camera-state");
  const beforeZoom = await readJson<{ readonly orthoHeight: number }>(cameraState);

  await canvas.hover();
  await page.mouse.wheel(0, 120);

  await expect
    .poll(async () => (await readJson<{ readonly orthoHeight: number }>(cameraState)).orthoHeight)
    .not.toBe(beforeZoom.orthoHeight);

  await canvas.click({ position: { x: 320, y: 240 } });

  await expect(page.getByTestId("playcanvas-pointer-result")).toContainText(
    '"kind":"intersection"',
  );

  const intent = await readJson<{
    readonly type: string;
    readonly position: { readonly x: number; readonly y: number };
  }>(page.getByTestId("playcanvas-selection-intent"));

  expect(intent.type).toBe("set-marker");
  expect(intent.position.x).toBeGreaterThanOrEqual(0);
  expect(intent.position.x).toBeLessThan(8);
  expect(intent.position.y).toBeGreaterThanOrEqual(0);
  expect(intent.position.y).toBeLessThan(8);

  await expect(page.getByTestId("playcanvas-domain-state")).toContainText(
    '"position":{"x":1,"y":1}',
  );
});

async function readJson<TValue>(locator: Locator): Promise<TValue> {
  return JSON.parse((await locator.textContent()) ?? "null") as TValue;
}
