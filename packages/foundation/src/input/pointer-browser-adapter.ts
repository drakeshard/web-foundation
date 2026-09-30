import type { BrowserInputEventTarget, BrowserVisibilityTarget } from "./browser-event-target.js";
import type {
  InputSequenceSource,
  PhysicalInputResetReason,
  PhysicalInputSink,
  PointerButton,
  PointerId,
  PointerType,
  WheelUnit,
} from "./contracts.js";

export interface PointerBrowserAdapterOptions {
  readonly pointerTarget: BrowserInputEventTarget;
  readonly wheelTarget: BrowserInputEventTarget;
  readonly blurTarget: BrowserInputEventTarget;
  readonly visibilityTarget: BrowserVisibilityTarget;
  readonly sequence: InputSequenceSource;
  readonly sink: PhysicalInputSink;
}

export class PointerBrowserAdapter {
  readonly #pointerTarget: BrowserInputEventTarget;
  readonly #wheelTarget: BrowserInputEventTarget;
  readonly #blurTarget: BrowserInputEventTarget;
  readonly #visibilityTarget: BrowserVisibilityTarget;
  readonly #sequence: InputSequenceSource;
  readonly #sink: PhysicalInputSink;
  readonly #heldButtons = new Map<PointerId, Set<PointerButton>>();
  #attached = false;

  readonly #onPointerMove: EventListener = (event) => {
    if (this.#visibilityTarget.visibilityState === "hidden") return;

    const pointerEvent = event as PointerEvent;
    this.#sink({
      kind: "pointer-position",
      sequence: this.#sequence.next(),
      pointerId: pointerEvent.pointerId,
      pointerType: normalizePointerType(pointerEvent.pointerType),
      position: {
        x: pointerEvent.clientX,
        y: pointerEvent.clientY,
      },
    });
  };

  readonly #onPointerDown: EventListener = (event) => {
    if (this.#visibilityTarget.visibilityState === "hidden") return;

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
      position: {
        x: pointerEvent.clientX,
        y: pointerEvent.clientY,
      },
    });
  };

  readonly #onPointerUp: EventListener = (event) => {
    if (this.#visibilityTarget.visibilityState === "hidden") return;

    const pointerEvent = event as PointerEvent;
    const held = this.#heldButtons.get(pointerEvent.pointerId);

    if (!held?.delete(pointerEvent.button)) return;

    if (held.size === 0) {
      this.#heldButtons.delete(pointerEvent.pointerId);
    }

    this.#sink({
      kind: "pointer-button",
      sequence: this.#sequence.next(),
      pointerId: pointerEvent.pointerId,
      pointerType: normalizePointerType(pointerEvent.pointerType),
      button: pointerEvent.button,
      phase: "released",
      position: {
        x: pointerEvent.clientX,
        y: pointerEvent.clientY,
      },
    });
  };

  readonly #onPointerCancel: EventListener = (event) => {
    if (this.#visibilityTarget.visibilityState === "hidden") return;

    const pointerEvent = event as PointerEvent;
    this.#heldButtons.delete(pointerEvent.pointerId);
    this.#emitPointerCancel(pointerEvent.pointerId);
  };

  readonly #onLostPointerCapture: EventListener = (event) => {
    if (this.#visibilityTarget.visibilityState === "hidden") return;

    const pointerEvent = event as PointerEvent;
    const held = this.#heldButtons.get(pointerEvent.pointerId);

    if (!held || held.size === 0) return;

    this.#heldButtons.delete(pointerEvent.pointerId);
    this.#emitPointerCancel(pointerEvent.pointerId);
  };

  readonly #onWheel: EventListener = (event) => {
    if (this.#visibilityTarget.visibilityState === "hidden") return;

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

  readonly #onBlur: EventListener = () => {
    this.#reset("blur");
  };

  readonly #onVisibilityChange: EventListener = () => {
    if (this.#visibilityTarget.visibilityState === "hidden") {
      this.#reset("hidden");
    }
  };

  constructor(options: PointerBrowserAdapterOptions) {
    this.#pointerTarget = options.pointerTarget;
    this.#wheelTarget = options.wheelTarget;
    this.#blurTarget = options.blurTarget;
    this.#visibilityTarget = options.visibilityTarget;
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
    this.#blurTarget.addEventListener("blur", this.#onBlur);
    this.#visibilityTarget.addEventListener("visibilitychange", this.#onVisibilityChange);
    this.#attached = true;

    if (this.#visibilityTarget.visibilityState === "hidden") {
      this.#reset("hidden");
    }
  }

  detach(): void {
    if (!this.#attached) return;

    this.#pointerTarget.removeEventListener("pointermove", this.#onPointerMove);
    this.#pointerTarget.removeEventListener("pointerdown", this.#onPointerDown);
    this.#pointerTarget.removeEventListener("pointerup", this.#onPointerUp);
    this.#pointerTarget.removeEventListener("pointercancel", this.#onPointerCancel);
    this.#pointerTarget.removeEventListener("lostpointercapture", this.#onLostPointerCapture);
    this.#wheelTarget.removeEventListener("wheel", this.#onWheel);
    this.#blurTarget.removeEventListener("blur", this.#onBlur);
    this.#visibilityTarget.removeEventListener("visibilitychange", this.#onVisibilityChange);
    this.#attached = false;
    this.#reset("detach");
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

  #reset(reason: PhysicalInputResetReason): void {
    this.#heldButtons.clear();
    this.#sink({
      kind: "reset",
      sequence: this.#sequence.next(),
      scope: "pointer",
      reason,
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
