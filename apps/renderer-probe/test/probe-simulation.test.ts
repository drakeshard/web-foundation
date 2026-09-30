import { describe, expect, it } from "vitest";
import type { ToyDomainCommand } from "../src/domain/index.ts";
import { createProbeSimulation } from "../src/simulation/probe-simulation.ts";

describe("Phaser probe fixed-step simulation", () => {
  it("produces the same domain and RNG state for equivalent render-frame schedules", () => {
    const regular = Array.from({ length: 10 }, () => 20);
    const irregular = [7, 33, 5, 15, 41, 9, 26, 14, 30, 20];

    expect(runScenario(regular)).toEqual(runScenario(irregular));
  });

  it("returns interpolation alpha without writing interpolated values into domain state", () => {
    const commands: ToyDomainCommand[][] = [[{ type: "move", dx: 1, dy: 0 }]];
    const simulation = createProbeSimulation({
      consumeCommands: () => commands.shift() ?? [],
      stepMs: 20,
      maxFrameDeltaMs: 100,
      maxStepsPerFrame: 4,
      seed: 7,
    });

    const first = simulation.advanceFrame(25);

    expect(first.steps).toBe(1);
    expect(first.alpha).toBe(0.25);
    expect(first.state.probe.previousPosition).toEqual({ x: 3, y: 3 });
    expect(first.state.probe.position).toEqual({ x: 4, y: 3 });
    expect(simulation.state.probe.position).toEqual({ x: 4, y: 3 });
  });

  it("resets accumulated time and discards the first frame delta after resume", () => {
    const simulation = createProbeSimulation({
      consumeCommands: () => [],
      stepMs: 20,
      maxFrameDeltaMs: 100,
      maxStepsPerFrame: 4,
    });

    expect(simulation.advanceFrame(15).alpha).toBe(0.75);

    simulation.pause();
    expect(simulation.advanceFrame(1000).steps).toBe(0);

    simulation.resume();
    expect(simulation.advanceFrame(1000)).toMatchObject({ steps: 0, alpha: 0 });
    expect(simulation.advanceFrame(20)).toMatchObject({ steps: 1, alpha: 0 });
  });
});

function runScenario(frameScheduleMs: readonly number[]) {
  let tick = 0;
  const simulation = createProbeSimulation({
    consumeCommands: () => commandsForTick(tick++),
    stepMs: 20,
    maxFrameDeltaMs: 100,
    maxStepsPerFrame: 5,
    seed: 0x1234_5678,
  });

  for (const frameDeltaMs of frameScheduleMs) {
    simulation.advanceFrame(frameDeltaMs);
  }

  return simulation.snapshot();
}

function commandsForTick(tick: number): readonly ToyDomainCommand[] {
  switch (tick) {
    case 0:
      return [{ type: "move", dx: 1, dy: 0 }];
    case 2:
    case 7:
      return [{ type: "randomize-marker" }];
    case 5:
      return [{ type: "move", dx: 0, dy: -1 }];
    default:
      return [];
  }
}
