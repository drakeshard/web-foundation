import { describe, expect, it } from "vitest";

import {
  type ActionBinding,
  ActionBindingResolver,
  type PhysicalInputEvent,
} from "../src/input/index.ts";

const bindings: readonly ActionBinding[] = [
  { action: "action.primary", binding: { kind: "key", code: "KeyQ" } },
  { action: "action.primary", binding: { kind: "key", code: "KeyE" } },
  { action: "action.secondary", binding: { kind: "key", code: "KeyQ" } },
  { action: "action.pointer", binding: { kind: "pointer-button", button: 0 } },
  {
    action: "action.pen",
    binding: { kind: "pointer-button", button: 0, pointerType: "pen" },
  },
];

function consume(resolver: ActionBindingResolver, event: PhysicalInputEvent) {
  return resolver.consume(event);
}

describe("ActionBindingResolver", () => {
  it("maps one physical source to ordered logical action transitions", () => {
    const resolver = new ActionBindingResolver(bindings);

    expect(consume(resolver, { kind: "key", sequence: 0, code: "KeyQ", phase: "pressed" })).toEqual(
      [
        { action: "action.primary", sequence: 0, phase: "pressed" },
        { action: "action.secondary", sequence: 0, phase: "pressed" },
      ],
    );

    expect(resolver.heldActions()).toEqual(["action.primary", "action.secondary"]);
    expect(resolver.activeSources()).toEqual([
      {
        source: { kind: "key", code: "KeyQ" },
        pressedSequence: 0,
        actions: ["action.primary", "action.secondary"],
      },
    ]);

    expect(
      consume(resolver, { kind: "key", sequence: 1, code: "KeyQ", phase: "released" }),
    ).toEqual([
      { action: "action.primary", sequence: 1, phase: "released" },
      { action: "action.secondary", sequence: 1, phase: "released" },
    ]);
    expect(resolver.heldActions()).toEqual([]);
  });

  it("keeps an action held until its final active binding releases", () => {
    const resolver = new ActionBindingResolver(bindings);

    expect(
      consume(resolver, { kind: "key", sequence: 0, code: "KeyQ", phase: "pressed" }),
    ).toContainEqual({ action: "action.primary", sequence: 0, phase: "pressed" });

    expect(consume(resolver, { kind: "key", sequence: 1, code: "KeyE", phase: "pressed" })).toEqual(
      [],
    );

    expect(
      consume(resolver, { kind: "key", sequence: 2, code: "KeyQ", phase: "released" }),
    ).toEqual([{ action: "action.secondary", sequence: 2, phase: "released" }]);
    expect(resolver.isHeld("action.primary")).toBe(true);

    expect(
      consume(resolver, { kind: "key", sequence: 3, code: "KeyE", phase: "released" }),
    ).toEqual([{ action: "action.primary", sequence: 3, phase: "released" }]);
    expect(resolver.isHeld("action.primary")).toBe(false);
  });

  it("suppresses duplicate physical press and release events", () => {
    const resolver = new ActionBindingResolver([
      { action: "action.primary", binding: { kind: "key", code: "Space" } },
    ]);

    expect(
      consume(resolver, { kind: "key", sequence: 0, code: "Space", phase: "pressed" }),
    ).toHaveLength(1);
    expect(
      consume(resolver, { kind: "key", sequence: 1, code: "Space", phase: "pressed" }),
    ).toEqual([]);
    expect(
      consume(resolver, { kind: "key", sequence: 2, code: "Space", phase: "released" }),
    ).toHaveLength(1);
    expect(
      consume(resolver, { kind: "key", sequence: 3, code: "Space", phase: "released" }),
    ).toEqual([]);
  });

  it("matches pointer-button bindings and aggregates multiple pointers deterministically", () => {
    const resolver = new ActionBindingResolver(bindings);

    expect(
      consume(resolver, {
        kind: "pointer-button",
        sequence: 0,
        pointerId: 10,
        pointerType: "mouse",
        button: 0,
        phase: "pressed",
        position: { x: 1, y: 2 },
      }),
    ).toEqual([{ action: "action.pointer", sequence: 0, phase: "pressed" }]);

    expect(
      consume(resolver, {
        kind: "pointer-button",
        sequence: 1,
        pointerId: 11,
        pointerType: "pen",
        button: 0,
        phase: "pressed",
        position: { x: 3, y: 4 },
      }),
    ).toEqual([{ action: "action.pen", sequence: 1, phase: "pressed" }]);

    expect(resolver.heldActions()).toEqual(["action.pointer", "action.pen"]);

    expect(
      consume(resolver, {
        kind: "pointer-button",
        sequence: 2,
        pointerId: 10,
        pointerType: "mouse",
        button: 0,
        phase: "released",
        position: { x: 5, y: 6 },
      }),
    ).toEqual([]);

    expect(
      consume(resolver, {
        kind: "pointer-button",
        sequence: 3,
        pointerId: 11,
        pointerType: "pen",
        button: 0,
        phase: "released",
        position: { x: 7, y: 8 },
      }),
    ).toEqual([
      { action: "action.pointer", sequence: 3, phase: "released" },
      { action: "action.pen", sequence: 3, phase: "released" },
    ]);
  });

  it("invalidates canceled and reset physical state without fabricating logical release edges", () => {
    const resolver = new ActionBindingResolver(bindings);

    consume(resolver, {
      kind: "pointer-button",
      sequence: 0,
      pointerId: 7,
      pointerType: "mouse",
      button: 0,
      phase: "pressed",
      position: { x: 0, y: 0 },
    });
    consume(resolver, { kind: "key", sequence: 1, code: "KeyQ", phase: "pressed" });

    expect(consume(resolver, { kind: "pointer-cancel", sequence: 2, pointerId: 7 })).toEqual([]);
    expect(resolver.isHeld("action.pointer")).toBe(false);
    expect(resolver.isHeld("action.primary")).toBe(true);

    expect(
      consume(resolver, {
        kind: "reset",
        sequence: 3,
        scope: "keyboard",
        reason: "hidden",
      }),
    ).toEqual([]);
    expect(resolver.heldActions()).toEqual([]);
  });

  it("replacing bindings invalidates active mapping state and requires a new physical edge", () => {
    const resolver = new ActionBindingResolver([
      { action: "action.old", binding: { kind: "key", code: "KeyR" } },
    ]);

    consume(resolver, { kind: "key", sequence: 0, code: "KeyR", phase: "pressed" });
    expect(resolver.isHeld("action.old")).toBe(true);

    resolver.replaceBindings([{ action: "action.new", binding: { kind: "key", code: "KeyR" } }]);

    expect(resolver.heldActions()).toEqual([]);
    expect(
      consume(resolver, { kind: "key", sequence: 1, code: "KeyR", phase: "released" }),
    ).toEqual([]);
    expect(consume(resolver, { kind: "key", sequence: 2, code: "KeyR", phase: "pressed" })).toEqual(
      [{ action: "action.new", sequence: 2, phase: "pressed" }],
    );
  });

  it("ignores pointer-position and wheel records for digital action state", () => {
    const resolver = new ActionBindingResolver(bindings);

    expect(
      consume(resolver, {
        kind: "pointer-position",
        sequence: 0,
        pointerId: 1,
        pointerType: "mouse",
        position: { x: 10, y: 20 },
      }),
    ).toEqual([]);
    expect(
      consume(resolver, {
        kind: "wheel",
        sequence: 1,
        deltaX: 0,
        deltaY: -1,
        deltaZ: 0,
        unit: "line",
      }),
    ).toEqual([]);
    expect(resolver.heldActions()).toEqual([]);
  });
});
