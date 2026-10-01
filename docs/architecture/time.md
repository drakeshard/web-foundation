# Time and Fixed-Step Contract

## Status

Accepted for Web Foundation v0.1.

This document defines the contract implemented by S01-02. It does not implement the driver.

## Time unit

Foundation time durations use **milliseconds represented as JavaScript `number` values**.

- Duration values use an `Ms` suffix in public names.
- Fractional milliseconds are valid. A 60 Hz fixed step may therefore use `1000 / 60`.
- Absolute wall-clock timestamps are not simulation time.
- Deterministic simulation advances by discrete fixed ticks. Tick count is the authoritative measure of simulation progression; wall-clock time must not be read from deterministic game logic.

A monotonic clock abstraction, when required by boundary code or tests, returns milliseconds. The fixed-step driver itself does not read a clock.

## FixedStepDriver ownership

The caller owns the render/browser loop.

Foundation MUST NOT:

- call or own `requestAnimationFrame`;
- subscribe to document visibility on behalf of the application;
- read `performance.now()` from inside `FixedStepDriver`;
- advance simulation outside an explicit caller invocation.

The caller supplies elapsed frame duration to the driver and executes the number of fixed simulation ticks returned by the driver.

Conceptually:

```text
renderer/browser frame
        |
        | elapsedMs
        v
FixedStepDriver.advance(elapsedMs)
        |
        +--> 0..N simulation ticks
        |
        +--> interpolation alpha
        v
presentation
```

## Configuration

The v0.1 driver is configured explicitly. Foundation does not provide global gameplay defaults.

```ts
interface FixedStepConfig {
  stepMs: number;
  maxFrameDeltaMs: number;
  maxStepsPerFrame: number;
}
```

Required invariants:

- `stepMs` MUST be finite and greater than zero.
- `maxFrameDeltaMs` MUST be finite and greater than zero.
- `maxStepsPerFrame` MUST be an integer greater than or equal to one.
- Invalid configuration MUST fail immediately rather than being silently normalized.

Games/probes choose values based on their simulation requirements. Foundation does not define a universal tick rate or catch-up budget.

## Advance contract

`advance(frameDeltaMs)` accepts one elapsed duration supplied by the caller.

Input rules:

- `frameDeltaMs` MUST be finite and greater than or equal to zero.
- Negative, `NaN`, or infinite input is invalid and MUST fail rather than being silently accepted.
- Zero elapsed time is valid and executes no new steps.

The driver:

1. clamps the supplied delta to `maxFrameDeltaMs`;
2. adds the accepted delta to its internal accumulator;
3. determines the number of complete fixed steps available;
4. returns at most `maxStepsPerFrame` executable steps;
5. if additional complete steps remain after that limit, discards those complete backlog steps to prevent a catch-up spiral;
6. retains only the sub-step remainder for interpolation.

The driver does not execute game/domain code itself.

## Advance result

The v0.1 result contract is:

```ts
interface FixedStepAdvanceResult {
  steps: number;
  alpha: number;
  clampedMs: number;
  droppedSteps: number;
  overrun: boolean;
}
```

Semantics:

- `steps` is the number of fixed simulation ticks the caller MUST execute for this advance.
- `alpha` is the remaining accumulator fraction divided by `stepMs` after catch-up/drop handling.
- `alpha` MUST be in the range `0 <= alpha < 1`.
- `clampedMs` is the portion of the caller-supplied frame delta rejected by `maxFrameDeltaMs`.
- `droppedSteps` is the number of complete fixed steps discarded after `maxStepsPerFrame` was reached.
- `overrun` is `true` when `droppedSteps > 0`.

`clampedMs` and `droppedSteps` are separate because they describe different overload conditions: input-delta clamping versus catch-up-budget exhaustion.

## Simulation step duration

Every executed simulation tick represents exactly `stepMs` of configured simulation duration.

The driver does not maintain authoritative game tick numbers or absolute simulation timestamps. The game/domain may maintain its own integer tick index when needed.

Deterministic systems SHOULD prefer tick-based progression where practical. If a subsystem uses duration values, it must use the configured fixed step and must not query wall-clock time during deterministic updates.

## Pause, resume, reset, and visibility

v0.1 does not add a second hidden pause state inside `FixedStepDriver`.

- To pause simulation, the application stops consuming frame delta for simulation.
- Before resuming after an intentional pause, tab suspension, or visibility gap, the application MUST reset its elapsed-time baseline and call `driver.reset()`.
- `reset()` clears the driver's accumulated partial step.
- After reset, interpolation alpha is zero until new elapsed time is supplied.
- The application MUST NOT feed the full paused/background duration into the driver on resume.

This rule prevents a visibility/background gap from creating a large catch-up burst.

## Interpolation

Interpolation alpha is presentation data only.

Presentation may interpolate between authoritative simulation states using `alpha`, but:

- interpolation MUST NOT mutate authoritative domain state;
- interpolation MUST NOT affect the number or result of fixed simulation ticks;
- renderer-specific transforms remain presentation-local.

## Overrun behavior

Reaching `maxStepsPerFrame` is a recoverable runtime condition, not an exception.

When complete backlog steps are discarded:

- the driver reports `droppedSteps`;
- `overrun` is true;
- the remaining accumulator is kept below one full step;
- the caller may feed the result into diagnostics.

The driver MUST NOT log, render warnings, or own diagnostic UI.

## Determinism boundary

`FixedStepDriver` guarantees deterministic accumulator/step-count behavior for an identical configuration, reset history, and ordered sequence of supplied frame deltas.

It does not guarantee equal tick counts for different frame-delta sequences when clamping or step dropping occurs.

The deterministic simulation contract is instead:

```text
initial state
+ deterministic seed
+ ordered simulation inputs
+ fixed tick count
= identical final domain state
```

## Deferred decisions

The following are deliberately not part of S01-01:

- a universal tick rate;
- renderer-specific frame adapters;
- browser lifecycle listeners owned by Foundation;
- variable-step simulation;
- networking/rollback timing;
- time scaling or slow motion;
- production performance budgets.

Those require a current consumer or later roadmap issue.


## S07-05 lifecycle pressure evidence

The Phaser renderer probe continues to own browser visibility handling at application composition
level. Hidden state pauses the probe simulation; visible state resumes by resetting the fixed-step
baseline and discarding the first post-resume renderer delta. The existing focused simulation test
locks this behavior so a background gap cannot be replayed as catch-up work.

Cross-renderer browser coverage additionally drives the real visibility-reset path through the shared
BrowserInputLifecycle in both probes. Held keyboard state is invalidated before resumed/tick-aligned
domain delivery, while renderer teardown/reinitialization preserves renderer-neutral authoritative
ToyDomain state. Foundation still does not own requestAnimationFrame or application visibility
subscription.
