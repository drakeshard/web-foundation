export const RNG_ALGORITHM_ID = "xoshiro128starstar-v1" as const;

export interface DeterministicRngState {
  algorithm: typeof RNG_ALGORITHM_ID;
  state: readonly [number, number, number, number];
}

const UINT32_MAX = 0xffff_ffff;
const UINT32_RANGE = 0x1_0000_0000;

export class DeterministicRng {
  #s0: number;
  #s1: number;
  #s2: number;
  #s3: number;

  constructor(seed: number) {
    assertUint32(seed, "seed");

    const state = expandSeed(seed);
    this.#s0 = state[0];
    this.#s1 = state[1];
    this.#s2 = state[2];
    this.#s3 = state[3];
  }

  static fromState(snapshot: DeterministicRngState): DeterministicRng {
    if (snapshot.algorithm !== RNG_ALGORITHM_ID) {
      throw new RangeError(`unsupported RNG algorithm: ${String(snapshot.algorithm)}`);
    }

    const [s0, s1, s2, s3] = snapshot.state;
    assertUint32(s0, "state[0]");
    assertUint32(s1, "state[1]");
    assertUint32(s2, "state[2]");
    assertUint32(s3, "state[3]");

    if ((s0 | s1 | s2 | s3) === 0) {
      throw new RangeError("RNG state must not be all zero");
    }

    const rng = new DeterministicRng(0);
    rng.#s0 = s0;
    rng.#s1 = s1;
    rng.#s2 = s2;
    rng.#s3 = s3;
    return rng;
  }

  nextUint32(): number {
    const result = Math.imul(rotateLeft32(Math.imul(this.#s1, 5) >>> 0, 7), 9) >>> 0;
    const t = (this.#s1 << 9) >>> 0;

    this.#s2 = (this.#s2 ^ this.#s0) >>> 0;
    this.#s3 = (this.#s3 ^ this.#s1) >>> 0;
    this.#s1 = (this.#s1 ^ this.#s2) >>> 0;
    this.#s0 = (this.#s0 ^ this.#s3) >>> 0;

    this.#s2 = (this.#s2 ^ t) >>> 0;
    this.#s3 = rotateLeft32(this.#s3, 11);

    return result;
  }

  nextFloat01(): number {
    return this.nextUint32() / UINT32_RANGE;
  }

  snapshot(): DeterministicRngState {
    return {
      algorithm: RNG_ALGORITHM_ID,
      state: [this.#s0, this.#s1, this.#s2, this.#s3],
    };
  }
}

function expandSeed(seed: number): [number, number, number, number] {
  let x = seed >>> 0;
  const state: [number, number, number, number] = [0, 0, 0, 0];

  for (let index = 0; index < state.length; index += 1) {
    x = (x + 0x9e37_79b9) >>> 0;

    let z = x;
    z = Math.imul(z ^ (z >>> 16), 0x85eb_ca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2_ae35) >>> 0;
    z = (z ^ (z >>> 16)) >>> 0;

    state[index] = z;
  }

  if ((state[0] | state[1] | state[2] | state[3]) === 0) {
    state[3] = 1;
  }

  return state;
}

function rotateLeft32(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}

function assertUint32(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0 || value > UINT32_MAX) {
    throw new RangeError(`${name} must be an unsigned 32-bit integer`);
  }
}
