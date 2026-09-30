# Phase 1 Public API and Architecture Review

## Status

Accepted for Sprint 01 exit review.

Scope: S01-09 / Issue #23.

## Public package surface

The Phase 1 shared package surface remains intentionally limited to:

- `@drakeshard/foundation/time`
- `@drakeshard/foundation/random`
- `@drakeshard/testing/clock`

No package root barrel is exported. No renderer adapter, UI package, ECS, physics, navigation, networking, AI, persistence, input, or game-specific API was added during Phase 1.

## Time API review

`@drakeshard/foundation/time` exports:

- `FixedStepDriver`
- `FixedStepConfig`
- `FixedStepAdvanceResult`

The names describe ownership and unit semantics directly. Configuration uses `Ms` suffixes for durations. The caller owns the browser/render loop and supplies elapsed time explicitly.

The driver stores one numeric accumulator and configuration values. `advance()` allocates one result object per caller invocation. It does not allocate per simulation step and does not execute domain callbacks. No additional pooling or typed-array optimization is justified by current evidence.

## Random API review

`@drakeshard/foundation/random` exports:

- `RNG_ALGORITHM_ID`
- `DeterministicRng`
- `DeterministicRngState`

The API is intentionally limited to uint32 draws, [0,1) float draws, and explicit snapshot/restore. Game-policy helpers such as bounded ranges, shuffle, weighted selection, chance helpers, or stream partitioning remain deferred.

The hot draw path uses numeric fields and 32-bit arithmetic without array/object allocation. `snapshot()` allocates a state object and tuple only when explicitly requested; snapshotting is not part of the per-tick hot path by contract.

## Testing API review

`@drakeshard/testing/clock` exports only `ManualClock`.

No generic simulation runner, fake RNG wrapper, renderer fixture, or broad testing framework was extracted from the single integrated deterministic proof.

The deterministic simulation proof consumes Foundation through its public `/time` and `/random` subpaths.

## Architecture boundary review

Foundation source imports no Phaser, PlayCanvas, Preact, `@preact/signals`, application, presentation, or UI code.

Phase 1 runtime code does not own `requestAnimationFrame`, read `performance.now()`, call `Math.random()`, access DOM/browser input, depend on renderer entities/scenes, or contain game-specific simulation rules.

The integrated simulation fixture remains test-only plain TypeScript and does not establish a new production-domain abstraction.

## Test-discovery correction

The review found that the Vitest exclude pattern `node_modules/**` did not exclude nested workspace `packages/*/node_modules/**` paths. Because `@drakeshard/testing` has a workspace dependency on Foundation, Foundation tests could be discovered a second time through the workspace symlink.

The configuration now excludes `**/node_modules/**` and `**/dist/**`. This prevents duplicate workspace test execution and keeps the test count representative.

## Dependency review

Phase 1 added no third-party runtime dependency.

`@drakeshard/testing` references `@drakeshard/foundation` through `workspace:*`, consistent with the workspace policy. The deterministic simulation proof now exercises the public Foundation subpath exports through that dependency instead of importing Foundation source files directly.

## Review result

No public API removal, compatibility change, renderer-specific extraction, or additional shared abstraction is required before Sprint 01 exit.

Future API growth remains consumer-driven.
