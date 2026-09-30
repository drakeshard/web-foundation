import type {
  DigitalInputPhase,
  InputSequence,
  LogicalActionId,
  PhysicalInputEvent,
  PhysicalKeyCode,
  PhysicalPointerButtonInput,
  PointerButton,
  PointerId,
  PointerType,
} from "./contracts.js";

export interface KeyPhysicalBinding {
  readonly kind: "key";
  readonly code: PhysicalKeyCode;
}

export interface PointerButtonPhysicalBinding {
  readonly kind: "pointer-button";
  readonly button: PointerButton;
  readonly pointerType?: PointerType;
}

export type DigitalPhysicalBinding = KeyPhysicalBinding | PointerButtonPhysicalBinding;

export interface ActionBinding {
  readonly action: LogicalActionId;
  readonly binding: DigitalPhysicalBinding;
}

export interface LogicalActionTransition {
  readonly action: LogicalActionId;
  readonly sequence: InputSequence;
  readonly phase: DigitalInputPhase;
}

export interface ActiveKeyActionSource {
  readonly kind: "key";
  readonly code: PhysicalKeyCode;
}

export interface ActivePointerButtonActionSource {
  readonly kind: "pointer-button";
  readonly pointerId: PointerId;
  readonly pointerType: PointerType;
  readonly button: PointerButton;
}

export type ActiveActionSourceIdentity =
  | ActiveKeyActionSource
  | ActivePointerButtonActionSource;

export interface ActiveActionSource {
  readonly source: ActiveActionSourceIdentity;
  readonly pressedSequence: InputSequence;
  readonly actions: readonly LogicalActionId[];
}

interface StoredActionSource {
  readonly key: string;
  readonly source: ActiveActionSourceIdentity;
  readonly pressedSequence: InputSequence;
  readonly actions: readonly LogicalActionId[];
}

const NO_TRANSITIONS: readonly LogicalActionTransition[] = [];

export class ActionBindingResolver {
  #bindings: readonly ActionBinding[] = [];
  #actionOrder: readonly LogicalActionId[] = [];
  readonly #activeSources = new Map<string, StoredActionSource>();
  readonly #activeCounts = new Map<LogicalActionId, number>();

  constructor(bindings: readonly ActionBinding[] = []) {
    this.replaceBindings(bindings);
  }

  replaceBindings(bindings: readonly ActionBinding[]): void {
    this.#bindings = bindings.map(cloneActionBinding);
    this.#actionOrder = collectActionOrder(this.#bindings);
    this.#activeSources.clear();
    this.#activeCounts.clear();
  }

  consume(event: PhysicalInputEvent): readonly LogicalActionTransition[] {
    switch (event.kind) {
      case "key":
        return event.phase === "pressed"
          ? this.#pressKey(event.code, event.sequence)
          : this.#releaseSource(keySourceKey(event.code), event.sequence);
      case "pointer-button":
        return event.phase === "pressed"
          ? this.#pressPointer(event)
          : this.#releaseSource(pointerSourceKey(event.pointerId, event.button), event.sequence);
      case "pointer-cancel":
        this.#invalidatePointer(event.pointerId);
        return NO_TRANSITIONS;
      case "reset":
        this.#invalidateScope(event.scope);
        return NO_TRANSITIONS;
      case "pointer-position":
      case "wheel":
        return NO_TRANSITIONS;
    }
  }

  isHeld(action: LogicalActionId): boolean {
    return (this.#activeCounts.get(action) ?? 0) > 0;
  }

  heldActions(): readonly LogicalActionId[] {
    return this.#actionOrder.filter((action) => this.isHeld(action));
  }

  activeSources(): readonly ActiveActionSource[] {
    return [...this.#activeSources.values()]
      .sort((left, right) => left.pressedSequence - right.pressedSequence)
      .map((entry) => ({
        source: cloneSource(entry.source),
        pressedSequence: entry.pressedSequence,
        actions: [...entry.actions],
      }));
  }

  #pressKey(code: PhysicalKeyCode, sequence: InputSequence): readonly LogicalActionTransition[] {
    const key = keySourceKey(code);

    if (this.#activeSources.has(key)) return NO_TRANSITIONS;

    const actions = this.#matchingKeyActions(code);
    if (actions.length === 0) return NO_TRANSITIONS;

    const source: StoredActionSource = {
      key,
      source: { kind: "key", code },
      pressedSequence: sequence,
      actions,
    };

    return this.#activateSource(source, sequence);
  }

  #pressPointer(event: PhysicalPointerButtonInput): readonly LogicalActionTransition[] {
    const key = pointerSourceKey(event.pointerId, event.button);

    if (this.#activeSources.has(key)) return NO_TRANSITIONS;

    const actions = this.#matchingPointerActions(event.button, event.pointerType);
    if (actions.length === 0) return NO_TRANSITIONS;

    const source: StoredActionSource = {
      key,
      source: {
        kind: "pointer-button",
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        button: event.button,
      },
      pressedSequence: event.sequence,
      actions,
    };

    return this.#activateSource(source, event.sequence);
  }

  #activateSource(
    source: StoredActionSource,
    sequence: InputSequence,
  ): readonly LogicalActionTransition[] {
    this.#activeSources.set(source.key, source);
    const transitions: LogicalActionTransition[] = [];

    for (const action of source.actions) {
      const activeCount = this.#activeCounts.get(action) ?? 0;
      this.#activeCounts.set(action, activeCount + 1);

      if (activeCount === 0) {
        transitions.push({ action, sequence, phase: "pressed" });
      }
    }

    return transitions.length === 0 ? NO_TRANSITIONS : transitions;
  }

  #releaseSource(key: string, sequence: InputSequence): readonly LogicalActionTransition[] {
    const source = this.#activeSources.get(key);
    if (!source) return NO_TRANSITIONS;

    this.#activeSources.delete(key);
    const transitions: LogicalActionTransition[] = [];

    for (const action of source.actions) {
      const activeCount = this.#activeCounts.get(action) ?? 0;

      if (activeCount <= 1) {
        this.#activeCounts.delete(action);
        transitions.push({ action, sequence, phase: "released" });
      } else {
        this.#activeCounts.set(action, activeCount - 1);
      }
    }

    return transitions.length === 0 ? NO_TRANSITIONS : transitions;
  }

