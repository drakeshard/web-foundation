# Renderer-Probe Toy Domain

## Status

Sprint 05 Phaser probe complete; renderer-neutral fixture continues into Sprint 06 PlayCanvas validation.

## Location and ownership

The toy domain lives under `apps/renderer-probe/src/domain`. It is application/probe code, not a
new Foundation package or public shared-library surface.

The same module is intended to be consumed by the Phaser and PlayCanvas probes so renderer
differences can be tested against one authoritative domain model.

## Domain surface

The fixture deliberately owns only a small set of concepts:

- one bounded 2D world;
- one probe entity with current and previous simulation positions;
- one marker position;
- an integer simulation tick;
- fixture-local semantic commands for movement, marker placement, and deterministic marker
  randomization;
- fixture-local domain events describing accepted state changes;
- a plain-data snapshot/restore shape.

These names and semantics are fixture-local. They are not Foundation input actions, a generic
command bus, an entity framework, an RPG model, or a Tactical model.

## Authority and data flow

The intended integration flow is:

```text
browser input
  -> Foundation physical/action/context/tick input
  -> renderer-probe command translation
  -> ToyDomainCommand
  -> toy-domain fixed-step update
  -> authoritative ToyDomainState
  -> renderer/UI projection
```

Foundation `InputCommand` remains an input-delivery record. It is never used as the authoritative
semantic command type for this fixture.

Renderer objects and UI state may mirror `ToyDomainState`, but they do not own or mutate domain
truth directly. Renderer/screen-to-world coordinate conversion remains in presentation code.

## Determinism

A toy-domain update represents one simulation tick. Render-frame scheduling is external. Probe
orchestration uses Foundation `FixedStepDriver` to decide how many domain ticks execute.

Random behavior is explicit through the narrow `ToyDomainRandom` input. Probe tests use Foundation
`DeterministicRng`; the domain never calls `Math.random()` or wall-clock APIs.

Commands are processed in the supplied order. Snapshot/restore copies plain authoritative data.
Restore resets the prior-position interpolation baseline to the loaded current position rather than
persisting presentation history.

## Validation and observability

The fixture consumes no shared Decoder or diagnostics framework because Sprint 04 admitted neither.
Any untrusted save/input validation and debug presentation remains application-local.

## Extraction decision

S05-01 introduces no new Foundation public API and no new shared package. The fixture remains local
until later renderer-probe evidence demonstrates a stable abstraction that independently passes the
Foundation admission rule.

## Phaser probe integration

S05-02 adds Phaser only under `apps/renderer-probe/src/presentation`. The application creates the
authoritative `ToyDomainState` outside Phaser and passes a read-only state accessor into the
presentation layer. The Phaser Scene owns only disposable display objects derived from that state.

The scene can therefore be destroyed and recreated from current authoritative state without
recovering gameplay truth from Phaser objects. This is a concrete renderer integration, not a
generic renderer interface or a Foundation renderer adapter.

## Browser input bridge

S05-03 wires the accepted Foundation browser-input path into the probe:

```text
KeyboardEvent / PointerEvent
  -> Foundation browser adapters
  -> Foundation physical input
  -> action mapping + input contexts + tick handoff
  -> app-local translation
  -> ToyDomainCommand
```

The app-local input bridge translates gameplay-owned logical actions into fixture-local movement
commands. Pointer presses use Foundation `InputCommand` only to carry the normalized client
position alongside the action transition; the app then converts client coordinates to a toy-world
cell before constructing `set-marker`. Foundation `InputCommand` is therefore still an
input-delivery record, not the semantic domain-command model.

A higher-priority modal context consumes the same gameplay actions so they do not become domain
commands while the modal is active. Phaser's own input system is not used as domain authority.
S05-04 consumes the handoff only on fixed simulation ticks; browser event cadence therefore never
becomes simulation cadence.

## Fixed-step Phaser frame integration

S05-04 keeps Phaser responsible only for producing render-frame delta values. App-local simulation
orchestration passes each delta to Foundation `FixedStepDriver`, executes the returned 0..N toy
domain ticks, and passes the resulting authoritative state plus interpolation alpha back to the
Phaser presentation.

