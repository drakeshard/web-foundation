import { describe, expect, it } from "vitest";
import { advanceToyDomain, createToyDomainState } from "../src/domain/index.ts";
import { projectProbeUiDomain } from "../src/ui/probe-ui.ts";

const noRandom = {
  nextUint32: () => 0,
};

describe("probe UI domain projection", () => {
  it("copies only UI-facing domain data into the view model", () => {
    const state = advanceToyDomain(
      createToyDomainState(),
      [
        { type: "move", dx: 1, dy: -1 },
        { type: "set-marker", position: { x: 6, y: 5 } },
      ],
      noRandom,
    ).state;

    const view = projectProbeUiDomain(state);

    expect(view).toEqual({
      tick: 1,
      probePosition: { x: 4, y: 2 },
      markerPosition: { x: 6, y: 5 },
    });
    expect(view).not.toBe(state);
    expect(view.probePosition).not.toBe(state.probe.position);
    expect(view.markerPosition).not.toBe(state.marker.position);
  });
});
