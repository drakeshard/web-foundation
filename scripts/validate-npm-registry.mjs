import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = "https://registry.npmjs.org";
const packageVersion = normalizeVersion(process.argv[2]);
const packages = ["@drakeshard/foundation", "@drakeshard/testing"];
const publicSubpaths = [
  "@drakeshard/foundation/time",
  "@drakeshard/foundation/random",
  "@drakeshard/foundation/input",
  "@drakeshard/foundation/input/browser",
  "@drakeshard/foundation/storage",
  "@drakeshard/foundation/storage/browser",
  "@drakeshard/testing/clock",
];

const propagationAttempts = 8;
const installAttempts = 3;
const retryDelayMs = 5_000;
const npmViewTimeoutMs = 10_000;
const installTimeoutMs = 60_000;

const verifiedVersions = waitForRegistryPropagation();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "drakeshard-npm-registry-consumer-"));
const consumerDir = path.join(temp, "consumer");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

fs.mkdirSync(consumerDir, { recursive: true });
assert(
  !isPathWithin(root, consumerDir),
  "registry consumer must be outside the repository workspace",
);

try {
  writeConsumerManifest();
  installRegistryPackages();

  assertInstalledVersion("@drakeshard/foundation", packageVersion);
  assertInstalledVersion("@drakeshard/testing", packageVersion);

  fs.writeFileSync(
    path.join(consumerDir, "consumer.mjs"),
    `const specifiers = ${JSON.stringify(publicSubpaths, null, 2)};
const modules = new Map();

for (const specifier of specifiers) {
  const module = await import(specifier);
  if (Object.keys(module).length === 0) {
    throw new Error("empty public module: " + specifier);
  }
  modules.set(specifier, module);
}

const { FixedStepDriver } = modules.get("@drakeshard/foundation/time");
const { DeterministicRng, RNG_ALGORITHM_ID } = modules.get("@drakeshard/foundation/random");
const { ManualClock } = modules.get("@drakeshard/testing/clock");

const driver = new FixedStepDriver({
  stepMs: 50,
  maxFrameDeltaMs: 250,
  maxStepsPerFrame: 5,
});
const frame = driver.advance(50);
if (frame.steps !== 1 || frame.overrun) {
  throw new Error("fixed-step registry package behavior mismatch");
}

const left = new DeterministicRng(1234);
const right = new DeterministicRng(1234);
if (left.nextUint32() !== right.nextUint32()) {
  throw new Error("deterministic RNG registry package mismatch");
}
if (left.snapshot().algorithm !== RNG_ALGORITHM_ID) {
  throw new Error("unexpected RNG compatibility identity");
}

const clock = new ManualClock();
if (clock.advanceBy(16) !== 16) {
  throw new Error("testing package ManualClock mismatch");
}

console.log("npm registry consumer validation: OK");
`,
  );

  run(process.execPath, [path.join(consumerDir, "consumer.mjs")], consumerDir, installTimeoutMs);

  const consumerManifest = JSON.parse(
    fs.readFileSync(path.join(consumerDir, "package.json"), "utf8"),
  );
  assert(
    consumerManifest.dependencies?.["@drakeshard/foundation"] === packageVersion,
    "consumer did not pin the exact Foundation registry version",
  );
  assert(
    consumerManifest.devDependencies?.["@drakeshard/testing"] === packageVersion,
    "consumer did not pin the exact Testing registry version",
  );

  writeStepSummary(verifiedVersions);
  console.log(`Verified npm registry packages at ${packageVersion}:`);
  for (const packageName of packages) {
    console.log(`  ${packageName}@${verifiedVersions[packageName]}`);
  }
  console.log(`Imported ${publicSubpaths.length} approved public runtime subpaths.`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

function waitForRegistryPropagation() {
  for (let attempt = 1; attempt <= propagationAttempts; attempt += 1) {
    const versions = {};
    let ready = true;

    for (const packageName of packages) {
      try {
        const observed = npmViewVersion(packageName, packageVersion);
        versions[packageName] = observed;
        if (observed !== packageVersion) ready = false;
      } catch (error) {
        ready = false;
        console.warn(`${packageName}@${packageVersion} is not visible yet: ${formatError(error)}`);
      }
    }

    if (ready) return versions;
    if (attempt === propagationAttempts) break;

    console.log(
      `npm registry propagation incomplete (attempt ${attempt}/${propagationAttempts}); retrying in ${retryDelayMs / 1000}s...`,
    );
    sleep(retryDelayMs);
  }

  throw new Error(
    `npm registry propagation did not complete after ${propagationAttempts} attempts`,
  );
}

function installRegistryPackages() {
  for (let attempt = 1; attempt <= installAttempts; attempt += 1) {
    try {
      fs.rmSync(path.join(consumerDir, "node_modules"), { recursive: true, force: true });
      fs.rmSync(path.join(consumerDir, "pnpm-lock.yaml"), { force: true });
      writeConsumerManifest();

      run(
        pnpm,
        ["install", `--registry=${registry}`, "--config.prefer-workspace-packages=false"],
        consumerDir,
        installTimeoutMs,
      );
      return;
    } catch (error) {
      if (attempt === installAttempts) throw error;
      console.warn(
        `registry install failed (attempt ${attempt}/${installAttempts}): ${formatError(error)}`,
      );
      sleep(retryDelayMs);
    }
  }
}

function writeConsumerManifest() {
  fs.writeFileSync(
    path.join(consumerDir, "package.json"),
    `${JSON.stringify(
      {
        name: "drakeshard-foundation-npm-registry-consumer",
        private: true,
        type: "module",
        version: "0.0.0",
        dependencies: {
          "@drakeshard/foundation": packageVersion,
        },
        devDependencies: {
          "@drakeshard/testing": packageVersion,
        },
      },
      null,
      2,
    )}\n`,
  );
}

function npmViewVersion(packageName, version) {
  const output = execFileSync(
    "npm",
    ["view", `${packageName}@${version}`, "version", "--json", `--registry=${registry}`],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: npmViewTimeoutMs,
      env: process.env,
    },
  ).trim();
  const observed = JSON.parse(output);
  assert(
    typeof observed === "string",
    `${packageName}@${version}: npm view returned an unexpected version payload`,
  );
  return observed;
}

function assertInstalledVersion(packageName, expectedVersion) {
  const manifestPath = path.join(
    consumerDir,
    "node_modules",
    ...packageName.split("/"),
    "package.json",
  );
  assert(fs.existsSync(manifestPath), `${packageName}: installed manifest missing`);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert(manifest.name === packageName, `${packageName}: installed name mismatch`);
  assert(
    manifest.version === expectedVersion,
    `${packageName}: installed version ${manifest.version} does not match ${expectedVersion}`,
  );
}

function writeStepSummary(versions) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;

  const lines = [
    "## npm registry smoke validation",
    "",
    `- \`@drakeshard/foundation\`: \`${versions["@drakeshard/foundation"]}\``,
    `- \`@drakeshard/testing\`: \`${versions["@drakeshard/testing"]}\``,
    `- Approved public runtime subpaths imported: ${publicSubpaths.length}`,
    "- Runtime smoke: FixedStepDriver, deterministic RNG, ManualClock",
    "",
  ];
  fs.appendFileSync(summaryPath, `${lines.join("\n")}\n`);
}

function run(command, args, cwd, timeout) {
  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
    timeout,
  });
}

function sleep(milliseconds) {
  const buffer = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(buffer), 0, 0, milliseconds);
}

function normalizeVersion(value) {
  assert(
    typeof value === "string" && value.length > 0,
    "usage: validate-npm-registry.mjs <version>",
  );
  const version = value.startsWith("v") ? value.slice(1) : value;
  assert(
    /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version),
    `invalid package version: ${value}`,
  );
  return version;
}

function isPathWithin(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function formatError(error) {
  if (error && typeof error === "object" && "stderr" in error && error.stderr) {
    return String(error.stderr).trim();
  }
  return error instanceof Error ? error.message : String(error);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
