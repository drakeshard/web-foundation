import assert from "node:assert/strict";
import test from "node:test";

import {
  computeArtifactHashes,
  createPackageEvidence,
  findPublishTokenEnvironment,
  validateAuditResult,
} from "./create-release-evidence.mjs";

test("computes stable artifact hashes", () => {
  const hashes = computeArtifactHashes(Buffer.from("hello"));
  assert.equal(hashes.sha1, "aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d");
  assert.equal(hashes.sha256, "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  assert.match(hashes.integrity, /^sha512-[A-Za-z0-9+/]+=*$/);
});

test("detects long-lived npm publish token environment", () => {
  assert.deepEqual(findPublishTokenEnvironment({}), []);
  assert.deepEqual(
    findPublishTokenEnvironment({ NODE_AUTH_TOKEN: "secret", NPM_TOKEN: "another" }),
    ["NODE_AUTH_TOKEN", "NPM_TOKEN"],
  );
});

test("accepts clean npm signature audit results", () => {
  assert.doesNotThrow(() =>
    validateAuditResult(
      {
        invalid: [],
        missing: [],
        verified: [
          {
            name: "@drakeshard/foundation",
            version: "1.2.3",
            attestations: { provenance: {} },
            attestationBundles: [{ predicateType: "https://slsa.dev/provenance/v1" }],
          },
        ],
      },
      [{ name: "@drakeshard/foundation", version: "1.2.3" }],
    ),
  );
});

test("rejects invalid or missing npm signature audit results", () => {
  assert.throws(
    () => validateAuditResult({ invalid: [{ name: "bad" }], missing: [], verified: [] }),
    /invalid signatures/,
  );
  assert.throws(
    () =>
      validateAuditResult(
        {
          invalid: [],
          missing: [{ name: "@drakeshard/foundation", version: "1.2.3" }],
          verified: [],
        },
        [{ name: "@drakeshard/foundation", version: "1.2.3" }],
      ),
    /registry signature missing/,
  );
});

test("creates package evidence only when registry integrity matches the packed artifact", () => {
  const artifactBytes = Buffer.from("release artifact");
  const hashes = computeArtifactHashes(artifactBytes);
  const evidence = createPackageEvidence({
    packageName: "@drakeshard/foundation",
    version: "1.2.3",
    artifactFileName: "drakeshard-foundation-1.2.3.tgz",
    artifactBytes,
    publishDisposition: "published",
    registryMetadata: {
      name: "@drakeshard/foundation",
      version: "1.2.3",
      dist: {
        tarball: "https://registry.npmjs.org/example.tgz",
        integrity: hashes.integrity,
        shasum: hashes.sha1,
        attestations: {
          provenance: {
            predicateType: "https://slsa.dev/provenance/v1",
          },
        },
      },
    },
  });

  assert.equal(evidence.identity, "@drakeshard/foundation@1.2.3");
  assert.equal(evidence.exactPackedArtifactVerified, true);
  assert.equal(evidence.provenanceMetadataPresent, true);
});

test("rejects package evidence without provenance metadata", () => {
  const artifactBytes = Buffer.from("release artifact");
  const hashes = computeArtifactHashes(artifactBytes);
  assert.throws(
    () =>
      createPackageEvidence({
        packageName: "@drakeshard/testing",
        version: "1.2.3",
        artifactFileName: "drakeshard-testing-1.2.3.tgz",
        artifactBytes,
        publishDisposition: "already-present",
        registryMetadata: {
          name: "@drakeshard/testing",
          version: "1.2.3",
          dist: {
            tarball: "https://registry.npmjs.org/example.tgz",
            integrity: hashes.integrity,
            shasum: hashes.sha1,
          },
        },
      }),
    /provenance metadata missing/,
  );
});

test("requires verified provenance for each expected release package", () => {
  assert.throws(
    () =>
      validateAuditResult({ invalid: [], missing: [], verified: [] }, [
        { name: "@drakeshard/foundation", version: "1.2.3" },
      ]),
    /verified provenance attestation missing/,
  );
});

test("ignores missing signatures on unrelated transitive packages", () => {
  assert.doesNotThrow(() =>
    validateAuditResult(
      {
        invalid: [],
        missing: [{ name: "legacy-transitive", version: "0.1.0" }],
        verified: [
          {
            name: "@drakeshard/foundation",
            version: "1.2.3",
            attestations: { provenance: {} },
            attestationBundles: [{ predicateType: "https://slsa.dev/provenance/v1" }],
          },
        ],
      },
      [{ name: "@drakeshard/foundation", version: "1.2.3" }],
    ),
  );
});
