import { LocalStorageSettingsStorage } from "../../../packages/foundation/src/storage/browser/index.ts";

const storage = new LocalStorageSettingsStorage({
  storage: window.localStorage,
  namespace: "browser-test",
});
const result = getRequiredElement<HTMLElement>("[data-testid='settings-result']");

getRequiredElement<HTMLButtonElement>("[data-testid='settings-write']").addEventListener(
  "click",
  () => {
    show(storage.write("example", { volume: 0.6, mode: "windowed" }));
  },
);

getRequiredElement<HTMLButtonElement>("[data-testid='settings-read']").addEventListener(
  "click",
  () => {
    show(storage.read("example"));
  },
);

getRequiredElement<HTMLButtonElement>("[data-testid='settings-remove']").addEventListener(
  "click",
  () => {
    show(storage.remove("example"));
  },
);

getRequiredElement<HTMLButtonElement>("[data-testid='settings-corrupt']").addEventListener(
  "click",
  () => {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.includes("/browser-test/")) {
        window.localStorage.setItem(key, "{broken");
      }
    }
    show(storage.read("example"));
  },
);

function show(value: unknown): void {
  result.textContent = JSON.stringify(value);
}

function getRequiredElement<TElement extends Element>(selector: string): TElement {
  const element = document.querySelector<TElement>(selector);
  if (!element) {
    throw new Error(`Missing settings fixture element: ${selector}`);
  }
  return element;
}
