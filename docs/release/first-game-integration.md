# First Production Game — Foundation Integration and Intake

## Status

S08-06 / #90 operational handoff guidance for the Web Foundation v0.1 first production consumer.

This document governs production-game adoption feedback. It does not expand the v0.1 public surface.

## Purpose

Phase 4 moves Foundation validation from renderer probes into a real production title.

The production game is expected to pressure-test the shipped Foundation contracts. It is **not** expected to move game code into Foundation merely because code is generic, reusable, or inconvenient to duplicate.

The default ownership rule remains:

- Foundation owns the admitted browser/runtime infrastructure contracts;
- presentation owns renderer-specific behavior;
- the game owns authoritative domain semantics and cross-domain composition;
- RPG/Tactical candidate systems incubate in the game or their own library tracks, not in Foundation.

## v0.1 integration surface

The first game should evaluate only the actual shipped package surface.

### `@drakeshard/foundation/time`

Integration checks:

- the game/renderer owns the browser/render frame loop;
- elapsed frame duration is supplied explicitly to `FixedStepDriver`;
- simulation executes exactly the returned fixed-step count;
- interpolation alpha affects presentation only;
- pause/background resume resets the application timing baseline and driver accumulator;
- game code does not read uncontrolled wall-clock time inside deterministic ticks;
- dropped-step/overrun observations remain application-owned diagnostics.

Do not add a Foundation-owned render loop or renderer scheduler to make integration more convenient.

### `@drakeshard/foundation/random`

Integration checks:

- deterministic game randomness uses an explicit `DeterministicRng` instance;
- seed/state ownership is explicit;
- saves that require exact RNG continuation persist the RNG snapshot in game-owned payload data;
- no gameplay-deterministic path substitutes `Math.random()`;
- code does not assume that Foundation package version replaces `xoshiro128starstar-v1` compatibility identity.

A request that changes RNG transition/state/draw-consumption semantics is compatibility-breaking and must follow the escalation process below.

### `@drakeshard/foundation/input`

Integration checks:

- physical input is translated to opaque game-owned logical action ids;
- input contexts remain generic ownership/precedence tools rather than a catalog of game modes;
- the game translates tick snapshots/transitions/commands into its authoritative semantic command model;
- Foundation `InputCommand` is not treated as the title's universal domain-command system;
- deterministic simulation consumes input at explicit tick boundaries;
- screen/world coordinate conversion stays out of Foundation.

### `@drakeshard/foundation/input/browser`

Integration checks:

- one shared `InputSequence` source feeds the adapters participating in one pipeline;
- keyboard/pointer adapters own only browser-event normalization;
- `BrowserInputLifecycle` owns blur/focus/visibility invalidation for the connected adapters;
- renderer/canvas coordinate conversion remains presentation-local;
- adapter detach/lifecycle reset does not become synthesized gameplay intent;
- browser-specific workarounds remain local unless they expose a reproducible Foundation adapter defect.

### `@drakeshard/foundation/storage`

Integration checks:

- the game/application extracts plain save payload data from authoritative state;
- `saveFormatVersion` changes only when persisted save interpretation requires migration;
- `gameVersion` and `contentVersion` remain application-owned metadata;
- application/domain payload validation occurs before loaded data enters authoritative state;
- load-time migration is understood to be non-committing;
- migrated/current data is persisted only by an explicit later save;
- persistence promises are application/orchestration work rather than per-tick simulation work;
- expected failures are handled through `PersistenceResult`.

Do not put title-specific save fields, compatibility policy, or game schema semantics into Foundation.

### `@drakeshard/foundation/storage/browser`

Integration checks:

- localStorage-backed settings remain small-preference storage only;
- IndexedDB-backed save storage is used through the public storage boundary;
- browser storage types do not leak into domain contracts;
- a storage/platform quirk is reproduced independently of title-specific save semantics before being classified as a Foundation defect.

### `@drakeshard/testing/clock`

Integration checks:

- `ManualClock` is used only where explicit test-controlled time is useful;
- game-specific test harnesses remain game-owned;
- repeated test setup is not promoted into `@drakeshard/testing` without separate shared-code evidence.

## Distribution and consumer setup

For the formal v0.1 release, the production game should consume the exact tagged GitHub Release package tarball selected by S08-05 and commit its own lockfile.

Before the final release exists, S08-07 may validate the same integration from locally packed release-candidate tarballs.

Consumer setup must not:

- import Foundation source files directly;
- depend on the Foundation repository root as though it were a package;
- copy internal implementation files into the game;
- bypass the documented package exports.

## Presentation and game-domain boundary

The following remain game/presentation-owned by default:

- Phaser scenes, game objects, cameras, input plugins, and coordinates;
- PlayCanvas applications, entities, components, cameras, raycasts, and coordinates;
- Preact/signals/UI state;
- semantic game commands;
- combat, targeting, damage, status, ability, objective, AI, quest, economy, dialogue, or content rules;
- RPG character/job/progression semantics;
- Tactical battlefield/occupancy/movement/visibility/cover semantics;
- composition between RPG and Tactical concepts.

Renderer-specific integration code stays local even when two games might eventually need similar behavior. Repeated usage may justify a later extraction review; it is not automatic Foundation ownership.

## Intake flow

### 1. Classify locally first

When the first game encounters an integration problem, first determine whether the observed behavior can be explained by:

- title-specific domain policy;
- renderer/presentation integration;
- incorrect Foundation API usage;
- environment/build configuration;
- a documented Foundation limitation;
- a reproducible Foundation contract defect.

Keep the initial investigation in the game repository when the evidence contains proprietary game code or content.

### 2. Reproduce against the public boundary

Before opening a Foundation issue, reduce the problem to the narrowest relevant public package/subpath.

