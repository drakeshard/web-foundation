import { describe, expect, it } from "vitest";
import type { PersistenceResult } from "@drakeshard/foundation/storage";
import {
  projectPersistenceFailure,
  projectProbeFrameObservation,
} from "../src/debug/probe-debug.ts";

describe("probe debug observations", () => {
  it("projects fixed-step frame results without introducing debug counters", () => {
    expect(
      projectProbeFrameObservation({
        state: {} as never,
        alpha: 0.5,
        steps: 5,
        clampedMs: 250,
        droppedSteps: 3,
        overrun: true,
      }),
    ).toEqual({
      alpha: 0.5,
      steps: 5,
      clampedMs: 250,
      droppedSteps: 3,
      overrun: true,
    });
  });

  it("projects only persistence failure category and operation", () => {
    const failure: PersistenceResult<unknown> = {
      ok: false,
      error: {
        kind: "corrupt-data",
        operation: "decode",
        diagnostic: { message: "broken" },
      },
    };

    expect(projectPersistenceFailure(failure)).toEqual({
      kind: "corrupt-data",
      operation: "decode",
    });
    expect(projectPersistenceFailure({ ok: true, value: "saved" })).toBeNull();
  });
});
