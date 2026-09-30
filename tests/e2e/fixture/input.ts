import {
  BrowserInputLifecycle,
  KeyboardBrowserAdapter,
  PointerBrowserAdapter,
} from "../../../packages/foundation/src/input/browser/index.ts";
import {
  ActionBindingResolver,
  InputContextRouter,
  MonotonicInputSequence,
  type PhysicalInputEvent,
  TickInputHandoff,
  type TickInputSnapshot,
} from "../../../packages/foundation/src/input/index.ts";

type FixtureCommandId = "fixture.command";
interface FixtureCommandPayload {
  readonly source: "browser-fixture";
}

const surface = getRequiredElement<HTMLElement>("[data-testid='input-surface']");
const physicalLog = getRequiredElement<HTMLElement>("[data-testid='physical-log']");
const tickSnapshot = getRequiredElement<HTMLElement>("[data-testid='tick-snapshot']");
const lifecycleState = getRequiredElement<HTMLElement>("[data-testid='lifecycle-state']");
const contextState = getRequiredElement<HTMLElement>("[data-testid='context-state']");

const sequence = new MonotonicInputSequence();
const actions = new ActionBindingResolver([
  { action: "action.primary", binding: { kind: "key", code: "KeyQ" } },
  { action: "action.pointer", binding: { kind: "pointer-button", button: 0 } },
]);
const contexts = new InputContextRouter([
  {
    id: "gameplay",
    priority: 0,
    actions: [{ action: "action.primary" }, { action: "action.pointer" }],
  },
  {
    id: "modal",
    priority: 100,
    actions: [{ action: "action.primary" }],
  },
]);
contexts.activate("gameplay");

const handoff = new TickInputHandoff<FixtureCommandId, FixtureCommandPayload>({
  actions,
  contexts,
});

const physicalEvents: PhysicalInputEvent[] = [];
let lastSnapshot: TickInputSnapshot<FixtureCommandId, FixtureCommandPayload> | null = null;

const sink = (event: PhysicalInputEvent): void => {
  physicalEvents.push(event);
  handoff.ingest(event);
  render();
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
  pointerTarget: surface,
  wheelTarget: surface,
  lifecycle,
  sequence,
  sink,
});

lifecycle.attach();
keyboard.attach();
pointer.attach();

getRequiredElement<HTMLButtonElement>("[data-testid='consume-tick']").addEventListener(
  "click",
  () => {
    lastSnapshot = handoff.consumeTick();
    render();
  },
);

getRequiredElement<HTMLButtonElement>("[data-testid='activate-modal']").addEventListener(
  "click",
  () => {
    contexts.activate("modal");
    render();
  },
);

getRequiredElement<HTMLButtonElement>("[data-testid='deactivate-modal']").addEventListener(
  "click",
  () => {
    contexts.deactivate("modal");
    render();
  },
);

getRequiredElement<HTMLButtonElement>("[data-testid='enqueue-command']").addEventListener(
  "click",
  () => {
    handoff.enqueueCommand({
      id: "fixture.command",
      sequence: sequence.next(),
      payload: { source: "browser-fixture" },
    });
    render();
  },
);

render();

function render(): void {
  physicalLog.textContent = JSON.stringify(physicalEvents);
  tickSnapshot.textContent = JSON.stringify(lastSnapshot);
  lifecycleState.textContent = lifecycle.active ? "active" : "inactive";
  contextState.textContent = JSON.stringify(contexts.activeContexts());
}

function getRequiredElement<TElement extends Element>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector);

  if (!element) {
    throw new Error(`Missing browser input fixture element: ${selector}`);
  }

  return element;
}
