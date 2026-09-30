import { describe, expect, it } from "vitest";
import { createToyDomainState, restoreToyDomain, snapshotToyDomain } from "../src/domain/index.ts";
import { projectToyStateToPlayCanvas } from "../src/presentation/playcanvas-probe.ts";

describe("PlayCanvas presentation projection", () => {
  it("projects renderer-neutral state into disposable 3D view data", () => {
    const state = createToyDomainState();

    expect(projectToyStateToPlayCanvas(state)).toEqual([
      {
        viewId: "probe:probe",
        kind: "probe",
        domainEntityId: "probe",
        position: { x: 3, y: 0.5, z: 3 },
      },
      {
        viewId: "marker",
        kind: "marker",
        position: { x: 1, y: 0.25, z: 1 },
      },
    ]);
  });

  it("recreates the same presentation projection from a domain snapshot", () => {
    const state = createToyDomainState();
    const restored = restoreToyDomain(snapshotToyDomain(state));

    expect(projectToyStateToPlayCanvas(restored)).toEqual(projectToyStateToPlayCanvas(state));
  });
});
