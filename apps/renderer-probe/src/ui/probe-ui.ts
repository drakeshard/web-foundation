import { computed, signal } from "@preact/signals";
import { h, render } from "preact";
import type { ToyDomainState } from "../domain/index.js";

export interface ProbeUiDomainView {
  readonly tick: number;
  readonly probePosition: {
    readonly x: number;
    readonly y: number;
  };
  readonly markerPosition: {
    readonly x: number;
    readonly y: number;
  };
}

export type ProbeUiIntent =
  | {
      readonly type: "set-modal-active";
      readonly active: boolean;
    }
  | {
      readonly type: "randomize-marker";
    };

export interface ProbeUiBridgeOptions {
  readonly parent: HTMLElement;
  readonly initialState: ToyDomainState;
  readonly onIntent: (intent: ProbeUiIntent) => void;
}

export interface ProbeUiBridge {
  publishDomainState(state: ToyDomainState): void;
  setModalActive(active: boolean): void;
  destroy(): void;
}

export function projectProbeUiDomain(state: ToyDomainState): ProbeUiDomainView {
  return {
    tick: state.tick,
    probePosition: {
      x: state.probe.position.x,
      y: state.probe.position.y,
    },
    markerPosition: {
      x: state.marker.position.x,
      y: state.marker.position.y,
    },
  };
}

export function createProbeUiBridge(options: ProbeUiBridgeOptions): ProbeUiBridge {
  const domainView = signal(projectProbeUiDomain(options.initialState));
  const modalActive = signal(false);
  const viewModel = computed(() => ({
    ...domainView.value,
    modalActive: modalActive.value,
  }));

  function ProbeUi() {
    const view = viewModel.value;

    return h("section", { "aria-label": "Probe UI" }, [
      h(
        "p",
        { "data-testid": "ui-domain-summary" },
        `tick ${view.tick} · probe (${view.probePosition.x}, ${view.probePosition.y}) · marker (${view.markerPosition.x}, ${view.markerPosition.y})`,
      ),
      h(
        "output",
        { "data-testid": "ui-modal-state" },
        view.modalActive ? "modal active" : "modal inactive",
      ),
      h(
        "div",
        {},
        [
          h(
            "button",
            {
              type: "button",
              "data-testid": "activate-modal",
              onClick: () => {
                modalActive.value = true;
                options.onIntent({ type: "set-modal-active", active: true });
              },
            },
            "activate modal",
          ),
          h(
            "button",
            {
              type: "button",
              "data-testid": "deactivate-modal",
              onClick: () => {
                modalActive.value = false;
                options.onIntent({ type: "set-modal-active", active: false });
              },
            },
            "deactivate modal",
          ),
          h(
            "button",
            {
              type: "button",
              "data-testid": "ui-randomize-marker",
              onClick: () => options.onIntent({ type: "randomize-marker" }),
            },
            "randomize marker",
          ),
        ],
      ),
    ]);
  }

  render(h(ProbeUi, {}), options.parent);

  return {
    publishDomainState(state: ToyDomainState): void {
      domainView.value = projectProbeUiDomain(state);
    },

    setModalActive(active: boolean): void {
      modalActive.value = active;
    },

    destroy(): void {
      render(null, options.parent);
    },
  };
}
