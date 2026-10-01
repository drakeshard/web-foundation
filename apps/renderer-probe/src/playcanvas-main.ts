import { DeterministicRng } from "@drakeshard/foundation/random";
import {
  advanceToyDomain,
  createToyDomainState,
  getToyElevation,
  restoreToyDomain,
  type ToyDomainCommand,
} from "./domain/index.js";
import { createPlayCanvasSelectionInput } from "./input/playcanvas-selection-input.js";
import { createProbePersistence } from "./persistence/probe-persistence.js";
import {
  createPlayCanvasProbe,
  projectToyStateToPlayCanvas,
} from "./presentation/playcanvas-probe.js";
import {
  CROSS_RENDERER_FRAME_SCHEDULES,
  runCrossRendererScenario,
} from "./scenario/cross-renderer-scenario.js";
import { createProbeUiBridge, type ProbeUiBridge, type ProbeUiIntent } from "./ui/probe-ui.js";

const ELEVATION_DEMO_COMMANDS: readonly ToyDomainCommand[] = [
  { type: "move", dx: -1, dy: 0 },
  { type: "move", dx: 1, dy: 0 },
  { type: "move", dx: 1, dy: 0 },
  { type: "move", dx: -1, dy: 0 },
];

let authoritativeState = createToyDomainState();
const persistence = createProbePersistence();
const elevationDemoRandom = new DeterministicRng(0x5_06_05);
let elevationDemoStep = 0;
let ui: ProbeUiBridge | undefined;

const parent = getRequiredElement<HTMLElement>("#playcanvas-probe");
const uiParent = getRequiredElement<HTMLElement>("#playcanvas-ui");
const status = getRequiredElement<HTMLOutputElement>("[data-testid='playcanvas-probe-status']");
const domainState = getRequiredElement<HTMLElement>("[data-testid='playcanvas-domain-state']");
const syncButton = getRequiredElement<HTMLButtonElement>("[data-testid='playcanvas-sync']");
const rebuildButton = getRequiredElement<HTMLButtonElement>("[data-testid='playcanvas-rebuild']");
const elevationDemoButton = getRequiredElement<HTMLButtonElement>(
  "[data-testid='playcanvas-elevation-demo-advance']",
);
const rebuildCount = getRequiredElement<HTMLOutputElement>(
  "[data-testid='playcanvas-rebuild-count']",
);
const cameraState = getRequiredElement<HTMLElement>("[data-testid='playcanvas-camera-state']");
const presentationSync = getRequiredElement<HTMLElement>(
  "[data-testid='playcanvas-presentation-sync']",
);
const elevationDemoState = getRequiredElement<HTMLElement>(
  "[data-testid='playcanvas-elevation-demo-state']",
);
const pointerResult = getRequiredElement<HTMLElement>("[data-testid='playcanvas-pointer-result']");
const selectionIntent = getRequiredElement<HTMLElement>(
  "[data-testid='playcanvas-selection-intent']",
);
const inputContexts = getRequiredElement<HTMLElement>("[data-testid='playcanvas-input-contexts']");
const uiIntent = getRequiredElement<HTMLElement>("[data-testid='playcanvas-ui-intent']");
const persistenceState = getRequiredElement<HTMLOutputElement>(
  "[data-testid='playcanvas-persistence-state']",
);
const crossRendererScenarioResult = getRequiredElement<HTMLElement>(
  "[data-testid='playcanvas-cross-renderer-scenario-result']",
);

renderDomainState();
renderElevationDemoState();
pointerResult.textContent = JSON.stringify(null);
selectionIntent.textContent = JSON.stringify(null);
uiIntent.textContent = JSON.stringify(null);

let rebuilds = 0;

const probe = createPlayCanvasProbe({
  parent,
  readState: () => authoritativeState,
  onCameraChanged: (state) => {
    cameraState.textContent = JSON.stringify(state);
  },
  onPresentationSynchronized: (result) => {
    presentationSync.textContent = JSON.stringify(result);
  },
});

