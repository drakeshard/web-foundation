# Sprint 07 / Phase 3 Exit Review

## Status

S07-10 / #84 exit review for Phase 3 — Renderer Probes.

All Sprint 07 issues S07-01 through S07-09 (#75–#83) are complete. The completed Phaser and
PlayCanvas probes have pressure-tested the same renderer-neutral Foundation boundaries across
deterministic simulation, browser input, presentation recreation, UI orchestration, persistence,
reload/lifecycle behavior, browser compatibility, and measured probe performance.

Phase 3 exit criteria are satisfied. Release/handoff preparation is authorized after this review
merges with the required repository checks green.

This issue does not publish or tag v0.1.

## Sprint 07 completion

| Issue | Exit evidence |
| --- | --- |
| #75 / S07-01 | One canonical renderer-neutral toy-domain scenario is shared by both probe pages with the same initial state, deterministic seed, ordered command sequence, tick count, trace/checksum evidence, and presentation projection. |
| #76 / S07-02 | Renderer-independent deterministic simulation/replay was verified across multiple frame schedules without introducing renderer-owned simulation authority. |
| #77 / S07-03 | Both probes reuse the admitted Foundation browser-input composition for sequencing, action mapping, context ownership, lifecycle reset, and deterministic handoff; renderer/world coordinate meaning remains local. |
| #78 / S07-04 | Both probes exercise equivalent SaveEnvelope, migration, failure, payload-validation, and restore semantics while renderer objects remain outside persistence/domain state. |
| #79 / S07-05 | Visibility reset, reload, renderer teardown/recreation, and presentation rebuild preserve authoritative domain projections; later CI exposed a test-synchronization race corrected by PR #155 without changing runtime behavior. |
| #80 / S07-06 | Chromium remains the full browser suite while focused Firefox/WebKit coverage validates keyboard-to-tick handoff, IndexedDB reload/load, and lightweight Phaser Canvas startup with documented engine limitations. |
| #81 / S07-07 | Measured v0.1 probe budgets enforce zero dropped/overrun simulation frames, the FixedStepDriver five-step cap, and zero steady PlayCanvas presentation-entity churn; hosted-CI frame timing remains descriptive. |
| #82 / S07-08 | The full Foundation/testing public surface and dependency ledger were reviewed; the unconsumed `FoundationVersion` alias was removed, only two shared packages remain approved, and no renderer/package extraction is justified. |
| #83 / S07-09 | The concrete release-blocker ledger records the lifecycle test race and speculative public alias as resolved; no unresolved v0.1 blocker remains. |

## Phase 3 exit criteria

### S07-01 through S07-09 complete

Satisfied.

GitHub reports #75 through #83 closed. No waiver or deferred blocker is required for Phase 3 exit.

### Both renderer probes complete the required flow

Satisfied.

The Phaser and PlayCanvas probes jointly demonstrate:

- renderer-neutral authoritative `ToyDomainState`;
- normalized browser keyboard/pointer input at Foundation boundaries;
- logical action/context routing and plain domain intentions/commands;
- deterministic RNG and fixed-step simulation semantics where the application owns simulation
  advancement;
- disposable renderer-owned presentation projected from authoritative domain state;
- application-local Preact UI projection and intentions that never become gameplay authority;
- renderer-neutral save payloads, SaveEnvelope/version/migration semantics, IndexedDB storage,
  reload/load, payload validation, and domain restoration;
- renderer/presentation recreation after reload or teardown without serializing renderer objects.

The concrete renderer integrations intentionally differ where their renderer semantics differ.

### Cross-renderer deterministic scenario produces equivalent domain results

Satisfied.

The canonical Sprint 07 scenario uses one renderer-neutral initial snapshot, one deterministic seed,
one ordered command schedule, and one fixed tick count. Multiple frame schedules converge on the same
authoritative domain/RNG result and checksum. Both renderer pages expose the same scenario evidence
while presentation remains downstream.

This validates deterministic authority boundaries without creating a generic renderer loop.

### Browser compatibility risks recorded

Satisfied.

`docs/testing/browser-compatibility.md` records the compatibility matrix and limitations.

Required v0.1 browser evidence consists of:

- full Chromium Playwright coverage;
- focused Firefox compatibility pressure tests;
- focused WebKit compatibility pressure tests.

Known limits are explicit:

- Playwright WebKit on hosted Linux is not native macOS Safari validation;
- PlayCanvas/WebGL-heavy tests remain Chromium-only;
- synthetic pointer-cancellation behavior is not used as a cross-engine gate;
- performance observations remain Chromium-only and environment-scoped.

These limits are non-blocking because they do not contradict the admitted v0.1 contracts.

### Performance baselines and budgets recorded

Satisfied.

`docs/architecture/s07-performance-budgets.md` defines the current probe scenarios and separates
stable regression signals from hosted-runner timing noise.

Enforced v0.1 probe regression gates:

- zero dropped simulation steps in the Phaser baseline window;
- zero overrun frames;
- no frame exceeds the configured five-step FixedStepDriver cap;
- steady PlayCanvas presentation synchronization creates/destroys zero replacement entities during
  the measured interaction sequence.

Frame-time and synchronous interaction timings remain logged as observations rather than universal
production budgets. Production frame/memory targets require representative game scenarios and target
device classes.

### Public API, dependency, and extraction review complete

Satisfied.

`docs/architecture/sprint-07-v01-surface-review.md` records every named public export across the
accepted subpaths against current consumer/test evidence or an actively consumed typed signature.

The final shared package set remains:

- `@drakeshard/foundation`;
- `@drakeshard/testing`.

The final admitted Foundation subpaths are:

- `@drakeshard/foundation/input`;
- `@drakeshard/foundation/input/browser`;
- `@drakeshard/foundation/random`;
- `@drakeshard/foundation/time`;
- `@drakeshard/foundation/storage`;
- `@drakeshard/foundation/storage/browser`.

The admitted testing subpath is:

- `@drakeshard/testing/clock`.

`idb` 8.0.3 remains Foundation's only external runtime dependency. Phaser, PlayCanvas, Preact, and
signals remain private renderer-probe application dependencies.

No generic renderer adapter, Phaser/PlayCanvas package, shared UI package, schema/validation package,
diagnostics package, renderer-aware persistence layer, universal scene graph, or renderer entity
model is admitted.

### No renderer types entered domain contracts

Satisfied.

Phaser and PlayCanvas types remain presentation/application-local. The toy-domain state, commands,
snapshots, deterministic scenario data, persistence payloads, and Foundation contracts remain plain
renderer-neutral TypeScript data.

Renderer-local responsibilities remain local, including:

- Phaser Scene/GameObject/frame callback and canvas/world conversion;
- PlayCanvas Application/Entity/component/camera/terrain/ray/elevation/occlusion logic;
- presentation object lifecycle/rebuild;
- renderer-specific coordinate conversion;
- UI rendering and application orchestration.

### Release blockers resolved

Satisfied.

`docs/architecture/sprint-07-release-blockers.md` records the two concrete Sprint 07 blockers:

1. the asynchronous lifecycle persistence test race, fixed by PR #155;
2. the unconsumed `FoundationVersion` public alias, removed by PR #156.

No unresolved blocker remains. Documented future/device/performance/extraction limitations are
explicitly non-blocking.

### Required CI gates green

Satisfied at the release-candidate review level.

The latest Sprint 07 review PRs pass the required repository gates:

- formatting, lint, and architecture enforcement;
- TypeScript typecheck;
- unit/deterministic tests;
- build;
- full Chromium browser smoke/integration suite;
- focused Firefox/WebKit compatibility suite;
- Dependency Review.

The S07-10 pull request must pass the same gates before merge. If it does not, Phase 3 exit is not
complete until the failure is resolved.

## Architecture outcome

Phase 3 strengthens the existing Foundation boundary rather than expanding it.

The reusable cross-renderer semantics are primarily constraints:

- authoritative gameplay state is renderer-neutral;
- Foundation owns browser-neutral infrastructure, not rendering/gameplay policy;
- deterministic time/RNG/input handoff remain caller-driven;
- renderer objects are disposable views;
- world-coordinate meaning remains renderer/application-local;
- UI is downstream derived/transient state plus intentions;
- persistence stores renderer-neutral application/domain data.

The completed two-renderer pressure test provides evidence that these boundaries are sufficient for
v0.1 without a renderer framework.

## Risk disposition at Phase 3 exit

- Simulation nondeterminism is controlled by versioned RNG, fixed-step/tick boundaries, canonical
  cross-renderer scenario/replay evidence, and lifecycle reset tests.
- Save compatibility loss is controlled by explicit envelopes, sequential migrations, structured
  failures, non-destructive migration/load semantics, app-local payload validation, and
  cross-renderer persistence tests.
- Unmeasured performance regression is controlled for the defined v0.1 probe scenarios by measured
  regression gates; production device/game budgets remain future consumer-owned evidence.
- Renderer-boundary violation, dependency expansion, documentation drift, process overhead, and
  generic framework creep remain governance risks monitored by architecture checks, dependency
  review, controlled docs, and #119 admission.

No risk requires a Phase 3 exit waiver.

## Handoff / next phase

Phase 3 — Renderer Probes is complete once this review merges with required CI green.

The repository may proceed to release/handoff preparation. The next roadmap task is Sprint 08 /
#85 — finalize v0.1 package exports and manifests against the surface accepted by S07-08.

S08-01 must not re-expand the surface. It should finalize distribution metadata and consumer-style
import/build validation for the already approved packages/subpaths.

No tag, registry publication, release artifact, or package publication is performed by S07-10.
