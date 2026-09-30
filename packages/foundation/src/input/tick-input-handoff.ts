import type {
  ActionBindingResolver,
  LogicalActionTransition,
} from "./action-mapping.js";
import type {
  InputCommand,
  InputSequence,
  LogicalActionState,
  PhysicalInputEvent,
} from "./contracts.js";
import type {
  ContextualActionTransition,
  InputContextId,
  InputContextRouter,
} from "./input-contexts.js";

export interface ContextualLogicalActionState extends LogicalActionState {
  readonly context: InputContextId;
}

export interface TickInputSnapshot<
  TCommandId extends string = string,
  TPayload = undefined,
> {
  readonly actions: readonly ContextualLogicalActionState[];
  readonly transitions: readonly ContextualActionTransition[];
  readonly commands: readonly InputCommand<TCommandId, TPayload>[];
}

export interface TickInputHandoffOptions {
  readonly actions: ActionBindingResolver;
  readonly contexts: InputContextRouter;
}

interface QueuedCommand<TCommandId extends string, TPayload> {
  readonly command: InputCommand<TCommandId, TPayload>;
  readonly insertionOrder: number;
}

interface MutableContextualActionState {
  readonly context: InputContextId;
  readonly action: string;
  held: boolean;
  pressed: boolean;
  released: boolean;
}

export class TickInputHandoff<
  TCommandId extends string = string,
  TPayload = undefined,
> {
  readonly #actions: ActionBindingResolver;
  readonly #contexts: InputContextRouter;
  readonly #pendingTransitions: LogicalActionTransition[] = [];
  readonly #pendingCommands: QueuedCommand<TCommandId, TPayload>[] = [];
  #lastPhysicalSequence: InputSequence | undefined;
  #nextCommandInsertionOrder = 0;

  constructor(options: TickInputHandoffOptions) {
    this.#actions = options.actions;
    this.#contexts = options.contexts;
  }

  ingest(event: PhysicalInputEvent): void {
    this.#assertNextPhysicalSequence(event.sequence);
    this.#lastPhysicalSequence = event.sequence;
    this.#pendingTransitions.push(...this.#actions.consume(event));
  }

  enqueueCommand(command: InputCommand<TCommandId, TPayload>): void {
    assertInputSequence(command.sequence);

    this.#pendingCommands.push({
      command,
      insertionOrder: this.#nextCommandInsertionOrder,
    });
    this.#nextCommandInsertionOrder += 1;
  }

  consumeTick(): TickInputSnapshot<TCommandId, TPayload> {
    const transitions = this.#routePendingTransitions();
    const actions = this.#buildActionStates(transitions);
    const commands = this.#consumeCommands();

    this.#pendingTransitions.length = 0;

    return { actions, transitions, commands };
  }

  #routePendingTransitions(): readonly ContextualActionTransition[] {
    const routed: ContextualActionTransition[] = [];

    for (const transition of this.#pendingTransitions) {
      routed.push(...this.#contexts.route(transition));
    }

    return routed;
  }

  #buildActionStates(
    transitions: readonly ContextualActionTransition[],
  ): readonly ContextualLogicalActionState[] {
    const states = new Map<InputContextId, Map<string, MutableContextualActionState>>();
    const orderedStates: MutableContextualActionState[] = [];

    for (const transition of transitions) {
      const state = getOrCreateState(states, orderedStates, transition.context, transition.action);

      if (transition.phase === "pressed") {
        state.pressed = true;
      } else {
        state.released = true;
      }
    }

    for (const action of this.#actions.heldActions()) {
      for (const owner of this.#contexts.resolve(action)) {
        getOrCreateState(states, orderedStates, owner.context, action).held = true;
      }
    }

    return orderedStates.map((state) => ({
      context: state.context,
      action: state.action,
      held: state.held,
      pressed: state.pressed,
      released: state.released,
    }));
  }

  #consumeCommands(): readonly InputCommand<TCommandId, TPayload>[] {
    const commands = [...this.#pendingCommands]
      .sort(
        (left, right) =>
          left.command.sequence - right.command.sequence ||
          left.insertionOrder - right.insertionOrder,
      )
      .map(({ command }) => command);

    this.#pendingCommands.length = 0;
    return commands;
  }

  #assertNextPhysicalSequence(sequence: InputSequence): void {
    assertInputSequence(sequence);

    if (this.#lastPhysicalSequence !== undefined && sequence <= this.#lastPhysicalSequence) {
      throw new RangeError("Physical input sequence must be strictly increasing");
    }
  }
}

function getOrCreateState(
  states: Map<InputContextId, Map<string, MutableContextualActionState>>,
  orderedStates: MutableContextualActionState[],
  context: InputContextId,
  action: string,
): MutableContextualActionState {
  let contextStates = states.get(context);

  if (!contextStates) {
    contextStates = new Map();
    states.set(context, contextStates);
  }

  let state = contextStates.get(action);

  if (!state) {
    state = {
      context,
      action,
      held: false,
      pressed: false,
      released: false,
    };
    contextStates.set(action, state);
    orderedStates.push(state);
  }

  return state;
}

function assertInputSequence(sequence: InputSequence): void {
  if (!Number.isSafeInteger(sequence) || sequence < 0) {
    throw new RangeError("Input sequence must be a non-negative safe integer");
  }
}
