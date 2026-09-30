import type { ToyDomainCommand, ToyDomainState } from "./domain/index.js";
import { restoreToyDomain } from "./domain/index.js";
import { createProbeInputController, type ProbeInputController } from "./input/probe-input.js";
import { createProbePersistence } from "./persistence/probe-persistence.js";
import { createPhaserProbe } from "./presentation/phaser-probe.js";
import { clientPositionToToyPoint } from "./presentation/screen-to-world.js";
import { createProbeSimulation, type ProbeSimulationFrame } from "./simulation/probe-simulation.js";
import { createProbeUiBridge, type ProbeUiBridge, type ProbeUiIntent } from "./ui/probe-ui.js";

let input: ProbeInputController | undefined;
let ui: ProbeUiBridge | undefined;
let pendingUiCommands: ToyDomainCommand[] = [];

const persistence = createProbePersistence();
let simulation = createSimulation();

const parent = getRequiredElement<HTMLElement>("#renderer-probe");
const uiParent = getRequiredElement<HTMLElement>("#probe-ui");
const status = getRequiredElement<HTMLOutputElement>("[data-testid='renderer-probe-status']");
const persistenceState = getRequiredElement<HTMLOutputElement>("[data-testid='persistence-state']");
const domainState = getRequiredElement<HTMLElement>("[data-testid='domain-state']");
const inputContexts = getRequiredElement<HTMLElement>("[data-testid='input-contexts']");
const frameState = getRequiredElement<HTMLElement>("[data-testid='frame-state']");

ui = createProbeUiBridge({
  parent: uiParent,
  initialState: simulation.state,
  onIntent: handleUiIntent,
});

if (document.visibilityState === "hidden") simulation.pause();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    simulation.pause();
  } else {
    simulation.resume();
  }
});

createPhaserProbe({
  parent,
  readState: () => simulation.state,
  advanceFrame: (frameDeltaMs) => {
    const frame = simulation.advanceFrame(frameDeltaMs);
    ui?.publishDomainState(frame.state);
    renderDebugState(frame);
    return frame;
  },
  onReady: (canvas) => {
    input = createProbeInputController({
      pointerTarget: canvas,
      toWorldPoint: (position) =>
        clientPositionToToyPoint(position, canvas, simulation.state.world),
    });
    status.value = "phaser-probe-ready";
    ui?.publishDomainState(simulation.state);
    renderDebugState();
  },
});

getRequiredElement<HTMLButtonElement>("[data-testid='save-probe']").addEventListener(
  "click",
  async () => {
    const result = await persistence.save(simulation.state);
    persistenceState.value = JSON.stringify(result.ok ? { ok: true, value: "saved" } : result);
  },
);

getRequiredElement<HTMLButtonElement>("[data-testid='load-probe']").addEventListener(
  "click",
  async () => {
    const result = await persistence.load();

    if (!result.ok) {
      persistenceState.value = JSON.stringify(result);
      return;
    }

    if (result.value === null) {
      persistenceState.value = JSON.stringify({ ok: true, value: "empty" });
      return;
    }

    pendingUiCommands = [];
    input?.consumeDomainCommands();
    simulation = createSimulation(restoreToyDomain(result.value));

    if (document.visibilityState === "hidden") {
      simulation.pause();
    }

    ui?.publishDomainState(simulation.state);
    renderDebugState();
    persistenceState.value = JSON.stringify({ ok: true, value: "loaded" });
  },
);

getRequiredElement<HTMLButtonElement>("[data-testid='seed-corrupt-save']").addEventListener(
  "click",
  async () => {
    const result = await persistence.seedCorruptSave();
    persistenceState.value = JSON.stringify(
      result.ok ? { ok: true, value: "corrupt-seeded" } : result,
    );
  },
);

function createSimulation(initialState?: ToyDomainState) {
  return createProbeSimulation({
    initialState,
    consumeCommands: () => {
      const commands = [...(input?.consumeDomainCommands() ?? []), ...pendingUiCommands];
      pendingUiCommands = [];
      return commands;
    },
  });
}

function handleUiIntent(intent: ProbeUiIntent): void {
  switch (intent.type) {
    case "set-modal-active":
      input?.setModalActive(intent.active);
      ui?.setModalActive(intent.active);
      renderDebugState();
      return;
    case "randomize-marker":
      pendingUiCommands.push({ type: "randomize-marker" });
      return;
  }
}

function renderDebugState(frame?: ProbeSimulationFrame): void {
  domainState.textContent = JSON.stringify(simulation.state);
  inputContexts.textContent = JSON.stringify(input?.activeContexts() ?? []);
  frameState.textContent = JSON.stringify(
    frame
      ? {
          alpha: frame.alpha,
          steps: frame.steps,
          clampedMs: frame.clampedMs,
          droppedSteps: frame.droppedSteps,
          overrun: frame.overrun,
        }
      : null,
  );
}

function getRequiredElement<TElement extends Element>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector);

  if (!element) {
    throw new Error(`Missing renderer probe element: ${selector}`);
  }

  return element;
}
