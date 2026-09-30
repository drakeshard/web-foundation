import { describe, expect, it } from "vitest";

import {
  type InputContextDefinition,
  InputContextRouter,
  type LogicalActionTransition,
} from "../src/input/index.ts";

const contexts: readonly InputContextDefinition[] = [
  {
    id: "Gameplay",
    priority: 0,
    actions: [
      { action: "action.primary" },
      { action: "action.shared" },
    ],
  },
  {
    id: "TargetSelection",
    priority: 20,
    actions: [{ action: "action.primary" }],
  },
  {
    id: "Inventory",
    priority: 30,
    actions: [{ action: "action.shared", consume: false }],
  },
  {
    id: "Modal",
    priority: 100,
    actions: [{ action: "action.primary" }],
  },
  {
    id: "Chat",
    priority: 80,
    actions: [{ action: "action.chat" }],
  },
  {
    id: "DebugConsole",
    priority: 90,
    actions: [{ action: "action.shared", consume: false }],
  },
];

function transition(action: string): LogicalActionTransition {
  return { action, sequence: 42, phase: "pressed" };
}

describe("InputContextRouter", () => {
  it("supports opaque named contexts with explicit activation and deactivation", () => {
    const router = new InputContextRouter(contexts);

    expect(router.activeContexts()).toEqual([]);

    router.activate("Gameplay");
    router.activate("Chat");

    expect(router.isActive("Gameplay")).toBe(true);
    expect(router.isActive("Chat")).toBe(true);
    expect(router.activeContexts()).toEqual(["Chat", "Gameplay"]);

    router.deactivate("Chat");

    expect(router.isActive("Chat")).toBe(false);
    expect(router.activeContexts()).toEqual(["Gameplay"]);
  });

  it("uses priority then declaration order for deterministic precedence", () => {
    const router = new InputContextRouter([
      { id: "first", priority: 10, actions: [{ action: "action.same", consume: false }] },
      { id: "second", priority: 10, actions: [{ action: "action.same", consume: false }] },
      { id: "higher", priority: 11, actions: [{ action: "action.same", consume: false }] },
    ]);

    router.activate("first");
    router.activate("second");
    router.activate("higher");

    expect(router.resolve("action.same")).toEqual([
      { context: "higher", action: "action.same", consumes: false },
      { context: "first", action: "action.same", consumes: false },
      { context: "second", action: "action.same", consumes: false },
    ]);
  });

  it("stops lower-priority delivery when a higher owner consumes the action", () => {
    const router = new InputContextRouter(contexts);

    router.activate("Gameplay");
    router.activate("TargetSelection");
    router.activate("Modal");

    expect(router.resolve("action.primary")).toEqual([
      { context: "Modal", action: "action.primary", consumes: true },
    ]);
    expect(router.route(transition("action.primary"))).toEqual([
      {
        context: "Modal",
        action: "action.primary",
        sequence: 42,
        phase: "pressed",
      },
    ]);
  });

  it("allows configured pass-through to lower-priority owners", () => {
    const router = new InputContextRouter(contexts);

    router.activate("Gameplay");
    router.activate("Inventory");
    router.activate("DebugConsole");

    expect(router.resolve("action.shared")).toEqual([
      { context: "DebugConsole", action: "action.shared", consumes: false },
      { context: "Inventory", action: "action.shared", consumes: false },
      { context: "Gameplay", action: "action.shared", consumes: true },
    ]);
  });

  it("changes ownership immediately on context transitions without fabricating action edges", () => {
    const router = new InputContextRouter(contexts);

    router.activate("Gameplay");

    expect(router.resolve("action.primary")).toEqual([
      { context: "Gameplay", action: "action.primary", consumes: true },
    ]);

    router.activate("TargetSelection");

    expect(router.resolve("action.primary")).toEqual([
      { context: "TargetSelection", action: "action.primary", consumes: true },
    ]);

    router.deactivate("TargetSelection");

    expect(router.resolve("action.primary")).toEqual([
      { context: "Gameplay", action: "action.primary", consumes: true },
    ]);
  });

  it("does not hard-code example context names or require all examples", () => {
    const router = new InputContextRouter([
      {
        id: "custom.overlay",
        priority: 7,
        actions: [{ action: "custom.confirm" }],
      },
    ]);

    router.activate("custom.overlay");

    expect(router.resolve("custom.confirm")).toEqual([
      { context: "custom.overlay", action: "custom.confirm", consumes: true },
    ]);
  });

  it("rejects invalid context definitions and unknown activation", () => {
    expect(
      () =>
        new InputContextRouter([
          { id: "duplicate", priority: 0, actions: [] },
          { id: "duplicate", priority: 1, actions: [] },
        ]),
    ).toThrow(RangeError);

    expect(
      () =>
        new InputContextRouter([
          {
            id: "rules",
            priority: 0,
            actions: [{ action: "same" }, { action: "same" }],
          },
        ]),
    ).toThrow(RangeError);

    expect(
      () =>
        new InputContextRouter([
          { id: "bad-priority", priority: Number.POSITIVE_INFINITY, actions: [] },
        ]),
    ).toThrow(RangeError);

    const router = new InputContextRouter();
    expect(() => router.activate("missing")).toThrow(RangeError);
  });

  it("returns no owners or transitions when no active context handles an action", () => {
    const router = new InputContextRouter(contexts);

    expect(router.resolve("action.none")).toEqual([]);
    expect(router.route(transition("action.none"))).toEqual([]);
  });
});
