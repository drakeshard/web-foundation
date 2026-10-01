# Sprint 06 — PlayCanvas 3D Probe Exit Review

## Status

Sprint 06 / S06-10 exit review for Phase 3 — Renderer Probes.

All Sprint 06 implementation and comparison issues S06-01 through S06-09 (#65–#73) are complete
with no approved exceptions. Their pull requests passed the required Quality and Dependency Review
gates, and their post-merge `main` Quality runs are green.

## Completed work

| Issue | Result |
| --- | --- |
| #65 / S06-01 | PlayCanvas 2.22.6 probe boots from the shared renderer-neutral toy domain with an orthographic tactical camera and recreation coverage. |
| #66 / S06-02 | Domain-owned elevation metadata maps to 3D presentation coordinates with presentation-only interpolation and unchanged save format. |
| #67 / S06-03 | Camera pan/zoom and pointer selection use Foundation browser input boundaries while PlayCanvas ray/elevation/occlusion conversion stays renderer-local. |
| #68 / S06-04 | Domain-derived views incrementally create/update/destroy disposable PlayCanvas entities without making `pc.Entity` authoritative. |
| #69 / S06-05 | Low/transition/high elevation is visible through deterministic domain movement without adding terrain gameplay rules. |
| #70 / S06-06 | The existing app-local Preact UI bridge is reused with domain-derived state and transient UI signals. |
| #71 / S06-07 | Existing ToyDomainSnapshot / SaveEnvelope / IndexedDB persistence restores domain state after reload and rebuilds PlayCanvas presentation. |
| #72 / S06-08 | Chromium/WebGL2 smoke and scoped 8x8 / 70-entity performance observations are recorded without production budget claims. |
| #73 / S06-09 | Phaser/PlayCanvas semantics are compared against the #119 admission guardrail; no renderer adapter package or new Foundation runtime API is justified. |

## Exit criteria

### S06-01 through S06-09 complete

Satisfied. Issues #65 through #73 are closed with merged implementation/documentation evidence and
required PR checks green.

### Same domain, input, and persistence boundaries as the Phaser probe

Satisfied at the intended contract level:

- both probes use the same renderer-neutral `ToyDomainState` and fixture-local commands;
- both reuse Foundation browser input normalization/action/context contracts;
- both keep renderer/world coordinate meaning outside Foundation and deterministic domain types;
- both use the same app-local `ProbeUiBridge`;
- both use the same app-local `createProbePersistence` integration over Foundation
  SaveEnvelope/EnvelopeSaveService and IndexedDB contracts;
- both reconstruct disposable presentation from authoritative domain state after creation or restore.

The concrete renderer orchestration is intentionally not identical. Phaser currently binds renderer
frame deltas to the fixed-step simulation; PlayCanvas currently demonstrates domain advancement
through explicit app-level commands and keeps pointer selection as a plain intention rather than
asynchronous simulation mutation.

### Renderer types remain outside domain and Foundation contracts

Satisfied. PlayCanvas `Application`, `Entity`, camera, render components, transforms, materials,
and ray-intersection mechanics remain presentation/application code. Phaser Game/Scene/GameObject
types likewise remain local to presentation. No renderer type was introduced into the toy-domain or
Foundation public contracts.

### Browser smoke and quality gates green

Satisfied. The PlayCanvas path is covered by Chromium CI for boot, entity recreation, elevation,
camera/pointer behavior, UI bridge reuse, persistence restore, and WebGL2/performance observation.

Recent post-merge `main` evidence:

- #66: run 36758211686;
- #67: run 36761123354;
- #68: run 36762257171;
- #69: run 36763084955;
- #70: run 36806520200;
- #71: run 36807045702;
- #72: run 36807708456;
- #73: run 36808167323.

S06-01 was also merged with post-merge `main` Quality green.

### Extraction comparison recorded

Satisfied in
[Phaser and PlayCanvas Integration Semantics Comparison](./renderer-integration-comparison.md).

The common evidence is strongest as architecture constraints: renderer-neutral gameplay authority,
disposable domain-derived presentation, normalized browser input boundaries, app-local UI
projection, and domain-only persistence. Frame ownership, renderer object lifecycle, coordinate
conversion, 2D/3D presentation mechanics, and restore edges differ enough that a shared renderer
adapter would currently be broader and more expensive than the concrete integrations.

No `@drakeshard/phaser`, `@drakeshard/playcanvas`, generic renderer adapter, universal scene
graph, renderer UI package, or renderer-aware save contract is authorized.

## Performance evidence

S06-08 records the initial PlayCanvas Chromium observation in
[PlayCanvas Probe Performance Observation](./playcanvas-probe-performance.md).

PR run 36807437534 observed the defined 8x8 / 70-application-entity CI scenario:

- 120 frame samples: mean 61.267 ms, p95 100 ms, max 100.1 ms;
- 32 synchronous elevation input/domain/presentation interactions: mean 0.041 ms, p95 0.2 ms,
  max 0.3 ms;
- WebGL2 was available and reported the generic CI renderer `WebKit WebGL`.

These numbers remain environment/scenario observations, not production performance budgets. Sprint
07 may establish probe-scenario budgets from direct cross-renderer pressure-test evidence; production
game budgets still require production targets and representative hardware.

## Risks carried into Sprint 07

### Deterministic cross-renderer equivalence

The probes share a toy domain but have not yet run one canonical initial-state/seed/ordered-command
scenario through both stacks as a direct apples-to-apples assertion. Sprint 07 must perform that
pressure test rather than infer equivalence from separate probe tests.

### Frame integration asymmetry

Phaser currently drives the fixed-step simulation from renderer frame deltas while PlayCanvas does
not yet own an equivalent fixed-step loop. Sprint 07 should test renderer-independent simulation and
replay behavior without forcing an artificial shared renderer-loop abstraction.

### Lifecycle pressure

Save/reload and presentation recreation have been exercised independently, but cross-renderer
visibility, lifecycle reset, reload, and recreation behavior still need a common pressure test.

### Browser and performance scope

Current real-browser coverage is Chromium-focused. S07-06 should expand coverage only when the
quality strategy and current compatibility risks justify it. S07-07 may establish measured budgets
for the defined probe scenarios; the S05/S06 observations alone are not global production budgets.

### Premature abstraction

The two-renderer comparison reduced rather than increased the case for renderer adapter extraction.
The #119 admission rule remains active during Sprint 07. Repeated semantics must still show a
specific duplicated maintenance problem and a narrower shared contract before extraction.

## Sprint 07 authorization

Sprint 06 exit criteria are satisfied.

Sprint 07 — Cross-Renderer Vertical Slice and Pressure Test is authorized once this exit review
merges and post-merge `main` Quality is green.

The exact continuation is #75 — S07-01 Run the same toy-domain scenario through both renderer
probes. That issue must use one canonical scenario definition with identical initial state,
deterministic seed, ordered commands, and tick count; renderer-only setup must remain outside the
scenario data.
