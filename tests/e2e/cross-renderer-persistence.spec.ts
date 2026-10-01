import { expect, type Locator, type Page, test } from "@playwright/test";

interface SaveEnvelope {
  readonly gameId: string;
  readonly saveFormatVersion: number;
  readonly gameVersion: string;
  readonly contentVersion: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly payload: {
    readonly tick: number;
    readonly world: { readonly width: number; readonly height: number };
    readonly probe: {
      readonly id: string;
      readonly position: { readonly x: number; readonly y: number };
    };
    readonly marker: { readonly position: { readonly x: number; readonly y: number } };
  };
}

interface PersistenceResult<TValue> {
  readonly ok: boolean;
  readonly value?: TValue;
  readonly error?: {
    readonly kind: string;
    readonly operation: string;
  };
}

interface DomainSnapshot {
  readonly tick: number;
  readonly world: { readonly width: number; readonly height: number };
  readonly probe: {
    readonly id: string;
    readonly position: { readonly x: number; readonly y: number };
  };
  readonly marker: { readonly position: { readonly x: number; readonly y: number } };
}

const LEGACY_SNAPSHOT: DomainSnapshot = {
  tick: 7,
  world: { width: 8, height: 8 },
  probe: { id: "probe", position: { x: 4, y: 2 } },
  marker: { position: { x: 6, y: 5 } },
};

test("both probes persist the same renderer-neutral SaveEnvelope semantics", async ({ page }) => {
  await openPhaser(page);
  await page.getByTestId("save-probe").click();
  await expect(page.getByTestId("persistence-state")).toHaveText('{"ok":true,"value":"saved"}');

  const phaserEnvelope = requireEnvelope(
    await readJson<PersistenceResult<SaveEnvelope>>(page.getByTestId("persistence-envelope")),
  );

  await openPlayCanvas(page);
  await page.getByTestId("playcanvas-save").click();
  await expect(page.getByTestId("playcanvas-persistence-state")).toHaveText(
    '{"ok":true,"value":"saved"}',
  );

  const playCanvasEnvelope = requireEnvelope(
    await readJson<PersistenceResult<SaveEnvelope>>(
      page.getByTestId("playcanvas-persistence-envelope"),
    ),
  );

  expect(projectStableEnvelope(playCanvasEnvelope)).toEqual(projectStableEnvelope(phaserEnvelope));
  expect(phaserEnvelope.saveFormatVersion).toBe(2);
  expect(phaserEnvelope.gameId).toBe("drakeshard-renderer-probe");
  expect(phaserEnvelope.gameVersion).toBe("0.1.0");
  expect(phaserEnvelope.contentVersion).toBe("toy-domain-v1");
  expect(phaserEnvelope.createdAt).toBe(phaserEnvelope.updatedAt);
  expect(playCanvasEnvelope.createdAt).toBe(playCanvasEnvelope.updatedAt);
  expect(new Date(phaserEnvelope.createdAt).toISOString()).toBe(phaserEnvelope.createdAt);
  expect(new Date(playCanvasEnvelope.createdAt).toISOString()).toBe(playCanvasEnvelope.createdAt);

  expect(Object.keys(phaserEnvelope.payload).sort()).toEqual(["marker", "probe", "tick", "world"]);
  expect(Object.keys(playCanvasEnvelope.payload).sort()).toEqual(["marker", "probe", "tick", "world"]);
  expect(JSON.stringify(phaserEnvelope.payload)).not.toMatch(/phaser|playcanvas|camera|entity/i);
  expect(JSON.stringify(playCanvasEnvelope.payload)).not.toMatch(/phaser|playcanvas|camera|entity/i);
});

test("legacy save migration produces the same loaded snapshot and leaves the source envelope intact", async ({
  page,
}) => {
  await openPhaser(page);
  await page.getByTestId("seed-legacy-save").click();
  await expect(page.getByTestId("persistence-state")).toHaveText(
    '{"ok":true,"value":"legacy-seeded"}',
  );

  expect(
    requireEnvelope(
      await readJson<PersistenceResult<SaveEnvelope>>(page.getByTestId("persistence-envelope")),
    ).saveFormatVersion,
  ).toBe(1);

  await page.getByTestId("load-probe").click();
  await expect(page.getByTestId("persistence-state")).toHaveText('{"ok":true,"value":"loaded"}');

  const phaserLoaded = await readJson<DomainSnapshot>(page.getByTestId("loaded-domain-snapshot"));
  expect(phaserLoaded).toEqual(LEGACY_SNAPSHOT);
  expect(
    requireEnvelope(
      await readJson<PersistenceResult<SaveEnvelope>>(page.getByTestId("persistence-envelope")),
    ).saveFormatVersion,
  ).toBe(1);

  await openPlayCanvas(page);
  await page.getByTestId("playcanvas-load").click();
  await expect(page.getByTestId("playcanvas-persistence-state")).toHaveText(
    '{"ok":true,"value":"loaded"}',
  );

  const playCanvasLoaded = await readJson<DomainSnapshot>(
    page.getByTestId("playcanvas-loaded-domain-snapshot"),
  );
  expect(playCanvasLoaded).toEqual(phaserLoaded);
  expect(playCanvasLoaded).toEqual(LEGACY_SNAPSHOT);
  expect(
    requireEnvelope(
      await readJson<PersistenceResult<SaveEnvelope>>(
        page.getByTestId("playcanvas-persistence-envelope"),
      ),
    ).saveFormatVersion,
  ).toBe(1);
});

