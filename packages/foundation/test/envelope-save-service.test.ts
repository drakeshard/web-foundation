import { describe, expect, it } from "vitest";

import {
  deserializeSaveEnvelope,
  EnvelopeSaveService,
  type JsonValue,
  type PersistenceResult,
  type SaveStorage,
  SaveMigrationRegistry,
} from "../src/storage/index.ts";

class MemorySaveStorage implements SaveStorage {
  readonly records = new Map<string, string>();
  failWrites = false;

  async read(slotId: string): Promise<PersistenceResult<string | null>> {
    return { ok: true, value: this.records.get(slotId) ?? null };
  }

  async write(slotId: string, serialized: string): Promise<PersistenceResult<void>> {
    if (this.failWrites) {
      return {
        ok: false,
        error: {
          kind: "write-failed",
          operation: "write",
          diagnostic: { message: "injected write failure" },
        },
      };
    }

    this.records.set(slotId, serialized);
    return { ok: true, value: undefined };
  }

  async delete(slotId: string): Promise<PersistenceResult<boolean>> {
    return { ok: true, value: this.records.delete(slotId) };
  }

  async list(): Promise<PersistenceResult<readonly string[]>> {
    return { ok: true, value: [...this.records.keys()].sort() };
  }
}

const timestamp = "2026-09-30T12:00:00.000Z";

function service(
  storage: SaveStorage,
  migrations = new SaveMigrationRegistry([]),
  saveFormatVersion = 2,
): EnvelopeSaveService<JsonValue> {
  return new EnvelopeSaveService({
    storage,
    gameId: "game",
    saveFormatVersion,
    gameVersion: "1.0.0",
    contentVersion: "base",
    migrations,
    now: () => timestamp,
  });
}

describe("EnvelopeSaveService safe commit behavior", () => {
  it("migrates on load in memory without auto-committing the source slot", async () => {
    const storage = new MemorySaveStorage();
    const legacy =
      '{"gameId":"game","saveFormatVersion":1,"gameVersion":"0.9.0","contentVersion":"base","createdAt":"2026-09-30T11:00:00.000Z","updatedAt":"2026-09-30T11:00:00.000Z","payload":{"hp":10}}';
    storage.records.set("slot", legacy);

    const migrations = new SaveMigrationRegistry([
      {
        sourceVersion: 1,
        targetVersion: 2,
        migrate: (payload) => ({
          ok: true,
          value: { ...(payload as Record<string, JsonValue>), mana: 5 },
        }),
      },
    ]);

    expect(await service(storage, migrations).load("slot")).toEqual({
      ok: true,
      value: { hp: 10, mana: 5 },
    });
    expect(storage.records.get("slot")).toBe(legacy);
  });

  it("requires an explicit save before migrated data replaces the stored source", async () => {
    const storage = new MemorySaveStorage();
    const legacy =
      '{"gameId":"game","saveFormatVersion":1,"gameVersion":"0.9.0","contentVersion":"base","createdAt":"2026-09-30T11:00:00.000Z","updatedAt":"2026-09-30T11:00:00.000Z","payload":{"hp":10}}';
    storage.records.set("slot", legacy);

    const migrations = new SaveMigrationRegistry([
      {
        sourceVersion: 1,
        targetVersion: 2,
        migrate: (payload) => ({
          ok: true,
          value: { ...(payload as Record<string, JsonValue>), mana: 5 },
        }),
      },
    ]);
    const saves = service(storage, migrations);
    const loaded = await saves.load("slot");
    expect(loaded.ok).toBe(true);
    if (!loaded.ok || loaded.value === null) return;

    expect(await saves.save("slot", loaded.value)).toEqual({ ok: true, value: undefined });

    const committed = storage.records.get("slot");
    expect(committed).not.toBe(legacy);
    expect(deserializeSaveEnvelope(committed ?? "")).toMatchObject({
      ok: true,
      value: {
        saveFormatVersion: 2,
        payload: { hp: 10, mana: 5 },
      },
    });
  });

  it("leaves the source readable when migration fails", async () => {
    const storage = new MemorySaveStorage();
    const legacy =
      '{"gameId":"game","saveFormatVersion":1,"gameVersion":"0.9.0","contentVersion":"base","createdAt":"2026-09-30T11:00:00.000Z","updatedAt":"2026-09-30T11:00:00.000Z","payload":{"hp":10}}';
    storage.records.set("slot", legacy);
    const migrations = new SaveMigrationRegistry([
      {
        sourceVersion: 1,
        targetVersion: 2,
        migrate: () => ({
          ok: false,
          error: { kind: "migration-failed", operation: "migrate" },
        }),
      },
    ]);

    expect(await service(storage, migrations).load("slot")).toMatchObject({
      ok: false,
      error: { kind: "migration-failed", operation: "migrate" },
    });
    expect(storage.records.get("slot")).toBe(legacy);
  });

  it("leaves the last committed save readable when the replacement write fails", async () => {
    const storage = new MemorySaveStorage();
    const saves = service(storage);

    expect(await saves.save("slot", { hp: 10 })).toEqual({ ok: true, value: undefined });
    const committed = storage.records.get("slot");

    storage.failWrites = true;
    expect(await saves.save("slot", { hp: 1 })).toMatchObject({
      ok: false,
      error: { kind: "write-failed", operation: "write" },
    });
    expect(storage.records.get("slot")).toBe(committed);
  });

  it("does not replace a corrupt pre-existing save during load", async () => {
    const storage = new MemorySaveStorage();
    storage.records.set("slot", "{broken");

    expect(await service(storage).load("slot")).toMatchObject({
      ok: false,
      error: { kind: "corrupt-data", operation: "decode" },
    });
    expect(storage.records.get("slot")).toBe("{broken");
  });

  it("rejects a save belonging to another game without changing storage", async () => {
    const storage = new MemorySaveStorage();
    const foreign =
      '{"gameId":"other","saveFormatVersion":2,"gameVersion":"1.0.0","contentVersion":"base","createdAt":"2026-09-30T11:00:00.000Z","updatedAt":"2026-09-30T11:00:00.000Z","payload":{"hp":10}}';
    storage.records.set("slot", foreign);

    expect(await service(storage).load("slot")).toMatchObject({
      ok: false,
      error: { kind: "corrupt-data", operation: "decode" },
    });
    expect(storage.records.get("slot")).toBe(foreign);
  });
});
