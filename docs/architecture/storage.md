# Persistence and Save Boundary Contract

## Status

Accepted S03-01 contract for the Web Foundation v0.1 persistence boundary.

## Boundary split

Persistence is split into three layers:

1. **Settings storage** — small user preferences/settings only.
2. **Raw save storage** — durable serialized save records keyed by save slot.
3. **Save service** — higher-level orchestration that owns save-envelope validation, serialization/deserialization, compatibility checks, and sequential migrations.

Browser storage APIs are implementation details. Game/domain code consumes Foundation contracts and must not depend on `localStorage`, `indexedDB`, `IDBRequest`, `IDBDatabase`, or renderer types.

## Settings and preferences

`SettingsStorage` is synchronous because the approved v0.1 browser implementation is `localStorage`.

Settings values are constrained to JSON-compatible data. Missing keys return a successful `null` value. Malformed persisted JSON is a structured `corrupt-data` failure rather than an uncontrolled exception.

Settings storage is only for small preferences such as volume, language, display options, input preferences, or similar low-volume configuration. Full game saves, large content payloads, replay data, and binary assets are explicitly out of scope for `localStorage`.

Browser implementations must namespace physical keys by game and environment before appending the logical `SettingsKey`. The namespace is implementation configuration rather than part of every logical read/write call.

## Save identity and raw storage

A `SaveSlotId` is an opaque game-owned string. Foundation does not define names such as `slot1`, `autosave`, or `quicksave`.

`SaveStorage` is asynchronous and stores serialized strings only. Its v0.1 operations are:

- read one slot, returning serialized data or `null`;
- write one complete serialized slot;
- delete one slot, reporting whether a record existed where the backend can determine that reliably;
- list existing slot identifiers.

The approved real-save backend for the browser is IndexedDB. Raw IndexedDB request/database/transaction types must not escape the browser-specific storage implementation.

Raw storage does not parse save envelopes, validate save-format versions, run migrations, or understand game payloads.

## Save service ownership

`SaveService<TPayload>` is the simulation-external application boundary for typed game save payloads.

The game/application owns extraction of plain save payload data from authoritative domain state and application of a successfully loaded payload back into domain state.

The Foundation save service owns:

- save-envelope construction and validation;
- stable serialization/deserialization of the envelope;
- save-format compatibility checks;
- sequential migration orchestration;
- translation of storage/decode/migration failures into `PersistenceResult`.

The raw storage backend remains unaware of those responsibilities.

## Version boundaries

The persistence contract exposes three version aliases that participate in save metadata or migration:

- `SaveFormatVersion` — numeric compatibility version for the serialized save structure and migration chain;
- `GameVersion` — game/application release identifier;
- `ContentVersion` — game content/data compatibility identifier.

The Foundation package/release version is a separate release-process concept, not a persistence runtime type. S07-08 removed the unused `FoundationVersion` alias before v0.1 because no consumer or persistence contract required it.

`SaveFormatVersion` is the only version that determines the Foundation migration path. A future/current game or content version may inform game-owned compatibility policy but must not be silently treated as a save-format migration step.

Foundation package version is not a replacement for save-format, game, or content version metadata.

## Structured outcomes

Persistence APIs return `PersistenceResult<T>` rather than relying on thrown exceptions for expected operational failures.

The v0.1 failure vocabulary covers:

- storage unavailable;
- quota/capacity exceeded;
- corrupt data;
- unsupported save version;
- migration failure;
- read failure;
- write failure;
- delete failure;
- list failure.

Failures carry a normalized operation plus optional diagnostic name/message data. Consumers may branch on the stable `kind` and `operation`; they must not depend on browser-specific exception classes or raw storage request objects.

Unexpected programming errors may still throw. Expected persistence/platform failures should be converted into structured outcomes at the boundary.

## Async and simulation boundaries

Settings access is synchronous because `localStorage` is synchronous. Save storage and save-service operations are asynchronous.

Persistence promises are application/orchestration work. Fixed-step simulation code must not initiate or await save/load operations each tick. Loading and saving occur at explicit application boundaries such as startup, menus, checkpoints, or user actions.

