# Sprint 07 v0.1 Public Surface, Dependency, and Extraction Review

## Status

S07-08 / #82 release-surface review for Web Foundation v0.1.

This review uses the completed Phaser and PlayCanvas probes plus Sprint 07 pressure tests as the
current consumer evidence. The #119 admission rule remains authoritative: repeated principles do not
become shared runtime APIs unless there is a concrete current consumer, materially matching
semantics, and lower shared maintenance cost.

## Outcome

The v0.1 shared package set remains exactly:

- `@drakeshard/foundation`;
- `@drakeshard/testing`.

No renderer package, UI package, schema/validation package, diagnostics package, or additional shared
runtime package is admitted.

One speculative public alias was found and removed before v0.1:

- `FoundationVersion` from `@drakeshard/foundation/storage`.

The alias had no runtime consumer, was not used by persistence behavior, and conflicted with the
documented rule that Foundation package version is a release-process concept rather than a
save-compatibility key. The package version remains ordinary package metadata; it is not a
persistence runtime contract.

No other admitted v0.1 export requires removal, deprecation, relocation, or renderer-specific
specialization.

## Package and subpath boundary

Neither shared package exposes its empty root source index as a package entry point. Consumers must
select an explicit subpath.

Accepted Foundation subpaths:

- `@drakeshard/foundation/input`;
- `@drakeshard/foundation/input/browser`;
- `@drakeshard/foundation/random`;
- `@drakeshard/foundation/time`;
- `@drakeshard/foundation/storage`;
- `@drakeshard/foundation/storage/browser`.

Accepted testing subpath:

- `@drakeshard/testing/clock`.

The private `@drakeshard/renderer-probe-app` workspace is validation evidence, not a shared package.

## Public export review

The tables below account for every named v0.1 package export after removal of
`FoundationVersion`. Types that primarily describe a public class/function signature are retained
when the concrete operation is actively consumed and tested; they are part of the typed contract,
not speculative standalone systems.

### `@drakeshard/foundation/input`

| Export | Current evidence | v0.1 decision |
| --- | --- | --- |
| `ActionBinding` | Action-mapping unit tests and renderer-probe binding declarations | Keep |
| `ActionBindingResolver` | Unit tests, `TickInputHandoff`, and shared probe input composition used by both renderers | Keep |
| `ActiveActionSource` | Return contract of tested `activeSources()` inspection | Keep |
| `ActiveActionSourceIdentity` | Public shape used by `ActiveActionSource` and resolver state inspection | Keep |
| `ActiveKeyActionSource` | Key variant of tested active-source inspection | Keep |
| `ActivePointerButtonActionSource` | Pointer variant of tested active-source inspection | Keep |
| `DigitalPhysicalBinding` | Public union underlying `ActionBinding` | Keep |
| `KeyPhysicalBinding` | Key binding variant exercised by unit tests and both probes | Keep |
| `LogicalActionTransition` | Resolver output consumed by context routing/tick handoff and unit tests | Keep |
| `PointerButtonPhysicalBinding` | Pointer binding variant exercised by unit tests and both probes | Keep |
| `DigitalInputPhase` | Shared physical/logical transition signature | Keep |
| `InputCommand` | Tick-command queue contract exercised in unit tests and probe pointer handoff | Keep |
| `InputSequence` | Deterministic ordering contract used throughout browser input and tick handoff | Keep |
| `InputSequenceSource` | Browser adapter/lifecycle sequencing dependency implemented by `MonotonicInputSequence` | Keep |
| `LogicalActionId` | Public identifier type used by mappings, contexts, and snapshots | Keep |
| `LogicalActionState` | Base typed state for contextual tick action output | Keep |
| `PhysicalInputEvent` | Shared browser-to-deterministic input union consumed by handoff and probes | Keep |
| `PhysicalInputReset` | Reset event variant exercised by lifecycle/reset tests | Keep |
| `PhysicalInputResetReason` | Public reset reason vocabulary used by browser lifecycle | Keep |
| `PhysicalInputResetScope` | Public reset scope required to isolate keyboard/pointer invalidation | Keep |
| `PhysicalInputSink` | Browser adapter/lifecycle sink boundary used by concrete adapters | Keep |
| `PhysicalKeyCode` | Key input/binding signature | Keep |
| `PhysicalKeyInput` | Physical input union variant exercised by keyboard tests | Keep |
| `PhysicalPointerButtonInput` | Physical input union variant exercised by pointer/action tests | Keep |
| `PhysicalPointerCancelInput` | Physical input union variant exercised by pointer cancellation/reset behavior | Keep |
| `PhysicalPointerPositionInput` | Physical input union variant used for renderer-local world conversion | Keep |
| `PhysicalWheelInput` | Physical input union variant covered by pointer/wheel tests | Keep |
| `PointerButton` | Pointer input/binding signature | Keep |
| `PointerId` | Pointer event identity used by cancellation and active binding state | Keep |
| `PointerType` | Pointer normalization/binding signature | Keep |
| `ScreenPosition` | Normalized browser position consumed by both renderer-local coordinate conversions | Keep |
| `WheelUnit` | Normalized wheel contract covered by browser adapter tests | Keep |
| `ContextActionOwner` | Tested `InputContextRouter.resolve()` return contract | Keep |
| `ContextualActionTransition` | Router/tick-handoff output contract covered by unit tests | Keep |
| `InputContextActionRule` | Context configuration shape used by tests and probe composition | Keep |
| `InputContextDefinition` | Context configuration shape used by tests and probe composition | Keep |
| `InputContextId` | Context identity shared by routing and tick state | Keep |
| `InputContextRouter` | Unit tested and used by the shared probe input composition | Keep |
| `MonotonicInputSequence` | Unit tested and used by browser input composition | Keep |
| `ContextualLogicalActionState` | Tick snapshot action-state contract | Keep |
| `TickInputHandoff` | Unit tested and used to gate probe gameplay input at deterministic ticks | Keep |
| `TickInputHandoffOptions` | Constructor contract for the actively consumed handoff | Keep |
| `TickInputSnapshot` | Return contract of tested/consumed tick handoff | Keep |

