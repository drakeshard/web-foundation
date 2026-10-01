import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { findInstalledPackageShapeViolations } from "./installed-package-shape.mjs";

const roots = [];

function fixture({ includeDist = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "drakeshard-installed-package-"));
  roots.push(root);

  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "@drakeshard/foundation",
      version: "0.1.2",
      type: "module",
      exports: {
        "./time": {
          types: "./dist/time/index.d.ts",
          import: "./dist/time/index.js",
        },
      },
      files: ["dist"],
      license: "Apache-2.0",
      publishConfig: { access: "public" },
    }),
  );
  fs.writeFileSync(path.join(root, "README.md"), "# fixture\n");
  fs.writeFileSync(path.join(root, "LICENSE"), "Apache-2.0 fixture\n");

  if (includeDist) {
    fs.mkdirSync(path.join(root, "dist", "time"), { recursive: true });
    fs.writeFileSync(path.join(root, "dist", "time", "index.js"), "export const ok = true;\n");
    fs.writeFileSync(
      path.join(root, "dist", "time", "index.d.ts"),
      "export declare const ok: true;\n",
    );
  }

  return root;
}

test.afterEach(() => {
  while (roots.length > 0) {
    fs.rmSync(roots.pop(), { recursive: true, force: true });
  }
});

const spec = {
  expectedName: "@drakeshard/foundation",
  expectedVersion: "0.1.2",
  expectedExports: ["./time"],
};

test("accepts an installed package with concrete export targets", () => {
  assert.deepEqual(findInstalledPackageShapeViolations(fixture(), spec), []);
});

test("rejects the npm 0.1.1 failure mode where dist is missing", () => {
  const violations = findInstalledPackageShapeViolations(fixture({ includeDist: false }), spec);

  assert.ok(violations.includes("@drakeshard/foundation: dist missing"));
  assert.ok(
    violations.some((violation) =>
      violation.includes("installed types target does not exist: ./dist/time/index.d.ts"),
    ),
  );
  assert.ok(
    violations.some((violation) =>
      violation.includes("installed import target does not exist: ./dist/time/index.js"),
    ),
  );
});
