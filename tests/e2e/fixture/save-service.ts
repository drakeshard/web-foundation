import { IndexedDbSaveStorage } from "../../../packages/foundation/src/storage/browser/index.ts";
import {
  deserializeSaveEnvelope,
  EnvelopeSaveService,
  type JsonValue,
  SaveMigrationRegistry,
} from "../../../packages/foundation/src/storage/index.ts";

const databaseName = "drakeshard-browser-service-test";
const rawStorage = new IndexedDbSaveStorage({ databaseName });
const migrations = new SaveMigrationRegistry([
  {
    sourceVersion: 1,
    targetVersion: 2,
    migrate: (payload) => ({
      ok: true,
      value: {
        ...(payload as Record<string, JsonValue>),
        mana: 5,
      },
    }),
  },
  {
    sourceVersion: 2,
    targetVersion: 3,
    migrate: (payload) => ({
      ok: true,
      value: {
        ...(payload as Record<string, JsonValue>),
        armor: 2,
      },
    }),
  },
]);
const service = new EnvelopeSaveService<JsonValue>({
  storage: rawStorage,
  gameId: "browser-game",
  saveFormatVersion: 3,
  gameVersion: "1.0.0",
  contentVersion: "base",
  migrations,
  now: () => "2026-09-30T12:00:00.000Z",
});
const failingService = new EnvelopeSaveService<JsonValue>({
  storage: rawStorage,
  gameId: "browser-game",
  saveFormatVersion: 2,
  gameVersion: "1.0.0",
  contentVersion: "base",
  migrations: new SaveMigrationRegistry([
    {
      sourceVersion: 1,
      targetVersion: 2,
      migrate: () => ({
        ok: false,
        error: {
          kind: "migration-failed",
          operation: "migrate",
          diagnostic: { message: "fixture migration failure" },
        },
      }),
    },
  ]),
  now: () => "2026-09-30T12:00:00.000Z",
});
const result = getRequiredElement<HTMLElement>("[data-testid='save-service-result']");

getRequiredElement<HTMLButtonElement>("[data-testid='save-service-save']").addEventListener(
  "click",
  async () => {
    show(await service.save("slot", { hp: 12, party: ["mage", "guard"] }));
  },
);

getRequiredElement<HTMLButtonElement>("[data-testid='save-service-load']").addEventListener(
  "click",
  async () => {
    show(await service.load("slot"));
  },
);

getRequiredElement<HTMLButtonElement>("[data-testid='save-service-inspect']").addEventListener(
  "click",
  async () => {
    const stored = await rawStorage.read("slot");
    if (!stored.ok || stored.value === null) {
      show(stored);
      return;
    }

    show(deserializeSaveEnvelope(stored.value));
  },
);

getRequiredElement<HTMLButtonElement>("[data-testid='save-service-seed-legacy']").addEventListener(
  "click",
  async () => {
    show(
      await rawStorage.write(
        "slot",
        '{"gameId":"browser-game","saveFormatVersion":1,"gameVersion":"0.8.0","contentVersion":"legacy","createdAt":"2026-09-30T11:00:00.000Z","updatedAt":"2026-09-30T11:00:00.000Z","payload":{"hp":10}}',
      ),
    );
  },
);

getRequiredElement<HTMLButtonElement>("[data-testid='save-service-seed-corrupt']").addEventListener(
  "click",
  async () => {
    show(await rawStorage.write("slot", "{broken"));
  },
);

getRequiredElement<HTMLButtonElement>("[data-testid='save-service-seed-future']").addEventListener(
  "click",
  async () => {
    show(
      await rawStorage.write(
        "slot",
        '{"gameId":"browser-game","saveFormatVersion":4,"gameVersion":"2.0.0","contentVersion":"future","createdAt":"2026-09-30T11:00:00.000Z","updatedAt":"2026-09-30T11:00:00.000Z","payload":{"hp":99}}',
      ),
    );
  },
);

getRequiredElement<HTMLButtonElement>(
  "[data-testid='save-service-load-failing']",
).addEventListener("click", async () => {
  show(await failingService.load("slot"));
});

function show(value: unknown): void {
  result.textContent = JSON.stringify(value);
}

function getRequiredElement<TElement extends Element>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector);
  if (!element) {
    throw new Error(`Missing save-service fixture element: ${selector}`);
  }
  return element;
}
