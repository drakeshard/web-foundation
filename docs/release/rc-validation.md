# v0.1 Release-Candidate Validation

## Status

S08-07 / #91 release-candidate validation procedure.

This validation uses the S08-05 distribution decision as closely as possible before the formal GitHub Release exists: the two approved packages are built and packed into local tarballs, then installed into a clean consumer outside the repository workspace. S08-08 performs the final post-release URL verification after the tagged GitHub Release exists.

## Environment

The repository quality workflow runs from a fresh GitHub Actions checkout on Ubuntu using the pinned repository toolchain:

- Node 24.21.0;
- pnpm 12.8.1 through Corepack;
- the committed `pnpm-lock.yaml`;
- frozen dependency installation.

The same validation can be run locally with the pinned toolchain.

## Reproducible commands

From a clean checkout:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm check
pnpm typecheck
pnpm test
pnpm build
pnpm test:consumer
pnpm test:release-candidate
pnpm test:e2e
pnpm test:e2e:compat
```

The permanent CI separates full Chromium Quality coverage from focused Firefox/WebKit compatibility coverage, but together those jobs exercise the same release-candidate commit from a fresh checkout.

## Packed artifact validation

`pnpm test:release-candidate` performs the pre-release equivalent of the approved GitHub Release asset flow.

It:

1. packs `packages/foundation` and `packages/testing` using pnpm;
2. requires exactly one tarball for each approved shared package;
3. prints SHA-256 digests for both generated artifacts;
4. creates a temporary consumer outside the workspace;
5. installs the exact local tarballs with pnpm using prefer-offline resolution; the tarballs are local while declared external dependencies such as `idb` may still require normal registry metadata;
6. creates and verifies a consumer lockfile;
7. verifies the installed package names, versions, export maps, and `dist`-only package shape;
8. rejects leaked `src` files and obsolete root artifacts;
9. imports every approved runtime package entry point by package name;
10. exercises `FixedStepDriver`, deterministic RNG, a browser-boundary settings adapter, and `ManualClock`;
11. verifies the consumer manifest pins the tarball artifacts rather than source-relative repository paths.

The browser-boundary exercise uses `LocalStorageSettingsStorage` with a minimal `BrowserKeyValueStorage` implementation. It validates the packed browser boundary without pretending that Node provides real browser localStorage or IndexedDB.

## Approved entry points covered

The packed consumer imports:

- `@drakeshard/foundation/time`;
- `@drakeshard/foundation/random`;
- `@drakeshard/foundation/input`;
- `@drakeshard/foundation/input/browser`;
- `@drakeshard/foundation/storage`;
- `@drakeshard/foundation/storage/browser`;
- `@drakeshard/testing/clock`.

No source-relative Foundation imports are used.

## Artifact boundary

The release-candidate tarballs are temporary validation artifacts. They are not the formal v0.1 release assets and their SHA-256 digests are not release checksums.

S08-08 will rebuild/pack the approved release commit, create the v0.1 tag and GitHub Release, attach the final package tarballs plus checksum record, and verify consumption using the versioned release-asset URLs defined in `docs/release/distribution.md`.

## What this proves

This gate proves that:

- a fresh checkout can install reproducibly and pass the repository quality gates;
- the reviewed package manifests produce standalone package tarballs;
- the package artifacts do not rely on workspace source layout for runtime consumption;
- an external clean consumer can resolve the approved subpaths from the packed artifacts;
- Foundation's external runtime dependency on `idb` resolves from the committed dependency set;
- the S08-05 package-tarball distribution shape is viable before the formal release is created.

It does not publish packages, create a tag/release, or make a production-browser support claim beyond the existing browser test strategy.
