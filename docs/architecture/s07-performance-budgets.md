# S07 Performance Baselines and Budgets

## Status

Sprint 07 / S07-07 v0.1 probe performance evidence.

These budgets apply only to the current renderer-probe scenarios. They are not production-game
guarantees, hardware support targets, or universal Foundation limits.

## Measurement scenarios

### 2D / Phaser

The 2D baseline is the existing Phaser probe:

- 8 x 8 renderer-neutral ToyDomain;
- two projected presentation views: probe and marker;
- 320 x 320 Phaser Canvas;
- app-local Preact UI and debug view enabled;
- 120 consecutive requestAnimationFrame samples;
- Foundation FixedStepDriver configured at 50 ms per simulation step, 250 ms maximum accepted frame
  delta, and at most 5 simulation steps per rendered frame.

The browser test records frame delta, app-local wall-clock duration around
`simulation.advanceFrame`, simulation steps per frame, dropped steps, and overrun frames.

### 2.5D / PlayCanvas

The 2.5D baseline is the existing tactical-camera PlayCanvas probe:

- 8 x 8 ToyDomain terrain;
- 64 presentation-owned terrain cells;
- two dynamic projected views: probe and marker;
- 70 app-created PlayCanvas entities in the measured scene, excluding the engine-owned root;
- 640 x 480 canvas with WebGL2;
- 32 elevation input -> domain -> presentation interactions;
- 120 consecutive requestAnimationFrame samples.

The browser test records frame delta, synchronous interaction duration, scene size, WebGL context
information, and presentation-object churn across the 32 interactions.

## Initial measured observations

The first Phaser S05-09 green PR observation (CI run 36746309530) recorded:

- frame delta mean / p95 / max: 16.644 ms / 16.7 ms / 16.8 ms;
- simulation advance mean / p95 / max: 0.012 ms / 0.1 ms / 0.1 ms;
- 40 simulation steps across 120 sampled frames;
- zero dropped steps;
- zero overrun frames.

The first PlayCanvas S06-08 green PR observation (CI run 36807437534) recorded:

- frame delta mean / p95 / max: 61.267 ms / 100 ms / 100.1 ms;
- interaction duration mean / p95 / max: 0.041 ms / 0.2 ms / 0.3 ms;
- 64 terrain cells, two projected views, and 70 app-created entities.

The PlayCanvas frame-time result reflects headless hosted Linux CI and a generic software-facing
WebGL renderer string. It is therefore useful as descriptive context, not as a production rendering
target.

## v0.1 regression budgets

### Simulation safety budget

For the 2D probe's 120-frame baseline window:

- dropped simulation steps must remain 0;
- overrun frames must remain 0;
- simulation steps per rendered frame must never exceed the configured FixedStepDriver cap of 5.

These are stable correctness/performance safety signals and are now enforced by the browser test.
Simulation-duration timing remains logged, but there is no hard millisecond threshold because hosted
runner scheduling noise is larger than the measured ToyDomain work and one tiny fixture is not a
representative production simulation.

### Presentation allocation/churn budget

For the 2.5D probe's 32 steady elevation interactions:

- the measured scene remains 64 terrain cells + two projected views + four fixed scene entities;
- steady presentation synchronization must create 0 replacement entities and destroy 0 entities.

This gives a repeatable allocation-pressure signal without adding Foundation counters, telemetry, or
a generic diagnostics layer. Renderer object identity remains app-local and disposable.

### Renderer frame-time budget

No hard frame-time threshold is admitted for v0.1 hosted CI.

The Phaser and PlayCanvas frame distributions continue to be logged for regression context, but the
two initial observations demonstrate that headless CI cadence differs materially by renderer and
environment. A numerical frame budget would currently encode hosted-runner behavior rather than a
validated consumer requirement.

A production renderer-frame budget must come from a representative game scenario and target-device
class.

## Memory and allocation observations

The current CI environment does not provide a portable, reliable browser heap/allocation metric that
is comparable across runs. Non-standard Chromium heap fields and forced-GC-based measurements are
not used as release gates.

Instead, v0.1 records the stable application-owned scene/object counts that can be measured
deterministically and enforces zero PlayCanvas presentation-entity churn during the steady
interaction scenario. If a production consumer establishes a representative memory requirement,
heap/allocation profiling remains application-local unless a separate Foundation ownership case is
demonstrated.

## Interpretation boundary

These budgets pressure-test the existing Foundation outputs and probe integration only. They do not
authorize new Foundation timing, telemetry, counters, renderer adapters, pooling systems, or
production observability APIs.

Timing measurements use browser/app-local `performance.now()` only around probe work. Foundation
continues to expose FixedStepDriver results directly and does not own browser performance timing.
