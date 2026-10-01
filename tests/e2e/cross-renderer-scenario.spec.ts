import { expect, type Page, test } from "@playwright/test";

interface ScenarioPageResult {
  readonly renderer: "phaser" | "playcanvas";
  readonly cadence: "fine" | "coarse";
  readonly scenarioId: string;
  readonly seed: number;
  readonly tickCount: number;
  readonly finalDomain: unknown;
  readonly random: unknown;
  readonly checksum: string;
  readonly trace: readonly unknown[];
  readonly presentation: readonly unknown[];
}

test("both live renderer probes replay the same fixed-tick scenario across different cadences", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4174/");
  await expect(page.getByTestId("renderer-probe-status")).toHaveText("phaser-probe-ready");

  const firstPhaser = await runScenario(
    page,
    "run-cross-renderer-scenario",
    "cross-renderer-scenario-result",
  );
  const secondPhaser = await runScenario(
    page,
    "run-cross-renderer-scenario",
    "cross-renderer-scenario-result",
  );

  await page.goto("http://127.0.0.1:4174/playcanvas.html");
  await expect(page.getByTestId("playcanvas-probe-status")).toHaveText("playcanvas-probe-ready");

  const firstPlayCanvas = await runScenario(
    page,
    "playcanvas-run-cross-renderer-scenario",
    "playcanvas-cross-renderer-scenario-result",
  );
  const secondPlayCanvas = await runScenario(
    page,
    "playcanvas-run-cross-renderer-scenario",
    "playcanvas-cross-renderer-scenario-result",
  );

  expect(firstPhaser.renderer).toBe("phaser");
  expect(firstPlayCanvas.renderer).toBe("playcanvas");
  expect(firstPhaser.cadence).toBe("fine");
  expect(firstPlayCanvas.cadence).toBe("coarse");

  expect(authoritativeEvidence(firstPhaser), "Phaser repeated replay diverged").toEqual(
    authoritativeEvidence(secondPhaser),
  );
  expect(authoritativeEvidence(firstPlayCanvas), "PlayCanvas repeated replay diverged").toEqual(
    authoritativeEvidence(secondPlayCanvas),
  );
  expect(authoritativeEvidence(firstPhaser), "Renderer-independent replay diverged").toEqual(
    authoritativeEvidence(firstPlayCanvas),
  );

  expect(firstPhaser.finalDomain).toEqual({
    tick: 8,
    world: { width: 8, height: 8 },
    probe: { id: "probe", position: { x: 4, y: 3 } },
    marker: { position: { x: 3, y: 5 } },
  });
  expect(firstPhaser.checksum).toBe("a016a4a7");
  expect(firstPhaser.trace).toHaveLength(8);

  expect(firstPhaser.presentation).toHaveLength(2);
  expect(firstPlayCanvas.presentation).toHaveLength(2);
  expect(firstPhaser.presentation).not.toEqual(firstPlayCanvas.presentation);
});

async function runScenario(
  page: Page,
  buttonTestId: string,
  resultTestId: string,
): Promise<ScenarioPageResult> {
  await page.getByTestId(buttonTestId).click();
  return JSON.parse(await page.getByTestId(resultTestId).innerText()) as ScenarioPageResult;
}

function authoritativeEvidence(result: ScenarioPageResult) {
  return {
    scenarioId: result.scenarioId,
    seed: result.seed,
    tickCount: result.tickCount,
    finalDomain: result.finalDomain,
    random: result.random,
    checksum: result.checksum,
    trace: result.trace,
  };
}
