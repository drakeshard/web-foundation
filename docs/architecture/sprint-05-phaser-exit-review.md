# Sprint 05 — Phaser 2D Probe Exit Review

## Status

Sprint 05 / S05-10 exit review for Phase 3 — Renderer Probes.

All Sprint 05 implementation issues S05-01 through S05-09 (#55–#63) are complete with no approved
exceptions. Their pull requests passed the required Quality and Dependency Review gates, and the
post-merge `main` Quality runs are green.

## What the probe validated

The Phaser probe exercised the admitted Web Foundation surface through one real browser application:

- browser keyboard/pointer normalization, action mapping, input contexts, and deterministic tick
  handoff;
- fixed-step simulation driven by renderer frame deltas without Foundation owning the render loop;
- deterministic RNG used by fixture-local domain commands;
- renderer-owned disposable presentation objects reconstructed from authoritative domain state;
- an app-local Preact/signals UI projection that never becomes simulation authority;
- SaveEnvelope/EnvelopeSaveService plus IndexedDB save, reload, validation, and restore;
- application-owned debug presentation of existing frame and persistence results;
- Chromium smoke/integration coverage and a reproducible baseline performance observation.

The renderer-neutral toy domain remained free of Phaser, Preact, DOM, IndexedDB, and Foundation
browser-adapter types.

## Extraction findings

### Intentionally app-local

The following remain app/probe code:

- Phaser Scene/Game/GameObject creation and lifecycle;
- Phaser object reconciliation and renderer-local view identity;
- canvas/client-to-toy-world coordinate conversion;
- browser-input-to-`ToyDomainCommand` translation;
- Preact components, signals, and UI intentions;
- toy-domain payload validation;
- persistence slot/game/content-version choices;
- debug view projection and display;
- app-local simulation wall-clock timing used only for the S05-09 observation.

These responsibilities either encode fixture/application policy or have only one concrete renderer
consumer. Extracting them now would violate the Foundation admission rule.

### Reusable contracts already owned by Foundation

Sprint 05 reused existing Foundation contracts without needing renderer-specific changes:

- `FixedStepDriver`;
- `DeterministicRng`;
- normalized input/action/context/tick handoff contracts and browser adapters;
- `SaveEnvelope`, `EnvelopeSaveService`, migration contracts, persistence result categories, and
  IndexedDB storage.

No new Foundation public runtime API was required by the Phaser consumer.

### Candidates to pressure-test in Sprint 06

Some app-local patterns are worth comparing with the PlayCanvas probe before any extraction decision:

- deriving disposable renderer presentation from authoritative toy-domain state;
- stable presentation identity mapped from domain identity;
- renderer-independent UI intentions feeding application orchestration;
- renderer-local pointer/surface-to-world conversion boundaries;
- reuse of the same toy-domain snapshot and persistence flow.

These are comparison targets, not approved packages or interfaces. A second renderer must demonstrate
stable repeated semantics and independent ownership value before extraction.

## Phaser package decision

Do **not** create `@drakeshard/phaser` after Sprint 05.

There is only one Phaser consumer, and the observed integration code is either Phaser-specific or
application orchestration. No repeated stable renderer-adapter contract currently satisfies the
shared-code admission criteria.

## Foundation API pain points

No Foundation API pain point from Sprint 05 warrants a new issue before the PlayCanvas probe.

The probe's missing pieces were deliberately application-owned: semantic domain commands, UI state,
payload validation, debug visualization, renderer lifecycle, coordinate conversion, and baseline
timing. Existing Foundation outputs were sufficient for the integration.

If Sprint 06 exposes a cross-renderer deficiency in an admitted Foundation responsibility, record it
as a separate evidence-backed issue rather than expanding Foundation inside the PlayCanvas task.

## Performance evidence

S05-09 records a reproducible Chromium baseline in
`docs/architecture/phaser-probe-performance.md`. The first committed observation reported:

- 120 sampled frames;
- frame delta mean/p95/max: 16.644 / 16.7 / 16.8 ms;
- simulation advance mean/p95/max: 0.012 / 0.1 / 0.1 ms;
- 40 fixed simulation steps;
- 0 dropped steps;
- 0 overrun frames.

This remains scenario evidence, not a production performance budget.

## Exit decision

Sprint 05 — Phaser 2D Probe is complete once this review merges and post-merge `main` Quality is
green.

Phase 3 continues with Sprint 06 — PlayCanvas 3D Probe. The exact next task is #65 — S06-01 Create
minimal PlayCanvas probe, reusing the same renderer-neutral toy domain while keeping PlayCanvas
presentation objects non-authoritative.
