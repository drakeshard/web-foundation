# Browser Input Boundary Contract

## Status

Accepted S02-01 contract for the Web Foundation v0.1 browser input boundary.

## Boundary

Browser input is asynchronous physical data. It is not authoritative game/domain state.

Browser adapters normalize browser events into plain Foundation records. Raw DOM event objects, browser timestamps, renderer objects, and renderer/world-coordinate types must never enter deterministic action or simulation contracts.

Foundation input is renderer-neutral. Phaser, PlayCanvas, canvas-specific input systems, and screen-to-world conversion remain presentation-local.

## Physical identity and state

Keyboard identity uses standard `KeyboardEvent.code` semantics represented as opaque strings. Foundation does not define gameplay meaning for a key code.

Pointer records use browser Pointer Events concepts:

- `pointerId` identifies one active pointer interaction;
- `pointerType` is normalized to `mouse`, `pen`, `touch`, or `unknown`;
- button identity is the browser pointer button number;
- absolute position is viewport CSS pixels equivalent to `clientX`/`clientY`.

v0.1 does not require pointer movement deltas in the shared contract. A current consumer may justify adding them later.

Digital held state belongs to the physical boundary. A pressed edge is emitted only for a not-held → held transition. A released edge is emitted only for a held → not-held transition. Repeated keydown while a key is already held does not create another pressed edge.

## Deterministic ordering

Every normalized physical record carries an `InputSequence`: a non-negative safe integer from one monotonically increasing sequence source shared by every adapter feeding the same input pipeline.

`InputSequence` order is authoritative when multiple physical changes occur between simulation ticks. Adapters and later mapping/tick stages must not order deterministic input by `Event.timeStamp`, `performance.now()`, wall-clock time, renderer frame time, or listener type.

Multiple edges may occur between two simulation ticks. Their sequence order must be preserved even when the final held state matches the state at the previous tick.

## Wheel semantics

Wheel records preserve browser `deltaX`, `deltaY`, and `deltaZ` sign and magnitude and normalize `deltaMode` into an explicit unit:

- `pixel`;
- `line`;
- `page`.

Foundation does not convert between those units, invent a scale factor, or invert signs. A consumer that needs a policy for line/page magnitude must define that policy outside the physical adapter contract.

## Cancellation and reset

Pointer cancellation or lost pointer interaction clears held buttons for the affected pointer and emits a pointer-cancel record. Cancellation is invalidation, not user intent, so it does not fabricate released edges.

Window blur, hidden-document visibility, and adapter detach clear applicable physical held state and emit a scoped reset record. The reset scope is explicitly `keyboard`, `pointer`, or `all`, so adapter-local cleanup cannot accidentally invalidate unrelated physical state. Reset is invalidation, not gameplay intent; it must not fabricate logical release commands or other game actions.

Resume or re-attach starts from cleared physical state. Input accumulated while hidden or detached is not replayed.

## Logical actions

A `LogicalActionId` is an opaque, game-owned string. Foundation defines no Move, Attack, Inventory, or other game-specific action catalog.

Action resolution is responsible for deriving:

- final logical held state;
- ordered pressed/released action transitions.

The tick-consumption layer will later expose final held state with one-tick edge flags and ordered command/intention data. If both press and release occur between two ticks, both edge flags may be true for that tick while `held` reflects the final resolved state.

S02-01 defines this behavior contract but does not implement action mapping, contexts, or tick consumption.

## Command/intention representation

`InputCommand` is generic deterministic data with:

- a game-owned command identifier;
- the originating `InputSequence`;
- game-owned payload data.

Command payloads entering deterministic code must be plain deterministic data. They must not contain DOM events, renderer objects, functions, or uncontrolled wall-clock/browser timing values.

## Ownership

The input pipeline owns responsibilities in this order:

1. **Browser adapter** — listener lifecycle, physical normalization, physical held state, normalized record delivery.
2. **Action mapping** — physical binding to logical action resolution.
3. **Input contexts** — generic logical-action ownership, precedence, and consumption.
4. **Tick handoff** — deterministic per-tick snapshots and ordered command delivery.
5. **Simulation/domain** — consumes only logical/tick data.

Presentation owns renderer interaction and coordinate conversion. Simulation/domain code never reads DOM events directly.

## Deferred work

Dedicated later issues own:

- action mapping and binding resolution;
- input contexts;
- tick snapshots and command queues;
- centralized lifecycle/reset coordination beyond adapter-local stuck-state cleanup;
- real-browser integration tests;
- renderer adapters;
- Preact integration;
- gamepad;
- persistence;
- game-specific controls.
## Action mapping

S02-04 maps normalized digital physical input to opaque logical action identifiers. The shared mapping surface covers keyboard codes and pointer buttons only. Pointer position and wheel records remain normalized physical data because they do not have held-state semantics; any wheel-to-command policy belongs to a later consumer rather than the digital action resolver.

One logical action may have multiple physical bindings. Its logical held state is active while at least one matching physical source is active. A logical pressed transition is emitted only when the first matching source becomes active, and a logical released transition is emitted only when the final matching source releases normally. One physical source may map to multiple logical actions; transitions for that physical event preserve binding declaration order and share the originating `InputSequence`.

Pointer identity is retained while a pointer button is active so multiple simultaneous pointers cannot release one another's state. Pointer cancellation and scoped reset records invalidate matching active sources without fabricating logical released transitions. Replacing the binding configuration also invalidates current resolver state without synthetic action edges; a fresh physical edge is required under the new configuration.

The resolver exposes normalized active-source state so later generic input-context resolution can deterministically recompute ownership without reading DOM state or browser event objects.
## Input contexts

