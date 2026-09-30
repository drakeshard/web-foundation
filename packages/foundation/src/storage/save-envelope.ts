import type {
  ContentVersion,
  GameVersion,
  JsonValue,
  PersistenceResult,
  SaveFormatVersion,
} from "./contracts.js";

export type SaveTimestamp = string;
export type GameId = string;

export interface SaveEnvelope<TPayload extends JsonValue = JsonValue> {
  readonly gameId: GameId;
  readonly saveFormatVersion: SaveFormatVersion;
  readonly gameVersion: GameVersion;
  readonly contentVersion: ContentVersion;
  readonly createdAt: SaveTimestamp;
  readonly updatedAt: SaveTimestamp;
  readonly payload: TPayload;
}

export interface SaveEnvelopeMetadata {
  readonly gameId: GameId;
  readonly saveFormatVersion: SaveFormatVersion;
  readonly gameVersion: GameVersion;
  readonly contentVersion: ContentVersion;
  readonly createdAt: SaveTimestamp;
  readonly updatedAt: SaveTimestamp;
}

export function createSaveEnvelope<TPayload extends JsonValue>(
  metadata: SaveEnvelopeMetadata,
  payload: TPayload,
): PersistenceResult<SaveEnvelope<TPayload>> {
  const validation = validateMetadata(metadata);
  if (!validation.ok) {
    return validation;
  }

  return {
    ok: true,
    value: {
      gameId: metadata.gameId,
      saveFormatVersion: metadata.saveFormatVersion,
      gameVersion: metadata.gameVersion,
      contentVersion: metadata.contentVersion,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
      payload,
    },
  };
}

export function serializeSaveEnvelope<TPayload extends JsonValue>(
  envelope: SaveEnvelope<TPayload>,
): PersistenceResult<string> {
  const validation = validateSaveEnvelope(envelope);
  if (!validation.ok) {
    return validation;
  }

  try {
    return {
      ok: true,
      value: JSON.stringify({
        gameId: envelope.gameId,
        saveFormatVersion: envelope.saveFormatVersion,
        gameVersion: envelope.gameVersion,
        contentVersion: envelope.contentVersion,
        createdAt: envelope.createdAt,
        updatedAt: envelope.updatedAt,
        payload: envelope.payload,
      }),
    };
  } catch (error) {
    return corrupt(error);
  }
}

export function deserializeSaveEnvelope(
  serialized: string,
): PersistenceResult<SaveEnvelope<JsonValue>> {
  let value: unknown;

  try {
    value = JSON.parse(serialized);
  } catch (error) {
    return corrupt(error);
  }

  return validateSaveEnvelope(value);
}

export function validateSaveEnvelope(value: unknown): PersistenceResult<SaveEnvelope<JsonValue>> {
  if (!isRecord(value)) {
    return corruptMessage("Save envelope must be an object.");
  }

  const metadata: SaveEnvelopeMetadata = {
    gameId: value.gameId as string,
    saveFormatVersion: value.saveFormatVersion as number,
    gameVersion: value.gameVersion as string,
    contentVersion: value.contentVersion as string,
    createdAt: value.createdAt as string,
    updatedAt: value.updatedAt as string,
  };

  const metadataValidation = validateMetadata(metadata);
  if (!metadataValidation.ok) {
    return metadataValidation;
  }

  if (!isJsonValue(value.payload)) {
    return corruptMessage("Save envelope payload must be JSON-compatible.");
  }

  return {
    ok: true,
    value: {
      ...metadata,
      payload: value.payload,
    },
  };
}

function validateMetadata(metadata: SaveEnvelopeMetadata): PersistenceResult<SaveEnvelopeMetadata> {
  if (!isNonEmptyString(metadata.gameId)) {
    return corruptMessage("gameId must be a non-empty string.");
  }

  if (!Number.isSafeInteger(metadata.saveFormatVersion) || metadata.saveFormatVersion < 0) {
    return corruptMessage("saveFormatVersion must be a non-negative safe integer.");
  }

  if (!isNonEmptyString(metadata.gameVersion)) {
    return corruptMessage("gameVersion must be a non-empty string.");
  }

  if (!isNonEmptyString(metadata.contentVersion)) {
    return corruptMessage("contentVersion must be a non-empty string.");
  }

  if (!isIsoTimestamp(metadata.createdAt)) {
    return corruptMessage("createdAt must be an ISO-8601 timestamp.");
  }

  if (!isIsoTimestamp(metadata.updatedAt)) {
    return corruptMessage("updatedAt must be an ISO-8601 timestamp.");
  }

  return { ok: true, value: metadata };
}

function isIsoTimestamp(value: unknown): value is SaveTimestamp {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (isRecord(value)) {
    return Object.values(value).every(isJsonValue);
  }

  return false;
}

function corrupt(error: unknown): PersistenceResult<never> {
  if (error instanceof Error) {
    return {
      ok: false,
      error: {
        kind: "corrupt-data",
        operation: "decode",
        diagnostic: { name: error.name, message: error.message },
      },
    };
  }

  return corruptMessage("Save envelope could not be decoded.");
}

function corruptMessage(message: string): PersistenceResult<never> {
  return {
    ok: false,
    error: {
      kind: "corrupt-data",
      operation: "decode",
      diagnostic: { message },
    },
  };
}
