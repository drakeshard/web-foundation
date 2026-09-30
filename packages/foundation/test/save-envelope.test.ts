import { describe, expect, it } from "vitest";

import {
  createSaveEnvelope,
  deserializeSaveEnvelope,
  serializeSaveEnvelope,
  validateSaveEnvelope,
} from "../src/storage/index.ts";

const metadata = {
  gameId: "drakeshard-tactics",
  saveFormatVersion: 3,
  gameVersion: "0.8.1",
  contentVersion: "content-17",
  createdAt: "2026-09-30T12:00:00.000Z",
  updatedAt: "2026-09-30T12:05:00.000Z",
} as const;

describe("SaveEnvelope", () => {
  it("round-trips with stable field ordering and metadata", () => {
    const created = createSaveEnvelope(metadata, {
      party: ["mage", "guard"],
      floor: 4,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const serialized = serializeSaveEnvelope(created.value);
    expect(serialized).toEqual({
      ok: true,
      value:
        '{"gameId":"drakeshard-tactics","saveFormatVersion":3,"gameVersion":"0.8.1","contentVersion":"content-17","createdAt":"2026-09-30T12:00:00.000Z","updatedAt":"2026-09-30T12:05:00.000Z","payload":{"party":["mage","guard"],"floor":4}}',
    });
    if (!serialized.ok) return;

    expect(deserializeSaveEnvelope(serialized.value)).toEqual(created);
  });

  it("rejects malformed JSON and missing required metadata", () => {
    expect(deserializeSaveEnvelope("{broken")).toMatchObject({
      ok: false,
      error: { kind: "corrupt-data", operation: "decode" },
    });

    expect(
      validateSaveEnvelope({
        saveFormatVersion: 1,
        gameVersion: "1.0.0",
        contentVersion: "base",
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt,
        payload: {},
      }),
    ).toMatchObject({
      ok: false,
      error: { kind: "corrupt-data", operation: "decode" },
    });
  });

  it("rejects invalid save-format versions and non-canonical timestamps", () => {
    expect(
      validateSaveEnvelope({
        ...metadata,
        saveFormatVersion: -1,
        payload: {},
      }),
    ).toMatchObject({ ok: false, error: { kind: "corrupt-data" } });

    expect(
      validateSaveEnvelope({
        ...metadata,
        updatedAt: "2026-09-30",
        payload: {},
      }),
    ).toMatchObject({ ok: false, error: { kind: "corrupt-data" } });
  });

  it("keeps save format independent from game/content/Foundation versions", () => {
    const created = createSaveEnvelope(
      {
        ...metadata,
        saveFormatVersion: 9,
        gameVersion: "game-build-204",
        contentVersion: "ruleset-c",
      },
      { hp: 10 },
    );

    expect(created).toEqual({
      ok: true,
      value: {
        gameId: "drakeshard-tactics",
        saveFormatVersion: 9,
        gameVersion: "game-build-204",
        contentVersion: "ruleset-c",
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt,
        payload: { hp: 10 },
      },
    });
  });

  it("rejects non-JSON payloads before migration/load", () => {
    expect(
      validateSaveEnvelope({
        ...metadata,
        payload: { invalid: Number.NaN },
      }),
    ).toMatchObject({
      ok: false,
      error: { kind: "corrupt-data", operation: "decode" },
    });
  });
});
