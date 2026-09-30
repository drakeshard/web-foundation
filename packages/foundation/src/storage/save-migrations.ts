import type { JsonValue, PersistenceResult, SaveFormatVersion } from "./contracts.js";
import type { SaveEnvelope } from "./save-envelope.js";

export interface SaveMigration {
  readonly sourceVersion: SaveFormatVersion;
  readonly targetVersion: SaveFormatVersion;
  migrate(payload: JsonValue): PersistenceResult<JsonValue>;
}

export interface SaveMigrationResult {
  readonly envelope: SaveEnvelope<JsonValue>;
  readonly appliedVersions: readonly SaveFormatVersion[];
}

export class SaveMigrationRegistry {
  readonly #bySource = new Map<SaveFormatVersion, SaveMigration>();

  constructor(migrations: readonly SaveMigration[]) {
    for (const migration of migrations) {
      if (
        !Number.isSafeInteger(migration.sourceVersion) ||
        migration.sourceVersion < 0 ||
        migration.targetVersion !== migration.sourceVersion + 1
      ) {
        throw new RangeError("Save migrations must advance exactly one non-negative version.");
      }

      if (this.#bySource.has(migration.sourceVersion)) {
        throw new Error(`Duplicate save migration for version ${migration.sourceVersion}.`);
      }

      this.#bySource.set(migration.sourceVersion, migration);
    }
  }

  migrate(
    source: SaveEnvelope<JsonValue>,
    targetVersion: SaveFormatVersion,
  ): PersistenceResult<SaveMigrationResult> {
    if (!Number.isSafeInteger(targetVersion) || targetVersion < 0) {
      return unsupported("Target save-format version is invalid.");
    }

    if (source.saveFormatVersion > targetVersion) {
      return unsupported(
        `Save format ${source.saveFormatVersion} is newer than supported version ${targetVersion}.`,
      );
    }

    if (source.saveFormatVersion === targetVersion) {
      return {
        ok: true,
        value: {
          envelope: cloneEnvelope(source),
          appliedVersions: [],
        },
      };
    }

    let working = cloneEnvelope(source);
    const appliedVersions: SaveFormatVersion[] = [];

    while (working.saveFormatVersion < targetVersion) {
      const migration = this.#bySource.get(working.saveFormatVersion);

      if (!migration) {
        return unsupported(
          `No migration from save format ${working.saveFormatVersion} to ${working.saveFormatVersion + 1}.`,
        );
      }

      let migrated: PersistenceResult<JsonValue>;
      try {
        migrated = migration.migrate(cloneJsonValue(working.payload));
      } catch (error) {
        return migrationFailure(error);
      }

      if (!migrated.ok) {
        return migrationFailureFromResult(migrated);
      }

      working = {
        ...working,
        saveFormatVersion: migration.targetVersion,
        payload: cloneJsonValue(migrated.value),
      };
      appliedVersions.push(migration.targetVersion);
    }

    return {
      ok: true,
      value: {
        envelope: working,
        appliedVersions,
      },
    };
  }
}

function cloneEnvelope(source: SaveEnvelope<JsonValue>): SaveEnvelope<JsonValue> {
  return {
    gameId: source.gameId,
    saveFormatVersion: source.saveFormatVersion,
    gameVersion: source.gameVersion,
    contentVersion: source.contentVersion,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    payload: cloneJsonValue(source.payload),
  };
}

function cloneJsonValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => cloneJsonValue(item));
  }

  if (typeof value === "object" && value !== null) {
    const cloned: Record<string, JsonValue> = {};
    for (const [key, item] of Object.entries(value)) {
      cloned[key] = cloneJsonValue(item);
    }
    return cloned;
  }

  return value;
}

function unsupported(message: string): PersistenceResult<never> {
  return {
    ok: false,
    error: {
      kind: "unsupported-version",
      operation: "migrate",
      diagnostic: { message },
    },
  };
}

function migrationFailure(error: unknown): PersistenceResult<never> {
  if (error instanceof Error) {
    return {
      ok: false,
      error: {
        kind: "migration-failed",
        operation: "migrate",
        diagnostic: { name: error.name, message: error.message },
      },
    };
  }

  return {
    ok: false,
    error: {
      kind: "migration-failed",
      operation: "migrate",
    },
  };
}

function migrationFailureFromResult(
  result: Extract<PersistenceResult<JsonValue>, { readonly ok: false }>,
): PersistenceResult<never> {
  return {
    ok: false,
    error: {
      kind: "migration-failed",
      operation: "migrate",
      diagnostic: result.error.diagnostic,
    },
  };
}