### `@drakeshard/foundation/input/browser`

| Export | Current evidence | v0.1 decision |
| --- | --- | --- |
| `BrowserInputEventTarget` | Testable DOM-like event-target boundary used by concrete adapters/lifecycle | Keep |
| `BrowserVisibilityTarget` | Visibility lifecycle boundary covered by unit and browser tests | Keep |
| `BrowserInputLifecycle` | Unit tested and used by both renderer probes for blur/visibility/reset handling | Keep |
| `BrowserInputLifecycleOptions` | Constructor contract of active lifecycle implementation | Keep |
| `BrowserInputResetListener` | Lifecycle reset-listener contract used by browser adapters | Keep |
| `KeyboardBrowserAdapter` | Unit/browser tested and used by both renderer probes | Keep |
| `KeyboardBrowserAdapterOptions` | Constructor contract for active keyboard adapter | Keep |
| `PointerBrowserAdapter` | Pointer/wheel unit/browser tested and used by both renderer probes | Keep |
| `PointerBrowserAdapterOptions` | Constructor contract for active pointer adapter | Keep |

### `@drakeshard/foundation/random`

| Export | Current evidence | v0.1 decision |
| --- | --- | --- |
| `DeterministicRng` | Unit/golden tests, deterministic simulation tests, canonical cross-renderer scenario, both probes | Keep |
| `DeterministicRngState` | Snapshot/replay contract consumed by probe simulation and cross-renderer traces | Keep |
| `RNG_ALGORITHM_ID` | Golden compatibility tests and deterministic replay metadata | Keep |

### `@drakeshard/foundation/time`

| Export | Current evidence | v0.1 decision |
| --- | --- | --- |
| `FixedStepAdvanceResult` | Return contract observed by simulation, debug/performance tests, and regression budgets | Keep |
| `FixedStepConfig` | Constructor configuration contract used by tests and probe simulation | Keep |
| `FixedStepDriver` | Unit/deterministic tests, Phaser simulation, canonical cross-renderer scenario, S07 performance gates | Keep |

### `@drakeshard/foundation/storage`

