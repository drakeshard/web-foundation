import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = "https://registry.npmjs.org";
const packages = [
  {
    key: "foundation",
    name: "@drakeshard/foundation",
    artifactName: (version) => `drakeshard-foundation-${version}.tgz`,
  },
  {
    key: "testing",
    name: "@drakeshard/testing",
    artifactName: (version) => `drakeshard-testing-${version}.tgz`,
  },
];

export function computeArtifactHashes(bytes) {
  return {
    sha1: createHash("sha1").update(bytes).digest("hex"),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    integrity: `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
  };
}

export function findPublishTokenEnvironment(env) {
  const names = ["NODE_AUTH_TOKEN", "NPM_TOKEN", "NPM_AUTH_TOKEN"];
  return names.filter((name) => typeof env[name] === "string" && env[name].length > 0);
}

export function validateAuditResult(result, expectedPackages = []) {
  assert(result && typeof result === "object", "npm audit signatures returned invalid JSON");
  assert(Array.isArray(result.invalid), "npm audit signatures result is missing invalid[]");
  assert(Array.isArray(result.missing), "npm audit signatures result is missing missing[]");
  assert(Array.isArray(result.verified), "npm audit signatures result is missing verified[]");
  assert(result.invalid.length === 0, "npm audit signatures reported invalid signatures/attestations");
  assert(result.missing.length === 0, "npm audit signatures reported missing registry signatures");

  for (const expected of expectedPackages) {
    const verified = result.verified.find(
      (entry) => entry?.name === expected.name && entry?.version === expected.version,
    );
    assert(verified, `${expected.name}@${expected.version}: verified provenance attestation missing`);
    assert(
      verified.attestations && typeof verified.attestations === "object",
      `${expected.name}@${expected.version}: verified attestation metadata missing`,
    );
  }
}

export function createPackageEvidence({
  packageName,
  version,
  artifactFileName,
  artifactBytes,
  registryMetadata,
  publishDisposition,
}) {
  assert(registryMetadata?.name === packageName, `${packageName}: registry name mismatch`);
  assert(registryMetadata?.version === version, `${packageName}: registry version mismatch`);

  const dist = registryMetadata.dist;
  assert(dist && typeof dist === "object", `${packageName}: registry dist metadata missing`);
  assert(typeof dist.integrity === "string", `${packageName}: registry dist.integrity missing`);
  assert(typeof dist.shasum === "string", `${packageName}: registry dist.shasum missing`);
  assert(typeof dist.tarball === "string", `${packageName}: registry dist.tarball missing`);
  assert(
    dist.attestations && typeof dist.attestations === "object" && dist.attestations.provenance,
    `${packageName}: npm provenance metadata missing`,
  );

  const hashes = computeArtifactHashes(artifactBytes);
  assert(
    dist.integrity === hashes.integrity,
    `${packageName}: registry integrity does not match the reviewed packed tarball`,
  );
  assert(
    dist.shasum === hashes.sha1,
    `${packageName}: registry shasum does not match the reviewed packed tarball`,
  );

  return {
    name: packageName,
    version,
    identity: `${packageName}@${version}`,
    packagePageUrl: `https://www.npmjs.com/package/${packageName}/v/${version}`,
    publishDisposition,
    artifact: {
      fileName: artifactFileName,
      sha1: hashes.sha1,
      sha256: hashes.sha256,
      integrity: hashes.integrity,
    },
    registry: {
      tarballUrl: dist.tarball,
      integrity: dist.integrity,
      shasum: dist.shasum,
      attestations: dist.attestations,
    },
    exactPackedArtifactVerified: true,
    provenanceMetadataPresent: true,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const version = normalizeVersion(requiredOption(options, "version"));
  const tag = requiredOption(options, "tag");
  const artifactsDir = path.resolve(root, requiredOption(options, "artifacts-dir"));
  const outputDir = path.resolve(root, requiredOption(options, "output-dir"));
  const foundationPublishDisposition = normalizePublishDisposition(
    requiredOption(options, "foundation-publish-status"),
  );
  const testingPublishDisposition = normalizePublishDisposition(
    requiredOption(options, "testing-publish-status"),
  );

  assert(tag === `v${version}`, `release tag ${tag} does not match version ${version}`);
  assert(process.env.GITHUB_ACTIONS === "true", "release evidence must run in GitHub Actions");

  const sourceCommit = runText("git", ["rev-parse", "HEAD"], root);
  const tagCommit = runText("git", ["rev-list", "-n", "1", tag], root);
  assert(sourceCommit === tagCommit, "checked-out source commit does not match release tag");
  if (process.env.GITHUB_SHA) {
    assert(
      process.env.GITHUB_SHA === sourceCommit,
      "GitHub release-event commit does not match checked-out source commit",
    );
  }

  const publishTokenEnvironment = findPublishTokenEnvironment(process.env);
  assert(
    publishTokenEnvironment.length === 0,
    `long-lived npm publish token environment is not allowed: ${publishTokenEnvironment.join(", ")}`,
  );

  const npmVersion = runText("npm", ["--version"], root);
  fs.mkdirSync(outputDir, { recursive: true });

  const packageEvidence = {};
  for (const spec of packages) {
    const artifactFileName = spec.artifactName(version);
    const artifactPath = path.join(artifactsDir, artifactFileName);
    assert(fs.existsSync(artifactPath), `${spec.name}: packed artifact missing: ${artifactPath}`);

    const registryMetadata = npmView(spec.name, version);
    packageEvidence[spec.key] = createPackageEvidence({
      packageName: spec.name,
      version,
      artifactFileName,
      artifactBytes: fs.readFileSync(artifactPath),
      registryMetadata,
      publishDisposition:
        spec.key === "foundation" ? foundationPublishDisposition : testingPublishDisposition,
    });
  }

  const auditFileName = "npm-audit-signatures.json";
  const auditPath = path.join(outputDir, auditFileName);
  const auditResult = verifyRegistrySignatures(version, auditPath);
  validateAuditResult(
    auditResult,
    packages.map((spec) => ({ name: spec.name, version })),
  );

  const repository = process.env.GITHUB_REPOSITORY ?? "drakeshard/web-foundation";
  const serverUrl = process.env.GITHUB_SERVER_URL ?? "https://github.com";
  const runId = process.env.GITHUB_RUN_ID ?? null;
  const runUrl = runId ? `${serverUrl}/${repository}/actions/runs/${runId}` : null;
  const releaseUrl = `${serverUrl}/${repository}/releases/tag/${tag}`;

  const evidence = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    repository,
    release: {
      tag,
      version,
      sourceCommit,
      tagCommit,
      releaseEventCommit: process.env.GITHUB_SHA ?? null,
      releaseUrl,
    },
    workflow: {
      name: process.env.GITHUB_WORKFLOW ?? null,
      ref: process.env.GITHUB_WORKFLOW_REF ?? null,
      runId,
      runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
      runUrl,
      runnerEnvironment: "github-hosted",
      npmVersion,
    },
    trustedPublishing: {
      expectedAuthentication: "github-actions-oidc-trusted-publisher",
      longLivedPublishTokenEnvironmentPresent: false,
      registryProvenanceMetadataPresent: true,
      npmSignatureAndAttestationVerificationPassed: true,
      rawVerificationFile: auditFileName,
    },
    packages: packageEvidence,
    guarantees: {
      prePublish:
        "Release tag/version/commit consistency, repository quality gates, public API baseline, and packed-artifact consumer validation passed before publication.",
      publishTime:
        "The workflow published the reviewed packed tarballs without a long-lived npm publish token; package-level publishDisposition records whether this run published or skipped an existing immutable version.",
      postPublish:
        "Registry propagation/consumer smoke passed; npm dist integrity matches the reviewed tarballs; npm registry signatures and provenance attestations were verified.",
    },
  };

  const jsonPath = path.join(outputDir, "release-evidence.json");
  const markdownPath = path.join(outputDir, "release-evidence.md");
  fs.writeFileSync(jsonPath, `${JSON.stringify(evidence, null, 2)}\n`);
  fs.writeFileSync(markdownPath, renderMarkdown(evidence));

  console.log(`Release evidence written to ${path.relative(root, outputDir)}`);
}

