import { describe, expect, it } from "vitest";

import { DeterministicRng, RNG_ALGORITHM_ID } from "../src/random/index.ts";

describe("DeterministicRng", () => {
  it("produces the same sequence for the same seed", () => {
    const first = new DeterministicRng(123456789);
    const second = new DeterministicRng(123456789);

    const firstSequence = Array.from({ length: 8 }, () => first.nextUint32());
    const secondSequence = Array.from({ length: 8 }, () => second.nextUint32());

    expect(secondSequence).toEqual(firstSequence);
  });

  it("returns floats in the documented half-open interval", () => {
    const rng = new DeterministicRng(0);

    for (let index = 0; index < 32; index += 1) {
      const value = rng.nextFloat01();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("restores the exact next output from a snapshot", () => {
    const rng = new DeterministicRng(42);

    rng.nextUint32();
    rng.nextFloat01();

    const snapshot = rng.snapshot();
    const restored = DeterministicRng.fromState(snapshot);

    expect(snapshot.algorithm).toBe(RNG_ALGORITHM_ID);
    expect(restored.nextUint32()).toBe(rng.nextUint32());
    expect(restored.nextFloat01()).toBe(rng.nextFloat01());
  });

  it("returns snapshot state by value", () => {
    const rng = new DeterministicRng(7);
    const snapshot = rng.snapshot();
    const original = rng.snapshot();

    const mutable = snapshot.state as number[];
    mutable[0] = 0;

    expect(rng.snapshot()).toEqual(original);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 0x1_0000_0000])(
    "rejects invalid seed %s",
    (seed) => {
      expect(() => new DeterministicRng(seed)).toThrow(RangeError);
    },
  );

  it("rejects unsupported or all-zero restored state", () => {
    expect(() =>
      DeterministicRng.fromState({
        algorithm: "other" as typeof RNG_ALGORITHM_ID,
        state: [1, 2, 3, 4],
      }),
    ).toThrow(RangeError);

    expect(() =>
      DeterministicRng.fromState({
        algorithm: RNG_ALGORITHM_ID,
        state: [0, 0, 0, 0],
      }),
    ).toThrow(RangeError);
  });
});
