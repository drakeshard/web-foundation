import type {
  JsonValue,
  PersistenceDiagnostic,
  PersistenceFailure,
  PersistenceResult,
  SettingsKey,
  SettingsNamespace,
  SettingsStorage,
} from "../contracts.js";

export interface BrowserKeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LocalStorageSettingsStorageOptions {
  readonly storage: BrowserKeyValueStorage;
  readonly namespace: SettingsNamespace;
}

export class LocalStorageSettingsStorage implements SettingsStorage {
  readonly #storage: BrowserKeyValueStorage;
  readonly #prefix: string;

  constructor(options: LocalStorageSettingsStorageOptions) {
    this.#storage = options.storage;
    this.#prefix = `@drakeshard/settings/${encodeURIComponent(options.namespace)}/`;
  }

  read(key: SettingsKey): PersistenceResult<JsonValue | null> {
    try {
      const serialized = this.#storage.getItem(this.#physicalKey(key));

      if (serialized === null) {
        return { ok: true, value: null };
      }

      try {
        return { ok: true, value: JSON.parse(serialized) as JsonValue };
      } catch (error) {
        return failure("corrupt-data", "decode", error);
      }
    } catch (error) {
      return failure("read-failed", "read", error);
    }
  }

  write(key: SettingsKey, value: JsonValue): PersistenceResult<void> {
    try {
      this.#storage.setItem(this.#physicalKey(key), JSON.stringify(value));
      return { ok: true, value: undefined };
    } catch (error) {
      if (isNamedError(error, "QuotaExceededError")) {
        return failure("quota-exceeded", "write", error);
      }

      return failure("write-failed", "write", error);
    }
  }

  remove(key: SettingsKey): PersistenceResult<boolean> {
    try {
      const physicalKey = this.#physicalKey(key);
      const existed = this.#storage.getItem(physicalKey) !== null;
      this.#storage.removeItem(physicalKey);
      return { ok: true, value: existed };
    } catch (error) {
      return failure("delete-failed", "delete", error);
    }
  }

  #physicalKey(key: SettingsKey): string {
    return `${this.#prefix}${encodeURIComponent(key)}`;
  }
}

function failure(
  kind: PersistenceFailure["kind"],
  operation: PersistenceFailure["operation"],
  error: unknown,
): PersistenceResult<never> {
  const diagnostic = diagnosticFrom(error);

  return diagnostic
    ? { ok: false, error: { kind, operation, diagnostic } }
    : { ok: false, error: { kind, operation } };
}

function diagnosticFrom(error: unknown): PersistenceDiagnostic | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }

  return {
    name: error.name,
    message: error.message,
  };
}

function isNamedError(error: unknown, name: string): boolean {
  return error instanceof Error && error.name === name;
}
