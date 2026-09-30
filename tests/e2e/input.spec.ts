import { expect, type Locator, type Page, test } from "@playwright/test";

interface PhysicalRecord {
  readonly kind: string;
  readonly sequence: number;
  readonly [key: string]: unknown;
}

interface TickSnapshot {
  readonly actions: readonly {
    readonly context: string;
    readonly action: string;
    readonly held: boolean;
    readonly pressed: boolean;
    readonly released: boolean;
  }[];
  readonly transitions: readonly {
    readonly context: string;
    readonly action: string;
    readonly sequence: number;
    readonly phase: "pressed" | "released";
  }[];
  readonly commands: readonly {
    readonly id: string;
    readonly sequence: number;
    readonly payload: unknown;
  }[];
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("lifecycle-state")).toHaveText("active");
});

test("real keyboard edges flow through mapping, contexts, and tick consumption", async ({
  page,
}) => {
  await page.keyboard.down("q");

  expect(await readPhysicalLog(page)).toEqual([
    { kind: "key", sequence: 0, code: "KeyQ", phase: "pressed" },
  ]);

  await page.getByTestId("activate-modal").click();
  await page.getByTestId("consume-tick").click();

  expect(await readTickSnapshot(page)).toEqual({
    actions: [
      {
        context: "modal",
        action: "action.primary",
        held: true,
        pressed: true,
        released: false,
      },
    ],
    transitions: [
      {
        context: "modal",
        action: "action.primary",
        sequence: 0,
        phase: "pressed",
      },
    ],
    commands: [],
  });

  await page.keyboard.up("q");
  await page.getByTestId("consume-tick").click();

  expect(await readTickSnapshot(page)).toEqual({
    actions: [
      {
        context: "modal",
        action: "action.primary",
        held: false,
        pressed: false,
        released: true,
      },
    ],
    transitions: [
      {
        context: "modal",
        action: "action.primary",
        sequence: 1,
        phase: "released",
      },
    ],
    commands: [],
  });
});

test("real pointer press plus browser pointercancel invalidates held state without release", async ({
  page,
}) => {
  const surface = page.getByTestId("input-surface");
  const center = await locatorCenter(surface);

  await page.mouse.move(center.x, center.y);
  await page.mouse.down({ button: "left" });

  const pressed = (await readPhysicalLog(page)).find(
    (event) => event.kind === "pointer-button" && event.phase === "pressed",
  );
  expect(pressed).toMatchObject({
    kind: "pointer-button",
    pointerType: "mouse",
    button: 0,
    phase: "pressed",
  });

  await surface.dispatchEvent("pointercancel", {
    pointerId: 1,
    pointerType: "mouse",
    button: -1,
    clientX: center.x,
    clientY: center.y,
  });
  await page.mouse.up({ button: "left" });

  const physical = await readPhysicalLog(page);
  expect(physical.at(-1)).toMatchObject({
    kind: "pointer-cancel",
  });
  expect(physical.at(-1)?.sequence).toBeGreaterThan(pressed?.sequence ?? -1);
  expect(
    physical.filter((event) => event.kind === "pointer-button" && event.phase === "released"),
  ).toEqual([]);

  await page.getByTestId("consume-tick").click();
  expect(await readTickSnapshot(page)).toEqual({
    actions: [
      {
        context: "gameplay",
        action: "action.pointer",
        held: false,
        pressed: true,
        released: false,
      },
    ],
    transitions: [
      {
        context: "gameplay",
        action: "action.pointer",
        sequence: pressed?.sequence,
        phase: "pressed",
      },
    ],
    commands: [],
  });
});

test("real browser wheel preserves normalized pixel delta sign and magnitude", async ({ page }) => {
  const surface = page.getByTestId("input-surface");
  const center = await locatorCenter(surface);

  await page.mouse.move(center.x, center.y);
  await page.mouse.wheel(7, -90);

  const physical = await readPhysicalLog(page);
  expect(physical.at(-1)).toMatchObject({
    kind: "wheel",
    deltaX: 7,
    deltaY: -90,
    deltaZ: 0,
    unit: "pixel",
  });
  expect(physical.map((event) => event.sequence)).toEqual(
    [...physical].map((event) => event.sequence).sort((left, right) => left - right),
  );
});

test("blur reset clears live input state and resumes without replay", async ({ page }) => {
  const surface = page.getByTestId("input-surface");
  const center = await locatorCenter(surface);

  await page.keyboard.down("q");
  await page.mouse.move(center.x, center.y);
  await page.mouse.down({ button: "left" });

  const beforeBlur = await readPhysicalLog(page);
  const keyPress = beforeBlur.find((event) => event.kind === "key" && event.phase === "pressed");
  const pointerPress = beforeBlur.find(
    (event) => event.kind === "pointer-button" && event.phase === "pressed",
  );

  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(page.getByTestId("lifecycle-state")).toHaveText("inactive");

  const suspended = await readPhysicalLog(page);
  expect(suspended.at(-1)).toMatchObject({
    kind: "reset",
    scope: "all",
    reason: "blur",
  });
  expect(suspended.at(-1)?.sequence).toBeGreaterThan(pointerPress?.sequence ?? -1);

  await page.keyboard.up("q");
  await page.mouse.up({ button: "left" });
  expect(await readPhysicalLog(page)).toHaveLength(suspended.length);

  await page.getByTestId("consume-tick").click();
  expect(await readTickSnapshot(page)).toEqual({
    actions: [
      {
        context: "gameplay",
        action: "action.primary",
        held: false,
        pressed: true,
        released: false,
      },
      {
        context: "gameplay",
        action: "action.pointer",
        held: false,
        pressed: true,
        released: false,
      },
    ],
    transitions: [
      {
        context: "gameplay",
        action: "action.primary",
        sequence: keyPress?.sequence,
        phase: "pressed",
      },
      {
        context: "gameplay",
        action: "action.pointer",
        sequence: pointerPress?.sequence,
        phase: "pressed",
      },
    ],
    commands: [],
  });
});

test("tick snapshots and commands expose stable plain data instead of DOM events", async ({
  page,
}) => {
  await page.keyboard.down("q");
  await page.getByTestId("enqueue-command").click();
  await page.getByTestId("consume-tick").click();

  const first = await readTickSnapshot(page);
  expect(first).toEqual({
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
        sequence: 0,
        phase: "pressed",
      },
    ],
    commands: [
      {
        id: "fixture.command",
        sequence: 1,
        payload: { source: "browser-fixture" },
      },
    ],
  });
  expect(JSON.stringify(first)).not.toContain("Event");

  await page.getByTestId("consume-tick").click();
  expect(await readTickSnapshot(page)).toEqual({
    actions: [
      {
        context: "gameplay",
        action: "action.primary",
        held: true,
        pressed: false,
        released: false,
      },
    ],
    transitions: [],
    commands: [],
  });

  await page.keyboard.up("q");
});

async function readPhysicalLog(page: Page): Promise<PhysicalRecord[]> {
  return readJson<PhysicalRecord[]>(page.getByTestId("physical-log"));
}

async function readTickSnapshot(page: Page): Promise<TickSnapshot | null> {
  return readJson<TickSnapshot | null>(page.getByTestId("tick-snapshot"));
}

async function readJson<TValue>(locator: Locator): Promise<TValue> {
  return JSON.parse((await locator.textContent()) ?? "null") as TValue;
}

async function locatorCenter(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();

  if (!box) {
    throw new Error("Expected input surface to have a browser bounding box");
  }

  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
}
