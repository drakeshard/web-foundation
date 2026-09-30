import { createProbeInputController, type ProbeInputController } from "./input/probe-input.js";
import { createPhaserProbe } from "./presentation/phaser-probe.js";
import { clientPositionToToyPoint } from "./presentation/screen-to-world.js";
import { createProbeSimulation, type ProbeSimulationFrame } from "./simulation/probe-simulation.js";

let input: ProbeInputController | undefined;

const simulation = createProbeSimulation({
  consumeCommands: () => input?.consumeDomainCommands() ?? [],
});

const parent = getRequiredElement<HTMLElement>("#renderer-probe");
const status = getRequiredElement<HTMLOutputElement>("[data-testid='renderer-probe-status']");
const domainState = getRequiredElement<HTMLElement>("[data-testid='domain-state']");
const inputContexts = getRequiredElement<HTMLElement>("[data-testid='input-contexts']");
const frameState = getRequiredElement<HTMLElement>("[data-testid='frame-state']");

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
    renderDebugState();
  },
});

getRequiredElement<HTMLButtonElement>("[data-testid='activate-modal']").addEventListener(
  "click",
  () => {
    input?.setModalActive(true);
    renderDebugState();
  },
);

getRequiredElement<HTMLButtonElement>("[data-testid='deactivate-modal']").addEventListener(
  "click",
  () => {
    input?.setModalActive(false);
    renderDebugState();
  },
);

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
