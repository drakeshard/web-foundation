import {
  createSaveEnvelope,
  deserializeSaveEnvelope,
  EnvelopeSaveService,
  type JsonValue,
  type PersistenceResult,
  SaveMigrationRegistry,
  type SaveEnvelope,
  serializeSaveEnvelope,
} from "@drakeshard/foundation/storage";
import { IndexedDbSaveStorage } from "@drakeshard/foundation/storage/browser";
import {
  snapshotToyDomain,
  TOY_PROBE_ID,
  type ToyDomainSnapshot,
  type ToyDomainState,
} from "../domain/index.js";

const PROBE_SAVE_SLOT = "probe";
const PROBE_SAVE_FORMAT_VERSION = 2;
const PROBE_LEGACY_SAVE_FORMAT_VERSION = 1;
const PROBE_GAME_ID = "drakeshard-renderer-probe";
const PROBE_GAME_VERSION = "0.1.0";
const PROBE_CONTENT_VERSION = "toy-domain-v1";
const FIXTURE_TIMESTAMP = "2026-01-01T00:00:00.000Z";

const LEGACY_FIXTURE_SNAPSHOT: ToyDomainSnapshot = {
  tick: 7,
  world: { width: 8, height: 8 },
  probe: { id: TOY_PROBE_ID, position: { x: 4, y: 2 } },
  marker: { position: { x: 6, y: 5 } },
};

export interface ProbePersistence {
  save(state: ToyDomainState): Promise<PersistenceResult<void>>;
  load(): Promise<PersistenceResult<ToyDomainSnapshot | null>>;
  inspect(): Promise<PersistenceResult<SaveEnvelope<JsonValue> | null>>;
  seedLegacySave(): Promise<PersistenceResult<void>>;
  seedCorruptSave(): Promise<PersistenceResult<void>>;
  seedUnsupportedSave(): Promise<PersistenceResult<void>>;
  seedInvalidPayloadSave(): Promise<PersistenceResult<void>>;
}

export function createProbePersistence(
  databaseName = "drakeshard-renderer-probe",
): ProbePersistence {
  const storage = new IndexedDbSaveStorage({ databaseName });
  const service = new EnvelopeSaveService<JsonValue>({
    storage,
    gameId: PROBE_GAME_ID,
    saveFormatVersion: PROBE_SAVE_FORMAT_VERSION,
    gameVersion: PROBE_GAME_VERSION,
    contentVersion: PROBE_CONTENT_VERSION,
    migrations: new SaveMigrationRegistry([
      {
        sourceVersion: PROBE_LEGACY_SAVE_FORMAT_VERSION,
        targetVersion: PROBE_SAVE_FORMAT_VERSION,
        migrate(payload) {
          return { ok: true, value: payload };
        },
      },
    ]),
    now: () => new Date().toISOString(),
  });

  return {
    async save(state: ToyDomainState): Promise<PersistenceResult<void>> {
      return service.save(PROBE_SAVE_SLOT, snapshotToJson(snapshotToyDomain(state)));
    },

    async load(): Promise<PersistenceResult<ToyDomainSnapshot | null>> {
      const loaded = await service.load(PROBE_SAVE_SLOT);
      if (!loaded.ok) {
        return loaded;
      }

      if (loaded.value === null) {
        return { ok: true, value: null };
      }

      return decodeToyDomainSnapshot(loaded.value);
    },

    async inspect(): Promise<PersistenceResult<SaveEnvelope<JsonValue> | null>> {
      const stored = await storage.read(PROBE_SAVE_SLOT);
      if (!stored.ok || stored.value === null) {
        return stored;
      }

      return deserializeSaveEnvelope(stored.value);
    },

    seedLegacySave(): Promise<PersistenceResult<void>> {
      return writeFixtureEnvelope(
        storage,
        PROBE_LEGACY_SAVE_FORMAT_VERSION,
        snapshotToJson(LEGACY_FIXTURE_SNAPSHOT),
      );
    },

    seedCorruptSave(): Promise<PersistenceResult<void>> {
      return storage.write(PROBE_SAVE_SLOT, "{broken");
    },

    seedUnsupportedSave(): Promise<PersistenceResult<void>> {
      return writeFixtureEnvelope(
        storage,
        PROBE_SAVE_FORMAT_VERSION + 1,
        snapshotToJson(LEGACY_FIXTURE_SNAPSHOT),
      );
    },

    seedInvalidPayloadSave(): Promise<PersistenceResult<void>> {
      return writeFixtureEnvelope(storage, PROBE_SAVE_FORMAT_VERSION, {
        tick: 3,
        world: { width: 8, height: 8 },
        probe: { id: TOY_PROBE_ID, position: { x: 99, y: 2 } },
        marker: { position: { x: 1, y: 1 } },
      });
    },
  };
}

