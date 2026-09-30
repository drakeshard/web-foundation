import { describe, expect, it } from "vitest";

import { ManualClock } from "../src/clock/index.ts";

describe("ManualClock", () => {
  it("starts at zero by default", () => {
    expect(new ManualClock().nowMs()).toBe(0);
  });

  it("starts at an explicit non-negative time", () => {
    expect(new ManualClock(125.5).nowMs()).toBe(125.5);
  });

  it("advances only when instructed", () => {
    const clock = new ManualClock(10);

    expect(clock.nowMs()).toBe(10);
    expect(clock.advanceBy(5.25)).toBe(15.25);
    expect(clock.nowMs()).toBe(15.25);
    expect(clock.advanceBy(0)).toBe(15.25);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid initial time %s",
    (initialNowMs) => {
      expect(() => new ManualClock(initialNowMs)).toThrow(RangeError);
    },
  );

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid delta %s", (deltaMs) => {
    const clock = new ManualClock();

    expect(() => clock.advanceBy(deltaMs)).toThrow(RangeError);
    expect(clock.nowMs()).toBe(0);
  });
});