v0.1 does not define a cancellation token for persistence operations. Callers may abandon an outstanding result when navigation/state changes, but a backend operation that has already started may complete. A cancellation contract should be added only when a current consumer demonstrates a concrete requirement.

## Safe-write direction

S03-01 establishes the ownership rule but does not implement commit behavior: raw storage writes complete serialized records, while later save-service work must ensure migration/write sequencing does not destroy the last usable source save before a successful replacement is committed.

Detailed safe commit behavior remains owned by S03-07.

## Browser implementation direction

- `localStorage` is approved only for small settings/preferences.
- IndexedDB is the approved browser backend for real saves.
- S03-03 must perform the repository dependency review for `idb` before adding it.
- Serialization/version migration orchestration remains above the raw storage backend.

## Deferred work

Later Sprint 03 issues own:

- browser localStorage settings implementation;
- IndexedDB save backend and `idb` dependency assessment;
- `SaveEnvelope` implementation;
- sequential migrations;
- structured failure wiring across concrete paths;
- safe write/migration commit behavior;
- real-browser persistence integration tests;
- minimal persistence diagnostics.
## Safe migration and write commit behavior

S03-07 makes load-time migration explicitly non-committing. `EnvelopeSaveService.load` reads and decodes the stored envelope, runs the complete required migration chain in memory, and returns the migrated payload. It does not replace the stored source record automatically. A caller must make a later explicit `save` call to commit migrated/current payload data.

This policy keeps the last committed source save intact if envelope decoding or migration fails and avoids turning a read/load operation into a hidden write.

`EnvelopeSaveService.save` constructs and validates the complete current envelope and serializes it before calling raw storage. It does not delete or clear the existing slot before the replacement write. The IndexedDB backend performs each slot replacement as one read-write transaction/object-store put, so a failed/aborted transaction retains the previously committed record where IndexedDB atomicity applies.

A corrupt or partially written pre-existing record returns structured `corrupt-data` during load and remains untouched. Recovery or explicit overwrite is an application decision; Foundation does not silently erase the record.

Game-id mismatch is also treated as corrupt/incompatible input for the configured save service and is not auto-rewritten.

Timestamp creation remains caller-controlled through the service's `now` function. Persistence remains application orchestration rather than fixed-step simulation work.



## S07-04 cross-renderer persistence pressure test

Sprint 07 verifies the admitted persistence and data-boundary surface against both live renderer
probes without adding generic validation or diagnostics APIs.

The renderer-probe app keeps one app-local `ProbePersistence` composition over
`EnvelopeSaveService` and `IndexedDbSaveStorage`. Phaser and PlayCanvas therefore use the same
game id, save-format version, game/content metadata, migration registry, structured
`PersistenceResult` failures, and renderer-neutral ToyDomain payload shape. Probe evidence inspects
the serialized envelope through the existing Foundation envelope decoder and confirms that no Phaser
or PlayCanvas objects enter save payloads.

The probe fixture now uses save-format version 2 and retains a fixture-only 1 -> 2 identity migration
so browser coverage exercises the real sequential migration path. Loading the legacy version proves
the S03-07 non-committing rule: both probes receive the same migrated ToyDomain snapshot while the
stored source envelope remains version 1 until an explicit save occurs.

ToyDomain payload validation remains application-local in `decodeToyDomainSnapshot`. A
Foundation-valid current envelope containing an invalid ToyDomain position is accepted by the
generic envelope service and then rejected before domain restoration with the app-local
`corrupt-data/decode` result. No shared `Decoder<T>` or schema package is introduced.

Both pages also reuse the app-owned persistence-failure projection that exposes only stable
`kind`/`operation` observations. Cross-renderer Chromium coverage compares corrupt raw data,
newer unsupported save formats, and application-invalid payloads while confirming failed loads do
not replace authoritative domain state. PlayCanvas does not fabricate a FixedStepDriver frame
observation merely for symmetry; no generic diagnostics registry or event buffer is added.
