export type SettingsNamespace = string;
export type SettingsKey = string;
export type SaveSlotId = string;

export type SaveFormatVersion = number;
export type GameVersion = string;
export type ContentVersion = string;
export type FoundationVersion = string;

export type JsonPrimitive = boolean | number | string | null;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type PersistenceOperation = "read" | "write" | "delete" | "list" | "decode" | "migrate";

export type PersistenceFailureKind =
  | "storage-unavailable"
  | "quota-exceeded"
  | "corrupt-data"
  | "unsupported-version"
  | "migration-failed"
  | "read-failed"
  | "write-failed"
  | "delete-failed"
  | "list-failed";

export interface PersistenceDiagnostic {
  readonly name?: string;
  readonly message?: string;
}

export interface PersistenceFailure {
  readonly kind: PersistenceFailureKind;
  readonly operation: PersistenceOperation;
  readonly diagnostic?: PersistenceDiagnostic;
}

export type PersistenceResult<TValue> =
  | {
      readonly ok: true;
      readonly value: TValue;
    }
  | {
      readonly ok: false;
      readonly error: PersistenceFailure;
    };

export interface SettingsStorage {
  read(key: SettingsKey): PersistenceResult<JsonValue | null>;
  write(key: SettingsKey, value: JsonValue): PersistenceResult<void>;
  remove(key: SettingsKey): PersistenceResult<boolean>;
}

export interface SaveStorage {
  read(slotId: SaveSlotId): Promise<PersistenceResult<string | null>>;
  write(slotId: SaveSlotId, serialized: string): Promise<PersistenceResult<void>>;
  delete(slotId: SaveSlotId): Promise<PersistenceResult<boolean>>;
  list(): Promise<PersistenceResult<readonly SaveSlotId[]>>;
}

export interface SaveSlotSummary {
  readonly slotId: SaveSlotId;
}

export interface SaveService<TPayload> {
  load(slotId: SaveSlotId): Promise<PersistenceResult<TPayload | null>>;
  save(slotId: SaveSlotId, payload: TPayload): Promise<PersistenceResult<void>>;
  delete(slotId: SaveSlotId): Promise<PersistenceResult<boolean>>;
  list(): Promise<PersistenceResult<readonly SaveSlotSummary[]>>;
}
