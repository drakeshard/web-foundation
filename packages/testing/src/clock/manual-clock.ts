export class ManualClock {
  #nowMs: number;

  constructor(initialNowMs = 0) {
    assertFiniteNonNegative(initialNowMs, "initialNowMs");
    this.#nowMs = initialNowMs;
  }

  nowMs(): number {
    return this.#nowMs;
  }

  advanceBy(deltaMs: number): number {
    assertFiniteNonNegative(deltaMs, "deltaMs");
    this.#nowMs += deltaMs;
    return this.#nowMs;
  }
}

function assertFiniteNonNegative(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be finite and greater than or equal to 0`);
  }
}
