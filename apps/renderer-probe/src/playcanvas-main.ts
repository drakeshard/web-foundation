import type { ToyDomainCommand } from "./domain/index.js";
import { createToyDomainState } from "./domain/index.js";
import { createPlayCanvasSelectionInput } from "./input/playcanvas-selection-input.js";
import { createPlayCanvasProbe } from "./presentation/playcanvas-probe.js";

const authoritativeState = createToyDomainState();
const parent = getRequiredElement<HTMLElement>("#playcanvas-probe");
const status = getRequiredElement<HTMLOutputElement>("[data-testid='playcanvas-probe-status']");
const domainState = getRequiredElement<HTMLElement>("[data-testid='playcanvas-domain-state']");
const rebuildButton = getRequiredElement<HTMLButtonElement>("[data-testid='playcanvas-rebuild']");
const rebuildCount = getRequiredElement<HTMLOutputElement>(
  "[data-testid='playcanvas-rebuild-count']",
);
const cameraState = getRequiredElement<HTMLElement>("[data-testid='playcanvas-camera-state']");
const pointerResult = getRequiredElement<HTMLElement>("[data-testid='playcanvas-pointer-result']");
const selectionIntent = getRequiredElement<HTMLElement>(
  "[data-testid='playcanvas-selection-intent']",
);
const inputContexts = getRequiredElement<HTMLElement>("[data-testid='playcanvas-input-contexts']");

domainState.textContent = JSON.stringify(authoritativeState);
pointerResult.textContent = JSON.stringify(null);
selectionIntent.textContent = JSON.stringify(null);

let rebuilds = 0;

const probe = createPlayCanvasProbe({
  parent,
  readState: () => authoritativeState,
  onCameraChanged: (state) => {
    cameraState.textContent = JSON.stringify(state);
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

inputContexts.textContent = JSON.stringify(selectionInput.activeContexts());
status.value = "playcanvas-probe-ready";

rebuildButton.addEventListener("click", () => {
  probe.rebuildPresentation(authoritativeState);
  rebuilds += 1;
  rebuildCount.value = String(rebuilds);
});

window.addEventListener(
  "pagehide",
  () => {
    selectionInput.destroy();
    probe.destroy();
  },
  { once: true },
);

function getRequiredElement<TElement extends Element>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector);

  if (!element) {
    throw new Error(`Missing PlayCanvas renderer probe element: ${selector}`);
  }

  return element;
}
