import { expect, type Locator, type Page, test } from "@playwright/test";

interface DomainState {
  readonly tick: number;
  readonly world: { readonly width: number; readonly height: number };
  readonly probe: {
    readonly id: string;
    readonly position: { readonly x: number; readonly y: number };
  };
  readonly marker: { readonly position: { readonly x: number; readonly y: number } };
}

test("visibility reset clears held input and Phaser resume does not continue stale movement", async ({
  page,
}) => {
  await openPhaser(page);

  await page.keyboard.down("d");
  await expect
    .poll(async () => (await readDomain(page.getByTestId("domain-state"))).probe.position.x)
    .toBeGreaterThan(3);

  await setVisibility(page, "hidden");
  await page.keyboard.up("d");
  const hiddenProjection = projectDomain(await readDomain(page.getByTestId("domain-state")));

  await setVisibility(page, "visible");
  await page.waitForTimeout(180);

  expect(projectDomain(await readDomain(page.getByTestId("domain-state")))).toEqual(
    hiddenProjection,
  );
  await expect(page.getByTestId("frame-state")).toContainText('"overrun":false');
});

test("visibility reset clears held input before the next PlayCanvas input tick", async ({
  page,
}) => {
  await openPlayCanvas(page);

  await page.keyboard.down("d");
  await setVisibility(page, "hidden");
  await page.keyboard.up("d");
  await setVisibility(page, "visible");

  await page.getByTestId("playcanvas-input-tick").click();

  expect(projectDomain(await readDomain(page.getByTestId("playcanvas-domain-state")))).toEqual({
    world: { width: 8, height: 8 },
    probe: { id: "probe", position: { x: 3, y: 3 } },
    marker: { position: { x: 1, y: 1 } },
  });
});

test("renderer teardown and reinitialization preserve authoritative domain projections", async ({
  page,
}) => {
  await openPhaser(page);
  await page.keyboard.down("d");
  await expect
    .poll(async () => (await readDomain(page.getByTestId("domain-state"))).probe.position.x)
    .toBeGreaterThan(3);
  await page.keyboard.up("d");

  const phaserBefore = projectDomain(await readDomain(page.getByTestId("domain-state")));
  await page.getByTestId("renderer-reinit").click();
  await expect(page.getByTestId("renderer-probe-status")).toHaveText("phaser-probe-ready");
  await expect(page.getByTestId("renderer-reinit-count")).toHaveText("1");
  await expect(page.locator("#renderer-probe canvas")).toHaveCount(1);
  expect(projectDomain(await readDomain(page.getByTestId("domain-state")))).toEqual(phaserBefore);

  await openPlayCanvas(page);
  await page.getByTestId("playcanvas-elevation-demo-advance").click();
  const playCanvasBefore = projectDomain(
    await readDomain(page.getByTestId("playcanvas-domain-state")),
  );

  await page.getByTestId("playcanvas-renderer-reinit").click();
  await expect(page.getByTestId("playcanvas-probe-status")).toHaveText("playcanvas-probe-ready");
  await expect(page.getByTestId("playcanvas-renderer-reinit-count")).toHaveText("1");
  await expect(page.locator("#playcanvas-probe canvas")).toHaveCount(1);
  expect(projectDomain(await readDomain(page.getByTestId("playcanvas-domain-state")))).toEqual(
    playCanvasBefore,
  );
  await expect(page.getByTestId("playcanvas-presentation-sync")).toHaveText(
    '{"created":2,"updated":0,"destroyed":0,"viewIds":["probe:probe","marker"]}',
  );
});

test("reload plus persistence restoration yields the same renderer-neutral domain snapshot", async ({
  page,
}) => {
  await openPhaser(page);
  await page.keyboard.down("d");
  await expect
    .poll(async () => (await readDomain(page.getByTestId("domain-state"))).probe.position.x)
    .toBeGreaterThan(3);
  await page.keyboard.up("d");

  await page.getByTestId("save-probe").click();
  await expect(page.getByTestId("persistence-state")).toHaveText('{"ok":true,"value":"saved"}');
  const savedEnvelope = await readJson<{
    readonly ok: true;
    readonly value: { readonly payload: DomainState };
  }>(page.getByTestId("persistence-envelope"));
  const saved = savedEnvelope.value.payload;

  await page.reload();
  await expect(page.getByTestId("renderer-probe-status")).toHaveText("phaser-probe-ready");
  await page.getByTestId("load-probe").click();
  await expect(page.getByTestId("persistence-state")).toHaveText('{"ok":true,"value":"loaded"}');
  expect(await readDomain(page.getByTestId("loaded-domain-snapshot"))).toEqual(saved);

  await openPlayCanvas(page);
  await page.reload();
  await expect(page.getByTestId("playcanvas-probe-status")).toHaveText("playcanvas-probe-ready");
  await page.getByTestId("playcanvas-load").click();
  await expect(page.getByTestId("playcanvas-persistence-state")).toHaveText(
    '{"ok":true,"value":"loaded"}',
  );
  expect(await readDomain(page.getByTestId("playcanvas-loaded-domain-snapshot"))).toEqual(saved);
});

async function openPhaser(page: Page): Promise<void> {
  await page.goto("http://127.0.0.1:4174/");
  await expect(page.getByTestId("renderer-probe-status")).toHaveText("phaser-probe-ready");
}

async function openPlayCanvas(page: Page): Promise<void> {
  await page.goto("http://127.0.0.1:4174/playcanvas.html");
  await expect(page.getByTestId("playcanvas-probe-status")).toHaveText("playcanvas-probe-ready");
}

async function setVisibility(page: Page, state: "hidden" | "visible"): Promise<void> {
  await page.evaluate((visibilityState) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: visibilityState,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, state);
}

async function readDomain(locator: Locator): Promise<DomainState> {
  return readJson<DomainState>(locator);
}

function projectDomain(state: DomainState): object {
  return {
    world: state.world,
    probe: {
      id: state.probe.id,
      position: state.probe.position,
    },
    marker: state.marker,
  };
}

async function readJson<TValue>(locator: Locator): Promise<TValue> {
  return JSON.parse((await locator.textContent()) ?? "null") as TValue;
}
