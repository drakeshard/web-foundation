import type { PersistenceResult } from "@drakeshard/foundation/storage";
import type { ProbeSimulationFrame } from "../simulation/probe-simulation.js";

export interface ProbeFrameObservation {
  readonly steps: number;
  readonly alpha: number;
  readonly clampedMs: number;
  readonly droppedSteps: number;
  readonly overrun: boolean;
}

export interface ProbePersistenceFailureObservation {
  readonly kind: string;
  readonly operation: string;
}

export interface ProbeDebugView {
  publishFrame(frame: ProbeSimulationFrame): void;
  publishPersistenceResult(result: PersistenceResult<unknown>): void;
}

export function projectProbeFrameObservation(
  frame: ProbeSimulationFrame,
): ProbeFrameObservation {
  return {
    steps: frame.steps,
    alpha: frame.alpha,
    clampedMs: frame.clampedMs,
    droppedSteps: frame.droppedSteps,
    overrun: frame.overrun,
  };
}

export function projectPersistenceFailure(
  result: PersistenceResult<unknown>,
): ProbePersistenceFailureObservation | null {
  if (result.ok) return null;

  return {
    kind: result.error.kind,
    operation: result.error.operation,
  };
}

export function createProbeDebugView(parent: HTMLElement): ProbeDebugView {
  const frameOutput = document.createElement("pre");
  frameOutput.dataset.testid = "debug-frame";
  frameOutput.textContent = JSON.stringify(null);

  const persistenceOutput = document.createElement("pre");
  persistenceOutput.dataset.testid = "debug-last-persistence-failure";
  persistenceOutput.textContent = JSON.stringify(null);

  parent.replaceChildren(frameOutput, persistenceOutput);

  return {
    publishFrame(frame: ProbeSimulationFrame): void {
      frameOutput.textContent = JSON.stringify(projectProbeFrameObservation(frame));
    },

    publishPersistenceResult(result: PersistenceResult<unknown>): void {
      const failure = projectPersistenceFailure(result);
      if (failure) {
        persistenceOutput.textContent = JSON.stringify(failure);
      }
    },
  };
}
