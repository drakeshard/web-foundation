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

  await page.waitForFunction(
    (initialMarker) => {
      const state = JSON.parse(
        document.querySelector<HTMLElement>("[data-testid='domain-state']")?.textContent ?? "null",
      ) as { marker?: { position?: { x?: number; y?: number } } } | null;
      const marker = state?.marker?.position;
      return marker !== undefined && (marker.x !== initialMarker.x || marker.y !== initialMarker.y);
    },
    before.marker.position,
  );

  const after = (await readDomainState(page)) as DomainState;
  expect(after.marker.position).not.toEqual(before.marker.position);
  await expect(page.getByTestId("ui-domain-summary")).toContainText(
    `marker (${after.marker.position.x}, ${after.marker.position.y})`,
  );
});

interface DomainState {
  readonly tick: number;
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
