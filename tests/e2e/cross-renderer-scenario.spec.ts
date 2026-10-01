import { expect, test } from "@playwright/test";

interface ScenarioPageResult {
  readonly renderer: "phaser" | "playcanvas";
  readonly scenarioId: string;
  readonly seed: number;
  readonly tickCount: number;
  readonly finalDomain: unknown;
  readonly random: unknown;
  readonly checksum: string;
  readonly presentation: readonly unknown[];
}

test("both live renderer probes execute the same canonical toy-domain scenario", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4174/");
  await expect(page.getByTestId("renderer-probe-status")).toHaveText("phaser-probe-ready");
  await page.getByTestId("run-cross-renderer-scenario").click();
  const phaser = JSON.parse(
    await page.getByTestId("cross-renderer-scenario-result").innerText(),
  ) as ScenarioPageResult;

  await page.goto("http://127.0.0.1:4174/playcanvas.html");
  await expect(page.getByTestId("playcanvas-probe-status")).toHaveText("playcanvas-probe-ready");
  await page.getByTestId("playcanvas-run-cross-renderer-scenario").click();
  const playCanvas = JSON.parse(
    await page.getByTestId("playcanvas-cross-renderer-scenario-result").innerText(),
  ) as ScenarioPageResult;

  expect(phaser.renderer).toBe("phaser");
  expect(playCanvas.renderer).toBe("playcanvas");

  expect({
    scenarioId: phaser.scenarioId,
    seed: phaser.seed,
    tickCount: phaser.tickCount,
    finalDomain: phaser.finalDomain,
    random: phaser.random,
    checksum: phaser.checksum,
  }).toEqual({
    scenarioId: playCanvas.scenarioId,
    seed: playCanvas.seed,
    tickCount: playCanvas.tickCount,
    finalDomain: playCanvas.finalDomain,
    random: playCanvas.random,
    checksum: playCanvas.checksum,
  });

  expect(phaser.finalDomain).toEqual({
    tick: 8,
    world: { width: 8, height: 8 },
    probe: { id: "probe", position: { x: 4, y: 3 } },
    marker: { position: { x: 3, y: 5 } },
  });
  expect(phaser.checksum).toBe("a016a4a7");
  expect(phaser.presentation).toHaveLength(2);
  expect(playCanvas.presentation).toHaveLength(2);
});
