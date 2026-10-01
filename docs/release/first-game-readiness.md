# First Production Game — Foundation Adoption Readiness Review

## Status

S08-09 / #93 readiness review for Web Foundation v0.1.0.

Decision: **ready for first-production-game adoption**.

This decision authorizes production pressure testing of the released Foundation surface. It does not expand Foundation into a game engine, renderer framework, RPG library, Tactical library, or general utility layer.

## Release and consumption evidence

The first production game has a viable cross-repository consumption path:

- Web Foundation v0.1.0 has been published as a GitHub Release;
- the approved artifacts are the versioned package tarballs for `@drakeshard/foundation` and `@drakeshard/testing`;
- SHA-256 checksums are published alongside the artifacts;
- post-release installation from the exact versioned GitHub Release asset URLs succeeded with pnpm 12.8.1;
- consumers pin the explicit `v0.1.0` release asset URLs and commit their own lockfiles;
- npm/GitHub Packages publication remains intentionally deferred.

This satisfies the release/distribution prerequisite for beginning production adoption.

## Required Foundation integration paths

### Deterministic timing

`@drakeshard/foundation/time` provides the released `FixedStepDriver` contract.

The production game can:

- own its renderer/browser frame loop;
- supply elapsed frame duration explicitly;
- execute the returned fixed-step count;
- keep interpolation presentation-only;
- reset timing baselines across pause/background gaps;
- use dropped-step/overrun results for application-owned diagnostics.

No additional shared scheduler or render-loop abstraction is required to begin adoption.

### Deterministic randomness

`@drakeshard/foundation/random` provides the released `xoshiro128starstar-v1` deterministic RNG contract with snapshots and exact restoration.

The game can:

- own seed/state policy;
- persist RNG snapshots in game-owned save payloads where continuation matters;
- avoid `Math.random()` on deterministic gameplay paths;
- retain the RNG algorithm identity independently of the Foundation package version.

No additional random-helper surface is required for initial adoption. New helpers require real consumer evidence.

### Input and browser boundaries

`@drakeshard/foundation/input` and `@drakeshard/foundation/input/browser` provide:

- normalized browser physical input;
- deterministic sequence ordering;
- action binding resolution;
- generic prioritized input contexts;
- tick-consumable snapshots/transitions/commands;
- keyboard/pointer browser adapters;
- blur/visibility/reset lifecycle behavior.

The production game owns:

- semantic gameplay commands;
- renderer/screen-to-world conversion;
- game-mode/action meaning;
- renderer-specific input integration.

The current input path is sufficient to begin production integration without a generic renderer-input adapter.

### Persistence

`@drakeshard/foundation/storage` and `@drakeshard/foundation/storage/browser` provide:

- small settings storage;
- IndexedDB save storage;
- save envelopes;
- structured persistence outcomes;
- sequential migrations;
- non-destructive migration/load behavior.

The production game owns:

- save payload shape;
- semantic payload validation;
- game/content/schema compatibility policy;
- extraction/application of authoritative domain state.

The current persistence boundary is sufficient for production adoption. A generic schema/decoder framework is not required.

### Testing

`@drakeshard/testing/clock` provides `ManualClock` for explicit controlled time.

Game-specific test fixtures and harnesses remain game-owned until repeated production evidence justifies extraction.

## Explicit non-blockers

The following absent systems are **not** Foundation adoption blockers:

- generic data/schema/decoder framework;
- generic diagnostics/event bus or debug overlay;
- ECS;
- physics;
- navigation;
- networking/rollback;
- AI framework;
- audio;
- localization;
- shared UI;
- renderer lifecycle framework;
- Phaser or PlayCanvas adapter package;
- generic game command bus;
- generic entity/ID framework.

Application-local or domain-specific solutions are sufficient until a concrete shared-infrastructure problem is demonstrated.

## Renderer and presentation boundary

Renderer-specific integration remains local by default.

The first game may use Phaser, PlayCanvas, or another presentation stack while consuming the same Foundation runtime boundaries. Renderer objects, camera state, world transforms, raycasts, canvas coordinates, UI state, and presentation lifecycle must not become authoritative Foundation/domain state.

Repeated renderer integration across future games may create extraction evidence, but no renderer adapter is required to begin Phase 4.

## RPG and Tactical boundary

The first production consumer is expected to be a tactical RPG, but Foundation does not absorb RPG or Tactical semantics.

RPG remains a sibling domain library/track. Its current incubation candidates cover RPG-shaped role-state mechanisms such as advancement, roles/jobs, resources, attributes, and related characterization concepts under the RPG architecture.

Tactical remains a separate incubation track. Its first implementation remains game-local renderer-neutral code under the Tactical implementation plan, beginning with Tactical identity, topology, square topology, placement, traversal, deterministic movement/reachability, and optional capabilities as consumer pressure requires.

The game owns composition between Foundation, RPG, Tactical, combat, abilities, objectives, AI, content, renderer, and UI.

No `@drakeshard/tactics` package/repository is authorized by this readiness review.

## Shared-code admission during production adoption

A production integration request does not become Foundation work merely because the requested code is generic or reusable.

A Foundation expansion request must still provide the #119 admission evidence:

1. current production consumer;
2. concrete problem;
3. local alternative and why it is insufficient;
4. shared maintenance/compatibility/operational benefit;
5. runtime/dependency impact;
6. narrowest viable API;
7. architecture/compatibility boundary impact;
8. independent evidence/test plan.

Compatibility-sensitive changes to timing, RNG, input ordering/reset semantics, package exports, save formats/migrations, or persistence failure contracts require explicit transition/version review.

## Adoption blocker review

No true Foundation infrastructure blocker is identified at this handoff point.

The released v0.1.0 surface provides a documented integration route for the first game's current lower-level requirements:

- deterministic time;
- deterministic RNG;
- browser/tick input;
- settings/save persistence;
- controlled test time.

Missing gameplay/domain/renderer frameworks remain intentionally outside Foundation and must not delay the first production game.

If production use uncovers a reproducible Foundation defect or an actual infrastructure gap, create a bounded Foundation issue through the first-game intake process. API-expansion requests remain subject to the shared-code admission rule.

## Readiness decision

Web Foundation v0.1.0 is **ready for first-production-game adoption**.

The next project transition should:

- complete Sprint 08 handoff records;
- mark Phase 4 — First Production Game as the active Foundation phase;
- route future Foundation engineering primarily from production evidence;
- keep RPG and Tactical incubation under their own controlled tracks and ownership boundaries.
