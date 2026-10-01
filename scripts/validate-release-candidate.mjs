import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "drakeshard-release-candidate-"));
const packDir = path.join(temp, "artifacts");
const consumerDir = path.join(temp, "consumer");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

fs.mkdirSync(packDir, { recursive: true });
fs.mkdirSync(consumerDir, { recursive: true });

try {
  run(
    pnpm,
    ["--dir", path.join(root, "packages/foundation"), "pack", "--pack-destination", packDir],
    root,
  );
  run(
    pnpm,
    ["--dir", path.join(root, "packages/testing"), "pack", "--pack-destination", packDir],
    root,
  );

  const tarballs = fs
    .readdirSync(packDir)
    .filter((name) => name.endsWith(".tgz"))
    .sort();

  assert(
    tarballs.length === 2,
    `expected exactly two release-candidate tarballs, got ${tarballs.length}`,
  );

  const foundationTarball = findArtifact(tarballs, "foundation");
  const testingTarball = findArtifact(tarballs, "testing");

  for (const artifact of tarballs) {
    const file = path.join(packDir, artifact);
    const digest = createHash("sha256").update(fs.readFileSync(file)).digest("hex");
    console.log(`SHA256 ${digest}  ${artifact}`);
  }

  fs.writeFileSync(
    path.join(consumerDir, "package.json"),
    `${JSON.stringify(
      {
        name: "drakeshard-foundation-release-candidate-consumer",
        private: true,
        type: "module",
        version: "0.0.0",
      },
      null,
      2,
    )}\n`,
  );

  run(
    pnpm,
    ["add", "--prefer-offline", "--save-exact", path.join(packDir, foundationTarball)],
    consumerDir,
  );
  run(
    pnpm,
    ["add", "--prefer-offline", "--save-dev", "--save-exact", path.join(packDir, testingTarball)],
    consumerDir,
  );

  assert(
    fs.existsSync(path.join(consumerDir, "pnpm-lock.yaml")),
    "consumer lockfile was not created",
  );

  assertInstalledPackageShape(
    path.join(consumerDir, "node_modules/@drakeshard/foundation"),
    "@drakeshard/foundation",
    "0.1.1",
    ["./input", "./input/browser", "./random", "./time", "./storage", "./storage/browser"],
  );
  assertInstalledPackageShape(
    path.join(consumerDir, "node_modules/@drakeshard/testing"),
    "@drakeshard/testing",
    "0.1.1",
    ["./clock"],
  );

  fs.writeFileSync(
    path.join(consumerDir, "consumer.mjs"),
    `import {
  ActionBindingResolver,
  InputContextRouter,
  MonotonicInputSequence,
  TickInputHandoff,
} from "@drakeshard/foundation/input";
import {
  BrowserInputLifecycle,
  KeyboardBrowserAdapter,
  PointerBrowserAdapter,
} from "@drakeshard/foundation/input/browser";
import {
  DeterministicRng,
  RNG_ALGORITHM_ID,
} from "@drakeshard/foundation/random";
import { FixedStepDriver } from "@drakeshard/foundation/time";
import {
  EnvelopeSaveService,
  SaveMigrationRegistry,
} from "@drakeshard/foundation/storage";
import {
  IndexedDbSaveStorage,
  LocalStorageSettingsStorage,
} from "@drakeshard/foundation/storage/browser";
import { ManualClock } from "@drakeshard/testing/clock";

const driver = new FixedStepDriver({
  stepMs: 50,
  maxFrameDeltaMs: 250,
  maxStepsPerFrame: 5,
});
const frame = driver.advance(50);
if (frame.steps !== 1 || frame.overrun) {
  throw new Error("fixed-step release artifact behavior mismatch");
}

const left = new DeterministicRng(1234);
const right = new DeterministicRng(1234);
if (left.nextUint32() !== right.nextUint32()) {
  throw new Error("deterministic RNG release artifact mismatch");
}
if (left.snapshot().algorithm !== RNG_ALGORITHM_ID) {
  throw new Error("unexpected RNG compatibility identity");
}

const backing = new Map();
const browserStorage = {
  getItem(key) {
    return backing.has(key) ? backing.get(key) : null;
  },
  setItem(key, value) {
    backing.set(key, value);
  },
  removeItem(key) {
    backing.delete(key);
  },
};

const settings = new LocalStorageSettingsStorage({
  storage: browserStorage,
  namespace: "release-candidate",
});
const written = settings.write("volume", 0.75);
if (!written.ok) throw new Error("settings write failed through packed browser boundary");
const loaded = settings.read("volume");
if (!loaded.ok || loaded.value !== 0.75) {
  throw new Error("settings read failed through packed browser boundary");
}

const clock = new ManualClock();
if (clock.advanceBy(16) !== 16) {
  throw new Error("testing package clock mismatch");
}

// Ensure every approved runtime entry point resolves from the packed consumer.
// These values are intentionally not instantiated where a real DOM/IndexedDB host is required.
void ActionBindingResolver;
void InputContextRouter;
void MonotonicInputSequence;
void TickInputHandoff;
void BrowserInputLifecycle;
void KeyboardBrowserAdapter;
void PointerBrowserAdapter;
void EnvelopeSaveService;
void SaveMigrationRegistry;
void IndexedDbSaveStorage;

console.log("Release-candidate tarball consumer validation: OK");
`,
  );

  run(process.execPath, [path.join(consumerDir, "consumer.mjs")], consumerDir);

  const consumerManifest = JSON.parse(
    fs.readFileSync(path.join(consumerDir, "package.json"), "utf8"),
  );
  const foundationSpec = consumerManifest.dependencies?.["@drakeshard/foundation"];
  const testingSpec = consumerManifest.devDependencies?.["@drakeshard/testing"];

  assert(
    typeof foundationSpec === "string" && foundationSpec.includes(".tgz"),
    "consumer did not pin the Foundation tarball",
  );
  assert(
    typeof testingSpec === "string" && testingSpec.includes(".tgz"),
    "consumer did not pin the Testing tarball",
  );

  console.log("Release-candidate validation environment:");
  console.log(`  Node: ${process.version}`);
  console.log(`  Platform: ${process.platform} ${process.arch}`);
  console.log(`  Foundation artifact: ${foundationTarball}`);
  console.log(`  Testing artifact: ${testingTarball}`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

function run(command, args, cwd) {
  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
}

function findArtifact(artifacts, packageNamePart) {
  const matches = artifacts.filter((name) => name.includes(packageNamePart));
  assert(
    matches.length === 1,
    `expected one ${packageNamePart} artifact, got ${JSON.stringify(matches)}`,
  );
  return matches[0];
}

function assertInstalledPackageShape(packageDir, expectedName, expectedVersion, expectedExports) {
  const manifestPath = path.join(packageDir, "package.json");
  assert(fs.existsSync(manifestPath), `${expectedName}: installed manifest missing`);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert(manifest.name === expectedName, `${expectedName}: installed name mismatch`);
  assert(manifest.version === expectedVersion, `${expectedName}: installed version mismatch`);
  assert(
    JSON.stringify(Object.keys(manifest.exports ?? {})) === JSON.stringify(expectedExports),
    `${expectedName}: installed export surface mismatch`,
  );
  assert(fs.existsSync(path.join(packageDir, "dist")), `${expectedName}: dist missing`);
  assert(
    fs.existsSync(path.join(packageDir, "README.md")),
    `${expectedName}: README missing from package`,
  );
  assert(
    fs.existsSync(path.join(packageDir, "LICENSE")),
    `${expectedName}: LICENSE missing from package`,
  );
  assert(manifest.license === "Apache-2.0", `${expectedName}: license metadata mismatch`);
  assert(
    manifest.publishConfig?.access === "public",
    `${expectedName}: public npm publish configuration missing`,
  );
  assert(
    !JSON.stringify(manifest).includes("workspace:"),
    `${expectedName}: workspace protocol leaked into packed manifest`,
  );
  assert(
    !fs.existsSync(path.join(packageDir, "src")),
    `${expectedName}: source files leaked into package`,
  );
  assert(
    !fs.existsSync(path.join(packageDir, "dist/index.js")),
    `${expectedName}: obsolete root runtime artifact leaked`,
  );
  assert(
    !fs.existsSync(path.join(packageDir, "dist/index.d.ts")),
    `${expectedName}: obsolete root type artifact leaked`,
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
