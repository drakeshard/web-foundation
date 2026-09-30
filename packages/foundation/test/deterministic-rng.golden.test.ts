import { describe, expect, it } from "vitest";

import { DeterministicRng, RNG_ALGORITHM_ID } from "../src/random/index.ts";

const UINT32_RANGE = 0x1_0000_0000;

interface GoldenVector {
  seed: number;
  initialState: readonly [number, number, number, number];
  outputs: readonly number[];
}

const GOLDEN_VECTORS: readonly GoldenVector[] = [
  {
    seed: 0,
    initialState: [2462723854, 1020716019, 454327756, 1275600319],
    outputs: [
      3809008728, 1133695204, 53579671, 2891528803, 139681546, 2203266335, 104831812,
      1587294886,
    ],
  },
  {
    seed: 1,
    initialState: [2527132011, 314344336, 2535364964, 2041432039],
    outputs: [
      2442144158, 3238099751, 3819917871, 2104621829, 2021136066, 4223536128, 1515984730,
      2298887649,
    ],
  },
  {
    seed: 0xffff_ffff,
    initialState: [920564995, 4230986166, 697614773, 1778835764],
    outputs: [
      835879718, 1921286648, 2356205009, 1885780724, 980451116, 1053911718, 3677392737,
      2464361898,
    ],
  },
  {
    seed: 123456789,
    initialState: [1573771921, 319883699, 2742014374, 1324369493],
    outputs: [
      4284103975, 1001954530, 2701803082, 2658065534, 3104308804, 4033197306, 2121505443,
      3804340767,
    ],
  },
];

describe("DeterministicRng compatibility vectors", () => {
  for (const vector of GOLDEN_VECTORS) {
    it(`preserves seed expansion and uint32 sequence for seed ${vector.seed}`, () => {
      const rng = new DeterministicRng(vector.seed);

      expect(rng.snapshot()).toEqual({
        algorithm: RNG_ALGORITHM_ID,
        state: vector.initialState,
      });

      expect(vector.outputs.map(() => rng.nextUint32())).toEqual(vector.outputs);
    });
  }

  it("locks nextFloat01 to exactly one core draw", () => {
    const rng = new DeterministicRng(42);

    expect(rng.nextFloat01()).toBe(2837322924 / UINT32_RANGE);
    expect(rng.nextUint32()).toBe(544945897);
  });

  it("locks snapshot continuation to the exact next output", () => {
    const rng = new DeterministicRng(42);

    expect(rng.nextUint32()).toBe(2837322924);
    expect(rng.nextUint32()).toBe(544945897);
    expect(rng.nextUint32()).toBe(479756282);

    const snapshot = rng.snapshot();

    expect(snapshot).toEqual({
      algorithm: RNG_ALGORITHM_ID,
      state: [1023157812, 3745282274, 2189229299, 1611509492],
    });

    const restored = DeterministicRng.fromState(snapshot);

    expect(restored.nextUint32()).toBe(3500138142);
    expect(restored.nextUint32()).toBe(339756180);
    expect(restored.nextUint32()).toBe(113173290);
  });
});
