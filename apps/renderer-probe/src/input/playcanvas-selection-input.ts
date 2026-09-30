import {
  ActionBindingResolver,
  InputContextRouter,
  MonotonicInputSequence,
  type PhysicalInputEvent,
  type ScreenPosition,
} from "@drakeshard/foundation/input";
import {
  BrowserInputLifecycle,
  PointerBrowserAdapter,
} from "@drakeshard/foundation/input/browser";

const SELECT_ACTION = "playcanvas.select-world";
const GAMEPLAY_CONTEXT = "playcanvas-gameplay";
const MODAL_CONTEXT = "playcanvas-modal";

export interface PlayCanvasSelectionRequest {
  readonly sequence: number;
  readonly position: ScreenPosition;
}

export interface PlayCanvasSelectionInputOptions {
  readonly pointerTarget: HTMLElement;
  readonly onSelectionRequest: (request: PlayCanvasSelectionRequest) => void;
}

export interface PlayCanvasSelectionInput {
  setModalActive(active: boolean): void;
  activeContexts(): readonly string[];
  destroy(): void;
}

export function createPlayCanvasSelectionInput(
  options: PlayCanvasSelectionInputOptions,
): PlayCanvasSelectionInput {
  const sequence = new MonotonicInputSequence();
  const actions = new ActionBindingResolver([
    { action: SELECT_ACTION, binding: { kind: "pointer-button", button: 0 } },
  ]);
  const contexts = new InputContextRouter([
    {
      id: GAMEPLAY_CONTEXT,
      priority: 0,
      actions: [{ action: SELECT_ACTION }],
    },
    {
      id: MODAL_CONTEXT,
      priority: 100,
      actions: [{ action: SELECT_ACTION }],
    },
  ]);
  contexts.activate(GAMEPLAY_CONTEXT);

  const sink = (event: PhysicalInputEvent): void => {
    const transitions = actions.consume(event);

    if (event.kind !== "pointer-button" || event.phase !== "pressed") return;

    for (const transition of transitions) {
      for (const routed of contexts.route(transition)) {
        if (
          routed.context !== GAMEPLAY_CONTEXT ||
          routed.action !== SELECT_ACTION ||
          routed.phase !== "pressed"
        ) {
          continue;
        }

        options.onSelectionRequest({
          sequence: routed.sequence,
          position: {
            x: event.position.x,
            y: event.position.y,
          },
        });
      }
    }
  };

  const lifecycle = new BrowserInputLifecycle({
    focusTarget: window,
    visibilityTarget: document,
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
  pointer.attach();

  return {
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
      lifecycle.detach();
    },
  };
}