S02-05 defines contexts as opaque game-owned string identifiers plus explicit numeric priority and action rules. Foundation does not define Gameplay, TargetSelection, Inventory, Modal, Chat, DebugConsole, or any other context as built-in behavior; those names are examples that applications may choose to configure.

Contexts are activated and deactivated explicitly. Active contexts are resolved in descending numeric priority, with declaration order as the deterministic tie-breaker. For a logical action, every matching active context receives ownership in that order until a matching rule marked consuming is reached. Consumption defaults to true. A non-consuming rule allows delivery to continue to lower-priority matching contexts.

Context activation and deactivation change current ownership immediately but do not synthesize logical pressed or released edges. Logical edge creation remains owned by action mapping and physical input changes. Later tick handoff may combine current action held state with current context ownership so a context transition can change which context sees a held action without inventing browser input.
## Tick input handoff

S02-06 introduces a simulation-facing tick handoff. Normalized physical records may arrive asynchronously, but simulation code consumes only deterministic tick snapshots. Physical records are required to arrive in strictly increasing `InputSequence` order. Action mapping updates immediately at the input boundary, while context ownership is sampled when the simulation consumes the next tick; context changes therefore affect the next tick without creating hidden asynchronous simulation updates.

A tick snapshot contains three coordinated views: contextual action states, ordered contextual action transitions, and ordered generic commands. Action state exposes final held state plus one-tick `pressed` and `released` flags. Pressed and released may both be true when both edges occurred between ticks. The ordered transition list preserves every routed edge in physical sequence and mapping order so callers do not lose edge ordering when boolean flags are aggregated.

Held action state is recomputed from current action mapping and current context ownership at every tick. It persists across ticks without repeating edge flags and disappears immediately after cancellation/reset invalidates its physical sources. Cancellation/reset do not fabricate release transitions.

Generic `InputCommand` values are delivered in ascending originating `InputSequence`; commands sharing a sequence retain enqueue order. Commands and transitions are drained after one tick, while held action state remains until changed or invalidated. The handoff owns no render loop and is consumed once for each executable step returned by `FixedStepDriver`.
## Browser lifecycle reset coordination

S02-07 centralizes window focus/blur and document visibility handling in one narrow `BrowserInputLifecycle` shared by browser input adapters. The lifecycle owns exactly one blur/focus listener pair and one visibility-change listener set. Keyboard and pointer adapters no longer register duplicate global lifecycle listeners.

Blur or transition to hidden suspends input. Before one `all`-scope reset record is emitted, the lifecycle synchronously notifies attached adapters to clear their local physical held state. This order prevents a normalized reset from reaching action mapping while an adapter still believes a key or pointer button is held. Repeated blur/hidden signals while already suspended do not emit duplicate resets.

Focus and visible transitions only resume acceptance when both focus and visibility conditions permit it. They do not replay input accumulated while suspended and do not synthesize pressed/released edges. Adapter-local detach remains scoped (`keyboard` or `pointer`) so removing one adapter cannot invalidate another. Lifecycle detach invalidates all attached adapter physical state with an `all`-scope detach reset. Pointer cancellation and lost pointer capture remain pointer-local invalidation records rather than global lifecycle resets.
## Public module boundary

S02-09 separates renderer-neutral input APIs from browser integration APIs at the package boundary.

`@drakeshard/foundation/input` exposes normalized physical records, action mapping, contexts, input sequencing, and tick handoff. `@drakeshard/foundation/input/browser` exposes browser event-target abstractions, lifecycle coordination, and keyboard/pointer browser adapters.

Browser code may normalize into the core input contracts. Core deterministic input and simulation-facing code must not depend on the browser subpath. Raw DOM events remain confined to browser adapters and never enter action/context/tick contracts.



## S07-03 cross-renderer input pressure test

Sprint 07 reuses the same app-local `ProbeInputController` in the Phaser and PlayCanvas probes. The
controller composes the admitted Foundation keyboard/pointer browser adapters, shared monotonic input
sequence, action mapping, input contexts, and `TickInputHandoff`, then maps the resulting logical
state into the same ToyDomain command shapes.

Renderer-local coordinate conversion remains outside Foundation and outside the ToyDomain. Phaser
converts viewport pointer coordinates through its 2D canvas/world mapping callback. PlayCanvas
converts the same normalized `ScreenPosition` through its camera ray/terrain interaction callback.
Conversion happens at the renderer/pointer boundary while the browser event position is valid. Only
the resulting plain `ToyPoint` is queued through the app-local tick handoff; raw screen coordinates
do not survive into tick consumption. A renderer-local miss or occlusion queues no domain command.

The PlayCanvas probe exposes an explicit `apply input tick` control solely as a deterministic probe
affordance. It lets browser tests consume the same tick handoff without tying authoritative domain
updates to PlayCanvas render-frame cadence. This is not a production scheduling API and does not add a
Foundation renderer adapter.

Cross-renderer Chromium coverage verifies equivalent keyboard mapping, identical gameplay/modal
context ownership, renderer-local pointer conversion converging on the same `set-marker` command and
domain result, and blur/reset invalidation preventing stale held movement in both probes. No renderer
objects or transient presentation coordinates enter Foundation input or ToyDomain contracts.


## S07-05 lifecycle pressure evidence

Both live renderer probes reuse BrowserInputLifecycle for blur/visibility invalidation. Browser
coverage verifies that a held gameplay key is cleared by a hidden visibility transition and does not
resume as stale movement after visibility returns. Renderer reinitialization detaches the old
browser adapters and creates fresh adapters against the replacement canvas without changing the
ToyDomain contract or moving renderer types into domain state.
