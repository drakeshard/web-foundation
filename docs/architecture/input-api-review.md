# Input API and Boundary Review — Sprint 02

## Status

Accepted S02-09 review for the v0.1 browser input boundary.

## Public module split

The review identified one blocking public-surface issue: browser listener/lifecycle/adapter APIs were exported from the same `@drakeshard/foundation/input` barrel as renderer-neutral deterministic input contracts.

The accepted v0.1 split is:

### `@drakeshard/foundation/input`

Owns normalized and deterministic input data/behavior:

- physical input record contracts and `InputSequence`;
- logical action identifiers and action binding resolution;
- generic input contexts and ownership resolution;
- tick snapshots, contextual action transitions, and ordered commands;
- `MonotonicInputSequence`.

This surface contains no browser event-target abstraction, browser lifecycle coordinator, or DOM adapter class.

### `@drakeshard/foundation/input/browser`

Owns the browser boundary only:

- `BrowserInputEventTarget` and `BrowserVisibilityTarget`;
- `BrowserInputLifecycle`;
- `KeyboardBrowserAdapter`;
- `PointerBrowserAdapter`;
- their browser-specific option/listener types.

Browser adapters may depend inward on normalized `/input` contracts. Deterministic input code must not depend outward on the browser barrel.

## Renderer and UI boundary audit

The Foundation source contains no Phaser, PlayCanvas, Preact, renderer-scene, or screen-to-world conversion dependency. The repository architecture gate rejects Phaser, PlayCanvas, Preact, and `@preact/signals` imports from Foundation/domain code and rejects presentation/UI relative paths.

The normalized physical pointer contract intentionally carries viewport CSS-pixel position. That is browser-boundary data, not renderer/world coordinates. Screen-to-world conversion remains presentation-local and is not part of action mapping, contexts, tick snapshots, or simulation contracts.

DOM `Event` objects are consumed only inside browser adapters and test fixtures. Simulation-facing records, logical transitions, contextual action states, and commands are plain deterministic data.

## Context and game-policy audit

Context identifiers remain opaque game-owned strings. Foundation defines no built-in Gameplay, TargetSelection, Inventory, Modal, Chat, or game-specific action catalog.

Bindings likewise use opaque logical action identifiers. No tactical RPG, MMO, FPS, renderer, or game-screen policy is present in the shared package.

## Allocation review

The v0.1 input path favors explicit immutable snapshot data over allocation avoidance without measurements.

Known allocation points include:

- action/context result arrays created while resolving transitions;
- context ordering arrays when active contexts are resolved;
- per-tick maps/arrays used to construct `TickInputSnapshot`;
- copies returned by diagnostic active-source accessors.

These allocations are bounded by current input/context cardinality and no measured consumer budget violation exists. Per project performance policy, S02-09 does not add pooling, mutable shared snapshots, ECS-style storage, or other speculative optimization. Profiling should drive any later optimization issue.

## Deferred scope

Gamepad remains explicitly deferred. No gamepad abstraction is added by Sprint 02 because there is no current consumer requirement.

Persistence, renderer adapters, Preact integration, and game-specific controls remain outside this review.

## Review outcome

The public browser/core input split was corrected in S02-09. No renderer/domain leak, raw DOM event leak, game-specific context policy, or demonstrated hot-path performance defect remains as a Sprint 02 blocker.

No additional non-blocking follow-up issue is required from this review. Future allocation optimization requires measured evidence from a real consumer.
