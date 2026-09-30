# Phaser Probe Performance Baseline

## Status

Sprint 05 / S05-09 evidence for the private Phaser renderer probe.

## Scenario

The observation uses the existing renderer-probe application in headless Chromium CI with:

- the 8×8 renderer-neutral toy domain;
- a 320×320 Phaser Canvas;
- the app-local Preact UI and debug view active;
- no synthetic gameplay input during the sampling window;
- 120 consecutive `requestAnimationFrame` samples after the probe reports ready.

The browser test records frame-to-frame callback delta plus app-local wall-clock duration around the
single `simulation.advanceFrame` call. It also records total fixed simulation steps, dropped steps,
and overrun-frame count from the existing application-visible `FixedStepDriver` result.

This is baseline evidence only. It is not a production target, service-level objective, or global
Foundation performance budget.

## Environment

The canonical measurement is produced by the repository's GitHub Actions Chromium job using the
pinned Node, pnpm, Playwright, Phaser, Preact, and Foundation versions in the same commit. The test
logs the browser user agent, viewport, device-pixel ratio, and canvas size with every observation.

## Initial observation

The first green S05-09 PR CI observation is recorded here before merge.

- CI run: pending
- frame delta mean / p95 / max: pending
- simulation advance duration mean / p95 / max: pending
- total fixed simulation steps: pending
- dropped steps: pending
- overrun frames: pending

## Interpretation boundary

The numbers characterize one small CI scenario and are expected to vary with hosted-runner load.
They are useful for regression context and renderer comparison, not for declaring a universal frame
budget. Any later budget requires a concrete production scenario and evidence appropriate to that
consumer.
