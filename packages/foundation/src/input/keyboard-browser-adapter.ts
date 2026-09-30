import type {
  InputSequenceSource,
  PhysicalInputResetReason,
  PhysicalInputSink,
  PhysicalKeyCode,
} from "./contracts.js";
import type { BrowserInputEventTarget, BrowserVisibilityTarget } from "./browser-event-target.js";

export interface KeyboardBrowserAdapterOptions {
  readonly keyboardTarget: BrowserInputEventTarget;
  readonly blurTarget: BrowserInputEventTarget;
  readonly visibilityTarget: BrowserVisibilityTarget;
  readonly sequence: InputSequenceSource;
  readonly sink: PhysicalInputSink;
}

export class KeyboardBrowserAdapter {
  readonly #keyboardTarget: BrowserInputEventTarget;
  readonly #blurTarget: BrowserInputEventTarget;
  readonly #visibilityTarget: BrowserVisibilityTarget;
  readonly #sequence: InputSequenceSource;
  readonly #sink: PhysicalInputSink;
  readonly #heldKeys = new Set<PhysicalKeyCode>();
  #attached = false;

  readonly #onKeyDown: EventListener = (event) => {
    if (this.#visibilityTarget.visibilityState === "hidden") return;

    const keyboardEvent = event as KeyboardEvent;
    const code = keyboardEvent.code;

    if (keyboardEvent.repeat || this.#heldKeys.has(code)) return;

    this.#heldKeys.add(code);
    this.#sink({
      kind: "key",
      sequence: this.#sequence.next(),
      code,
      phase: "pressed",
    });
  };

  readonly #onKeyUp: EventListener = (event) => {
    if (this.#visibilityTarget.visibilityState === "hidden") return;

    const keyboardEvent = event as KeyboardEvent;
    const code = keyboardEvent.code;

    if (!this.#heldKeys.delete(code)) return;

    this.#sink({
      kind: "key",
      sequence: this.#sequence.next(),
      code,
      phase: "released",
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

  constructor(options: KeyboardBrowserAdapterOptions) {
    this.#keyboardTarget = options.keyboardTarget;
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

    this.#keyboardTarget.addEventListener("keydown", this.#onKeyDown);
    this.#keyboardTarget.addEventListener("keyup", this.#onKeyUp);
    this.#blurTarget.addEventListener("blur", this.#onBlur);
    this.#visibilityTarget.addEventListener("visibilitychange", this.#onVisibilityChange);
    this.#attached = true;

    if (this.#visibilityTarget.visibilityState === "hidden") {
      this.#reset("hidden");
    }
  }

  detach(): void {
    if (!this.#attached) return;

    this.#keyboardTarget.removeEventListener("keydown", this.#onKeyDown);
    this.#keyboardTarget.removeEventListener("keyup", this.#onKeyUp);
    this.#blurTarget.removeEventListener("blur", this.#onBlur);
    this.#visibilityTarget.removeEventListener("visibilitychange", this.#onVisibilityChange);
    this.#attached = false;
    this.#reset("detach");
  }

  isHeld(code: PhysicalKeyCode): boolean {
    return this.#heldKeys.has(code);
  }

  #reset(reason: PhysicalInputResetReason): void {
    this.#heldKeys.clear();
    this.#sink({
      kind: "reset",
      sequence: this.#sequence.next(),
      scope: "keyboard",
      reason,
    });
  }
}