const selectionInput = createPlayCanvasSelectionInput({
  pointerTarget: probe.canvas,
  onSelectionRequest: (request) => {
    const result = probe.resolvePointerInteraction(request.position, authoritativeState);
    pointerResult.textContent = JSON.stringify(result);

    const intent: ToyDomainCommand | null =
      result.kind === "intersection"
        ? {
            type: "set-marker",
            position: result.point,
          }
        : null;

    selectionIntent.textContent = JSON.stringify(intent);
  },
});

ui = createProbeUiBridge({
  parent: uiParent,
  initialState: authoritativeState,
  onIntent: handleUiIntent,
});

inputContexts.textContent = JSON.stringify(selectionInput.activeContexts());
status.value = "playcanvas-probe-ready";

syncButton.addEventListener("click", () => {
  probe.syncPresentation(authoritativeState);
});

rebuildButton.addEventListener("click", () => {
  rebuildPresentation();
});

getRequiredElement<HTMLButtonElement>(
  "[data-testid='playcanvas-run-cross-renderer-scenario']",
).addEventListener("click", () => {
  const result = runCrossRendererScenario({
    frameDeltasMs: CROSS_RENDERER_FRAME_SCHEDULES.coarse,
  });
  crossRendererScenarioResult.textContent = JSON.stringify({
    renderer: "playcanvas",
    cadence: "coarse",
    scenarioId: result.scenarioId,
    seed: result.seed,
    tickCount: result.tickCount,
    finalDomain: result.finalDomain,
    random: result.random,
    checksum: result.checksum,
    trace: result.trace,
    presentation: projectToyStateToPlayCanvas(result.finalState, 1),
  });
});

getRequiredElement<HTMLButtonElement>("[data-testid='playcanvas-save']").addEventListener(
  "click",
  async () => {
    const result = await persistence.save(authoritativeState);
    persistenceState.value = JSON.stringify(result.ok ? { ok: true, value: "saved" } : result);
  },
);

getRequiredElement<HTMLButtonElement>("[data-testid='playcanvas-load']").addEventListener(
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

    authoritativeState = restoreToyDomain(result.value);
    elevationDemoStep = 0;
    renderDomainState();
    renderElevationDemoState();
    ui?.publishDomainState(authoritativeState);
    rebuildPresentation();
    persistenceState.value = JSON.stringify({ ok: true, value: "loaded" });
  },
);

elevationDemoButton.addEventListener("click", () => {
  const command = ELEVATION_DEMO_COMMANDS[elevationDemoStep % ELEVATION_DEMO_COMMANDS.length];

  if (!command) {
    throw new Error("Missing elevation demo command");
  }

  authoritativeState = advanceToyDomain(authoritativeState, [command], elevationDemoRandom).state;
  elevationDemoStep += 1;
  publishAuthoritativeState();
});

window.addEventListener(
  "pagehide",
  () => {
    selectionInput.destroy();
    ui?.destroy();
    probe.destroy();
  },
  { once: true },
);

function handleUiIntent(intent: ProbeUiIntent): void {
  switch (intent.type) {
    case "set-modal-active":
      selectionInput.setModalActive(intent.active);
      ui?.setModalActive(intent.active);
      inputContexts.textContent = JSON.stringify(selectionInput.activeContexts());
      return;
    case "randomize-marker":
      uiIntent.textContent = JSON.stringify({
        type: "randomize-marker",
      } satisfies ToyDomainCommand);
      return;
  }
}

function rebuildPresentation(): void {
  probe.rebuildPresentation(authoritativeState);
  rebuilds += 1;
  rebuildCount.value = String(rebuilds);
}

function publishAuthoritativeState(): void {
  renderDomainState();
  renderElevationDemoState();
  ui?.publishDomainState(authoritativeState);
  probe.syncPresentation(authoritativeState);
}

function renderDomainState(): void {
  domainState.textContent = JSON.stringify(authoritativeState);
}

function renderElevationDemoState(): void {
  elevationDemoState.textContent = JSON.stringify({
    tick: authoritativeState.tick,
    position: authoritativeState.probe.position,
    elevation: getToyElevation(authoritativeState.probe.position),
  });
}

function getRequiredElement<TElement extends Element>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector);

  if (!element) {
    throw new Error(`Missing PlayCanvas renderer probe element: ${selector}`);
  }

  return element;
}