test("corrupt, unsupported, and application-invalid saves fail equivalently across probes", async ({
  page,
}) => {
  const fixtures = [
    {
      seed: "seed-corrupt-save",
      status: '{"ok":true,"value":"corrupt-seeded"}',
      failure: { kind: "corrupt-data", operation: "decode" },
    },
    {
      seed: "seed-unsupported-save",
      status: '{"ok":true,"value":"unsupported-seeded"}',
      failure: { kind: "unsupported-version", operation: "migrate" },
    },
    {
      seed: "seed-invalid-payload-save",
      status: '{"ok":true,"value":"invalid-payload-seeded"}',
      failure: { kind: "corrupt-data", operation: "decode" },
    },
  ] as const;

  for (const fixture of fixtures) {
    await openPhaser(page);
    const phaserBefore = await readDomainProjection(page.getByTestId("domain-state"));

    await page.getByTestId(fixture.seed).click();
    await expect(page.getByTestId("persistence-state")).toHaveText(fixture.status);
    await page.getByTestId("load-probe").click();
    await expect(page.getByTestId("persistence-state")).toContainText(
      `"kind":"${fixture.failure.kind}"`,
    );
    await expect(page.getByTestId("debug-last-persistence-failure")).toHaveText(
      JSON.stringify(fixture.failure),
    );
    expect(await readDomainProjection(page.getByTestId("domain-state"))).toEqual(phaserBefore);

    if (fixture.seed === "seed-invalid-payload-save") {
      const envelope = requireEnvelope(
        await readJson<PersistenceResult<SaveEnvelope>>(page.getByTestId("persistence-envelope")),
      );
      expect(envelope.saveFormatVersion).toBe(2);
      expect(envelope.payload.probe.position.x).toBe(99);
    }

    await openPlayCanvas(page);
    const playCanvasBefore = await readDomainProjection(
      page.getByTestId("playcanvas-domain-state"),
    );

    await page.getByTestId("playcanvas-load").click();
    await expect(page.getByTestId("playcanvas-persistence-state")).toContainText(
      `"kind":"${fixture.failure.kind}"`,
    );
    await expect(page.getByTestId("debug-last-persistence-failure")).toHaveText(
      JSON.stringify(fixture.failure),
    );
    expect(await readDomainProjection(page.getByTestId("playcanvas-domain-state"))).toEqual(
      playCanvasBefore,
    );
  }
});

function requireEnvelope(result: PersistenceResult<SaveEnvelope>): SaveEnvelope {
  expect(result.ok).toBe(true);
  expect(result.value).toBeDefined();
  if (!result.value) throw new Error("Expected persisted SaveEnvelope");
  return result.value;
}

function projectStableEnvelope(envelope: SaveEnvelope): object {
  return {
    gameId: envelope.gameId,
    saveFormatVersion: envelope.saveFormatVersion,
    gameVersion: envelope.gameVersion,
    contentVersion: envelope.contentVersion,
    payload: {
      world: envelope.payload.world,
      probe: envelope.payload.probe,
      marker: envelope.payload.marker,
    },
  };
}

async function openPhaser(page: Page): Promise<void> {
  await page.goto("http://127.0.0.1:4174/");
  await expect(page.getByTestId("renderer-probe-status")).toHaveText("phaser-probe-ready");
}

async function openPlayCanvas(page: Page): Promise<void> {
  await page.goto("http://127.0.0.1:4174/playcanvas.html");
  await expect(page.getByTestId("playcanvas-probe-status")).toHaveText("playcanvas-probe-ready");
}

async function readDomainProjection(locator: Locator): Promise<object> {
  const state = await readJson<DomainSnapshot>(locator);
  return {
    world: state.world,
    probe: state.probe,
    marker: state.marker,
  };
}

async function readJson<TValue>(locator: Locator): Promise<TValue> {
  return JSON.parse((await locator.textContent()) ?? "null") as TValue;
}
