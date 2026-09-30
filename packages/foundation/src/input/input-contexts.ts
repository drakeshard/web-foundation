import type { LogicalActionTransition } from "./action-mapping.js";
import type { LogicalActionId } from "./contracts.js";

export type InputContextId = string;

export interface InputContextActionRule {
  readonly action: LogicalActionId;
  readonly consume?: boolean;
}

export interface InputContextDefinition {
  readonly id: InputContextId;
  readonly priority: number;
  readonly actions: readonly InputContextActionRule[];
}

export interface ContextActionOwner {
  readonly context: InputContextId;
  readonly action: LogicalActionId;
  readonly consumes: boolean;
}

export interface ContextualActionTransition extends LogicalActionTransition {
  readonly context: InputContextId;
}

interface StoredContextDefinition {
  readonly id: InputContextId;
  readonly priority: number;
  readonly declarationOrder: number;
  readonly actions: readonly InputContextActionRule[];
}

const NO_OWNERS: readonly ContextActionOwner[] = [];
const NO_TRANSITIONS: readonly ContextualActionTransition[] = [];

export class InputContextRouter {
  readonly #definitions = new Map<InputContextId, StoredContextDefinition>();
  readonly #active = new Set<InputContextId>();

  constructor(definitions: readonly InputContextDefinition[] = []) {
    definitions.forEach((definition, declarationOrder) => {
      this.#addDefinition(definition, declarationOrder);
    });
  }

  activate(context: InputContextId): void {
    if (!this.#definitions.has(context)) {
      throw new RangeError(`Unknown input context: ${context}`);
    }

    this.#active.add(context);
  }

  deactivate(context: InputContextId): void {
    this.#active.delete(context);
  }

  isActive(context: InputContextId): boolean {
    return this.#active.has(context);
  }

  activeContexts(): readonly InputContextId[] {
    return this.#orderedActiveDefinitions().map((definition) => definition.id);
  }

  resolve(action: LogicalActionId): readonly ContextActionOwner[] {
    const owners: ContextActionOwner[] = [];

    for (const definition of this.#orderedActiveDefinitions()) {
      const rule = definition.actions.find((candidate) => candidate.action === action);
      if (!rule) continue;

      const consumes = rule.consume ?? true;
      owners.push({ context: definition.id, action, consumes });

      if (consumes) break;
    }

    return owners.length === 0 ? NO_OWNERS : owners;
  }

  route(transition: LogicalActionTransition): readonly ContextualActionTransition[] {
    const owners = this.resolve(transition.action);
    if (owners.length === 0) return NO_TRANSITIONS;

    return owners.map((owner) => ({
      context: owner.context,
      action: transition.action,
      sequence: transition.sequence,
      phase: transition.phase,
    }));
  }

  #orderedActiveDefinitions(): readonly StoredContextDefinition[] {
    return [...this.#active]
      .map((context) => this.#definitions.get(context))
      .filter((definition): definition is StoredContextDefinition => definition !== undefined)
      .sort(compareContexts);
  }

  #addDefinition(definition: InputContextDefinition, declarationOrder: number): void {
    if (this.#definitions.has(definition.id)) {
      throw new RangeError(`Duplicate input context: ${definition.id}`);
    }
    if (!Number.isFinite(definition.priority)) {
      throw new RangeError("Input context priority must be finite");
    }

    const seen = new Set<LogicalActionId>();
    const actions: InputContextActionRule[] = [];

    for (const rule of definition.actions) {
      if (seen.has(rule.action)) {
        throw new RangeError(
          `Duplicate action rule for ${rule.action} in input context ${definition.id}`,
        );
      }

      seen.add(rule.action);
      actions.push(rule.consume === undefined ? { action: rule.action } : { ...rule });
    }

    this.#definitions.set(definition.id, {
      id: definition.id,
      priority: definition.priority,
      declarationOrder,
      actions,
    });
  }
}

function compareContexts(left: StoredContextDefinition, right: StoredContextDefinition): number {
  if (left.priority !== right.priority) {
    return right.priority - left.priority;
  }

  return left.declarationOrder - right.declarationOrder;
}
