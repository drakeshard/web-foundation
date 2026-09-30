import type {
  ContentVersion,
  GameVersion,
  JsonValue,
  PersistenceResult,
  SaveFormatVersion,
  SaveService,
  SaveSlotId,
  SaveSlotSummary,
  SaveStorage,
} from "./contracts.js";
import { persistenceFailureMessage } from "./failure-utils.js";
import {
  createSaveEnvelope,
  deserializeSaveEnvelope,
  type GameId,
  serializeSaveEnvelope,
  type SaveTimestamp,
} from "./save-envelope.js";
import { SaveMigrationRegistry } from "./save-migrations.js";

export interface EnvelopeSaveServiceOptions {
  readonly storage: SaveStorage;
  readonly gameId: GameId;
  readonly saveFormatVersion: SaveFormatVersion;
  readonly gameVersion: GameVersion;
  readonly contentVersion: ContentVersion;
  readonly migrations: SaveMigrationRegistry;
  readonly now: () => SaveTimestamp;
}

export class EnvelopeSaveService<TPayload extends JsonValue> implements SaveService<TPayload> {
  readonly #storage: SaveStorage;
  readonly #gameId: GameId;
  readonly #saveFormatVersion: SaveFormatVersion;
  readonly #gameVersion: GameVersion;
  readonly #contentVersion: ContentVersion;
  readonly #migrations: SaveMigrationRegistry;
  readonly #now: () => SaveTimestamp;

  constructor(options: EnvelopeSaveServiceOptions) {
    this.#storage = options.storage;
    this.#gameId = options.gameId;
    this.#saveFormatVersion = options.saveFormatVersion;
    this.#gameVersion = options.gameVersion;
    this.#contentVersion = options.contentVersion;
    this.#migrations = options.migrations;
    this.#now = options.now;
  }

  async load(slotId: SaveSlotId): Promise<PersistenceResult<TPayload | null>> {
    const stored = await this.#storage.read(slotId);
    if (!stored.ok) {
      return stored;
    }

    if (stored.value === null) {
      return { ok: true, value: null };
    }

    const decoded = deserializeSaveEnvelope(stored.value);
    if (!decoded.ok) {
      return decoded;
    }

    if (decoded.value.gameId !== this.#gameId) {
      return persistenceFailureMessage(
        "corrupt-data",
        "decode",
        `Save belongs to game "${decoded.value.gameId}", expected "${this.#gameId}".`,
      );
    }

    const migrated = this.#migrations.migrate(decoded.value, this.#saveFormatVersion);
    if (!migrated.ok) {
      return migrated;
    }

    return {
      ok: true,
      value: migrated.value.envelope.payload as TPayload,
    };
  }

  async save(slotId: SaveSlotId, payload: TPayload): Promise<PersistenceResult<void>> {
    const timestamp = this.#now();
    const envelope = createSaveEnvelope(
      {
        gameId: this.#gameId,
        saveFormatVersion: this.#saveFormatVersion,
        gameVersion: this.#gameVersion,
        contentVersion: this.#contentVersion,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      payload,
    );

    if (!envelope.ok) {
      return envelope;
    }

    const serialized = serializeSaveEnvelope(envelope.value);
    if (!serialized.ok) {
      return serialized;
    }

    return this.#storage.write(slotId, serialized.value);
  }

  delete(slotId: SaveSlotId): Promise<PersistenceResult<boolean>> {
    return this.#storage.delete(slotId);
  }

  async list(): Promise<PersistenceResult<readonly SaveSlotSummary[]>> {
    const listed = await this.#storage.list();
    if (!listed.ok) {
      return listed;
    }

    return {
      ok: true,
      value: listed.value.map((slotId) => ({ slotId })),
    };
  }
}
