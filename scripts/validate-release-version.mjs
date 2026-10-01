import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const semverPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

export function parseReleaseTag(tag) {
  assert(typeof tag === "string" && tag.length > 0, "release tag is required");
  assert(tag.startsWith("v"), `release tag must start with "v": ${tag}`);

  const version = tag.slice(1);
  assertSemver(version, `release tag is not valid semver: ${tag}`);
  return version;
}

export function validateVersionState({
  rootVersion,
  foundationVersion,
  testingVersion,
  releaseTag,
}) {
  assertSemver(rootVersion, `root workspace version is not valid semver: ${rootVersion}`);
  assertSemver(
    foundationVersion,
    `@drakeshard/foundation version is not valid semver: ${foundationVersion}`,
  );
  assertSemver(
    testingVersion,
    `@drakeshard/testing version is not valid semver: ${testingVersion}`,
  );

  assert(
    foundationVersion === rootVersion,
    `@drakeshard/foundation version ${foundationVersion} does not match workspace version ${rootVersion}`,
  );
  assert(
    testingVersion === rootVersion,
    `@drakeshard/testing version ${testingVersion} does not match workspace version ${rootVersion}`,
  );

  if (releaseTag !== undefined) {
    const tagVersion = parseReleaseTag(releaseTag);
    assert(
      tagVersion === rootVersion,
      `release tag ${releaseTag} does not match workspace/package version ${rootVersion}`,
    );
  }

  return rootVersion;
}

export function readRepositoryVersions(repositoryRoot = root) {
  return {
    rootVersion: readManifestVersion(path.join(repositoryRoot, "package.json")),
    foundationVersion: readManifestVersion(
      path.join(repositoryRoot, "packages", "foundation", "package.json"),
    ),
    testingVersion: readManifestVersion(
      path.join(repositoryRoot, "packages", "testing", "package.json"),
    ),
  };
}

export function validateTaggedCommit({ releaseTag, expectedCommit, repositoryRoot = root }) {
  assert(\n    typeof expectedCommit === "string" && expectedCommit.length > 0,\n    "release commit is required",\n  );

  const headCommit = git(["rev-parse", "HEAD"], repositoryRoot);
  const releaseCommit = git(["rev-list", "-n", "1", releaseTag], repositoryRoot);
  const expectedResolvedCommit = git(["rev-parse", expectedCommit], repositoryRoot);

  assert(
    headCommit === releaseCommit,
    `checked-out commit ${headCommit} does not match release tag ${releaseTag} commit ${releaseCommit}`,
  );
  assert(
    headCommit === expectedResolvedCommit,
    `checked-out commit ${headCommit} does not match release event commit ${expectedResolvedCommit}`,
  );

  return headCommit;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const versions = readRepositoryVersions();
  const version = validateVersionState({
    ...versions,
    releaseTag: options.releaseTag,
  });

  if (options.releaseCommit !== undefined) {
    assert(options.releaseTag !== undefined, "--release-commit requires --tag");
    validateTaggedCommit({
      releaseTag: options.releaseTag,
      expectedCommit: options.releaseCommit,
    });
  }

  console.log(`Release version validation: OK (${version})`);
  if (options.releaseTag !== undefined) {
    console.log(`Release tag: ${options.releaseTag}`);
  }
}

function parseArgs(args) {
  let releaseTag;
  let releaseCommit;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--tag") {
      releaseTag = requireValue(args, ++index, "--tag");
      continue;
    }
    if (argument === "--release-commit") {
      releaseCommit = requireValue(args, ++index, "--release-commit");
      continue;
    }
    throw new Error(`unknown argument: ${argument}`);
  }

  return { releaseTag, releaseCommit };
}

function requireValue(args, index, option) {
  const value = args[index];
  assert(typeof value === "string" && value.length > 0, `${option} requires a value`);
  return value;
}

function readManifestVersion(manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert(
    typeof manifest.version === "string" && manifest.version.length > 0,
    `${manifestPath}: package version is missing`,
  );
  return manifest.version;
}

function assertSemver(version, message) {
  assert(typeof version === "string" && semverPattern.test(version), message);
}

function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main();
}
