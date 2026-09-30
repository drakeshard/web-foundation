import { type DBSchema, type IDBPDatabase, openDB } from "idb";

import type {
  PersistenceResult,
  SaveSlotId,
  SaveStorage,
} from "../contracts.js";
import { persistenceFailureResult } from "../failure-utils.js";
import { classifyBrowserStorageFailure } from "./browser-storage-failures.js";

interface SaveDatabaseSchema extends DBSchema {
  readonly saves: {
    readonly key: string;
    readonly value: string;
  };
}

export interface IndexedDbSaveStorageOptions {
  readonly databaseName: string;
}

export class IndexedDbSaveStorage implements SaveStorage {
  readonly #databaseName: string;
  #databasePromise: Promise<IDBPDatabase<SaveDatabaseSchema>> | null = null;

  constructor(options: IndexedDbSaveStorageOptions) {
    this.#databaseName = options.databaseName;
  }

  async read(slotId: SaveSlotId): Promise<PersistenceResult<string | null>> {
    try {
      const database = await this.#database();
      return { ok: true, value: (await database.get("saves", slotId)) ?? null };
    } catch (error) {
      return persistenceFailureResult(classifyBrowserStorageFailure(error, "read-failed"), "read", error);
    }
  }

  async write(slotId: SaveSlotId, serialized: string): Promise<PersistenceResult<void>> {
    try {
      const database = await this.#database();
      const transaction = database.transaction("saves", "readwrite");
      await transaction.store.put(serialized, slotId);
      await transaction.done;
      return { ok: true, value: undefined };
    } catch (error) {
      return persistenceFailureResult(classifyBrowserStorageFailure(error, "write-failed"), "write", error);
    }
  }

  async delete(slotId: SaveSlotId): Promise<PersistenceResult<boolean>> {
    try {
      const database = await this.#database();
      const transaction = database.transaction("saves", "readwrite");
      const existed = (await transaction.store.get(slotId)) !== undefined;
      await transaction.store.delete(slotId);
      await transaction.done;
      return { ok: true, value: existed };
    } catch (error) {
      return persistenceFailureResult(classifyBrowserStorageFailure(error, "delete-failed"), "delete", error);
    }
  }

  async list(): Promise<PersistenceResult<readonly SaveSlotId[]>> {
    try {
      const database = await this.#database();
      const keys = await database.getAllKeys("saves");
      return {
        ok: true,
        value: keys.map(String).sort((left, right) => left.localeCompare(right)),
      };
    } catch (error) {
      return persistenceFailureResult(classifyBrowserStorageFailure(error, "list-failed"), "list", error);
    }
  }

  async #database(): Promise<IDBPDatabase<SaveDatabaseSchema>> {
    this.#databasePromise ??= openDB<SaveDatabaseSchema>(this.#databaseName, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains("saves")) {
          database.createObjectStore("saves");
        }
      },
    });

    return this.#databasePromise;
  }
}

