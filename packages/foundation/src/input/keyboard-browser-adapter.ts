import type { BrowserInputEventTarget } from "./browser-event-target.js";
import type { BrowserInputLifecycle } from "./browser-input-lifecycle.js";
import type {
  InputSequenceSource,
  PhysicalInputSink,
  PhysicalKeyCode,
} from "./contracts.js";

export interface KeyboardBrowserAdapterOptions {
  readonly keyboardTarget: BrowserInputEventTarget;
  readonly lifecycle: BrowserInputLifecycle;
  readonly sequence: InputSequenceSource;
  readonly sink: PhysicalInputSink;
}

export class KeyboardBrowserAdapter {
  readonly #keyboardTarget: BrowserInputEventTarget;
  readonly #lifecycle: BrowserInputLifecycle;
  readonly #sequence: InputSequenceSource;
  readonly #sink: PhysicalInputSink;
  readonly #heldKeys = new Set<PhysicalKeyCode>();
  #unsubscribeReset: (() => void) | undefined;
  #attached = false;

  readonly #onKeyDown: EventListener = (event) => {
    if (!this.#lifecycle.active) return;

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
    if (!this.#lifecycle.active) return;

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

  constructor(options: KeyboardBrowserAdapterOptions) {
    this.#keyboardTarget = options.keyboardTarget;
    this.#lifecycle = options.lifecycle;
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
    this.#unsubscribeReset = this.#lifecycle.subscribeReset(() => {
      this.#heldKeys.clear();
    });
    this.#attached = true;
  }

  detach(): void {
    if (!this.#attached) return;

    this.#keyboardTarget.removeEventListener("keydown", this.#onKeyDown);
    this.#keyboardTarget.removeEventListener("keyup", this.#onKeyUp);
    this.#unsubscribeReset?.();
    this.#unsubscribeReset = undefined;
    this.#attached = false;
    this.#heldKeys.clear();

    this.#sink({
      kind: "reset",
      sequence: this.#sequence.next(),
      scope: "keyboard",
      reason: "detach",
    });
  }

  isHeld(code: PhysicalKeyCode): boolean {
    return this.#heldKeys.has(code);
  }
}
