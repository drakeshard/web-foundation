import { DeterministicRng, type DeterministicRngState } from "@drakeshard/foundation/random";
import { FixedStepDriver } from "@drakeshard/foundation/time";
import {
  advanceToyDomain,
  createToyDomainState,
  snapshotToyDomain,
  type ToyDomainCommand,
  type ToyDomainSnapshot,
  type ToyDomainState,
} from "../domain/index.js";

const DEFAULT_STEP_MS = 50;
const DEFAULT_MAX_FRAME_DELTA_MS = 250;
const DEFAULT_MAX_STEPS_PER_FRAME = 5;
const DEFAULT_SEED = 0x00c0_ffee;

export interface ProbeSimulationOptions {
  readonly consumeCommands: () => readonly ToyDomainCommand[];
  readonly initialState?: ToyDomainState;
  readonly seed?: number;
  readonly stepMs?: number;
  readonly maxFrameDeltaMs?: number;
  readonly maxStepsPerFrame?: number;
}

export interface ProbeSimulationFrame {
  readonly state: ToyDomainState;
  readonly alpha: number;
  readonly steps: number;
  readonly clampedMs: number;
  readonly droppedSteps: number;
  readonly overrun: boolean;
}

export interface ProbeSimulationSnapshot {
  readonly domain: ToyDomainSnapshot;
  readonly random: DeterministicRngState;
}

export interface ProbeSimulation {
  readonly state: ToyDomainState;
  advanceFrame(frameDeltaMs: number): ProbeSimulationFrame;
  pause(): void;
  resume(): void;
  snapshot(): ProbeSimulationSnapshot;
}

export function createProbeSimulation(options: ProbeSimulationOptions): ProbeSimulation {
  const driver = new FixedStepDriver({
    stepMs: options.stepMs ?? DEFAULT_STEP_MS,
    maxFrameDeltaMs: options.maxFrameDeltaMs ?? DEFAULT_MAX_FRAME_DELTA_MS,
    maxStepsPerFrame: options.maxStepsPerFrame ?? DEFAULT_MAX_STEPS_PER_FRAME,
  });
  const random = new DeterministicRng(options.seed ?? DEFAULT_SEED);

  let state = options.initialState ?? createToyDomainState();
  let paused = false;
  let discardNextFrame = false;

  return {
    get state(): ToyDomainState {
      return state;
    },

    advanceFrame(frameDeltaMs: number): ProbeSimulationFrame {
      if (paused) return idleFrame(state);

      if (discardNextFrame) {
        discardNextFrame = false;
        driver.reset();
        return idleFrame(state);
      }

      const advance = driver.advance(frameDeltaMs);

      for (let step = 0; step < advance.steps; step += 1) {
        state = advanceToyDomain(state, options.consumeCommands(), random).state;
      }

      return {
        state,
        alpha: advance.alpha,
        steps: advance.steps,
        clampedMs: advance.clampedMs,
        droppedSteps: advance.droppedSteps,
        overrun: advance.overrun,
      };
    },

    pause(): void {
      if (paused) return;
      paused = true;
      driver.reset();
    },

    resume(): void {
      if (!paused) return;
      paused = false;
      discardNextFrame = true;
      driver.reset();
    },

    snapshot(): ProbeSimulationSnapshot {
      return {
        domain: snapshotToyDomain(state),
        random: random.snapshot(),
      };
    },
  };
}

function idleFrame(state: ToyDomainState): ProbeSimulationFrame {
  return {
    state,
    alpha: 0,
    steps: 0,
    clampedMs: 0,
    droppedSteps: 0,
    overrun: false,
  };
}
