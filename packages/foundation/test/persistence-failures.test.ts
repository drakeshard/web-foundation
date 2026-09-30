import { describe, expect, it } from "vitest";

import { LocalStorageSettingsStorage } from "../src/storage/browser/index.ts";
import {
  deserializeSaveEnvelope,
  type JsonValue,
  type PersistenceResult,
  type SaveEnvelope,
  SaveMigrationRegistry,
} from "../src/storage/index.ts";

const source: SaveEnvelope<JsonValue> = {
  gameId: "game",
  saveFormatVersion: 2,
  gameVersion: "1.0.0",
  contentVersion: "base",
  createdAt: "2026-09-30T12:00:00.000Z",
  updatedAt: "2026-09-30T12:00:00.000Z",
  payload: { hp: 10 },
};

function namedError(name: string, message: string): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

describe("structured persistence failures", () => {
  it("keeps corrupt envelopes distinct from unsupported future versions", () => {
    expect(deserializeSaveEnvelope("{broken")).toMatchObject({
      ok: false,
      error: { kind: "corrupt-data", operation: "decode" },
    });

    expect(
      new SaveMigrationRegistry([]).migrate({ ...source, saveFormatVersion: 4 }, 3),
    ).toMatchObject({
      ok: false,
      error: { kind: "unsupported-version", operation: "migrate" },
    });
  });

  it("keeps migration failures distinct from storage failures", () => {
    const failed: PersistenceResult<JsonValue> = {
      ok: false,
      error: {
        kind: "corrupt-data",
        operation: "decode",
        diagnostic: { message: "legacy payload invalid" },
      },
    };
    const registry = new SaveMigrationRegistry([
      {
        sourceVersion: 2,
        targetVersion: 3,
        migrate: () => failed,
      },
    ]);

    expect(registry.migrate(source, 3)).toEqual({
      ok: false,
      error: {
        kind: "migration-failed",
        operation: "migrate",
        diagnostic: { message: "legacy payload invalid" },
      },
    });
  });

  it("classifies quota and unavailable browser storage without message parsing", () => {
    const quota = new LocalStorageSettingsStorage({
      namespace: "game",
      storage: {
        getItem: () => null,
        setItem: () => {
          throw namedError("QuotaExceededError", "localized capacity text");
        },
        removeItem: () => {},
      },
    });
    const unavailable = new LocalStorageSettingsStorage({
      namespace: "game",
      storage: {
        getItem: () => {
          throw namedError("SecurityError", "localized security text");
        },
        setItem: () => {},
        removeItem: () => {},
      },
    });

    expect(quota.write("key", true)).toMatchObject({
      ok: false,
      error: { kind: "quota-exceeded", operation: "write" },
    });
    expect(unavailable.read("key")).toMatchObject({
      ok: false,
      error: { kind: "storage-unavailable", operation: "read" },
    });
  });

  it("preserves normalized causal diagnostics without exposing the original exception", () => {
    const storage = new LocalStorageSettingsStorage({
      namespace: "game",
      storage: {
        getItem: () => null,
        setItem: () => {
          throw namedError("UnknownStorageFailure", "write failed upstream");
        },
        removeItem: () => {},
      },
    });

    expect(storage.write("key", true)).toEqual({
      ok: false,
      error: {
        kind: "write-failed",
        operation: "write",
        diagnostic: {
          name: "UnknownStorageFailure",
          message: "write failed upstream",
        },
      },
    });
  });
});
