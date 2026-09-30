# Sprint 03 Exit Review — Persistence and Save Compatibility

## Outcome

Sprint 03 passes its exit review with no approved exceptions.

S03-01 through S03-09 are complete. The mandatory pre-S04 Foundation scope gate, Issue #119, is also complete and records its keep/adjust/remove decisions.

Sprint 04 may begin only with the surfaces admitted or conditionally admitted by #119. Closed/not-planned speculative utilities remain out of scope unless separately re-admitted with new evidence.

## Completion status

- S03-01 / #35 — storage and save-service contracts — complete.
- S03-02 / #36 — localStorage settings/preferences adapter — complete.
- S03-03 / #37 — IndexedDB save storage — complete.
- S03-04 / #38 — SaveEnvelope and version metadata — complete.
- S03-05 / #39 — sequential save migrations — complete.
- S03-06 / #40 — structured persistence failures — complete.
- S03-07 / #41 — safe save-write and migration commit behavior — complete.
- S03-08 / #42 — real-browser persistence integration — complete.
- S03-09 / #43 — minimal persistence observability review — complete with no new public API admitted.
- S03-G1 / #119 — Foundation scope/pre-S04 admission gate — complete.

## Real-browser persistence evidence

The merged Chromium suite validates:

- settings persistence and malformed stored values;
- IndexedDB save persistence across reload and a second page in the same browser context;
- save-envelope round trip through IndexedDB;
- a real multi-step 1 → 2 → 3 migration;
- load-time migration that does not replace the source record;
- corrupt data as a structured `corrupt-data` result;
- unsupported future save format as `unsupported-version`;
- failed migration as `migration-failed` while preserving the source record.

The final S03-08 PR passed 14 browser tests.

## Safe migration and write behavior

`EnvelopeSaveService.load` decodes and migrates in memory. Migration success during load does not commit automatically.

A caller must perform a later explicit save to write current-format data. The source save is therefore not replaced before migration completes successfully.

`EnvelopeSaveService.save` constructs, validates, and serializes the complete envelope before calling raw storage. IndexedDB replacement uses a single read-write transaction/object-store put and does not delete the old slot first.

Failure-injection tests verify migration failure and write failure leave the prior committed data readable where IndexedDB atomicity applies.

## Version and compatibility boundaries

The persistence surface distinguishes:

- `saveFormatVersion` — Foundation migration compatibility dimension;
- `gameVersion` — game/application release identifier;
- `contentVersion` — game-owned content compatibility identifier;
- Foundation package version — separate from save compatibility.

Only save-format version drives the Foundation migration chain. Game-specific compatibility meaning remains outside Foundation.

## Structured failures

Expected storage/decode/migration failures are returned through `PersistenceResult<T>` with stable failure `kind`, normalized `operation`, and optional diagnostic name/message.

The public surface distinguishes storage unavailable, quota exceeded, corrupt data, unsupported version, migration failure, and operation-specific read/write/delete/list failures without exposing raw browser request/database/transaction types.

## Dependency review

The browser IndexedDB adapter uses exact dependency `idb` 8.0.3.

S03-03 recorded the dependency assessment: purpose/scope, ISC license, zero runtime dependencies, runtime/bundle impact, maintenance and replacement cost, and security considerations. The dependency remains internal behind `SaveStorage`, with exact versioning and committed lockfile.

## Persistence scope boundary

Persistence remains generic infrastructure.

Foundation owns:

- generic settings/raw-save contracts;
- browser storage adapters;
- save-envelope structure and serialization;
- save-format migration orchestration;
- safe commit behavior;
- normalized infrastructure failures.

Foundation does not own title-specific save metadata, gameplay payload semantics, game-domain compatibility policy, actors/stats/classes/jobs/skills/equipment, tactical state, or renderer-specific save data.

## Observability conclusion

S03-09 found no concrete gap requiring a new public diagnostics API.

Current needs are already served by:

- structured `PersistenceResult` metadata;
- `SaveMigrationResult.appliedVersions` for migration path/count inspection;
- caller-owned timing around explicit async save/load calls;
- browser integration results.

No counter/timer registry, telemetry framework, event bus, ring buffer, or persistence-specific diagnostic hook was added.

## Quality gates

Merged Sprint 03 state passes:

- frozen dependency installation;
- Biome formatting/lint;
- architecture boundary checks;
- TypeScript typecheck;
- unit tests;
- workspace build;
- Chromium browser integration;
- pull-request Dependency Review.

Post-S03-08 `main` Quality is green.

## Pre-S04 admission gate

Issue #119 is complete.

Its key decisions are:

- keep S01–S03 public surfaces with boundary clarifications only;
- no S01–S03 public API requires removal or relocation;
- Foundation input delivery records are not authoritative game-domain commands;
- persistence stops at generic storage/envelope/version/migration mechanics;
- #49 generic counters/timers and #50 diagnostic event ring buffer remain not planned;
- #45/#46 decoder/error APIs are conditional on concrete consumer evidence;
- #47 app-local validation example and #48 version-ownership documentation remain planned;
- #51 subsystem observability remains narrow/conditional and may close no-code;
- genericity/reusability alone is not sufficient admission evidence.

## Sprint 04 authorization

Sprint 03 exit and #119 are both complete, so Sprint 04 may begin.

The exact next task is #45 — S04-01 Decide whether a shared Decoder<T> contract is justified.

This is an admission decision, not automatic authorization to implement a shared decoder. If no current shared consumer demonstrates concrete benefit over app-local validation, #45 should close not planned.

No Sprint 04 implementation is included in this exit-review change.
