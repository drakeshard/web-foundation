import { describe, expect, it } from "vitest";

import type { BrowserKeyValueStorage } from "../src/storage/browser/index.ts";
import { LocalStorageSettingsStorage } from "../src/storage/browser/index.ts";

class MemoryStorage implements BrowserKeyValueStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("LocalStorageSettingsStorage", () => {
  it("round-trips JSON values with namespace and key isolation", () => {
    const raw = new MemoryStorage();
    const first = new LocalStorageSettingsStorage({ storage: raw, namespace: "game:prod" });
    const second = new LocalStorageSettingsStorage({ storage: raw, namespace: "game:test" });

    expect(first.write("audio/master", { volume: 0.75, muted: false })).toEqual({
      ok: true,
      value: undefined,
    });
    expect(second.read("audio/master")).toEqual({ ok: true, value: null });
    expect(first.read("audio/master")).toEqual({
      ok: true,
      value: { volume: 0.75, muted: false },
    });

    expect([...raw.values.keys()]).toEqual([
      "@drakeshard/settings/game%3Aprod/audio%2Fmaster",
    ]);
  });

  it("returns structured corruption when persisted JSON is malformed", () => {
    const raw = new MemoryStorage();
    raw.values.set("@drakeshard/settings/game/key", "{broken");
    const storage = new LocalStorageSettingsStorage({ storage: raw, namespace: "game" });

    const result = storage.read("key");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("corrupt-data");
      expect(result.error.operation).toBe("decode");
    }
  });

  it("reports whether a removed key existed", () => {
    const raw = new MemoryStorage();
    const storage = new LocalStorageSettingsStorage({ storage: raw, namespace: "game" });

    expect(storage.remove("missing")).toEqual({ ok: true, value: false });
    storage.write("present", true);
    expect(storage.remove("present")).toEqual({ ok: true, value: true });
    expect(storage.read("present")).toEqual({ ok: true, value: null });
  });

  it("classifies quota failures without exposing the storage exception", () => {
    const error = new Error("capacity");
    error.name = "QuotaExceededError";
    const raw: BrowserKeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw error;
      },
      removeItem: () => {},
    };
    const storage = new LocalStorageSettingsStorage({ storage: raw, namespace: "game" });

    expect(storage.write("key", "value")).toEqual({
      ok: false,
      error: {
        kind: "quota-exceeded",
        operation: "write",
        diagnostic: { name: "QuotaExceededError", message: "capacity" },
      },
    });
  });

  it("converts storage access failures into structured operation failures", () => {
    const error = new Error("denied");
    error.name = "SecurityError";
    const raw: BrowserKeyValueStorage = {
      getItem: () => {
        throw error;
      },
      setItem: () => {
        throw error;
      },
      removeItem: () => {
        throw error;
      },
    };
    const storage = new LocalStorageSettingsStorage({ storage: raw, namespace: "game" });

    expect(storage.read("key")).toMatchObject({
      ok: false,
      error: { kind: "read-failed", operation: "read" },
    });
    expect(storage.write("key", true)).toMatchObject({
      ok: false,
      error: { kind: "write-failed", operation: "write" },
    });
    expect(storage.remove("key")).toMatchObject({
      ok: false,
      error: { kind: "delete-failed", operation: "delete" },
    });
  });
});