Toy-domain random commands use Foundation `DeterministicRng` with a fixed probe seed. The probe
does not call `Math.random()` for simulation behavior.

Interpolation reads `previousPosition` and `position` from authoritative state and applies alpha
only to Phaser display-object coordinates. It never writes interpolated values into domain state.

On document visibility suspension the application resets the fixed-step driver. On resume it resets
again and discards the first resumed frame delta, preventing hidden-tab elapsed time from entering
the simulation accumulator. Foundation still owns no `requestAnimationFrame` or Phaser lifecycle.

## Phaser presentation synchronization

S05-05 makes the Phaser scene a disposable projection of authoritative toy-domain state. An
app-local `projectToyPresentation` function derives presentation view descriptors from
`ToyDomainState` and interpolation alpha. The descriptors carry stable presentation ids plus the
probe domain id where relevant; they do not become domain objects.

The Phaser scene reconciles display objects by presentation id. Missing projected views create
display objects, existing views update presentation coordinates, and stale views are destroyed.
This lifecycle remains entirely inside the renderer layer. Domain updates never query Phaser
objects, and Phaser object identity never becomes gameplay identity.

Recreating presentation from a domain snapshot produces the same projected visible state. The
projection applies interpolation only to derived presentation coordinates and does not mutate
authoritative domain state. No generic renderer interface or Foundation renderer abstraction is
introduced.

## Preact UI bridge

S05-06 adds Preact only to the private renderer-probe app. The UI receives an explicit
`ProbeUiDomainView` projection containing copied, UI-facing values from authoritative
`ToyDomainState`. Signals store that derived projection plus transient UI state such as whether
the modal controls are active; they never store or replace the authoritative simulation state.

UI controls emit app-local `ProbeUiIntent` values. Application orchestration translates those
intentions into input-context changes or fixture-local `ToyDomainCommand` values that are consumed
on fixed simulation ticks. Preact components therefore do not mutate domain objects and do not
share mutable gameplay authority with Phaser.

The UI bridge remains app-local. S05-06 adds no Foundation UI API, signal contract, shared component
package, or renderer/UI coordination abstraction.

## Phaser persistence probe

S05-07 stores only a JSON copy of `ToyDomainSnapshot` through Foundation
`EnvelopeSaveService` and `IndexedDbSaveStorage`. Phaser scenes, display objects, Preact
signals, input contexts, and frame/interpolation state are not part of the gameplay save payload.

Loaded envelope payloads pass through app-local toy-domain validation before they can become
authoritative state. A successful load recreates `ProbeSimulation` from
`restoreToyDomain(snapshot)`; the existing Phaser state accessor then projects the recreated
authoritative state into disposable renderer objects on subsequent frames.

The probe includes an explicit corrupt-save fixture. Foundation reports the persistence failure
category, while application code keeps the current authoritative state unchanged. This validates
the admitted persistence contracts without introducing a shared decoder or renderer-aware save
format.

## App-owned Phaser debug observations

S05-08 keeps debug visualization entirely inside the renderer-probe application. The probe projects
existing `ProbeSimulationFrame` values into a small debug view, including fixed-step count,
interpolation alpha, clamped frame time, dropped-step count, and overrun state. These values come
directly from the already-admitted `FixedStepDriver` result rather than a new diagnostics service.

Persistence failures are projected from the existing `PersistenceResult` category and operation.
The view retains the last observed failure for inspection but does not become persistence authority.
Successful operations do not require a new timing hook, and S05-08 introduces no save/load timer,
counter registry, ring buffer, telemetry API, or Foundation debug UI.

The debug view is optional, app-local presentation code. Missing generic diagnostics APIs remain an
intentional non-defect under the Sprint 04 admission decision.

## Sprint 05 extraction result

The completed Phaser probe did not justify a shared Phaser adapter or new Foundation runtime API.
Renderer lifecycle, view synchronization, coordinate conversion, UI orchestration, validation,
debug visualization, and baseline timing remain application-local. Sprint 06 will pressure-test the
same domain and Foundation contracts through PlayCanvas before any cross-renderer extraction
decision.

## PlayCanvas probe integration

