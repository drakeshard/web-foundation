import { DeterministicRng } from "@drakeshard/foundation/random";
import { FixedStepDriver } from "@drakeshard/foundation/time";
import { describe, expect, it } from "vitest";
import {
  advanceToyDomain,
  createToyDomainState,
  restoreToyDomain,
  snapshotToyDomain,
  type ToyDomainCommand,
  type ToyDomainSnapshot,
} from "../src/domain/index.ts";

describe("renderer-probe toy domain", () => {
  it("applies fixture-local commands in order without mutating the input state", () => {
    const initial = createToyDomainState();
    const initialSnapshot = snapshotToyDomain(initial);
    const random = new DeterministicRng(0x1234_5678);

    const result = advanceToyDomain(
      initial,
      [
        { type: "move", dx: 1, dy: 0 },
        { type: "move", dx: 0, dy: -1 },
        { type: "set-marker", position: { x: 99, y: -5 } },
      ],
      random,
    );

    expect(snapshotToyDomain(initial)).toEqual(initialSnapshot);
    expect(result.state).toEqual({
      tick: 1,
      world: { width: 8, height: 8 },
      probe: {
        id: "probe",
        previousPosition: { x: 3, y: 3 },
        position: { x: 4, y: 2 },
      },
      marker: {
        position: { x: 7, y: 0 },
      },
    });
    expect(result.events).toEqual([
      {
        type: "probe-moved",
        from: { x: 3, y: 3 },
        to: { x: 4, y: 3 },
      },
      {
        type: "probe-moved",
        from: { x: 4, y: 3 },
        to: { x: 4, y: 2 },
      },
      {
        type: "marker-set",
        position: { x: 7, y: 0 },
        source: "command",
      },
    ]);
  });

  it("produces identical state and RNG continuation across render-frame schedules", () => {
    const evenFrames = Array.from({ length: 10 }, () => 10);
    const irregularFrames = [3, 7, 21, 4, 15, 8, 12, 19, 1, 10];

    const first = runDeterministicScenario(evenFrames);
    const second = runDeterministicScenario(irregularFrames);

    expect(first).toEqual(second);
    expect(first.snapshot.tick).toBe(10);
    expect(first.snapshot.probe.position).toEqual({ x: 4, y: 1 });
    expect(first.snapshot.marker.position.x).toBeGreaterThanOrEqual(0);
    expect(first.snapshot.marker.position.x).toBeLessThan(8);
    expect(first.snapshot.marker.position.y).toBeGreaterThanOrEqual(0);
    expect(first.snapshot.marker.position.y).toBeLessThan(8);
  });

  it("restores a detached authoritative snapshot with interpolation history reset", () => {
    const random = new DeterministicRng(7);
    const advanced = advanceToyDomain(
      createToyDomainState(),
      [{ type: "move", dx: 1, dy: 1 }],
      random,
    ).state;
    const snapshot = snapshotToyDomain(advanced);

    const restored = restoreToyDomain(snapshot);

    expect(snapshot).toEqual({
      tick: 1,
      world: { width: 8, height: 8 },
      probe: {
        id: "probe",
        position: { x: 4, y: 4 },
      },
      marker: {
        position: { x: 1, y: 1 },
      },
    });
    expect(restored).toEqual({
      tick: 1,
      world: { width: 8, height: 8 },
      probe: {
        id: "probe",
        previousPosition: { x: 4, y: 4 },
        position: { x: 4, y: 4 },
      },
      marker: {
        position: { x: 1, y: 1 },
      },
    });
    expect(restored).not.toBe(advanced);
    expect(restored.probe.position).not.toBe(snapshot.probe.position);
  });
});

function runDeterministicScenario(frameScheduleMs: readonly number[]): {
  readonly snapshot: ToyDomainSnapshot;
  readonly rngState: ReturnType<DeterministicRng["snapshot"]>;
} {
  const driver = new FixedStepDriver({
    stepMs: 10,
    maxFrameDeltaMs: 100,
    maxStepsPerFrame: 10,
  });
  const random = new DeterministicRng(0x89ab_cdef);
  let state = createToyDomainState();

  for (const elapsedMs of frameScheduleMs) {
    const advance = driver.advance(elapsedMs);

    expect(advance.clampedMs).toBe(0);
    expect(advance.droppedSteps).toBe(0);

    for (let step = 0; step < advance.steps; step += 1) {
      state = advanceToyDomain(state, commandsForTick(state.tick), random).state;
    }
  }

  return {
    snapshot: snapshotToyDomain(state),
    rngState: random.snapshot(),
  };
}

function commandsForTick(tick: number): readonly ToyDomainCommand[] {
  switch (tick) {
    case 0:
      return [{ type: "move", dx: 1, dy: 0 }];
    case 1:
      return [{ type: "randomize-marker" }];
    case 4:
      return [{ type: "move", dx: 0, dy: -1 }];
    case 6:
      return [{ type: "set-marker", position: { x: 2, y: 5 } }];
    case 7:
      return [
        { type: "move", dx: 0, dy: -1 },
        { type: "randomize-marker" },
      ];
    default:
      return [];
  }
}
