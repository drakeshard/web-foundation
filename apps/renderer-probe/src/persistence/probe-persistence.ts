import {
  EnvelopeSaveService,
  type JsonValue,
  type PersistenceResult,
  SaveMigrationRegistry,
} from "@drakeshard/foundation/storage";
import { IndexedDbSaveStorage } from "@drakeshard/foundation/storage/browser";
import {
  snapshotToyDomain,
  TOY_PROBE_ID,
  type ToyDomainSnapshot,
  type ToyDomainState,
} from "../domain/index.js";

const PROBE_SAVE_SLOT = "probe";
const PROBE_SAVE_FORMAT_VERSION = 1;

export interface ProbePersistence {
  save(state: ToyDomainState): Promise<PersistenceResult<void>>;
  load(): Promise<PersistenceResult<ToyDomainSnapshot | null>>;
  seedCorruptSave(): Promise<PersistenceResult<void>>;
}

export function createProbePersistence(
  databaseName = "drakeshard-renderer-probe",
): ProbePersistence {
  const storage = new IndexedDbSaveStorage({ databaseName });
  const service = new EnvelopeSaveService<JsonValue>({
    storage,
    gameId: "drakeshard-renderer-probe",
    saveFormatVersion: PROBE_SAVE_FORMAT_VERSION,
    gameVersion: "0.1.0",
    contentVersion: "toy-domain-v1",
    migrations: new SaveMigrationRegistry([]),
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

    seedCorruptSave(): Promise<PersistenceResult<void>> {
      return storage.write(PROBE_SAVE_SLOT, "{broken");
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
