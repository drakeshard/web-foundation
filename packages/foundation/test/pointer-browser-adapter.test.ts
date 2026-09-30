import { describe, expect, it } from "vitest";

import {
  type BrowserInputEventTarget,
  BrowserInputLifecycle,
  type BrowserVisibilityTarget,
  MonotonicInputSequence,
  type PhysicalInputEvent,
  PointerBrowserAdapter,
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

function pointerEvent(
  pointerId: number,
  button: number,
  clientX: number,
  clientY: number,
  pointerType = "mouse",
): Event {
  return { pointerId, button, clientX, clientY, pointerType } as unknown as Event;
}

function wheelEvent(deltaX: number, deltaY: number, deltaZ: number, deltaMode: number): Event {
  return { deltaX, deltaY, deltaZ, deltaMode } as unknown as Event;
}

function createAdapter() {
  const pointerTarget = new TestEventTarget();
  const wheelTarget = new TestEventTarget();
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
  const adapter = new PointerBrowserAdapter({
    pointerTarget,
    wheelTarget,
    lifecycle,
    sequence,
    sink,
  });
  lifecycle.attach();

  return { adapter, pointerTarget, wheelTarget, focusTarget, events };
}

describe("PointerBrowserAdapter", () => {
  it("attaches and detaches only pointer and wheel listeners explicitly", () => {
    const { adapter, pointerTarget, wheelTarget, events } = createAdapter();

    adapter.attach();
    adapter.attach();

    expect(pointerTarget.listenerCount("pointermove")).toBe(1);
    expect(pointerTarget.listenerCount("pointerdown")).toBe(1);
    expect(pointerTarget.listenerCount("pointerup")).toBe(1);
    expect(pointerTarget.listenerCount("pointercancel")).toBe(1);
    expect(pointerTarget.listenerCount("lostpointercapture")).toBe(1);
    expect(wheelTarget.listenerCount("wheel")).toBe(1);

    adapter.detach();
    adapter.detach();

    expect(pointerTarget.listenerCount("pointermove")).toBe(0);
    expect(pointerTarget.listenerCount("pointerdown")).toBe(0);
    expect(pointerTarget.listenerCount("pointerup")).toBe(0);
    expect(pointerTarget.listenerCount("pointercancel")).toBe(0);
    expect(pointerTarget.listenerCount("lostpointercapture")).toBe(0);
    expect(wheelTarget.listenerCount("wheel")).toBe(0);
    expect(events).toEqual([{ kind: "reset", sequence: 0, scope: "pointer", reason: "detach" }]);
  });

  it("normalizes pointer position and deterministic button transitions", () => {
    const { adapter, pointerTarget, events } = createAdapter();

    adapter.attach();
    pointerTarget.dispatch("pointermove", pointerEvent(4, -1, 12.5, 20.25, "pen"));
    pointerTarget.dispatch("pointerdown", pointerEvent(4, 0, 13, 21, "pen"));
    pointerTarget.dispatch("pointerdown", pointerEvent(4, 0, 14, 22, "pen"));
    pointerTarget.dispatch("pointerup", pointerEvent(4, 0, 15, 23, "pen"));
    pointerTarget.dispatch("pointerup", pointerEvent(4, 0, 16, 24, "pen"));

    expect(adapter.isHeld(4, 0)).toBe(false);
    expect(events).toEqual([
      {
        kind: "pointer-position",
        sequence: 0,
        pointerId: 4,
        pointerType: "pen",
        position: { x: 12.5, y: 20.25 },
      },
      {
        kind: "pointer-button",
        sequence: 1,
        pointerId: 4,
        pointerType: "pen",
        button: 0,
        phase: "pressed",
        position: { x: 13, y: 21 },
      },
      {
        kind: "pointer-button",
        sequence: 2,
        pointerId: 4,
        pointerType: "pen",
        button: 0,
        phase: "released",
        position: { x: 15, y: 23 },
      },
    ]);
  });

  it("clears all held buttons for a pointer on pointercancel", () => {
    const { adapter, pointerTarget, events } = createAdapter();

    adapter.attach();
    pointerTarget.dispatch("pointerdown", pointerEvent(7, 0, 10, 10));
    pointerTarget.dispatch("pointerdown", pointerEvent(7, 2, 10, 10));
    pointerTarget.dispatch("pointercancel", pointerEvent(7, -1, 10, 10));

    expect(adapter.isHeld(7, 0)).toBe(false);
    expect(adapter.isHeld(7, 2)).toBe(false);
    expect(events.at(-1)).toEqual({ kind: "pointer-cancel", sequence: 2, pointerId: 7 });
  });

  it("treats lost pointer capture with held buttons as cancellation", () => {
    const { adapter, pointerTarget, events } = createAdapter();

    adapter.attach();
    pointerTarget.dispatch("pointerdown", pointerEvent(9, 1, 2, 3, "touch"));
    pointerTarget.dispatch("lostpointercapture", pointerEvent(9, -1, 2, 3, "touch"));
    pointerTarget.dispatch("lostpointercapture", pointerEvent(9, -1, 2, 3, "touch"));

    expect(adapter.isHeld(9, 1)).toBe(false);
    expect(events.at(-1)).toEqual({ kind: "pointer-cancel", sequence: 1, pointerId: 9 });
  });

  it("preserves wheel sign and magnitude while normalizing deltaMode units", () => {
    const { adapter, wheelTarget, events } = createAdapter();

    adapter.attach();
    wheelTarget.dispatch("wheel", wheelEvent(1.5, -2.5, 0, 0));
    wheelTarget.dispatch("wheel", wheelEvent(-3, 4, 5, 1));
    wheelTarget.dispatch("wheel", wheelEvent(6, -7, 8, 2));
    wheelTarget.dispatch("wheel", wheelEvent(99, 99, 99, 9));

    expect(events).toEqual([
      { kind: "wheel", sequence: 0, deltaX: 1.5, deltaY: -2.5, deltaZ: 0, unit: "pixel" },
      { kind: "wheel", sequence: 1, deltaX: -3, deltaY: 4, deltaZ: 5, unit: "line" },
      { kind: "wheel", sequence: 2, deltaX: 6, deltaY: -7, deltaZ: 8, unit: "page" },
    ]);
  });

  it("clears held pointer state through shared lifecycle reset", () => {
    const { adapter, pointerTarget, focusTarget, events } = createAdapter();

    adapter.attach();
    pointerTarget.dispatch("pointerdown", pointerEvent(3, 0, 4, 5, "eraser"));
    focusTarget.dispatch("blur");

    expect(adapter.isHeld(3, 0)).toBe(false);
    expect(events.at(-1)).toEqual({
      kind: "reset",
      sequence: 1,
      scope: "all",
      reason: "blur",
    });
  });
});
