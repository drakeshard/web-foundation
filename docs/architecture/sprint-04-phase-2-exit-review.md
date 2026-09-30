# Sprint 04 and Phase 2 Exit Review

## Outcome

Sprint 04 passes its exit review and Phase 2 — Browser Boundaries is complete.

The completed surface reflects the Foundation admission gate rather than the original speculative backlog. Closed/not-planned issues are intentional scope decisions, not exit exceptions.

Phase 3 — Renderer Probes is authorized after this exit-review PR merges and post-merge `main` remains green.

Exact continuation: #55 — S05-01 Define renderer-neutral toy domain.

## Sprint 04 completion status

- #45 — shared `Decoder<T>` admission — closed not planned.
- #46 — shared structured decode errors — closed not planned because #45 was not admitted.
- #47 — application-local validation boundary — complete.
- #48 — data-schema/content-version ownership — complete.
- #49 — generic counters/timers registry — intentionally not planned.
- #50 — generic diagnostic event ring buffer — intentionally not planned.
- #51 — admitted subsystem observability review — complete no-code; existing outputs are sufficient.
- #52 — admitted-boundary test review — complete no-code; existing focused/runtime/browser tests cover the actual shipped surface.
- #53 — API/performance boundary review — complete.
- #119 — Foundation admission gate — complete before Sprint 04 implementation.

No waiver or remediation is required for Sprint 04.

## Shipped Sprint 04 surface

Sprint 04 intentionally adds no new Foundation public runtime API.

The shipped changes are:

1. application-local validation guidance and example;
2. focused tests proving decode-before-domain-entry behavior;
3. version terminology and ownership documentation;
4. explicit API/performance review evidence.

This is the intended result of the admission guardrail.

## Validation boundary

Untrusted application/game content is validated before domain entry.

Validation remains application-owned by default. The current example uses local validation and local readable errors outside `@drakeshard/foundation`.

No shared schema package, `Decoder<T>`, `DecodeResult<T>`, shared decode-error model, Zod/Valibot runtime dependency, or validator-library public type was added to Foundation.

A future shared decode boundary requires a fresh admission decision with a concrete current consumer.

## Version ownership

The accepted compatibility dimensions are distinct:

- `dataSchemaVersion` — application/game-owned external-data schema compatibility;
- `contentVersion` — application/game-owned content compatibility identity, carried opaquely where needed;
- `saveFormatVersion` — Foundation persistence migration-chain key;
- `gameVersion` — opaque application release metadata;
- Foundation package version — Foundation release/package identity.

Only `saveFormatVersion` drives Foundation sequential save migrations.

Foundation does not add runtime classes/checkers merely to standardize terminology.

## Observability boundary

No generic observability framework is shipped.

Current public data already provides:

- fixed-step `steps`, `alpha`, `clampedMs`, `droppedSteps`, and `overrun`;
- deterministic tick input actions/transitions/commands;
- structured persistence failure kind/operation/diagnostics;
- migration `appliedVersions`.

Caller-owned timing remains sufficient for current asynchronous persistence measurements.

No generic counter/timer registry, diagnostic ring buffer, telemetry/event bus, retained diagnostic store, input queue metric, or debug UI belongs in Foundation v0.1.

## Browser-boundary verification

Phase 2 real-browser coverage includes:

- keyboard browser input;
- pointer buttons and pointer cancellation;
- wheel normalization;
- focus/blur/visibility reset and no stale replay;
- input contexts and deterministic tick handoff;
- settings persistence and malformed stored settings;
- IndexedDB persistence across reload/new page;
- SaveEnvelope round trip;
- multi-step save migration;
- corrupt and unsupported saves;
- failed-migration source preservation.

Application-local validation itself is renderer/browser independent and therefore uses focused unit coverage rather than artificial browser coverage.

## Renderer/domain separation

Foundation remains renderer-neutral.

No Phaser, PlayCanvas, Preact, renderer-world coordinate, DOM event, RPG, tactical, combat, actor/stat/job/skill/equipment, grid/turn/initiative/action-point, LoS/cover/pathfinding, AI, quest, or title-content semantic was admitted into Foundation contracts.

Renderer-local screen-to-world conversion remains outside Foundation.

Foundation `InputCommand` remains an input-delivery record, not the authoritative game-domain command model.

## Performance and dependency review

Sprint 04 adds no Foundation runtime hook and therefore introduces no new shared hot-path allocation or CPU path.

No Sprint 04 runtime dependency was added.

Existing pinned dependency and CI policies remain in force.

## Quality gates

The merged Sprint 04 state passes:

- frozen dependency installation;
- Biome formatting/lint;
- architecture import-boundary checks;
- TypeScript typecheck;
- unit tests;
- workspace build;
- Chromium browser integration;
- pull-request Dependency Review.

Post-S04-09 `main` Quality is green.

## Risk reconciliation

The Phase 2 result materially strengthens existing controls:

- R-001 premature platform abstraction: controlled by #119 and the no-code/not-planned Sprint 04 decisions;
- R-002 renderer boundary violation: browser/renderer boundaries remain explicit and CI-enforced;
- R-005 simulation nondeterminism: tick-aligned input and browser lifecycle behavior are covered;
- R-006 save compatibility loss: versioned envelopes, sequential migration, source preservation, and real-browser tests are implemented;
- R-007 unmeasured performance regression: Sprint 04 added no new runtime hook; Phase 3 renderer probes are the next measurement/pressure-test stage;
- R-008 documentation drift: controlled docs and repository architecture are reconciled at phase exit;
- R-011 generic utility/framework creep: actively controlled; generic validation/diagnostics abstractions were rejected where evidence was absent.

The controlled Risk Register should reflect these current mitigations/status notes during this exit task.

## Phase 3 authorization

Phase 2 is complete.

Phase 3 — Renderer Probes may begin after this PR merges and the post-merge default-branch Quality run is green.

The first task is #55 — S05-01 Define renderer-neutral toy domain.

The #55 fixture is an integration pressure-test domain, not a new Foundation package, game framework, RPG library, or Tactical library. It must define fixture-local semantic domain commands rather than treating Foundation `InputCommand` as the game-domain command model.

No Phase 3 implementation is included in this exit review.
