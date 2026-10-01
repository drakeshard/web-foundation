# Phaser and PlayCanvas Integration Semantics Comparison

## Status

Sprint 06 / S06-09 evidence-based comparison after the completed Phaser and PlayCanvas probes.

This review applies the Foundation admission guardrail from #119. Repeated architecture principles are
not automatically shared APIs: extraction still requires materially matching semantics, a narrower
shared contract, and lower maintenance cost than keeping renderer/application orchestration local.

## Summary decision

Do not create a shared renderer adapter package after the two probes.

The probes validate the same authority boundaries:

- authoritative gameplay state is renderer-neutral plain TypeScript;
- renderers consume domain state and never become gameplay truth;
- Foundation owns browser-neutral infrastructure, not renderer lifecycle or game commands;
- renderer/world coordinate conversion stays outside deterministic domain contracts;
- UI reads domain-derived projections and emits intentions;
- persistence saves domain snapshots and recreates presentation from restored gameplay state.

Those common semantics are architecture constraints, not a sufficiently narrow renderer API. Phaser
and PlayCanvas differ materially in frame ownership, presentation object lifecycle, input-to-world
conversion, and restoration mechanics. A common adapter today would need renderer-specific optional
hooks or a broader lifecycle abstraction than either implementation actually needs.

## Frame-to-simulation integration

### Phaser

Phaser owns the render frame callback. Its Scene `update` receives the renderer frame delta and calls
application-owned `advanceFrame(frameDeltaMs)`. The application delegates to the existing fixed-step
simulation driver, then Phaser renders authoritative state plus interpolation alpha.

This path exercises Foundation's caller-driven fixed-step contract directly while keeping Phaser out
of simulation ownership.

### PlayCanvas

The current PlayCanvas probe does not run the toy domain from PlayCanvas's frame callback. Its camera
and rendering loop are renderer-owned, while demonstrated domain changes are explicit app-level
commands such as the elevation scenario. Pointer selection produces a plain domain intention and is
deliberately not applied asynchronously, preserving the tick-handoff boundary for any later real
simulation integration.

### Comparison

The stable semantic is only that the renderer does not own deterministic simulation. The concrete
integration shapes do not match:

- Phaser currently supplies frame deltas to a fixed-step simulation and consumes interpolation alpha;
- PlayCanvas currently renders continuously but domain advancement is app-orchestrated and does not
  yet consume renderer frame deltas;
- forcing both behind one frame adapter would either expose Phaser-only fixed-step/interpolation
  concepts or invent unused PlayCanvas hooks.

**Decision:** no shared frame/renderer-loop adapter.

## Presentation entity synchronization

### Phaser

The Phaser Scene projects domain state to plain `ToyPresentationView` records, keeps a map of stable
view ids to `Phaser.GameObjects.Shape`, destroys stale shapes, creates missing shapes, and updates
positions each render frame.

### PlayCanvas

PlayCanvas projects domain state to plain 3D presentation views, plans create/update/destroy
operations, and synchronizes a map of stable view ids to disposable `pc.Entity` objects. It also
owns terrain entities, elevation projection, camera state, materials/components, and explicit full
presentation rebuild.

### Comparison

Both renderers validate the same rule: stable domain-derived presentation identity can drive
disposable renderer objects without making renderer identity authoritative.

The lifecycle mechanics are still materially renderer-specific. Phaser's shape update loop and
PlayCanvas's entity/component hierarchy, terrain, rebuild behavior, interpolation coordinates, and
3D transforms do not share a narrower useful implementation than the plain-data projection principle.

**Decision:** keep presentation synchronization renderer-local. Do not introduce a universal scene
graph, entity model, or renderer entity adapter.

## Input handoff and coordinate conversion

### Shared Foundation use

Both probes reuse Foundation browser input primitives for sequencing, action mapping, context
routing, lifecycle handling, and browser pointer normalization. DOM events and renderer coordinate
types do not enter domain contracts.

### Phaser

The Phaser probe uses keyboard and pointer adapters plus `TickInputHandoff`. Gameplay actions are
consumed only on simulation ticks. Pointer client coordinates are converted through an app-local
canvas/toy-world conversion before becoming a fixture-local `ToyDomainCommand`.

### PlayCanvas

The PlayCanvas probe uses the same browser pointer normalization/action/context layers, but selection
routing currently produces an immediate plain selection request. Renderer-local code performs
screen-to-world camera-ray conversion, domain-elevation intersection, probe-occlusion handling, and
miss classification. Successful intersections become plain `set-marker` intentions and are not
applied asynchronously to simulation state.

