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
