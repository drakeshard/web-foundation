import { describe, expect, it } from "vitest";

import {
  type JsonValue,
  type PersistenceResult,
  type SaveEnvelope,
  type SaveMigration,
  SaveMigrationRegistry,
} from "../src/storage/index.ts";

const source: SaveEnvelope<JsonValue> = {
  gameId: "game",
  saveFormatVersion: 1,
  gameVersion: "1.0.0",
  contentVersion: "base",
  createdAt: "2026-09-30T12:00:00.000Z",
  updatedAt: "2026-09-30T12:00:00.000Z",
  payload: { hp: 10 },
};

function migration(
  sourceVersion: number,
  targetVersion: number,
  migrate: SaveMigration["migrate"],
): SaveMigration {
  return { sourceVersion, targetVersion, migrate };
}

describe("SaveMigrationRegistry", () => {
  it("applies one migration step and records the resulting version path", () => {
    const registry = new SaveMigrationRegistry([
      migration(1, 2, (payload) => ({
        ok: true,
        value: { ...(payload as Record<string, JsonValue>), mana: 5 },
      })),
    ]);

    expect(registry.migrate(source, 2)).toEqual({
      ok: true,
      value: {
        envelope: {
          ...source,
          saveFormatVersion: 2,
          payload: { hp: 10, mana: 5 },
        },
        appliedVersions: [2],
      },
    });
  });

  it("applies multi-step migrations sequentially without skipping versions", () => {
    const order: number[] = [];
    const registry = new SaveMigrationRegistry([
      migration(1, 2, (payload) => {
        order.push(2);
        return {
          ok: true,
          value: { ...(payload as Record<string, JsonValue>), mana: 5 },
        };
      }),
      migration(2, 3, (payload) => {
        order.push(3);
        return {
          ok: true,
          value: { ...(payload as Record<string, JsonValue>), armor: 2 },
        };
      }),
    ]);

    const result = registry.migrate(source, 3);

    expect(order).toEqual([2, 3]);
    expect(result).toMatchObject({
      ok: true,
      value: {
        envelope: {
          saveFormatVersion: 3,
          payload: { hp: 10, mana: 5, armor: 2 },
        },
        appliedVersions: [2, 3],
      },
    });
  });

  it("fails structurally when an intermediate migration is missing", () => {
    const registry = new SaveMigrationRegistry([
      migration(2, 3, (payload) => ({ ok: true, value: payload })),
    ]);

    expect(registry.migrate(source, 3)).toMatchObject({
      ok: false,
      error: {
        kind: "unsupported-version",
        operation: "migrate",
      },
    });
  });

  it("converts failed and thrown migration steps into migration-failed", () => {
    const failed: PersistenceResult<JsonValue> = {
      ok: false,
      error: {
        kind: "corrupt-data",
        operation: "decode",
        diagnostic: { message: "bad legacy payload" },
      },
    };
    const failing = new SaveMigrationRegistry([migration(1, 2, () => failed)]);
    const throwing = new SaveMigrationRegistry([
      migration(1, 2, () => {
        throw new Error("legacy transform exploded");
      }),
    ]);

    expect(failing.migrate(source, 2)).toEqual({
      ok: false,
      error: {
        kind: "migration-failed",
        operation: "migrate",
        diagnostic: { message: "bad legacy payload" },
      },
    });
    expect(throwing.migrate(source, 2)).toMatchObject({
      ok: false,
      error: {
        kind: "migration-failed",
        operation: "migrate",
        diagnostic: { name: "Error", message: "legacy transform exploded" },
      },
    });
  });

  it("returns a cloned current save without invoking migrations", () => {
    const registry = new SaveMigrationRegistry([]);
    const result = registry.migrate(source, 1);

    expect(result).toEqual({
      ok: true,
      value: {
        envelope: source,
        appliedVersions: [],
      },
    });
    if (result.ok) {
      expect(result.value.envelope).not.toBe(source);
      expect(result.value.envelope.payload).not.toBe(source.payload);
    }
  });

  it("preserves the original source when a migration mutates its input then fails", () => {
    const registry = new SaveMigrationRegistry([
      migration(1, 2, (payload) => {
        (payload as Record<string, JsonValue>).hp = 0;
        return {
          ok: false,
          error: {
            kind: "migration-failed",
            operation: "migrate",
          },
        };
      }),
    ]);

    expect(registry.migrate(source, 2).ok).toBe(false);
    expect(source.payload).toEqual({ hp: 10 });
  });

  it("rejects skipped or duplicate registration as programming errors", () => {
    expect(
      () =>
        new SaveMigrationRegistry([
          migration(1, 3, (payload) => ({ ok: true, value: payload })),
        ]),
    ).toThrow(RangeError);

    expect(
      () =>
        new SaveMigrationRegistry([
          migration(1, 2, (payload) => ({ ok: true, value: payload })),
          migration(1, 2, (payload) => ({ ok: true, value: payload })),
        ]),
    ).toThrow("Duplicate save migration");
  });

  it("rejects future saves when the requested supported version is older", () => {
    const future = { ...source, saveFormatVersion: 4 };
    const registry = new SaveMigrationRegistry([]);

    expect(registry.migrate(future, 3)).toMatchObject({
      ok: false,
      error: {
        kind: "unsupported-version",
        operation: "migrate",
      },
    });
  });
});
