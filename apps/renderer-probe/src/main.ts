import {
  advanceToyDomain,
  createToyDomainState,
  type ToyDomainRandom,
} from "./domain/index.js";
import {
  createProbeInputController,
  type ProbeInputController,
} from "./input/probe-input.js";
import { createPhaserProbe } from "./presentation/phaser-probe.js";
import { clientPositionToToyPoint } from "./presentation/screen-to-world.js";

let authoritativeState = createToyDomainState();
let input: ProbeInputController | undefined;

const parent = getRequiredElement<HTMLElement>("#renderer-probe");
const status = getRequiredElement<HTMLOutputElement>("[data-testid='renderer-probe-status']");
const domainState = getRequiredElement<HTMLElement>("[data-testid='domain-state']");
const inputContexts = getRequiredElement<HTMLElement>("[data-testid='input-contexts']");

createPhaserProbe({
  parent,
  readState: () => authoritativeState,
  onReady: (canvas) => {
    input = createProbeInputController({
      pointerTarget: canvas,
      toWorldPoint: (position) =>
        clientPositionToToyPoint(position, canvas, authoritativeState.world),
    });
    status.value = "phaser-probe-ready";
    renderDebugState();
  },
});

getRequiredElement<HTMLButtonElement>("[data-testid='consume-input']").addEventListener(
  "click",
  () => {
    if (!input) return;

    const commands = input.consumeDomainCommands();
    if (commands.length > 0) {
      authoritativeState = advanceToyDomain(authoritativeState, commands, unusedRandom).state;
    }
    renderDebugState();
  },
);

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

function renderDebugState(): void {
  domainState.textContent = JSON.stringify(authoritativeState);
  inputContexts.textContent = JSON.stringify(input?.activeContexts() ?? []);
}

function getRequiredElement<TElement extends Element>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector);

  if (!element) {
    throw new Error(`Missing renderer probe element: ${selector}`);
  }

  return element;
}

const unusedRandom: ToyDomainRandom = {
  nextUint32(): number {
    throw new Error("Input bridge commands must not consume randomness");
  },
};
