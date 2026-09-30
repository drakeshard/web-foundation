import { describe, expect, it } from "vitest";

import { FixedStepDriver } from "../src/time/index.ts";

describe("FixedStepDriver", () => {
  it("keeps a sub-step frame in the interpolation accumulator", () => {
    const driver = createDriver();

    expect(driver.advance(5)).toEqual({
      steps: 0,
      alpha: 0.25,
      clampedMs: 0,
      droppedSteps: 0,
      overrun: false,
    });
  });

  it("advances exactly one step at the fixed-step boundary", () => {
    const driver = createDriver();

    expect(driver.advance(20)).toEqual({
      steps: 1,
      alpha: 0,
      clampedMs: 0,
      droppedSteps: 0,
      overrun: false,
    });
  });

  it("advances multiple steps and retains only the fractional remainder", () => {
    const driver = new FixedStepDriver({
      stepMs: 10,
      maxFrameDeltaMs: 100,
      maxStepsPerFrame: 4,
    });

    expect(driver.advance(35)).toEqual({
      steps: 3,
      alpha: 0.5,
      clampedMs: 0,
      droppedSteps: 0,
      overrun: false,
    });
  });

  it("clamps a large frame stall before it enters the accumulator", () => {
    const driver = new FixedStepDriver({
      stepMs: 10,
      maxFrameDeltaMs: 25,
      maxStepsPerFrame: 3,
    });

    expect(driver.advance(100)).toEqual({
      steps: 2,
      alpha: 0.5,
      clampedMs: 75,
      droppedSteps: 0,
      overrun: false,
    });
  });

  it("drops complete catch-up steps after the per-frame step budget", () => {
    const driver = new FixedStepDriver({
      stepMs: 10,
      maxFrameDeltaMs: 100,
      maxStepsPerFrame: 2,
    });

    expect(driver.advance(35)).toEqual({
      steps: 2,
      alpha: 0.5,
      clampedMs: 0,
      droppedSteps: 1,
      overrun: true,
    });

    expect(driver.advance(5)).toEqual({
      steps: 1,
      alpha: 0,
      clampedMs: 0,
      droppedSteps: 0,
      overrun: false,
    });
  });

  it("reports clamping and catch-up overrun as separate conditions", () => {
    const driver = new FixedStepDriver({
      stepMs: 10,
      maxFrameDeltaMs: 60,
      maxStepsPerFrame: 3,
    });

    expect(driver.advance(95)).toEqual({
      steps: 3,
      alpha: 0,
      clampedMs: 35,
      droppedSteps: 3,
      overrun: true,
    });
  });

  it("keeps accumulated partial time across a zero-delta frame", () => {
    const driver = createDriver();

    driver.advance(5);

    expect(driver.advance(0)).toEqual({
      steps: 0,
      alpha: 0.25,
      clampedMs: 0,
      droppedSteps: 0,
      overrun: false,
    });
  });

  it("clears partial time before an application-owned pause/resume", () => {
    const driver = createDriver();

    expect(driver.advance(15).alpha).toBe(0.75);

    driver.reset();

    expect(driver.advance(0)).toEqual({
      steps: 0,
      alpha: 0,
      clampedMs: 0,
      droppedSteps: 0,
      overrun: false,
    });

    expect(driver.advance(20)).toEqual({
      steps: 1,
      alpha: 0,
      clampedMs: 0,
      droppedSteps: 0,
      overrun: false,
    });
  });

  it("keeps interpolation alpha within its documented boundary", () => {
    const driver = new FixedStepDriver({
      stepMs: 10,
      maxFrameDeltaMs: 100,
      maxStepsPerFrame: 4,
    });

    const results = [driver.advance(9.999), driver.advance(0), driver.advance(0.001)];

    expect(results[0]?.alpha).toBeCloseTo(0.9999, 10);
    expect(results[1]?.alpha).toBeCloseTo(0.9999, 10);
    expect(results[2]?.steps).toBe(1);
    expect(results[2]?.alpha).toBeCloseTo(0, 10);

    for (const result of results) {
      expect(result.alpha).toBeGreaterThanOrEqual(0);
      expect(result.alpha).toBeLessThan(1);
    }
  });

  it("produces identical results for identical ordered frame sequences", () => {
    const frameDeltas = [5, 15, 1.25, 38.75, 100, 0, 12.5, 7.5];
    const config = {
      stepMs: 10,
      maxFrameDeltaMs: 40,
      maxStepsPerFrame: 3,
    };

    const first = runSequence(new FixedStepDriver(config), frameDeltas);
    const second = runSequence(new FixedStepDriver(config), frameDeltas);

    expect(second).toEqual(first);
    expect(second.reduce((total, result) => total + result.steps, 0)).toBe(
      first.reduce((total, result) => total + result.steps, 0),
    );
  });

  it.each([
    ["stepMs", { stepMs: 0, maxFrameDeltaMs: 100, maxStepsPerFrame: 4 }],
    ["stepMs", { stepMs: -1, maxFrameDeltaMs: 100, maxStepsPerFrame: 4 }],
    ["stepMs", { stepMs: Number.NaN, maxFrameDeltaMs: 100, maxStepsPerFrame: 4 }],
    ["stepMs", { stepMs: Number.POSITIVE_INFINITY, maxFrameDeltaMs: 100, maxStepsPerFrame: 4 }],
    ["maxFrameDeltaMs", { stepMs: 20, maxFrameDeltaMs: 0, maxStepsPerFrame: 4 }],
    ["maxFrameDeltaMs", { stepMs: 20, maxFrameDeltaMs: -1, maxStepsPerFrame: 4 }],
    [
      "maxFrameDeltaMs",
      { stepMs: 20, maxFrameDeltaMs: Number.NaN, maxStepsPerFrame: 4 },
    ],
    [
      "maxFrameDeltaMs",
      { stepMs: 20, maxFrameDeltaMs: Number.POSITIVE_INFINITY, maxStepsPerFrame: 4 },
    ],
  ])("rejects invalid %s configuration", (_name, config) => {
    expect(() => new FixedStepDriver(config)).toThrow(RangeError);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid maxStepsPerFrame value %s",
    (maxStepsPerFrame) => {
      expect(
        () =>
          new FixedStepDriver({
            stepMs: 20,
            maxFrameDeltaMs: 100,
            maxStepsPerFrame,
          }),
      ).toThrow(RangeError);
    },
  );

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid frame delta %s",
    (frameDeltaMs) => {
      const driver = createDriver();

      expect(() => driver.advance(frameDeltaMs)).toThrow(RangeError);
    },
  );
});

function createDriver(): FixedStepDriver {
  return new FixedStepDriver({
    stepMs: 20,
    maxFrameDeltaMs: 100,
    maxStepsPerFrame: 4,
  });
}

function runSequence(driver: FixedStepDriver, frameDeltas: readonly number[]) {
  return frameDeltas.map((frameDeltaMs) => driver.advance(frameDeltaMs));
}
