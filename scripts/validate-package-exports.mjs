import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packages = {
  foundation: {
    name: "@drakeshard/foundation",
    dir: path.join(root, "packages/foundation"),
    exports: [
      "./input",
      "./input/browser",
      "./random",
      "./time",
      "./storage",
      "./storage/browser",
    ],
  },
  testing: {
    name: "@drakeshard/testing",
    dir: path.join(root, "packages/testing"),
    exports: ["./clock"],
  },
};

const forbiddenSharedDependencies = new Set([
  "phaser",
  "playcanvas",
  "preact",
  "@preact/signals",
]);

for (const [key, spec] of Object.entries(packages)) {
  const manifest = JSON.parse(fs.readFileSync(path.join(spec.dir, "package.json"), "utf8"));

  assert(manifest.name === spec.name, `${key}: unexpected package name`);
  assert(manifest.version === "0.1.0", `${key}: expected v0.1.0 release-candidate version`);
  assert(manifest.private === true, `${key}: package must remain private until S08-05 decides distribution`);
  assert(manifest.type === "module", `${key}: package must remain ESM`);
  assert(manifest.sideEffects === false, `${key}: shared package modules must declare no import-time side effects`);
  assert(
    JSON.stringify(manifest.files) === JSON.stringify(["dist"]),
    `${key}: only dist should be included in a future package artifact`,
  );

  const exportKeys = Object.keys(manifest.exports ?? {});
  assert(
    JSON.stringify(exportKeys) === JSON.stringify(spec.exports),
    `${key}: public subpaths changed: ${JSON.stringify(exportKeys)}`,
  );
  assert(!("." in (manifest.exports ?? {})), `${key}: root catch-all export is not approved`);

  for (const subpath of spec.exports) {
    const entry = manifest.exports[subpath];
    assert(entry && typeof entry === "object", `${key} ${subpath}: missing export entry`);
    for (const condition of ["types", "import"]) {
      const target = entry[condition];
      assert(typeof target === "string", `${key} ${subpath}: missing ${condition} target`);
      assert(
        fs.existsSync(path.resolve(spec.dir, target)),
        `${key} ${subpath}: ${condition} target does not exist: ${target}`,
      );
    }
  }

  for (const section of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
    for (const dependency of Object.keys(manifest[section] ?? {})) {
      assert(
        !forbiddenSharedDependencies.has(dependency),
        `${key}: forbidden shared-manifest dependency ${dependency} in ${section}`,
      );
    }
  }

  assert(!fs.existsSync(path.join(spec.dir, "dist/index.js")), `${key}: obsolete root runtime artifact exists`);
  assert(!fs.existsSync(path.join(spec.dir, "dist/index.d.ts")), `${key}: obsolete root type artifact exists`);
}

const foundationManifest = JSON.parse(
  fs.readFileSync(path.join(packages.foundation.dir, "package.json"), "utf8"),
);
assert(
  JSON.stringify(foundationManifest.dependencies) === JSON.stringify({ idb: "8.0.3" }),
  "foundation: runtime dependency set changed",
);

const testingManifest = JSON.parse(
  fs.readFileSync(path.join(packages.testing.dir, "package.json"), "utf8"),
);
assert(
  Object.keys(testingManifest.dependencies ?? {}).length === 0,
  "testing: unexpected runtime dependency",
);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "drakeshard-package-consumer-"));

