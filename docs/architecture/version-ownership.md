# Data schema and content-version ownership

## Status

Accepted S04-04 terminology and ownership rules for Web Foundation v0.1.

These terms describe different compatibility dimensions. Sharing terminology does not imply that every dimension needs a Foundation runtime type or checker.

## Version dimensions

### dataSchemaVersion

`dataSchemaVersion` identifies the structure expected by a particular application-owned data/schema boundary, such as content JSON, configuration, authored level data, or another title-specific external-data format.

Ownership is application/game-local by default.

The application decides:

- what data the schema describes;
- which validator/schema library is used;
- whether older schema versions are accepted or migrated;
- whether a schema mismatch is recoverable;
- how schema-validation errors are shown to tools/users.

Foundation v0.1 does not expose a `DataSchemaVersion` runtime type or generic schema-version checker because no admitted shared API consumes one.

### contentVersion

`contentVersion` identifies a game/application content release or compatibility set.

It may describe which authored content bundle, balance/content revision, DLC/content pack set, or similar application-defined content was active when data was produced.

Its semantic compatibility policy is game-owned. Foundation persistence may carry the opaque string inside `SaveEnvelope`, but Foundation does not decide whether one content version is semantically compatible with another.

### saveFormatVersion

`saveFormatVersion` identifies the serialized save format understood by Foundation save-envelope/migration orchestration.

This is Foundation-owned infrastructure compatibility metadata.

It is the only version dimension that drives `SaveMigrationRegistry` sequencing. Migrations advance exactly one save-format version at a time.

A content/schema/game release change does not automatically imply a save-format migration.

### gameVersion

`gameVersion` identifies the game/application release that created a save.

Foundation persists it as metadata but does not interpret application release compatibility. A game may use it for support/debugging or app-owned policy.

### Foundation package version

The Foundation package/release version identifies the version of `@drakeshard/foundation` itself.

It is not persisted as a substitute for save-format, data-schema, game, or content compatibility versions, and it must not automatically drive save migrations.

## Ownership matrix

| Version | Primary owner | Foundation runtime role |
| --- | --- | --- |
| `dataSchemaVersion` | Game/application | None in v0.1 unless a future admitted shared boundary requires it |
| `contentVersion` | Game/application | Opaque metadata in `SaveEnvelope` |
| `saveFormatVersion` | Foundation persistence boundary | Drives sequential save migration |
| `gameVersion` | Game/application | Opaque metadata in `SaveEnvelope` |
| Foundation package version | Foundation release process | Package/release compatibility only |

## Compatibility examples

### Compatible without a save-format migration

A game changes `contentVersion` from `base-2026-09` to `base-2026-10`, but the existing save payload/envelope structure remains valid and game-owned load policy accepts both content sets.

The save may remain at the same `saveFormatVersion`. Foundation does not create a migration merely because content changed.

### Save-format migration required

A save payload changes from:

```json
{ "hp": 10 }
```

to:

```json
{ "health": { "current": 10, "max": 10 } }
```

and the application needs older saves converted before use.

The game registers the required payload transformation in Foundation's sequential save-migration orchestration and increments `saveFormatVersion`.

### Data-schema change independent from save format

An application changes an authored enemy-content JSON schema from version 3 to 4 while persisted player-save payloads remain unchanged.

The application-local content validator/migration owns that schema transition. `saveFormatVersion` need not change.

### Game release independent from compatibility format

A patch increments `gameVersion` while save serialization and content compatibility remain unchanged.

The save envelope records the new release identifier, but Foundation performs no migration solely because `gameVersion` changed.

## Boundary rules

- Validation of application content/schema data occurs before domain entry and remains application-owned unless a future admission review proves a shared Foundation boundary.
- Foundation does not compare opaque `gameVersion` or `contentVersion` strings for semantic compatibility.
- Foundation does not expose runtime types solely to standardize terminology.
- Save migrations are keyed only by `saveFormatVersion`.
- A future API that consumes another version dimension must independently pass the Foundation admission rule.
