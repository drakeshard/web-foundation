import { describe, expect, it } from "vitest";

import { DeterministicRng, RNG_ALGORITHM_ID } from "../../foundation/src/random/index.ts";
import { FixedStepDriver } from "../../foundation/src/time/index.ts";
import { ManualClock } from "../src/clock/index.ts";

interface SimulationState {
  tick: number;
  position: number;
  velocity: number;
}

type Command =
  | { tick: number; type: "addVelocity"; value: number }
  | { tick: number; type: "scaleVelocity"; value: number };

interface SimulationResult {
  state: SimulationState;
  rngState: ReturnType<DeterministicRng["snapshot"]>;
}

const INITIAL_STATE: Readonly<SimulationState> = {
  tick: 0,
  position: 0,
  velocity: 0,
};

const COMMANDS: readonly Command[] = [
  { tick: 2, type: "addVelocity", value: 3 },
  { tick: 5, type: "scaleVelocity", value: 2 },
  { tick: 5, type: "addVelocity", value: -1 },
  { tick: 9, type: "addVelocity", value: -4 },
  { tick: 14, type: "scaleVelocity", value: -1 },
  { tick: 17, type: "addVelocity", value: 2 },
];

const EXPECTED_RESULT: SimulationResult = {
  state: {
    tick: 20,
    position: 33,
    velocity: -2,
  },
  rngState: {
    algorithm: RNG_ALGORITHM_ID,
    state: [1446924285, 3327320161, 1982298916, 602331132],
  },
};

describe("renderer-free deterministic simulation proof", () => {
  it("reproduces the exact final state for identical inputs", () => {
    const frameSchedule = Array.from({ length: 20 }, () => 10);

    const first = runSimulation(frameSchedule);
    const second = runSimulation(frameSchedule);

    expect(first).toEqual(EXPECTED_RESULT);
    expect(second).toEqual(EXPECTED_RESULT);
    expect(second).toEqual(first);
  });

  it("produces the same simulation result for a different render-frame schedule", () => {
    const evenlyChunked = Array.from({ length: 20 }, () => 10);
    const irregularlyChunked = [3, 7, 21, 4, 15, 8, 12, 19, 1, 10, 25, 5, 20, 10, 10, 10, 20];

    expect(sum(irregularlyChunked)).toBe(200);

    const first = runSimulation(evenlyChunked);
    const second = runSimulation(irregularlyChunked);

    expect(first).toEqual(EXPECTED_RESULT);
    expect(second).toEqual(EXPECTED_RESULT);
    expect(second).toEqual(first);
  });
});

function runSimulation(frameScheduleMs: readonly number[]): SimulationResult {
  const clock = new ManualClock();
  const driver = new FixedStepDriver({
    stepMs: 10,
    maxFrameDeltaMs: 100,
    maxStepsPerFrame: 10,
  });
  const rng = new DeterministicRng(0x1234_5678);
  const state: SimulationState = { ...INITIAL_STATE };

  let previousNowMs = clock.nowMs();

  for (const frameDeltaMs of frameScheduleMs) {
    const nowMs = clock.advanceBy(frameDeltaMs);
    const elapsedMs = nowMs - previousNowMs;
    previousNowMs = nowMs;

    const advance = driver.advance(elapsedMs);

    expect(advance.clampedMs).toBe(0);
    expect(advance.droppedSteps).toBe(0);

    for (let step = 0; step < advance.steps; step += 1) {
      simulateTick(state, rng, COMMANDS);
    }
  }

  return {
    state,
    rngState: rng.snapshot(),
  };
}

function simulateTick(
  state: SimulationState,
  rng: DeterministicRng,
  commands: readonly Command[],
): void {
  for (const command of commands) {
    if (command.tick !== state.tick) {
      continue;
    }

    if (command.type === "addVelocity") {
      state.velocity += command.value;
    } else {
      state.velocity *= command.value;
    }
  }

  state.velocity += (rng.nextUint32() & 1) === 0 ? -1 : 1;
  state.position += state.velocity;
  state.tick += 1;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