try {
  const scopeDir = path.join(temp, "node_modules", "@drakeshard");
  fs.mkdirSync(scopeDir, { recursive: true });
  fs.symlinkSync(packages.foundation.dir, path.join(scopeDir, "foundation"), "dir");
  fs.symlinkSync(packages.testing.dir, path.join(scopeDir, "testing"), "dir");

  fs.writeFileSync(path.join(temp, "package.json"), '{"type":"module"}\n');

  const runtimeSpecifiers = [
    "@drakeshard/foundation/input",
    "@drakeshard/foundation/input/browser",
    "@drakeshard/foundation/random",
    "@drakeshard/foundation/time",
    "@drakeshard/foundation/storage",
    "@drakeshard/foundation/storage/browser",
    "@drakeshard/testing/clock",
  ];

  fs.writeFileSync(
    path.join(temp, "consumer.mjs"),
    `const specifiers = ${JSON.stringify(runtimeSpecifiers)};\nfor (const specifier of specifiers) {\n  const module = await import(specifier);\n  if (Object.keys(module).length === 0) throw new Error("empty module: " + specifier);\n}\n`,
  );

  execFileSync(process.execPath, [path.join(temp, "consumer.mjs")], {
    cwd: temp,
    stdio: "inherit",
  });

  fs.writeFileSync(
    path.join(temp, "consumer.ts"),
    `import {
  ActionBindingResolver,
  InputContextRouter,
  MonotonicInputSequence,
  TickInputHandoff,
  type PhysicalInputEvent,
  type ScreenPosition,
} from "@drakeshard/foundation/input";
import {
  BrowserInputLifecycle,
  KeyboardBrowserAdapter,
  PointerBrowserAdapter,
} from "@drakeshard/foundation/input/browser";
import {
  DeterministicRng,
  RNG_ALGORITHM_ID,
  type DeterministicRngState,
} from "@drakeshard/foundation/random";
import {
  FixedStepDriver,
  type FixedStepAdvanceResult,
} from "@drakeshard/foundation/time";
import {
  EnvelopeSaveService,
  SaveMigrationRegistry,
  createSaveEnvelope,
  deserializeSaveEnvelope,
  serializeSaveEnvelope,
  validateSaveEnvelope,
  type JsonValue,
  type PersistenceResult,
  type SaveEnvelope,
  type SaveService,
  type SaveStorage,
  type SettingsStorage,
} from "@drakeshard/foundation/storage";
import {
  IndexedDbSaveStorage,
  LocalStorageSettingsStorage,
  type BrowserKeyValueStorage,
} from "@drakeshard/foundation/storage/browser";
import { ManualClock } from "@drakeshard/testing/clock";

const sequence = new MonotonicInputSequence();
const actions = new ActionBindingResolver();
const contexts = new InputContextRouter();
const handoff = new TickInputHandoff({ actions, contexts });
const rng = new DeterministicRng(1);
const driver = new FixedStepDriver({
  stepMs: 50,
  maxFrameDeltaMs: 250,
  maxStepsPerFrame: 5,
});
const clock = new ManualClock();
const position: ScreenPosition = { x: 1, y: 2 };
const event: PhysicalInputEvent = {
  kind: "pointer-position",
  sequence: sequence.next(),
  pointerId: 1,
  pointerType: "mouse",
  position,
};
handoff.ingest(event);
const frame: FixedStepAdvanceResult = driver.advance(clock.advanceBy(16));
const state: DeterministicRngState = rng.snapshot();
if (state.algorithm !== RNG_ALGORITHM_ID) throw new Error("unexpected RNG algorithm");

void frame;
void BrowserInputLifecycle;
void KeyboardBrowserAdapter;
void PointerBrowserAdapter;
void EnvelopeSaveService;
void SaveMigrationRegistry;
void createSaveEnvelope;
void deserializeSaveEnvelope;
void serializeSaveEnvelope;
void validateSaveEnvelope;
void IndexedDbSaveStorage;
void LocalStorageSettingsStorage;

type ConsumerTypeCoverage =
  | JsonValue
  | PersistenceResult<JsonValue>
  | SaveEnvelope<JsonValue>
  | SaveService<JsonValue>
  | SaveStorage
  | SettingsStorage
  | BrowserKeyValueStorage;
const typeCoverage: ConsumerTypeCoverage | undefined = undefined;
void typeCoverage;
`,
  );

  fs.writeFileSync(
    path.join(temp, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          strict: true,
          noEmit: true,
          skipLibCheck: false,
        },
        include: ["consumer.ts"],
      },
      null,
      2,
    ),
  );

  const tsc = path.join(root, "node_modules", "typescript", "bin", "tsc");
  assert(fs.existsSync(tsc), "TypeScript CLI is unavailable; run pnpm install first");
  execFileSync(process.execPath, [tsc, "-p", path.join(temp, "tsconfig.json")], {
    cwd: temp,
    stdio: "inherit",
  });
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log("Public package consumer validation: OK");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