function verifyRegistrySignatures(version, outputPath) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "drakeshard-release-evidence-"));
  try {
    fs.writeFileSync(
      path.join(temp, "package.json"),
      `${JSON.stringify(
        {
          name: "drakeshard-release-evidence-consumer",
          private: true,
          version: "0.0.0",
          dependencies: {
            "@drakeshard/foundation": version,
            "@drakeshard/testing": version,
          },
        },
        null,
        2,
      )}\n`,
    );

    run(
      "npm",
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        "--save-exact",
        `--registry=${registry}`,
      ],
      temp,
    );

    const output = execFileSync(
      "npm",
      ["audit", "signatures", "--json", "--include-attestations", `--registry=${registry}`],
      {
        cwd: temp,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: process.env,
      },
    ).trim();

    fs.writeFileSync(outputPath, `${output}\n`);
    return JSON.parse(output);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function npmView(packageName, version) {
  const output = execFileSync(
    "npm",
    ["view", `${packageName}@${version}`, "--json", `--registry=${registry}`],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    },
  ).trim();
  return JSON.parse(output);
}

function renderMarkdown(evidence) {
  const lines = [
    `# Release evidence — ${evidence.release.tag}`,
    "",
    `- Source commit: \`${evidence.release.sourceCommit}\``,
    `- Git tag: \`${evidence.release.tag}\``,
    `- Package version: \`${evidence.release.version}\``,
    `- Workflow run: ${evidence.workflow.runUrl ?? "unavailable"}`,
    `- npm CLI: \`${evidence.workflow.npmVersion}\``,
    "",
    "## Package registry evidence",
    "",
  ];

  for (const packageEvidence of Object.values(evidence.packages)) {
    lines.push(
      `### ${packageEvidence.identity}`,
      "",
      `- Publish disposition: \`${packageEvidence.publishDisposition}\``,
      `- Registry tarball: ${packageEvidence.registry.tarballUrl}`,
      `- Registry integrity: \`${packageEvidence.registry.integrity}\``,
      `- Registry shasum: \`${packageEvidence.registry.shasum}\``,
      `- Reviewed artifact SHA-256: \`${packageEvidence.artifact.sha256}\``,
      "- Exact reviewed tarball / registry integrity match: yes",
      "- npm provenance metadata present: yes",
      "",
    );
  }

  lines.push(
    "## Trusted publishing and provenance",
    "",
    "- Expected authentication: GitHub Actions OIDC trusted publisher",
    "- Long-lived npm publish token environment present: no",
    "- npm registry signature and provenance-attestation verification: passed",
    `- Raw verification result: \`${evidence.trustedPublishing.rawVerificationFile}\``,
    "",
    "## Guarantees by phase",
    "",
    `- Pre-publish: ${evidence.guarantees.prePublish}`,
    `- Publish-time: ${evidence.guarantees.publishTime}`,
    `- Post-publish: ${evidence.guarantees.postPublish}`,
    "",
  );

  return `${lines.join("\n")}\n`;
}

function run(command, args, cwd) {
  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
}

function runText(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  }).trim();
}

function parseArgs(args) {
  const result = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    assert(key?.startsWith("--"), `invalid argument: ${key ?? "<missing>"}`);
    assert(typeof value === "string", `missing value for ${key}`);
    result.set(key.slice(2), value);
  }
  return result;
}

function requiredOption(options, name) {
  const value = options.get(name);
  assert(typeof value === "string" && value.length > 0, `missing --${name}`);
  return value;
}

function normalizeVersion(value) {
  const version = value.startsWith("v") ? value.slice(1) : value;
  assert(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version), `invalid version: ${value}`);
  return version;
}

function normalizePublishDisposition(value) {
  assert(
    value === "published" || value === "already-present",
    `invalid publish disposition: ${value}`,
  );
  return value;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main();
}
