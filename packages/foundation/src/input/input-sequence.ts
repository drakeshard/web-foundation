import type { InputSequence, InputSequenceSource } from "./contracts.js";

const EXHAUSTED_SEQUENCE = Number.NaN;

export class MonotonicInputSequence implements InputSequenceSource {
  #nextSequence: number;

  constructor(initialSequence: InputSequence = 0) {
    assertInputSequence(initialSequence);
    this.#nextSequence = initialSequence;
  }

  next(): InputSequence {
    if (Number.isNaN(this.#nextSequence)) {
      throw new RangeError("Input sequence is exhausted");
    }

    const sequence = this.#nextSequence;

    if (sequence === Number.MAX_SAFE_INTEGER) {
      this.#nextSequence = EXHAUSTED_SEQUENCE;
    } else {
      this.#nextSequence = sequence + 1;
    }

    return sequence;
  }
}

function assertInputSequence(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError("Input sequence must be a non-negative safe integer");
  }
}
