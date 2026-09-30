export interface FixedStepConfig {
  stepMs: number;
  maxFrameDeltaMs: number;
  maxStepsPerFrame: number;
}

export interface FixedStepAdvanceResult {
  steps: number;
  alpha: number;
  clampedMs: number;
  droppedSteps: number;
  overrun: boolean;
}

export class FixedStepDriver {
  readonly #stepMs: number;
  readonly #maxFrameDeltaMs: number;
  readonly #maxStepsPerFrame: number;

  #accumulatorMs = 0;

  constructor(config: FixedStepConfig) {
    assertFinitePositive(config.stepMs, "stepMs");
    assertFinitePositive(config.maxFrameDeltaMs, "maxFrameDeltaMs");

    if (!Number.isInteger(config.maxStepsPerFrame) || config.maxStepsPerFrame < 1) {
      throw new RangeError("maxStepsPerFrame must be an integer greater than or equal to 1");
    }

    this.#stepMs = config.stepMs;
    this.#maxFrameDeltaMs = config.maxFrameDeltaMs;
    this.#maxStepsPerFrame = config.maxStepsPerFrame;
  }

  advance(frameDeltaMs: number): FixedStepAdvanceResult {
    if (!Number.isFinite(frameDeltaMs) || frameDeltaMs < 0) {
      throw new RangeError("frameDeltaMs must be finite and greater than or equal to 0");
    }

    const acceptedMs = Math.min(frameDeltaMs, this.#maxFrameDeltaMs);
    const clampedMs = frameDeltaMs - acceptedMs;
    const accumulatedMs = this.#accumulatorMs + acceptedMs;

    const availableSteps = Math.floor(accumulatedMs / this.#stepMs);
    const steps = Math.min(availableSteps, this.#maxStepsPerFrame);
    const droppedSteps = availableSteps - steps;

    this.#accumulatorMs = accumulatedMs - availableSteps * this.#stepMs;

    return {
      steps,
      alpha: this.#accumulatorMs / this.#stepMs,
      clampedMs,
      droppedSteps,
      overrun: droppedSteps > 0,
    };
  }

  reset(): void {
    this.#accumulatorMs = 0;
  }
}

function assertFinitePositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be finite and greater than 0`);
  }
}
