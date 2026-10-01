import {
  ActionBindingResolver,
  InputContextRouter,
  MonotonicInputSequence,
  type PhysicalInputEvent,
  type ScreenPosition,
  TickInputHandoff,
} from "@drakeshard/foundation/input";
import {
  BrowserInputLifecycle,
  KeyboardBrowserAdapter,
  PointerBrowserAdapter,
} from "@drakeshard/foundation/input/browser";
import type { ToyDomainCommand, ToyPoint } from "../domain/index.js";

type ProbeInputCommandId = "probe.pointer-position";

interface ProbePointerPayload {
  readonly position: ToyPoint;
}

const GAMEPLAY_CONTEXT = "gameplay";
const MODAL_CONTEXT = "modal";

const MOVE_ACTIONS = {
  "probe.move-left": { type: "move", dx: -1, dy: 0 },
  "probe.move-right": { type: "move", dx: 1, dy: 0 },
  "probe.move-up": { type: "move", dx: 0, dy: -1 },
  "probe.move-down": { type: "move", dx: 0, dy: 1 },
} as const satisfies Record<string, ToyDomainCommand>;

const POINTER_ACTION = "probe.pointer-primary";
const RANDOMIZE_ACTION = "probe.randomize-marker";

export interface ProbeInputController {
  consumeDomainCommands(): readonly ToyDomainCommand[];
  setModalActive(active: boolean): void;
  activeContexts(): readonly string[];
  destroy(): void;
}

export interface ProbeInputControllerOptions {
  readonly pointerTarget: HTMLElement;
  readonly toWorldPoint: (position: ScreenPosition) => ToyPoint | null;
  readonly onCommandsConsumed?: (commands: readonly ToyDomainCommand[]) => void;
}

export function createProbeInputController(
  options: ProbeInputControllerOptions,
): ProbeInputController {
  const sequence = new MonotonicInputSequence();
  const actions = new ActionBindingResolver([
    { action: "probe.move-left", binding: { kind: "key", code: "KeyA" } },
    { action: "probe.move-right", binding: { kind: "key", code: "KeyD" } },
    { action: "probe.move-up", binding: { kind: "key", code: "KeyW" } },
    { action: "probe.move-down", binding: { kind: "key", code: "KeyS" } },
    { action: POINTER_ACTION, binding: { kind: "pointer-button", button: 0 } },
    { action: RANDOMIZE_ACTION, binding: { kind: "key", code: "KeyR" } },
  ]);
  const contexts = new InputContextRouter([
    {
      id: GAMEPLAY_CONTEXT,
      priority: 0,
      actions: [
        { action: "probe.move-left" },
        { action: "probe.move-right" },
        { action: "probe.move-up" },
        { action: "probe.move-down" },
        { action: POINTER_ACTION },
        { action: RANDOMIZE_ACTION },
      ],
    },
    {
      id: MODAL_CONTEXT,
      priority: 100,
      actions: [
        { action: "probe.move-left" },
        { action: "probe.move-right" },
        { action: "probe.move-up" },
        { action: "probe.move-down" },
        { action: POINTER_ACTION },
        { action: RANDOMIZE_ACTION },
      ],
    },
  ]);
  contexts.activate(GAMEPLAY_CONTEXT);

  const handoff = new TickInputHandoff<ProbeInputCommandId, ProbePointerPayload>({
    actions,
    contexts,
  });

  const sink = (event: PhysicalInputEvent): void => {
    handoff.ingest(event);

    if (event.kind === "pointer-button" && event.button === 0 && event.phase === "pressed") {
      const position = options.toWorldPoint(event.position);
      if (!position) return;

      handoff.enqueueCommand({
        id: "probe.pointer-position",
        sequence: event.sequence,
        payload: { position },
      });
    }
  };

  const lifecycle = new BrowserInputLifecycle({
    focusTarget: window,
    visibilityTarget: document,
    sequence,
    sink,
  });
  const keyboard = new KeyboardBrowserAdapter({
    keyboardTarget: window,
    lifecycle,
    sequence,
    sink,
  });
  const pointer = new PointerBrowserAdapter({
    pointerTarget: options.pointerTarget,
    wheelTarget: options.pointerTarget,
    lifecycle,
    sequence,
    sink,
  });

  lifecycle.attach();
  keyboard.attach();
  pointer.attach();

  return {
    consumeDomainCommands(): readonly ToyDomainCommand[] {
      const snapshot = handoff.consumeTick();
      const commands: ToyDomainCommand[] = [];

      for (const action of snapshot.actions) {
        if (action.context !== GAMEPLAY_CONTEXT) continue;

        if (action.action === RANDOMIZE_ACTION && action.pressed) {
          commands.push({ type: "randomize-marker" });
          continue;
        }

        if (!action.held) continue;

        const command = MOVE_ACTIONS[action.action as keyof typeof MOVE_ACTIONS];
        if (command) commands.push(command);
      }

      for (const transition of snapshot.transitions) {
        if (
          transition.context !== GAMEPLAY_CONTEXT ||
          transition.action !== POINTER_ACTION ||
          transition.phase !== "pressed"
        ) {
          continue;
        }

        const delivered = snapshot.commands.find(
          (command) =>
            command.id === "probe.pointer-position" && command.sequence === transition.sequence,
        );
        if (!delivered) continue;

        commands.push({
          type: "set-marker",
          position: delivered.payload.position,
        });
      }

      options.onCommandsConsumed?.(commands);
      return commands;
    },

    setModalActive(active: boolean): void {
      if (active) {
        contexts.activate(MODAL_CONTEXT);
      } else {
        contexts.deactivate(MODAL_CONTEXT);
      }
    },

    activeContexts(): readonly string[] {
      return contexts.activeContexts();
    },

    destroy(): void {
      pointer.detach();
      keyboard.detach();
      lifecycle.detach();
    },
  };
}
