# Web Foundation v0.1 Compatibility and Versioning Record

## Status

S08-03 / #87 release-candidate compatibility record.

This document reconciles the version concepts that are operational in the v0.1 implementation. It does not choose the package distribution mechanism; S08-05 / #89 owns that decision.

## Foundation package version

The release-candidate manifests for both approved shared packages currently declare `0.1.0`:

- `@drakeshard/foundation`;
- `@drakeshard/testing`.

For v0.1 these packages move in lockstep because they are released from one repository and the testing package exists only to support the Foundation release. This is a v0.1 release-process decision, not a permanent requirement that future packages must share versions.

The package version identifies the shipped package/API release. It does **not** replace or implicitly determine:

- deterministic RNG algorithm identity;
- save-format compatibility;
- application data-schema compatibility;
- application content compatibility;
- game/application release identity;
- any future network protocol identity.

The package version is not persisted inside `SaveEnvelope` and does not drive `SaveMigrationRegistry`.

S08-08 / #92 owns the formal v0.1 tag/release after release-candidate validation. S08-05 / #89 selects versioned package tarballs attached to that GitHub Release as the v0.1 cross-repository distribution mechanism. The manifests remain `private: true`; no npm or GitHub Packages registry publication is part of v0.1.

## Deterministic RNG compatibility

The v0.1 RNG compatibility identifier is:

```text
xoshiro128starstar-v1
```

The identifier covers the compatibility-sensitive behavior of the deterministic generator, including:

- xoshiro128** state transition and output transform;
- the `seed32-v1` seed-expansion procedure;
- unsigned-32-bit state representation;
- `nextUint32()` behavior;
- `nextFloat01()` consuming exactly one core draw;
- snapshot state shape and continuation semantics.

A package release may change without changing the RNG algorithm identifier when those semantics remain compatible.

Changing the core transition, output transform, seed expansion, persisted state interpretation, or helper draw-consumption semantics requires a new RNG algorithm identifier rather than silently changing `xoshiro128starstar-v1`.

`packages/foundation/test/deterministic-rng.golden.test.ts` is the compatibility lock. It protects:

- exact seed expansion for representative/edge seeds;
- exact uint32 output sequences;
- exact `nextFloat01()` draw consumption;
- exact snapshot/restore continuation.

Games that require deterministic continuation may persist `DeterministicRngState` in their game-owned save payload. Foundation persistence does not do this automatically.

## saveFormatVersion

`SaveFormatVersion` is the numeric compatibility key used by Foundation save-envelope and migration orchestration.

It is the only version dimension that drives `SaveMigrationRegistry`.

Operational rules in v0.1:

- versions are non-negative safe integers;
- migrations advance exactly one version at a time;
- a newer stored format than the configured target returns `unsupported-version`;
- a missing required migration returns `unsupported-version`;
- migration exceptions/failures normalize to `migration-failed`;
- load-time migration is non-committing;
- successful migration does not rewrite the stored record until the application explicitly saves again.

A Foundation package version change does not automatically require a save-format version change. A game/content/schema release change also does not automatically require one.

Increment `saveFormatVersion` only when the persisted save representation/interpretation requires a migration step.

## dataSchemaVersion

`dataSchemaVersion` is application-owned terminology for the version of a particular external/application data schema, for example authored content, configuration, level data, or another title-specific data format.

Foundation v0.1 has no `DataSchemaVersion` runtime type or generic schema-version framework because no admitted Foundation API consumes one.

The application owns:

- schema validation;
- compatibility rules;
- migration policy;
- error reporting;
- whether a schema transition affects saved-game compatibility.

A `dataSchemaVersion` change may occur without a `saveFormatVersion` change, and vice versa.

## contentVersion

`ContentVersion` is an opaque game/application content identifier carried by `SaveEnvelope`.

Foundation persists the value but does not compare or interpret its semantic compatibility.

The application decides whether a save created against one content version may load against another. A content-version change does not automatically trigger Foundation save migration.

## gameVersion

`GameVersion` identifies the game/application release that created a save.

Foundation carries it as opaque metadata for application policy, support, or diagnostics. It does not use `gameVersion` as a save migration key and does not compare game releases for compatibility.

The game version is distinct from the Foundation package version.

## protocolVersion

`protocolVersion` is deferred in v0.1.

Web Foundation v0.1 contains no networking protocol, rollback transport, authoritative multiplayer wire contract, or other consumer that would justify a protocol-version runtime type.

If a future networking boundary is admitted, its protocol compatibility/version rules must be designed from the concrete wire contract and must pass the Foundation admission rule. A protocol version must not be inferred from the Foundation package version.

## Compatibility matrix

| Dimension | v0.1 representation | Primary owner | What changes it |
| --- | --- | --- | --- |
| Foundation package version | package manifest `0.1.0` | Foundation release process | shipped package/API release |
| RNG algorithm version | `xoshiro128starstar-v1` | Foundation random contract | deterministic sequence/state incompatibility |
| `saveFormatVersion` | non-negative integer | Foundation persistence contract + game migration definitions | persisted save representation requiring migration |
| `dataSchemaVersion` | application-defined | Game/application | application-owned data schema compatibility |
| `contentVersion` | opaque string in `SaveEnvelope` | Game/application | content compatibility/release set |
| `gameVersion` | opaque string in `SaveEnvelope` | Game/application | game/application release |
| `protocolVersion` | deferred | future networking boundary | future wire-protocol incompatibility |

## Compatibility review rule

A release change must identify which compatibility dimensions actually changed.

Do not increment or conflate unrelated dimensions merely because another version changed. In particular:

- a Foundation package release does not imply a save migration;
- a game release does not imply a save migration;
- a content/schema change does not imply a save migration unless persisted save interpretation requires it;
- a deterministic RNG behavior change must receive a new RNG algorithm identifier;
- future networking must use its own protocol compatibility contract.

## Evidence

The v0.1 record is backed by:

- package manifests declaring `0.1.0`;
- deterministic RNG golden-vector/snapshot tests;
- `SaveMigrationRegistry` sequential-version enforcement;
- browser persistence tests covering migration, unsupported versions, corruption, and source preservation;
- application-local schema/payload validation evidence from the renderer probes;
- S07-08 removal of the unused `FoundationVersion` runtime alias.

No new runtime version type, migration mechanism, protocol abstraction, or package export is introduced by S08-03.
