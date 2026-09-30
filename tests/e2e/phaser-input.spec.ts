import { expect, type Locator, type Page, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("http://127.0.0.1:4174");
  await expect(page.getByTestId("renderer-probe-status")).toHaveText("phaser-probe-ready");
});

test("held keyboard input is consumed on fixed simulation ticks", async ({ page }) => {
  await page.keyboard.down("d");
  await page.waitForFunction(() => {
    const state = JSON.parse(
      document.querySelector<HTMLElement>("[data-testid='domain-state']")?.textContent ?? "null",
    ) as { probe?: { position?: { x?: number } } } | null;
    return (state?.probe?.position?.x ?? 0) > 3;
  });
  await page.keyboard.up("d");

  expect(await readDomainState(page)).toMatchObject({
    probe: {
      position: { y: 3 },
    },
  });
});

test("pointer input is converted once and consumed by the next fixed simulation tick", async ({
  page,
}) => {
  const canvas = page.locator("#renderer-probe canvas");
  const box = await requiredBox(canvas);

  await page.mouse.click(box.x + 6.5 * 40, box.y + 5.5 * 40);
  await page.waitForFunction(() => {
    const state = JSON.parse(
      document.querySelector<HTMLElement>("[data-testid='domain-state']")?.textContent ?? "null",
    ) as { marker?: { position?: { x?: number; y?: number } } } | null;
    return state?.marker?.position?.x === 6 && state.marker.position.y === 5;
  });

  expect(await readDomainState(page)).toMatchObject({
    marker: {
      position: { x: 6, y: 5 },
    },
  });
});

test("modal input context consumes gameplay movement across fixed ticks", async ({ page }) => {
  await page.getByTestId("activate-modal").click();
  await expect(page.getByTestId("input-contexts")).toHaveText('["modal","gameplay"]');

  const before = await readDomainState(page);
  const beforeTick = readTick(before);

  await page.keyboard.down("d");
  await waitForTick(page, beforeTick + 2);
  await page.keyboard.up("d");

  expect(await readDomainState(page)).toMatchObject({
    probe: {
      position: { x: 3, y: 3 },
    },
  });

  await page.getByTestId("deactivate-modal").click();
});

test("random toy-domain command advances Foundation deterministic RNG on a fixed tick", async ({
  page,
}) => {
  const before = await readDomainState(page);

  await page.keyboard.press("r");
  await page.waitForFunction(
    (initialMarker) => {
      const state = JSON.parse(
        document.querySelector<HTMLElement>("[data-testid='domain-state']")?.textContent ?? "null",
      ) as { marker?: { position?: { x?: number; y?: number } } } | null;
      const marker = state?.marker?.position;
      return marker !== undefined && (marker.x !== initialMarker.x || marker.y !== initialMarker.y);
    },
    (before as DomainState).marker.position,
  );

  expect(((await readDomainState(page)) as DomainState).marker.position).not.toEqual(
    (before as DomainState).marker.position,
  );
});

test("Preact UI bridge projects domain state and issues domain intent", async ({ page }) => {
  await expect(page.getByTestId("ui-domain-summary")).toContainText("tick ");
  await expect(page.getByTestId("ui-domain-summary")).toContainText("probe (3, 3)");

  const before = (await readDomainState(page)) as DomainState;
  await page.getByTestId("ui-randomize-marker").click();

  await page.waitForFunction((initialMarker) => {
    const state = JSON.parse(
      document.querySelector<HTMLElement>("[data-testid='domain-state']")?.textContent ?? "null",
    ) as { marker?: { position?: { x?: number; y?: number } } } | null;
    const marker = state?.marker?.position;
    return marker !== undefined && (marker.x !== initialMarker.x || marker.y !== initialMarker.y);
  }, before.marker.position);

  const after = (await readDomainState(page)) as DomainState;
  expect(after.marker.position).not.toEqual(before.marker.position);
  await expect(page.getByTestId("ui-domain-summary")).toContainText(
    `marker (${after.marker.position.x}, ${after.marker.position.y})`,
  );
});

test("save reload load restores domain state and Phaser presentation", async ({ page }) => {
  const canvas = page.locator("#renderer-probe canvas");
  const box = await requiredBox(canvas);

  await page.mouse.click(box.x + 6.5 * 40, box.y + 5.5 * 40);
  await page.waitForFunction(() => {
    const state = JSON.parse(
      document.querySelector<HTMLElement>("[data-testid='domain-state']")?.textContent ?? "null",
    ) as DomainState | null;
    return state?.marker.position.x === 6 && state.marker.position.y === 5;
  });

  await page.getByTestId("save-probe").click();
  await expect(page.getByTestId("persistence-state")).toHaveText('{"ok":true,"value":"saved"}');

  await page.reload();
  await expect(page.getByTestId("renderer-probe-status")).toHaveText("phaser-probe-ready");
  expect(((await readDomainState(page)) as DomainState).marker.position).toEqual({ x: 1, y: 1 });

  await page.getByTestId("load-probe").click();
  await expect(page.getByTestId("persistence-state")).toHaveText('{"ok":true,"value":"loaded"}');
  await expect
    .poll(async () => ((await readDomainState(page)) as DomainState).marker.position)
    .toEqual({ x: 6, y: 5 });

  const restoredPixel = await readCanvasPixel(page, 6 * 40 + 20, 5 * 40 + 20);
  const defaultPixel = await readCanvasPixel(page, 1 * 40 + 20, 1 * 40 + 20);
  expect(restoredPixel).not.toEqual([31, 41, 55, 255]);
  expect(defaultPixel).toEqual([31, 41, 55, 255]);
});

test("corrupt save failure is visible without replacing authoritative state", async ({ page }) => {
  const before = await readDomainState(page);

  await page.getByTestId("seed-corrupt-save").click();
  await expect(page.getByTestId("persistence-state")).toHaveText(
    '{"ok":true,"value":"corrupt-seeded"}',
  );

  await page.getByTestId("load-probe").click();
  await expect(page.getByTestId("persistence-state")).toContainText('"kind":"corrupt-data"');

  const after = (await readDomainState(page)) as DomainState;
  const beforeState = before as DomainState;
  expect(after.probe.position).toEqual(beforeState.probe.position);
  expect(after.marker.position).toEqual(beforeState.marker.position);
  expect(after.tick).toBeGreaterThanOrEqual(beforeState.tick);
});

interface DomainState {
  readonly tick: number;
  readonly probe: { readonly position: { readonly x: number; readonly y: number } };
  readonly marker: { readonly position: { readonly x: number; readonly y: number } };
}

async function readDomainState(page: Page): Promise<unknown> {
  return readJson(page.getByTestId("domain-state"));
}

function readTick(value: unknown): number {
  return (value as { tick: number }).tick;
}

async function waitForTick(page: Page, minimumTick: number): Promise<void> {
  await page.waitForFunction((minimum) => {
    const state = JSON.parse(
      document.querySelector<HTMLElement>("[data-testid='domain-state']")?.textContent ?? "null",
    ) as { tick?: number } | null;
    return (state?.tick ?? -1) >= minimum;
  }, minimumTick);
}

async function readCanvasPixel(page: Page, x: number, y: number): Promise<number[]> {
  return page.locator("#renderer-probe canvas").evaluate(
    (canvas, point) => {
      const context = (canvas as HTMLCanvasElement).getContext("2d");
      if (!context) throw new Error("Expected Phaser 2D canvas context");
      return Array.from(context.getImageData(point.x, point.y, 1, 1).data);
    },
    { x, y },
  );
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
