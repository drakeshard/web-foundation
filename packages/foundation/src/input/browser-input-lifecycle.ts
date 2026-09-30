import type {
  BrowserInputEventTarget,
  BrowserVisibilityTarget,
} from "./browser-event-target.js";
import type {
  InputSequenceSource,
  PhysicalInputResetReason,
  PhysicalInputSink,
} from "./contracts.js";

export interface BrowserInputLifecycleOptions {
  readonly focusTarget: BrowserInputEventTarget;
  readonly visibilityTarget: BrowserVisibilityTarget;
  readonly sequence: InputSequenceSource;
  readonly sink: PhysicalInputSink;
}

export type BrowserInputResetListener = () => void;

export class BrowserInputLifecycle {
  readonly #focusTarget: BrowserInputEventTarget;
  readonly #visibilityTarget: BrowserVisibilityTarget;
  readonly #sequence: InputSequenceSource;
  readonly #sink: PhysicalInputSink;
  readonly #resetListeners = new Set<BrowserInputResetListener>();
  #focused = true;
  #active: boolean;
  #attached = false;

  readonly #onBlur: EventListener = () => {
    this.#focused = false;
    this.#suspend("blur");
  };

  readonly #onFocus: EventListener = () => {
    this.#focused = true;
    this.#refreshActive();
  };

  readonly #onVisibilityChange: EventListener = () => {
    if (this.#visibilityTarget.visibilityState === "hidden") {
      this.#suspend("hidden");
      return;
    }

    this.#refreshActive();
  };

  constructor(options: BrowserInputLifecycleOptions) {
    this.#focusTarget = options.focusTarget;
    this.#visibilityTarget = options.visibilityTarget;
    this.#sequence = options.sequence;
    this.#sink = options.sink;
    this.#active = this.#visibilityTarget.visibilityState !== "hidden";
  }

  get active(): boolean {
    return this.#active;
  }

  get attached(): boolean {
    return this.#attached;
  }

  attach(): void {
    if (this.#attached) return;

    this.#focusTarget.addEventListener("blur", this.#onBlur);
    this.#focusTarget.addEventListener("focus", this.#onFocus);
    this.#visibilityTarget.addEventListener("visibilitychange", this.#onVisibilityChange);
    this.#attached = true;

    if (this.#visibilityTarget.visibilityState === "hidden") {
      this.#active = false;
    } else {
      this.#refreshActive();
    }
  }

  detach(): void {
    if (!this.#attached) return;

    this.#focusTarget.removeEventListener("blur", this.#onBlur);
    this.#focusTarget.removeEventListener("focus", this.#onFocus);
    this.#visibilityTarget.removeEventListener("visibilitychange", this.#onVisibilityChange);
    this.#attached = false;

    if (this.#active) {
      this.#suspend("detach");
    }
  }

  subscribeReset(listener: BrowserInputResetListener): () => void {
    this.#resetListeners.add(listener);

    return () => {
      this.#resetListeners.delete(listener);
    };
  }

  #refreshActive(): void {
    this.#active = this.#focused && this.#visibilityTarget.visibilityState !== "hidden";
  }

  #suspend(reason: PhysicalInputResetReason): void {
    if (!this.#active) return;

    this.#active = false;

    for (const listener of this.#resetListeners) {
      listener();
    }

    this.#sink({
      kind: "reset",
      sequence: this.#sequence.next(),
      scope: "all",
      reason,
    });
  }
}
