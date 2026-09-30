import { describe, expect, it } from "vitest";
import { createToyDomainState } from "../src/domain/index.ts";
import {
  type PlayCanvasWorldRay,
  pickToyWorldFromRay,
} from "../src/presentation/playcanvas-interaction.ts";

describe("PlayCanvas tactical pointer interaction", () => {
  it("intersects the nearest domain-elevation surface", () => {
    const state = createToyDomainState();

    expect(pickToyWorldFromRay(downwardRay(6, 5), state)).toEqual({
      kind: "intersection",
      point: { x: 6, y: 5 },
      worldPosition: { x: 6, y: 1, z: 5 },
      distance: 9,
    });
  });

  it("reports the probe as an occluder before terrain", () => {
    const state = createToyDomainState();

    expect(pickToyWorldFromRay(downwardRay(3, 3), state)).toEqual({
      kind: "occluded",
      occluderViewId: "probe:probe",
      domainEntityId: "probe",
      worldPosition: { x: 3, y: 1.5, z: 3 },
      distance: 8.5,
    });
  });

  it("reports a miss when the ray never intersects the toy world", () => {
    const state = createToyDomainState();

    expect(pickToyWorldFromRay(downwardRay(20, 20), state)).toEqual({
      kind: "miss",
      reason: "no-world-intersection",
    });
  });
});

function downwardRay(x: number, z: number): PlayCanvasWorldRay {
  return {
    origin: { x, y: 10, z },
    direction: { x: 0, y: -1, z: 0 },
    maxDistance: 20,
  };
}