  #invalidatePointer(pointerId: PointerId): void {
    for (const source of [...this.#activeSources.values()]) {
      if (source.source.kind === "pointer-button" && source.source.pointerId === pointerId) {
        this.#invalidateSource(source);
      }
    }
  }

  #invalidateScope(scope: "keyboard" | "pointer" | "all"): void {
    for (const source of [...this.#activeSources.values()]) {
      if (
        scope === "all" ||
        (scope === "keyboard" && source.source.kind === "key") ||
        (scope === "pointer" && source.source.kind === "pointer-button")
      ) {
        this.#invalidateSource(source);
      }
    }
  }

  #invalidateSource(source: StoredActionSource): void {
    this.#activeSources.delete(source.key);

    for (const action of source.actions) {
      const activeCount = this.#activeCounts.get(action) ?? 0;

      if (activeCount <= 1) {
        this.#activeCounts.delete(action);
      } else {
        this.#activeCounts.set(action, activeCount - 1);
      }
    }
  }

  #matchingKeyActions(code: PhysicalKeyCode): readonly LogicalActionId[] {
    const actions: LogicalActionId[] = [];
    const seen = new Set<LogicalActionId>();

    for (const mapping of this.#bindings) {
      if (mapping.binding.kind !== "key" || mapping.binding.code !== code) continue;
      if (seen.has(mapping.action)) continue;

      seen.add(mapping.action);
      actions.push(mapping.action);
    }

    return actions;
  }

  #matchingPointerActions(
    button: PointerButton,
    pointerType: PointerType,
  ): readonly LogicalActionId[] {
    const actions: LogicalActionId[] = [];
    const seen = new Set<LogicalActionId>();

    for (const mapping of this.#bindings) {
      if (mapping.binding.kind !== "pointer-button") continue;
      if (mapping.binding.button !== button) continue;
      if (mapping.binding.pointerType !== undefined && mapping.binding.pointerType !== pointerType) {
        continue;
      }
      if (seen.has(mapping.action)) continue;

      seen.add(mapping.action);
      actions.push(mapping.action);
    }

    return actions;
  }
}

function cloneActionBinding(mapping: ActionBinding): ActionBinding {
  if (mapping.binding.kind === "key") {
    return {
      action: mapping.action,
      binding: { kind: "key", code: mapping.binding.code },
    };
  }

  const binding: PointerButtonPhysicalBinding =
    mapping.binding.pointerType === undefined
      ? { kind: "pointer-button", button: mapping.binding.button }
      : {
          kind: "pointer-button",
          button: mapping.binding.button,
          pointerType: mapping.binding.pointerType,
        };

  return { action: mapping.action, binding };
}

function collectActionOrder(bindings: readonly ActionBinding[]): readonly LogicalActionId[] {
  const order: LogicalActionId[] = [];
  const seen = new Set<LogicalActionId>();

  for (const mapping of bindings) {
    if (seen.has(mapping.action)) continue;
    seen.add(mapping.action);
    order.push(mapping.action);
  }

  return order;
}

function cloneSource(source: ActiveActionSourceIdentity): ActiveActionSourceIdentity {
  return source.kind === "key"
    ? { kind: "key", code: source.code }
    : {
        kind: "pointer-button",
        pointerId: source.pointerId,
        pointerType: source.pointerType,
        button: source.button,
      };
}

function keySourceKey(code: PhysicalKeyCode): string {
  return `key:${code}`;
}

function pointerSourceKey(pointerId: PointerId, button: PointerButton): string {
  return `pointer:${pointerId}:${button}`;
}
