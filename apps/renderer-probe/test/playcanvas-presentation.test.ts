import { DeterministicRng } from "@drakeshard/foundation/random";
import { describe, expect, it } from "vitest";
import {
  advanceToyDomain,
  createToyDomainState,
  restoreToyDomain,
  snapshotToyDomain,
} from "../src/domain/index.ts";
import { projectToyStateToPlayCanvas } from "../src/presentation/playcanvas-probe.ts";

describe("PlayCanvas presentation projection", () => {
  it("maps renderer-neutral elevation into disposable 3D view data", () => {
    const state = createToyDomainState();

    expect(projectToyStateToPlayCanvas(state)).toEqual([
      {
        viewId: "probe:probe",
        kind: "probe",
        domainEntityId: "probe",
        position: { x: 3, y: 1, z: 3 },
      },
      {
        viewId: "marker",
        kind: "marker",
        position: { x: 1, y: 0.25, z: 1 },
      },
    ]);
  });

  it("interpolates position and elevation only in presentation data", () => {
    const moved = advanceToyDomain(
      createToyDomainState(),
      [{ type: "move", dx: 1, dy: 0 }],
      new DeterministicRng(7),
    ).state;
    const before = snapshotToyDomain(moved);

    const halfway = projectToyStateToPlayCanvas(moved, 0.5);

    expect(halfway[0]).toEqual({
      viewId: "probe:probe",
      kind: "probe",
      domainEntityId: "probe",
      position: { x: 3.5, y: 1.25, z: 3 },
    });
    expect(snapshotToyDomain(moved)).toEqual(before);
  });

  it("recreates the same presentation projection from a domain snapshot", () => {
    const state = createToyDomainState();
    const restored = restoreToyDomain(snapshotToyDomain(state));

    expect(projectToyStateToPlayCanvas(restored)).toEqual(projectToyStateToPlayCanvas(state));
  });
});