A Foundation issue should contain a sanitized reproduction that does not require proprietary game assets or domain semantics where practical.

If the production-game repository is private, do not copy secrets, proprietary content, private URLs, or inaccessible stack traces into the public Foundation repository.

### 3. File the appropriate intake category

Use one of these categories:

#### Foundation defect

Use when implemented behavior contradicts a documented Foundation contract and the problem is reproducible through the public API.

Examples:

- `FixedStepDriver` violates its documented accumulator/step rules;
- browser adapter normalization violates the input contract;
- RNG output/state violates the versioned compatibility tests;
- save migration/storage behavior violates documented failure or non-destructive rules.

Foundation owns the fix.

#### Consumer integration defect

Use when Foundation behaves as documented but the production game composes it incorrectly.

Examples:

- feeding full hidden-tab duration after resume;
- using raw DOM events in deterministic domain code;
- treating renderer coordinates as Foundation world coordinates;
- applying an unvalidated game payload directly to domain state.

The game owns the fix. Documentation may be clarified if the integration trap is materially unclear.

#### Game/domain defect or feature

Use when the request concerns title policy or gameplay semantics.

The game owns the work. Do not open a Foundation implementation issue merely because the helper could be written generically.

#### Foundation compatibility gap

Use when the current contract cannot support a real production requirement while preserving Foundation ownership.

The intake must identify the exact current consumer and demonstrate why a narrow Foundation change is safer/cheaper than a local adapter.

This is a proposal, not automatic approval.

#### Shared-code extraction candidate

Use only when production evidence suggests repeated or independently owned behavior belongs in a shared library.

The proposal must pass the admission evidence below. It may resolve to another library, an incubation module, or continued game-local ownership instead of Foundation.

## Shared-code admission evidence

Any request to add, broaden, or extract a Foundation API must include:

1. **Current consumer** — the concrete production integration needing the behavior.
2. **Concrete problem** — the failure, duplication, compatibility risk, or operational cost being solved.
3. **Local alternative** — how the game could solve it locally and why that is insufficient or materially worse.
4. **Shared benefit** — specific maintenance, compatibility, operational, reuse, or risk-reduction benefit from shared ownership.
5. **Runtime/dependency impact** — allocation/performance cost, bundle/runtime dependencies, platform assumptions, and supply-chain impact.
6. **Narrowest viable API** — the smallest contract that solves the demonstrated problem without importing game policy.
7. **Boundary impact** — whether the proposal changes renderer neutrality, domain ownership, persistence compatibility, deterministic behavior, or another established contract.
8. **Evidence/test plan** — how the new behavior can be tested independently of title-specific content.

“Generic”, “reusable”, “useful to other games”, or “we might need this later” is insufficient evidence by itself.

## Compatibility-breaking request escalation

A request is compatibility-sensitive when it would change any accepted v0.1 behavior such as:

- deterministic RNG algorithm/state/draw semantics;
- fixed-step timing semantics;
- normalized input ordering/edge/reset behavior;
- public package/subpath/export shape;
- save-envelope or `saveFormatVersion` interpretation;
- migration behavior or persisted-save compatibility;
- structured persistence failure behavior.

Such a request must not be implemented as an ordinary bug fix without explicit review.

The issue must state:

- which compatibility dimension changes;
- affected released/current consumers;
- whether an additive/backward-compatible alternative exists;
- migration/transition strategy where relevant;
- test/vector/fixture changes required;
- whether the change requires a new algorithm/format/package version or major contract revision.

Until a release owner/architecture review approves the transition, preserve the existing compatibility contract.

## RPG and Tactical intake boundary

RPG/Tactical candidate systems are **not Foundation intake items**.

Examples that remain outside Foundation:

- attributes/stats, resources, jobs/classes, progression, specialization, inventory, skills/abilities;
- board topology semantics, occupancy, tactical movement, visibility, cover, elevation, activation/action economy, objectives;
- combat rules or RPG/Tactical composition.

During the first tactical RPG, these should remain game-local incubation modules or be handled under the relevant RPG/Tactical library track according to their controlled architecture.

Do not move them to Foundation merely to eliminate duplication.

## Foundation issue content

A first-game Foundation issue should include:

- Foundation package/release version or release-candidate commit;
- exact package/subpath involved;
- browser/runtime/environment;
- observed behavior;
- expected behavior and the contract supporting that expectation;
- minimal sanitized reproduction;
- whether the problem reproduces without title-specific domain content;
- impact/severity;
- classification: defect, integration gap, compatibility request, or extraction proposal;
- compatibility dimensions affected, if any;
- relevant game issue reference when it can be shared safely.

Use the repository's **Foundation integration feedback** issue form when available.

## Triage outcome

Foundation triage should result in one of:

- **Foundation defect** — create/retain a bounded Foundation implementation issue;
- **Documentation clarification** — fix documentation without broadening runtime API;
- **Game-local** — close/redirect with the ownership rationale;
- **Incubation candidate** — keep in the game or relevant domain-library track;
- **Admission review required** — gather missing evidence before implementation;
- **Compatibility review required** — stop implementation until transition/version policy is approved;
- **Duplicate/deferred** — reference existing evidence/roadmap item.

## Handoff success criteria

The first game handoff is operational when:

- the game can consume the release artifact through the approved distribution mechanism;
- Foundation modules used by the title are integrated only through public package exports;
- deterministic/browser/persistence boundaries remain intact;
- game/presentation/RPG/Tactical code has not leaked into Foundation;
- integration feedback has a reproducible, privacy-safe intake path;
- compatibility-breaking changes cannot bypass explicit review;
- extraction proposals must pass the same admission rule as pre-release work.
