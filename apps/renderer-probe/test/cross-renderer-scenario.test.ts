import { describe, expect, it } from "vitest";
import { projectToyStateToPlayCanvas } from "../src/presentation/playcanvas-probe.ts";
import { projectToyPresentation } from "../src/presentation/toy-presentation.ts";
import {
  CROSS_RENDERER_SCENARIO,
  runCrossRendererScenario,
} from "../src/scenario/cross-renderer-scenario.ts";

describe("cross-renderer canonical toy-domain scenario", () => {
  it("locks one initial state, seed, command sequence, tick count, and deterministic result", () => {
    const result = runCrossRendererScenario();

    expect(CROSS_RENDERER_SCENARIO.initialDomain).toEqual({
      tick: 0,
      world: { width: 8, height: 8 },
      probe: { id: "probe", position: { x: 3, y: 3 } },
      marker: { position: { x: 1, y: 1 } },
    });
    expect(CROSS_RENDERER_SCENARIO.commandsByTick).toHaveLength(8);
    expect(result).toMatchObject({
      scenarioId: "s07-cross-renderer-v1",
      seed: 0x0701_cafe,
      tickCount: 8,
      finalDomain: {
        tick: 8,
        world: { width: 8, height: 8 },
        probe: { id: "probe", position: { x: 4, y: 3 } },
        marker: { position: { x: 3, y: 5 } },
      },
      random: {
        algorithm: "xoshiro128starstar-v1",
        state: [653116501, 1255092782, 2110617100, 3595439280],
      },
      checksum: "a016a4a7",
    });
  });

  it("produces identical deterministic output across repeated executions", () => {
    expect(runCrossRendererScenario()).toEqual(runCrossRendererScenario());
  });

  it("keeps renderer-only projection outside canonical scenario data", () => {
    const result = runCrossRendererScenario();
    const domainBeforeProjection = JSON.stringify(result.finalDomain);

    const phaserPresentation = projectToyPresentation(result.finalState, 1);
    const playCanvasPresentation = projectToyStateToPlayCanvas(result.finalState, 1);

    expect(phaserPresentation.map((view) => view.viewId)).toEqual(["probe:probe", "marker"]);
    expect(playCanvasPresentation.map((view) => view.viewId)).toEqual(["probe:probe", "marker"]);
    expect(JSON.stringify(result.finalDomain)).toBe(domainBeforeProjection);
    expect(CROSS_RENDERER_SCENARIO).not.toHaveProperty("renderer");
  });
});
