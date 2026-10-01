import { createProbeDebugView } from "./debug/probe-debug.js";
import type { ToyDomainCommand, ToyDomainState } from "./domain/index.js";
import { restoreToyDomain } from "./domain/index.js";
import { createProbeInputController, type ProbeInputController } from "./input/probe-input.js";
import { createProbePersistence } from "./persistence/probe-persistence.js";
import { createPhaserProbe } from "./presentation/phaser-probe.js";
import { clientPositionToToyPoint } from "./presentation/screen-to-world.js";
import { projectToyPresentation } from "./presentation/toy-presentation.js";
import {
  CROSS_RENDERER_FRAME_SCHEDULES,
  runCrossRendererScenario,
} from "./scenario/cross-renderer-scenario.js";
import { createProbeSimulation, type ProbeSimulationFrame } from "./simulation/probe-simulation.js";
import { createProbeUiBridge, type ProbeUiBridge, type ProbeUiIntent } from "./ui/probe-ui.js";

let input: ProbeInputController | undefined;
let ui: ProbeUiBridge | undefined;
let pendingUiCommands: ToyDomainCommand[] = [];

const persistence = createProbePersistence();
let simulation = createSimulation();

const parent = getRequiredElement<HTMLElement>("#renderer-probe");
const uiParent = getRequiredElement<HTMLElement>("#probe-ui");
const debugParent = getRequiredElement<HTMLElement>("#probe-debug");
const status = getRequiredElement<HTMLOutputElement>("[data-testid='renderer-probe-status']");
const persistenceState = getRequiredElement<HTMLOutputElement>("[data-testid='persistence-state']");
const persistenceEnvelope = getRequiredElement<HTMLElement>("[data-testid='persistence-envelope']");
const loadedDomainSnapshot = getRequiredElement<HTMLElement>(
  "[data-testid='loaded-domain-snapshot']",
);
const domainState = getRequiredElement<HTMLElement>("[data-testid='domain-state']");
const inputContexts = getRequiredElement<HTMLElement>("[data-testid='input-contexts']");
const frameState = getRequiredElement<HTMLElement>("[data-testid='frame-state']");
const inputCommandHistory = getRequiredElement<HTMLElement>(
  "[data-testid='input-command-history']",
);
const crossRendererScenarioResult = getRequiredElement<HTMLElement>(
  "[data-testid='cross-renderer-scenario-result']",
);
const rendererReinitCount = getRequiredElement<HTMLOutputElement>(
  "[data-testid='renderer-reinit-count']",
);
const debug = createProbeDebugView(debugParent);
const consumedInputCommands: ToyDomainCommand[][] = [];
inputCommandHistory.textContent = JSON.stringify(consumedInputCommands);

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

let rendererReinitializations = 0;
let phaserProbe = createRendererProbe();

getRequiredElement<HTMLButtonElement>("[data-testid='renderer-reinit']").addEventListener(
  "click",
  () => {
    input?.destroy();
    input = undefined;
    phaserProbe.destroy(true);
    parent.replaceChildren();
    status.value = "reinitializing";
    phaserProbe = createRendererProbe();
    rendererReinitializations += 1;
    rendererReinitCount.value = String(rendererReinitializations);
  },
);

getRequiredElement<HTMLButtonElement>(
  "[data-testid='run-cross-renderer-scenario']",
).addEventListener("click", () => {
  const result = runCrossRendererScenario({
    frameDeltasMs: CROSS_RENDERER_FRAME_SCHEDULES.fine,
  });
  crossRendererScenarioResult.textContent = JSON.stringify({
    renderer: "phaser",
    cadence: "fine",
    scenarioId: result.scenarioId,
    seed: result.seed,
    tickCount: result.tickCount,
    finalDomain: result.finalDomain,
    random: result.random,
    checksum: result.checksum,
    trace: result.trace,
    presentation: projectToyPresentation(result.finalState, 1),
  });
});

getRequiredElement<HTMLButtonElement>("[data-testid='save-probe']").addEventListener(
  "click",
  async () => {
    const result = await persistence.save(simulation.state);
    debug.publishPersistenceResult(result);
    persistenceState.value = JSON.stringify(result.ok ? { ok: true, value: "saved" } : result);
    await renderPersistenceEnvelope();
  },
);

