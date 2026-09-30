import type { BrowserInputEventTarget } from "./browser-event-target.js";
import type { BrowserInputLifecycle } from "./browser-input-lifecycle.js";
import type {
  InputSequenceSource,
  PhysicalInputSink,
  PointerButton,
  PointerId,
  PointerType,
  WheelUnit,
} from "./contracts.js";

export interface PointerBrowserAdapterOptions {
  readonly pointerTarget: BrowserInputEventTarget;
  readonly wheelTarget: BrowserInputEventTarget;
  readonly lifecycle: BrowserInputLifecycle;
  readonly sequence: InputSequenceSource;
  readonly sink: PhysicalInputSink;
}

export class PointerBrowserAdapter {
  readonly #pointerTarget: BrowserInputEventTarget;
  readonly #wheelTarget: BrowserInputEventTarget;
  readonly #lifecycle: BrowserInputLifecycle;
  readonly #sequence: InputSequenceSource;
  readonly #sink: PhysicalInputSink;
  readonly #heldButtons = new Map<PointerId, Set<PointerButton>>();
  #unsubscribeReset: (() => void) | undefined;
  #attached = false;

  readonly #onPointerMove: EventListener = (event) => {
    if (!this.#lifecycle.active) return;

    const pointerEvent = event as PointerEvent;
    this.#sink({
      kind: "pointer-position",
      sequence: this.#sequence.next(),
      pointerId: pointerEvent.pointerId,
      pointerType: normalizePointerType(pointerEvent.pointerType),
      position: { x: pointerEvent.clientX, y: pointerEvent.clientY },
    });
  };

  readonly #onPointerDown: EventListener = (event) => {
    if (!this.#lifecycle.active) return;

    const pointerEvent = event as PointerEvent;
    let held = this.#heldButtons.get(pointerEvent.pointerId);

    if (!held) {
      held = new Set();
      this.#heldButtons.set(pointerEvent.pointerId, held);
    }

    if (held.has(pointerEvent.button)) return;

    held.add(pointerEvent.button);
    this.#sink({
      kind: "pointer-button",
      sequence: this.#sequence.next(),
      pointerId: pointerEvent.pointerId,
      pointerType: normalizePointerType(pointerEvent.pointerType),
      button: pointerEvent.button,
      phase: "pressed",
      position: { x: pointerEvent.clientX, y: pointerEvent.clientY },
    });
  };

  readonly #onPointerUp: EventListener = (event) => {
    if (!this.#lifecycle.active) return;

    const pointerEvent = event as PointerEvent;
    const held = this.#heldButtons.get(pointerEvent.pointerId);

    if (!held?.delete(pointerEvent.button)) return;
    if (held.size === 0) this.#heldButtons.delete(pointerEvent.pointerId);

    this.#sink({
      kind: "pointer-button",
      sequence: this.#sequence.next(),
      pointerId: pointerEvent.pointerId,
      pointerType: normalizePointerType(pointerEvent.pointerType),
      button: pointerEvent.button,
      phase: "released",
      position: { x: pointerEvent.clientX, y: pointerEvent.clientY },
    });
  };

  readonly #onPointerCancel: EventListener = (event) => {
    if (!this.#lifecycle.active) return;

    const pointerEvent = event as PointerEvent;
    this.#heldButtons.delete(pointerEvent.pointerId);
    this.#emitPointerCancel(pointerEvent.pointerId);
  };

  readonly #onLostPointerCapture: EventListener = (event) => {
    if (!this.#lifecycle.active) return;

    const pointerEvent = event as PointerEvent;
    const held = this.#heldButtons.get(pointerEvent.pointerId);

    if (!held || held.size === 0) return;

    this.#heldButtons.delete(pointerEvent.pointerId);
    this.#emitPointerCancel(pointerEvent.pointerId);
  };

  readonly #onWheel: EventListener = (event) => {
    if (!this.#lifecycle.active) return;

    const wheelEvent = event as WheelEvent;
    const unit = normalizeWheelUnit(wheelEvent.deltaMode);

    if (!unit) return;

    this.#sink({
      kind: "wheel",
      sequence: this.#sequence.next(),
      deltaX: wheelEvent.deltaX,
      deltaY: wheelEvent.deltaY,
      deltaZ: wheelEvent.deltaZ,
      unit,
    });
  };

  constructor(options: PointerBrowserAdapterOptions) {
    this.#pointerTarget = options.pointerTarget;
    this.#wheelTarget = options.wheelTarget;
    this.#lifecycle = options.lifecycle;
    this.#sequence = options.sequence;
    this.#sink = options.sink;
  }

  get attached(): boolean {
    return this.#attached;
  }

  attach(): void {
    if (this.#attached) return;

    this.#pointerTarget.addEventListener("pointermove", this.#onPointerMove);
    this.#pointerTarget.addEventListener("pointerdown", this.#onPointerDown);
    this.#pointerTarget.addEventListener("pointerup", this.#onPointerUp);
    this.#pointerTarget.addEventListener("pointercancel", this.#onPointerCancel);
    this.#pointerTarget.addEventListener("lostpointercapture", this.#onLostPointerCapture);
    this.#wheelTarget.addEventListener("wheel", this.#onWheel);
    this.#unsubscribeReset = this.#lifecycle.subscribeReset(() => {
      this.#heldButtons.clear();
    });
    this.#attached = true;
  }

  detach(): void {
    if (!this.#attached) return;

    this.#pointerTarget.removeEventListener("pointermove", this.#onPointerMove);
    this.#pointerTarget.removeEventListener("pointerdown", this.#onPointerDown);
    this.#pointerTarget.removeEventListener("pointerup", this.#onPointerUp);
    this.#pointerTarget.removeEventListener("pointercancel", this.#onPointerCancel);
    this.#pointerTarget.removeEventListener("lostpointercapture", this.#onLostPointerCapture);
    this.#wheelTarget.removeEventListener("wheel", this.#onWheel);
    this.#unsubscribeReset?.();
    this.#unsubscribeReset = undefined;
    this.#attached = false;
    this.#heldButtons.clear();

    this.#sink({
      kind: "reset",
      sequence: this.#sequence.next(),
      scope: "pointer",
      reason: "detach",
    });
  }

  isHeld(pointerId: PointerId, button: PointerButton): boolean {
    return this.#heldButtons.get(pointerId)?.has(button) ?? false;
  }

  #emitPointerCancel(pointerId: PointerId): void {
    this.#sink({
      kind: "pointer-cancel",
      sequence: this.#sequence.next(),
      pointerId,
    });
  }
}

function normalizePointerType(pointerType: string): PointerType {
  switch (pointerType) {
    case "mouse":
    case "pen":
    case "touch":
      return pointerType;
    default:
      return "unknown";
  }
}

function normalizeWheelUnit(deltaMode: number): WheelUnit | undefined {
  switch (deltaMode) {
    case 0:
      return "pixel";
    case 1:
      return "line";
    case 2:
      return "page";
    default:
      return undefined;
  }
}