### Comparison

The reusable input infrastructure is already in Foundation. The renderer-specific boundary begins
where normalized screen input must acquire world meaning:

- Phaser uses a simple 2D canvas-to-grid mapping;
- PlayCanvas uses camera projection, a 3D ray, elevation-aware intersection, and renderer occlusion;
- the two domain-command handoff paths also differ because only the Phaser probe currently owns a
  complete tick-consumption loop.

**Decision:** keep renderer/world coordinate conversion and app command translation local. No new
Foundation input API or renderer input adapter is justified.

## UI bridge comparison

Both probes now mount the exact same app-local `ProbeUiBridge` and `ProbeUiDomainView`:

- UI state is copied from authoritative `ToyDomainState`;
- Preact signals hold derived/transient UI state only;
- modal intent changes input contexts through application orchestration;
- domain-changing UI actions are represented as plain intentions/commands rather than UI-owned state.

This is genuine semantic and code reuse, but it already occurs inside the single renderer-probe
application. The bridge is Preact-specific application UI, not browser-game infrastructure.

**Decision:** keep the reused bridge app-local. Do not create a Foundation UI package or generic
renderer/UI bridge.

## Persistence comparison

Both probes reuse the exact same app-local `createProbePersistence` module and the existing
Foundation storage contracts:

- `ToyDomainSnapshot` is the saved payload;
- `SaveEnvelope` / `EnvelopeSaveService` own generic envelope/version mechanics;
- IndexedDB is accessed through the Foundation browser storage adapter;
- renderer objects are never serialized.

Restore orchestration differs only at the renderer edge:

- Phaser recreates the application simulation from restored domain state and its Scene subsequently
  projects that state;
- PlayCanvas restores domain state, republishes UI projection, and explicitly rebuilds disposable
  renderer entities.

The generic reusable persistence mechanics are already owned by Foundation. Game/application slot,
payload, content-version, decode, and restore policy remain local.

**Decision:** no new persistence abstraction or renderer-aware save contract.

## Admission review of extraction candidates

| Candidate | Semantics materially match? | Shared maintenance benefit? | Decision |
| --- | --- | --- | --- |
| Renderer frame adapter | No | No; would add optional/generalized lifecycle concepts | Keep local |
| Presentation entity synchronizer | Principle only | No; 2D shapes vs 3D entity/component hierarchy diverge | Keep local |
| Screen/world coordinate adapter | No | No; linear 2D mapping vs camera/elevation/occlusion ray logic | Keep local |
| Renderer-specific input adapter | No new need | Existing Foundation input contracts already cover the shared portion | No extraction |
| `ProbeUiBridge` | Yes | Already reused within one app; package extraction adds ownership/dependency cost | Keep app-local |
| `createProbePersistence` | Yes | Already reused within one app; generic mechanics already live in Foundation storage | Keep app-local |
| Domain-to-presentation authority rule | Yes | High conceptual reuse, but it is a rule rather than runtime code | Document as architecture constraint |

No candidate clears all #119 admission criteria for a new shared runtime surface.

## Renderer-specific pieces that stay local

Phaser-specific local responsibilities:

- `Phaser.Game` / Scene lifecycle;
- Phaser shape construction and per-frame reconciliation;
- Phaser canvas scaling and toy-world conversion;
- binding renderer frame deltas to the probe's fixed-step simulation.

PlayCanvas-specific local responsibilities:

- `Application`, `pc.Entity`, camera, light, render components, and terrain hierarchy;
- orthographic camera pan/zoom;
- 3D position/elevation projection and interpolation;
- screen-ray, elevation intersection, occlusion, and miss behavior;
- explicit renderer presentation rebuild after persistence restore.

Application-local responsibilities shared in concept or code:

- toy-domain commands and fixture policy;
- UI components/signals/intent orchestration;
- persistence slot/game/content-version policy;
- performance/debug presentation and scenario-specific measurements.

## Foundation outcome

S05 and S06 required no new renderer-specific Foundation runtime API. The existing Foundation
surfaces for time/fixed-step driving, deterministic RNG, browser input, and persistence were
sufficient.

The two-renderer evidence strengthens the current boundary rather than motivating a renderer
framework: Foundation remains renderer-neutral infrastructure, and renderer integrations remain
application-local until a future concrete consumer demonstrates a narrower repeated contract with
lower maintenance cost.

Any future extraction proposal must be a separate admission decision with a current consumer and
specific duplicated maintenance problem. It must not treat this comparison as blanket approval for
`@drakeshard/phaser`, `@drakeshard/playcanvas`, or a generic renderer adapter package.
