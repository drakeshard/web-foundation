import { describe, expect, it } from "vitest";
import { projectToyStateToPlayCanvas } from "../src/presentation/playcanvas-probe.ts";
import { projectToyPresentation } from "../src/presentation/toy-presentation.ts";
import {
  CROSS_RENDERER_FRAME_SCHEDULES,
  CROSS_RENDERER_SCENARIO,
  type CrossRendererScenarioResult,
  compareCrossRendererScenarioResults,
  runCrossRendererScenario,
} from "../src/scenario/cross-renderer-scenario.ts";

describe("cross-renderer canonical toy-domain scenario", () => {
  it("locks canonical inputs and deterministic output", () => {
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
    expect(result.trace).toHaveLength(8);
  });

  it("keeps fixed-tick replay identical across different presentation frame cadences", () => {
    const fine = runCrossRendererScenario({
      frameDeltasMs: CROSS_RENDERER_FRAME_SCHEDULES.fine,
    });
    const coarse = runCrossRendererScenario({
      frameDeltasMs: CROSS_RENDERER_FRAME_SCHEDULES.coarse,
    });

    expect(compareCrossRendererScenarioResults(fine, coarse)).toEqual({ ok: true });
    expect(fine.trace.map((entry) => entry.random)).toEqual(
      coarse.trace.map((entry) => entry.random),
    );
    expect(fine.trace.map((entry) => entry.checksum)).toEqual(
      coarse.trace.map((entry) => entry.checksum),
    );
  });

  it("produces identical repeated runs for each cadence", () => {
    const firstFine = runCrossRendererScenario({
      frameDeltasMs: CROSS_RENDERER_FRAME_SCHEDULES.fine,
    });
    const secondFine = runCrossRendererScenario({
      frameDeltasMs: CROSS_RENDERER_FRAME_SCHEDULES.fine,
    });
    const firstCoarse = runCrossRendererScenario({
      frameDeltasMs: CROSS_RENDERER_FRAME_SCHEDULES.coarse,
    });
    const secondCoarse = runCrossRendererScenario({
      frameDeltasMs: CROSS_RENDERER_FRAME_SCHEDULES.coarse,
    });

    expect(compareCrossRendererScenarioResults(firstFine, secondFine)).toEqual({ ok: true });
    expect(compareCrossRendererScenarioResults(firstCoarse, secondCoarse)).toEqual({ ok: true });
  });

  it("reports the first divergent tick and command list", () => {
    const reference = runCrossRendererScenario();
    const candidate = {
      ...reference,
      trace: reference.trace.map((entry, index) =>
        index === 2
          ? {
              ...entry,
              commands: [{ type: "move", dx: 2, dy: 0 } as const],
            }
          : entry,
      ),
    } satisfies CrossRendererScenarioResult;

    expect(compareCrossRendererScenarioResults(reference, candidate)).toEqual({
      ok: false,
      divergence: {
        kind: "commands",
        tickIndex: 2,
        domainTick: 3,
        expectedCommands: [
          { type: "move", dx: 0, dy: -1 },
          { type: "set-marker", position: { x: 6, y: 5 } },
        ],
        actualCommands: [{ type: "move", dx: 2, dy: 0 }],
        expectedChecksum: reference.trace[2]?.checksum ?? null,
        actualChecksum: reference.trace[2]?.checksum ?? null,
        message: "Replay command divergence at tick index 2 (domain tick 3)",
      },
    });
  });

  it("keeps renderer-only projection outside authoritative replay evidence", () => {
    const result = runCrossRendererScenario();
    const domainBeforeProjection = JSON.stringify(result.finalDomain);

    const phaserPresentation = projectToyPresentation(result.finalState, 1);
    const playCanvasPresentation = projectToyStateToPlayCanvas(result.finalState, 1);

    expect(phaserPresentation.map((view) => view.viewId)).toEqual(["probe:probe", "marker"]);
    expect(playCanvasPresentation.map((view) => view.viewId)).toEqual(["probe:probe", "marker"]);
    expect(phaserPresentation).not.toEqual(playCanvasPresentation);
    expect(JSON.stringify(result.finalDomain)).toBe(domainBeforeProjection);
    expect(CROSS_RENDERER_SCENARIO).not.toHaveProperty("renderer");
  });
});
