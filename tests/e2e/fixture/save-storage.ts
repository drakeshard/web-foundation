import { IndexedDbSaveStorage } from "../../../packages/foundation/src/storage/browser/index.ts";

const storage = new IndexedDbSaveStorage({
  databaseName: "drakeshard-browser-save-test",
});
const result = getRequiredElement<HTMLElement>("[data-testid='save-storage-result']");

getRequiredElement<HTMLButtonElement>("[data-testid='save-storage-write']").addEventListener(
  "click",
  async () => {
    show(await storage.write("slot-b", '{"fixture":"beta"}'));
  },
);

getRequiredElement<HTMLButtonElement>("[data-testid='save-storage-write-a']").addEventListener(
  "click",
  async () => {
    show(await storage.write("slot-a", '{"fixture":"alpha"}'));
  },
);

getRequiredElement<HTMLButtonElement>("[data-testid='save-storage-read']").addEventListener(
  "click",
  async () => {
    show(await storage.read("slot-b"));
  },
);

getRequiredElement<HTMLButtonElement>("[data-testid='save-storage-list']").addEventListener(
  "click",
  async () => {
    show(await storage.list());
  },
);

getRequiredElement<HTMLButtonElement>("[data-testid='save-storage-delete']").addEventListener(
  "click",
  async () => {
    show(await storage.delete("slot-b"));
  },
);

function show(value: unknown): void {
  result.textContent = JSON.stringify(value);
}

function getRequiredElement<TElement extends Element>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector);
  if (!element) {
    throw new Error(`Missing save-storage fixture element: ${selector}`);
  }
  return element;
}
