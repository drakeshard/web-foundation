import { createToyDomainState } from "./domain/index.js";
import { createPlayCanvasProbe } from "./presentation/playcanvas-probe.js";

const authoritativeState = createToyDomainState();
const parent = getRequiredElement<HTMLElement>("#playcanvas-probe");
const status = getRequiredElement<HTMLOutputElement>("[data-testid='playcanvas-probe-status']");
const domainState = getRequiredElement<HTMLElement>("[data-testid='playcanvas-domain-state']");
const rebuildButton = getRequiredElement<HTMLButtonElement>("[data-testid='playcanvas-rebuild']");
const rebuildCount = getRequiredElement<HTMLOutputElement>(
  "[data-testid='playcanvas-rebuild-count']",
);

domainState.textContent = JSON.stringify(authoritativeState);

let rebuilds = 0;

const probe = createPlayCanvasProbe({
  parent,
  readState: () => authoritativeState,
  onReady: () => {
    status.value = "playcanvas-probe-ready";
  },
});

rebuildButton.addEventListener("click", () => {
  probe.rebuildPresentation(authoritativeState);
  rebuilds += 1;
  rebuildCount.value = String(rebuilds);
});

function getRequiredElement<TElement extends Element>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector);

  if (!element) {
    throw new Error(`Missing PlayCanvas renderer probe element: ${selector}`);
  }

  return element;
}
