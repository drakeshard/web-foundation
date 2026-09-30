import { describe, expect, it } from "vitest";

import {
  type BrowserInputEventTarget,
  BrowserInputLifecycle,
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
    for (const listener of this.#listeners.get(type) ?? []) listener(event);
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
  const focusTarget = new TestEventTarget();
  const visibilityTarget = new TestVisibilityTarget();
  const sequence = new MonotonicInputSequence();
  const events: PhysicalInputEvent[] = [];
  const sink = (event: PhysicalInputEvent) => events.push(event);
  const lifecycle = new BrowserInputLifecycle({
    focusTarget,
    visibilityTarget,
    sequence,
    sink,
  });
  const adapter = new KeyboardBrowserAdapter({
    keyboardTarget,
    lifecycle,
    sequence,
    sink,
  });
  lifecycle.attach();

  return { adapter, keyboardTarget, focusTarget, lifecycle, events };
}

describe("KeyboardBrowserAdapter", () => {
  it("attaches and detaches only keyboard listeners explicitly", () => {
    const { adapter, keyboardTarget, events } = createAdapter();

    adapter.attach();
    adapter.attach();

    expect(adapter.attached).toBe(true);
    expect(keyboardTarget.listenerCount("keydown")).toBe(1);
    expect(keyboardTarget.listenerCount("keyup")).toBe(1);

    adapter.detach();
    adapter.detach();

    expect(adapter.attached).toBe(false);
    expect(keyboardTarget.listenerCount("keydown")).toBe(0);
    expect(keyboardTarget.listenerCount("keyup")).toBe(0);
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

  it("clears held keys through shared lifecycle reset without fabricating releases", () => {
    const { adapter, keyboardTarget, focusTarget, events } = createAdapter();

    adapter.attach();
    keyboardTarget.dispatch("keydown", keyEvent("KeyA"));
    keyboardTarget.dispatch("keydown", keyEvent("KeyD"));
    focusTarget.dispatch("blur");

    expect(adapter.isHeld("KeyA")).toBe(false);
    expect(adapter.isHeld("KeyD")).toBe(false);
    expect(events).toEqual([
      { kind: "key", sequence: 0, code: "KeyA", phase: "pressed" },
      { kind: "key", sequence: 1, code: "KeyD", phase: "pressed" },
      { kind: "reset", sequence: 2, scope: "all", reason: "blur" },
    ]);
  });
});
