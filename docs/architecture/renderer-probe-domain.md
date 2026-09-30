# Renderer-Probe Toy Domain

## Status

S05-01 integration fixture for Phase 3 renderer probes.

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