| Export | Current evidence | v0.1 decision |
| --- | --- | --- |
| `ContentVersion` | Typed opaque metadata carried by `SaveEnvelope` | Keep |
| `GameVersion` | Typed opaque metadata carried by `SaveEnvelope` | Keep |
| `JsonPrimitive` | Base JSON payload contract used by `JsonValue` | Keep |
| `JsonValue` | Envelope/service payload boundary used by unit tests and renderer-probe persistence | Keep |
| `PersistenceDiagnostic` | Optional normalized diagnostic shape in structured failures | Keep |
| `PersistenceFailure` | Stable structured failure contract used by storage/service paths and tests | Keep |
| `PersistenceFailureKind` | Stable branchable failure vocabulary covered by failure/browser tests | Keep |
| `PersistenceOperation` | Stable operation vocabulary in structured failures | Keep |
| `PersistenceResult` | Core expected-outcome contract used by all persistence implementations/consumers | Keep |
| `SaveFormatVersion` | Envelope compatibility key and migration sequencing contract | Keep |
| `SaveService` | Public higher-level save-service interface implemented by `EnvelopeSaveService` | Keep |
| `SaveSlotId` | Opaque slot identity used by raw storage/service contracts | Keep |
| `SaveSlotSummary` | Typed list result used by `SaveService.list()` | Keep |
| `SaveStorage` | Raw save backend contract implemented by IndexedDB and test doubles | Keep |
| `SettingsKey` | Logical settings key contract used by settings storage | Keep |
| `SettingsNamespace` | Browser settings namespace configuration contract | Keep |
| `SettingsStorage` | Small-preference storage contract implemented by localStorage adapter | Keep |
| `EnvelopeSaveService` | Unit/browser tested and reused by both renderer probes | Keep |
| `EnvelopeSaveServiceOptions` | Constructor contract for active save service | Keep |
| `createSaveEnvelope` | Unit tested and used by renderer-probe fixture seeding | Keep |
| `deserializeSaveEnvelope` | Unit tested and used for probe inspection/compatibility evidence | Keep |
| `GameId` | Typed envelope metadata field | Keep |
| `SaveEnvelope` | Core persisted envelope contract used by service/tests/probe inspection | Keep |
| `SaveEnvelopeMetadata` | Envelope creation/serialization contract | Keep |
| `SaveTimestamp` | Typed envelope timestamp field | Keep |
| `serializeSaveEnvelope` | Unit tested and used by renderer-probe fixture seeding | Keep |
| `validateSaveEnvelope` | Unit tested decoder boundary used by deserialization/service | Keep |
| `SaveMigration` | Migration registration contract exercised by unit/probe compatibility tests | Keep |
| `SaveMigrationRegistry` | Unit/service/browser tested and reused by renderer-probe persistence | Keep |
| `SaveMigrationResult` | Registry result contract including applied-version evidence | Keep |

Removed during this review:

| Removed export | Evidence | Decision |
| --- | --- | --- |
| `FoundationVersion` | No current code consumer; Foundation package version does not participate in persistence behavior and the controlled version-ownership document says package version is release metadata only | Remove before v0.1 |

### `@drakeshard/foundation/storage/browser`

| Export | Current evidence | v0.1 decision |
| --- | --- | --- |
| `IndexedDbSaveStorage` | Real-browser storage/service tests and both renderer probes | Keep |
| `IndexedDbSaveStorageOptions` | Constructor contract for active IndexedDB backend | Keep |
| `BrowserKeyValueStorage` | Testable localStorage-compatible boundary used by settings adapter tests | Keep |
| `LocalStorageSettingsStorage` | Unit/browser tested settings implementation | Keep |
| `LocalStorageSettingsStorageOptions` | Constructor contract for active settings adapter | Keep |

### `@drakeshard/testing/clock`

| Export | Current evidence | v0.1 decision |
| --- | --- | --- |
| `ManualClock` | Dedicated unit tests and deterministic simulation tests with Foundation RNG/fixed-step driver | Keep |

## Dependency and transitive-cost review

The approved dependency ledger remains correctly scoped.

### Shared runtime package cost

`@drakeshard/foundation` has one external runtime dependency:

- `idb` 8.0.3, confined to the browser IndexedDB save adapter.

The ledger records approximately 1.19 kB brotli from upstream documentation, zero runtime
dependencies, no native binary/install-script requirement, and a feasible direct-IndexedDB
replacement path behind `SaveStorage`.

