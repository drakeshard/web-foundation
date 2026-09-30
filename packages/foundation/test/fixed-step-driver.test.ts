import { describe, expect, it } from "vitest";

import { FixedStepDriver } from "../src/time/index.ts";

describe("FixedStepDriver", () => {
  it("accumulates frame time and returns fixed steps with interpolation alpha", () => {
    const driver = new FixedStepDriver({
      stepMs: 20,
      maxFrameDeltaMs: 100,
      maxStepsPerFrame: 4,
    });

    expect(driver.advance(5)).toEqual({
      steps: 0,
      alpha: 0.25,
      clampedMs: 0,
      droppedSteps: 0,
      overrun: false,
    });

    expect(driver.advance(15)).toEqual({
      steps: 1,
      alpha: 0,
      clampedMs: 0,
      droppedSteps: 0,
      overrun: false,
    });
  });

  it("resets accumulated partial time", () => {
    const driver = new FixedStepDriver({
      stepMs: 20,
      maxFrameDeltaMs: 100,
      maxStepsPerFrame: 4,
    });

    driver.advance(15);
    driver.reset();

    expect(driver.advance(5)).toEqual({
      steps: 0,
      alpha: 0.25,
      clampedMs: 0,
      droppedSteps: 0,
      overrun: false,
    });
  });

  it("rejects invalid configuration and frame deltas", () => {
    expect(
      () =>
        new FixedStepDriver({
          stepMs: 0,
          maxFrameDeltaMs: 100,
          maxStepsPerFrame: 4,
        }),
    ).toThrow(RangeError);

    const driver = new FixedStepDriver({
      stepMs: 20,
      maxFrameDeltaMs: 100,
      maxStepsPerFrame: 4,
    });

    expect(() => driver.advance(-1)).toThrow(RangeError);
  });
});
