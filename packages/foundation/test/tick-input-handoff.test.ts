import { describe, expect, it } from "vitest";

import {
  ActionBindingResolver,
  type InputCommand,
  InputContextRouter,
  TickInputHandoff,
} from "../src/input/index.ts";
import { FixedStepDriver } from "../src/time/index.ts";

function createHandoff() {
  const actions = new ActionBindingResolver([
    { action: "action.primary", binding: { kind: "key", code: "KeyQ" } },
    { action: "action.primary", binding: { kind: "key", code: "KeyE" } },
    { action: "action.secondary", binding: { kind: "key", code: "KeyR" } },
  ]);
  const contexts = new InputContextRouter([
    {
      id: "gameplay",
      priority: 0,
      actions: [{ action: "action.primary" }, { action: "action.secondary" }],
    },
    {
      id: "modal",
      priority: 10,
      actions: [{ action: "action.primary" }],
    },
  ]);
  contexts.activate("gameplay");

  return {
    actions,
    contexts,
    handoff: new TickInputHandoff<"intent", { readonly value: number }>({
      actions,
      contexts,
    }),
  };
}

describe("TickInputHandoff", () => {
  it("produces one-tick edges while held state persists across ticks", () => {
    const { handoff } = createHandoff();

    handoff.ingest({ kind: "key", sequence: 0, code: "KeyQ", phase: "pressed" });

    expect(handoff.consumeTick()).toEqual({
      actions: [
        {
          context: "gameplay",
          action: "action.primary",
          held: true,
          pressed: true,
          released: false,
        },
      ],
      transitions: [
        {
          context: "gameplay",
          action: "action.primary",
          sequence: 0,
          phase: "pressed",
        },
      ],
      commands: [],
    });

    expect(handoff.consumeTick()).toEqual({
      actions: [
        {
          context: "gameplay",
          action: "action.primary",
          held: true,
          pressed: false,
          released: false,
        },
      ],
      transitions: [],
      commands: [],
    });

    handoff.ingest({ kind: "key", sequence: 1, code: "KeyQ", phase: "released" });

    expect(handoff.consumeTick()).toEqual({
      actions: [
        {
          context: "gameplay",
          action: "action.primary",
          held: false,
          pressed: false,
          released: true,
        },
      ],
      transitions: [
        {
          context: "gameplay",
          action: "action.primary",
          sequence: 1,
          phase: "released",
        },
      ],
      commands: [],
    });
  });

  it("preserves ordered multiple edges between ticks and final held state", () => {
    const { handoff } = createHandoff();

    handoff.ingest({ kind: "key", sequence: 10, code: "KeyQ", phase: "pressed" });
    handoff.ingest({ kind: "key", sequence: 11, code: "KeyQ", phase: "released" });

    expect(handoff.consumeTick()).toEqual({
      actions: [
        {
          context: "gameplay",
          action: "action.primary",
          held: false,
          pressed: true,
          released: true,
        },
      ],
      transitions: [
        {
          context: "gameplay",
          action: "action.primary",
          sequence: 10,
          phase: "pressed",
        },
        {
          context: "gameplay",
          action: "action.primary",
          sequence: 11,
          phase: "released",
        },
      ],
      commands: [],
    });
  });

  it("uses final multi-binding held state without duplicate action edges", () => {
    const { handoff } = createHandoff();

    handoff.ingest({ kind: "key", sequence: 0, code: "KeyQ", phase: "pressed" });
    handoff.ingest({ kind: "key", sequence: 1, code: "KeyE", phase: "pressed" });
    handoff.ingest({ kind: "key", sequence: 2, code: "KeyQ", phase: "released" });

    const snapshot = handoff.consumeTick();

    expect(snapshot.transitions).toEqual([
      {
        context: "gameplay",
        action: "action.primary",
        sequence: 0,
        phase: "pressed",
      },
    ]);
    expect(snapshot.actions).toEqual([
      {
        context: "gameplay",
        action: "action.primary",
        held: true,
        pressed: true,
        released: false,
      },
    ]);
  });

  it("samples current context ownership only at tick consumption", () => {
    const { handoff, contexts } = createHandoff();

    handoff.ingest({ kind: "key", sequence: 0, code: "KeyQ", phase: "pressed" });
    contexts.activate("modal");

    expect(handoff.consumeTick()).toEqual({
      actions: [
        {
          context: "modal",
          action: "action.primary",
          held: true,
          pressed: true,
          released: false,
        },
      ],
      transitions: [
        {
          context: "modal",
          action: "action.primary",
          sequence: 0,
          phase: "pressed",
        },
      ],
      commands: [],
    });
  });

  it("clears stale held state on reset without fabricating a release transition", () => {
    const { handoff } = createHandoff();

    handoff.ingest({ kind: "key", sequence: 0, code: "KeyQ", phase: "pressed" });
    handoff.consumeTick();

    handoff.ingest({ kind: "reset", sequence: 1, scope: "keyboard", reason: "hidden" });

    expect(handoff.consumeTick()).toEqual({
      actions: [],
      transitions: [],
      commands: [],
    });
  });

  it("delivers commands by input sequence with stable insertion order for ties", () => {
    const { handoff } = createHandoff();
    const commands: readonly InputCommand<"intent", { readonly value: number }>[] = [
      { id: "intent", sequence: 5, payload: { value: 2 } },
      { id: "intent", sequence: 3, payload: { value: 1 } },
      { id: "intent", sequence: 5, payload: { value: 3 } },
    ];

    for (const command of commands) handoff.enqueueCommand(command);

    expect(handoff.consumeTick().commands).toEqual([
      { id: "intent", sequence: 3, payload: { value: 1 } },
      { id: "intent", sequence: 5, payload: { value: 2 } },
      { id: "intent", sequence: 5, payload: { value: 3 } },
    ]);
    expect(handoff.consumeTick().commands).toEqual([]);
  });

  it("rejects non-monotonic physical input ordering", () => {
    const { handoff } = createHandoff();

    handoff.ingest({ kind: "key", sequence: 2, code: "KeyQ", phase: "pressed" });

    expect(() =>
      handoff.ingest({ kind: "key", sequence: 2, code: "KeyQ", phase: "released" }),
    ).toThrow(RangeError);
    expect(() =>
      handoff.ingest({ kind: "key", sequence: 1, code: "KeyQ", phase: "released" }),
    ).toThrow(RangeError);
  });

  it("integrates consumption once per fixed simulation tick", () => {
    const { handoff } = createHandoff();
    const driver = new FixedStepDriver({
      stepMs: 10,
      maxFrameDeltaMs: 100,
      maxStepsPerFrame: 10,
    });
    const snapshots: ReturnType<typeof handoff.consumeTick>[] = [];

    handoff.ingest({ kind: "key", sequence: 0, code: "KeyR", phase: "pressed" });

    for (const frameDeltaMs of [4, 8, 8]) {
      const { steps } = driver.advance(frameDeltaMs);

      for (let step = 0; step < steps; step += 1) {
        snapshots.push(handoff.consumeTick());
      }
    }

    expect(snapshots).toHaveLength(2);
    expect(snapshots[0]?.actions).toEqual([
      {
        context: "gameplay",
        action: "action.secondary",
        held: true,
        pressed: true,
        released: false,
      },
    ]);
    expect(snapshots[1]?.actions).toEqual([
      {
        context: "gameplay",
        action: "action.secondary",
        held: true,
        pressed: false,
        released: false,
      },
    ]);
  });
});
