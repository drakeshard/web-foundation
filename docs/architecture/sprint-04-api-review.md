# Sprint 04 API and Performance Boundary Review

## Outcome

S04-09 passes with no corrective runtime change required.

Sprint 04 added no new public Foundation runtime API. The admitted work consists of an application-local validation example plus version/ownership documentation. Conditional generic validation and observability surfaces were not admitted where no concrete current consumer justified Foundation ownership.

## Public API admission review

### Shared decoder and decode errors

Issues #45 and #46 are not planned for v0.1.

No `Decoder<T>`, `DecodeResult<T>`, shared decode-error type, schema DSL, or validator-library abstraction was added to `@drakeshard/foundation`.

The current validation consumer is demonstrated in `examples/application-local-validation.ts`, outside Foundation runtime/public exports. Its validation error shape is application-owned.

### Version concepts

S04-04 documents `dataSchemaVersion` and `contentVersion` ownership without adding runtime classes or generic checkers.

Existing persistence types remain narrow:

- `saveFormatVersion` drives Foundation sequential save migration;
- `gameVersion` and `contentVersion` remain opaque save metadata;
- application-owned data schema compatibility remains outside Foundation;
- Foundation package version is not a save/content/schema compatibility key.

No additional runtime version surface was admitted merely to standardize terminology.

### Observability

S04-07 completed no-code.

Existing return values already expose current required information:

- fixed-step advancement returns step count, interpolation alpha, clamped time, dropped steps, and overrun state;
- tick input consumption returns contextual action state, ordered transitions, and ordered commands;
- persistence returns structured failures, while migration results expose applied versions;
- callers can measure operation duration locally when needed.

No generic counter/timer registry, input queue metric, telemetry/event bus, diagnostic event buffer, or persistence timing hook was added.

Issues #49 and #50 remain intentionally not planned.

## Dependency and validator boundary

Foundation exposes no Zod, Valibot, or other validator-library dependency or public type.

The application-local example uses direct local validation and does not create a shared schema package.

No Sprint 04 runtime dependency was added.

## Performance and allocation review

Because Sprint 04 adds no new Foundation runtime hook, there is no new hot-path allocation/runtime cost to optimize.

The application-local validation example runs at an explicit external-data/domain-entry boundary rather than in deterministic per-tick simulation.

Existing time/input/persistence costs remain governed by their earlier sprint reviews. S04 does not add instrumentation callbacks, event fan-out, counters, retained diagnostic buffers, or shared mutable telemetry state.

No pooling or speculative optimization is justified by Sprint 04.

## Domain and renderer boundaries

No renderer, Phaser, PlayCanvas, Preact, RPG, tactical, combat, actor/stat/job/skill/equipment, grid/turn/LoS/cover/pathfinding, AI, quest, or title-specific content semantics entered Foundation.

Validation remains application-owned by default.

The Foundation persistence boundary continues to stop at generic storage/envelope/version/migration/safe-commit mechanics.

## Keep / defer / remove decision

### Keep

- application-local decode-before-domain-entry guidance and example;
- data-schema/content/save/game/Foundation version terminology and ownership documentation;
- existing Foundation time/input/storage observable return values.

### Defer / conditional

- shared decoder contract;
- shared decode-error contract;
- narrow subsystem observability hooks.

These require a future concrete current consumer and a new admission decision.

### Not planned

- generic counters/timers registry (#49);
- generic diagnostic event ring buffer (#50).

## Conclusion

The Sprint 04 surface remains within Web Foundation scope and does not create framework creep.

No public API needs removal, narrowing, renaming, deprecation, or relocation as a result of S04-09.

The next task after this review is S04-10 / #54, the Sprint 04 and Phase 2 exit review.
