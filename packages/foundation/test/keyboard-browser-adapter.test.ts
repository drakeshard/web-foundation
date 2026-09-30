import { describe, expect, it } from "vitest";

import {
  type BrowserInputEventTarget,
  type BrowserVisibilityTarget,
  KeyboardBrowserAdapter,
  MonotonicInputSequence,
  type PhysicalInputEvent,
} from "../src/input/index.ts";

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
    for (const listener of this.#listeners.get(type) ?? []) {
      listener(event);
    }
  }

  listenerCount(type: string): number {
    return this.#listeners.get(type)?.size ?? 0;
  }
}

class TestVisibilityTarget extends TestEventTarget implements BrowserVisibilityTarget {
  visibilityState = "visible";
}

function keyEvent(code: string, repeat = false): Event {
  return { code, repeat } as unknown as Event;
}

function createAdapter() {
  const keyboardTarget = new TestEventTarget();
  const blurTarget = new TestEventTarget();
  const visibilityTarget = new TestVisibilityTarget();
  const events: PhysicalInputEvent[] = [];
  const adapter = new KeyboardBrowserAdapter({
    keyboardTarget,
    blurTarget,
    visibilityTarget,
    sequence: new MonotonicInputSequence(),
    sink: (event) => events.push(event),
  });

  return { adapter, keyboardTarget, blurTarget, visibilityTarget, events };
}

describe("KeyboardBrowserAdapter", () => {
  it("attaches and detaches browser listeners explicitly", () => {
    const { adapter, keyboardTarget, blurTarget, visibilityTarget, events } = createAdapter();

    adapter.attach();
    adapter.attach();

    expect(adapter.attached).toBe(true);
    expect(keyboardTarget.listenerCount("keydown")).toBe(1);
    expect(keyboardTarget.listenerCount("keyup")).toBe(1);
    expect(blurTarget.listenerCount("blur")).toBe(1);
    expect(visibilityTarget.listenerCount("visibilitychange")).toBe(1);

    adapter.detach();
    adapter.detach();

    expect(adapter.attached).toBe(false);
    expect(keyboardTarget.listenerCount("keydown")).toBe(0);
    expect(keyboardTarget.listenerCount("keyup")).toBe(0);
    expect(blurTarget.listenerCount("blur")).toBe(0);
    expect(visibilityTarget.listenerCount("visibilitychange")).toBe(0);
    expect(events).toEqual([{ kind: "reset", sequence: 0, scope: "keyboard", reason: "detach" }]);
  });

  it("emits deterministic pressed and released edges while tracking held state", () => {
    const { adapter, keyboardTarget, events } = createAdapter();

    adapter.attach();
    keyboardTarget.dispatch("keydown", keyEvent("KeyW"));

    expect(adapter.isHeld("KeyW")).toBe(true);

    keyboardTarget.dispatch("keydown", keyEvent("KeyW", true));
    keyboardTarget.dispatch("keydown", keyEvent("KeyW"));
    keyboardTarget.dispatch("keyup", keyEvent("KeyW"));
    keyboardTarget.dispatch("keyup", keyEvent("KeyW"));

    expect(adapter.isHeld("KeyW")).toBe(false);
    expect(events).toEqual([
      { kind: "key", sequence: 0, code: "KeyW", phase: "pressed" },
      { kind: "key", sequence: 1, code: "KeyW", phase: "released" },
    ]);
  });

  it("clears held keys on blur without fabricating release edges", () => {
    const { adapter, keyboardTarget, blurTarget, events } = createAdapter();

    adapter.attach();
    keyboardTarget.dispatch("keydown", keyEvent("KeyA"));
    keyboardTarget.dispatch("keydown", keyEvent("KeyD"));
    blurTarget.dispatch("blur");

    expect(adapter.isHeld("KeyA")).toBe(false);
    expect(adapter.isHeld("KeyD")).toBe(false);
    expect(events).toEqual([
      { kind: "key", sequence: 0, code: "KeyA", phase: "pressed" },
      { kind: "key", sequence: 1, code: "KeyD", phase: "pressed" },
      { kind: "reset", sequence: 2, scope: "keyboard", reason: "blur" },
    ]);
  });

  it("resets on hidden visibility and ignores physical keys until visible again", () => {
    const { adapter, keyboardTarget, visibilityTarget, events } = createAdapter();

    adapter.attach();
    keyboardTarget.dispatch("keydown", keyEvent("KeyQ"));

    visibilityTarget.visibilityState = "hidden";
    visibilityTarget.dispatch("visibilitychange");
    keyboardTarget.dispatch("keydown", keyEvent("KeyE"));
    keyboardTarget.dispatch("keyup", keyEvent("KeyQ"));

    expect(adapter.isHeld("KeyQ")).toBe(false);
    expect(adapter.isHeld("KeyE")).toBe(false);

    visibilityTarget.visibilityState = "visible";
    visibilityTarget.dispatch("visibilitychange");
    keyboardTarget.dispatch("keydown", keyEvent("KeyE"));

    expect(adapter.isHeld("KeyE")).toBe(true);
    expect(events).toEqual([
      { kind: "key", sequence: 0, code: "KeyQ", phase: "pressed" },
      { kind: "reset", sequence: 1, scope: "keyboard", reason: "hidden" },
      { kind: "key", sequence: 2, code: "KeyE", phase: "pressed" },
    ]);
  });

  it("clears state on detach and reattaches from a clean physical state", () => {
    const { adapter, keyboardTarget, events } = createAdapter();

    adapter.attach();
    keyboardTarget.dispatch("keydown", keyEvent("Space"));
    adapter.detach();

    expect(adapter.isHeld("Space")).toBe(false);

    keyboardTarget.dispatch("keydown", keyEvent("Space"));
    expect(adapter.isHeld("Space")).toBe(false);

    adapter.attach();
    keyboardTarget.dispatch("keydown", keyEvent("Space"));

    expect(adapter.isHeld("Space")).toBe(true);
    expect(events).toEqual([
      { kind: "key", sequence: 0, code: "Space", phase: "pressed" },
      { kind: "reset", sequence: 1, scope: "keyboard", reason: "detach" },
      { kind: "key", sequence: 2, code: "Space", phase: "pressed" },
    ]);
  });
});
