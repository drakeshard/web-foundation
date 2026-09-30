import { expect, test } from "@playwright/test";

test("records Phaser toy-scenario Chromium performance observations", async ({ page }) => {
  await page.goto("http://127.0.0.1:4174");
  await expect(page.getByTestId("renderer-probe-status")).toHaveText("phaser-probe-ready");

  const observation = await page.evaluate(async () => {
    interface FrameState {
      readonly steps: number;
      readonly droppedSteps: number;
      readonly overrun: boolean;
      readonly simulationDurationMs: number | null;
    }

    interface Sample {
      readonly frameDeltaMs: number;
      readonly simulationDurationMs: number;
      readonly steps: number;
      readonly droppedSteps: number;
      readonly overrun: boolean;
    }

    const samples: Sample[] = [];
    let previous = performance.now();

    for (let index = 0; index < 120; index += 1) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame((now) => {
          const frameState = JSON.parse(
            document.querySelector<HTMLElement>("[data-testid='frame-state']")?.textContent ?? "null",
          ) as FrameState | null;

          samples.push({
            frameDeltaMs: now - previous,
            simulationDurationMs: frameState?.simulationDurationMs ?? 0,
            steps: frameState?.steps ?? 0,
            droppedSteps: frameState?.droppedSteps ?? 0,
            overrun: frameState?.overrun ?? false,
          });
          previous = now;
          resolve();
        });
      });
    }

    const frameDeltas = samples.map((sample) => sample.frameDeltaMs);
    const simulationDurations = samples.map((sample) => sample.simulationDurationMs);
    const canvas = document.querySelector<HTMLCanvasElement>("#renderer-probe canvas");

    return {
      scenario: "idle 8x8 toy domain; Phaser canvas + Preact UI + debug view; 120 requestAnimationFrame samples",
      sampleCount: samples.length,
      userAgent: navigator.userAgent,
      viewport: { width: innerWidth, height: innerHeight },
      devicePixelRatio,
      canvas: canvas ? { width: canvas.width, height: canvas.height } : null,
      frameDeltaMs: summarize(frameDeltas),
      simulationDurationMs: summarize(simulationDurations),
      simulationSteps: samples.reduce((sum, sample) => sum + sample.steps, 0),
      droppedSteps: samples.reduce((sum, sample) => sum + sample.droppedSteps, 0),
      overrunFrames: samples.filter((sample) => sample.overrun).length,
    };

    function summarize(values: readonly number[]) {
      const sorted = [...values].sort((left, right) => left - right);
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));

      return {
        mean: round(mean),
        p95: round(sorted[p95Index] ?? 0),
        max: round(sorted.at(-1) ?? 0),
      };
    }

    function round(value: number): number {
      return Math.round(value * 1000) / 1000;
    }
  });

  console.log(`PHASER_PERF_OBSERVATION ${JSON.stringify(observation)}`);

  expect(observation.sampleCount).toBe(120);
  expect(observation.canvas).toEqual({ width: 320, height: 320 });
  expect(observation.frameDeltaMs.mean).toBeGreaterThanOrEqual(0);
  expect(observation.simulationDurationMs.mean).toBeGreaterThanOrEqual(0);
  expect(observation.droppedSteps).toBeGreaterThanOrEqual(0);
  expect(observation.overrunFrames).toBeGreaterThanOrEqual(0);
});