getRequiredElement<HTMLButtonElement>("[data-testid='load-probe']").addEventListener(
  "click",
  async () => {
    const result = await persistence.load();
    debug.publishPersistenceResult(result);
    await renderPersistenceEnvelope();

    if (!result.ok) {
      persistenceState.value = JSON.stringify(result);
      return;
    }

    if (result.value === null) {
      persistenceState.value = JSON.stringify({ ok: true, value: "empty" });
      return;
    }

    loadedDomainSnapshot.textContent = JSON.stringify(result.value);
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
    debug.publishPersistenceResult(result);
    persistenceState.value = JSON.stringify(
      result.ok ? { ok: true, value: "corrupt-seeded" } : result,
    );
    await renderPersistenceEnvelope();
  },
);

getRequiredElement<HTMLButtonElement>("[data-testid='seed-legacy-save']").addEventListener(
  "click",
  async () => {
    const result = await persistence.seedLegacySave();
    debug.publishPersistenceResult(result);
    persistenceState.value = JSON.stringify(
      result.ok ? { ok: true, value: "legacy-seeded" } : result,
    );
    await renderPersistenceEnvelope();
  },
);

getRequiredElement<HTMLButtonElement>("[data-testid='seed-unsupported-save']").addEventListener(
  "click",
  async () => {
    const result = await persistence.seedUnsupportedSave();
    debug.publishPersistenceResult(result);
    persistenceState.value = JSON.stringify(
      result.ok ? { ok: true, value: "unsupported-seeded" } : result,
    );
    await renderPersistenceEnvelope();
  },
);

getRequiredElement<HTMLButtonElement>("[data-testid='seed-invalid-payload-save']").addEventListener(
  "click",
  async () => {
    const result = await persistence.seedInvalidPayloadSave();
    debug.publishPersistenceResult(result);
    persistenceState.value = JSON.stringify(
      result.ok ? { ok: true, value: "invalid-payload-seeded" } : result,
    );
    await renderPersistenceEnvelope();
  },
);

async function renderPersistenceEnvelope(): Promise<void> {
  persistenceEnvelope.textContent = JSON.stringify(await persistence.inspect());
}

function createRendererProbe(): ReturnType<typeof createPhaserProbe> {
  return createPhaserProbe({
    parent,
    readState: () => simulation.state,
    advanceFrame: (frameDeltaMs) => {
      const simulationStart = performance.now();
      const frame = simulation.advanceFrame(frameDeltaMs);
      const simulationDurationMs = performance.now() - simulationStart;
      ui?.publishDomainState(frame.state);
      debug.publishFrame(frame);
      renderDebugState(frame, simulationDurationMs);
      return frame;
    },
    onReady: (canvas) => {
      input = createProbeInputController({
        pointerTarget: canvas,
        toWorldPoint: (position) =>
          clientPositionToToyPoint(position, canvas, simulation.state.world),
        onCommandsConsumed: recordConsumedInputCommands,
      });
      status.value = "phaser-probe-ready";
      inputContexts.textContent = JSON.stringify(input.activeContexts());
      ui?.publishDomainState(simulation.state);
      renderDebugState();
    },
  });
}

function createSimulation(initialState?: ToyDomainState) {
  return createProbeSimulation({
    ...(initialState ? { initialState } : {}),
    consumeCommands: () => {
      const commands = [...(input?.consumeDomainCommands() ?? []), ...pendingUiCommands];
      pendingUiCommands = [];
      return commands;
    },
  });
}

function recordConsumedInputCommands(commands: readonly ToyDomainCommand[]): void {
  if (commands.length === 0) return;
  consumedInputCommands.push([...commands]);
  inputCommandHistory.textContent = JSON.stringify(consumedInputCommands);
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

function renderDebugState(frame?: ProbeSimulationFrame, simulationDurationMs?: number): void {
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
          simulationDurationMs: simulationDurationMs ?? null,
        }
      : null,
  );
}

window.addEventListener(
  "pagehide",
  () => {
    input?.destroy();
    ui?.destroy();
    phaserProbe.destroy(true);
  },
  { once: true },
);

function getRequiredElement<TElement extends Element>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector);

  if (!element) {
    throw new Error(`Missing renderer probe element: ${selector}`);
  }

  return element;
}
