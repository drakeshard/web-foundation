import { describe, expect, it } from "vitest";
import {
  type BrowserInputEventTarget,
  BrowserInputLifecycle,
  type BrowserVisibilityTarget,
  KeyboardBrowserAdapter,
  PointerBrowserAdapter,
} from "../src/input/browser/index.ts";
import { MonotonicInputSequence, type PhysicalInputEvent } from "../src/input/index.ts";

class TestEventTarget implements BrowserInputEventTarget {
  readonly #listeners = new Map<string, Set<EventListener>>();

  addEventListener(type: string, listener: EventListener): void {
    let listeners = this.#listeners.get(type);
    if (!listeners) {
      listeners = new Set();
      this.#listeners.set(type, listeners);
    }
    listeners.add(listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.#listeners.get(type)?.delete(listener);
  }

  dispatch(type: string, event: Event = {} as Event): void {
    for (const listener of this.#listeners.get(type) ?? []) listener(event);
  }

  listenerCount(type: string): number {
    return this.#listeners.get(type)?.size ?? 0;
  }
}

class TestVisibilityTarget extends TestEventTarget implements BrowserVisibilityTarget {
  visibilityState = "visible";
}

function keyEvent(code: string): Event {
  return { code, repeat: false } as unknown as Event;
}

function pointerEvent(pointerId: number, button: number): Event {
  return {
    pointerId,
    button,
    clientX: 10,
    clientY: 20,
    pointerType: "mouse",
  } as unknown as Event;
}

function createFixture() {
  const focusTarget = new TestEventTarget();
  const visibilityTarget = new TestVisibilityTarget();
  const keyboardTarget = new TestEventTarget();
  const pointerTarget = new TestEventTarget();
  const wheelTarget = new TestEventTarget();
  const sequence = new MonotonicInputSequence();
  const events: PhysicalInputEvent[] = [];
  const sink = (event: PhysicalInputEvent) => events.push(event);
  const lifecycle = new BrowserInputLifecycle({
    focusTarget,
    visibilityTarget,
    sequence,
    sink,
  });
  const keyboard = new KeyboardBrowserAdapter({
    keyboardTarget,
    lifecycle,
    sequence,
    sink,
  });
  const pointer = new PointerBrowserAdapter({
    pointerTarget,
    wheelTarget,
    lifecycle,
    sequence,
    sink,
  });

  lifecycle.attach();
  keyboard.attach();
  pointer.attach();

  return {
    focusTarget,
    visibilityTarget,
    keyboardTarget,
    pointerTarget,
    lifecycle,
    keyboard,
    pointer,
    events,
  };
}

describe("BrowserInputLifecycle", () => {
  it("owns one shared blur/focus/visibility listener set", () => {
    const { focusTarget, visibilityTarget, lifecycle } = createFixture();

    expect(focusTarget.listenerCount("blur")).toBe(1);
    expect(focusTarget.listenerCount("focus")).toBe(1);
    expect(visibilityTarget.listenerCount("visibilitychange")).toBe(1);

    lifecycle.detach();

    expect(focusTarget.listenerCount("blur")).toBe(0);
    expect(focusTarget.listenerCount("focus")).toBe(0);
    expect(visibilityTarget.listenerCount("visibilitychange")).toBe(0);
  });

  it("clears keyboard and pointer held state before one all-scope blur reset", () => {
    const { focusTarget, keyboardTarget, pointerTarget, keyboard, pointer, events } =
      createFixture();

    keyboardTarget.dispatch("keydown", keyEvent("KeyQ"));
    pointerTarget.dispatch("pointerdown", pointerEvent(5, 0));

    expect(keyboard.isHeld("KeyQ")).toBe(true);
    expect(pointer.isHeld(5, 0)).toBe(true);

    focusTarget.dispatch("blur");

    expect(keyboard.isHeld("KeyQ")).toBe(false);
    expect(pointer.isHeld(5, 0)).toBe(false);
    expect(events.at(-1)).toEqual({
      kind: "reset",
      sequence: 2,
      scope: "all",
      reason: "blur",
    });
    expect(events.filter((event) => event.kind === "reset")).toHaveLength(1);
  });

  it("suspends while hidden and resumes without replaying old input", () => {
    const { visibilityTarget, keyboardTarget, pointerTarget, keyboard, pointer, events } =
      createFixture();

    keyboardTarget.dispatch("keydown", keyEvent("KeyA"));
    pointerTarget.dispatch("pointerdown", pointerEvent(1, 0));

    visibilityTarget.visibilityState = "hidden";
    visibilityTarget.dispatch("visibilitychange");

    keyboardTarget.dispatch("keydown", keyEvent("KeyB"));
    pointerTarget.dispatch("pointerdown", pointerEvent(1, 2));

    expect(keyboard.isHeld("KeyA")).toBe(false);
    expect(keyboard.isHeld("KeyB")).toBe(false);
    expect(pointer.isHeld(1, 0)).toBe(false);
    expect(pointer.isHeld(1, 2)).toBe(false);

    visibilityTarget.visibilityState = "visible";
    visibilityTarget.dispatch("visibilitychange");
    keyboardTarget.dispatch("keydown", keyEvent("KeyB"));

    expect(keyboard.isHeld("KeyB")).toBe(true);
    expect(events.at(-2)).toEqual({
      kind: "reset",
      sequence: 2,
      scope: "all",
      reason: "hidden",
    });
    expect(events.at(-1)).toEqual({
      kind: "key",
      sequence: 3,
      code: "KeyB",
      phase: "pressed",
    });
  });

  it("requires focus to resume after blur and suppresses duplicate resets while suspended", () => {
    const { focusTarget, visibilityTarget, keyboardTarget, lifecycle, events } = createFixture();

    keyboardTarget.dispatch("keydown", keyEvent("KeyQ"));
    focusTarget.dispatch("blur");
    focusTarget.dispatch("blur");

    visibilityTarget.visibilityState = "hidden";
    visibilityTarget.dispatch("visibilitychange");
    visibilityTarget.visibilityState = "visible";
    visibilityTarget.dispatch("visibilitychange");

    expect(lifecycle.active).toBe(false);

    keyboardTarget.dispatch("keydown", keyEvent("KeyE"));
    expect(events.filter((event) => event.kind === "reset")).toHaveLength(1);

    focusTarget.dispatch("focus");
    keyboardTarget.dispatch("keydown", keyEvent("KeyE"));

    expect(lifecycle.active).toBe(true);
    expect(events.at(-1)).toEqual({
      kind: "key",
      sequence: 2,
      code: "KeyE",
      phase: "pressed",
    });
  });

  it("keeps pointer cancellation local rather than emitting a global reset", () => {
    const { pointerTarget, pointer, events } = createFixture();

    pointerTarget.dispatch("pointerdown", pointerEvent(8, 0));
    pointerTarget.dispatch("pointercancel", pointerEvent(8, -1));

    expect(pointer.isHeld(8, 0)).toBe(false);
    expect(events).toEqual([
      {
        kind: "pointer-button",
        sequence: 0,
        pointerId: 8,
        pointerType: "mouse",
        button: 0,
        phase: "pressed",
        position: { x: 10, y: 20 },
      },
      { kind: "pointer-cancel", sequence: 1, pointerId: 8 },
    ]);
  });

  it("lifecycle detach invalidates all state while adapter detach remains scoped", () => {
    const { lifecycle, keyboard, pointer, keyboardTarget, pointerTarget, events } = createFixture();

    keyboardTarget.dispatch("keydown", keyEvent("KeyQ"));
    pointerTarget.dispatch("pointerdown", pointerEvent(3, 0));

    lifecycle.detach();

    expect(keyboard.isHeld("KeyQ")).toBe(false);
    expect(pointer.isHeld(3, 0)).toBe(false);
    expect(events.at(-1)).toEqual({
      kind: "reset",
      sequence: 2,
      scope: "all",
      reason: "detach",
    });

    keyboard.detach();
    pointer.detach();

    expect(events.slice(-2)).toEqual([
      { kind: "reset", sequence: 3, scope: "keyboard", reason: "detach" },
      { kind: "reset", sequence: 4, scope: "pointer", reason: "detach" },
    ]);
  });
});
