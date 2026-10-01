import assert from "node:assert/strict";
import test from "node:test";

import { comparePublicApiSnapshots } from "./validate-public-api.mjs";

function snapshot({
  exports = { "./time": { types: "./dist/time/index.d.ts", import: "./dist/time/index.js" } },
  symbols = ["FixedStepDriver"],
} = {}) {
  return {
    schemaVersion: 1,
    packages: {
      foundation: {
        name: "@drakeshard/foundation",
        exports,
        symbols: { "./time": symbols },
      },
    },
  };
}

test("accepts identical public API snapshots", () => {
  assert.deepEqual(comparePublicApiSnapshots(snapshot(), snapshot()), []);
});

test("detects added public symbols", () => {
  assert.match(
    comparePublicApiSnapshots(
      snapshot(),
      snapshot({ symbols: ["FixedStepDriver", "NewPublicHelper"] }),
    ).join("\n"),
    /public symbols added: NewPublicHelper/,
  );
});

test("detects removed public symbols", () => {
  assert.match(
    comparePublicApiSnapshots(
      snapshot({ symbols: ["FixedStepDriver", "OldName"] }),
      snapshot(),
    ).join("\n"),
    /public symbols removed: OldName/,
  );
});

test("detects export-map drift", () => {
  assert.match(
    comparePublicApiSnapshots(
      snapshot(),
      snapshot({
        exports: {
          "./time": { types: "./dist/time/index.d.ts", import: "./dist/time/index.js" },
          "./extra": { types: "./dist/extra/index.d.ts", import: "./dist/extra/index.js" },
        },
      }),
    ).join("\n"),
    /export map changed/,
  );
});

test("detects conditional export ordering drift", () => {
  assert.match(
    comparePublicApiSnapshots(
      snapshot(),
      snapshot({
        exports: {
          "./time": { import: "./dist/time/index.js", types: "./dist/time/index.d.ts" },
        },
      }),
    ).join("\n"),
    /export map changed/,
  );
});
