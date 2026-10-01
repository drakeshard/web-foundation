import { expect, test } from "@playwright/test";

test("records PlayCanvas toy-scenario Chromium performance observations", async ({ page }) => {
  await page.goto("http://127.0.0.1:4174/playcanvas.html");
  await expect(page.getByTestId("playcanvas-probe-status")).toHaveText("playcanvas-probe-ready");

  const canvas = page.locator("#playcanvas-probe canvas");
  await expect(canvas).toHaveAttribute("width", "640");
  await expect(canvas).toHaveAttribute("height", "480");

  const advance = page.getByTestId("playcanvas-elevation-demo-advance");
  await advance.click();
  await advance.click();
  await advance.click();

  await expect(page.getByTestId("playcanvas-elevation-demo-state")).toHaveText(
    '{"tick":3,"position":{"x":4,"y":3},"elevation":1}',
  );
  await expect(page.getByTestId("playcanvas-presentation-sync")).toContainText('"updated":2');

  const observation = await page.evaluate(async () => {
    interface DomainState {
      readonly world: {
        readonly width: number;
        readonly height: number;
      };
    }

    interface PresentationSync {
      readonly created: number;
      readonly updated: number;
      readonly destroyed: number;
      readonly viewIds: readonly string[];
    }

    const canvas = document.querySelector<HTMLCanvasElement>("#playcanvas-probe canvas");
    const advance = document.querySelector<HTMLButtonElement>(
      "[data-testid='playcanvas-elevation-demo-advance']",
    );
    const domainState = JSON.parse(
      document.querySelector<HTMLElement>("[data-testid='playcanvas-domain-state']")?.textContent ??
        "null",
    ) as DomainState | null;
    const presentationSyncElement = document.querySelector<HTMLElement>(
      "[data-testid='playcanvas-presentation-sync']",
    );
    const presentationSync = JSON.parse(presentationSyncElement?.textContent ?? "null") as
      | PresentationSync
      | null;

    if (!canvas || !advance || !domainState || !presentationSyncElement || !presentationSync) {
      throw new Error("PlayCanvas performance probe state is unavailable");
    }

    const gl = canvas.getContext("webgl2");
    if (!gl) {
      throw new Error("PlayCanvas performance probe requires WebGL2");
    }

    const interactionDurations: number[] = [];
    let presentationCreated = 0;
    let presentationDestroyed = 0;

    for (let index = 0; index < 32; index += 1) {
      const startedAt = performance.now();
      advance.click();
      interactionDurations.push(performance.now() - startedAt);

      const sync = JSON.parse(presentationSyncElement.textContent ?? "null") as PresentationSync;
      presentationCreated += sync.created;
      presentationDestroyed += sync.destroyed;
    }

    const frameDeltas: number[] = [];
    let previousFrame = performance.now();

    for (let index = 0; index < 120; index += 1) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame((now) => {
          frameDeltas.push(now - previousFrame);
          previousFrame = now;
          resolve();
        });
      });
    }

    const terrainCellCount = domainState.world.width * domainState.world.height;
    const presentationViewCount = presentationSync.viewIds.length;

    return {
      scenario:
        "8x8 toy terrain; 64 terrain cells + two projected views; tactical orthographic PlayCanvas scene; 32 elevation input-domain-presentation interactions; 120 requestAnimationFrame samples",
      sampleCount: frameDeltas.length,
      interactionCount: interactionDurations.length,
      scene: {
        terrainCellCount,
        presentationViewCount,
        applicationEntityCount: terrainCellCount + presentationViewCount + 4,
      },
      presentationChurn: {
        created: presentationCreated,
        destroyed: presentationDestroyed,
      },
      userAgent: navigator.userAgent,
      viewport: { width: innerWidth, height: innerHeight },
      devicePixelRatio,
      canvas: { width: canvas.width, height: canvas.height },
      webgl: {
        version: String(gl.getParameter(gl.VERSION)),
        vendor: String(gl.getParameter(gl.VENDOR)),
        renderer: String(gl.getParameter(gl.RENDERER)),
        shadingLanguageVersion: String(gl.getParameter(gl.SHADING_LANGUAGE_VERSION)),
      },
      frameDeltaMs: summarize(frameDeltas),
      interactionDurationMs: summarize(interactionDurations),
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

  console.log(`PLAYCANVAS_PERF_OBSERVATION ${JSON.stringify(observation)}`);

  expect(observation.sampleCount).toBe(120);
  expect(observation.interactionCount).toBe(32);
  expect(observation.scene).toEqual({
    terrainCellCount: 64,
    presentationViewCount: 2,
    applicationEntityCount: 70,
  });
  expect(observation.presentationChurn).toEqual({ created: 0, destroyed: 0 });
  expect(observation.canvas).toEqual({ width: 640, height: 480 });
  expect(observation.webgl.version).toContain("WebGL 2");
  expect(observation.frameDeltaMs.mean).toBeGreaterThanOrEqual(0);
  expect(observation.interactionDurationMs.mean).toBeGreaterThanOrEqual(0);
});
