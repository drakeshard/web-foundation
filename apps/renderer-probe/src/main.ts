import { createToyDomainState } from "./domain/index.js";
import { createPhaserProbe } from "./presentation/phaser-probe.js";

const authoritativeState = createToyDomainState();
const parent = document.querySelector<HTMLElement>("#renderer-probe");
const status = document.querySelector<HTMLOutputElement>("[data-testid='renderer-probe-status']");

if (!parent || !status) {
  throw new Error("Renderer probe host elements are missing");
}

createPhaserProbe({
  parent,
  readState: () => authoritativeState,
  onReady: () => {
    status.value = "phaser-probe-ready";
  },
});