export function decodeToyDomainSnapshot(value: JsonValue): PersistenceResult<ToyDomainSnapshot> {
  if (!isRecord(value)) {
    return corrupt("Toy-domain save payload must be an object.");
  }

  const { tick, world, probe, marker } = value;
  if (
    !isNonNegativeSafeInteger(tick) ||
    !isRecord(world) ||
    !isPositiveSafeInteger(world.width) ||
    !isPositiveSafeInteger(world.height) ||
    !isRecord(probe) ||
    probe.id !== TOY_PROBE_ID ||
    !isRecord(probe.position) ||
    !isRecord(marker) ||
    !isRecord(marker.position)
  ) {
    return corrupt("Toy-domain save payload shape is invalid.");
  }

  const probePosition = decodePoint(probe.position, world.width, world.height);
  const markerPosition = decodePoint(marker.position, world.width, world.height);
  if (!probePosition || !markerPosition) {
    return corrupt("Toy-domain save positions are invalid.");
  }

  return {
    ok: true,
    value: {
      tick,
      world: {
        width: world.width,
        height: world.height,
      },
      probe: {
        id: TOY_PROBE_ID,
        position: probePosition,
      },
      marker: {
        position: markerPosition,
      },
    },
  };
}

async function writeFixtureEnvelope(
  storage: IndexedDbSaveStorage,
  saveFormatVersion: number,
  payload: JsonValue,
): Promise<PersistenceResult<void>> {
  const envelope = createSaveEnvelope(
    {
      gameId: PROBE_GAME_ID,
      saveFormatVersion,
      gameVersion: PROBE_GAME_VERSION,
      contentVersion: PROBE_CONTENT_VERSION,
      createdAt: FIXTURE_TIMESTAMP,
      updatedAt: FIXTURE_TIMESTAMP,
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

  return storage.write(PROBE_SAVE_SLOT, serialized.value);
}

function snapshotToJson(snapshot: ToyDomainSnapshot): JsonValue {
  return {
    tick: snapshot.tick,
    world: {
      width: snapshot.world.width,
      height: snapshot.world.height,
    },
    probe: {
      id: snapshot.probe.id,
      position: {
        x: snapshot.probe.position.x,
        y: snapshot.probe.position.y,
      },
    },
    marker: {
      position: {
        x: snapshot.marker.position.x,
        y: snapshot.marker.position.y,
      },
    },
  };
}

function decodePoint(
  value: Record<string, JsonValue>,
  width: number,
  height: number,
): { readonly x: number; readonly y: number } | null {
  const { x, y } = value;
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    !Number.isSafeInteger(x) ||
    !Number.isSafeInteger(y) ||
    x < 0 ||
    x >= width ||
    y < 0 ||
    y >= height
  ) {
    return null;
  }

  return { x, y };
}

function isRecord(value: JsonValue | undefined): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeSafeInteger(value: JsonValue | undefined): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isPositiveSafeInteger(value: JsonValue | undefined): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function corrupt(message: string): PersistenceResult<never> {
  return {
    ok: false,
    error: {
      kind: "corrupt-data",
      operation: "decode",
      diagnostic: { message },
    },
  };
}