S06-01 adds PlayCanvas 2.22.6 only to the private renderer-probe application and reuses the same
renderer-neutral `ToyDomainState` defined for Sprint 05. The PlayCanvas entry is a separate page
inside the existing probe app; no shared renderer package or Foundation adapter is introduced.

An app-local `projectToyStateToPlayCanvas` function converts copied toy-domain coordinates into
plain three-dimensional presentation descriptors. PlayCanvas `Application`, `Entity`, camera,
light, render components, and tags remain presentation-owned and never enter domain contracts.

The probe uses a restricted orthographic tactical camera and creates disposable presentation
entities from the authoritative state accessor. Destroying and rebuilding those entities from the
same toy-domain snapshot produces equivalent projected presentation data without recovering state
from PlayCanvas entities or components. This establishes the S06-01 boundary; elevation semantics,
pointer/raycast interaction, and ongoing entity synchronization remain scoped to later Sprint 06
issues.

## PlayCanvas elevation mapping

S06-02 adds fixture-local elevation metadata to the renderer-neutral toy domain through
`getToyElevation(point)`. The profile has a low region, a deterministic transition between x=2
and x=4, and a high region. Elevation is derived from domain coordinates rather than stored in or
read back from PlayCanvas transforms, so the existing save snapshot shape and save-format version
do not change.

The PlayCanvas projection converts domain x/y into presentation x/z and adds domain-owned elevation
to presentation y. Probe movement across the transition interpolates both horizontal coordinates
and elevation using the render alpha, but interpolation exists only in the presentation projection
and never writes values into `ToyDomainState`.

This remains fixture metadata, not a Foundation terrain/elevation contract and not a Tactical
library API. PlayCanvas vectors, entities, components, and transforms remain outside the domain
surface.

## PlayCanvas tactical camera and pointer interaction

S06-03 keeps tactical camera control inside the PlayCanvas presentation. Right-button drag pans the
camera over the bounded toy world and wheel input changes orthographic height within app-local
limits. These controls may use browser event details because they alter only disposable
presentation state; no camera value is added to Foundation input or toy-domain contracts.

Primary pointer selection still enters through the admitted Foundation browser pointer adapter,
action mapping, and explicit input-context ownership. The PlayCanvas selection bridge emits a
plain app-local selection request only when the gameplay context owns the primary action. It does
not deliver raw DOM events or `pc.Entity` objects.

Presentation code converts the normalized client position with PlayCanvas
`CameraComponent.screenToWorld` into a world-space ray. The toy scenario then reports one of three
explicit results: a domain-elevation cell intersection, occlusion by the probe presentation volume,
or a miss. Only an intersection is translated to the fixture-local `set-marker` command/intention.

S06-03 deliberately does not apply that intention to authoritative simulation state. Doing so
asynchronously from the pointer event would bypass the Sprint 02 tick-handoff contract. A later
simulation integration must enqueue plain intention data and consume it only on executable fixed
ticks. Likewise, incremental `pc.Entity` create/update/destroy synchronization remains owned by
S06-04. No Foundation API, renderer abstraction, terrain API, or save-format change is introduced.


## PlayCanvas presentation synchronization

S06-04 makes the PlayCanvas entity tree an incrementally synchronized projection of authoritative
toy-domain state. The presentation layer keeps a map keyed by stable presentation view ids; the
probe entity view id embeds the toy-domain entity id and is additionally tagged with that domain id.
Missing projected views create `pc.Entity` objects, existing views update transforms, and stale
views are destroyed.

The synchronization plan is derived only from plain `PlayCanvasPresentationView` descriptors.
PlayCanvas entities/components are never passed into the toy domain, and synchronization does not
read renderer transforms or components back into authoritative gameplay state. Interpolation
continues to modify only projected presentation coordinates.

Destroying the complete PlayCanvas presentation tree clears the renderer-owned map. Rebuilding from
the same authoritative domain snapshot recreates equivalent projected views, so PlayCanvas entity
identity remains disposable rather than gameplay identity. This mirrors the ownership boundary
already validated by the Phaser probe without introducing a shared renderer interface.

S06-04 adds no Foundation API, generic entity framework, renderer adapter, domain lifecycle API, or
save-format change. The synchronization planner and entity lifecycle remain private
renderer-probe application code.
