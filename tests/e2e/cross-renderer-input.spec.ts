import { expect, type Page, test } from "@playwright/test";

interface ToyDomainCommand {
  readonly type: string;
  readonly dx?: number;
  readonly dy?: number;
  readonly position?: { readonly x: number; readonly y: number };
}

test("keyboard mapping and input-context ownership match across renderer probes", async ({
  page,
}) => {
  await openPhaser(page);

  await expect(page.getByTestId("input-contexts")).toHaveText('["gameplay"]');
  await dispatchKey(page, "keydown", "KeyD");
  await expect
    .poll(async () => firstRecordedCommand(page, "input-command-history"))
    .toEqual({ type: "move", dx: 1, dy: 0 });
  await dispatchKey(page, "keyup", "KeyD");

  const phaserCommand = await firstRecordedCommand(page, "input-command-history");

  await openPlayCanvas(page);

  await expect(page.getByTestId("playcanvas-input-contexts")).toHaveText('["gameplay"]');
  await dispatchKey(page, "keydown", "KeyD");
  await page.getByTestId("playcanvas-input-tick").click();
  await dispatchKey(page, "keyup", "KeyD");

  const playCanvasCommand = await firstRecordedCommand(page, "playcanvas-input-command-history");
  expect(playCanvasCommand).toEqual(phaserCommand);

  await page.getByTestId("activate-modal").click();
  await expect(page.getByTestId("playcanvas-input-contexts")).toHaveText('["modal","gameplay"]');

  await openPhaser(page);
  await page.getByTestId("activate-modal").click();
  await expect(page.getByTestId("input-contexts")).toHaveText('["modal","gameplay"]');
});

test("renderer-local pointer conversion converges on the same ToyDomain command and result", async ({
  page,
}) => {
  await openPlayCanvas(page);

  const playCanvas = page.locator("#playcanvas-probe canvas");
  await playCanvas.click({ position: { x: 420, y: 300 } });
  await page.getByTestId("playcanvas-input-tick").click();

  const playCanvasCommand = await firstRecordedCommand(page, "playcanvas-input-command-history");
  expect(playCanvasCommand?.type).toBe("set-marker");
  expect(playCanvasCommand?.position).toBeDefined();

  const target = playCanvasCommand?.position;
  if (!target) throw new Error("Expected PlayCanvas pointer conversion to produce a world point");

  await expect.poll(async () => readMarker(page, "playcanvas-domain-state")).toEqual(target);

  await openPhaser(page);
  const phaser = page.locator("#renderer-probe canvas");
  const box = await phaser.boundingBox();
  if (!box) throw new Error("Expected Phaser canvas bounds");

  await page.mouse.click(box.x + (target.x + 0.5) * 40, box.y + (target.y + 0.5) * 40);

  await expect
    .poll(async () => firstRecordedCommand(page, "input-command-history"))
    .toEqual(playCanvasCommand);
  await expect.poll(async () => readMarker(page, "domain-state")).toEqual(target);
});

test("modal ownership and blur reset prevent divergent held movement", async ({ page }) => {
  await openPhaser(page);
  await page.getByTestId("activate-modal").click();
  await dispatchKey(page, "keydown", "KeyD");
  await page.waitForTimeout(150);
  await dispatchKey(page, "keyup", "KeyD");

  expect(await readCommandHistory(page, "input-command-history")).toEqual([]);
  expect(await readProbePosition(page, "domain-state")).toEqual({ x: 3, y: 3 });

  await openPlayCanvas(page);
  await page.getByTestId("activate-modal").click();
  await dispatchKey(page, "keydown", "KeyD");
  await page.getByTestId("playcanvas-input-tick").click();
  await dispatchKey(page, "keyup", "KeyD");

  expect(await readCommandHistory(page, "playcanvas-input-command-history")).toEqual([]);
  expect(await readProbePosition(page, "playcanvas-domain-state")).toEqual({ x: 3, y: 3 });

  await openPhaser(page);
  await dispatchKeyAndBlur(page, "KeyD");
  await page.waitForTimeout(150);

  expect(await readCommandHistory(page, "input-command-history")).toEqual([]);
  expect(await readProbePosition(page, "domain-state")).toEqual({ x: 3, y: 3 });

  await openPlayCanvas(page);
  await dispatchKeyAndBlur(page, "KeyD");
  await page.getByTestId("playcanvas-input-tick").click();

  expect(await readCommandHistory(page, "playcanvas-input-command-history")).toEqual([]);
  expect(await readProbePosition(page, "playcanvas-domain-state")).toEqual({ x: 3, y: 3 });
});

async function openPhaser(page: Page): Promise<void> {
  await page.goto("http://127.0.0.1:4174/");
  await expect(page.getByTestId("renderer-probe-status")).toHaveText("phaser-probe-ready");
}

async function openPlayCanvas(page: Page): Promise<void> {
  await page.goto("http://127.0.0.1:4174/playcanvas.html");
  await expect(page.getByTestId("playcanvas-probe-status")).toHaveText("playcanvas-probe-ready");
}

async function dispatchKey(page: Page, phase: "keydown" | "keyup", code: string): Promise<void> {
  await page.evaluate(
    ({ eventPhase, eventCode }) => {
      window.dispatchEvent(
        new KeyboardEvent(eventPhase, {
          code: eventCode,
          bubbles: true,
        }),
      );
    },
    { eventPhase: phase, eventCode: code },
  );
}

async function dispatchKeyAndBlur(page: Page, code: string): Promise<void> {
  await page.evaluate((eventCode) => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: eventCode, bubbles: true }));
    window.dispatchEvent(new Event("blur"));
  }, code);
}

async function firstRecordedCommand(
  page: Page,
  testId: string,
): Promise<ToyDomainCommand | undefined> {
  return (await readCommandHistory(page, testId))[0]?.[0];
}

async function readCommandHistory(
  page: Page,
  testId: string,
): Promise<readonly (readonly ToyDomainCommand[])[]> {
  return JSON.parse(
    (await page.getByTestId(testId).textContent()) ?? "[]",
  ) as readonly (readonly ToyDomainCommand[])[];
}

async function readMarker(
  page: Page,
  testId: string,
): Promise<{ readonly x: number; readonly y: number }> {
  const state = JSON.parse((await page.getByTestId(testId).textContent()) ?? "null") as {
    marker: { position: { x: number; y: number } };
  };
  return state.marker.position;
}

async function readProbePosition(
  page: Page,
  testId: string,
): Promise<{ readonly x: number; readonly y: number }> {
  const state = JSON.parse((await page.getByTestId(testId).textContent()) ?? "null") as {
    probe: { position: { x: number; y: number } };
  };
  return state.probe.position;
}
