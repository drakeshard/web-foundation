import { describe, expect, it } from "vitest";
import {
  advanceToyDomain,
  createToyDomainState,
  restoreToyDomain,
  snapshotToyDomain,
} from "../src/domain/index.ts";
import { projectToyPresentation } from "../src/presentation/toy-presentation.ts";

const noRandom = {
  nextUint32: () => 0,
};

describe("toy-domain presentation projection", () => {
  it("maps domain identity and interpolation into presentation-only view data", () => {
    const moved = advanceToyDomain(
      createToyDomainState(),
      [{ type: "move", dx: 1, dy: 0 }],
      noRandom,
    ).state;
    const before = snapshotToyDomain(moved);

    const views = projectToyPresentation(moved, 0.25);

    expect(views).toEqual([
      {
        viewId: "probe:probe",
        kind: "probe",
        domainEntityId: "probe",
        position: { x: 3.25, y: 3 },
      },
      {
        viewId: "marker",
        kind: "marker",
        position: { x: 1, y: 1 },
      },
    ]);
    expect(snapshotToyDomain(moved)).toEqual(before);
  });

  it("recreates equivalent visible state from an authoritative domain snapshot", () => {
    const state = advanceToyDomain(
      createToyDomainState(),
      [
        { type: "move", dx: 1, dy: -1 },
        { type: "set-marker", position: { x: 6, y: 5 } },
      ],
      noRandom,
    ).state;
    const restored = restoreToyDomain(snapshotToyDomain(state));

    expect(projectToyPresentation(restored, 1)).toEqual(projectToyPresentation(state, 1));
  });
});
