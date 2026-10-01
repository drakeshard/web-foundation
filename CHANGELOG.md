# Changelog

All notable Web Foundation release changes are recorded here.

## 0.1.2 — npm package-content repair

### Fixed

- Repair the npm package-content path after a real external consumer found that `@drakeshard/foundation@0.1.1` was published with export metadata but without its `dist/` tree.
- Add reusable validation for registry-installed package shape, including concrete `types` and `import` export targets.
- Add a regression test for the exact missing-`dist` failure mode.
- Run installed-package-shape regression checks in normal CI and the trusted publication workflow.
- Remove hard-coded publication-candidate version checks so release validation follows the lockstep repository version.

### Compatibility

This is a packaging/distribution repair only. The approved public API/export baseline, deterministic RNG identity, persistence contracts, and runtime behavior are unchanged.

## 0.1.1 — npm publication preparation

### Changed

- Adopted the Apache License 2.0 for the public repository and both distributable shared packages.
- Prepared `@drakeshard/foundation` and `@drakeshard/testing` for public npm publication with package descriptions, repository/homepage/bugs metadata, keywords, package READMEs, and `publishConfig.access = "public"`.
- Removed package-level `private: true` from the two distributable packages while keeping the workspace root private.
- Extended package and packed-artifact validation to enforce npm publication metadata, packaged README/LICENSE files, and absence of leaked workspace protocol references.

### Compatibility

This patch changes distribution/package metadata only. The v0.1 runtime API, export surface, deterministic RNG identity `xoshiro128starstar-v1`, save compatibility rules, and browser/runtime behavior are unchanged.


## 0.1.0 — release candidate

### Added

- `@drakeshard/foundation/time`
  - caller-driven `FixedStepDriver`;
  - bounded catch-up, frame-delta clamping, interpolation alpha, dropped-step/overrun reporting;
  - explicit reset semantics for pause/background-resume handling.

- `@drakeshard/foundation/random`
  - deterministic `xoshiro128starstar-v1` RNG;
  - `nextUint32()`, `nextFloat01()`, snapshot, and exact state restoration;
  - golden-vector compatibility tests.

- `@drakeshard/foundation/input`
  - normalized renderer-neutral physical input contracts;
  - deterministic `InputSequence` ordering;
  - action binding resolution;
  - prioritized input contexts;
  - tick-consumable action state, transitions, and generic command handoff.

- `@drakeshard/foundation/input/browser`
  - keyboard and Pointer Events adapters;
  - centralized blur/focus/visibility lifecycle reset handling;
  - renderer-neutral browser input normalization.

- `@drakeshard/foundation/storage`
  - settings/save contracts and structured persistence outcomes;
  - `SaveEnvelope`;
  - sequential save migrations;
  - non-destructive load-time migration behavior;
  - explicit save-format/game/content version boundaries.

- `@drakeshard/foundation/storage/browser`
  - localStorage-backed settings;
  - IndexedDB-backed save storage using `idb` 8.0.3.

- `@drakeshard/testing/clock`
  - `ManualClock` for explicit test-controlled time.

- Renderer-pressure-test applications and browser coverage using Phaser and PlayCanvas to verify that Foundation contracts remain renderer-neutral.

### Changed

- Finalized the v0.1 package surface to explicit subpath exports only.
- Added clean consumer-style package import/type validation in CI.
- Added focused Firefox and WebKit compatibility coverage alongside the full Chromium suite.
- Added v0.1 usage/integration documentation and compatibility/version records.
- Recorded measured renderer-probe performance baselines and stable regression gates without introducing production frame-rate guarantees.

### Removed

- Removed the unused `FoundationVersion` persistence alias before v0.1 because Foundation package version is release metadata, not a save migration key.
- Removed obsolete empty root source indexes/placeholders so no unused root package artifact is emitted.

### Compatibility-sensitive contracts

- RNG algorithm identity: `xoshiro128starstar-v1`.
- Save migration key: `saveFormatVersion`.
- `contentVersion` and `gameVersion` remain opaque application-owned metadata.
- `dataSchemaVersion` remains application-owned terminology with no Foundation runtime type in v0.1.
- `protocolVersion` is deferred because v0.1 contains no networking protocol.

### Explicitly not included

- renderer adapter packages;
- shared UI;
- schema/decoder framework;
- generic diagnostics/event-buffer framework;
- ECS;
- physics;
- navigation;
- networking/rollback;
- AI framework;
- RPG or Tactical domain systems;
- public package-registry publication.

The initial distribution mechanism and final tag/release are intentionally deferred to Sprint 08 release issues.
