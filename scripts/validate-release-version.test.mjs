import assert from "node:assert/strict";
import test from "node:test";

import { parseReleaseTag, validateVersionState } from "./validate-release-version.mjs";

test("accepts lockstep repository versions", () => {
  assert.equal(
    validateVersionState({
      rootVersion: "0.1.1",
      foundationVersion: "0.1.1",
      testingVersion: "0.1.1",
    }),
    "0.1.1",
  );
});

test("accepts an exact matching release tag", () => {
  assert.equal(
    validateVersionState({
      rootVersion: "1.2.3",
      foundationVersion: "1.2.3",
      testingVersion: "1.2.3",
      releaseTag: "v1.2.3",
    }),
    "1.2.3",
  );
});

test("accepts valid semver prerelease tags", () => {
  assert.equal(parseReleaseTag("v2.0.0-rc.1"), "2.0.0-rc.1");
});

test("rejects Foundation version drift", () => {
  assert.throws(
    () =>
      validateVersionState({
        rootVersion: "1.2.3",
        foundationVersion: "1.2.4",
        testingVersion: "1.2.3",
      }),
    /foundation version 1\.2\.4 does not match workspace version 1\.2\.3/,
  );
});

test("rejects Testing version drift", () => {
  assert.throws(
    () =>
      validateVersionState({
        rootVersion: "1.2.3",
        foundationVersion: "1.2.3",
        testingVersion: "1.3.0",
      }),
    /testing version 1\.3\.0 does not match workspace version 1\.2\.3/,
  );
});

test("rejects a release tag that does not match package versions", () => {
  assert.throws(
    () =>
      validateVersionState({
        rootVersion: "1.2.3",
        foundationVersion: "1.2.3",
        testingVersion: "1.2.3",
        releaseTag: "v1.2.4",
      }),
    /release tag v1\.2\.4 does not match workspace\/package version 1\.2\.3/,
  );
});

for (const malformedTag of ["1.2.3", "v1", "v1.2", "v01.2.3", "v1.2.3.4", "vnext"]) {
  test(`rejects malformed release tag ${malformedTag}`, () => {
    assert.throws(() => parseReleaseTag(malformedTag), /release tag/);
  });
}

test("rejects malformed package versions", () => {
  assert.throws(
    () =>
      validateVersionState({
        rootVersion: "01.2.3",
        foundationVersion: "01.2.3",
        testingVersion: "01.2.3",
      }),
    /root workspace version is not valid semver/,
  );
});
