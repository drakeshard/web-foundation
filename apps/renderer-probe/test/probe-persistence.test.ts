import { describe, expect, it } from "vitest";
import type { JsonValue } from "@drakeshard/foundation/storage";
import { decodeToyDomainSnapshot } from "../src/persistence/probe-persistence.ts";

describe("probe persistence payload validation", () => {
  it("accepts a valid renderer-neutral toy-domain snapshot", () => {
    const result = decodeToyDomainSnapshot({
      tick: 7,
      world: { width: 8, height: 8 },
      probe: { id: "probe", position: { x: 4, y: 2 } },
      marker: { position: { x: 6, y: 5 } },
    });

    expect(result).toEqual({
      ok: true,
      value: {
        tick: 7,
        world: { width: 8, height: 8 },
        probe: { id: "probe", position: { x: 4, y: 2 } },
        marker: { position: { x: 6, y: 5 } },
      },
    });
  });

  it("rejects malformed application payloads locally", () => {
    const result = decodeToyDomainSnapshot({
      tick: 2,
      world: { width: 8, height: 8 },
      probe: { id: "probe", position: { x: 99, y: 2 } },
      marker: { position: { x: 1, y: 1 } },
    } as JsonValue);

    expect(result).toMatchObject({
      ok: false,
      error: {
        kind: "corrupt-data",
        operation: "decode",
      },
    });
  });
});