`@drakeshard/testing` adds no external runtime dependency. Its Foundation relationship is a
workspace development dependency for test composition.

### Probe-only dependencies

The private renderer-probe application owns:

- Phaser 4.2.1 -> runtime `eventemitter3` 5.0.4;
- Preact 10.29.8;
- `@preact/signals` 2.11.2 -> `@preact/signals-core` 1.14.4 plus Preact peer;
- PlayCanvas 2.22.6 -> type declaration packages `@types/webxr` 0.5.24 and
  `@webgpu/types` 0.1.74.

These dependencies are not dependencies, exports, peer dependencies, or public types of either
shared package.

### Development tooling

TypeScript, Vite, Vitest, Playwright, and Biome remain development-only workspace tooling. Their
transitives affect repository installation/CI cost but not shipped Foundation runtime code.

No dependency addition or package extraction is required by S07-08.

## Renderer adapter extraction re-evaluation

The S06 cross-renderer comparison remains valid after the full Sprint 07 pressure test.

Sprint 07 added stronger evidence for shared *boundaries*:

- both probes can converge on the same canonical deterministic domain result;
- both use the same Foundation browser input composition for normalized events, action mapping,
  context ownership, sequencing, lifecycle reset, and tick-safe handoff where applicable;
- both persist the same renderer-neutral payload/envelope semantics;
- lifecycle/reload/recreation preserve authoritative domain state;
- renderer-specific presentation can be destroyed and rebuilt;
- compatibility/performance pressure tests did not require a renderer abstraction.

It did not produce a narrower shared renderer implementation.

Phaser still owns Scene/GameObject/frame-delta integration and 2D canvas/world conversion.
PlayCanvas still owns Application/Entity/component/camera/terrain/ray/elevation/occlusion behavior
and explicit presentation rebuild mechanics.

Therefore no candidate from `renderer-integration-comparison.md` is promoted:

- no generic renderer-loop adapter;
- no universal presentation entity synchronizer;
- no screen/world coordinate adapter;
- no renderer-specific Foundation input adapter;
- no `@drakeshard/phaser` package;
- no `@drakeshard/playcanvas` package;
- no shared Preact/UI package;
- no renderer-aware persistence package.

The reused app-local `ProbeUiBridge` and `createProbePersistence` remain intentionally local:
their genuinely shared mechanics are either application policy or already represented by narrower
Foundation contracts.

## Accepted v0.1 shared surface

The package manifests and subpath lists in this document are the accepted release candidate surface
for Sprint 07. Root-package catch-all exports remain absent to preserve explicit subsystem
boundaries.

The v0.1 runtime scope is:

- deterministic RNG;
- caller-driven fixed-step simulation timing;
- renderer-neutral physical input, action/context routing, deterministic tick handoff, and browser
  keyboard/pointer/lifecycle adapters;
- JSON settings storage, raw save storage, save envelope/version/migration/safe-commit mechanics,
  structured persistence outcomes, and browser localStorage/IndexedDB adapters.

The v0.1 testing scope is:

- `ManualClock` only.

Everything else demonstrated by the probes remains application/presentation code unless a future
admission decision proves cross-game ownership.

## Non-blocking future candidates

The following may be reconsidered only with new consumer evidence; none blocks v0.1:

- a narrower renderer integration helper if multiple independent applications later duplicate the
  same renderer-specific lifecycle problem;
- a shared decoder/error contract if multiple Foundation-owned boundaries require the same
  application-independent semantics;
- narrow observability hooks if a concrete consumer cannot obtain required evidence from existing
  return values;
- production performance budgets once representative game scenarios and target device classes
  exist;
- persistence cancellation if a current application demonstrates a real navigation/lifecycle need;
- additional testing utilities only when repeated deterministic test setup exists across packages or
  games.

Future candidates require a new admission decision. This review is not advance approval.

## Release conclusion

S07-08 finds the existing package split sufficient for v0.1 after removing the unconsumed
`FoundationVersion` alias.

The two required shared packages remain `@drakeshard/foundation` and
`@drakeshard/testing`; renderer-probe code remains private application evidence.

No new shared package or runtime abstraction is justified by the completed two-renderer pressure
test.
