import { describe, expect, it } from "vitest";

import { type PhysicalInputEvent, MonotonicInputSequence } from "../src/input/index.ts";

describe("input contracts", () => {
  it("assigns monotonically increasing sequence values from a shared source", () => {
    const sequence = new MonotonicInputSequence(41);

    expect(sequence.next()).toBe(41);
    expect(sequence.next()).toBe(42);
    expect(sequence.next()).toBe(43);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid initial sequence %s",
    (initialSequence) => {
      expect(() => new MonotonicInputSequence(initialSequence)).toThrow(RangeError);
    },
  );

  it("allows the final safe integer once and then reports exhaustion", () => {
    const sequence = new MonotonicInputSequence(Number.MAX_SAFE_INTEGER);

    expect(sequence.next()).toBe(Number.MAX_SAFE_INTEGER);
    expect(() => sequence.next()).toThrow(RangeError);
  });

  it("represents normalized physical input without browser event objects", () => {
    const events: PhysicalInputEvent[] = [
      { kind: "key", sequence: 0, code: "KeyQ", phase: "pressed" },
      {
        kind: "pointer-button",
        sequence: 1,
        pointerId: 7,
        pointerType: "mouse",
        button: 0,
        phase: "pressed",
        position: { x: 100, y: 200 },
      },
      { kind: "wheel", sequence: 2, deltaX: 0, deltaY: -3, deltaZ: 0, unit: "line" },
      { kind: "reset", sequence: 3, reason: "blur" },
    ];

    expect(events.map((event) => event.kind)).toEqual(["key", "pointer-button", "wheel", "reset"]);
  });
});
